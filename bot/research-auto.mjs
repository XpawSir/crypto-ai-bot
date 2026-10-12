// ============================================================
//  Test av "långsammare och försiktigare AUTO". Jämför varianter mot nuvarande AUTO och buy & hold.
//  Varianten väljs på första halvan av historiken och bedöms på andra halvan (inte tvärtom),
//  så att vi inte bara hittar den inställning som råkade passa bäst i efterhand.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { STRATEGIES, AUTO_POOL, FEE, prepare, simulate, riskMultFor } from './engine.mjs';

const OUT_DIR = process.env.RESEARCH_OUT || 'research-out';
const SOURCES = (process.env.RESEARCH_API_BASES
    ? process.env.RESEARCH_API_BASES.split(',')
    : ['https://data-api.binance.vision/api/v3', 'https://api.binance.com/api/v3', 'https://api.binance.us/api/v3']);
const SYMBOLS = (process.env.RESEARCH_SYMS || 'BTCUSDT,ETHUSDT,SOLUSDT,XRPUSDT').split(',');
const START_YEAR = +(process.env.RESEARCH_START_YEAR || 2019);
const RISK = 5, WARMUP = 1200;

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

function smaArr(d, p) { const o = new Array(d.length).fill(null); let s = 0; for (let i = 0; i < d.length; i++) { s += d[i].close; if (i >= p) s -= d[i - p].close; if (i >= p - 1) o[i] = s / p; } return o; }
function buyHold(d, from, to) {
    const e = d[from].close; let peak = e, dd = 0;
    for (let i = from; i < to; i++) { peak = Math.max(peak, d[i].close); dd = Math.max(dd, (peak - d[i].close) / peak * 100); }
    return { net: ((d[to - 1].close / e) * (1 - FEE) * (1 - FEE) - 1) * 100, maxDD: dd };
}

const TREND_SLOW = ['ema-50-200', 'ichimoku', 'keltner', 'donchian-55', 'supertrend'];
const SLOW_REVERT = ['rsi-trend'];

// Varianter: reeval = hur ofta AUTO får byta, margin = hur mycket bättre en ny strategi måste vara,
// win = hur långt bak i tiden den tittar, pool = tillåtna strategier, filter = köp bara över SMA(n) (följ stora trenden)
const VARIANTS = {
    'nuvarande':        { reeval: 10, margin: 2,  win: 600,  pool: AUTO_POOL, filter: 0 },
    'långsammare':      { reeval: 40, margin: 6,  win: 1000, pool: AUTO_POOL, filter: 0 },
    'mycket långsam':   { reeval: 120, margin: 12, win: 1500, pool: AUTO_POOL, filter: 0 },
    'bara långsamma':   { reeval: 40, margin: 6,  win: 1000, pool: [...TREND_SLOW, ...SLOW_REVERT], filter: 0 },
    'trendfilter':      { reeval: 10, margin: 2,  win: 600,  pool: AUTO_POOL, filter: 200 },
    'långsam+filter':   { reeval: 40, margin: 6,  win: 1000, pool: AUTO_POOL, filter: 200 },
    'långsamma+filter': { reeval: 40, margin: 6,  win: 1000, pool: [...TREND_SLOW, ...SLOW_REVERT], filter: 200 },
    'minst 8 affärer':  { reeval: 40, margin: 6,  win: 1000, pool: AUTO_POOL, filter: 200, minTrades: 8 }
};

function pick(ctx, d, i, v, rm, current) {
    const win = Math.min(v.win, i - 200);
    const mode = (a => (a === null || a === undefined) ? 'any' : (a >= 25 ? 'trend' : (a < 20 ? 'revert' : 'any')))(ctx.adx[i]);
    let best = null, bestScore = -Infinity, curScore = null;
    for (const id of v.pool) {
        const k = STRATEGIES[id].kind;
        if (mode !== 'any' && k !== mode) continue;
        const r = simulate(ctx.sigsF[id], d, ctx.atr, i - win + 1, i + 1, rm);
        if (r.trades < (v.minTrades || 3)) continue;
        const score = r.net - 0.5 * r.maxDD;
        if (id === current) curScore = score;
        if (score > bestScore) { bestScore = score; best = id; }
    }
    if (best === null || bestScore <= 0) return null;
    if (current && curScore !== null && curScore > 0 && bestScore < curScore + v.margin) return current;
    return best;
}

function runVariant(d, ctx0, from, to, v, rm) {
    // trendfilter: maskera köpsignaler när kursen ligger under SMA(filter)
    const ctx = Object.assign({}, ctx0);
    if (v.filter) {
        const sma = smaArr(d, v.filter);
        ctx.sigsF = {};
        for (const id of Object.keys(ctx0.sigs)) {
            const s = ctx0.sigs[id];
            ctx.sigsF[id] = { buy: s.buy.map((b, i) => b && sma[i] !== null && d[i].close > sma[i]), sell: s.sell };
        }
    } else ctx.sigsF = ctx0.sigs;
    let cur = null, last = -1e9;
    const getSig = i => {
        if (i - last >= v.reeval) { last = i; cur = pick(ctx, d, i, v, rm, cur); }
        return cur ? ctx.sigsF[cur] : null;
    };
    return simulate(getSig, d, ctx.atr, from, to, rm);
}

async function main() {
    const sets = [];
    for (const sym of SYMBOLS) {
        const h1 = await fetchKlines(sym, '1h', Date.UTC(START_YEAR, 0, 1));
        console.log(sym + ' ' + h1.length + ' candles, källa ' + source);
        if (h1.length < 6000) continue;
        sets.push({ sym, tf: '1h', d: h1 }, { sym, tf: '4h', d: aggregate(h1, 4) });
    }
    if (!sets.length) throw new Error('Ingen data');
    const rm = riskMultFor(RISK);
    const rows = [];
    for (const ds of sets) {
        const ctx = prepare(ds.d);
        const n = ds.d.length, from = Math.min(WARMUP, Math.floor(n / 4)), mid = from + Math.floor((n - from) / 2);
        const bhFull = buyHold(ds.d, from, n), bhOOS = buyHold(ds.d, mid, n);
        const res = {};
        for (const [name, v] of Object.entries(VARIANTS)) {
            res[name] = { full: runVariant(ds.d, ctx, from, n, v, rm), is: runVariant(ds.d, ctx, from, mid, v, rm), oos: runVariant(ds.d, ctx, mid, n, v, rm) };
        }
        rows.push({ sym: ds.sym, tf: ds.tf, bhFull, bhOOS, res });
        console.log('klar ' + ds.sym + ' ' + ds.tf);
    }
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, 'auto-variants.json'), JSON.stringify(rows));
    const md = report(rows);
    fs.writeFileSync(path.join(OUT_DIR, 'REPORT-AUTO.md'), md);
    console.log(md);
}

function report(rows) {
    const L = [], P = s => L.push(s);
    P('# AUTO-varianter: går det att göra AUTO bättre genom att göra den långsammare?');
    P('');
    P('Skapad ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC. Risk ' + RISK + ', avgift 0,1 % per sida, samma data som huvudrapporten. Varje rad är ett snitt över alla marknader (' + rows.map(r => r.sym.replace('USDT', '') + ' ' + r.tf).join(', ') + ').');
    P('');
    for (const tf of ['4h', '1h']) {
        const rs = rows.filter(r => r.tf === tf);
        if (!rs.length) continue;
        P('## Tidsintervall ' + tf);
        P('');
        P('| Variant | Snitt hela perioden | Snitt 1:a halvan | Snitt 2:a halvan | Plus (hela) | Slår B&H (2:a halvan) | Snitt största nedgång | Snitt affärer |');
        P('|---|---|---|---|---|---|---|---|');
        const names = Object.keys(VARIANTS);
        const stat = {};
        for (const nme of names) {
            const f = rs.map(r => r.res[nme].full), i1 = rs.map(r => r.res[nme].is), o = rs.map((r, k) => r.res[nme].oos);
            stat[nme] = { is: mean(i1.map(x => x.net)), oos: mean(o.map(x => x.net)) };
            P('| ' + nme + ' | ' + f0(mean(f.map(x => x.net))) + ' % | ' + f0(stat[nme].is) + ' % | ' + f0(stat[nme].oos) + ' % | ' + f.filter(x => x.net > 0).length + '/' + rs.length + ' | ' +
                o.filter((x, k) => x.net > rs[k].bhOOS.net).length + '/' + rs.length + ' | -' + f0(mean(f.map(x => x.maxDD))) + ' % | ' + f0(mean(f.map(x => x.trades))) + ' |');
        }
        P('| *Buy & hold* | ' + f0(mean(rs.map(r => r.bhFull.net))) + ' % | | ' + f0(mean(rs.map(r => r.bhOOS.net))) + ' % | | | -' + f0(mean(rs.map(r => r.bhFull.maxDD))) + ' % | 1 |');
        P('');
        const bestIS = names.slice().sort((a, b) => stat[b].is - stat[a].is)[0];
        P('Bästa variant på första halvan: **' + bestIS + '**. På andra halvan (osedd) gav den ' + f0(stat[bestIS].oos) + ' %, nuvarande AUTO gav ' + f0(stat['nuvarande'].oos) + ' %, buy & hold ' + f0(mean(rs.map(r => r.bhOOS.net))) + ' %.');
        P('');
    }
    P('**Läsning:** en variant är bara en verklig förbättring om den är bättre än "nuvarande" på andra halvan OCH den var det redan i valet på första halvan. Annars är det anpassning till datan. Ingen variant har rätt att kallas bättre än buy & hold om den inte slår den i kolumnen "Slår B&H". Historik garanterar ingenting.');
    return L.join('\n');
}

main().catch(e => { console.error(e); process.exit(1); });
