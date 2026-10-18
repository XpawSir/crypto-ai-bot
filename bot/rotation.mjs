// ============================================================
//  CryptoAI rotationsbot (PAPER TRADING, låtsaspengar). Körs av GitHub Actions tillsammans med övriga botar.
//  Idé från portföljtestet (REPORT-PORTFOLIO.md): en gång i veckan, äg de valutor som stigit mest de senaste
//  LOOKBACK dagarna, men bara de som ligger över sitt eget medelvärde (trendfilter). Resten blir kontanter.
//  Signaler räknas på STÄNGDA dagscandles. Kostnad 0,15 % per handlad krona (avgift + glapp), som i testet.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = process.env.BOT_CONFIG || path.join(HERE, 'config-rotation.json');
const STATE_FILE = process.env.BOT_STATE || path.join(HERE, '..', 'state', 'rotation.json');
const SOURCES = (process.env.BOT_API_BASES
    ? process.env.BOT_API_BASES.split(',')
    : ['https://data-api.binance.vision/api/v3', 'https://api.binance.com/api/v3', 'https://api.binance.us/api/v3']);
const DAY = 86400, COST = 0.001, SLIP = 0.0002, START = 10000;   // 0,1 % avgift + 0,02 % extra glapp; spreaden kommer från riktiga bud/utbud
const ALLOWED = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'LTCUSDT', 'TRXUSDT', 'LINKUSDT', 'SOLUSDT', 'DOGEUSDT'];

const num = (v, d) => (typeof v === 'number' && isFinite(v)) ? v : d;
const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };

function loadConfig() {
    const c = readJSON(CONFIG_FILE, {});
    let uni = Array.isArray(c.universe) ? c.universe.filter(s => ALLOWED.includes(s)) : ALLOWED;
    if (!uni.includes('BTCUSDT')) uni = ['BTCUSDT', ...uni];
    return {
        label: typeof c.label === 'string' ? c.label.slice(0, 40) : 'Rotationsbot',
        enabled: c.enabled !== false,
        universe: [...new Set(uni)],
        lookback: Math.min(250, Math.max(10, Math.round(num(c.lookback, 120)))),
        top: Math.min(6, Math.max(1, Math.round(num(c.top, 3)))),
        trendFilter: Math.max(0, Math.min(250, Math.round(num(c.trendFilter, 100)))),
        rebalDays: Math.min(30, Math.max(1, Math.round(num(c.rebalDays, 7)))),
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
        v: 1, balance: START, cash: START, units: {}, cost: {}, lastRebal: 0, pnl: 0, totalTrades: 0, winningTrades: 0,
        baseline: null, equity: [], trades: [], log: [], startedAt: new Date().toISOString(), buyHoldLabel: 'Buy & hold BTC'
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

// Beslut: vikter per valuta utifrån stängda dagskurser (closes[sym] = array, sista = senaste STÄNGDA dagen)
export function targetWeights(closes, cfg) {
    const cand = [];
    for (const s of cfg.universe) {
        const a = closes[s]; if (!a || a.length < cfg.lookback + 1) continue;
        const n = a.length - 1, r = a[n] / a[n - cfg.lookback] - 1;
        if (!(r > 0)) continue;
        if (cfg.trendFilter) { if (a.length < cfg.trendFilter) continue; let sum = 0; for (let k = n - cfg.trendFilter + 1; k <= n; k++) sum += a[k]; if (a[n] <= sum / cfg.trendFilter) continue; }
        cand.push([s, r]);
    }
    cand.sort((x, y) => y[1] - x[1]);
    const top = cand.slice(0, cfg.top), w = {};
    top.forEach(x => { w[x[0]] = 1 / cfg.top; });   // oanvänd plats = kontanter
    return w;
}

export async function main() {
    const cfg = loadConfig(), st = loadState(), log = logger(st);
    st.config = cfg; st.lastRun = new Date().toISOString(); st.enabled = cfg.enabled;
    try {
        const closes = {}, lastClosedTime = {};
        const now = Date.now();
        for (const s of cfg.universe) {
            const raw = await getJSON('/klines?symbol=' + s + '&interval=1d&limit=400');
            const c = raw.filter(k => k[6] < now);
            if (c.length) { closes[s] = c.map(k => +k[4]); lastClosedTime[s] = Math.floor(c[c.length - 1][0] / 1000); }
        }
        const live = {}, bid = {}, ask = {};
        // bookTicker utan symbol ger bästa bud/utbud för alla par i ett anrop
        (await getJSON('/ticker/bookTicker')).forEach(t => {
            if (!cfg.universe.includes(t.symbol)) return;
            const b = parseFloat(t.bidPrice), a = parseFloat(t.askPrice);
            if (b > 0 && a >= b) { bid[t.symbol] = b; ask[t.symbol] = a; live[t.symbol] = (a + b) / 2; }
        });
        st.source = source;
        if (!live.BTCUSDT || !closes.BTCUSDT) throw new Error('Saknar BTC-data');
        if (!st.baseline) st.baseline = ask.BTCUSDT * (1 + SLIP);

        // Portföljens värde räknas till säljpriset (bid): det man skulle få om man sålde allt nu
        const value = () => { let v = st.cash; for (const s in st.units) v += st.units[s] * (bid[s] || 0); return v; };
        const refDay = lastClosedTime.BTCUSDT;

        if (cfg.enabled && (!st.lastRebal || refDay - st.lastRebal >= cfg.rebalDays * DAY)) {
            const w = targetWeights(closes, cfg);
            const val = value();
            let cost = 0;
            const all = new Set([...Object.keys(st.units), ...Object.keys(w)]);
            for (const s of all) {
                if (!bid[s]) continue;
                let cur = (st.units[s] || 0) * bid[s], tgt = val * (1 - 2 * COST - 2 * SLIP - 0.0005) * (w[s] || 0), diff = tgt - cur;
                const price = diff > 0 ? ask[s] * (1 + SLIP) : bid[s] * (1 - SLIP);
                if (Math.abs(diff) < val * 0.002) continue;      // struntsummor handlas inte
                if (cur > 1 && tgt > 0) continue;                // allt eller inget: en kvarvarande position justeras inte
                cost += Math.abs(diff) * COST;
                if (diff > 0) {
                    const prevU = st.units[s] || 0; diff = Math.min(diff, st.cash); if (diff <= 1) continue; const addU = diff / price;
                    st.cost[s] = ((st.cost[s] || price) * prevU + price * addU) / (prevU + addU);
                    st.units[s] = prevU + addU; st.cash -= diff;
                    st.trades.push({ t: new Date().toISOString(), side: 'buy', symbol: s, price });
                    log('🟢 Köper ' + s.replace('USDT', '') + ' @ $' + price + ' (mål ' + (100 * (w[s] || 0)).toFixed(0) + ' % av portföljen)', 'success');
                } else {
                    const sellU = Math.min(st.units[s], -diff / bid[s]), pnl = (price - st.cost[s]) * sellU - Math.abs(diff) * COST;
                    st.units[s] -= sellU; st.cash += sellU * price;
                    if (st.units[s] * price < 1) {
                        delete st.units[s]; delete st.cost[s]; st.totalTrades++; if (pnl > 0) st.winningTrades++;
                        st.trades.push({ t: new Date().toISOString(), side: 'sell', symbol: s, price, pnl });
                        log('🔴 Säljer ' + s.replace('USDT', '') + ' @ $' + price + ' (' + (pnl >= 0 ? '+$' : '-$') + Math.abs(pnl).toFixed(2) + ')', pnl >= 0 ? 'success' : 'danger');
                    } else log('Minskar ' + s.replace('USDT', '') + ' till ' + (100 * (w[s] || 0)).toFixed(0) + ' %', 'info');
                }
            }
            st.cash -= cost;
            st.lastRebal = refDay;
            log('Ombalansering klar: ' + (Object.keys(w).length ? 'äger ' + Object.keys(w).map(s => s.replace('USDT', '')).join(', ') : 'allt i kontanter (ingen valuta klarar momentum + trendfilter)') + '. Kostnad $' + cost.toFixed(2), 'info');
            if (st.trades.length > 60) st.trades.splice(0, st.trades.length - 60);
        }

        // vyer (samma format som övriga botar så att panelen kan återanvändas)
        st.balance = Math.round(value() * 100) / 100;
        st.pnl = st.balance - START;
        const bh = START * (1 - COST) * (1 - COST) * bid.BTCUSDT * (1 - SLIP) / st.baseline;
        st.buyHoldValue = Math.round(bh * 100) / 100;
        const lastPt = st.equity[st.equity.length - 1];
        if (!lastPt || Date.now() - lastPt[0] > 50 * 60000) { st.equity.push([Date.now(), st.balance, st.buyHoldValue]); if (st.equity.length > 1000) st.equity.shift(); }
        st.openPositions = Object.keys(st.units).map(s => ({ symbol: s, strat: null, entryPrice: st.cost[s], stop: null, tp: null, exposure: st.units[s] * (bid[s] || live[s]), unrealized: ((bid[s] || live[s]) - st.cost[s]) * st.units[s] }));
        st.marketsView = cfg.universe.map(s => ({ symbol: s, price: live[s] || null, spreadPct: live[s] ? (ask[s] - bid[s]) / live[s] * 100 : null, strat: null, inPosition: !!st.units[s] }));
        st.cashShare = Math.round(100 * st.cash / Math.max(1, st.balance));
        st.lastError = null;
    } catch (e) {
        log('Fel under körningen: ' + e.message + ' (försöker igen vid nästa körning)', 'danger');
        st.lastError = e.message;
    }
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(st, null, 1));
    console.log('Läge sparat. Värde $' + st.balance.toFixed(2) + ', affärer ' + st.totalTrades);
    return st.lastError ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().then(() => { process.exitCode = 0; });
}
