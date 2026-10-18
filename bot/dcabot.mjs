// ============================================================
//  Algiz veckosparande, DCA (PAPER TRADING, låtsaspengar). Körs av GitHub Actions var 10:e minut.
//  Startar med $10 000 i kontanter och köper för en fast summa (standard $250) varje vecka, hälften Bitcoin och
//  hälften Ethereum, tills kontanterna är slut. Säljer aldrig och tittar inte på trender. Kontanter som inte
//  köpts än ger ingen ränta. Priser: Yahoo Finance med ett antaget glapp på 0,03 % per sida.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = process.env.BOT_CONFIG || path.join(HERE, 'config-dca.json');
const STATE_FILE = process.env.BOT_STATE || path.join(HERE, '..', 'state', 'dca.json');
const HOSTS = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com'];
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; algiz-paper-bot)' };
const FEE = 0.001, SLIP = 0.0002, HALF = 0.0003, START = 10000, DAYMS = 86400000;
const ALLOWED = ['SPY', 'QQQ', 'IWM', 'EFA', 'EEM', 'TLT', 'GLD', 'DBC', 'VNQ', 'BTC-USD', 'ETH-USD'];
const NAME = { 'BTC-USD': 'BTC', 'ETH-USD': 'ETH' };
const nm = s => NAME[s] || s;

const num = (v, d) => (typeof v === 'number' && isFinite(v)) ? v : d;
const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
const r2 = v => Math.round(v * 100) / 100;

function loadConfig() {
    const c = readJSON(CONFIG_FILE, {});
    let syms = Array.isArray(c.symbols) ? [...new Set(c.symbols.filter(s => ALLOWED.includes(s)))] : [];
    if (syms.length < 1) syms = ['BTC-USD', 'ETH-USD'];
    return {
        label: typeof c.label === 'string' ? c.label.slice(0, 40) : 'Veckosparande',
        enabled: c.enabled !== false,
        symbols: syms,
        perBuy: Math.min(2000, Math.max(10, num(c.perBuy, 250))),
        everyDays: Math.min(30, Math.max(1, Math.round(num(c.everyDays, 7))))
    };
}

// Daglig historik + senaste kurs för en tillgång
async function getChart(sym) {
    let lastErr = null;
    for (const host of HOSTS) {
        try {
            const res = await fetch(host + '/v8/finance/chart/' + encodeURIComponent(sym) + '?range=2y&interval=1d&events=div', { headers: UA, signal: AbortSignal.timeout(20000) });
            if (!res.ok) throw new Error('Yahoo HTTP ' + res.status + ' för ' + sym);
            const j = await res.json(), r = j.chart && j.chart.result && j.chart.result[0];
            if (!r || !r.timestamp) throw new Error('Yahoo: ingen data för ' + sym);
            const q = r.indicators.quote[0].close, adj = r.indicators.adjclose && r.indicators.adjclose[0] && r.indicators.adjclose[0].adjclose;
            const today = Math.floor(Date.now() / DAYMS), closes = [];
            r.timestamp.forEach((t, i) => { const v = adj ? adj[i] : q[i]; if (v > 0 && Math.floor(t * 1000 / DAYMS) < today) closes.push(v); });   // bara stängda dagar till och med igår
            const price = r.meta && r.meta.regularMarketPrice;
            if (!(price > 0)) throw new Error('Yahoo: ingen kurs för ' + sym);
            const divs = Object.values((r.events && r.events.dividends) || {}).map(d => ({ t: d.date * 1000, amount: d.amount })).filter(d => d.amount > 0);
            return { closes, price, divs };
        } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error('Yahoo svarade inte');
}

function freshState() {
    return {
        v: 1, kind: 'dcabot', balance: START, cash: START, units: {}, avgCost: {}, lastBuy: 0, rules: null,
        pnl: 0, totalTrades: 0, winningTrades: 0, baseline: null, equity: [], trades: [], log: [],
        startedAt: new Date().toISOString(), buyHoldLabel: 'Buy & hold BTC'
    };
}
function loadState() {
    const s = readJSON(STATE_FILE, null);
    if (!s || s.v !== 1 || s.kind !== 'dcabot') return freshState();
    const f = freshState(); for (const k of Object.keys(f)) if (s[k] === undefined) s[k] = f[k];
    return s;
}
function logger(st) {
    return (m, k) => { st.log.push({ t: new Date().toISOString(), m, k: k || 'info' }); if (st.log.length > 100) st.log.shift(); console.log('[' + (k || 'info') + '] ' + m); };
}

export async function main() {
    const cfg = loadConfig(), st = loadState(), log = logger(st);
    st.config = Object.assign({}, cfg, { strategy: 'veckosparande $' + cfg.perBuy + ' var ' + cfg.everyDays + ':e dag' });
    st.lastRun = new Date().toISOString(); st.enabled = cfg.enabled;
    try {
        const px = {}, bid = {}, ask = {};
        for (const s of new Set([...cfg.symbols, 'BTC-USD'])) {
            const c = await getChart(s);
            px[s] = c.price; bid[s] = c.price * (1 - HALF); ask[s] = c.price * (1 + HALF);
        }
        if (!st.baseline) st.baseline = ask['BTC-USD'] * (1 + SLIP);
        const value = () => { let v = st.cash; for (const s in st.units) v += st.units[s] * (bid[s] || 0); return v; };

        const today = Math.floor(Date.now() / DAYMS);
        if (cfg.enabled && st.cash > 1 && today - st.lastBuy >= cfg.everyDays) {
            const total = Math.min(cfg.perBuy, st.cash), each = total / cfg.symbols.length;
            for (const s of cfg.symbols) {
                const price = ask[s] * (1 + SLIP), spend = Math.min(each, st.cash); if (spend <= 1) continue;
                const addU = spend * (1 - FEE) / price, prevU = st.units[s] || 0;
                st.avgCost[s] = ((st.avgCost[s] || 0) * prevU + price * addU) / (prevU + addU);
                st.units[s] = prevU + addU; st.cash -= spend;
                st.trades.push({ t: new Date().toISOString(), side: 'buy', symbol: s, price, amount: r2(spend) });
                log('🟢 Sparar $' + spend.toFixed(2) + ' i ' + nm(s) + ' @ $' + price.toFixed(2) + ' (veckans köp, kontanter kvar $' + st.cash.toFixed(0) + ')', 'success');
            }
            if (st.trades.length > 200) st.trades.splice(0, st.trades.length - 200);
            st.lastBuy = today;
        }

        st.balance = r2(value());
        st.pnl = r2(st.balance - START);
        st.buyHoldValue = r2(START * (1 - FEE) * (1 - FEE) * bid['BTC-USD'] * (1 - SLIP) / st.baseline);
        const lastPt = st.equity[st.equity.length - 1];
        if (!lastPt || Date.now() - lastPt[0] > 50 * 60000) { st.equity.push([Date.now(), st.balance, st.buyHoldValue]); if (st.equity.length > 2000) st.equity.shift(); }
        st.openPositions = Object.keys(st.units).map(s => ({ symbol: s, strat: null, entryPrice: r2(st.avgCost[s]), stop: null, tp: null, exposure: r2(st.units[s] * bid[s]), unrealized: r2((bid[s] - st.avgCost[s]) * st.units[s]) }));
        st.marketsView = cfg.symbols.map(s => ({ symbol: nm(s), price: px[s], spreadPct: HALF * 2 * 100, strat: null, inPosition: !!st.units[s], target: undefined, why: undefined }));
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
