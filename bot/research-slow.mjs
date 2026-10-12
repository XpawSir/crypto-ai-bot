// ============================================================
//  Långsam handel: dagliga och veckovisa candles, flera års historik.
//  Två regeluppsättningar:
//   A) "standard": botens vanliga ATR-stop och take-profit
//   B) "ren signal": ingen stop/TP, bara köp- och säljsignal (så som långsamma trendstrategier brukar användas)
//  Plus enkla riktmärken: buy & hold och "över/under SMA 200" (klassisk trendregel).
//  Jämförs mot buy & hold, och de bästa på första halvan mäts på andra halvan.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { STRATEGIES, BASE_IDS, FEE, atrSimple, prepare, simulate, riskMultFor } from './engine.mjs';

const OUT_DIR = process.env.RESEARCH_OUT || 'research-out';
const SOURCES = (process.env.RESEARCH_API_BASES
    ? process.env.RESEARCH_API_BASES.split(',')
    : ['https://data-api.binance.vision/api/v3', 'https://api.binance.com/api/v3', 'https://api.binance.us/api/v3']);
const SYMBOLS = (process.env.RESEARCH_SYMS || 'BTCUSDT,ETHUSDT,SOLUSDT,XRPUSDT').split(',');
const START_YEAR = +(process.env.RESEARCH_START_YEAR || 2018);
const RISK = 5;

// ---------- Data ----------
let source = null;
async function getJSON(q) {
    const order = source ? [source, ...SOURCES.filter(s => s !== source)] : SOURCES;
    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
        for (const base of order) {
            try {
                const res = await fetch(base + q, { signal: AbortSignal.timeout(20000) });
                if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + base);
                const j = await res.json();
                source = base;
                return j;
            } catch (e) { lastErr = e; }
        }
        await new Promise(r => setTimeout(r, 1500));
    }
    throw lastErr;
}
const toCandle = k => ({ time: Math.floor(k[0] / 1000), open: +k[1], high: +k[2], low: +k[3], close: +k[4], closeTime: k[6] });

async function fetchKlines(symbol, interval, fromMs) {
    const out = [];
    let t = fromMs;
    const now = Date.now();
    for (let guard = 0; guard < 400; guard++) {
        const raw = await getJSON('/klines?symbol=' + symbol + '&interval=' + interval + '&startTime=' + t + '&limit=1000');
        if (!Array.isArray(raw) || raw.length === 0) break;
        for (const k of raw) out.push(toCandle(k));
        const last = raw[raw.length - 1];
        t = last[6] + 1;
        if (raw.length < 1000) break;
    }
    return out.filter(c => c.closeTime < now);
}

function aggregate(c1h, hours) {
    const size = hours * 3600, out = [];
    let cur = null;
    for (const c of c1h) {
        const b = Math.floor(c.time / size) * size;
        if (!cur || cur.time !== b) {
            if (cur && cur.n === hours) out.push(cur);
            cur = { time: b, open: c.open, high: c.high, low: c.low, close: c.close, closeTime: c.closeTime, n: 1 };
        } else {
            cur.high = Math.max(cur.high, c.high); cur.low = Math.min(cur.low, c.low);
            cur.close = c.close; cur.closeTime = c.closeTime; cur.n++;
        }
    }
    if (cur && cur.n === hours) out.push(cur);
    return out.map(c => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close, closeTime: c.closeTime }));
}


const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const f0 = v => (v === null || v === undefined || !isFinite(v)) ? '–' : v.toFixed(0);

function weekly(daily) {
    // veckor börjar på måndag (UTC); bara kompletta veckor
    const out = []; let cur = null;
    for (const c of daily) {
        const dow = (new Date(c.time * 1000).getUTCDay() + 6) % 7;
        const key = c.time - dow * 86400;
        if (!cur || cur.time !== key) { if (cur && cur.n === 7) out.push(cur); cur = { time: key, open: c.open, high: c.high, low: c.low, close: c.close, closeTime: c.closeTime, n: 1 }; }
        else { cur.high = Math.max(cur.high, c.high); cur.low = Math.min(cur.low, c.low); cur.close = c.close; cur.closeTime = c.closeTime; cur.n++; }
    }
    if (cur && cur.n === 7) out.push(cur);
    return out.map(({ n, ...c }) => c);
}
function smaArr(d, p) { const o = new Array(d.length).fill(null); let s = 0; for (let i = 0; i < d.length; i++) { s += d[i].close; if (i >= p) s -= d[i - p].close; if (i >= p - 1) o[i] = s / p; } return o; }
function buyHold(d, from, to) {
    const e = d[from].close; let peak = e, dd = 0;
    for (let i = from; i < to; i++) { peak = Math.max(peak, d[i].close); dd = Math.max(dd, (peak - d[i].close) / peak * 100); }
    return { net: ((d[to - 1].close / e) * (1 - FEE) * (1 - FEE) - 1) * 100, maxDD: dd, trades: 1 };
}
// Ren signal: köp på buy, sälj på sell (på candlens stängning). Ingen stop/TP.
function simSignal(sig, d, from, to) {
    let inPos = false, entry = 0, eq = 1, peak = 1, dd = 0, trades = 0;
    const mark = i => { const v = inPos ? eq * (d[i].close / entry) : eq; peak = Math.max(peak, v); dd = Math.max(dd, (peak - v) / peak * 100); };
    for (let i = from; i < to; i++) {
        if (inPos && sig.sell[i]) { eq *= (d[i].close / entry) * (1 - FEE) * (1 - FEE); inPos = false; trades++; }
        else if (!inPos && sig.buy[i]) { inPos = true; entry = d[i].close; }
        mark(i);
    }
    if (inPos) { eq *= (d[to - 1].close / entry) * (1 - FEE) * (1 - FEE); trades++; }
    return { net: (eq - 1) * 100, maxDD: dd, trades };
}
function smaRule(d, p) {
    const sma = smaArr(d, p), buy = [], sell = [];
    for (let i = 0; i < d.length; i++) {
        buy.push(sma[i] !== null && i > 0 && sma[i - 1] !== null && d[i].close > sma[i] && d[i - 1].close <= sma[i - 1]);
        sell.push(sma[i] !== null && d[i].close < sma[i]);
    }
    return { buy, sell };
}
const score = r => r.net - 0.5 * r.maxDD;
const calmar = r => r.net / Math.max(r.maxDD, 1);

async function main() {
    const sets = [];
    for (const sym of SYMBOLS) {
        const d1 = await fetchKlines(sym, '1d', Date.UTC(START_YEAR, 0, 1));
        console.log(sym + ' ' + d1.length + ' dagcandles, källa ' + source);
        if (d1.length < 700) continue;
        sets.push({ sym, tf: '1d', d: d1, warm: 250 });
        const w = weekly(d1);
        if (w.length > 150) sets.push({ sym, tf: '1w', d: w, warm: 60 });
    }
    if (!sets.length) throw new Error('Ingen data');
    const rm = riskMultFor(RISK);
    const rows = [];
    for (const ds of sets) {
        const { d, warm } = ds;
        const ctx = prepare(d);
        const n = d.length, from = warm, mid = from + Math.floor((n - from) / 2);
        const r = { sym: ds.sym, tf: ds.tf, n, bh: buyHold(d, from, n), bhOOS: buyHold(d, mid, n), std: {}, pure: {} };
        const extra = { 'sma200': smaRule(d, ds.tf === '1d' ? 200 : 40), 'sma100': smaRule(d, ds.tf === '1d' ? 100 : 20) };
        for (const id of BASE_IDS) {
            r.std[id] = { full: simulate(ctx.sigs[id], d, ctx.atr, from, n, rm), is: simulate(ctx.sigs[id], d, ctx.atr, from, mid, rm), oos: simulate(ctx.sigs[id], d, ctx.atr, mid, n, rm) };
            r.pure[id] = { full: simSignal(ctx.sigs[id], d, from, n), is: simSignal(ctx.sigs[id], d, from, mid), oos: simSignal(ctx.sigs[id], d, mid, n) };
        }
        for (const [id, sg] of Object.entries(extra)) r.pure[id] = { full: simSignal(sg, d, from, n), is: simSignal(sg, d, from, mid), oos: simSignal(sg, d, mid, n) };
        rows.push(r);
    }
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, 'slow.json'), JSON.stringify(rows));
    const md = report(rows);
    fs.writeFileSync(path.join(OUT_DIR, 'REPORT-SLOW.md'), md);
    console.log(md);
}

const NAME = id => (STRATEGIES[id] ? STRATEGIES[id].name : id === 'sma200' ? 'Kurs över/under medelvärde (lång)' : 'Kurs över/under medelvärde (kort)');

function report(rows) {
    const L = [], P = s => L.push(s);
    P('# Långsam handel: dagliga och veckovisa candles');
    P('');
    P('Skapad ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC. Avgift 0,1 % per sida. Marknader: ' + [...new Set(rows.map(r => r.sym.replace('USDT', '')))].join(', ') + '. Hela kapitalet i varje affär.');
    P('"Standard" = botens ATR-stop/take-profit. "Ren signal" = ingen stop/TP, bara köp- och säljsignaler. Medelvärdesregeln köper när kursen korsar upp över sitt medelvärde (200 dagar, eller 40 veckor) och säljer när den ligger under.');
    P('');
    for (const tf of ['1d', '1w']) {
        const rs = rows.filter(r => r.tf === tf);
        if (!rs.length) continue;
        P('## ' + (tf === '1d' ? 'Dagliga candles' : 'Veckocandles'));
        P('');
        P('| Strategi | Regler | Snitt-avkastning | Slår B&H | Plus | Snitt största nedgång | Snitt affärer | Avkastning/nedgång (B&H: ' + mean(rs.map(r => calmar(r.bh))).toFixed(1) + ') |');
        P('|---|---|---|---|---|---|---|---|');
        const lines = [];
        const ids = [...BASE_IDS, 'sma200', 'sma100'];
        for (const kind of ['std', 'pure']) for (const id of ids) {
            if (kind === 'std' && !STRATEGIES[id]) continue;
            const fs_ = rs.map(r => r[kind][id].full);
            lines.push({ id, kind, net: mean(fs_.map(x => x.net)), beat: fs_.filter((x, k) => x.net > rs[k].bh.net).length, pos: fs_.filter(x => x.net > 0).length, dd: mean(fs_.map(x => x.maxDD)), tr: mean(fs_.map(x => x.trades)), cal: mean(fs_.map(x => calmar(x))) });
        }
        lines.sort((a, b) => b.cal - a.cal);
        for (const x of lines.slice(0, 12)) P('| ' + NAME(x.id) + ' | ' + (x.kind === 'std' ? 'standard' : 'ren signal') + ' | ' + f0(x.net) + ' % | ' + x.beat + '/' + rs.length + ' | ' + x.pos + '/' + rs.length + ' | -' + f0(x.dd) + ' % | ' + f0(x.tr) + ' | ' + x.cal.toFixed(1) + ' |');
        P('| *Buy & hold* | | ' + f0(mean(rs.map(r => r.bh.net))) + ' % | | | -' + f0(mean(rs.map(r => r.bh.maxDD))) + ' % | 1 | ' + mean(rs.map(r => calmar(r.bh))).toFixed(1) + ' |');
        P('');
        P('(Topp 12 efter avkastning per risk, alltså avkastning delat med största nedgång.)');
        P('');
        // håll-ut
        P('**Håll-ut-test:** bästa 3 på första halvan (efter poäng = avkastning − ½ nedgång), mätta på andra.');
        P('');
        P('| Marknad | Valda | Deras snitt 2:a halvan | Buy & hold 2:a halvan |');
        P('|---|---|---|---|');
        let beat = 0;
        for (const r of rs) {
            const cands = [];
            for (const kind of ['std', 'pure']) for (const id of Object.keys(r[kind])) if (r[kind][id].is.trades >= 3) cands.push({ id, kind, s: score(r[kind][id].is), oos: r[kind][id].oos });
            cands.sort((a, b) => b.s - a.s);
            const top = cands.slice(0, 3);
            const m = mean(top.map(x => x.oos.net));
            if (m > r.bhOOS.net) beat++;
            P('| ' + r.sym.replace('USDT', '') + ' | ' + top.map(x => NAME(x.id) + ' (' + (x.kind === 'std' ? 'std' : 'ren') + ')').join(', ') + ' | ' + f0(m) + ' % | ' + f0(r.bhOOS.net) + ' % |');
        }
        P('');
        P('De utvalda slog buy & hold på andra halvan i ' + beat + ' av ' + rs.length + ' marknader.');
        P('');
    }
    P('**Läsning:** slår en långsam regel buy & hold på avkastning är det värt att titta närmare. Slår den bara på avkastning per risk betyder det att den har mindre nedgångar men tjänar mindre. Mycket få affärer (ofta under 10 per marknad) gör att siffrorna är osäkra, och urvalet bland många regler ger en risk att något ser bra ut av ren slump. Historik garanterar ingenting.');
    return L.join('\n');
}

main().catch(e => { console.error(e); process.exit(1); });
