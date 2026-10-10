// Element från DOM
const toggleBtn = document.getElementById('toggle-bot-btn');
const botStatusBadge = document.getElementById('bot-status-badge');
const aiLog = document.getElementById('ai-log');
const riskRange = document.getElementById('risk-range');
const riskValue = document.getElementById('risk-value');
const cryptoPriceEl = document.getElementById('crypto-price');
const cryptoChangeEl = document.getElementById('crypto-change');
const totalBalanceEl = document.getElementById('total-balance');
const dailyPnlEl = document.getElementById('daily-pnl');
const chartCandles = document.getElementById('chart-candles');
const cryptoSelect = document.getElementById('crypto-select');

let isRunning = false;
let tradeInterval = null;
let priceFetchInterval = null;

let balance = 10000.00;
let pnl = 0.00;
let currentPrice = 67420.50;
let selectedSymbol = cryptoSelect.value;

const defaultPrices = {
    "BTCUSDT": 67420.50,
    "ETHUSDT": 3520.10,
    "SOLUSDT": 145.80,
    "XRPUSDT": 0.58
};

let candles = [];
const maxCandles = 20;

// Initiera realistiska candlesticks
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

// Rendera ut proffsiga Candlesticks
function renderChart() {
    chartCandles.innerHTML = '';
    if (candles.length === 0) return;

    let allPrices = candles.flatMap(c => [c.high, c.low]);
    let minVal = Math.min(...allPrices);
    let maxVal = Math.max(...allPrices);
    let range = maxVal - minVal || 1;

    candles.forEach((candle) => {
        const isGreen = candle.close >= candle.open;
        
        // Färgval för grön/röd
        const colorClass = isGreen ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-rose-500 shadow-lg shadow-rose-500/20';
        const wickColor = isGreen ? 'bg-emerald-400' : 'bg-rose-400';

        // Beräkna topp och höjd för veken (high till low)
        let wickTop = ((maxVal - candle.high) / range) * 100;
        let wickHeight = ((candle.high - candle.low) / range) * 100;

        // Beräkna topp och höjd för kroppen (open till close)
        let bodyTopVal = Math.max(candle.open, candle.close);
        let bodyBottomVal = Math.min(candle.open, candle.close);
        
        let bodyTop = ((maxVal - bodyTopVal) / range) * 100;
        let bodyHeight = Math.max(((bodyTopVal - bodyBottomVal) / range) * 100, 4); // Minst 4% synlighet

        const candleWrapper = document.createElement('div');
        candleWrapper.className = 'flex-1 h-full relative flex flex-col items-center justify-center mx-0.5';

        // Veken (tunn linje i bakgrunden)
        const wick = document.createElement('div');
        wick.className = `absolute w-[2px] ${wickColor} rounded-full`;
        wick.style.top = `${Math.max(wickTop, 0)}%`;
        wick.style.height = `${Math.min(wickHeight, 100)}%`;

        // Kroppen (rektangeln)
        const body = document.createElement('div');
        body.className = `absolute w-4/5 rounded-[2px] ${colorClass} z-10 candle-body`;
        body.style.top = `${Math.max(bodyTop, 0)}%`;
        body.style.height = `${Math.min(bodyHeight, 100)}%`;

        candleWrapper.appendChild(wick);
        candleWrapper.appendChild(body);
        chartCandles.appendChild(candleWrapper);
    });
}

function updatePriceUI(price, changePct) {
    currentPrice = price;
    let decimals = currentPrice < 10 ? 4 : 2;
    cryptoPriceEl.textContent = `$${currentPrice.toLocaleString('en-US', {minimumFractionDigits: decimals, maximumFractionDigits: decimals})}`;
    
    const isPositive = changePct >= 0;
    cryptoChangeEl.textContent = `${isPositive ? '+' : ''}${changePct.toFixed(2)}% (24h)`;
    cryptoChangeEl.className = `text-xs font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`;
}

async function fetchLivePrice() {
    try {
        const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${selectedSymbol}`);
        if (!response.ok) throw new Error("API-fel");
        const data = await response.json();
        
        const newPrice = parseFloat(data.lastPrice);
        const priceChangePercent = parseFloat(data.priceChangePercent);

        if (candles.length === 0) {
            initCandles(newPrice);
        }

        updatePriceUI(newPrice, priceChangePercent);

        if (candles.length > 0) {
            let lastCandle = candles[candles.length - 1];
            lastCandle.close = newPrice;
            if (newPrice > lastCandle.high) lastCandle.high = newPrice;
            if (newPrice < lastCandle.low) lastCandle.low = newPrice;
        }

        renderChart();

    } catch (error) {
        if (candles.length === 0) {
            initCandles(defaultPrices[selectedSymbol] || 100);
        }
        
        let fluctuation = (Math.random() - 0.48) * (currentPrice * 0.002);
        let simulatedPrice = currentPrice + fluctuation;
        updatePriceUI(simulatedPrice, 2.15);

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
    addLog(`Bytte marknad till ${selectedSymbol}.`, 'warn');
    fetchLivePrice();
});

riskRange.addEventListener('input', (e) => {
    riskValue.textContent = `${e.target.value} / 10`;
});

function addLog(message, type = 'info') {
    const time = new Date().toLocaleTimeString();
    const div = document.createElement('div');
    let colorClass = 'text-slate-300';
    if (type === 'success') colorClass = 'text-emerald-400 font-semibold';
    if (type === 'danger') colorClass = 'text-rose-400 font-semibold';
    if (type === 'warn') colorClass = 'text-amber-400';

    div.className = colorClass;
    div.innerHTML = `<span class="text-slate-500">[${time}]</span> ${message}`;
    aiLog.appendChild(div);
    aiLog.scrollTop = aiLog.scrollHeight;
}

currentPrice = defaultPrices[selectedSymbol];
initCandles(currentPrice);
fetchLivePrice();
priceFetchInterval = setInterval(fetchLivePrice, 3000);

function runAiTradeCycle() {
    const risk = parseInt(riskRange.value);
    const strategy = document.getElementById('strategy-select').value;
    const rand = Math.random() * 10;
    
    // Skapa en ny candlestick vid varje cykel för att fyllas på i grafen
    let open = currentPrice;
    let close = currentPrice * (1 + (Math.random() - 0.47) * 0.003);
    let high = Math.max(open, close) * 1.0015;
    let low = Math.min(open, close) * 0.9985;
    
    candles.shift();
    candles.push({ open, close, high, low });
    renderChart();

    if (rand < 3.5) {
        const tradeSize = (balance * (risk / 100)).toFixed(2);
        addLog(`🤖 [AI - ${selectedSymbol}]: Identifierar köpläge (${strategy}). Investerar $${tradeSize}`, 'success');
    } else if (rand > 6.5) {
        const profitOrLoss = (Math.random() * (risk * 15) - (risk * 5)).toFixed(2);
        const numPnL = parseFloat(profitOrLoss);
        
        pnl += numPnL;
        balance += numPnL;

        if (numPnL >= 0) {
            addLog(`🚀 [AI TRADE]: Stängde position i ${selectedSymbol} med VINST +$${numPnL}`, 'success');
        } else {
            addLog(`⚠️ [AI STOP-LOSS]: Stängde position i ${selectedSymbol} med förlust -$${Math.abs(numPnL)}`, 'danger');
        }

        totalBalanceEl.textContent = `$${balance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        dailyPnlEl.textContent = `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`;
        dailyPnlEl.className = `text-sm font-semibold ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
    } else {
        addLog(`🔍 [AI SCANNER]: Analyserar orderboken för ${selectedSymbol}. Avvaktar...`, 'info');
    }
}

toggleBtn.addEventListener('click', () => {
    isRunning = !isRunning;

    if (isRunning) {
        toggleBtn.className = "w-full bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-rose-500/25 transition transform active:scale-95 flex items-center justify-center gap-2";
        toggleBtn.innerHTML = `<i class="fa-solid fa-stop"></i> Stoppa AI-Robot`;
        
        botStatusBadge.className = "px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5";
        botStatusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Bot Aktiv (${selectedSymbol})`;

        addLog(`AI-roboten startad för ${selectedSymbol}.`, "success");
        tradeInterval = setInterval(runAiTradeCycle, 4000);

    } else {
        toggleBtn.className = "w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-cyan-500/25 transition transform active:scale-95 flex items-center justify-center gap-2";
        toggleBtn.innerHTML = `<i class="fa-solid fa-power-off"></i> Starta AI-Robot`;
        
        botStatusBadge.className = "px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5";
        botStatusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span> Bot Pausad`;

        addLog("AI-roboten har pausats.", "warn");
        clearInterval(tradeInterval);
    }
});
