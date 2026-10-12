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

const ALL_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT'];

function loadConfig() {
    const c = readJSON(CONFIG_FILE, {});
    let syms = Array.isArray(c.symbols) ? c.symbols : (c.symbol ? [c.symbol] : ['BTCUSDT']);
    syms = [...new Set(syms.filter(x => ALL_SYMBOLS.includes(x)))];
    if (!syms.length) syms = ['BTCUSDT'];
    return {
        enabled: c.enabled !== false,
        symbols: syms,
        interval: STEP[c.interval] ? c.interval : '1h',
        strategy: (c.strategy === 'auto' || (STRATEGIES[c.strategy] && c.strategy !== 'auto')) ? c.strategy : 'auto',
        risk: Math.min(10, Math.max(1, Math.round(num(c.risk, 4)))),
        maxSpend: num(c.maxSpend, 1000) > 0 ? num(c.maxSpend, 1000) : 1000
    };
}

function freshMarket(interval) {
    return { interval: interval, pos: null, autoPick: null, autoMode: 'any', autoLastPick: 0, lastEval: 0, lastPrice: null };
}

function freshState() {
    return {
        v: 2, balance: START_BALANCE, peakBalance: START_BALANCE, pnl: 0,
        totalTrades: 0, winningTrades: 0, totalWinsAmount: 0, totalLossesAmount: 0,
        returnsHistory: [], maxDrawdownVal: 0, markets: {}, trades: [], log: [], startedAt: new Date().toISOString()
    };
}

function loadState() {
    const s = readJSON(STATE_FILE, null);
    if (!s) return freshState();
    if (s.v === 1) {
        // Flytta över den gamla enmarknadsmodellen utan att tappa saldo eller historik
        const sym = (s.config && s.config.symbol) || (s.pos && s.pos.symbol) || 'BTCUSDT';
        const m = freshMarket((s.config && s.config.interval) || '1h');
        m.pos = s.pos || null; m.autoPick = s.autoPick || null; m.autoMode = s.autoMode || 'any';
        m.autoLastPick = s.autoLastPick || 0; m.lastEval = s.lastEval || 0;
        s.markets = { [sym]: m };
        for (const k of ['pos', 'autoPick', 'autoMode', 'autoLastPick', 'lastEval', 'openPositionView', 'priceSymbol']) delete s[k];
        s.v = 2;
    }
    if (s.v !== 2) return freshState();
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
function closePosition(st, m, log, price, reason, whenSec) {
    const p = m.pos;
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
    m.pos = null;
}

function openPosition(st, m, log, cfg, symbol, price, closed, openCandleTime, stratId) {
    const exposure = cfg.maxSpend * (cfg.risk / 2);
    // Total öppen exponering över alla valutor får aldrig överstiga saldot
    const used = Object.values(st.markets).reduce((a, x) => a + (x.pos ? x.pos.exposure : 0), 0);
    if (used + exposure > st.balance) {
        log('Köpsignal på ' + symbol + ' hoppades över: skulle ge större total exponering än saldot.', 'warn');
        return;
    }
    const atr = calculateATR(closed, 14);
    const rm = riskMultFor(cfg.risk);
    const dec = DECIMALS[symbol] ?? 2;
    m.pos = {
        symbol: symbol, interval: cfg.interval, strat: stratId,
        entryPrice: price, entryTime: openCandleTime, entryAt: new Date().toISOString(),
        exposure: exposure, stop: price - atr * 1.5 * rm, tp: price + atr * 2.5 * rm
    };
    log('🟢 Köp ' + symbol + ' @ $' + price.toFixed(dec) + ' [' + STRATEGIES[stratId].name + '] | Stop $' +
        m.pos.stop.toFixed(dec) + ' | TP $' + m.pos.tp.toFixed(dec), 'success');
    st.trades.push({
        t: new Date().toISOString(), side: 'buy', symbol: symbol, price: price, strat: stratId,
        stop: m.pos.stop, tp: m.pos.tp
    });
    if (st.trades.length > 60) st.trades.shift();
}

// Ta igen allt som hänt med en öppen position sedan förra körningen
function catchUp(st, m, log, closed, livePrice) {
    const p = m.pos;
    const strat = STRATEGIES[p.strat];
    const sig = strat.compute(closed);
    for (let j = 0; j < closed.length; j++) {
        const c = closed[j];
        if (c.time <= p.entryTime) continue;
        if (c.low <= p.stop) { closePosition(st, m, log, Math.min(c.open, p.stop), 'stop', c.time); return; }
        if (c.high >= p.tp) { closePosition(st, m, log, Math.max(c.open, p.tp), 'tp', c.time); return; }
        if (sig.sell[j]) { closePosition(st, m, log, c.close, 'signal', c.time); return; }
    }
    // Candlen som pågår just nu: kolla mot livepriset
    if (livePrice <= p.stop) closePosition(st, m, log, livePrice, 'stop');
    else if (livePrice >= p.tp) closePosition(st, m, log, livePrice, 'tp');
}

// AUTO: välj strategi (samma logik som på hemsidan)
function autoRepick(m, log, symbol, closed, rm) {
    const last = closed[closed.length - 1];
    const step = closed.length > 1 ? last.time - closed[closed.length - 2].time : 3600;
    if (m.autoLastPick && last.time - m.autoLastPick < AUTO_REEVAL * step) return;
    m.autoLastPick = last.time;
    const i = closed.length - 1;
    const win = Math.min(AUTO_WINDOW, i - BACKTEST_START);
    if (win < 200) { log('AUTO ' + symbol + ': för lite historik för att välja strategi.', 'warn'); return; }
    const p = pickBest(prepare(closed), closed, i, win, rm, m.autoPick);
    m.autoMode = p.mode;
    if (p.id !== m.autoPick) {
        m.autoPick = p.id;
        if (p.id) log('AUTO ' + symbol + ' väljer ' + STRATEGIES[p.id].name + ' (' + MODE_TEXT[p.mode] + ', poäng ' + p.score.toFixed(1) + ')', 'success');
        else log('AUTO ' + symbol + ': ingen strategi har varit lönsam nyligen, väntar utanför marknaden.', 'info');
    }
}

// Sköt en enskild valuta. Kastar fel vid nätverksproblem (fångas per valuta).
async function runMarket(st, cfg, symbol, log) {
    let m = st.markets[symbol];
    if (!m) m = st.markets[symbol] = freshMarket(cfg.interval);
    setDecimals(DECIMALS[symbol] ?? 2);

    // Nytt tidsintervall: stäng positionen och börja om analysen
    if (m.interval !== cfg.interval) {
        if (m.pos) {
            const t = await getJSON('/ticker/price?symbol=' + symbol);
            closePosition(st, m, log, parseFloat(t.price), 'switch');
        }
        Object.assign(m, freshMarket(cfg.interval));
        log(symbol + ': tidsintervallet ändrades till ' + cfg.interval + '. Analysen börjar om.', 'info');
    }

    if (!cfg.enabled && !m.pos) return;

    const raw = await getJSON('/klines?symbol=' + symbol + '&interval=' + cfg.interval + '&limit=' + HISTORY);
    const ticker = await getJSON('/ticker/price?symbol=' + symbol);
    const livePrice = parseFloat(ticker.price);
    st.source = source;
    m.lastPrice = livePrice;

    const all = raw.map(toCandle);
    const now = Date.now();
    const closed = all.filter(c => c.closeTime < now);
    const openCandle = all[all.length - 1].closeTime >= now ? all[all.length - 1] : null;
    if (closed.length < 250) throw new Error('För lite historik (' + closed.length + ' candles)');
    const lastClosed = closed[closed.length - 1];
    const rm = riskMultFor(cfg.risk);

    // 1) Öppen position: ta igen stop, mål och säljsignaler
    if (m.pos) catchUp(st, m, log, closed, livePrice);

    // 2) Ingen position: leta ny köpsignal, men bara på nystängda candles (inga gamla signaler)
    if (!m.pos && cfg.enabled) {
        if (!m.lastEval) {
            m.lastEval = lastClosed.time;
            log('Serverboten bevakar ' + symbol + ' (' + cfg.interval + ', strategi ' +
                (cfg.strategy === 'auto' ? 'AUTO' : STRATEGIES[cfg.strategy].name) + '). Väntar på nästa signal.', 'success');
        } else if (lastClosed.time > m.lastEval) {
            m.lastEval = lastClosed.time;
            let active;
            if (cfg.strategy === 'auto') { autoRepick(m, log, symbol, closed, rm); active = m.autoPick; }
            else active = cfg.strategy;
            if (active) {
                const sig = STRATEGIES[active].compute(closed);
                const n = closed.length - 1;
                if (sig.buy[n]) openPosition(st, m, log, cfg, symbol, livePrice, closed, openCandle ? openCandle.time : lastClosed.time, active);
                else log('Analyserar ' + symbol + ' (' + cfg.interval + ', ' + STRATEGIES[active].name + '): ' + sig.text(n), 'info');
            }
        }
    }
}

// ---------- Huvudprogram ----------
export async function main() {
    const cfg = loadConfig();
    const st = loadState();
    const log = makeLogger(st);
    st.config = cfg;
    st.lastRun = new Date().toISOString();
    st.enabled = cfg.enabled;
    const errors = [];

    // Valutor som tagits bort ur inställningarna: stäng öppna positioner till aktuellt pris
    for (const sym of Object.keys(st.markets)) {
        if (cfg.symbols.includes(sym)) continue;
        const m = st.markets[sym];
        try {
            if (m.pos) {
                setDecimals(DECIMALS[sym] ?? 2);
                const t = await getJSON('/ticker/price?symbol=' + sym);
                closePosition(st, m, log, parseFloat(t.price), 'switch');
            }
            delete st.markets[sym];
        } catch (e) { errors.push(sym + ': ' + e.message); log('Fel (' + sym + '): ' + e.message, 'danger'); }
    }

    for (const sym of cfg.symbols) {
        try { await runMarket(st, cfg, sym, log); }
        catch (e) { errors.push(sym + ': ' + e.message); log('Fel under körningen (' + sym + '): ' + e.message + ' (försöker igen vid nästa körning)', 'danger'); }
    }
    st.lastError = errors.length ? errors.join(' | ') : null;
    return finish(st, errors.length > 0);
}

function finish(st, errored) {
    st.stats = stats(st);
    const views = [];
    for (const [sym, m] of Object.entries(st.markets)) {
        if (!m.pos) continue;
        views.push({
            symbol: sym, strat: m.pos.strat, entryPrice: m.pos.entryPrice, stop: m.pos.stop, tp: m.pos.tp,
            exposure: m.pos.exposure, entryAt: m.pos.entryAt,
            unrealized: m.lastPrice ? ((m.lastPrice - m.pos.entryPrice) / m.pos.entryPrice) * m.pos.exposure - m.pos.exposure * FEE * 2 : null
        });
    }
    st.openPositions = views;
    st.openPositionView = views[0] || null; // äldre panelversioner
    st.marketsView = Object.entries(st.markets).map(([sym, m]) => ({
        symbol: sym, price: m.lastPrice, strat: m.pos ? m.pos.strat : (m.autoPick || null), autoMode: m.autoMode, inPosition: !!m.pos
    }));
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(st, null, 1));
    console.log('Läge sparat. Saldo $' + st.balance.toFixed(2) + ', affärer ' + st.totalTrades + ', öppna positioner ' + views.length);
    return errored ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().then(code => { process.exitCode = 0; if (code) console.log('Körningen hade fel men läget sparades.'); });
}
