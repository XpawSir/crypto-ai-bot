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
const fitChartBtn = document.getElementById('fit-chart-btn');

const metricSharpe = document.getElementById('metric-sharpe');
const metricDrawdown = document.getElementById('metric-drawdown');
const metricWinrate = document.getElementById('metric-winrate');
const metricProfitfactor = document.getElementById('metric-profitfactor');
const marketSpreadEl = document.getElementById('market-spread');

if (localStorage.getItem('cryptoai_symbol')) {
    cryptoSelect.value = localStorage.getItem('cryptoai_symbol');
}
if (localStorage.getItem('cryptoai_risk')) {
    riskRange.value = localStorage.getItem('cryptoai_risk');
    riskValue.textContent = riskRange.value + ' / 10';
}

let isRunning = false;
let tradeInterval = null;
let priceInterval = null;

let balance = 10000.00;
let pnl = 0.00;
let selectedSymbol = cryptoSelect.value;
let currentPrice = 83000.00;

let totalTrades = 0;
let winningTrades = 0;
let totalWinsAmount = 0;
let totalLossesAmount = 0;
let returnsHistory = [];
let maxDrawdownVal = 0;
let hasOpenPosition = false;
let entryPrice = 0;

const defaultPrices = {
    "BTCUSDT": 83000.00,
    "ETHUSDT": 3520.10,
    "SOLUSDT": 145.80,
    "XRPUSDT": 0.58
};

const chartContainer = document.getElementById('tv-chart-container');
const chart = LightweightCharts.createChart(chartContainer, {
    layout: {
        background: { type: 'solid', color: '#0b0e11' },
        textColor: '#9ca3af',
    },
    grid: {
        vertLines: { color: '#1e2329' },
        horzLines: { color: '#1e2329' },
    },
    rightPriceScale: { borderColor: '#1e2329', autoScale: true },
    timeScale: { borderColor: '#1e2329', timeVisible: true }
});

const seriesOptions = {
    upColor: '#0ecb81',
    downColor: '#f6465d',
    borderDownColor: '#f6465d',
    borderUpColor: '#0ecb81',
    wickDownColor: '#f6465d',
    wickUpColor: '#0ecb81',
};

// Kompatibilitetskontroll för olika versioner av Lightweight Charts
let candleSeries, emaFast, emaSlow;
if (typeof chart.addCandlestickSeries === 'function') {
    candleSeries = chart.addCandlestickSeries(seriesOptions);
    emaFast = chart.addLineSeries({ color: '#facc15', lineWidth: 2 });
    emaSlow = chart.addLineSeries({ color: '#38bdf8', lineWidth: 2 });
} else {
    candleSeries = chart.addSeries(LightweightCharts.CandlestickSeries, seriesOptions);
    emaFast = chart.addSeries(LightweightCharts.LineSeries, { color: '#facc15', lineWidth: 2 });
    emaSlow = chart.addSeries(LightweightCharts.LineSeries, { color: '#38bdf8', lineWidth: 2 });
}

function calculateEMA(data, period) {
    const k = 2 / (period + 1);
    let result = [];
    if (data.length === 0) return result;
    let prev = data[0].close;
    for (let i = 0; i < data.length; i++) {
        let val = data[i].close;
        let ema = (val * k) + (prev * (1 - k));
        result.push({ time: data[i].time, value: ema });
        prev = ema;
    }
    return result;
}

function generateData(base) {
    let arr = [];
    let time = Math.floor(Date.now() / 1000) - (40 * 60);
    let p = base * 0.99;
    for (let i = 0; i < 40; i++) {
        let open = p;
        let close = open + (Math.random() - 0.49) * (base * 0.002);
        let high = Math.max(open, close) + (base * 0.0005);
        let low = Math.min(open, close) - (base * 0.0005);
        arr.push({ time: time, open: open, high: high, low: low, close: close });
        p = close;
        time += 60;
    }
    return arr;
}

let chartData = generateData(defaultPrices[selectedSymbol] || 83000);
candleSeries.setData(chartData);

function updateLines() {
    emaFast.setData(calculateEMA(chartData, 9));
    emaSlow.setData(calculateEMA(chartData, 21));
}
updateLines();

fitChartBtn.addEventListener('click', function() {
    chart.timeScale().fitContent();
});

window.addEventListener('resize', function() {
    chart.applyOptions({ width: chartContainer.clientWidth, height: chartContainer.clientHeight });
});

function addLog(msg, type) {
    let time = new Date().toLocaleTimeString();
    let div = document.createElement('div');
    div.className = type === 'success' ? 'text-emerald-400 font-semibold' : (type === 'danger' ? 'text-red-400' : 'text-gray-300');
    div.innerHTML = '<span class="text-gray-500">[' + time + ']</span> ' + msg;
    aiLog.appendChild(div);
    aiLog.scrollTop = aiLog.scrollHeight;
}

async function fetchPrice() {
    try {
        let res = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=' + selectedSymbol);
        let json = await res.json();
        currentPrice = parseFloat(json.lastPrice);
        let change = parseFloat(json.priceChangePercent);
        
        cryptoPriceEl.textContent = '$' + currentPrice.toFixed(2);
        cryptoChangeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
        cryptoChangeEl.className = 'text-[11px] font-mono font-semibold ' + (change >= 0 ? 'text-emerald-400' : 'text-red-400');

        if (chartData.length > 0) {
            let last = chartData[chartData.length - 1];
            last.close = currentPrice;
            if (currentPrice > last.high) last.high = currentPrice + 2;
            if (currentPrice < last.low) last.low = currentPrice - 2;
            candleSeries.update(last);
            updateLines();
        }
    } catch (e) {
        currentPrice += (Math.random() - 0.49) * 10;
        cryptoPriceEl.textContent = '$' + currentPrice.toFixed(2);
    }
}

cryptoSelect.addEventListener('change', function(e) {
    selectedSymbol = e.target.value;
    localStorage.setItem('cryptoai_symbol', selectedSymbol);
    currentPrice = defaultPrices[selectedSymbol] || 100;
    chartData = generateData(currentPrice);
    candleSeries.setData(chartData);
    updateLines();
    chart.timeScale().fitContent();
    addLog("Bytte till " + selectedSymbol, 'info');
    fetchPrice();
});

riskRange.addEventListener('input', function(e) {
    riskValue.textContent = e.target.value + ' / 10';
    localStorage.setItem('cryptoai_risk', e.target.value);
});

fetchPrice();
priceInterval = setInterval(fetchPrice, 3000);

setTimeout(function() {
    chart.timeScale().fitContent();
}, 300);

function runBot() {
    let risk = parseInt(riskRange.value);
    let maxSpend = parseFloat(maxSpendInput.value) || 1000;
    
    let time = Math.floor(Date.now() / 1000);
    let open = currentPrice;
    let close = open + (Math.random() - 0.48) * (currentPrice * 0.0015);
    let high = Math.max(open, close) + (currentPrice * 0.0004);
    let low = Math.min(open, close) - (currentPrice * 0.0004);

    chartData.push({ time: time, open: open, high: high, low: low, close: close });
    if (chartData.length > 50) chartData.shift();
    candleSeries.setData(chartData);

    let emad = calculateEMA(chartData, 9);
    let emas = calculateEMA(chartData, 21);
    if (emad.length < 2) return;

    let fastNow = emad[emad.length - 1].value;
    let fastPrev = emad[emad.length - 2].value;
    let slowNow = emas[emas.length - 1].value;
    let slowPrev = emas[emas.length - 2].value;

    let crossUp = fastPrev <= slowPrev && fastNow > slowNow;
    let crossDown = fastPrev >= slowPrev && fastNow < slowNow;

    if (crossUp && !hasOpenPosition) {
        hasOpenPosition = true;
        entryPrice = currentPrice;
        addLog('🟢 Golden Cross på ' + selectedSymbol + '! Köper.', 'success');
    } else if ((crossDown || (hasOpenPosition && currentPrice < entryPrice * 0.995)) && hasOpenPosition) {
        totalTrades++;
        let pnlDelta = ((currentPrice - entryPrice) / entryPrice) * maxSpend * (risk / 2);
        pnl += pnlDelta;
        balance += pnlDelta;

        if (pnlDelta >= 0) {
            winningTrades++;
            totalWinsAmount += pnlDelta;
            addLog('💰 Vinst säkrad: +$' + pnlDelta.toFixed(2), 'success');
        } else {
            totalLossesAmount += Math.abs(pnlDelta);
            addLog('🛑 Stop-loss utlöst: -$' + Math.abs(pnlDelta).toFixed(2), 'danger');
        }

        hasOpenPosition = false;
        totalBalanceEl.textContent = '$' + balance.toLocaleString('en-US', {minimumFractionDigits: 2});
        dailyPnlEl.textContent = (pnl >= 0 ? '+' : '') + '$' + pnl.toFixed(2);
        dailyPnlEl.className = 'text-2xl font-mono font-bold ' + (pnl >= 0 ? 'text-emerald-400' : 'text-red-400');
    } else {
        addLog('Analyserar marknad för ' + selectedSymbol, 'info');
    }
}

toggleBtn.addEventListener('click', function() {
    isRunning = !isRunning;
    if (isRunning) {
        toggleBtn.className = "w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-4 rounded-lg text-xs transition flex items-center justify-center gap-2";
        toggleBtn.innerHTML = '<i class="fa-solid fa-stop"></i> Stoppa AI-Robot';
        botStatusBadge.className = "px-3 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-2";
        botStatusBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Bot Aktiv';
        addLog("Robot startad.", "success");
        tradeInterval = setInterval(runBot, 4000);
    } else {
        toggleBtn.className = "w-full bg-white hover:bg-gray-200 text-black font-semibold py-2.5 px-4 rounded-lg text-xs transition flex items-center justify-center gap-2";
        toggleBtn.innerHTML = '<i class="fa-solid fa-play"></i> Starta AI-Robot';
        botStatusBadge.className = "px-3 py-1 rounded-md text-xs font-semibold bg-gray-900 text-gray-400 border border-gray-800 flex items-center gap-2";
        botStatusBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-gray-600"></span> Bot Pausad';
        addLog("Robot pausad.", "warn");
        clearInterval(tradeInterval);
    }
});
