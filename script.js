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

function generateInitialData(base) {
    let data = [];
    let time = Date.now() - (30 * 60 * 1000);
    let p = base * 0.99;
    for (let i = 0; i < 30; i++) {
        let open = p;
        let close = open + (Math.random() - 0.48) * (base * 0.004);
        let high = Math.max(open, close) + (base * 0.0015);
        let low = Math.min(open, close) - (base * 0.0015);
        data.push({
            x: new Date(time),
            y: [parseFloat(open.toFixed(2)), parseFloat(high.toFixed(2)), parseFloat(low.toFixed(2)), parseFloat(close.toFixed(2))]
        });
        p = close;
        time += 60 * 1000;
    }
    return data;
}

function calculateEMA(dataArray, period) {
    let closes = dataArray.map(d => d.y[3]);
    let k = 2 / (period + 1);
    let result = [];
    if (closes.length === 0) return result;
    let prev = closes[0];
    for (let i = 0; i < closes.length; i++) {
        let val = closes[i];
        let ema = (val * k) + (prev * (1 - k));
        result.push([dataArray[i].x.getTime(), parseFloat(ema.toFixed(2))]);
        prev = ema;
    }
    return result;
}

let chartData = generateInitialData(defaultPrices[selectedSymbol] || 83000);

var options = {
    series: [{
        name: 'Pris',
        type: 'candlestick',
        data: chartData
    }, {
        name: 'EMA 9',
        type: 'line',
        data: calculateEMA(chartData, 9)
    }, {
        name: 'EMA 21',
        type: 'line',
        data: calculateEMA(chartData, 21)
    }],
    chart: {
        height: '100%',
        type: 'line',
        background: '#0b0e11',
        toolbar: { show: false }
    },
    colors: ['#0ecb81', '#facc15', '#38bdf8'],
    stroke: {
        width: [1, 2, 2]
    },
    xaxis: {
        type: 'datetime',
        labels: { style: { colors: '#9ca3af' } }
    },
    yaxis: {
        tooltip: { enabled: true },
        labels: { style: { colors: '#9ca3af' } },
        decimalsInFloat: 2
    },
    grid: { borderColor: '#1e2329' },
    plotOptions: {
        candlestick: {
            colors: { upward: '#0ecb81', downward: '#f6465d' }
        }
    },
    tooltip: { theme: 'dark' }
};

var chart = new ApexCharts(document.querySelector("#tv-chart-container"), options);
chart.render();

function updateChart() {
    chart.updateSeries([{
        data: chartData
    }, {
        data: calculateEMA(chartData, 9)
    }, {
        data: calculateEMA(chartData, 21)
    }]);
}

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
            let open = last.y[0];
            let high = Math.max(last.y[1], currentPrice);
            let low = Math.min(last.y[2], currentPrice);
            let close = currentPrice;
            last.y = [open, high, low, close];
            updateChart();
        }
    } catch (e) {
        currentPrice += (Math.random() - 0.49) * 10;
        cryptoPriceEl.textContent = '$' + currentPrice.toFixed(2);
    }
}

cryptoSelect.addEventListener('change', function(e) {
    selectedSymbol = e.target.value;
    localStorage.setItem('cryptoai_symbol', selectedSymbol);
    currentPrice = defaultPrices[selectedSymbol] || 83000;
    chartData = generateInitialData(currentPrice);
    updateChart();
    addLog("Bytte till " + selectedSymbol, 'info');
    fetchPrice();
});

riskRange.addEventListener('input', function(e) {
    riskValue.textContent = e.target.value + ' / 10';
    localStorage.setItem('cryptoai_risk', e.target.value);
});

fetchPrice();
priceInterval = setInterval(fetchPrice, 3000);

function runBot() {
    let risk = parseInt(riskRange.value);
    let maxSpend = parseFloat(maxSpendInput.value) || 1000;
    
    let time = Date.now();
    let open = currentPrice;
    let close = open + (Math.random() - 0.48) * (currentPrice * 0.002);
    let high = Math.max(open, close) + (currentPrice * 0.0008);
    let low = Math.min(open, close) - (currentPrice * 0.0008);

    chartData.push({
        x: new Date(time),
        y: [parseFloat(open.toFixed(2)), parseFloat(high.toFixed(2)), parseFloat(low.toFixed(2)), parseFloat(close.toFixed(2))]
    });
    if (chartData.length > 50) chartData.shift();
    updateChart();

    let ema9 = calculateEMA(chartData, 9);
    let ema21 = calculateEMA(chartData, 21);
    if (ema9.length < 2) return;

    let fastNow = ema9[ema9.length - 1][1];
    let fastPrev = ema9[ema9.length - 2][1];
    let slowNow = ema21[ema21.length - 1][1];
    let slowPrev = ema21[ema21.length - 2][1];

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
