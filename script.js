// Hämta element från DOM
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
let botInterval = null;
let balance = 10450.00;
let pnl = 450.00;
let currentBtcPrice = 67420.50;

// Uppdatera riskvärde text
riskRange.addEventListener('input', (e) => {
    riskValue.textContent = `${e.target.value} / 10`;
});

// Skapa initiala "graf-staplar"
const barsCount = 24;
let barValues = Array.from({length: barsCount}, () => Math.floor(Math.random() * 40) + 30);

function renderChart() {
    chartBars.innerHTML = '';
    const maxVal = Math.max(...barValues);
    barValues.forEach((val) => {
        const bar = document.createElement('div');
        const heightPercent = (val / maxVal) * 100;
        bar.className = 'flex-1 bg-gradient-to-t from-cyan-600/40 to-cyan-400 rounded-t transition-all duration-300';
        bar.style.height = `${Math.max(heightPercent, 10)}%`;
        chartBars.appendChild(bar);
    });
}
renderChart();

// Lägg till loggmeddelande
function addLog(message, type = 'info') {
    const time = new Date().toLocaleTimeString();
    const div = document.createElement('div');
    
    let colorClass = 'text-slate-300';
    if (type === 'success') colorClass = 'text-emerald-400';
    if (type === 'danger') colorClass = 'text-rose-400';
    if (type === 'warn') colorClass = 'text-amber-400';

    div.className = colorClass;
    div.innerHTML = `<span class="text-slate-500">[${time}]</span> ${message}`;
    aiLog.appendChild(div);
    aiLog.scrollTop = aiLog.scrollHeight;
}

// Starta / Stoppa AI-roboten
toggleBtn.addEventListener('click', () => {
    isRunning = !isRunning;

    if (isRunning) {
        // Ändra till aktivt läge
        toggleBtn.className = "w-full bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-rose-500/25 transition transform active:scale-95 flex items-center justify-center gap-2";
        toggleBtn.innerHTML = `<i class="fa-solid fa-stop"></i> Stoppa AI-Robot`;
        
        botStatusBadge.className = "px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5";
        botStatusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Bot Aktiv`;

        addLog("AI-roboten har startats och analyserar orderböcker...", "success");

        // Starta simulerad AI-loop
        botInterval = setInterval(() => {
            runAiTradeCycle();
        }, 4000);

    } else {
        // Pausa/stoppa
        toggleBtn.className = "w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-cyan-500/25 transition transform active:scale-95 flex items-center justify-center gap-2";
        toggleBtn.innerHTML = `<i class="fa-solid fa-power-off"></i> Starta AI-Robot`;
        
        botStatusBadge.className = "px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5";
        botStatusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span> Bot Pausad`;

        addLog("AI-roboten har pausats av användaren.", "warn");
        clearInterval(botInterval);
    }
});

// Simulerad AI-logik som körs periodvis
function runAiTradeCycle() {
    // Slumpa prisrörelse för BTC
    const priceChange = (Math.random() - 0.48) * 120;
    currentBtcPrice += priceChange;
    btcPriceEl.textContent = `$${currentBtcPrice.toFixed(2)}`;

    // Uppdatera grafstaplar
    barValues.shift();
    barValues.push(Math.floor(Math.random() * 40) + 30);
    renderChart();

    // Slumpa om AI gör en affär
    const actions = ['BUY', 'SELL', 'HOLD'];
    const chosenAction = actions[Math.floor(Math.random() * actions.length)];

    if (chosenAction === 'BUY') {
        const tradeAmount = (Math.random() * 50 + 10).toFixed(2);
        pnl += parseFloat((tradeAmount * 0.15).toFixed(2));
        balance += parseFloat((tradeAmount * 0.15).toFixed(2));
        
        addLog(`AI analyserar trend: Indikator RSI visar översålt. Köper BTC för $${tradeAmount}`, "success");
    } else if (chosenAction === 'SELL') {
        const tradeProfit = (Math.random() * 40 - 10).toFixed(2);
        pnl += parseFloat(tradeProfit);
        balance += parseFloat(tradeProfit);

        if (tradeProfit > 0) {
            addLog(`AI säkrar vinst! Stänger position med +$${tradeProfit}`, "success");
        } else {
            addLog(`AI triggade stop-loss. Stänger position med -$${Math.abs(tradeProfit)}`, "danger");
        }
    } else {
        addLog(`AI scannar marknaden: Inga optimala lägen hittades för tillfället. Väntar...`, "info");
    }

    // Uppdatera UI för saldo
    totalBalanceEl.textContent = `$${balance.toFixed(2)}`;
    dailyPnlEl.textContent = `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} (${((pnl/10000)*100).toFixed(2)}%)`;
    dailyPnlEl.className = `text-sm font-semibold ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
}
