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
const chartCandles = document.getElementById('chart-candles');
const cryptoSelect = document.getElementById('crypto-select');

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

// Statistikvariabler för proffsmått
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

let candles = [];
const maxCandles = 20;

// ==========================================
// KOPPLING TILL VERCEL SERVERLESS FUNCTION
// ==========================================
async function hamtaRiktigtSaldo() {
    try {
        // Här anropar vi vår nya Vercel-funktion istället för localhost
        const response = await fetch('/api/balance');
        if (!response.ok) throw new Error("Kunde inte nå serverless-funktionen");
        const data = await response.json();
        
        console.log("Riktigt saldo från Binance via Vercel:", data);

        if (data && data.totalBalance) {
            balance = parseFloat(data.totalBalance);
            peakBalance = balance;
            initialBalance = balance;
        } else if (typeof data === 'number') {
            balance = data;
            peakBalance = balance;
            initialBalance = balance;
        }

        // Uppdatera UI med det riktiga saldot
        totalBalanceEl.textContent = `$${balance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        addLog("System: Ansluten till Binance via Vercel för saldo.", "success");

    } catch (error) {
        console.error("Fel vid hämtning av saldo:", error);
        addLog("Varning: Kunde inte hämta saldo från Vercel-funktionen.", "warn");
    }
}

function initCandles(basePrice) {
    candles = [];
    let p = basePrice * 0.98;
    for (let i = 0; i < maxCandles; i++) {
        let open = p;
        let variation = basePrice * 0.004;
        let close = open + (Math.random() - 0.48) * variation;
        let high = Math.max(open, close) + Math.random() * (basePrice * 0.002);
        let low = Math.min(open, close) - Math.random() * (basePrice * 0.002);
        candles.push({ open, close, high, low });
        p = close;
    }
}

function renderChart() {
    chartCandles.innerHTML = '';
    if (candles.length === 0) return;

    let allPrices = candles.flatMap(c => [c.high, c.low]);
    let minVal = Math.min(...allPrices);
    let maxVal = Math.max(...allPrices);
    let range = maxVal - minVal || 1;

    candles.forEach((candle) => {
        const isGreen = candle.close >= candle.open;
        const colorClass = isGreen ? 'bg-white shadow-sm' : 'bg-gray-600 shadow-sm';
        const wickColor = isGreen ? 'bg-gray-300' : 'bg-gray-500';

        let wickTop = ((maxVal - candle.high) / range) * 100;
        let wickHeight = ((candle.high - candle.low) / range) * 100;
        let bodyTopVal = Math.max(candle.open, candle.close);
        let bodyBottomVal = Math.min(candle.open, candle.close);
        
        let bodyTop = ((maxVal - bodyTopVal) / range) * 100;
        let bodyHeight = Math.max(((bodyTopVal - bodyBottomVal) / range) * 100, 4);

        const candleWrapper = document.createElement('div');
        candleWrapper.className = 'flex-1 h-full relative flex flex-col items-center justify-center mx-0.5';

        const wick = document.createElement('div');
        wick.className = `absolute w-[1px] ${wickColor}`;
        wick.style.top = `${Math.max(wickTop, 0)}%`;
        wick.style.height = `${Math.min(wickHeight, 100)}%`;

        const body = document.createElement('div');
        body.className = `absolute w-3/4 rounded-[1px] ${colorClass} z-10`;
        body.style.top = `${Math.max(bodyTop, 0)}%`;
        body.style.height = `${Math.min(bodyHeight, 100)}%`;

        candleWrapper.appendChild(wick);
        candleWrapper.appendChild(body);
        chartCandles.appendChild(candleWrapper);
    });
}

function updateProMetrics(tradeReturn = 0) {
    if (tradeReturn !== 0) {
        returnsHistory.push(tradeReturn);
    }

    if (balance > peakBalance) {
        peakBalance = balance;
    }
    let currentDD = ((peakBalance - balance) / peakBalance) * 100;
    if (currentDD > maxDrawdownVal) {
        maxDrawdownVal = currentDD;
    }

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
    cryptoChangeEl.className = `text-[11px] font-mono font-semibold ${isPositive ? 'text-white' : 'text-gray-400'}`;

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

        if (candles.length === 0) initCandles(newPrice);
        updatePriceUI(newPrice, priceChangePercent);

        if (candles.length > 0) {
            let lastCandle = candles[candles.length - 1];
            lastCandle.close = newPrice;
            if (newPrice > lastCandle.high) lastCandle.high = newPrice;
            if (newPrice < lastCandle.low) lastCandle.low = newPrice;
        }
        renderChart();
    } catch (error) {
        if (candles.length === 0) initCandles(defaultPrices[selectedSymbol] || 100);
        let fluctuation = (Math.random() - 0.48) * (currentPrice * 0.002);
        let simulatedPrice = currentPrice + fluctuation;
        updatePriceUI(simulatedPrice, 1.45);

        let lastCandle = candles[candles.length - 1];
        lastCandle.close = simulatedPrice;
        if (simulatedPrice > lastCandle.high) lastCandle.high = simulatedPrice;
        if (simulatedPrice < lastCandle.low) lastCandle.low = simulatedPrice;
        renderChart();
    }
}

cryptoSelect.addEventListener('change', (e) => {
    selectedSymbol = e.target.value;
    currentPrice = defaultPrices[selectedSymbol] || 100;
    initCandles(currentPrice);
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
    if (type === 'success') colorClass = 'text-white font-semibold';
    if (type === 'danger') colorClass = 'text-gray-400 font-semibold';
    if (type === 'warn') colorClass = 'text-gray-200';

    div.className = colorClass;
    div.innerHTML = `<span class="text-gray-600">[${time}]</span>${message}`;
    aiLog.appendChild(div);
    aiLog.scrollTop = aiLog.scrollHeight;
}

currentPrice = defaultPrices[selectedSymbol];
initCandles(currentPrice);
fetchLivePrice();
priceFetchInterval = setInterval(fetchLivePrice, 3000);

// Anropa Vercel-funktionen direkt när sidan laddas för att hämta det riktiga saldot
hamtaRiktigtSaldo();

function runAiTradeCycle() {
    const risk = parseInt(riskRange.value);
    const strategy = document.getElementById('strategy-select').value;
    const maxAllowedSpend = parseFloat(maxSpendInput.value) || 1000;
    const rand = Math.random() * 10;
    
    let open = currentPrice;
    let close = currentPrice * (1 + (Math.random() - 0.47) * 0.003);
    let high = Math.max(open, close) * 1.0015;
    let low = Math.min(open, close) * 0.9985;
    
    candles.shift();
    candles.push({ open, close, high, low });
    renderChart();

    if (rand < 3.5) {
        let calculatedSize = balance * (risk / 100);
        let tradeSize = Math.min(calculatedSize, maxAllowedSpend).toFixed(2);
        addLog(`[AI - ${selectedSymbol}] Signal genererad (${strategy
