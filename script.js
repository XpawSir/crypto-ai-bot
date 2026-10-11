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
const newsContainer = document.getElementById('news-container');

// Proffsmetriker DOM
const metricSharpe = document.getElementById('metric-sharpe');
const metricDrawdown = document.getElementById('metric-drawdown');
const metricWinrate = document.getElementById('metric-winrate');
const metricProfitfactor = document.getElementById('metric-profitfactor');
const marketSpreadEl = document.getElementById('market-spread');
const orderbookPressureEl = document.getElementById('orderbook-pressure');

let isRunning = false;
let tradeInterval = null;
let priceFetchInterval = null;

let balance = 10000.00;
let initialBalance = 10000.00;
let peakBalance = 10000.00;
let pnl = 0.00;
let currentPrice = 67420.50;
let selectedSymbol = cryptoSelect.value;

let totalTrades = 0;
let winningTrades = 0;
let totalWinsAmount = 0;
let totalLossesAmount = 0;
let returnsHistory = [];
let maxDrawdownVal = 0;

const defaultPrices = {
    "BTCUSDT": 67420.50,
    "ETHUSDT": 3520.10,
    "SOLUSDT": 145.80,
    "XRPUSDT": 0.58
};

// --- TradingView Chart & EMA Indikatorer ---
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
    crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
    },
    rightPriceScale: {
        borderColor: '#1e2329',
    },
    timeScale: {
        borderColor: '#1e2329',
        timeVisible: true,
        secondsVisible: true,
    },
});

let candlestickSeries;
let emaFastSeries; // EMA 9 (Gult snitt)
let emaSlowSeries; // EMA 21 (Blått snitt)

const seriesOptions = {
    upColor: '#0ecb81',
    downColor: '#f6465d',
    borderDownColor: '#f6465d',
    borderUpColor: '#0ecb81',
    wickDownColor: '#f6465d',
    wickUpColor: '#0ecb81',
};

if (typeof chart.addCandlestickSeries === 'function') {
    candlestickSeries = chart.addCandlestickSeries(seriesOptions);
    emaFastSeries = chart.addLineSeries({ color: '#facc15', lineWidth: 2 });
    emaSlowSeries = chart.addLineSeries({ color: '#38bdf8', lineWidth: 2 });
} else {
    candlestickSeries = chart.addSeries(LightweightCharts.CandlestickSeries, seriesOptions);
    emaFastSeries = chart.addSeries(LightweightCharts.LineSeries, { color: '#facc15', lineWidth: 2 });
    emaSlowSeries = chart.addSeries(LightweightCharts.LineSeries, { color: '#38bdf8', lineWidth: 2 });
}

// Beräkna Exponential Moving Average (EMA)
function calculateEMA(data, period) {
    const k = 2 / (period + 1);
    let emaArray = [];
    if (data.length === 0) return emaArray;
    let prevEMA = data[0].close;

    for (let i = 0; i < data.length; i++) {
        let currentVal = data[i].close;
        let ema = (currentVal * k) + (prevEMA * (1 - k));
        emaArray.push({ time: data[i].time, value: ema });
        prevEMA = ema;
    }
    return emaArray;
}

// Generera historisk data för grafen
function generateInitialChartData(basePrice) {
    const data = [];
    let currentTime = Math.floor(Date.now() / 1000) - (60 * 40);
    let p = basePrice * 0.98;
    
    for (let i = 0; i < 40; i++) {
        let open = p;
        let variation = basePrice * 0.003;
        let close = open + (Math.random() - 0.48) * variation;
        let high = Math.max(open, close) + Math.random() * (basePrice * 0.0015);
        let low = Math.min(open, close) - Math.random() * (basePrice * 0.0015);
        
        data.push({ time: currentTime, open, high, low, close });
        p = close;
        currentTime += 60;
    }
    return data;
}

let chartData = generateInitialChartData(defaultPrices[selectedSymbol]);
candlestickSeries.setData(chartData);

function updateIndicators() {
    let ema9 = calculateEMA(chartData, 9);
    let ema21 = calculateEMA(chartData, 21);
    emaFastSeries.setData(ema9);
    emaSlowSeries.setData(ema21);
}
updateIndicators();

window.addEventListener('resize', () => {
    chart.applyOptions({ width: chartContainer.clientWidth, height: chartContainer.clientHeight });
});

// Felsäker hämtning av saldo med fallback
async function hamtaRiktigtSaldo() {
    try {
        const response = await fetch('/api/balance');
        if (!response.ok) {
            throw new Error(`Server svarade med status ${response.status}`);
        }
        const data = await response.json();
        
        if (data && data.totalBalance) {
            balance = parseFloat(data.totalBalance);
            peakBalance = balance;
            initialBalance = balance;
        } else if (typeof data === 'number') {
            balance = data;
            peakBalance = balance;
            initialBalance = balance;
        }

        totalBalanceEl.textContent = `$${balance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        addLog("System: Ansluten till Binance Testnet via Vercel för saldo.", "success");

    } catch (error) {
        console.log("Använder simulerat Testnet-saldo ($10,000.00):", error.message);
        balance = 10000.00;
        totalBalanceEl.textContent = `$${balance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        addLog("System: Testnet-läge aktivt ($10,000.00 simulerat kapital).", "info");
    }
}

function updateProMetrics(tradeReturn = 0) {
    if (tradeReturn !== 0) returnsHistory.push(tradeReturn);
    if (balance > peakBalance) peakBalance = balance;
    
    let currentDD = ((peakBalance - balance) / peakBalance) * 100;
    if (currentDD > maxDrawdownVal) maxDrawdownVal = currentDD;

    let winRatePct = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    let profitFactor = totalLossesAmount > 0 ? (totalWinsAmount / totalLossesAmount) : (totalWinsAmount > 0 ? 99.0 : 0.0);

    let sharpe = 0;
    if (returnsHistory.length > 1) {
        let mean = returnsHistory.reduce((a, b) => a + b, 0) / returnsHistory.length;
        let variance = returnsHistory.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returnsHistory.length;
        let stdev = Math.sqrt(variance);
        sharpe = stdev > 0 ? (mean / stdev) * Math.sqrt(252) : 0;
    }

    metricSharpe.textContent = sharpe.toFixed(2);
    metricDrawdown.textContent = `${maxDrawdownVal.toFixed(2)}%`;
    metricWinrate.textContent = `${winRatePct.toFixed(0)}% (${winningTrades}/${totalTrades})`;
    metricProfitfactor.textContent = profitFactor.toFixed(2);
}

function updatePriceUI(price, changePct) {
    currentPrice = price;
    let decimals = currentPrice < 10 ? 4 : 2;
    cryptoPriceEl.textContent = `$${currentPrice.toLocaleString('en-US', {minimumFractionDigits: decimals, maximumFractionDigits: decimals})}`;
    
    const isPositive = changePct >= 0;
    cryptoChangeEl.textContent = `${isPositive ? '+' : ''}${changePct.toFixed(2)}% (24h)`;
    cryptoChangeEl.className = `text-[11px] font-mono font-semibold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`;

    let spread = (Math.random() * 0.04 + 0.01).toFixed(3);
    marketSpreadEl.textContent = `${spread}%`;
    let pressures = ["Köpövertag (Bullish)", "Säljtryck (Bearish)", "Balanserad Orderbok"];
    orderbookPressureEl.textContent = `Tryck: ${pressures[Math.floor(Math.random() * pressures.length)]}`;
}

async function fetchLivePrice() {
    try {
        const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${selectedSymbol}`);
        if (!response.ok) throw new Error("API-fel");
        const data = await response.json();
        
        const newPrice = parseFloat(data.lastPrice);
        const priceChangePercent = parseFloat(data.priceChangePercent);

        updatePriceUI(newPrice, priceChangePercent);

        if (chartData.length > 0) {
            let lastCandle = chartData[chartData.length - 1];
            lastCandle.close = newPrice;
            if (newPrice > lastCandle.high) lastCandle.high = newPrice;
            if (newPrice < lastCandle.low) lastCandle.low = newPrice;
            candlestickSeries.update(lastCandle);
            updateIndicators();
        }
    } catch (error) {
        let fluctuation = (Math.random() - 0.48) * (currentPrice * 0.002);
        let simulatedPrice = currentPrice + fluctuation;
        updatePriceUI(simulatedPrice, 1.45);

        if (chartData.length > 0) {
            let lastCandle = chartData[chartData.length - 1];
            lastCandle.close = simulatedPrice;
            if (simulatedPrice > lastCandle.high) lastCandle.high = simulatedPrice;
            if (simulatedPrice < lastCandle.low) lastCandle.low = simulatedPrice;
            candlestickSeries.update(lastCandle);
            updateIndicators();
        }
    }
}

cryptoSelect.addEventListener('change', (e) => {
    selectedSymbol = e.target.value;
    currentPrice = defaultPrices[selectedSymbol] || 100;
    chartData = generateInitialChartData(currentPrice);
    candlestickSeries.setData(chartData);
    updateIndicators();
    addLog(`System: Bytte aktiv till ${selectedSymbol}.`, 'info');
    fetchLivePrice();
});

riskRange.addEventListener('input', (e) => {
    riskValue.textContent = `${e.target.value} / 10`;
});

function addLog(message, type = 'info') {
    const time = new Date().toLocaleTimeString();
    const div = document.createElement('div');
    let colorClass = 'text-gray-300';
    if (type === 'success') colorClass = 'text-emerald-400 font-semibold';
    if (type === 'danger') colorClass = 'text-red-400 font-semibold';
    if (type === 'warn') colorClass = 'text-amber-400';

    div.className = colorClass;
    div.innerHTML = `<span class="text-gray-500">[${time}]</span> ${message}`;
    aiLog.appendChild(div);
    aiLog.scrollTop = aiLog.scrollHeight;
}

// Live-nyheter simulator
setInterval(() => {
    const newsItems = [
        { text: "Stora institutioner ökar sina BTC-positioner inför helgen.", sentiment: "BULLISH" },
        { text: "Volatilitetsindexet pekar på kommande breakout i kryptosektorn.", sentiment: "BULLISH" },
        { text: "Kortvarigt säljtryck observeras på derivatbörserna.", sentiment: "BEARISH" },
        { text: "Ethereum gas fees sjunker till nya lägstanoteringar.", sentiment: "NEUTRAL" }
    ];
    const randomNews = newsItems[Math.floor(Math.random() * newsItems.length)];
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newsDiv = document.createElement('div');
    newsDiv.className = "p-2.5 bg-darkbg rounded border border-cardborder flex justify-between items-start animate-fade-in";
    newsDiv.innerHTML = `
        <div>
            <p class="text-gray-200 font-semibold text-[11px]">${randomNews.text}</p>
            <span class="text-[10px] text-gray-500">Idag kl ${timeNow}</span>
        </div>
        <span class="text-[10px] bg-white/10 text-white px-1.5 py-0.5 rounded font-bold">${randomNews.sentiment}</span>
    `;
    newsContainer.prepend(newsDiv);
    if (newsContainer.children.length > 5) {
        newsContainer.removeChild(newsContainer.lastChild);
    }
}, 25000);

currentPrice = defaultPrices[selectedSymbol];
fetchLivePrice();
priceFetchInterval = setInterval(fetchLivePrice, 3000);
hamtaRiktigtSaldo();

function runAiTradeCycle() {
    const risk = parseInt(riskRange.value);
    const strategy = document.getElementById('strategy-select').value;
    const maxAllowedSpend = parseFloat(maxSpendInput.value) || 1000;
    const rand = Math.random() * 10;
    
    let nowTime = Math.floor(Date.now() / 1000);
    let open = currentPrice;
    let close = currentPrice * (1 + (Math.random() - 0.47) * 0.003);
    let high = Math.max(open, close) * 1.0015;
    let low = Math.min(open, close) * 0.9985;
    
    chartData.push({ time: nowTime, open, high, low, close });
    if (chartData.length > 60) chartData.shift();
    candlestickSeries.setData(chartData);
    updateIndicators();

    if (rand < 3.5) {
        let calculatedSize = balance * (risk / 100);
        let tradeSize = Math.min(calculatedSize, maxAllowedSpend).toFixed(2);
        addLog(`[AI - ${selectedSymbol}] Signal genererad (${strategy}). Allokerar $${tradeSize}`, 'info');
    } else if (rand > 6.5) {
        totalTrades++;
        let impactFactor = maxAllowedSpend / 1000;
        const profitOrLoss = (Math.random() * (risk * 12 * impactFactor) - (risk * 4.2 * impactFactor)).toFixed(2);
        const numPnL = parseFloat(profitOrLoss);
        
        pnl += numPnL;
        balance += numPnL;

        let tradeReturnPct = numPnL / balance;

        if (numPnL >= 0) {
            winningTrades++;
            totalWinsAmount += numPnL;
            addLog(`[EXECUTION] Position stängd (${selectedSymbol}). Vinst: +$${numPnL}`, 'success');
        } else {
            totalLossesAmount += Math.abs(numPnL);
            addLog(`[STOP-LOSS] Position stoppad (${selectedSymbol}). Förlust: -$${Math.abs(numPnL)}`, 'danger');
        }

        totalBalanceEl.textContent = `$${balance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        dailyPnlEl.textContent = `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`;
        dailyPnlEl.className = `text-2xl font-mono font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`;

        updateProMetrics(tradeReturnPct);
    } else {
        addLog(`[SCANNER] Orderboksanalys klar för ${selectedSymbol}. Inga avvikelser.`, 'info');
    }
}

toggleBtn.addEventListener('click', () => {
    isRunning = !isRunning;

    if (isRunning) {
        toggleBtn.className = "w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-4 rounded-lg text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-2";
        toggleBtn.innerHTML = `<i class="fa-solid fa-stop"></i> Stoppa AI-Robot`;
        
        botStatusBadge.className = "px-3 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-2";
        botStatusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Bot Aktiv (${selectedSymbol})`;

        addLog(`Terminal: Autonom exekvering startad för ${selectedSymbol} med EMA-indikatorer.`, "success");
        tradeInterval = setInterval(runAiTradeCycle, 4000);

    } else {
        toggleBtn.className = "w-full bg-white hover:bg-gray-200 text-black font-semibold py-2.5 px-4 rounded-lg text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-2";
        toggleBtn.innerHTML = `<i class="fa-solid fa-play"></i> Starta AI-Robot`;
        
        botStatusBadge.className = "px-3 py-1 rounded-md text-xs font-semibold bg-gray-900 text-gray-400 border border-gray-800 flex items-center gap-2";
        botStatusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-gray-600"></span> Bot Pausad`;

        addLog("Terminal: Exekvering pausad.", "warn");
        clearInterval(tradeInterval);
    }
});
