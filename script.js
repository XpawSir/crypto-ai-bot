// ============================================================
//   CryptoAI Pro Terminal – script.js (Komplett version)
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
const HISTORY_LIMIT = 300;   
const REFRESH_MS = 3000;     
const BOT_MS = 4000;         
const BACKTEST_CANDLES = 4000;  
const BACKTEST_START = 200;     
const FEE = 0.001;           
const COLORS = { up: '#0ecb81', down: '#f6465d', ema9: '#facc15', ema21: '#38bdf8' };
const decimalsBySymbol = { BTCUSDT: 2, ETHUSDT: 2, SOLUSDT: 2, XRPUSDT: 4 };

// ---------- Strategier ----------
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
        name: 'MACD 12/26/9', colors: ['#38bdf8', '#facc15'], legend: [['MACD:', 'Histogram'], ['Signal:', 'Linje']],
        compute: function (d) {
            const c = d.map(function (x) { return x.close; }), e12 = emaArr(c, 12), e26 = emaArr(c, 26);
            const m = e12.map(function (x, i) { return x - e26[i]; }), sg = emaArr(m, 9);
            const r = signals(d.length, function (i) { return crossUp(m, sg, i); }, function (i) { return crossDown(m, sg, i); });
            r.lines = [m, sg];
            r.text = function (i) { return 'MACD ' + m[i].toFixed(2) + ' / signal ' + sg[i].toFixed(2); };
            return r;
        }
    },
    'rsi': {
        name: 'RSI 14 (köp under 30, sälj över 70)', colors: ['#a78bfa'], legend: [['RSI:', '14 perioder']],
        compute: function (d) {
            const v = rsiArr(d.map(function (x) { return x.close; }), 14);
            const r = signals(d.length, function (i) { return v[i] !== null && v[i] < 30; }, function (i) { return v[i] !== null && v[i] > 70; });
            r.lines = [v];
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
const stars = {};

// ---------- Moln-synk & LocalStorage ----------
async function loadCloudState() {
    try {
        const res = await fetch('/api/state');
        if (res.ok) {
            const data = await res.json();
            if (data && typeof data.balance === 'number') {
                balance = data.balance;
                peakBalance = Math.max(peakBalance, balance);
                pnl = data.pnl || 0;
                totalTrades = data.totalTrades || 0;
                winningTrades = data.winningTrades || 0;
                updateStats();
            }
        }
    } catch (e) {
        // Fallback till lokal lagring om moln ej är nåbart
    }
}

async function saveCloudState() {
    try {
        await fetch('/api/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ balance, pnl, totalTrades, winningTrades })
        });
    } catch (e) {}
}

function loadSetting(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
}
function saveSetting(key, val) {
    try { localStorage.setItem(key, val); } catch (e) {}
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

let candles = [];           
let markers = [];           
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
let dynamicStopPrice = 0;
let dynamicTakeProfitPrice = 0;

// ---------- Formatering ----------
function dec() {
    return decimalsBySymbol[selectedSymbol] !== undefined ? decimalsBySymbol[selectedSymbol] : 2;
}
function fmt(p) {
    return p.toLocaleString('en-US', { minimumFractionDigits: dec(), maximumFractionDigits: dec() });
}

// ---------- Grafen (TradingView Lightweight Charts) ----------
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
const overlaySeries = [0, 1, 2].map(function () { return chart.addLineSeries(lineOpts); });

function applyPrecision() {
    const d = dec();
    const fmtOpts = { priceFormat: { type: 'price', precision: d, minMove: 1 / Math.pow(10, d) } };
    candleSeries.applyOptions(fmtOpts);
    overlaySeries.forEach(function (x) { x.applyOptions(fmtOpts); });
}

// ---------- ATR (Average True Range) ----------
function calculateATR(data, period = 14) {
    if (data.length < period + 1) return data[data.length - 1].high - data[data.length - 1].low;
    let trList = [];
    for (let i = 1; i < data.length; i++) {
        const high = data[i].high;
        const low = data[i].low;
        const prevClose = data[i - 1].close;
        const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
        trList.push(tr);
    }
    const recentTr = trList.slice(-period);
    return recentTr.reduce((a, b) => a + b, 0) / recentTr.length;
}

// ---------- Indikatorer & Linjer ----------
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
            x.applyOptions({ color: strategy.colors[j] || '#38bdf8' });
            x.setData(toPoints(candles, res.lines[j]));
        } else {
            x.setData([]);
        }
    });
    if (candles.length > 0) lastEmaTime = candles[candles.length - 1].time;
}

function updateLegend() {
    if (!legendLines) return;
    legendLines.innerHTML = strategy.legend.length
        ? strategy.legend.map(function (l, j) {
            return '<div><span class="inline-block w-3 h-1 mr-1" style="background:' + (strategy.colors[j] || '#38bdf8') + '"></span><strong>' + l[0] + '</strong> ' + l[1] + '</div>';
        }).join('')
        : '<div>Inga linjer, signalerna syns som pilar</div>';
}

function addLog(msg, type) {
    const time = new Date().toLocaleTimeString();
    const div = document.createElement('div');
    div.className = type === 'success' ? 'text-emerald-400 font-semibold' : (type === 'danger' ? 'text-red-400' : 'text-gray-300');
    div.innerHTML = '<span class="text-gray-500">[' + time + ']</span> ' + msg;
    aiLog.appendChild(div);
    while (aiLog.children.length > 200) aiLog.removeChild(aiLog.firstChild);
    aiLog.scrollTop = aiLog.scrollHeight;
}

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
        addLog('Kunde inte hämta data från Binance' + (err ? ' (' + err.message + ')' : ''), 'danger');
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

    const res = strategy.compute(candles);
    const n = candles.length;
    for (let i = Math.max(0, n - 2); i < n; i++) {
        if (candles[i].time < lastEmaTime) continue;
        overlaySeries.forEach(function (x, j) {
            const v = res.lines[j] ? res.lines[j][i] : null;
            if (v !== null && v !== undefined) x.update({ time: candles[i].time, value: v });
        });
        if (candles[i]) lastEmaTime = candles[i].time;
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
