// ============================================================
//  Algiz aktiebot, momentum (PAPER TRADING, låtsaspengar). Körs av GitHub Actions var 10:e minut.
//  Universum: de 30 största amerikanska bolagen i början av 2010 (samma lista som i testet REPORT-SINGLE.md).
//  Regel: var 29:e dag rankas aktierna efter kursutveckling de senaste 120 handelsdagarna, förutom de
//  senaste 21 (hoppa över den senaste månaden). De 5 bästa äger lika stora delar. Allt eller inget:
//  en aktie som lämnar topp 5 säljs helt, en ny köps för en femtedel av värdet, kvarvarande aktier justeras inte.
//  Testat 2010–2026: ca 17 % per år efter avgifter mot 14,6 % för lika delar, men INTE godkänt enligt alla
//  kriterier (resultatet hänger på inställningen). Experimentbot. Historik garanterar inget.
//  Priser: Yahoo Finance (fördröjd realtid). Handlar bara medan börsen är öppen (färsk kurs).
//  Kostnad: 0,1 % avgift + 0,02 % glidning per sida, glapp 0,02 %. Kontant utdelning läggs till kontanterna.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = process.env.BOT_CONFIG || path.join(HERE, 'config-stocks.json');
const STATE_FILE = process.env.BOT_STATE || path.join(HERE, '..', 'state', 'stocks.json');
const HOSTS = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com'];
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; algiz-paper-bot)' };
const FEE = 0.001, SLIP = 0.0002, HALF = 0.0002, START = 10000, DAYMS = 86400000, FRESH_MS = 25 * 60000;
const NAMES = {
    AAPL: 'Apple', XOM: 'Exxon Mobil', MSFT: 'Microsoft', GE: 'General Electric', WMT: 'Walmart', JNJ: 'Johnson & Johnson', PG: 'Procter & Gamble',
    IBM: 'IBM', CVX: 'Chevron', JPM: 'JPMorgan Chase', T: 'AT&T', KO: 'Coca-Cola', PFE: 'Pfizer', BAC: 'Bank of America', WFC: 'Wells Fargo',
    C: 'Citigroup', CSCO: 'Cisco', INTC: 'Intel', VZ: 'Verizon', MRK: 'Merck', ORCL: 'Oracle', PEP: 'PepsiCo', AMGN: 'Amgen', DIS: 'Disney',
    MCD: "McDonald's", HD: 'Home Depot', UNH: 'UnitedHealth', ABT: 'Abbott', HPQ: 'HP', AMZN: 'Amazon'
};
const ALLOWED = Object.keys(NAMES);

const num = (v, d) => (typeof v === 'number' && isFinite(v)) ? v : d;
const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
const r2 = v => Math.round(v * 100) / 100;

function loadConfig() {
    const c = readJSON(CONFIG_FILE, {});
    let syms = Array.isArray(c.symbols) ? [...new Set(c.symbols.filter(s => ALLOWED.includes(s)))] : [];
    if (syms.length < 10) syms = ALLOWED;
    return {
        label: typeof c.label === 'string' ? c.label.slice(0, 40) : 'Aktiemomentum',
        enabled: c.enabled !== false,
        symbols: syms,
        lookback: Math.min(250, Math.max(20, Math.round(num(c.lookback, 120)))),
        skip: Math.min(60, Math.max(0, Math.round(num(c.skip, 21)))),
        top: Math.min(10, Math.max(1, Math.round(num(c.top, 5)))),
        rebalDays: Math.min(60, Math.max(7, Math.round(num(c.rebalDays, 29))))
    };
}

async function getChart(sym) {
    let lastErr = null;
    for (const host of HOSTS) {
        try {
            const res = await fetch(host + '/v8/finance/chart/' + encodeURIComponent(sym) + '?range=2y&interval=1d&events=div', { headers: UA, signal: AbortSignal.timeout(20000) });
            if (!res.ok) throw new Error('Yahoo HTTP ' + res.status + ' för ' + sym);
            const j = await res.json(), r = j.chart && j.chart.result && j.chart.result[0];
            if (!r || !r.timestamp) throw new Error('Yahoo: ingen data för ' + sym);
            const q = r.indicators.quote[0].close, adj = r.indicators.adjclose && r.indicators.adjclose[0] && r.indicators.adjclose[0].adjclose;
            const price = r.meta && r.meta.regularMarketPrice;
            if (!(price > 0)) throw new Error('Yahoo: ingen kurs för ' + sym);
            const mt = ((r.meta && r.meta.regularMarketTime) || 0) * 1000, mday = Math.floor(mt / DAYMS);
            const closes = [], raw = [];
            r.timestamp.forEach((t, i) => {
                const v = adj ? adj[i] : q[i]; const d = Math.floor(t * 1000 / DAYMS);
                if (v > 0 && d < mday) closes.push(v);                 // justerade stängningar före handelsdagen: signalen
                if (q[i] > 0 && d < mday) raw.push(q[i]);              // oadjusterade: gårdagens stängning för dagsförändring
            });
            const divs = Object.values((r.events && r.events.dividends) || {}).map(d => ({ t: d.date * 1000, amount: d.amount })).filter(d => d.amount > 0);
            return { closes, price, prevClose: raw.length ? raw[raw.length - 1] : null, marketTime: mt, divs };
        } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error('Yahoo svarade inte');
}

function freshState() {
    return {
        v: 1, kind: 'stockbot', balance: START, cash: START, units: {}, avgCost: {}, lastDecision: 0, divChecked: 0,
        pnl: 0, totalTrades: 0, winningTrades: 0, baseline: null, equity: [], trades: [], log: [],
        startedAt: new Date().toISOString(), buyHoldLabel: 'Buy & hold SPY'
    };
}
function loadState() {
    const s = readJSON(STATE_FILE, null);
    if (!s || s.v !== 1 || s.kind !== 'stockbot') return freshState();
    const f = freshState(); for (const k of Object.keys(f)) if (s[k] === undefined) s[k] = f[k];
    return s;
}
function logger(st) {
    return (m, k) => { st.log.push({ t: new Date().toISOString(), m, k: k || 'info' }); if (st.log.length > 100) st.log.shift(); console.log('[' + (k || 'info') + '] ' + m); };
}

export function momentum(closes, lookback, skip) {
    const j = closes.length - 1 - skip;
    if (j - lookback < 0) return null;
    return closes[j] / closes[j - lookback] - 1;
}

export async function main() {
    const cfg = loadConfig(), st = loadState(), log = logger(st);
    st.config = Object.assign({}, cfg, { strategy: 'momentum ' + cfg.lookback + ' dagar, topp ' + cfg.top + ', var ' + cfg.rebalDays + ':e dag' });
    st.lastRun = new Date().toISOString(); st.enabled = cfg.enabled;
    try {
        const px = {}, bid = {}, ask = {}, info = {}, divs = {};
        let fresh = false;
        for (const s of [...cfg.symbols, 'SPY']) {
            const c = await getChart(s);
            px[s] = c.price; bid[s] = c.price * (1 - HALF); ask[s] = c.price * (1 + HALF);
            if (s === 'SPY') { if (Date.now() - c.marketTime < FRESH_MS) fresh = true; continue; }
            info[s] = { mom: momentum(c.closes, cfg.lookback, cfg.skip), prev: c.prevClose };
            divs[s] = c.divs;
        }
        try { const fx = await getChart('SEK=X'); st.usdsek = r2(fx.price); } catch (e) { /* valutan är bara för visning */ }
        st.marketOpen = fresh;
        if (!st.baseline) st.baseline = px.SPY * (1 + HALF) * (1 + SLIP);

        // Rangordning
        const ranked = cfg.symbols.filter(s => info[s].mom !== null).sort((a, b) => info[b].mom - info[a].mom);
        const topSet = new Set(ranked.slice(0, cfg.top));

        // Utdelning (kontant) för aktier som ägs
        const nowMs = Date.now(), since = st.divChecked || Date.parse(st.startedAt) || nowMs;
        for (const s of cfg.symbols) {
            if (!st.units[s]) continue;
            for (const d of divs[s] || []) if (d.t > since && d.t <= nowMs) {
                const amt = st.units[s] * d.amount; st.cash += amt;
                log('💵 Utdelning från ' + s + ': $' + amt.toFixed(2) + ' ($' + d.amount.toFixed(2) + ' per aktie)', 'info');
            }
        }
        st.divChecked = nowMs;

        const value = () => { let v = st.cash; for (const s in st.units) v += st.units[s] * (bid[s] || 0); return v; };
        const today = Math.floor(Date.now() / DAYMS);
        if (cfg.enabled && fresh && ranked.length >= cfg.top && today - st.lastDecision >= cfg.rebalDays) {
            const val = value(); let changed = 0;
            for (const s of Object.keys(st.units)) {            // sälj först: allt eller inget
                if (topSet.has(s)) continue;
                const price = bid[s] * (1 - SLIP), got = st.units[s] * price * (1 - FEE), pnl = got - st.units[s] * st.avgCost[s];
                st.cash += got; delete st.units[s]; delete st.avgCost[s]; changed++;
                st.totalTrades++; if (pnl > 0) st.winningTrades++;
                st.trades.push({ t: new Date().toISOString(), side: 'sell', symbol: s, price, amount: r2(got), pnl: r2(pnl) });
                log('🔴 Säljer ' + s + ' (' + NAMES[s] + ') för $' + got.toFixed(2) + ' @ $' + price.toFixed(2) + ' (' + (pnl >= 0 ? '+$' : '-$') + Math.abs(pnl).toFixed(2) + ', föll ur topp ' + cfg.top + ')', pnl >= 0 ? 'success' : 'danger');
            }
            for (const s of ranked.slice(0, cfg.top)) {
                if (st.units[s]) continue;
                const price = ask[s] * (1 + SLIP), spend = Math.min(val / cfg.top, st.cash); if (spend <= 1) continue;
                st.units[s] = spend * (1 - FEE) / price; st.avgCost[s] = price; st.cash -= spend; changed++;
                st.trades.push({ t: new Date().toISOString(), side: 'buy', symbol: s, price, amount: r2(spend) });
                log('🟢 Köper ' + s + ' (' + NAMES[s] + ') för $' + spend.toFixed(2) + ' @ $' + price.toFixed(2) + ' (plats ' + (ranked.indexOf(s) + 1) + ' av ' + ranked.length + ', ' + (info[s].mom * 100).toFixed(1) + ' % på ' + cfg.lookback + ' dagar)', 'success');
            }
            log(changed ? 'Månadens urval klart: äger ' + ranked.slice(0, cfg.top).join(', ') + '.' : 'Månadens urval: ingen ändring, äger ' + ranked.slice(0, cfg.top).join(', ') + '.', 'info');
            if (st.trades.length > 200) st.trades.splice(0, st.trades.length - 200);
            st.lastDecision = today;
        }

        st.balance = r2(value());
        st.pnl = r2(st.balance - START);
        st.buyHoldValue = r2(START * (1 - FEE) * (1 - FEE) * bid.SPY * (1 - SLIP) / st.baseline);
        const lastPt = st.equity[st.equity.length - 1];
        if (!lastPt || Date.now() - lastPt[0] > 50 * 60000) { st.equity.push([Date.now(), st.balance, st.buyHoldValue]); if (st.equity.length > 2000) st.equity.shift(); }
        st.openPositions = Object.keys(st.units).map(s => ({ symbol: s, strat: null, entryPrice: r2(st.avgCost[s]), stop: null, tp: null, exposure: r2(st.units[s] * bid[s]), unrealized: r2((bid[s] - st.avgCost[s]) * st.units[s]) }));
        st.stocks = ranked.map((s, i) => ({ symbol: s, name: NAMES[s], price: r2(px[s]), chg: info[s].prev ? Math.round((px[s] / info[s].prev - 1) * 10000) / 100 : null, mom: Math.round(info[s].mom * 1000) / 10, rank: i + 1, held: !!st.units[s], top: topSet.has(s) }));
        st.marketsView = [];
        st.weight = Math.round(100 * (1 - st.cash / Math.max(st.balance, 1e-9))) / 100;
        st.cashShare = Math.round(100 * st.cash / Math.max(1, st.balance));
        st.lastError = null;
    } catch (e) {
        log('Fel under körningen: ' + e.message + ' (försöker igen vid nästa körning)', 'danger');
        st.lastError = e.message;
    }
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(st));
    console.log('Läge sparat. Värde $' + num(st.balance, 0).toFixed(2) + ', investerat ' + Math.round(100 * num(st.weight, 0)) + ' %, börsen ' + (st.marketOpen ? 'öppen' : 'stängd'));
    return st.lastError ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().then(() => { process.exitCode = 0; });
}
