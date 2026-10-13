// ============================================================
//  Algiz trend-ensemble (PAPER TRADING, låtsaspengar). Körs av GitHub Actions tillsammans med övriga botar.
//  Idé från historiktestet 2026-10-13 (BTC 2016–2026, dagliga candles, 0,1 % avgift):
//  räkna hur många av fem medelvärden (20, 50, 100, 150, 200 dagar) som kursen ligger över.
//  Andel BTC = antal / 5, avrundat till steg om 50 %: 0–1 medelvärden -> 0 %, 2–3 -> 50 %, 4–5 -> 100 %. Resten kontanter.
//  (Steg 50 % valdes 2026-10-13: bättre än 25 % i båda halvorna av testet 2018–2026, färre affärer.)
//  Beslut tas en gång per dygn på STÄNGD dagscandle (00:00 UTC). Inga stop-loss, bara gradvis in/ut.
//  Testresultat: ca +69 %/år, största nedgång -58 % (buy & hold: +63 %/år, -83 %). Historik garanterar inget.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = process.env.BOT_CONFIG || path.join(HERE, 'config-ensemble.json');
const STATE_FILE = process.env.BOT_STATE || path.join(HERE, '..', 'state', 'ensemble.json');
const SOURCES = (process.env.BOT_API_BASES
    ? process.env.BOT_API_BASES.split(',')
    : ['https://data-api.binance.vision/api/v3', 'https://api.binance.com/api/v3', 'https://api.binance.us/api/v3']);
const DAY = 86400, FEE = 0.001, SLIP = 0.0002, START = 10000;
const ALLOWED = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT'];
const CHART_DAYS = 365;          // så många dagar candles/medelvärden som sparas för grafen på sidan

const num = (v, d) => (typeof v === 'number' && isFinite(v)) ? v : d;
const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
const r2 = v => Math.round(v * 100) / 100;

function loadConfig() {
    const c = readJSON(CONFIG_FILE, {});
    let lengths = Array.isArray(c.lengths) ? c.lengths.map(n => Math.round(n)).filter(n => n >= 5 && n <= 300) : [];
    if (lengths.length < 2) lengths = [20, 50, 100, 150, 200];
    const step = [0.1, 0.2, 0.25, 0.5, 1].includes(c.step) ? c.step : 0.5;
    return {
        label: typeof c.label === 'string' ? c.label.slice(0, 40) : 'Trend-ensemble',
        enabled: c.enabled !== false,
        symbol: ALLOWED.includes(c.symbol) ? c.symbol : 'BTCUSDT',
        lengths: [...new Set(lengths)].sort((a, b) => a - b),
        step,
        interval: '1d',
        strategy: 'trend-ensemble'
    };
}

let source = null;
async function getJSON(q) {
    const order = source ? [source, ...SOURCES.filter(s => s !== source)] : SOURCES;
    let lastErr = null;
    for (const base of order) {
        try {
            const res = await fetch(base + q, { signal: AbortSignal.timeout(15000) });
            if (!res.ok) throw new Error('HTTP ' + res.status + ' från ' + base);
            const j = await res.json(); source = base; return j;
        } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error('Ingen datakälla svarade');
}

function freshState() {
    return {
        v: 1, balance: START, cash: START, units: 0, avgCost: 0, weight: 0, target: 0, lastDecision: 0,
        pnl: 0, totalTrades: 0, winningTrades: 0, baseline: null, equity: [], trades: [], log: [],
        startedAt: new Date().toISOString(), buyHoldLabel: 'Buy & hold BTC'
    };
}
function loadState() {
    const s = readJSON(STATE_FILE, null);
    if (!s || s.v !== 1) return freshState();
    const f = freshState(); for (const k of Object.keys(f)) if (s[k] === undefined) s[k] = f[k];
    return s;
}
function logger(st) {
    return (m, k) => { st.log.push({ t: new Date().toISOString(), m, k: k || 'info' }); if (st.log.length > 100) st.log.shift(); console.log('[' + (k || 'info') + '] ' + m); };
}

// Glidande medelvärde: sma[i] = snitt av closes[i-n+1..i], null innan det finns n värden
export function sma(closes, n) {
    const out = new Array(closes.length).fill(null); let s = 0;
    for (let i = 0; i < closes.length; i++) {
        s += closes[i]; if (i >= n) s -= closes[i - n];
        if (i >= n - 1) out[i] = s / n;
    }
    return out;
}

// Beslutet: andel i BTC vid candle i (bara medelvärden som finns räknas; saknas något -> 0)
export function targetAt(i, closes, smas, cfg) {
    let above = 0;
    for (const s of smas) { if (s[i] === null) return { target: 0, above: null }; if (closes[i] > s[i]) above++; }
    const raw = above / smas.length;
    return { target: Math.round(raw / cfg.step) * cfg.step, above };
}

// Simulering bakåt på samma regler (för grafen "så hade den gått"), samma avgift som live
function backtest(candles, smas, cfg) {
    const closes = candles.map(k => k.c);
    // Beslut på dagens stängning, affären görs till samma stängningskurs (live sker den strax efter 00:00 UTC)
    let cash = 1, units = 0, w = 0, first = null; const eq = [], trades = [], ws = [];
    for (let i = 0; i < candles.length; i++) {
        const px = closes[i];
        const { target, above } = targetAt(i, closes, smas, cfg);
        if (above === null) continue;
        if (first === null) first = px;
        if (Math.abs(target - w) > 1e-9) {
            const val = cash + units * px, diff = (target - units * px / val) * val;
            if (diff > 0) { units += diff * (1 - FEE) / px; cash -= diff; } else { units += diff / px; cash += -diff * (1 - FEE); }
            trades.push({ t: candles[i].t, side: target > w ? 'buy' : 'sell', price: px, weight: target });
            w = target;
        }
        eq.push([candles[i].t, r2(START * (cash + units * px)), r2(START * px / first)]);
        ws.push(w);
    }
    // Statistik: andel dagar i BTC, snittandel, justeringar per år och avkastning per månad (bot och buy & hold)
    const months = []; let prev = eq.length ? eq[0] : null, cur = null;
    for (const p of eq) {
        const ym = new Date(p[0] * 1000).toISOString().slice(0, 7);
        if (cur && cur.ym !== ym) { months.push({ m: cur.ym, bot: cur.end[1] / cur.start[1] - 1, bh: cur.end[2] / cur.start[2] - 1 }); prev = cur.end; cur = null; }
        if (!cur) cur = { ym, start: prev, end: p };
        cur.end = p;
    }
    if (cur) months.push({ m: cur.ym, bot: cur.end[1] / cur.start[1] - 1, bh: cur.end[2] / cur.start[2] - 1, partial: true });
    const years = eq.length > 1 ? (eq[eq.length - 1][0] - eq[0][0]) / (365 * 86400) : 1;
    let gap = 0, maxGap = 0; for (const x of ws) { gap = x > 0 ? 0 : gap + 1; maxGap = Math.max(maxGap, gap); }
    const stats = {
        daysIn: ws.filter(x => x > 0).length, days: ws.length, avgWeight: ws.length ? ws.reduce((a, b) => a + b, 0) / ws.length : 0,
        tradesPerYear: trades.length / Math.max(years, 0.1), longestOut: maxGap,
        months: months.map(o => ({ m: o.m, bot: Math.round(o.bot * 10000) / 10000, bh: Math.round(o.bh * 10000) / 10000, partial: !!o.partial }))
    };
    let peak = 0, mdd = 0; for (const p of eq) { peak = Math.max(peak, p[1]); mdd = Math.min(mdd, p[1] / peak - 1); }
    let peakB = 0, mddB = 0; for (const p of eq) { peakB = Math.max(peakB, p[2]); mddB = Math.min(mddB, p[2] / peakB - 1); }
    const last = eq[eq.length - 1] || [0, START, START];
    return { stats, equity: eq, trades, total: last[1] / START - 1, bhTotal: last[2] / START - 1, maxDD: mdd, bhMaxDD: mddB, from: eq.length ? eq[0][0] : null };
}

export async function main() {
    const cfg = loadConfig(), st = loadState(), log = logger(st);
    st.config = cfg; st.lastRun = new Date().toISOString(); st.enabled = cfg.enabled;
    try {
        const now = Date.now();
        const raw = await getJSON('/klines?symbol=' + cfg.symbol + '&interval=1d&limit=1000');
        const candles = raw.filter(k => k[6] < now).map(k => ({ t: Math.floor(k[0] / 1000), o: +k[1], h: +k[2], l: +k[3], c: +k[4] }));
        const maxLen = cfg.lengths[cfg.lengths.length - 1];
        if (candles.length < maxLen + 1) throw new Error('För lite dagsdata (' + candles.length + ' candles)');
        const closes = candles.map(k => k.c);
        const smas = cfg.lengths.map(n => sma(closes, n));
        const n = candles.length - 1, refDay = candles[n].t;

        const bt = await getJSON('/ticker/bookTicker?symbol=' + cfg.symbol);
        const bid = parseFloat(bt.bidPrice), ask = parseFloat(bt.askPrice);
        if (!(bid > 0 && ask >= bid)) throw new Error('Ogiltigt bud/utbud');
        const live = (bid + ask) / 2;
        st.source = source;
        if (!st.baseline) st.baseline = ask * (1 + SLIP);

        const value = () => st.cash + st.units * bid;
        const sig = targetAt(n, closes, smas, cfg);
        st.target = sig.target;
        st.signal = cfg.lengths.map((len, j) => ({ len, sma: r2(smas[j][n]), above: closes[n] > smas[j][n] }));
        st.signalClose = closes[n]; st.signalDay = refDay;

        // Ett beslut per stängd dag. Första körningen går direkt in på dagens mål.
        // Nytt beslut direkt om inställningen (steg/medelvärden) ändrats sedan förra beslutet
        const rules = cfg.step + '|' + cfg.lengths.join(',');
        const prevRules = st.rules || (st.lastDecision ? '0.25|' + cfg.lengths.join(',') : rules);   // läge från före 13 okt saknar fältet
        if (prevRules !== rules) { st.lastDecision = 0; log('Reglerna ändrade (steg ' + prevRules.split('|')[0] + ' → ' + cfg.step + '), fattar nytt beslut direkt.', 'info'); }
        st.rules = rules;
        if (cfg.enabled && refDay > st.lastDecision) {
            const val = value(), curW = st.units * bid / Math.max(val, 1e-9);
            const diff = (sig.target - curW) * val;
            if (Math.abs(diff) >= val * 0.01) {
                if (diff > 0) {
                    const price = ask * (1 + SLIP), spend = Math.min(diff, st.cash), addU = spend * (1 - FEE) / price;
                    st.avgCost = (st.avgCost * st.units + price * addU) / (st.units + addU);
                    st.units += addU; st.cash -= spend;
                    st.trades.push({ t: new Date().toISOString(), side: 'buy', symbol: cfg.symbol, price, weight: sig.target });
                    log('🟢 Köper ' + cfg.symbol.replace('USDT', '') + ' för $' + spend.toFixed(2) + ' @ $' + price.toFixed(2) + ' → ' + Math.round(sig.target * 100) + ' % i BTC (kursen över ' + sig.above + ' av ' + cfg.lengths.length + ' medelvärden)', 'success');
                } else {
                    const price = bid * (1 - SLIP), sellU = Math.min(st.units, -diff / bid), got = sellU * price * (1 - FEE);
                    const pnl = got - sellU * st.avgCost;
                    st.units -= sellU; st.cash += got;
                    if (st.units * price < 1) { st.units = 0; st.avgCost = 0; }
                    st.totalTrades++; if (pnl > 0) st.winningTrades++;
                    st.trades.push({ t: new Date().toISOString(), side: 'sell', symbol: cfg.symbol, price, pnl: r2(pnl), weight: sig.target });
                    log('🔴 Säljer BTC för $' + got.toFixed(2) + ' @ $' + price.toFixed(2) + ' (' + (pnl >= 0 ? '+$' : '-$') + Math.abs(pnl).toFixed(2) + ') → ' + Math.round(sig.target * 100) + ' % i BTC', pnl >= 0 ? 'success' : 'danger');
                }
                if (st.trades.length > 200) st.trades.splice(0, st.trades.length - 200);
            } else {
                log('Dagens beslut: kursen över ' + sig.above + ' av ' + cfg.lengths.length + ' medelvärden → mål ' + Math.round(sig.target * 100) + ' % i BTC. Ingen ändring.', 'info');
            }
            st.lastDecision = refDay;
        }

        // vyer (samma format som övriga botar så att panelen kan återanvändas)
        st.balance = r2(value());
        st.pnl = r2(st.balance - START);
        st.weight = Math.round(100 * st.units * bid / Math.max(st.balance, 1e-9)) / 100;
        st.buyHoldValue = r2(START * (1 - FEE) * (1 - FEE) * bid * (1 - SLIP) / st.baseline);
        const lastPt = st.equity[st.equity.length - 1];
        if (!lastPt || Date.now() - lastPt[0] > 50 * 60000) { st.equity.push([Date.now(), st.balance, st.buyHoldValue]); if (st.equity.length > 2000) st.equity.shift(); }
        st.openPositions = st.units > 0 ? [{ symbol: cfg.symbol, strat: null, entryPrice: r2(st.avgCost), stop: null, tp: null, exposure: r2(st.units * bid), unrealized: r2((bid - st.avgCost) * st.units) }] : [];
        st.marketsView = [{ symbol: cfg.symbol, price: live, spreadPct: (ask - bid) / live * 100, strat: null, inPosition: st.units > 0 }];
        st.cashShare = Math.round(100 * st.cash / Math.max(1, st.balance));

        // Data till sidans graf: senaste året candles + medelvärden, och en simulering bakåt på samma regler
        const from = Math.max(0, candles.length - CHART_DAYS);
        st.chart = {
            candles: candles.slice(from).map(k => [k.t, k.o, k.h, k.l, k.c]),
            smas: cfg.lengths.map((len, j) => ({ len, data: smas[j].slice(from).map((v, i) => v === null ? null : [candles[from + i].t, r2(v)]).filter(Boolean) }))
        };
        const sim = backtest(candles, smas, cfg);
        st.history = {
            from: sim.from, total: sim.total, bhTotal: sim.bhTotal, maxDD: sim.maxDD, bhMaxDD: sim.bhMaxDD,
            trades: sim.trades, stats: sim.stats, equity: sim.equity.filter((p, i, a) => i % 2 === 0 || i === a.length - 1)
        };
        st.lastError = null;
    } catch (e) {
        log('Fel under körningen: ' + e.message + ' (försöker igen vid nästa körning)', 'danger');
        st.lastError = e.message;
    }
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(st));
    console.log('Läge sparat. Värde $' + num(st.balance, 0).toFixed(2) + ', andel BTC ' + Math.round(100 * num(st.weight, 0)) + ' %');
    return st.lastError ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().then(() => { process.exitCode = 0; });
}
