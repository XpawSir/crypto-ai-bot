// ============================================================
//  Algiz kombinationsbot (PAPER TRADING, låtsaspengar). Körs av GitHub Actions var 10:e minut.
//  Pengarna delas i tre lika stora "ben" med olika drivkrafter:
//   1) Krypto-trend: BTC och ETH, äger var och en bara när kursen ligger över sitt 50-dagars medel.
//   2) ETF-trend: SPY, QQQ, TLT (obligationer), GLD (guld), DBC (råvaror), äger var och en bara över sitt 100-dagars medel.
//   3) Aktiemomentum: de 5 starkaste av 30 stora USA-aktier (120 dagar minus senaste 21), nytt urval var 29:e dag.
//  Regler: allt eller inget per tillgång (handlar när signalen byter), plus ombalansering mellan benen var 30:e dag.
//  Kontanter får 3,5 % ränta (modellerat). Beslut en gång per dygn när börsen är öppen.
//  Test 2018–2026 (REPORT-COMBO.md): ca 26 %/år, värsta nedgång −26 % mot −54 % för krypto-trend ensam. Aktiebenet är uppblåst av
//  överlevnadsbias. Historik garanterar inget.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = process.env.BOT_STATE || path.join(HERE, '..', 'state', 'combo.json');
const HOSTS = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com'];
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; algiz-paper-bot)' };
const FEE = 0.001, SLIP = 0.0002, HALF = 0.0003, START = 10000, DAYMS = 86400000, FRESH_MS = 25 * 60000, CASH_RATE = 0.035;
const TREND = [['BTC-USD', 1 / 6, 50], ['ETH-USD', 1 / 6, 50], ['SPY', 1 / 15, 100], ['QQQ', 1 / 15, 100], ['TLT', 1 / 15, 100], ['GLD', 1 / 15, 100], ['DBC', 1 / 15, 100]];
const STOCKS = ['AAPL', 'XOM', 'MSFT', 'GE', 'WMT', 'JNJ', 'PG', 'IBM', 'CVX', 'JPM', 'T', 'KO', 'PFE', 'BAC', 'WFC', 'C', 'CSCO', 'INTC', 'VZ', 'MRK', 'ORCL', 'PEP', 'AMGN', 'DIS', 'MCD', 'HD', 'UNH', 'ABT', 'HPQ', 'AMZN'];
const MOM = { lookback: 120, skip: 21, top: 5, days: 29, w: 1 / 15 }, REBAL_DAYS = 30;
const nm = s => s.replace('-USD', '');
const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
const r2 = v => Math.round(v * 100) / 100;

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
            const mt = ((r.meta && r.meta.regularMarketTime) || 0) * 1000, mday = Math.floor(mt / DAYMS), closes = [];
            r.timestamp.forEach((t, i) => { const v = adj ? adj[i] : q[i]; if (v > 0 && Math.floor(t * 1000 / DAYMS) < mday) closes.push(v); });
            const divs = Object.values((r.events && r.events.dividends) || {}).map(d => ({ t: d.date * 1000, amount: d.amount })).filter(d => d.amount > 0);
            return { closes, price, marketTime: mt, divs };
        } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error('Yahoo svarade inte');
}
export const sma = (a, n) => { if (a.length < n) return null; let s = 0; for (let i = a.length - n; i < a.length; i++) s += a[i]; return s / n; };
export function momentum(closes, lookback, skip) { const j = closes.length - 1 - skip; return j - lookback < 0 ? null : closes[j] / closes[j - lookback] - 1; }

function freshState() {
    return {
        v: 1, kind: 'combobot', balance: START, cash: START, units: {}, avgCost: {}, lastDecision: 0, lastRebal: 0, momSet: null, momDay: 0, divChecked: 0, lastAccrual: 0, interest: 0,
        pnl: 0, totalTrades: 0, winningTrades: 0, baseline: null, equity: [], trades: [], log: [], startedAt: new Date().toISOString(), buyHoldLabel: 'Buy & hold SPY'
    };
}
function loadState() {
    const s = readJSON(STATE_FILE, null);
    if (!s || s.v !== 1 || s.kind !== 'combobot') return freshState();
    const f = freshState(); for (const k of Object.keys(f)) if (s[k] === undefined) s[k] = f[k];
    return s;
}
const logger = st => (m, k) => { st.log.push({ t: new Date().toISOString(), m, k: k || 'info' }); if (st.log.length > 100) st.log.shift(); console.log('[' + (k || 'info') + '] ' + m); };

export async function main() {
    const st = loadState(), log = logger(st);
    st.config = { label: 'Kombinationsbot', enabled: true, strategy: 'krypto-trend + ETF-trend + aktiemomentum, lika delar', symbols: TREND.map(t => t[0]) };
    st.lastRun = new Date().toISOString(); st.enabled = true;
    try {
        const now = Date.now(), today = Math.floor(now / DAYMS);
        // ränta på kontanter
        const dt = st.lastAccrual ? Math.min(2, Math.max(0, (now - st.lastAccrual) / DAYMS)) : 0;
        const gain = st.cash * CASH_RATE * dt / 365; if (gain > 0) { st.cash += gain; st.interest += gain; } st.lastAccrual = now;

        const px = {}, bid = {}, ask = {}, info = {}, divs = {};
        const load = async s => { if (px[s]) return; const c = await getChart(s); px[s] = c.price; bid[s] = c.price * (1 - HALF); ask[s] = c.price * (1 + HALF); info[s] = c; divs[s] = c.divs; };
        await load('SPY');
        const fresh = now - info.SPY.marketTime < FRESH_MS;
        const due = st.enabled && fresh && today - st.lastDecision >= 1;
        for (const s of Object.keys(st.units)) await load(s);
        if (due) { for (const [s] of TREND) await load(s); for (const s of STOCKS) await load(s); }
        if (!st.baseline) st.baseline = px.SPY * (1 + HALF) * (1 + SLIP);
        st.marketOpen = fresh;

        for (const s of Object.keys(st.units)) for (const d of divs[s] || []) if (d.t > (st.divChecked || Date.parse(st.startedAt)) && d.t <= now) {
            const amt = st.units[s] * d.amount; st.cash += amt; log('💵 Utdelning från ' + nm(s) + ': $' + amt.toFixed(2), 'info');
        }
        st.divChecked = now;
        const value = () => { let v = st.cash; for (const s in st.units) v += st.units[s] * (bid[s] || 0); return v; };

        if (due) {
            const val = value(), target = {}, why = {};
            for (const [s, w, n] of TREND) {
                const m = sma(info[s].closes, n), c = info[s].closes[info[s].closes.length - 1];
                if (m !== null && c > m) { target[s] = w; why[s] = 'ben ' + (s.endsWith('-USD') ? '1 (krypto)' : '2 (ETF)') + ': över ' + n + '-dagars medel'; } else why[s] = 'ben ' + (s.endsWith('-USD') ? '1 (krypto)' : '2 (ETF)') + ': under ' + n + '-dagars medel';
            }
            if (!st.momSet || today - st.momDay >= MOM.days) {
                const rk = STOCKS.map(s => ({ s, m: momentum(info[s].closes, MOM.lookback, MOM.skip) })).filter(x => x.m !== null).sort((a, b) => b.m - a.m).slice(0, MOM.top);
                if (rk.length === MOM.top) { st.momSet = rk.map(x => x.s); st.momDay = today; st.momRank = rk.map(x => ({ symbol: x.s, mom: Math.round(x.m * 1000) / 10 })); log('Nytt aktieurval: ' + st.momSet.join(', ') + '.', 'info'); }
            }
            for (const s of st.momSet || []) { target[s] = MOM.w; why[s] = 'ben 3: topp 5 momentum'; }
            const rebal = today - st.lastRebal >= REBAL_DAYS;
            const syms = [...new Set([...Object.keys(target), ...Object.keys(st.units)])];
            for (const s of syms) if (!px[s]) await load(s);
            const order = syms.sort((a, b) => ((target[a] || 0) * val - (st.units[a] || 0) * bid[a]) - ((target[b] || 0) * val - (st.units[b] || 0) * bid[b]));
            let changed = 0;
            for (const s of order) {
                const cur = (st.units[s] || 0) * bid[s], tgt = (target[s] || 0) * val, diff = tgt - cur;
                if (Math.abs(diff) < val * 0.01) continue;
                if (!rebal && (tgt > 0) === (cur > 1)) continue;       // allt eller inget: bara när signalen byter
                changed++;
                if (diff > 0) {
                    const price = ask[s] * (1 + SLIP), spend = Math.min(diff, st.cash); if (spend <= 1) continue;
                    const addU = spend * (1 - FEE) / price, prevU = st.units[s] || 0;
                    st.avgCost[s] = ((st.avgCost[s] || 0) * prevU + price * addU) / (prevU + addU); st.units[s] = prevU + addU; st.cash -= spend;
                    st.trades.push({ t: new Date().toISOString(), side: 'buy', symbol: s, price, amount: r2(spend), weight: target[s] });
                    log((prevU > 0 ? '➕ Ökar (ombalansering) ' : '🟢 Köper ') + nm(s) + ' för $' + spend.toFixed(2) + ' @ $' + price.toFixed(2) + ' (' + (why[s] || 'ombalansering') + ')', 'success');
                } else {
                    const price = bid[s] * (1 - SLIP), sellU = Math.min(st.units[s] || 0, -diff / bid[s]), got = sellU * price * (1 - FEE), pnl = got - sellU * (st.avgCost[s] || price), full = !(tgt > 0);
                    st.units[s] -= sellU; st.cash += got; if (st.units[s] * price < 1) { delete st.units[s]; delete st.avgCost[s]; }
                    if (full) { st.totalTrades++; if (pnl > 0) st.winningTrades++; }
                    st.trades.push({ t: new Date().toISOString(), side: 'sell', symbol: s, price, amount: r2(got), pnl: r2(pnl), weight: target[s] || 0 });
                    log((full ? '🔴 Säljer ' : '➖ Minskar (ombalansering) ') + nm(s) + ' för $' + got.toFixed(2) + ' @ $' + price.toFixed(2) + ' (' + (pnl >= 0 ? '+$' : '-$') + Math.abs(pnl).toFixed(2) + ', ' + (why[s] || 'inte längre i urvalet') + ')', full ? (pnl >= 0 ? 'success' : 'danger') : 'info');
                }
            }
            if (rebal) { st.lastRebal = today; log('Ombalansering mellan benen klar.', 'info'); }
            if (!changed) log('Dagens beslut: ' + Object.keys(target).map(nm).join(', ') + ' (ingen ändring).', 'info');
            st.sigs = Object.fromEntries(Object.keys(why).map(s => [s, { target: target[s] || 0, why: why[s] }]));
            if (st.trades.length > 200) st.trades.splice(0, st.trades.length - 200);
            st.lastDecision = today;
        }

        st.balance = r2(value());
        st.pnl = r2(st.balance - START);
        st.buyHoldValue = r2(START * (1 - FEE) * (1 - FEE) * bid.SPY * (1 - SLIP) / st.baseline);
        const lastPt = st.equity[st.equity.length - 1];
        if (!lastPt || now - lastPt[0] > 50 * 60000) { st.equity.push([now, st.balance, st.buyHoldValue]); if (st.equity.length > 2000) st.equity.shift(); }
        st.openPositions = Object.keys(st.units).map(s => ({ symbol: nm(s), strat: null, entryPrice: r2(st.avgCost[s]), stop: null, tp: null, exposure: r2(st.units[s] * bid[s]), unrealized: r2((bid[s] - st.avgCost[s]) * st.units[s]) }));
        const legOf = s => s.endsWith('-USD') ? 'krypto' : TREND.some(t => t[0] === s) ? 'etf' : 'aktier';
        const leg = { krypto: 0, etf: 0, aktier: 0 }; for (const s in st.units) leg[legOf(s)] += st.units[s] * bid[s];
        st.sleeves = { krypto: r2(leg.krypto), etf: r2(leg.etf), aktier: r2(leg.aktier), kontanter: r2(st.cash) };
        const sg = st.sigs || {};
        st.marketsView = Object.keys(sg).filter(s => TREND.some(t => t[0] === s)).map(s => ({ symbol: nm(s), price: px[s] || null, spreadPct: HALF * 2 * 100, strat: null, inPosition: !!st.units[s], target: sg[s].target ? 1 : 0, why: sg[s].why }))
            .concat((st.momSet || []).map(s => ({ symbol: s, price: px[s] || null, spreadPct: HALF * 2 * 100, strat: null, inPosition: !!st.units[s], target: 1, why: 'ben 3: topp 5 momentum' })));
        st.weight = Math.round(100 * (1 - st.cash / Math.max(st.balance, 1e-9))) / 100;
        st.cashShare = Math.round(100 * st.cash / Math.max(1, st.balance));
        st.lastError = null;
    } catch (e) {
        log('Fel under körningen: ' + e.message + ' (försöker igen vid nästa körning)', 'danger');
        st.lastError = e.message;
    }
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(st));
    console.log('Läge sparat. Värde $' + (st.balance || 0).toFixed(2) + ', investerat ' + Math.round(100 * (st.weight || 0)) + ' %');
    return st.lastError ? 1 : 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { main().then(() => { process.exitCode = 0; }); }
