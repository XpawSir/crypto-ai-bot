// ============================================================
//  Algiz trendbot för flera valutor (PAPER TRADING, låtsaspengar). Körs av GitHub Actions var 10:e minut.
//  Pengarna delas lika mellan valutorna. Varje valuta får en målandel 0–100 % av sin del, beräknad på
//  STÄNGDA dagscandles, en gång per dygn (00:00 UTC). Resten ligger som kontanter. Inga stop-loss.
//
//  Lägen (config "mode"):
//   "ensemble" – andel = hur många av medelvärdena (t.ex. 20/50/100/150/200 d) kursen ligger över, i steg.
//                BTC + ETH testades 2018–2026: ca +43 %/år, största nedgång −47 % (buy & hold BTC +26 %/år, −77 %).
//   "voltrend" – äg bara när kursen ligger över sitt 100-dagars medelvärde, och köp mindre när marknaden
//                svänger mycket: andel = mål-volatilitet / 30-dagars volatilitet (max 100 %), i steg om 25 %.
//                Testad på BTC 2016–2026: ca +58 %/år, största nedgång −47 % (buy & hold +63 %/år, −83 %).
//  Historik garanterar inget.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = process.env.BOT_CONFIG || path.join(HERE, 'config-btceth.json');
const STATE_FILE = process.env.BOT_STATE || path.join(HERE, '..', 'state', 'btceth.json');
const SOURCES = (process.env.BOT_API_BASES
    ? process.env.BOT_API_BASES.split(',')
    : ['https://data-api.binance.vision/api/v3', 'https://api.binance.com/api/v3', 'https://api.binance.us/api/v3']);
const FEE = 0.001, SLIP = 0.0002, START = 10000;
const ALLOWED = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT'];

const num = (v, d) => (typeof v === 'number' && isFinite(v)) ? v : d;
const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
const r2 = v => Math.round(v * 100) / 100;
const coin = s => s.replace('USDT', '');

function loadConfig() {
    const c = readJSON(CONFIG_FILE, {});
    let syms = Array.isArray(c.symbols) ? [...new Set(c.symbols.filter(s => ALLOWED.includes(s)))] : [];
    if (!syms.length) syms = ['BTCUSDT'];
    let lengths = Array.isArray(c.lengths) ? c.lengths.map(n => Math.round(n)).filter(n => n >= 5 && n <= 300) : [];
    if (lengths.length < 1) lengths = [20, 50, 100, 150, 200];
    return {
        label: typeof c.label === 'string' ? c.label.slice(0, 40) : 'Trendbot',
        enabled: c.enabled !== false,
        mode: c.mode === 'voltrend' ? 'voltrend' : 'ensemble',
        symbols: syms,
        lengths: [...new Set(lengths)].sort((a, b) => a - b),
        step: [0.1, 0.2, 0.25, 0.5, 1].includes(c.step) ? c.step : 0.25,
        volTarget: Math.min(2, Math.max(0.1, num(c.volTarget, 0.6))),
        volDays: Math.min(90, Math.max(10, Math.round(num(c.volDays, 30)))),
        allIn: c.allIn === true,           // allt eller inget: ingen del-storlek, ingen volatilitetsstyrning
        interval: '1d'
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
        v: 1, kind: 'trendbot', balance: START, cash: START, units: {}, avgCost: {}, lastDecision: 0, rules: null,
        pnl: 0, totalTrades: 0, winningTrades: 0, baseline: null, equity: [], trades: [], log: [],
        startedAt: new Date().toISOString(), buyHoldLabel: 'Buy & hold BTC'
    };
}
function loadState() {
    const s = readJSON(STATE_FILE, null);
    if (!s || s.v !== 1 || s.kind !== 'trendbot') return freshState();
    const f = freshState(); for (const k of Object.keys(f)) if (s[k] === undefined) s[k] = f[k];
    return s;
}
function logger(st) {
    return (m, k) => { st.log.push({ t: new Date().toISOString(), m, k: k || 'info' }); if (st.log.length > 100) st.log.shift(); console.log('[' + (k || 'info') + '] ' + m); };
}

export function sma(a, n) {
    const out = new Array(a.length).fill(null); let s = 0;
    for (let i = 0; i < a.length; i++) { s += a[i]; if (i >= n) s -= a[i - n]; if (i >= n - 1) out[i] = s / n; }
    return out;
}

// Målandel (0..1) för en valuta, på sista stängda dagen i closes. Returnerar även en kort förklaring.
export function targetFor(closes, cfg) {
    const n = closes.length - 1;
    if (cfg.mode === 'voltrend') {
        const len = cfg.lengths[0] || 100;
        if (closes.length < Math.max(len, cfg.volDays + 1)) return { target: 0, why: 'för lite historik' };
        const m = sma(closes, len)[n];
        if (!(closes[n] > m)) return { target: 0, why: 'under ' + len + '-dagars medel' };
        const r = []; for (let i = n - cfg.volDays + 1; i <= n; i++) r.push(closes[i] / closes[i - 1] - 1);
        const mean = r.reduce((a, b) => a + b, 0) / r.length;
        const vol = Math.sqrt(r.reduce((a, b) => a + (b - mean) ** 2, 0) / (r.length - 1)) * Math.sqrt(365);
        const t = cfg.allIn ? 1 : Math.round(Math.min(1, cfg.volTarget / vol) / 0.25) * 0.25;
        return { target: t, why: 'över ' + len + '-dagars medel, volatilitet ' + Math.round(vol * 100) + ' %/år' };
    }
    const maxLen = cfg.lengths[cfg.lengths.length - 1];
    if (closes.length < maxLen) return { target: 0, why: 'för lite historik' };
    const above = cfg.lengths.filter(L => closes[n] > sma(closes, L)[n]).length;
    return { target: Math.round(above / cfg.lengths.length / cfg.step) * cfg.step, why: 'över ' + above + ' av ' + cfg.lengths.length + ' medelvärden' };
}

export async function main() {
    const cfg = loadConfig(), st = loadState(), log = logger(st);
    st.config = Object.assign({}, cfg, { strategy: cfg.mode === 'voltrend' ? 'volatilitetsstyrd trend' : 'trend-ensemble' });
    st.lastRun = new Date().toISOString(); st.enabled = cfg.enabled;
    try {
        const now = Date.now(), N = cfg.symbols.length;
        const closes = {}, bid = {}, ask = {}, sig = {};
        let refDay = 0;
        for (const s of cfg.symbols) {
            const raw = await getJSON('/klines?symbol=' + s + '&interval=1d&limit=400');
            const c = raw.filter(k => k[6] < now);
            closes[s] = c.map(k => +k[4]);
            refDay = Math.max(refDay, Math.floor(c[c.length - 1][0] / 1000));
            const bt = await getJSON('/ticker/bookTicker?symbol=' + s);
            bid[s] = parseFloat(bt.bidPrice); ask[s] = parseFloat(bt.askPrice);
            if (!(bid[s] > 0 && ask[s] >= bid[s])) throw new Error('Ogiltigt bud/utbud för ' + s);
            sig[s] = targetFor(closes[s], cfg);
        }
        // referens: buy & hold BTC (hämtas även om BTC inte handlas)
        let btcAsk = ask.BTCUSDT, btcBid = bid.BTCUSDT;
        if (!btcAsk) { const bt = await getJSON('/ticker/bookTicker?symbol=BTCUSDT'); btcBid = parseFloat(bt.bidPrice); btcAsk = parseFloat(bt.askPrice); }
        st.source = source;
        if (!st.baseline) st.baseline = btcAsk * (1 + SLIP);

        const value = () => { let v = st.cash; for (const s in st.units) v += st.units[s] * (bid[s] || 0); return v; };
        const rules = cfg.mode + '|' + cfg.symbols.join(',') + '|' + cfg.lengths.join(',') + '|' + cfg.step + '|' + cfg.volTarget + '|' + cfg.allIn;
        const migrating = !!(st.rules && st.rules !== rules);   // vid regelbyte får delpositioner justeras en sista gång
        if (migrating) { st.lastDecision = 0; log('Reglerna ändrade, fattar nytt beslut direkt.', 'info'); }
        st.rules = rules;

        if (cfg.enabled && refDay > st.lastDecision) {
            const val = value(); let changed = 0;
            const noTrim = !migrating && (cfg.mode === 'voltrend' ? cfg.allIn : cfg.step === 1);
            // sälj först (frigör kontanter), köp sedan
            const order = [...cfg.symbols].sort((a, b) => {
                const da = sig[a].target / N * val - (st.units[a] || 0) * bid[a], db = sig[b].target / N * val - (st.units[b] || 0) * bid[b];
                return da - db;
            });
            for (const s of order) {
                const cur = (st.units[s] || 0) * bid[s], tgt = sig[s].target / N * val, diff = tgt - cur;
                if (Math.abs(diff) < val * 0.01) continue;
                // allt eller inget: handla bara när signalen byter (in/ut), aldrig små justeringar av en kvarvarande position
                if (noTrim && (tgt > 0) === (cur > 1)) continue;
                changed++;
                if (diff > 0) {
                    const price = ask[s] * (1 + SLIP), spend = Math.min(diff, st.cash); if (spend <= 1) continue;
                    const addU = spend * (1 - FEE) / price, prevU = st.units[s] || 0;
                    st.avgCost[s] = ((st.avgCost[s] || 0) * prevU + price * addU) / (prevU + addU);
                    st.units[s] = prevU + addU; st.cash -= spend;
                    st.trades.push({ t: new Date().toISOString(), side: 'buy', symbol: s, price, amount: r2(spend), weight: sig[s].target });
                    log('🟢 Köper ' + coin(s) + ' för $' + spend.toFixed(2) + ' @ $' + price.toFixed(2) + ' → ' + Math.round(sig[s].target * 100) + ' % av ' + coin(s) + '-delen (' + sig[s].why + ')', 'success');
                } else {
                    const price = bid[s] * (1 - SLIP), sellU = Math.min(st.units[s] || 0, -diff / bid[s]), got = sellU * price * (1 - FEE);
                    const pnl = got - sellU * (st.avgCost[s] || price);
                    st.units[s] -= sellU; st.cash += got;
                    if (st.units[s] * price < 1) { delete st.units[s]; delete st.avgCost[s]; }
                    st.totalTrades++; if (pnl > 0) st.winningTrades++;
                    st.trades.push({ t: new Date().toISOString(), side: 'sell', symbol: s, price, amount: r2(got), pnl: r2(pnl), weight: sig[s].target });
                    log('🔴 Säljer ' + coin(s) + ' för $' + got.toFixed(2) + ' @ $' + price.toFixed(2) + ' (' + (pnl >= 0 ? '+$' : '-$') + Math.abs(pnl).toFixed(2) + ') → ' + Math.round(sig[s].target * 100) + ' % av ' + coin(s) + '-delen (' + sig[s].why + ')', pnl >= 0 ? 'success' : 'danger');
                }
            }
            if (!changed) log('Dagens beslut: ' + cfg.symbols.map(s => coin(s) + ' ' + Math.round(sig[s].target * 100) + ' % (' + sig[s].why + ')').join(', ') + '. Ingen ändring.', 'info');
            if (st.trades.length > 200) st.trades.splice(0, st.trades.length - 200);
            st.lastDecision = refDay;
        }

        // vyer (samma format som övriga botar så att panelerna kan återanvändas)
        st.balance = r2(value());
        st.pnl = r2(st.balance - START);
        st.buyHoldValue = r2(START * (1 - FEE) * (1 - FEE) * btcBid * (1 - SLIP) / st.baseline);
        const lastPt = st.equity[st.equity.length - 1];
        if (!lastPt || Date.now() - lastPt[0] > 50 * 60000) { st.equity.push([Date.now(), st.balance, st.buyHoldValue]); if (st.equity.length > 2000) st.equity.shift(); }
        st.openPositions = Object.keys(st.units).map(s => ({ symbol: s, strat: null, entryPrice: r2(st.avgCost[s]), stop: null, tp: null, exposure: r2(st.units[s] * bid[s]), unrealized: r2((bid[s] - st.avgCost[s]) * st.units[s]) }));
        st.marketsView = cfg.symbols.map(s => ({ symbol: s, price: (bid[s] + ask[s]) / 2, spreadPct: (ask[s] - bid[s]) / ((bid[s] + ask[s]) / 2) * 100, strat: null, inPosition: !!st.units[s], target: sig[s].target, why: sig[s].why }));
        st.weight = Math.round(100 * (1 - st.cash / Math.max(st.balance, 1e-9))) / 100;
        st.cashShare = Math.round(100 * st.cash / Math.max(1, st.balance));
        st.lastError = null;
    } catch (e) {
        log('Fel under körningen: ' + e.message + ' (försöker igen vid nästa körning)', 'danger');
        st.lastError = e.message;
    }
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(st));
    console.log('Läge sparat. Värde $' + num(st.balance, 0).toFixed(2) + ', investerat ' + Math.round(100 * num(st.weight, 0)) + ' %');
    return st.lastError ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().then(() => { process.exitCode = 0; });
}
