// ============================================================
//  Forskning: kan trend-ensemblen förbättras? Fler valutor, andra steg, volatilitetsstyrning.
//  Dagliga Binance-candles (hela historiken), 0,1 % avgift per handlad krona + 0,02 % glapp.
//  Beslut på stängd dag, affär till stängningskursen. Ombalansering när något mål ändras eller var 7:e dag.
//  OBS överlevnadsfel: valutorna är sådana som är stora idag.
// ============================================================
import fs from 'node:fs';

const BASES = process.env.BOT_API_BASES ? process.env.BOT_API_BASES.split(',') : ['https://data-api.binance.vision/api/v3', 'https://api.binance.com/api/v3'];
const COINS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'LTCUSDT', 'TRXUSDT', 'LINKUSDT', 'SOLUSDT', 'DOGEUSDT'];
const COST = 0.0012, DAY = 86400000;
const OUT = 'research-out';

async function get(q) {
    for (const b of BASES) { try { const r = await fetch(b + q, { signal: AbortSignal.timeout(20000) }); if (r.ok) return r.json(); } catch (e) { } }
    throw new Error('ingen källa: ' + q);
}
async function daily(sym) {
    let start = Date.UTC(2017, 0, 1), out = [];
    for (;;) {
        const k = await get(`/klines?symbol=${sym}&interval=1d&limit=1000&startTime=${start}`);
        if (!k.length) break;
        out.push(...k.filter(x => x[6] < Date.now()).map(x => [x[0], +x[4]]));
        if (k.length < 1000) break;
        start = k[k.length - 1][0] + DAY;
    }
    return out;
}

const sma = (a, n) => { const o = new Array(a.length).fill(null); let s = 0; for (let i = 0; i < a.length; i++) { s += a[i]; if (i >= n) s -= a[i - n]; if (i >= n - 1) o[i] = s / n; } return o; };
function ensembleW(closes, lengths, step) {
    const ms = lengths.map(n => sma(closes, n));
    return closes.map((c, i) => { if (ms.some(m => m[i] === null)) return null; const r = ms.filter(m => c > m[i]).length / ms.length; return Math.round(r / step) * step; });
}
function volScale(closes, target) {
    const r = closes.map((c, i) => i ? c / closes[i - 1] - 1 : 0);
    return closes.map((c, i) => { if (i < 31) return 1; const s = r.slice(i - 29, i + 1); const m = s.reduce((a, b) => a + b) / 30; const sd = Math.sqrt(s.reduce((a, b) => a + (b - m) ** 2, 0) / 29) * Math.sqrt(365); return Math.min(1, target / sd); });
}

// Generell portföljsimulering. W[d][c] = målvikt (null = valutan finns inte än), P[d][c] = stängningskurs
function simulate(days, P, W, rebal = 7) {
    const nc = P[0].length; let val = 1, cur = new Array(nc).fill(0), last = null, lastReb = -1e9, trades = 0;
    const eq = [];
    for (let d = 0; d < days.length; d++) {
        if (d > 0) {   // låt vikterna driva med kurserna
            let g = 0; const nw = cur.map((w, c) => { const r = (P[d][c] && P[d - 1][c]) ? P[d][c] / P[d - 1][c] : 1; g += w * r; return w * r; });
            const growth = g + (1 - cur.reduce((a, b) => a + b, 0)); val *= growth; cur = nw.map(w => w / growth);
        }
        const tgt = W[d].map(w => w || 0);
        const changed = !last || tgt.some((w, c) => Math.abs(w - last[c]) > 1e-9);
        if (changed || d - lastReb >= rebal) {
            const turn = tgt.reduce((a, w, c) => a + Math.abs(w - cur[c]), 0);
            if (turn > 0.005) { val *= 1 - turn * COST; if (changed) trades++; cur = tgt.slice(); lastReb = d; }
            last = tgt;
        }
        eq.push(val);
    }
    return eq;
}
function stats(eq, days, from = 0, to = eq.length) {
    const e = eq.slice(from, to), yrs = (days[to - 1] - days[from]) / (365 * DAY);
    let pk = 0, dd = 0; for (const v of e) { pk = Math.max(pk, v); dd = Math.min(dd, v / pk - 1); }
    const tot = e[e.length - 1] / e[0] - 1, cagr = Math.pow(1 + tot, 1 / yrs) - 1;
    const rs = e.slice(1).map((v, i) => v / e[i] - 1), m = rs.reduce((a, b) => a + b, 0) / rs.length;
    const sd = Math.sqrt(rs.reduce((a, b) => a + (b - m) ** 2, 0) / rs.length);
    return { tot, cagr, dd, calmar: dd < 0 ? cagr / -dd : 0, sharpe: sd ? m / sd * Math.sqrt(365) : 0 };
}

const data = {};
for (const s of COINS) { data[s] = await daily(s); console.log(s, data[s].length, 'dagar från', new Date(data[s][0][0]).toISOString().slice(0, 10)); }
// gemensam kalender från BTC (start när BTC har 200 dagars historik)
const days = data.BTCUSDT.map(x => x[0]);
const idx = {}; for (const s of COINS) { idx[s] = new Map(data[s].map((x, i) => [x[0], i])); }
const closes = {}; for (const s of COINS) closes[s] = data[s].map(x => x[1]);

function wFor(s, lengths, step, vt) {
    const w = ensembleW(closes[s], lengths, step), v = vt ? volScale(closes[s], vt) : null;
    return days.map(t => { const i = idx[s].get(t); if (i === undefined || w[i] === null) return null; let x = w[i]; if (v) x = Math.round(x * v[i] / 0.25) * 0.25; return x; });
}
const L5 = [20, 50, 100, 150, 200];
const start = days.findIndex((t, i) => i >= 200);
const D = days.slice(start);
const Pm = (syms) => D.map(t => syms.map(s => { const i = idx[s].get(t); return i === undefined ? null : closes[s][i]; }));

function basket(syms, opts = {}) {
    const lengths = opts.lengths || L5, step = opts.step || 0.25;
    const ws = syms.map(s => wFor(s, lengths, step, opts.vol).slice(start));
    const W = D.map((t, d) => {
        const avail = syms.map((s, c) => ws[c][d] !== null);
        const n = opts.fixedSlots ? syms.length : avail.filter(Boolean).length;
        if (opts.top) {   // bara de N starkaste (momentum 90 d) bland dem som har signal
            const sc = syms.map((s, c) => { if (!avail[c] || !ws[c][d]) return -1e9; const i = idx[s].get(D[d]); return i >= 90 ? closes[s][i] / closes[s][i - 90] - 1 : -1e9; });
            const order = sc.map((v, c) => [v, c]).filter(x => x[0] > -1e9).sort((a, b) => b[0] - a[0]).slice(0, opts.top).map(x => x[1]);
            return syms.map((s, c) => order.includes(c) ? ws[c][d] / opts.top : 0);
        }
        return syms.map((s, c) => avail[c] ? ws[c][d] / n : null);
    });
    return simulate(D, Pm(syms), W);
}
const bh = (syms) => simulate(D, Pm(syms), D.map((t, d) => { const P = Pm(syms)[d]; const n = P.filter(x => x).length; return P.map(x => x ? 1 / n : null); }), 30);

const half = Math.floor(D.length / 2);
const runs = [
    ['Buy & hold BTC', bh(['BTCUSDT'])],
    ['Buy & hold 10 valutor (lika, månadsvis)', bh(COINS)],
    ['NU: ensemble BTC (steg 25 %)', basket(['BTCUSDT'])],
    ['Ensemble BTC, steg 20 % (exakt 1/5)', basket(['BTCUSDT'], { step: 0.2 })],
    ['Ensemble BTC, steg 50 % (färre affärer)', basket(['BTCUSDT'], { step: 0.5 })],
    ['Ensemble BTC, långa medel (50–250)', basket(['BTCUSDT'], { lengths: [50, 100, 150, 200, 250] })],
    ['Ensemble BTC + volatilitetsstyrning 60 %', basket(['BTCUSDT'], { vol: 0.6 })],
    ['Ensemble BTC + ETH (hälften var)', basket(['BTCUSDT', 'ETHUSDT'])],
    ['Ensemble 4: BTC ETH SOL XRP', basket(['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT'])],
    ['Ensemble alla 10 (lika delar)', basket(COINS)],
    ['Ensemble alla 10, fasta platser (tomma = kontant)', basket(COINS, { fixedSlots: true })],
    ['Ensemble 10, bara topp 3 momentum', basket(COINS, { top: 3 })],
    ['Ensemble 10, topp 3 + vol 60 %', basket(COINS, { top: 3, vol: 0.6 })],
];
for (const s of COINS.slice(1)) runs.push(['Ensemble bara ' + s.replace('USDT', ''), basket([s])]);

const f = v => (v * 100).toFixed(0) + ' %';
let md = `# Trend-ensemble: förbättringstest\n\nSkapad ${new Date().toISOString().slice(0, 16)} UTC. Period ${new Date(D[0]).toISOString().slice(0, 10)} – ${new Date(D[D.length - 1]).toISOString().slice(0, 10)}, delning ${new Date(D[half]).toISOString().slice(0, 10)}. Kostnad 0,12 % per handlad krona.\n\n`;
md += '| Variant | Total | CAGR | Max ned | Calmar | Sharpe | Calmar 1:a halvan | Calmar 2:a halvan | CAGR 2:a halvan | Senaste 365 d |\n|---|---|---|---|---|---|---|---|---|---|\n';
const res = [];
for (const [n, eq] of runs) {
    const a = stats(eq, D), h1 = stats(eq, D, 0, half + 1), h2 = stats(eq, D, half), y = stats(eq, D, D.length - 366);
    res.push({ n, a, h1, h2, y });
    md += `| ${n} | ${f(a.tot)} | ${f(a.cagr)} | ${f(a.dd)} | ${a.calmar.toFixed(2)} | ${a.sharpe.toFixed(2)} | ${h1.calmar.toFixed(2)} | ${h2.calmar.toFixed(2)} | ${f(h2.cagr)} | ${f(y.tot)} |\n`;
}
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(OUT + '/REPORT-ENSEMBLE.md', md);
fs.writeFileSync(OUT + '/ensemble-results.json', JSON.stringify(res, null, 1));
console.log(md);
