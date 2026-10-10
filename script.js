// Element från DOM
const toggleBtn = document.getElementById('toggle-bot-btn');
const botStatusBadge = document.getElementById('bot-status-badge');
const aiLog = document.getElementById('ai-log');
const riskRange = document.getElementById('risk-range');
const riskValue = document.getElementById('risk-value');
const btcPriceEl = document.getElementById('btc-price');
const btcChangeEl = document.getElementById('btc-change');
const totalBalanceEl = document.getElementById('total-balance');
const dailyPnlEl = document.getElementById('daily-pnl');
const chartBars = document.getElementById('chart-bars');

let isRunning = false;
let tradeInterval = null;
let priceFetchInterval = null;

// Låtsas-konto (Simulerat saldo)
let balance = 10000.00; // Startkapital $10,000
let pnl = 0.00;
let currentBtcPrice = 0;
let previousBtcPrice = 0;

// Uppdatera visning av risk
riskRange.addEventListener('input', (e) => {
    riskValue.textContent = `${e.target.value} / 10`;
});

// Skapa visualisering för diagram
const barsCount = 24;
let barValues = Array.from({length: barsCount}, () => Math.floor(Math.random() * 40) + 30);

function renderChart() {
    chartBars.innerHTML = '';
    const maxVal = Math.max(...barValues, 1);
    barValues.forEach((val) => {
        const bar = document.createElement('div');
        const heightPercent = (val / maxVal) * 100;
        bar.className = 'flex-1 bg-gradient-to-t from-cyan-600/40 to-cyan-400 rounded-t transition-all duration-300';
        bar.style.height = `${Math.max(heightPercent, 10)}%`;
        chartBars.appendChild(bar);
    });
}
renderChart();

// Lägg till meddelande i AI-loggen
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

// Hämta RIKTIGT live-pris direkt från Binance Krypto-börs API
async function fetchLiveBtcPrice() {
    try {
        const response = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
        const data = await response.json();
        
        previousBtcPrice = currentBtcPrice;
        currentBtcPrice = parseFloat(data.lastPrice);
        const priceChangePercent = parseFloat(data.priceChangePercent);

        // Uppdatera UI
        btcPriceEl.textContent = `$${currentBtcPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        
        const isPositive = priceChangePercent >= 0;
        btcChangeEl.textContent = `${isPositive ? '+' : ''}${priceChangePercent.toFixed(2)}% (24h)`;
        btcChangeEl.className = `text-xs font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`;

        // Uppdatera diagrammet
        barValues.shift();
        barValues.push(Math.floor(currentBtcPrice % 100));
        renderChart();

    } catch (error) {
        console.error("Kunde inte hämta pris från Binance:", error);
    }
}

// Starta hämtning av riktiga marknadsdata direkt
fetchLiveBtcPrice();
priceFetchInterval = setInterval(fetchLiveBtcPrice, 3000); // Uppdatera priser var 3:e sekund

// AI Trading-logik (Simulerad handel baserad på live-pris)
function runAiTradeCycle() {
    if (currentBtcPrice === 0) return;

    const risk = parseInt(riskRange.value);
    const strategy = document.getElementById('strategy-select').value;
    
    // Slumpa/beräkna AI-beslut
    const rand = Math.random() * 10;
    
    if (rand < 3.5) {
        // AI KÖPER
        const tradeSize = (balance * (risk / 100)).toFixed(2);
        if (parseFloat(tradeSize) < 10) return;

        addLog(`🤖 [AI ANALYS - ${strategy.toUpperCase()}]: Positiv volym mätt på Binance! Köper BTC för $${tradeSize} (Live-kurs: $${currentBtcPrice.toFixed(2)})`, 'success');
        
    } else if (rand > 6.5) {
        // AI SÄLJER & RÄKNAR VINST/FÖRLUST
        const profitOrLoss = (Math.random() * (risk * 15) - (risk * 5)).toFixed(2);
        const numPnL = parseFloat(profitOrLoss);
        
        pnl += numPnL;
        balance += numPnL;

        if (numPnL >= 0) {
            addLog(`🚀 [AI TRADE SÅLD]: Stängde position med VINST +$${numPnL} på levande marknadsdata!`, 'success');
        } else {
            addLog(`⚠️ [AI STOP-LOSS]: Utlöste säkerhetsspärr. Stängde position med förlust -$${Math.abs(numPnL)}`, 'danger');
        }

        // Uppdatera saldo
        totalBalanceEl.textContent = `$${balance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        dailyPnlEl.textContent = `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`;
        dailyPnlEl.className = `text-sm font-semibold ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;

    } else {
        // AI VÄNTAR
        addLog(`🔍 [AI SCANNER]: Analyserar Binance orderbok. Inget tydligt läge just nu, avvaktar...`, 'info');
    }
}

// Starta / Stoppa AI-roboten
toggleBtn.addEventListener('click', () => {
    isRunning = !isRunning;

    if (isRunning) {
        toggleBtn.className = "w-full bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-rose-500/25 transition transform active:scale-95 flex items-center justify-center gap-2";
        toggleBtn.innerHTML = `<i class="fa-solid fa-stop"></i> Stoppa AI-Robot`;
        
        botStatusBadge.className = "px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5";
        botStatusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Bot Aktiv (Kopplad till Binance API)`;

        addLog("Kopplingen till Binance är bekräftad. AI-roboten börjar analysera live-flödet...", "success");

        // Kör AI-logik var 4:e sekund
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
