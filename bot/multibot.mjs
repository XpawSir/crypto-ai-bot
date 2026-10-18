// ============================================================
//  Algiz trendkorg över flera tillgångsslag (PAPER TRADING, låtsaspengar). Körs av GitHub Actions var 10:e minut.
//  Pengarna delas lika mellan 7 tillgångar: aktie-ETF:er (SPY, QQQ), obligationer (TLT), guld (GLD),
//  råvaror (DBC), Bitcoin och Ethereum. Varje tillgång äger sin del bara när kursen ligger över sitt
//  150-dagars medelvärde (beräknat på stängda dagar till och med igår), annars kontanter.
//  Beslutet tas en gång i veckan. Inga stop-loss.
//  Testad 2018–2026 (REPORT-MULTI.md): mediannedgång ca −23 % mot −34 % för S&P 500 och −39 % för lika delar,
//  men INTE högre tillväxt än köp och behåll på den osedda halvan. Historik garanterar inget.
//  Priser: Yahoo Finance (inget riktigt bud/utbud för ETF:er, därför antas ett glapp på 0,03 % per sida).
//  Kontant utdelning från ETF:erna läggs till kontanterna (före skatt). ETF:erna handlas bara på börstid: utanför den
//  används senaste kända kurs.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = process.env.BOT_CONFIG || path.join(HERE, 'config-multi.json');
const STATE_FILE = process.env.BOT_STATE || path.join(HERE, '..', 'state', 'multi.json');
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
    if (syms.length < 2) syms = ['SPY', 'QQQ', 'TLT', 'GLD', 'DBC', 'BTC-USD', 'ETH-USD'];
    return {
        label: typeof c.label === 'string' ? c.label.slice(0, 40) : 'Trendkorg',
        enabled: c.enabled !== false,
        symbols: syms,
        sma: Math.min(300, Math.max(20, Math.round(num(c.sma, 150)))),
        rebalDays: Math.min(30, Math.max(1, Math.round(num(c.rebalDays, 7))))
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

export function sma(a, n) { if (a.length < n) return null; let s = 0; for (let i = a.length - n; i < a.length; i++) s += a[i]; return s / n; }
export function targetFor(closes, n) {
    const m = sma(closes, n);
    if (m === null) return { target: 0, why: 'för lite historik' };
    return closes[closes.length - 1] > m ? { target: 1, why: 'över ' + n + '-dagars medel' } : { target: 0, why: 'under ' + n + '-dagars medel' };
}

function freshState() {
    return {
        v: 1, kind: 'multibot', balance: START, cash: START, units: {}, avgCost: {}, lastDecision: 0, rules: null,
        pnl: 0, totalTrades: 0, winningTrades: 0, baseline: null, equity: [], trades: [], log: [],
        startedAt: new Date().toISOString(), buyHoldLabel: 'Buy & hold SPY'
    };
}
function loadState() {
    const s = readJSON(STATE_FILE, null);
    if (!s || s.v !== 1 || s.kind !== 'multibot') return freshState();
    const f = freshState(); for (const k of Object.keys(f)) if (s[k] === undefined) s[k] = f[k];
    return s;
}
function logger(st) {
    return (m, k) => { st.log.push({ t: new Date().toISOString(), m, k: k || 'info' }); if (st.log.length > 100) st.log.shift(); console.log('[' + (k || 'info') + '] ' + m); };
}

export async function main() {
    const cfg = loadConfig(), st = loadState(), log = logger(st);
    st.config = Object.assign({}, cfg, { strategy: 'trendkorg SMA ' + cfg.sma + (cfg.rebalDays === 1 ? ', dagligen' : ', var ' + cfg.rebalDays + ':e dag') });
    st.lastRun = new Date().toISOString(); st.enabled = cfg.enabled;
    try {
        const N = cfg.symbols.length, px = {}, bid = {}, ask = {}, sig = {}, divs = {};
        for (const s of cfg.symbols) {
            const c = await getChart(s);
            px[s] = c.price; bid[s] = c.price * (1 - HALF); ask[s] = c.price * (1 + HALF);
            sig[s] = targetFor(c.closes, cfg.sma);
            divs[s] = c.divs || [];
        }
        if (!st.baseline) st.baseline = px.SPY * (1 + HALF) * (1 + SLIP);
        // Utdelning: kontant utdelning (ex-datum sedan förra kontrollen) för ETF:er som ägs just nu läggs till kontanterna
        const nowMs = Date.now(), since = st.divChecked || Date.parse(st.startedAt) || nowMs;
        for (const s of cfg.symbols) {
            if (!st.units[s]) continue;
            for (const d of divs[s] || []) if (d.t > since && d.t <= nowMs) {
                const amt = st.units[s] * d.amount; st.cash += amt;
                log('💵 Utdelning från ' + nm(s) + ': $' + amt.toFixed(2) + ' ($' + d.amount.toFixed(3) + ' per andel)', 'info');
            }
        }
        st.divChecked = nowMs;
        const value = () => { let v = st.cash; for (const s in st.units) v += st.units[s] * (bid[s] || 0); return v; };
        const rules = cfg.symbols.join(',') + '|' + cfg.sma + '|' + cfg.rebalDays;
        if (st.rules && st.rules !== rules) { st.lastDecision = 0; log('Reglerna ändrade, fattar nytt beslut direkt.', 'info'); }
        st.rules = rules;

        const today = Math.floor(Date.now() / DAYMS);
        if (cfg.enabled && today - st.lastDecision >= cfg.rebalDays) {
            const val = value(); let changed = 0;
            const order = [...cfg.symbols].sort((a, b) => (sig[a].target / N * val - (st.units[a] || 0) * bid[a]) - (sig[b].target / N * val - (st.units[b] || 0) * bid[b]));   // sälj först
            for (const s of order) {
                const cur = (st.units[s] || 0) * bid[s], tgt = sig[s].target / N * val, diff = tgt - cur;
                if (Math.abs(diff) < val * 0.01) continue;
                if ((sig[s].target > 0) === (cur > 1)) continue;   // allt eller inget: handla bara när signalen byter, aldrig justera en kvarvarande position
                changed++;
                if (diff > 0) {
                    const price = ask[s] * (1 + SLIP), spend = Math.min(diff, st.cash); if (spend <= 1) continue;
                    const addU = spend * (1 - FEE) / price, prevU = st.units[s] || 0;
                    st.avgCost[s] = ((st.avgCost[s] || 0) * prevU + price * addU) / (prevU + addU);
                    st.units[s] = prevU + addU; st.cash -= spend;
                    st.trades.push({ t: new Date().toISOString(), side: 'buy', symbol: s, price, amount: r2(spend), weight: sig[s].target });
                    log((prevU > 0 ? '➕ Ökar (ombalansering) ' : '🟢 Köper ') + nm(s) + ' för $' + spend.toFixed(2) + ' @ $' + price.toFixed(2) + ' (' + sig[s].why + ')', 'success');
                } else {
                    const price = bid[s] * (1 - SLIP), sellU = Math.min(st.units[s] || 0, -diff / bid[s]), got = sellU * price * (1 - FEE);
                    const pnl = got - sellU * (st.avgCost[s] || price), full = sig[s].target === 0;
                    st.units[s] -= sellU; st.cash += got;
                    if (st.units[s] * price < 1) { delete st.units[s]; delete st.avgCost[s]; }
                    if (full) { st.totalTrades++; if (pnl > 0) st.winningTrades++; }   // bara helt avslutade positioner räknas som sålda affärer
                    st.trades.push({ t: new Date().toISOString(), side: 'sell', symbol: s, price, amount: r2(got), pnl: r2(pnl), weight: sig[s].target });
                    log((full ? '🔴 Säljer ' : '➖ Minskar (ombalansering) ') + nm(s) + ' för $' + got.toFixed(2) + ' @ $' + price.toFixed(2) + ' (' + (pnl >= 0 ? '+$' : '-$') + Math.abs(pnl).toFixed(2) + ', ' + sig[s].why + ')', full ? (pnl >= 0 ? 'success' : 'danger') : 'info');
                }
            }
            if (!changed) log('Dagens beslut: ' + cfg.symbols.map(s => nm(s) + ' ' + (sig[s].target ? 'in' : 'ut')).join(', ') + '. Ingen ändring.', 'info');
            else log('Beslut klart: äger ' + (cfg.symbols.filter(s => sig[s].target).map(nm).join(', ') || 'bara kontanter') + '.', 'info');
            if (st.trades.length > 200) st.trades.splice(0, st.trades.length - 200);
            st.lastDecision = today;
        }

        // vyer i samma format som övriga botar
        st.balance = r2(value());
        st.pnl = r2(st.balance - START);
        st.buyHoldValue = r2(START * (1 - FEE) * (1 - FEE) * bid.SPY * (1 - SLIP) / st.baseline);
        const lastPt = st.equity[st.equity.length - 1];
        if (!lastPt || Date.now() - lastPt[0] > 50 * 60000) { st.equity.push([Date.now(), st.balance, st.buyHoldValue]); if (st.equity.length > 2000) st.equity.shift(); }
        st.openPositions = Object.keys(st.units).map(s => ({ symbol: s, strat: null, entryPrice: r2(st.avgCost[s]), stop: null, tp: null, exposure: r2(st.units[s] * bid[s]), unrealized: r2((bid[s] - st.avgCost[s]) * st.units[s]) }));
        st.marketsView = cfg.symbols.map(s => ({ symbol: nm(s), price: px[s], spreadPct: HALF * 2 * 100, strat: null, inPosition: !!st.units[s], target: sig[s].target, why: sig[s].why }));
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
