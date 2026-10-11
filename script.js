// ============================================================
//  CryptoAI Pro Terminal – script.js
//  Graf: TradingView Lightweight Charts (candlesticks + EMA + köp/sälj-markörer)
//  Data: Binance publika API (riktiga candles, inga påhittade priser)
//  OBS: Boten handlar med låtsaspengar (paper trading), den är inte kopplad till någon börs.
// ============================================================

// ---------- DOM ----------
const toggleBtn = document.getElementById('toggle-bot-btn');
const botStatusBadge = document.getElementById('bot-status-badge');
const aiLog = document.getElementById('ai-log');
const riskRange = document.getElementById('risk-range');
const riskValue = document.getElementById('risk-value');
const maxSpendInput = document.getElementById('max-spend-input');
const cryptoPriceEl = document.getElementById('crypto-price');
const cryptoChangeEl = document.getElementById('crypto-change');
const totalBalanceEl = document.getElementById('total-balance');
const dailyPnlEl = document.getElementById('daily-pnl');
const cryptoSelect = document.getElementById('crypto-select');
const intervalSelect = document.getElementById('interval-select');
const strategySelect = document.getElementById('strategy-select');
const legendLines = document.getElementById('legend-lines');
const chartContainer = document.getElementById('tv-chart-container');

const metricSharpe = document.getElementById('metric-sharpe');
const metricDrawdown = document.getElementById('metric-drawdown');
const metricWinrate = document.getElementById('metric-winrate');
const metricProfitfactor = document.getElementById('metric-profitfactor');
const marketSpreadEl = document.getElementById('market-spread');

// ---------- Inställningar ----------
const API = 'https://api.binance.com/api/v3';
const HISTORY_LIMIT = 300;   // antal candles som hämtas vid start
const REFRESH_MS = 3000;     // hur ofta live-data hämtas
const BOT_MS = 4000;         // hur ofta boten kollar läget
// Stop-loss växer med tidsintervallet (längre candles svänger mer)
const STOP_BY_INTERVAL = { '1m': 0.003, '5m': 0.006, '15m': 0.01, '1h': 0.02 };
const BACKTEST_CANDLES = 4000;  // så många candles används för stjärnorna
const BACKTEST_START = 200;     // alla strategier jämförs från samma startpunkt
const FEE = 0.001;           // 0,1 % avgift per köp/sälj (som Binance spot)
const COLORS = { up: '#0ecb81', down: '#f6465d', ema9: '#facc15', ema21: '#38bdf8' };
const decimalsBySymbol = { BTCUSDT: 2, ETHUSDT: 2, SOLUSDT: 2, XRPUSDT: 4 };
// ---------- Strategier ----------
// Varje strategi räknar ut köp/sälj per candle (bara med data fram till den candlen),
// och ev. linjer som ritas på grafen. Samma kod används av boten och av backtestet.
function emaArr(v, p) {
    const k = 2 / (p + 1), o = [];
    for (let i = 0; i < v.length; i++) o.push(i === 0 ? v[i] : v[i] * k + o[i - 1] * (1 - k));
    return o;
}
function rsiArr(v, p) {
    const out = v.map(function () { return null; });
    if (v.length <= p) return out;
    let g = 0, l = 0;
    for (let i = 1; i <= p; i++) { const d = v[i] - v[i - 1]; if (d >= 0) g += d; else l -= d; }
    let ag = g / p, al = l / p;
    out[p] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
    for (let i = p + 1; i < v.length; i++) {
        const d = v[i] - v[i - 1];
        ag = (ag * (p - 1) + (d > 0 ? d : 0)) / p;
        al = (al * (p - 1) + (d < 0 ? -d : 0)) / p;
        out[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
    }
    return out;
}
function crossUp(a, b, i) { return i > 0 && a[i - 1] <= b[i - 1] && a[i] > b[i]; }
function crossDown(a, b, i) { return i > 0 && a[i - 1] >= b[i - 1] && a[i] < b[i]; }
function signals(n, fb, fs) {
    const buy = [], sell = [];
    for (let i = 0; i < n; i++) { buy.push(!!fb(i)); sell.push(!!fs(i)); }
    return { buy: buy, sell: sell };
}
function emaStrategy(name, f, s) {
    return {
        name: name, colors: ['#facc15', '#38bdf8'],
        legend: [['EMA ' + f + ':', 'Snabb trend'], ['EMA ' + s + ':', 'Långsam trend']],
        compute: function (d) {
            const c = d.map(function (x) { return x.close; }), a = emaArr(c, f), b = emaArr(c, s);
            const r = signals(d.length, function (i) { return crossUp(a, b, i); }, function (i) { return crossDown(a, b, i); });
            r.lines = [a, b];
            r.text = function (i) { return 'EMA ' + f + ' ' + fmt(a[i]) + ' / EMA ' + s + ' ' + fmt(b[i]); };
            return r;
        }
    };
}
const STRATEGIES = {
    'ema': emaStrategy('EMA 9/21', 9, 21),
    'ema-50-200': emaStrategy('EMA 50/200 (Golden Cross)', 50, 200),
    'ema-fast': emaStrategy('EMA 3/8 (snabbtest)', 3, 8),
    'macd': {
        name: 'MACD 12/26/9', colors: [], legend: [],
        compute: function (d) {
            const c = d.map(function (x) { return x.close; }), e12 = emaArr(c, 12), e26 = emaArr(c, 26);
            const m = e12.map(function (x, i) { return x - e26[i]; }), sg = emaArr(m, 9);
            const r = signals(d.length, function (i) { return crossUp(m, sg, i); }, function (i) { return crossDown(m, sg, i); });
            r.lines = [];
            r.text = function (i) { return 'MACD ' + m[i].toFixed(2) + ' / signal ' + sg[i].toFixed(2); };
            return r;
        }
    },
    'rsi': {
        name: 'RSI 14 (köp under 30, sälj över 70)', colors: [], legend: [],
        compute: function (d) {
            const v = rsiArr(d.map(function (x) { return x.close; }), 14);
            const r = signals(d.length, function (i) { return v[i] !== null && v[i] < 30; }, function (i) { return v[i] !== null && v[i] > 70; });
            r.lines = [];
            r.text = function (i) { return 'RSI ' + (v[i] === null ? '-' : v[i].toFixed(1)); };
            return r;
        }
    },
    'bb': {
        name: 'Bollinger 20/2 (mean reversion)', colors: ['#a78bfa', '#facc15', '#a78bfa'],
        legend: [['Band:', 'Övre/undre (2 std)'], ['Mitt:', 'Snitt 20']],
        compute: function (d) {
            const c = d.map(function (x) { return x.close; }), mid = [], up = [], lo = [];
            for (let i = 0; i < c.length; i++) {
                if (i < 19) { mid.push(null); up.push(null); lo.push(null); continue; }
                let sum = 0, q = 0;
                for (let j = i - 19; j <= i; j++) sum += c[j];
                const m = sum / 20;
                for (let j = i - 19; j <= i; j++) q += (c[j] - m) * (c[j] - m);
                const sd = Math.sqrt(q / 20);
                mid.push(m); up.push(m + 2 * sd); lo.push(m - 2 * sd);
            }
            const r = signals(d.length, function (i) { return lo[i] !== null && c[i] < lo[i]; }, function (i) { return mid[i] !== null && c[i] > mid[i]; });
            r.lines = [up, mid, lo];
            r.text = function (i) { return 'Pris ' + fmt(c[i]) + ' / nedre ' + (lo[i] === null ? '-' : fmt(lo[i])) + ' / mitt ' + (mid[i] === null ? '-' : fmt(mid[i])); };
            return r;
        }
    },
    'donchian': {
        name: 'Donchian 20/10 (breakout)', colors: ['#fb923c', '#a78bfa'],
        legend: [['Övre:', 'Högsta 20'], ['Nedre:', 'Lägsta 10']],
        compute: function (d) {
            const hi = [], lo = [];
            for (let i = 0; i < d.length; i++) {
                if (i < 20) { hi.push(null); lo.push(null); continue; }
                let h = -Infinity, l = Infinity;
                for (let j = i - 20; j < i; j++) h = Math.max(h, d[j].high);
                for (let j = i - 10; j < i; j++) l = Math.min(l, d[j].low);
                hi.push(h); lo.push(l);
            }
            const r = signals(d.length, function (i) { return hi[i] !== null && d[i].close > hi[i]; }, function (i) { return lo[i] !== null && d[i].close < lo[i]; });
            r.lines = [hi, lo];
            r.text = function (i) { return 'Pris ' + fmt(d[i].close) + ' / högsta20 ' + (hi[i] === null ? '-' : fmt(hi[i])) + ' / lägsta10 ' + (lo[i] === null ? '-' : fmt(lo[i])); };
            return r;
        }
    }
};
const STRATEGY_IDS = Object.keys(STRATEGIES);
const stars = {}; // id -> 1-5 (eller null om för få affärer)


// ---------- Hjälpfunktioner för localStorage ----------
function loadSetting(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
}
function saveSetting(key, val) {
    try { localStorage.setItem(key, val); } catch (e) { /* ignoreras */ }
}

// ---------- Återställ sparade val ----------
const savedSymbol = loadSetting('cryptoai_symbol');
if (savedSymbol && [...cryptoSelect.options].some(o => o.value === savedSymbol)) {
    cryptoSelect.value = savedSymbol;
}
const savedInterval = loadSetting('cryptoai_interval');
if (savedInterval && [...intervalSelect.options].some(o => o.value === savedInterval)) {
    intervalSelect.value = savedInterval;
}
strategySelect.innerHTML = '';
STRATEGY_IDS.forEach(function (id) {
    const o = document.createElement('option');
    o.value = id;
    strategySelect.appendChild(o);
});
const savedStrategy = loadSetting('cryptoai_strategy');
if (savedStrategy && STRATEGIES[savedStrategy]) strategySelect.value = savedStrategy;
refreshOptionLabels();
const savedRisk = loadSetting('cryptoai_risk');
if (savedRisk) {
    riskRange.value = savedRisk;
    riskValue.textContent = riskRange.value + ' / 10';
}

// ---------- Tillstånd ----------
let selectedSymbol = cryptoSelect.value;
let selectedInterval = intervalSelect.value;
let strategy = STRATEGIES[strategySelect.value] || STRATEGIES['ema'];

let candles = [];            // { time, open, high, low, close }
let markers = [];            // köp/sälj-pilar på grafen
let currentPrice = 0;
let historyReady = false;
let loading = false;
let loadToken = 0;
let refreshing = false;
let connected = null;
let lastEmaTime = 0;
let lastEvalTime = 0;

let isRunning = false;
let tradeInterval = null;

let balance = 10000.00;
let peakBalance = 10000.00;
let pnl = 0.00;
let totalTrades = 0;
let winningTrades = 0;
let totalWinsAmount = 0;
let totalLossesAmount = 0;
let returnsHistory = [];
let maxDrawdownVal = 0;
let hasOpenPosition = false;
let entryPrice = 0;
let positionExposure = 0;

// ---------- Formatering ----------
function dec() {
    return decimalsBySymbol[selectedSymbol] !== undefined ? decimalsBySymbol[selectedSymbol] : 2;
}
function fmt(p) {
    return p.toLocaleString('en-US', { minimumFractionDigits: dec(), maximumFractionDigits: dec() });
}

// ---------- Grafen ----------
const chart = LightweightCharts.createChart(chartContainer, {
    autoSize: true,
    layout: {
        background: { type: LightweightCharts.ColorType.Solid, color: '#0b0e11' },
        textColor: '#9ca3af'
    },
    grid: {
        vertLines: { color: '#1e2329' },
        horzLines: { color: '#1e2329' }
    },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
    rightPriceScale: { borderColor: '#1e2329' },
    timeScale: {
        borderColor: '#1e2329',
        timeVisible: true,
        secondsVisible: false,
        // Visa lokal tid (inte UTC)
        tickMarkFormatter: function (time, type) {
            const d = new Date(time * 1000);
            if (type >= 3) return d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
            return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
        }
    },
    localization: {
        timeFormatter: function (time) {
            return new Date(time * 1000).toLocaleString('sv-SE', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
            });
        }
    }
});

const candleSeries = chart.addCandlestickSeries({
    upColor: COLORS.up,
    downColor: COLORS.down,
    wickUpColor: COLORS.up,
    wickDownColor: COLORS.down,
    borderVisible: false
});

const lineOpts = { lineWidth: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false };
const overlaySeries = [0, 1, 2].map(function () { return chart.addLineSeries(lineOpts); }); // strategins linjer

function applyPrecision() {
    const d = dec();
    const fmtOpts = { priceFormat: { type: 'price', precision: d, minMove: 1 / Math.pow(10, d) } };
    candleSeries.applyOptions(fmtOpts);
    overlaySeries.forEach(function (x) { x.applyOptions(fmtOpts); });
}

// ---------- Indikatorer ----------
function toPoints(d, arr) {
    const out = [];
    for (let i = 0; i < d.length; i++) {
        if (arr[i] !== null && arr[i] !== undefined) out.push({ time: d[i].time, value: arr[i] });
    }
    return out;
}

function setOverlays() {
    const res = strategy.compute(candles);
    overlaySeries.forEach(function (x, j) {
        if (res.lines[j]) {
            x.applyOptions({ color: strategy.colors[j] });
            x.setData(toPoints(candles, res.lines[j]));
        } else {
            x.setData([]);
        }
    });
    lastEmaTime = candles[candles.length - 1].time;
}

function updateLegend() {
    if (!legendLines) return;
    legendLines.innerHTML = strategy.legend.length
        ? strategy.legend.map(function (l, j) {
            return '<div><span class="inline-block w-3 h-1 mr-1" style="background:' + strategy.colors[j] + '"></span><strong>' + l[0] + '</strong> ' + l[1] + '</div>';
        }).join('')
        : '<div>Inga linjer, signalerna syns som pilar</div>';
}

// ---------- Logg ----------
function addLog(msg, type) {
    const time = new Date().toLocaleTimeString();
    const div = document.createElement('div');
    div.className = type === 'success' ? 'text-emerald-400 font-semibold' : (type === 'danger' ? 'text-red-400' : 'text-gray-300');
    div.innerHTML = '<span class="text-gray-500">[' + time + ']</span> ' + msg;
    aiLog.appendChild(div);
    while (aiLog.children.length > 200) aiLog.removeChild(aiLog.firstChild);
    aiLog.scrollTop = aiLog.scrollHeight;
}

// ---------- Datahämtning ----------
async function getJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
}

function toCandle(k) {
    return {
        time: Math.floor(k[0] / 1000),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4])
    };
}

function setConnection(ok, err) {
    if (ok === connected) return;
    connected = ok;
    if (ok) {
        addLog('Ansluten till Binance, live-data hämtas.', 'success');
    } else {
        addLog('Kunde inte hämta data från Binance' + (err ? ' (' + err.message + ')' : '') + '. Försöker igen...', 'danger');
    }
}

async function loadHistory() {
    const myToken = ++loadToken;
    loading = true;
    historyReady = false;
    try {
        const raw = await getJSON(API + '/klines?symbol=' + selectedSymbol + '&interval=' + selectedInterval + '&limit=' + HISTORY_LIMIT);
        if (myToken !== loadToken) return;
        candles = raw.map(toCandle);
        candleSeries.setData(candles);
        setOverlays();
        if (candles.length > 1) lastEvalTime = candles[candles.length - 2].time;
        chart.timeScale().fitContent();
        historyReady = true;
        setConnection(true);
        refreshMarket();
    } catch (e) {
        if (myToken === loadToken) setConnection(false, e);
    } finally {
        if (myToken === loadToken) loading = false;
    }
}

function applyCandles(list) {
    for (const c of list) {
        const last = candles[candles.length - 1];
        if (last && c.time < last.time) continue;
        if (last && c.time === last.time) {
            candles[candles.length - 1] = c;
        } else {
            candles.push(c);
        }
        candleSeries.update(c);
    }
    if (candles.length > 1000) candles.shift();

    // Uppdatera strategins linjer för de två senaste candlesen
    const res = strategy.compute(candles);
    const n = candles.length;
    for (let i = Math.max(0, n - 2); i < n; i++) {
        if (candles[i].time < lastEmaTime) continue;
        overlaySeries.forEach(function (x, j) {
            const v = res.lines[j] ? res.lines[j][i] : null;
            if (v !== null && v !== undefined) x.update({ time: candles[i].time, value: v });
        });
        lastEmaTime = candles[i].time;
    }
}

async function refreshMarket() {
    if (!historyReady) {
        if (!loading) loadHistory();
        return;
    }
    if (refreshing) return;
    refreshing = true;
    const tok = loadToken;
    try {
        const results = await Promise.all([
            getJSON(API + '/klines?symbol=' + selectedSymbol + '&interval=' + selectedInterval + '&limit=2'),
            getJSON(API + '/ticker/24hr?symbol=' + selectedSymbol),
            getJSON(API + '/ticker/bookTicker?symbol=' + selectedSymbol)
        ]);
        if (tok !== loadToken) return; // användaren hann byta symbol/intervall

        applyCandles(results[0].map(toCandle));

        const tick = results[1];
        currentPrice = parseFloat(tick.lastPrice);
        const change = parseFloat(tick.priceChangePercent);
        cryptoPriceEl.textContent = '$' + fmt(currentPrice);
        cryptoChangeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
        cryptoChangeEl.className = 'text-[11px] font-mono font-semibold ' + (change >= 0 ? 'text-emerald-400' : 'text-red-400');

        const bid = parseFloat(results[2].bidPrice);
        const ask = parseFloat(results[2].askPrice);
        if (ask > 0) marketSpreadEl.textContent = (((ask - bid) / ask) * 100).toFixed(4) + '%';

        setConnection(true);
    } catch (e) {
        setConnection(false, e);
    } finally {
        refreshing = false;
    }
}

// ---------- Köp/sälj-markörer ----------
function addMarker(side, price) {
    if (candles.length === 0) return;
    const t = candles[candles.length - 1].time;
    if (side === 'buy') {
        markers.push({ time: t, position: 'belowBar', color: COLORS.up, shape: 'arrowUp', text: 'Köp ' + fmt(price) });
    } else {
        markers.push({ time: t, position: 'aboveBar', color: COLORS.down, shape: 'arrowDown', text: 'Sälj ' + fmt(price) });
    }
    if (markers.length > 100) markers.shift();
    candleSeries.setMarkers(markers);
}

// ---------- Statistik ----------
function updateStats() {
    totalBalanceEl.textContent = '$' + balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    dailyPnlEl.textContent = (pnl >= 0 ? '+' : '-') + '$' + Math.abs(pnl).toFixed(2);
    dailyPnlEl.className = 'text-2xl font-mono font-bold ' + (pnl >= 0 ? 'text-emerald-400' : 'text-red-400');

    metricWinrate.textContent = totalTrades > 0 ? Math.round((winningTrades / totalTrades) * 100) + '%' : '0%';

    if (totalLossesAmount > 0) {
        metricProfitfactor.textContent = (totalWinsAmount / totalLossesAmount).toFixed(2);
    } else {
        metricProfitfactor.textContent = totalWinsAmount > 0 ? '∞' : '0.00';
    }

    metricDrawdown.textContent = maxDrawdownVal.toFixed(2) + '%';

    // Sharpe per affär (inte årsbaserad): snittavkastning / standardavvikelse
    let sharpe = 0;
    if (returnsHistory.length >= 2) {
        const mean = returnsHistory.reduce((a, b) => a + b, 0) / returnsHistory.length;
        const variance = returnsHistory.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (returnsHistory.length - 1);
        const std = Math.sqrt(variance);
        sharpe = std > 0 ? mean / std : 0;
    }
    metricSharpe.textContent = sharpe.toFixed(2);
}

// ---------- Handel (simulerad) ----------
function openPosition(price) {
    const spend = parseFloat(maxSpendInput.value);
    const maxSpend = spend > 0 ? spend : 1000;
    const risk = parseInt(riskRange.value);

    hasOpenPosition = true;
    entryPrice = price;
    positionExposure = maxSpend * (risk / 2);

    addMarker('buy', price);
    addLog('🟢 Köpsignal (' + strategy.name + ') på ' + selectedSymbol + '. Köper @ $' + fmt(price), 'success');
}

function closePosition(price, reason) {
    const gross = ((price - entryPrice) / entryPrice) * positionExposure;
    const fees = positionExposure * FEE * 2;
    const delta = gross - fees;

    totalTrades++;
    pnl += delta;
    balance += delta;
    returnsHistory.push(delta / positionExposure);

    if (delta >= 0) {
        winningTrades++;
        totalWinsAmount += delta;
    } else {
        totalLossesAmount += Math.abs(delta);
    }

    if (balance > peakBalance) peakBalance = balance;
    const dd = ((peakBalance - balance) / peakBalance) * 100;
    if (dd > maxDrawdownVal) maxDrawdownVal = dd;

    addMarker('sell', price);

    const amount = (delta >= 0 ? '+$' : '-$') + Math.abs(delta).toFixed(2);
    if (reason === 'stop') {
        addLog('🛑 Stop-loss utlöst @ $' + fmt(price) + ': ' + amount, 'danger');
    } else if (reason === 'switch') {
        addLog('Position stängd vid symbolbyte @ $' + fmt(price) + ': ' + amount, delta >= 0 ? 'success' : 'danger');
    } else if (delta >= 0) {
        addLog('💰 Vinst säkrad @ $' + fmt(price) + ': ' + amount, 'success');
    } else {
        addLog('🔴 Såld @ $' + fmt(price) + ' (säljsignal): ' + amount, 'danger');
    }

    hasOpenPosition = false;
    updateStats();
}

// ---------- Backtest och stjärnor ----------
function stopPct() { return STOP_BY_INTERVAL[selectedInterval] || 0.005; }

function backtest(strat, d, stop) {
    const sig = strat.compute(d);
    let inPos = false, entry = 0, eq = 1, peak = 1, maxDD = 0, trades = 0, wins = 0, ws = 0, ls = 0;
    function exit(px) {
        const r = (px / entry) * (1 - FEE) * (1 - FEE) - 1;
        eq *= 1 + r; trades++;
        if (r > 0) { wins++; ws += r; } else { ls -= r; }
        peak = Math.max(peak, eq);
        maxDD = Math.max(maxDD, (peak - eq) / peak * 100);
        inPos = false;
    }
    for (let i = BACKTEST_START; i < d.length; i++) {
        const c = d[i];
        if (inPos) {
            const sp = entry * (1 - stop);
            if (c.low <= sp) exit(Math.min(c.open, sp)); else if (sig.sell[i]) exit(c.close);
        }
        if (!inPos && sig.buy[i]) { inPos = true; entry = c.close; }
    }
    if (inPos) exit(d[d.length - 1].close);
    return { net: (eq - 1) * 100, maxDD: maxDD, trades: trades, wins: wins, pf: ls > 0 ? ws / ls : (ws > 0 ? Infinity : 0) };
}

// 1 stjärna grund, +1 positiv avkastning, +1 vinstfaktor >= 1,3,
// +1 slår köp & håll, +1 avkastning >= största nedgång. Under 5 affärer: inget betyg.
function starsFor(r, bh) {
    if (r.trades < 5) return null;
    let s = 1;
    if (r.net > 0) s++;
    if (r.pf >= 1.3) s++;
    if (r.net > bh) s++;
    if (r.net > 0 && r.net >= r.maxDD) s++;
    return s;
}
function starText(s) { return s === null ? '☆ ?' : '★'.repeat(s) + '☆'.repeat(5 - s); }

function refreshOptionLabels() {
    for (const o of strategySelect.options) {
        o.textContent = STRATEGIES[o.value].name + '  ' + (o.value in stars ? starText(stars[o.value]) : '…');
    }
}

let btToken = 0;
async function runBacktests() {
    const my = ++btToken, sym = selectedSymbol, itv = selectedInterval, stop = stopPct();
    for (const k in stars) delete stars[k];
    refreshOptionLabels();
    try {
        let d = [], end = null;
        while (d.length < BACKTEST_CANDLES) {
            const lim = Math.min(1000, BACKTEST_CANDLES - d.length);
            const raw = await getJSON(API + '/klines?symbol=' + sym + '&interval=' + itv + '&limit=' + lim + (end ? '&endTime=' + end : ''));
            if (my !== btToken) return;
            if (!raw.length) break;
            d = raw.map(toCandle).concat(d);
            end = raw[0][0] - 1;
            if (raw.length < lim) break;
        }
        d.pop(); // sista candlen är inte stängd än
        if (d.length < BACKTEST_START + 100) { addLog('Backtest: för lite historik för ' + sym + ' ' + itv + '.', 'warn'); return; }
        const bh = ((d[d.length - 1].close / d[BACKTEST_START].close) * (1 - FEE) * (1 - FEE) - 1) * 100;
        const days = Math.round((d[d.length - 1].time - d[BACKTEST_START].time) / 86400);
        addLog('Backtest ' + sym + ' ' + itv + ' (' + days + ' dagar, stop-loss ' + (stop * 100).toFixed(1) + '%). Köp & håll: ' + bh.toFixed(1) + '%', 'info');
        STRATEGY_IDS.forEach(function (id) {
            const r = backtest(STRATEGIES[id], d, stop);
            stars[id] = starsFor(r, bh);
            addLog(STRATEGIES[id].name + ' ' + starText(stars[id]) + ' ' + r.net.toFixed(1) + '% / ' + r.trades + ' affärer / max nedgång ' + r.maxDD.toFixed(1) + '%', 'info');
        });
        refreshOptionLabels();
        if (days < 60) addLog('Obs: bara ' + days + ' dagars historik, stjärnorna är osäkra. Välj 1 tim för längre period.', 'warn');
    } catch (e) {
        if (my === btToken) addLog('Backtest misslyckades: ' + e.message, 'danger');
    }
}

// ---------- Bot-logik ----------
function runBot() {
    if (!historyReady || candles.length < 25 || currentPrice <= 0) return;

    // 1) Stop-loss kollas hela tiden på livepriset
    if (hasOpenPosition && currentPrice <= entryPrice * (1 - stopPct())) {
        closePosition(currentPrice, 'stop');
        return;
    }

    // 2) EMA-korsning kollas bara på stängda candles (undviker falska signaler)
    const closed = candles.slice(0, -1);
    const lastClosed = closed[closed.length - 1];
    if (lastClosed.time === lastEvalTime) return; // inget nytt att analysera än
    lastEvalTime = lastClosed.time;

    const res = strategy.compute(closed);
    const n = closed.length - 1;

    if (!hasOpenPosition && res.buy[n]) {
        openPosition(currentPrice);
    } else if (hasOpenPosition && res.sell[n]) {
        closePosition(currentPrice, 'signal');
    } else {
        addLog('Analyserar ' + selectedSymbol + ' (' + selectedInterval + '): ' + res.text(n), 'info');
    }
}

// ---------- Händelser ----------
cryptoSelect.addEventListener('change', function (e) {
    if (hasOpenPosition) closePosition(currentPrice, 'switch');
    selectedSymbol = e.target.value;
    saveSetting('cryptoai_symbol', selectedSymbol);
    markers = [];
    candleSeries.setMarkers([]);
    currentPrice = 0;
    cryptoPriceEl.textContent = '$0.00';
    applyPrecision();
    addLog('Bytte till ' + selectedSymbol, 'info');
    loadHistory();
    runBacktests();
});

intervalSelect.addEventListener('change', function (e) {
    selectedInterval = e.target.value;
    saveSetting('cryptoai_interval', selectedInterval);
    addLog('Tidsintervall: ' + selectedInterval, 'info');
    loadHistory();
    runBacktests();
});

strategySelect.addEventListener('change', function (e) {
    if (!STRATEGIES[e.target.value]) return;
    strategy = STRATEGIES[e.target.value];
    saveSetting('cryptoai_strategy', e.target.value);
    updateLegend();
    if (historyReady) setOverlays();
    addLog('Strategi: ' + strategy.name, 'info');
});

riskRange.addEventListener('input', function (e) {
    riskValue.textContent = e.target.value + ' / 10';
    saveSetting('cryptoai_risk', e.target.value);
});

toggleBtn.addEventListener('click', function () {
    isRunning = !isRunning;
    if (isRunning) {
        toggleBtn.className = "w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-4 rounded-lg text-xs transition flex items-center justify-center gap-2";
        toggleBtn.innerHTML = '<i class="fa-solid fa-stop"></i> Stoppa AI-Robot';
        botStatusBadge.className = "px-3 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-2";
        botStatusBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Bot Aktiv';
        addLog("Robot startad. Väntar på nästa EMA-korsning.", "success");
        // Bara nya signaler räknas, inte gamla korsningar som redan hänt
        if (candles.length > 1) lastEvalTime = candles[candles.length - 2].time;
        tradeInterval = setInterval(runBot, BOT_MS);
    } else {
        toggleBtn.className = "w-full bg-white hover:bg-gray-200 text-black font-semibold py-2.5 px-4 rounded-lg text-xs transition flex items-center justify-center gap-2";
        toggleBtn.innerHTML = '<i class="fa-solid fa-play"></i> Starta AI-Robot';
        botStatusBadge.className = "px-3 py-1 rounded-md text-xs font-semibold bg-gray-900 text-gray-400 border border-gray-800 flex items-center gap-2";
        botStatusBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-gray-600"></span> Bot Pausad';
        addLog("Robot pausad.", "warn");
        clearInterval(tradeInterval);
    }
});

// ---------- Start ----------
applyPrecision();
updateLegend();
updateStats();
loadHistory();
runBacktests();
setInterval(refreshMarket, REFRESH_MS);
