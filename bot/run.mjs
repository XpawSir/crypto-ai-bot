// ============================================================
//  CryptoAI serverbot – körs av GitHub Actions var 10:e minut.
//  PAPER TRADING: simulerad handel med låtsaspengar. Ingen koppling till någon börs, inga nycklar.
//
//  Varje körning: läs sparat läge -> hämta riktiga priser -> ta igen det som hänt sedan sist
//  (stop, take-profit, säljsignal) -> leta ev. ny köpsignal -> spara läget.
//  Reglerna är desamma som i webbläsarboten: signaler bara på STÄNGDA candles, ATR-stop/take-profit, 0,1 % avgift.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    STRATEGIES, BACKTEST_START, AUTO_WINDOW, AUTO_REEVAL, FEE, MODE_TEXT,
    calculateATR, prepare, pickBest, riskMultFor, setDecimals
} from './engine.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = process.env.BOT_CONFIG || path.join(HERE, 'config.json');
const STATE_FILE = process.env.BOT_STATE || path.join(HERE, '..', 'state', 'state.json');
const SOURCES = (process.env.BOT_API_BASES
    ? process.env.BOT_API_BASES.split(',')
    : ['https://data-api.binance.vision/api/v3', 'https://api.binance.com/api/v3', 'https://api.binance.us/api/v3']);

const STEP = { '1m': 60, '5m': 300, '15m': 900, '1h': 3600 };
const DECIMALS = { BTCUSDT: 2, ETHUSDT: 2, SOLUSDT: 2, XRPUSDT: 4 };
const HISTORY = 1000;
const START_BALANCE = 10000;

// ---------- Hjälpfunktioner ----------
function num(v, def) { return (typeof v === 'number' && isFinite(v)) ? v : def; }
function readJSON(file, def) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return def; }
}

function loadConfig() {
    const c = readJSON(CONFIG_FILE, {});
    const cfg = {
        enabled: c.enabled !== false,
        symbol: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT'].includes(c.symbol) ? c.symbol : 'BTCUSDT',
        interval: STEP[c.interval] ? c.interval : '1h',
        strategy: (c.strategy === 'auto' || (STRATEGIES[c.strategy] && c.strategy !== 'auto')) ? c.strategy : 'auto',
        risk: Math.min(10, Math.max(1, Math.round(num(c.risk, 4)))),
        maxSpend: num(c.maxSpend, 1000) > 0 ? num(c.maxSpend, 1000) : 1000
    };
    return cfg;
}

function freshState() {
    return {
        v: 1, balance: START_BALANCE, peakBalance: START_BALANCE, pnl: 0,
        totalTrades: 0, winningTrades: 0, totalWinsAmount: 0, totalLossesAmount: 0,
        returnsHistory: [], maxDrawdownVal: 0, pos: null, autoPick: null, autoMode: 'any', autoLastPick: 0,
        lastEval: 0, trades: [], log: [], startedAt: new Date().toISOString()
    };
}

function loadState() {
    const s = readJSON(STATE_FILE, null);
    if (!s || s.v !== 1) return freshState();
    const f = freshState();
    for (const k of Object.keys(f)) if (s[k] === undefined) s[k] = f[k];
    return s;
}

function stats(st) {
    const r = st.returnsHistory;
    let sharpe = 0;
    if (r.length >= 2) {
        const mean = r.reduce((a, b) => a + b, 0) / r.length;
        const v = r.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (r.length - 1);
        const sd = Math.sqrt(v);
        sharpe = sd > 0 ? mean / sd : 0;
    }
    return {
        winRate: st.totalTrades > 0 ? Math.round(100 * st.winningTrades / st.totalTrades) : 0,
        profitFactor: st.totalLossesAmount > 0 ? st.totalWinsAmount / st.totalLossesAmount : (st.totalWinsAmount > 0 ? null : 0),
        sharpe: sharpe,
        drawdown: st.maxDrawdownVal
    };
}

// ---------- Binance (publik marknadsdata, inga nycklar) ----------
let source = null;
async function getJSON(pathAndQuery) {
    const order = source ? [source, ...SOURCES.filter(s => s !== source)] : SOURCES;
    let lastErr = null;
    for (const base of order) {
        try {
            const res = await fetch(base + pathAndQuery, { signal: AbortSignal.timeout(15000) });
            if (!res.ok) throw new Error('HTTP ' + res.status + ' från ' + base);
            const j = await res.json();
            source = base;
            return j;
        } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error('Ingen datakälla svarade');
}

function toCandle(k) {
    return { time: Math.floor(k[0] / 1000), open: +k[1], high: +k[2], low: +k[3], close: +k[4], closeTime: k[6] };
}

// ---------- Logg ----------
function makeLogger(st) {
    return function log(msg, type) {
        st.log.push({ t: new Date().toISOString(), m: msg, k: type || 'info' });
        if (st.log.length > 100) st.log.splice(0, st.log.length - 100);
        console.log('[' + (type || 'info') + '] ' + msg);
    };
}

// ---------- Handel ----------
function closePosition(st, log, price, reason, whenSec) {
    const p = st.pos;
    const gross = ((price - p.entryPrice) / p.entryPrice) * p.exposure;
    const fees = p.exposure * FEE * 2;
    const delta = gross - fees;

    st.totalTrades++;
    st.pnl += delta;
    st.balance += delta;
    st.returnsHistory.push(delta / p.exposure);
    if (st.returnsHistory.length > 500) st.returnsHistory.shift();
    if (delta >= 0) { st.winningTrades++; st.totalWinsAmount += delta; } else { st.totalLossesAmount += Math.abs(delta); }
    if (st.balance > st.peakBalance) st.peakBalance = st.balance;
    const dd = ((st.peakBalance - st.balance) / st.peakBalance) * 100;
    if (dd > st.maxDrawdownVal) st.maxDrawdownVal = dd;

    const amount = (delta >= 0 ? '+$' : '-$') + Math.abs(delta).toFixed(2);
    const label = { stop: '🛑 Stop-loss', tp: '🎯 Take-profit', signal: '🔴 Säljsignal', switch: 'Position stängd (inställning ändrad)' }[reason] || 'Position stängd';
    log(label + ' ' + p.symbol + ' @ $' + price.toFixed(DECIMALS[p.symbol] ?? 2) + ' [' + STRATEGIES[p.strat].name + ']: ' + amount, delta >= 0 ? 'success' : 'danger');

    st.trades.push({
        t: new Date((whenSec ? whenSec * 1000 : Date.now())).toISOString(), side: 'sell', symbol: p.symbol, price: price,
        strat: p.strat, reason: reason, pnl: delta, entryPrice: p.entryPrice
    });
    if (st.trades.length > 60) st.trades.shift();
    st.pos = null;
}

function openPosition(st, log, cfg, price, closed, openCandleTime, stratId) {
    const exposure = cfg.maxSpend * (cfg.risk / 2);
    const atr = calculateATR(closed, 14);
    const rm = riskMultFor(cfg.risk);
    st.pos = {
        symbol: cfg.symbol, interval: cfg.interval, strat: stratId,
        entryPrice: price, entryTime: openCandleTime, entryAt: new Date().toISOString(),
        exposure: exposure, stop: price - atr * 1.5 * rm, tp: price + atr * 2.5 * rm
    };
    log('🟢 Köp ' + cfg.symbol + ' @ $' + price.toFixed(DECIMALS[cfg.symbol] ?? 2) + ' [' + STRATEGIES[stratId].name + '] | Stop $' +
        st.pos.stop.toFixed(DECIMALS[cfg.symbol] ?? 2) + ' | TP $' + st.pos.tp.toFixed(DECIMALS[cfg.symbol] ?? 2), 'success');
    st.trades.push({
        t: new Date().toISOString(), side: 'buy', symbol: cfg.symbol, price: price, strat: stratId,
        stop: st.pos.stop, tp: st.pos.tp
    });
    if (st.trades.length > 60) st.trades.shift();
}

// Ta igen allt som hänt med en öppen position sedan förra körningen
function catchUp(st, log, closed, livePrice) {
    const p = st.pos;
    const strat = STRATEGIES[p.strat];
    const sig = strat.compute(closed);
    for (let j = 0; j < closed.length; j++) {
        const c = closed[j];
        if (c.time <= p.entryTime) continue;
        if (c.low <= p.stop) { closePosition(st, log, Math.min(c.open, p.stop), 'stop', c.time); return; }
        if (c.high >= p.tp) { closePosition(st, log, Math.max(c.open, p.tp), 'tp', c.time); return; }
        if (sig.sell[j]) { closePosition(st, log, c.close, 'signal', c.time); return; }
    }
    // Candlen som pågår just nu: kolla mot livepriset
    if (livePrice <= p.stop) closePosition(st, log, livePrice, 'stop');
    else if (livePrice >= p.tp) closePosition(st, log, livePrice, 'tp');
}

// AUTO: välj strategi (samma logik som på hemsidan)
function autoRepick(st, log, closed, rm) {
    const last = closed[closed.length - 1];
    const step = closed.length > 1 ? last.time - closed[closed.length - 2].time : 3600;
    if (st.autoLastPick && last.time - st.autoLastPick < AUTO_REEVAL * step) return;
    st.autoLastPick = last.time;
    const i = closed.length - 1;
    const win = Math.min(AUTO_WINDOW, i - BACKTEST_START);
    if (win < 200) { log('AUTO: för lite historik för att välja strategi.', 'warn'); return; }
    const p = pickBest(prepare(closed), closed, i, win, rm, st.autoPick);
    st.autoMode = p.mode;
    if (p.id !== st.autoPick) {
        st.autoPick = p.id;
        if (p.id) log('AUTO väljer ' + STRATEGIES[p.id].name + ' (' + MODE_TEXT[p.mode] + ', poäng ' + p.score.toFixed(1) + ')', 'success');
        else log('AUTO: ingen strategi har varit lönsam nyligen, boten väntar utanför marknaden.', 'info');
    }
}

// ---------- Huvudprogram ----------
export async function main() {
    const cfg = loadConfig();
    const st = loadState();
    const log = makeLogger(st);
    // Byte av valuta eller tidsintervall: analystillståndet tillhör den gamla marknaden, så börja om rent
    const prev = st.config;
    if (prev && (prev.symbol !== cfg.symbol || prev.interval !== cfg.interval)) {
        st.lastEval = 0; st.autoPick = null; st.autoLastPick = 0; st.autoMode = 'any';
        log('Inställningen ändrades till ' + cfg.symbol + ' (' + cfg.interval + '). Analysen börjar om.', 'info');
    }
    st.config = cfg;
    st.lastRun = new Date().toISOString();
    st.enabled = cfg.enabled;
    setDecimals(DECIMALS[cfg.symbol] ?? 2);

    try {
        // Inställning ändrad medan en position är öppen: stäng den till aktuellt pris först
        if (st.pos && (st.pos.symbol !== cfg.symbol || st.pos.interval !== cfg.interval)) {
            const t = await getJSON('/ticker/price?symbol=' + st.pos.symbol);
            closePosition(st, log, parseFloat(t.price), 'switch');
        }

        if (!cfg.enabled && !st.pos) {
            log('Boten är avstängd i config.json (enabled: false).', 'warn');
            return finish(st);
        }

        const raw = await getJSON('/klines?symbol=' + cfg.symbol + '&interval=' + cfg.interval + '&limit=' + HISTORY);
        const ticker = await getJSON('/ticker/price?symbol=' + cfg.symbol);
        const livePrice = parseFloat(ticker.price);
        st.source = source;
        st.lastPrice = livePrice;
        st.priceSymbol = cfg.symbol;

        const all = raw.map(toCandle);
        const now = Date.now();
        const closed = all.filter(c => c.closeTime < now);
        const openCandle = all[all.length - 1].closeTime >= now ? all[all.length - 1] : null;
        if (closed.length < 250) throw new Error('För lite historik (' + closed.length + ' candles)');
        const lastClosed = closed[closed.length - 1];
        const rm = riskMultFor(cfg.risk);

        // 1) Öppen position: ta igen stop, mål och säljsignaler
        if (st.pos) catchUp(st, log, closed, livePrice);

        // 2) Ingen position: leta ny köpsignal, men bara på nystängda candles (inga gamla signaler)
        if (!st.pos && cfg.enabled) {
            if (!st.lastEval) {
                st.lastEval = lastClosed.time;
                log('Serverboten startad på ' + cfg.symbol + ' (' + cfg.interval + ', strategi ' +
                    (cfg.strategy === 'auto' ? 'AUTO' : STRATEGIES[cfg.strategy].name) + '). Väntar på nästa signal.', 'success');
            } else if (lastClosed.time > st.lastEval) {
                st.lastEval = lastClosed.time;
                let active = null;
                if (cfg.strategy === 'auto') {
                    autoRepick(st, log, closed, rm);
                    active = st.autoPick;
                } else {
                    active = cfg.strategy;
                }
                if (active) {
                    const sig = STRATEGIES[active].compute(closed);
                    const n = closed.length - 1;
                    if (sig.buy[n]) openPosition(st, log, cfg, livePrice, closed, openCandle ? openCandle.time : lastClosed.time, active);
                    else log('Analyserar ' + cfg.symbol + ' (' + cfg.interval + ', ' + STRATEGIES[active].name + '): ' + sig.text(n), 'info');
                }
            }
        }
    } catch (e) {
        log('Fel under körningen: ' + e.message + ' (försöker igen vid nästa körning)', 'danger');
        st.lastError = e.message;
        return finish(st, true);
    }
    st.lastError = null;
    return finish(st);
}

function finish(st, errored) {
    st.stats = stats(st);
    st.openPositionView = st.pos ? {
        symbol: st.pos.symbol, strat: st.pos.strat, entryPrice: st.pos.entryPrice, stop: st.pos.stop, tp: st.pos.tp,
        exposure: st.pos.exposure, entryAt: st.pos.entryAt,
        unrealized: (st.priceSymbol === st.pos.symbol && st.lastPrice)
            ? ((st.lastPrice - st.pos.entryPrice) / st.pos.entryPrice) * st.pos.exposure - st.pos.exposure * FEE * 2
            : null
    } : null;
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(st, null, 1));
    console.log('Läge sparat. Saldo $' + st.balance.toFixed(2) + ', affärer ' + st.totalTrades + (st.pos ? ', öppen position' : ''));
    return errored ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().then(code => { process.exitCode = 0; if (code) console.log('Körningen hade fel men läget sparades.'); });
}
