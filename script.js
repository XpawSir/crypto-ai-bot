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
const fitChartBtn = document.getElementById('fit-chart-btn');

const metricSharpe = document.getElementById('metric-sharpe');
const metricDrawdown = document.getElementById('metric-drawdown');
const metricWinrate = document.getElementById('metric-winrate');
const metricProfitfactor = document.getElementById('metric-profitfactor');
const marketSpreadEl = document.getElementById('market-spread');
const orderbookPressureEl = document.getElementById('orderbook-pressure');

if (localStorage.getItem('cryptoai_symbol')) {
    cryptoSelect.value = localStorage.getItem('cryptoai_symbol');
}
if (localStorage.getItem('cryptoai_risk')) {
    riskRange.value = localStorage.getItem('cryptoai_risk');
    riskValue.textContent = `${riskRange.value} / 10`;
}

let isRunning = false;
let tradeInterval = null;
let priceFetchInterval = null;

let balance = 10000.00;
let initialBalance = 10000.00;
let peakBalance = 10000.00;
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
        borderColor: '#1e2329
