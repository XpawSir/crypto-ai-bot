// ============================================================
//   CryptoAI Pro Terminal – script.js (v2.3: fler strategier, AUTO, 24/7-drift, Firebase-inloggning)
//   Handeln är simulerad (paper trading). Ingen koppling till någon börs.
// ============================================================

// ---------- Firebase & inloggningsskydd ----------
// Firebase-nycklarna nedan är avsiktligt publika (så fungerar Firebase i webbläsaren).
// Skyddet kommer från inställningarna i Firebase-konsolen, inte från att nycklarna är hemliga.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyD2y98EZ9kUpzP24IE_rFRqL-sZ5w04ttc",
    authDomain: "cryptoai-a74a4.firebaseapp.com",
    projectId: "cryptoai-a74a4",
    storageBucket: "cryptoai-a74a4.firebasestorage.app",
    messagingSenderId: "517561549498",
    appId: "1:517561549498:web:61c7cb06424406f3b67883",
    measurementId: "G-RC6WWS0G2W"
};

const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);

// Valfritt extra skydd: skriv in din e-postadress här, t.ex. ["din.epost@gmail.com"].
// Tom lista = alla med ett konto i ditt Firebase-projekt släpps in.
const ALLOWED_EMAILS = [];

// Sidan är dold (se index.html) tills inloggningen är bekräftad. Ingen data hämtas före dess.
onAuthStateChanged(auth, function (user) {
    const allowed = user && (ALLOWED_EMAILS.length === 0 || ALLOWED_EMAILS.indexOf(user.email) !== -1);
    if (!allowed) {
        const go = function () { window.location.href = "login.html"; };
        if (user) signOut(auth).then(go, go); else go();
        return;
    }
    document.documentElement.style.visibility = "visible";
    initApp();
});

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
const autoInfoEl = document.getElementById('auto-info');
const legendLines = document.getElementById('legend-lines');
const chartContainer = document.getElementById('tv-chart-container');

const metricSharpe = document.getElementById('metric-sharpe');
const metricDrawdown = document.getElementById('metric-drawdown');
const metricWinrate = document.getElementById('metric-winrate');
const metricProfitfactor = document.getElementById('metric-profitfactor');
const marketSpreadEl = document.getElementById('market-spread');

// ---------- Inställningar ----------
const API = 'https://api.binance.com/api/v3';
const HISTORY_LIMIT = 1000;     // candles som hämtas till grafen (AUTO behöver gott om historik)
const MAX_CANDLES = 1300;
const REFRESH_MS = 3000;
const BOT_MS = 4000;
const BACKTEST_CANDLES = 4000;  // så många candles används för stjärnorna
const BACKTEST_START = 200;     // alla strategier jämförs från samma startpunkt
const FEE = 0.001;              // 0,1 % per köp/sälj
const AUTO_WINDOW = 600;        // AUTO tittar på de senaste 600 candlesen när den väljer
const AUTO_REEVAL = 10;         // AUTO omprövar sitt val högst var 10:e candle, och bara utan öppen position
const AUTO_SWITCH_MARGIN = 2;   // ett nytt val måste vara minst 2 poäng bättre för att byta
const COLORS = { up: '#0ecb81', down: '#f6465d' };
const decimalsBySymbol = { BTCUSDT: 2, ETHUSDT: 2, SOLUSDT: 2, XRPUSDT: 4 };
const MODE_TEXT = { trend: 'trendande marknad', revert: 'sidledes marknad', any: 'osäkert läge' };
const STEP_SEC = { '1m': 60, '5m': 300, '15m': 900, '1h': 3600 }; // sekunder per candle

// ---------- Indikatorer ----------
function closes(d) { return d.map(function (x) { return x.close; }); }
function fmtN(v) { return (v === null || v === undefined) ? '-' : fmt(v); }

function emaArr(v, p) {
    const k = 2 / (p + 1), o = [];
    for (let i = 0; i < v.length; i++) o.push(i === 0 ? v[i] : v[i] * k + o[i - 1] * (1 - k));
    return o;
}
function smaArr(v, p) {
    const o = [];
    for (let i = 0; i < v.length; i++) {
        if (i < p - 1) { o.push(null); continue; }
        let s = 0, ok = true;
        for (let j = i - p + 1; j <= i; j++) { if (v[j] === null) { ok = false; break; } s += v[j]; }
        o.push(ok ? s / p : null);
    }
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
// ATR som enkelt medelvärde av True Range (samma sätt som calculateATR längre ner)
function atrSimple(d, p) {
    const o = [], tr = [0];
    for (let i = 0; i < d.length; i++) {
        if (i > 0) tr.push(Math.max(d[i].high - d[i].low, Math.abs(d[i].high - d[i - 1].close), Math.abs(d[i].low - d[i - 1].close)));
        if (i < p) { o.push(d[i].high - d[i].low); continue; }
        let s = 0;
        for (let j = i - p + 1; j <= i; j++) s += tr[j];
        o.push(s / p);
    }
    return o;
}
function adxCalc(d, p) {
    const n = d.length, adx = [], pdi = [], mdi = [];
    for (let i = 0; i < n; i++) { adx.push(null); pdi.push(null); mdi.push(null); }
    if (n < 2 * p + 1) return { adx: adx, pdi: pdi, mdi: mdi };
    let str = 0, sp = 0, sm = 0;
    const dx = [];
    for (let i = 1; i < n; i++) {
        const up = d[i].high - d[i - 1].high, dn = d[i - 1].low - d[i].low;
        const pd = (up > dn && up > 0) ? up : 0, md = (dn > up && dn > 0) ? dn : 0;
        const tr = Math.max(d[i].high - d[i].low, Math.abs(d[i].high - d[i - 1].close), Math.abs(d[i].low - d[i - 1].close));
        if (i <= p) { str += tr; sp += pd; sm += md; }
        else { str = str - str / p + tr; sp = sp - sp / p + pd; sm = sm - sm / p + md; }
        if (i >= p) {
            pdi[i] = str > 0 ? 100 * sp / str : 0;
            mdi[i] = str > 0 ? 100 * sm / str : 0;
            const s = pdi[i] + mdi[i];
            const x = s > 0 ? 100 * Math.abs(pdi[i] - mdi[i]) / s : 0;
            dx.push(x);
            if (dx.length === p) adx[i] = dx.reduce(function (a, b) { return a + b; }, 0) / p;
            else if (dx.length > p) adx[i] = (adx[i - 1] * (p - 1) + x) / p;
        }
    }
    return { adx: adx, pdi: pdi, mdi: mdi };
}
function crossUp(a, b, i) {
    return i > 0 && a[i] !== null && b[i] !== null && a[i - 1] !== null && b[i - 1] !== null && a[i - 1] <= b[i - 1] && a[i] > b[i];
}
function crossDown(a, b, i) {
    return i > 0 && a[i] !== null && b[i] !== null && a[i - 1] !== null && b[i - 1] !== null && a[i - 1] >= b[i - 1] && a[i] < b[i];
}
function signals(n, fb, fs) {
    const buy = [], sell = [];
    for (let i = 0; i < n; i++) { buy.push(!!fb(i)); sell.push(!!fs(i)); }
    return { buy: buy, sell: sell };
}

// ---------- Strategier ----------
// Varje strategi räknar ut köp/sälj per candle (bara med data fram till den candlen, aldrig framåt),
// samt linjer som ritas på grafen. kind = 'trend' (följer trender) eller 'revert' (köper svackor).
// osc = true betyder att linjerna ritas i en egen panel längst ner (värden som RSI/MACD passar inte på prisskalan).
// Samma kod används av boten, av stjärn-backtestet och av AUTO-läget.
function maStrategy(name, f, s, fn, label, extra) {
    return Object.assign({
        name: name, kind: 'trend', osc: false, colors: ['#facc15', '#38bdf8'],
        legend: [[label + ' ' + f + ':', 'Snabb trend'], [label + ' ' + s + ':', 'Långsam trend']],
        compute: function (d) {
            const c = closes(d), a = fn(c, f), b = fn(c, s);
            const r = signals(d.length, function (i) { return crossUp(a, b, i); }, function (i) { return crossDown(a, b, i); });
            r.lines = [a, b];
            r.text = function (i) { return label + ' ' + f + ' ' + fmtN(a[i]) + ' / ' + label + ' ' + s + ' ' + fmtN(b[i]); };
            return r;
        }
    }, extra || {});
}

function donchianStrategy(name, up, down) {
    return {
        name: name, kind: 'trend', osc: false, colors: ['#fb923c', '#a78bfa'],
        legend: [['Övre:', 'Högsta ' + up], ['Nedre:', 'Lägsta ' + down]],
        compute: function (d) {
            const hi = [], lo = [];
            for (let i = 0; i < d.length; i++) {
                if (i < up) { hi.push(null); lo.push(null); continue; }
                let h = -Infinity, l = Infinity;
                for (let j = i - up; j < i; j++) h = Math.max(h, d[j].high);
                for (let j = i - down; j < i; j++) l = Math.min(l, d[j].low);
                hi.push(h); lo.push(l);
            }
            const r = signals(d.length, function (i) { return hi[i] !== null && d[i].close > hi[i]; }, function (i) { return lo[i] !== null && d[i].close < lo[i]; });
            r.lines = [hi, lo];
            r.text = function (i) { return 'Pris ' + fmt(d[i].close) + ' / högsta' + up + ' ' + fmtN(hi[i]) + ' / lägsta' + down + ' ' + fmtN(lo[i]); };
            return r;
        }
    };
}

// "Ingen strategi": används på grafen när AUTO inte har valt något
const NONE = {
    name: '-', kind: 'none', osc: false, colors: [], legend: [],
    compute: function (d) {
        return { buy: [], sell: [], lines: [], text: function () { return ''; } };
    }
};

const STRATEGIES = {
    'auto': {
        name: 'AUTO (väljer bästa strategi själv)', kind: 'auto', osc: false, colors: [], legend: [],
        compute: function (d) { return NONE.compute(d); }
    },
    'ema': maStrategy('EMA 9/21', 9, 21, emaArr, 'EMA'),
    'ema-50-200': maStrategy('EMA 50/200 (Golden Cross)', 50, 200, emaArr, 'EMA'),
    'sma-20-50': maStrategy('SMA 20/50', 20, 50, smaArr, 'SMA'),
    'ema-fast': maStrategy('EMA 3/8 (snabbtest)', 3, 8, emaArr, 'EMA', { auto: false }),
    'macd': {
        name: 'MACD 12/26/9', kind: 'trend', osc: true, colors: ['#38bdf8', '#facc15'],
        legend: [['MACD:', 'Nedre panelen'], ['Signal:', 'Linje']],
        compute: function (d) {
            const c = closes(d), e12 = emaArr(c, 12), e26 = emaArr(c, 26);
            const m = e12.map(function (x, i) { return x - e26[i]; }), sg = emaArr(m, 9);
            const r = signals(d.length, function (i) { return crossUp(m, sg, i); }, function (i) { return crossDown(m, sg, i); });
            r.lines = [m, sg];
            r.text = function (i) { return 'MACD ' + m[i].toFixed(2) + ' / signal ' + sg[i].toFixed(2); };
            return r;
        }
    },
    'supertrend': {
        name: 'SuperTrend 10/3', kind: 'trend', osc: false, colors: ['#0ecb81'],
        legend: [['SuperTrend:', 'ATR 10 x 3']],
        compute: function (d) {
            const at = atrSimple(d, 10), n = d.length, st = [], dir = [];
            let fu = null, fl = null, down = false;
            for (let i = 0; i < n; i++) {
                if (i < 10) { st.push(null); dir.push(0); continue; }
                const hl = (d[i].high + d[i].low) / 2, bu = hl + 3 * at[i], bl = hl - 3 * at[i];
                if (fu === null) { fu = bu; fl = bl; down = false; }
                else {
                    const pc = d[i - 1].close;
                    fu = (bu < fu || pc > fu) ? bu : fu;
                    fl = (bl > fl || pc < fl) ? bl : fl;
                    down = down ? d[i].close <= fu : d[i].close < fl;
                }
                st.push(down ? fu : fl);
                dir.push(down ? -1 : 1);
            }
            const r = signals(n, function (i) { return i > 0 && dir[i] === 1 && dir[i - 1] === -1; }, function (i) { return i > 0 && dir[i] === -1 && dir[i - 1] === 1; });
            r.lines = [st];
            r.text = function (i) { return 'SuperTrend ' + fmtN(st[i]) + ' (' + (dir[i] === 1 ? 'upp' : 'ned') + ')'; };
            return r;
        }
    },
    'adx': {
        name: 'ADX/DI trend 14', kind: 'trend', osc: true, colors: ['#facc15', '#0ecb81', '#f6465d'],
        legend: [['ADX:', 'Trendstyrka'], ['+DI:', 'Upp'], ['-DI:', 'Ned']],
        compute: function (d) {
            const x = adxCalc(d, 14);
            const r = signals(d.length,
                function (i) { return crossUp(x.pdi, x.mdi, i) && x.adx[i] !== null && x.adx[i] > 20; },
                function (i) { return crossDown(x.pdi, x.mdi, i); });
            r.lines = [x.adx, x.pdi, x.mdi];
            r.text = function (i) { return 'ADX ' + (x.adx[i] === null ? '-' : x.adx[i].toFixed(1)) + ' / +DI ' + (x.pdi[i] === null ? '-' : x.pdi[i].toFixed(1)) + ' / -DI ' + (x.mdi[i] === null ? '-' : x.mdi[i].toFixed(1)); };
            return r;
        }
    },
    'ichimoku': {
        name: 'Ichimoku (TK-kors över molnet)', kind: 'trend', osc: false, colors: ['#facc15', '#38bdf8'],
        legend: [['Tenkan:', '9'], ['Kijun:', '26']],
        compute: function (d) {
            function mid(p) {
                const o = [];
                for (let i = 0; i < d.length; i++) {
                    if (i < p - 1) { o.push(null); continue; }
                    let h = -Infinity, l = Infinity;
                    for (let j = i - p + 1; j <= i; j++) { h = Math.max(h, d[j].high); l = Math.min(l, d[j].low); }
                    o.push((h + l) / 2);
                }
                return o;
            }
            const t = mid(9), k = mid(26), b52 = mid(52), top = [], bot = [];
            for (let i = 0; i < d.length; i++) {
                const a = (i >= 26 && t[i - 26] !== null && k[i - 26] !== null) ? (t[i - 26] + k[i - 26]) / 2 : null;
                const b = i >= 26 ? b52[i - 26] : null;
                if (a === null || b === null) { top.push(null); bot.push(null); }
                else { top.push(Math.max(a, b)); bot.push(Math.min(a, b)); }
            }
            const r = signals(d.length,
                function (i) { return crossUp(t, k, i) && top[i] !== null && d[i].close > top[i]; },
                function (i) { return crossDown(t, k, i) || (bot[i] !== null && d[i].close < bot[i]); });
            r.lines = [t, k];
            r.text = function (i) { return 'Tenkan ' + fmtN(t[i]) + ' / Kijun ' + fmtN(k[i]) + ' / moln över ' + fmtN(top[i]); };
            return r;
        }
    },
    'keltner': {
        name: 'Keltner breakout (EMA 20 + 2 ATR)', kind: 'trend', osc: false, colors: ['#fb923c', '#facc15', '#fb923c'],
        legend: [['Kanal:', 'EMA 20 ± 2 ATR']],
        compute: function (d) {
            const c = closes(d), m = emaArr(c, 20), at = atrSimple(d, 10);
            const up = m.map(function (x, i) { return x + 2 * at[i]; }), lo = m.map(function (x, i) { return x - 2 * at[i]; });
            const r = signals(d.length, function (i) { return i >= 20 && c[i] > up[i]; }, function (i) { return i >= 20 && c[i] < m[i]; });
            r.lines = [up, m, lo];
            r.text = function (i) { return 'Pris ' + fmt(c[i]) + ' / övre ' + fmt(up[i]) + ' / mitt ' + fmt(m[i]); };
            return r;
        }
    },
    'donchian': donchianStrategy('Donchian 20/10 (breakout)', 20, 10),
    'donchian-55': donchianStrategy('Donchian 55/20 (Turtle)', 55, 20),
    'rsi': {
        name: 'RSI 14 (köp under 30, sälj över 70)', kind: 'revert', osc: true, colors: ['#a78bfa'],
        legend: [['RSI:', '14 perioder, nedre panelen']],
        compute: function (d) {
            const v = rsiArr(closes(d), 14);
            const r = signals(d.length, function (i) { return v[i] !== null && v[i] < 30; }, function (i) { return v[i] !== null && v[i] > 70; });
            r.lines = [v];
            r.text = function (i) { return 'RSI ' + (v[i] === null ? '-' : v[i].toFixed(1)); };
            return r;
        }
    },
    'rsi-trend': {
        name: 'RSI-dip i upptrend (EMA 100)', kind: 'revert', osc: false, colors: ['#a78bfa'],
        legend: [['EMA 100:', 'Trendfilter']],
        compute: function (d) {
            const c = closes(d), v = rsiArr(c, 14), e = emaArr(c, 100);
            const r = signals(d.length,
                function (i) { return i >= 100 && v[i] !== null && v[i] < 35 && c[i] > e[i]; },
                function (i) { return v[i] !== null && (v[i] > 60 || c[i] < e[i]); });
            r.lines = [e];
            r.text = function (i) { return 'RSI ' + (v[i] === null ? '-' : v[i].toFixed(1)) + ' / EMA100 ' + fmt(e[i]); };
            return r;
        }
    },
    'bb': {
        name: 'Bollinger 20/2 (mean reversion)', kind: 'revert', osc: false, colors: ['#a78bfa', '#facc15', '#a78bfa'],
        legend: [['Band:', 'Övre/undre (2 std)'], ['Mitt:', 'Snitt 20']],
        compute: function (d) {
            const c = closes(d), mid = [], up = [], lo = [];
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
            r.text = function (i) { return 'Pris ' + fmt(c[i]) + ' / nedre ' + fmtN(lo[i]) + ' / mitt ' + fmtN(mid[i]); };
            return r;
        }
    },
    'stoch': {
        name: 'Stochastic 14/3/3', kind: 'revert', osc: true, colors: ['#38bdf8', '#facc15'],
        legend: [['%K:', 'Snabb, nedre panelen'], ['%D:', 'Signal']],
        compute: function (d) {
            const raw = [];
            for (let i = 0; i < d.length; i++) {
                if (i < 13) { raw.push(null); continue; }
                let h = -Infinity, l = Infinity;
                for (let j = i - 13; j <= i; j++) { h = Math.max(h, d[j].high); l = Math.min(l, d[j].low); }
                raw.push(h > l ? 100 * (d[i].close - l) / (h - l) : 50);
            }
            const k = smaArr(raw, 3), dd = smaArr(k, 3);
            const r = signals(d.length,
                function (i) { return crossUp(k, dd, i) && k[i] < 25; },
                function (i) { return crossDown(k, dd, i) && k[i] > 75; });
            r.lines = [k, dd];
            r.text = function (i) { return '%K ' + (k[i] === null ? '-' : k[i].toFixed(1)) + ' / %D ' + (dd[i] === null ? '-' : dd[i].toFixed(1)); };
            return r;
        }
    }
};
Object.keys(STRATEGIES).forEach(function (id) { STRATEGIES[id].id = id; });
const STRATEGY_IDS = Object.keys(STRATEGIES);
const BASE_IDS = STRATEGY_IDS.filter(function (id) { return id !== 'auto'; });
const AUTO_POOL = BASE_IDS.filter(function (id) { return STRATEGIES[id].auto !== false; });
const stars = {};

// ---------- LocalStorage ----------
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
let viewStrategy = strategy.kind === 'auto' ? NONE : strategy; // det som ritas på grafen

let autoPick = null;       // id för strategin AUTO valt just nu
let autoMode = 'any';
let autoLastPick = 0;
let posStrategyId = null;  // strategin som öppnade nuvarande position

let candles = [];
let markers = [];
let currentPrice = 0;
let currentBid = 0, currentAsk = 0;   // riktiga bud/utbud: köp fylls på ask, sälj på bid
const SLIP = 0.0002;                  // extra glapp utöver spreaden (0,02 %)
const buyPx = function () { return (currentAsk > 0 ? currentAsk : currentPrice) * (1 + SLIP); };
const sellPx = function () { return (currentBid > 0 ? currentBid : currentPrice) * (1 - SLIP); };
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
let entryTime = 0;          // tidpunkt (candle) då positionen öppnades
let botTicker = null;
let wakeLock = null;
const wasRunning = restoreBotState(); // true om boten gick när sidan stängdes

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
// Linjer på prisskalan (EMA, Bollinger, ...)
const overlaySeries = [0, 1, 2].map(function () { return chart.addLineSeries(lineOpts); });
// Linjer i egen panel längst ner (RSI, MACD, ADX, Stochastic) så att de inte krossar prisgrafen
const oscSeries = [0, 1, 2].map(function () {
    return chart.addLineSeries(Object.assign({ priceScaleId: 'osc' }, lineOpts));
});
// Färger på graferna följer valt tema (mörkt/ljust). Anropas av ui.js när temat byts.
const serverCharts = [];
function themeColors() {
    const light = document.documentElement.dataset.theme === 'light';
    return light
        ? { bg: '#ffffff', text: '#475569', grid: '#e5e7eb', border: '#d1d5db' }
        : { bg: '#030405', text: '#8a8f9c', grid: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.10)' };
}
window.setChartTheme = function () {
    const c = themeColors();
    chart.applyOptions({
        layout: { background: { type: LightweightCharts.ColorType.Solid, color: c.bg }, textColor: c.text },
        grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } },
        rightPriceScale: { borderColor: c.border }, timeScale: { borderColor: c.border }
    });
    serverCharts.forEach(function (sc) { sc.applyOptions({ layout: { textColor: c.text }, grid: { horzLines: { color: c.grid } } }); });
};
window.setChartTheme();

chart.priceScale('osc').applyOptions({ scaleMargins: { top: 0.78, bottom: 0.02 } });

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

// Samma riskfaktor används av boten och av backtestet så att stjärnorna visar det boten faktiskt gör
function riskMult() {
    const risk = parseInt(riskRange.value);
    return Math.max(0.5, (11 - risk) * 0.2);
}

// ---------- Linjer och förklaring ----------
function toPoints(d, arr) {
    const out = [];
    for (let i = 0; i < d.length; i++) {
        if (arr[i] !== null && arr[i] !== undefined) out.push({ time: d[i].time, value: arr[i] });
    }
    return out;
}

function activeSeries() { return viewStrategy.osc ? oscSeries : overlaySeries; }

function setOverlays() {
    const res = viewStrategy.compute(candles);
    const use = activeSeries();
    const other = viewStrategy.osc ? overlaySeries : oscSeries;
    other.forEach(function (x) { x.setData([]); });
    use.forEach(function (x, j) {
        if (res.lines[j]) {
            x.applyOptions({ color: viewStrategy.colors[j] || '#38bdf8' });
            x.setData(toPoints(candles, res.lines[j]));
        } else {
            x.setData([]);
        }
    });
    chart.priceScale('right').applyOptions({
        scaleMargins: viewStrategy.osc ? { top: 0.05, bottom: 0.3 } : { top: 0.1, bottom: 0.1 }
    });
    if (candles.length > 0) lastEmaTime = candles[candles.length - 1].time;
}

function updateLegend() {
    if (!legendLines) return;
    legendLines.innerHTML = viewStrategy.legend.length
        ? viewStrategy.legend.map(function (l, j) {
            return '<div><span class="inline-block w-3 h-1 mr-1" style="background:' + (viewStrategy.colors[j] || '#38bdf8') + '"></span><strong>' + l[0] + '</strong> ' + l[1] + '</div>';
        }).join('')
        : '<div>Inga linjer, signalerna syns som pilar</div>';
}

function setView(s) {
    viewStrategy = s;
    updateLegend();
    if (historyReady) setOverlays();
}

function updateAutoInfo() {
    if (!autoInfoEl) return;
    if (strategy.kind !== 'auto') { autoInfoEl.textContent = ''; return; }
    autoInfoEl.textContent = autoPick
        ? 'AUTO använder nu: ' + STRATEGIES[autoPick].name + ' (' + MODE_TEXT[autoMode] + ')'
        : 'AUTO: ingen strategi vald, väntar utanför marknaden';
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

// Provar reservadresser om huvudadressen är blockerad (Binance.com stänger ute vissa länder, t.ex. USA)
const API_FALLBACKS = ['https://data-api.binance.vision/api/v3', 'https://api.binance.us/api/v3'];
let apiBase = API;
async function getJSON(url) {
    const path = url.slice(API.length);
    const order = [apiBase].concat([API].concat(API_FALLBACKS).filter(function (b) { return b !== apiBase; }));
    let lastErr = null;
    for (let i = 0; i < order.length; i++) {
        try {
            const res = await fetch(order[i] + path);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const j = await res.json();
            apiBase = order[i];
            return j;
        } catch (e) { lastErr = e; }
    }
    throw lastErr;
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
        // Visa de senaste ~150 candlesen (hela historiken finns kvar om man scrollar)
        chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, candles.length - 150), to: candles.length + 5 });
        historyReady = true;
        setConnection(true);
        candleSeries.setMarkers(markers);
        if (hasOpenPosition) catchUp();
        if (strategy.kind === 'auto') autoRepick(candles.slice(0, -1), true);
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
    if (candles.length > MAX_CANDLES) candles.shift();

    const res = viewStrategy.compute(candles);
    const use = activeSeries();
    const n = candles.length;
    for (let i = Math.max(0, n - 2); i < n; i++) {
        if (candles[i].time < lastEmaTime) continue;
        use.forEach(function (x, j) {
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
        if (tok !== loadToken) return;

        const fresh = results[0].map(toCandle);
        const lastHave = candles[candles.length - 1];
        if (lastHave && fresh[0].time > lastHave.time + (STEP_SEC[selectedInterval] || 60)) {
            addLog('Lucka i datan (sidan låg i vila), hämtar om historiken...', 'info');
            loadHistory();
            return;
        }
        applyCandles(fresh);

        const tick = results[1];
        currentPrice = parseFloat(tick.lastPrice);
        const change = parseFloat(tick.priceChangePercent);
        cryptoPriceEl.textContent = '$' + fmt(currentPrice);
        cryptoChangeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
        cryptoChangeEl.className = 'text-[11px] font-mono font-semibold ' + (change >= 0 ? 'text-emerald-400' : 'text-red-400');

        const bid = parseFloat(results[2].bidPrice);
        const ask = parseFloat(results[2].askPrice);
        if (bid > 0 && ask >= bid) { currentBid = bid; currentAsk = ask; }
        if (ask > 0) marketSpreadEl.textContent = (((ask - bid) / ask) * 100).toFixed(4) + '%';

        setConnection(true);
    } catch (e) {
        setConnection(false, e);
    } finally {
        refreshing = false;
    }
}

function addMarker(side, price, atTime) {
    if (candles.length === 0) return;
    const t = atTime || candles[candles.length - 1].time;
    if (side === 'buy') {
        markers.push({ time: t, position: 'belowBar', color: COLORS.up, shape: 'arrowUp', text: 'Köp ' + fmt(price) });
    } else {
        markers.push({ time: t, position: 'aboveBar', color: COLORS.down, shape: 'arrowDown', text: 'Sälj ' + fmt(price) });
    }
    if (markers.length > 100) markers.shift();
    candleSeries.setMarkers(markers);
}

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

    let sharpe = 0;
    if (returnsHistory.length >= 2) {
        const mean = returnsHistory.reduce((a, b) => a + b, 0) / returnsHistory.length;
        const variance = returnsHistory.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (returnsHistory.length - 1);
        const std = Math.sqrt(variance);
        sharpe = std > 0 ? mean / std : 0;
    }
    metricSharpe.textContent = sharpe.toFixed(2);
}

// ---------- Handel & ATR ----------
function openPosition(price) {
    const spend = parseFloat(maxSpendInput.value);
    const maxSpend = spend > 0 ? spend : 1000;
    const risk = parseInt(riskRange.value);

    hasOpenPosition = true;
    entryPrice = price;
    positionExposure = maxSpend * (risk / 2);
    entryTime = candles.length ? candles[candles.length - 1].time : 0;

    const atr = calculateATR(candles, 14);
    const rm = riskMult();
    dynamicStopPrice = price - (atr * 1.5 * rm);
    dynamicTakeProfitPrice = price + (atr * 2.5 * rm);

    addMarker('buy', price);
    const by = posStrategyId ? ' [' + STRATEGIES[posStrategyId].name + ']' : '';
    addLog('🟢 Köp @ $' + fmt(price) + by + ' | ATR Stop: $' + fmt(dynamicStopPrice) + ' | TP: $' + fmt(dynamicTakeProfitPrice), 'success');
    saveBotState();
}

function closePosition(price, reason, atTime) {
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

    addMarker('sell', price, atTime);

    const amount = (delta >= 0 ? '+$' : '-$') + Math.abs(delta).toFixed(2);
    if (reason === 'stop') {
        addLog('🛑 Stop-loss utlöst @ $' + fmt(price) + ': ' + amount, 'danger');
    } else if (reason === 'tp') {
        addLog('🎯 Take-profit nådd @ $' + fmt(price) + ': ' + amount, 'success');
    } else {
        addLog('🔴 Position stängd @ $' + fmt(price) + ': ' + amount, delta >= 0 ? 'success' : 'danger');
    }

    hasOpenPosition = false;
    updateStats();
    saveBotState();
}

// ---------- Backtest ----------
// Simulerar handel med exakt samma regler som boten: köp/sälj-signal, ATR-stop, ATR-take-profit, 0,1 % avgift.
// getSig kan vara en signalmängd eller en funktion (i) => signalmängd, som anropas när vi står utanför marknaden.
function simulate(getSig, d, atr, from, to, rm) {
    const get = typeof getSig === 'function' ? getSig : function () { return getSig; };
    let inPos = false, entry = 0, stop = 0, tp = 0, posSig = null;
    let eq = 1, peak = 1, maxDD = 0, trades = 0, wins = 0, ws = 0, ls = 0;
    function exit(px) {
        const r = (px / entry) * (1 - FEE) * (1 - FEE) - 1;
        eq *= 1 + r; trades++;
        if (r > 0) { wins++; ws += r; } else { ls -= r; }
        peak = Math.max(peak, eq);
        maxDD = Math.max(maxDD, (peak - eq) / peak * 100);
        inPos = false;
    }
    for (let i = from; i < to; i++) {
        const c = d[i];
        if (inPos) {
            if (c.low <= stop) exit(Math.min(c.open, stop));
            else if (c.high >= tp) exit(Math.max(c.open, tp));
            else if (posSig.sell[i]) exit(c.close);
        }
        if (!inPos) {
            const sg = get(i);
            if (sg && sg.buy[i]) {
                inPos = true; entry = c.close; posSig = sg;
                stop = entry - atr[i] * 1.5 * rm;
                tp = entry + atr[i] * 2.5 * rm;
            }
        }
    }
    if (inPos) exit(d[to - 1].close);
    return { net: (eq - 1) * 100, maxDD: maxDD, trades: trades, wins: wins, pf: ls > 0 ? ws / ls : (ws > 0 ? Infinity : 0) };
}

// Förberäknar signaler för alla strategier (en gång per dataset)
function prepare(d) {
    const sigs = {};
    BASE_IDS.forEach(function (id) { sigs[id] = STRATEGIES[id].compute(d); });
    return { sigs: sigs, atr: atrSimple(d, 14), adx: adxCalc(d, 14).adx };
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

// ---------- AUTO: välj strategi efter marknadsläge och senaste resultat ----------
// 1) Marknadsläget bestäms med ADX: >= 25 trend, < 20 sidledes, annars osäkert.
// 2) Trendande marknad: bara trendstrategier. Sidledes: bara svacke-strategier. Osäkert: alla.
// 3) Varje kandidat testas på de senaste AUTO_WINDOW candlesen. Poäng = avkastning - 0,5 x största nedgång.
//    Kräver minst 3 affärer. Är bästa poängen inte positiv väntar boten utanför marknaden.
// 4) Ett byte kräver att den nya strategin är minst AUTO_SWITCH_MARGIN poäng bättre (annars hoppar den runt och förlorar på avgifter).
function pickBest(ctx, d, i, win, rm, current) {
    const a = ctx.adx[i];
    const mode = (a === null || a === undefined) ? 'any' : (a >= 25 ? 'trend' : (a < 20 ? 'revert' : 'any'));
    let best = null, bestScore = -Infinity, curScore = null;
    AUTO_POOL.forEach(function (id) {
        const k = STRATEGIES[id].kind;
        if (mode !== 'any' && k !== mode) return;
        const r = simulate(ctx.sigs[id], d, ctx.atr, i - win + 1, i + 1, rm);
        if (r.trades < 3) return;
        const score = r.net - 0.5 * r.maxDD;
        if (id === current) curScore = score;
        if (score > bestScore) { bestScore = score; best = id; }
    });
    if (best === null || bestScore <= 0) return { id: null, mode: mode, score: 0 };
    if (current && curScore !== null && curScore > 0 && bestScore < curScore + AUTO_SWITCH_MARGIN) {
        return { id: current, mode: mode, score: curScore };
    }
    return { id: best, mode: mode, score: bestScore };
}

function autoRepick(closed, force) {
    if (closed.length < 2) return;
    const last = closed[closed.length - 1];
    const step = last.time - closed[closed.length - 2].time;
    if (!force && autoLastPick && last.time - autoLastPick < AUTO_REEVAL * step) return;
    autoLastPick = last.time;
    const i = closed.length - 1;
    const win = Math.min(AUTO_WINDOW, i - BACKTEST_START);
    if (win < 200) {
        addLog('AUTO: för lite historik för att välja strategi.', 'warn');
        return;
    }
    const p = pickBest(prepare(closed), closed, i, win, riskMult(), autoPick);
    autoMode = p.mode;
    if (p.id !== autoPick) {
        autoPick = p.id;
        if (p.id) {
            addLog('AUTO väljer ' + STRATEGIES[p.id].name + ' (' + MODE_TEXT[p.mode] + ', poäng ' + p.score.toFixed(1) + ')', 'success');
        } else {
            addLog('AUTO: ingen strategi har varit lönsam nyligen, boten väntar utanför marknaden.', 'info');
        }
        setView(p.id ? STRATEGIES[p.id] : NONE);
    }
    updateAutoInfo();
}

// ---------- Backtest och stjärnor (körs mot riktig Binance-historik) ----------
let btToken = 0;
async function runBacktests() {
    const my = ++btToken, sym = selectedSymbol, itv = selectedInterval, rm = riskMult();
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

        const ctx = prepare(d);
        const fee2 = (1 - FEE) * (1 - FEE);
        const bh = ((d[d.length - 1].close / d[BACKTEST_START].close) * fee2 - 1) * 100;
        const days = Math.round((d[d.length - 1].time - d[BACKTEST_START].time) / 86400);
        addLog('Backtest ' + sym + ' ' + itv + ' (' + days + ' dagar). Köp & håll: ' + bh.toFixed(1) + '%', 'info');

        let bestId = null, bestNet = -Infinity;
        BASE_IDS.forEach(function (id) {
            const r = simulate(ctx.sigs[id], d, ctx.atr, BACKTEST_START, d.length, rm);
            stars[id] = starsFor(r, bh);
            if (r.trades >= 5 && r.net > bestNet) { bestNet = r.net; bestId = id; }
            addLog(STRATEGIES[id].name + ' ' + starText(stars[id]) + ' ' + r.net.toFixed(1) + '% / ' + r.trades + ' affärer / max nedgång ' + r.maxDD.toFixed(1) + '%', 'info');
        });

        // Walk-forward-test av AUTO: varje val görs bara med data som fanns före valet
        const s0 = BACKTEST_START + AUTO_WINDOW;
        if (d.length >= s0 + 200) {
            let active = null, lastPick = -1e9, switches = 0;
            const getAuto = function (i) {
                if (i - lastPick >= AUTO_REEVAL) {
                    const p = pickBest(ctx, d, i, AUTO_WINDOW, rm, active);
                    if (p.id !== active) switches++;
                    active = p.id; lastPick = i;
                }
                return active ? ctx.sigs[active] : null;
            };
            const ra = simulate(getAuto, d, ctx.atr, s0, d.length, rm);
            const bhA = ((d[d.length - 1].close / d[s0].close) * fee2 - 1) * 100;
            stars['auto'] = starsFor(ra, bhA);
            addLog('AUTO ' + starText(stars['auto']) + ' ' + ra.net.toFixed(1) + '% / ' + ra.trades + ' affärer / max nedgång ' + ra.maxDD.toFixed(1) + '% / ' + switches + ' byten (köp & håll samma period: ' + bhA.toFixed(1) + '%)', 'info');
            if (bestId) addLog('Jämförelse: bästa enskilda strategin var ' + STRATEGIES[bestId].name + ' (' + bestNet.toFixed(1) + '%). Den är vald i efterhand, AUTO är det inte.', 'info');
        } else {
            stars['auto'] = null;
            addLog('AUTO kunde inte testas: för lite historik. Välj 1 tim.', 'warn');
        }
        refreshOptionLabels();
        if (days < 60) addLog('Obs: bara ' + days + ' dagars historik, stjärnorna är osäkra. Välj 1 tim för längre period.', 'warn');
    } catch (e) {
        if (my === btToken) addLog('Backtest misslyckades: ' + e.message, 'danger');
    }
}

// ---------- Bot-logik ----------
function runBot() {
    if (!historyReady || candles.length < 25 || currentPrice <= 0) return;

    if (hasOpenPosition) {
        if ((currentBid > 0 ? currentBid : currentPrice) <= dynamicStopPrice) {
            closePosition(sellPx(), 'stop');
            return;
        }
        if ((currentBid > 0 ? currentBid : currentPrice) >= dynamicTakeProfitPrice) {
            closePosition(sellPx(), 'tp');
            return;
        }
    }

    const closed = candles.slice(0, -1);
    const lastClosed = closed[closed.length - 1];
    if (lastClosed.time === lastEvalTime) return;
    lastEvalTime = lastClosed.time;

    // Vilken strategi gäller just nu?
    let active;
    if (strategy.kind === 'auto') {
        if (hasOpenPosition) {
            active = STRATEGIES[posStrategyId];          // positionen stängs av strategin som öppnade den
        } else {
            autoRepick(closed, false);
            active = autoPick ? STRATEGIES[autoPick] : null;
        }
    } else {
        active = strategy;
    }
    if (!active) return; // AUTO står utanför marknaden (loggas när valet ändras)

    const res = active.compute(closed);
    const n = closed.length - 1;

    if (!hasOpenPosition && res.buy[n]) {
        posStrategyId = active.id;
        openPosition(buyPx());
    } else if (hasOpenPosition && res.sell[n]) {
        closePosition(sellPx(), 'signal');
    } else {
        addLog('Analyserar ' + selectedSymbol + ' (' + selectedInterval + ', ' + active.name + '): ' + res.text(n), 'info');
    }
}

// ---------- Sparning och 24/7-drift ----------
// Allt som behövs för att boten ska kunna fortsätta efter omladdning sparas i webbläsaren.
function numOr(v, def) { return (typeof v === 'number' && isFinite(v)) ? v : def; }

function readSavedState() {
    try {
        const s = JSON.parse(loadSetting('cryptoai_state') || 'null');
        return (s && s.v === 1) ? s : null;
    } catch (e) { return null; }
}
function hasSavedState() { return readSavedState() !== null; }

function saveBotState() {
    saveSetting('cryptoai_state', JSON.stringify({
        v: 1, running: isRunning, balance: balance, peakBalance: peakBalance, pnl: pnl,
        totalTrades: totalTrades, winningTrades: winningTrades,
        totalWinsAmount: totalWinsAmount, totalLossesAmount: totalLossesAmount,
        returnsHistory: returnsHistory.slice(-500), maxDrawdownVal: maxDrawdownVal,
        pos: hasOpenPosition ? {
            symbol: selectedSymbol, entryPrice: entryPrice, entryTime: entryTime,
            exposure: positionExposure, stop: dynamicStopPrice, tp: dynamicTakeProfitPrice, strat: posStrategyId
        } : null,
        markers: markers, markersSymbol: selectedSymbol
    }));
}

function restoreBotState() {
    const s = readSavedState();
    if (!s) return false;
    balance = numOr(s.balance, balance);
    peakBalance = numOr(s.peakBalance, balance);
    pnl = numOr(s.pnl, 0);
    totalTrades = numOr(s.totalTrades, 0);
    winningTrades = numOr(s.winningTrades, 0);
    totalWinsAmount = numOr(s.totalWinsAmount, 0);
    totalLossesAmount = numOr(s.totalLossesAmount, 0);
    maxDrawdownVal = numOr(s.maxDrawdownVal, 0);
    returnsHistory = Array.isArray(s.returnsHistory) ? s.returnsHistory.filter(function (x) { return typeof x === 'number' && isFinite(x); }) : [];
    const p = s.pos;
    if (p && typeof p.symbol === 'string' && [...cryptoSelect.options].some(function (o) { return o.value === p.symbol; })
        && isFinite(p.entryPrice) && isFinite(p.exposure) && isFinite(p.stop) && isFinite(p.tp)) {
        selectedSymbol = p.symbol;
        cryptoSelect.value = p.symbol;
        saveSetting('cryptoai_symbol', p.symbol);
        hasOpenPosition = true;
        entryPrice = p.entryPrice;
        entryTime = numOr(p.entryTime, 0);
        positionExposure = p.exposure;
        dynamicStopPrice = p.stop;
        dynamicTakeProfitPrice = p.tp;
        posStrategyId = (p.strat && STRATEGIES[p.strat]) ? p.strat : null;
    }
    if (Array.isArray(s.markers) && s.markersSymbol === selectedSymbol) markers = s.markers;
    return s.running === true;
}

// Timer som inte stryps lika hårt som setInterval när fliken ligger i bakgrunden (körs i en Web Worker).
function makeTicker(fn, ms) {
    let stopped = false, w = null, url = null, fid = null;
    function fallback() { if (!stopped && fid === null) fid = setInterval(fn, ms); }
    try {
        url = URL.createObjectURL(new Blob(['setInterval(function(){postMessage(0)},' + ms + ')'], { type: 'text/javascript' }));
        w = new Worker(url);
        w.onmessage = function () { fn(); };
        w.onerror = function () { if (w) { w.terminate(); w = null; } fallback(); };
    } catch (e) {
        fallback();
    }
    return {
        stop: function () {
            stopped = true;
            if (w) w.terminate();
            if (url) { try { URL.revokeObjectURL(url); } catch (e) {} }
            if (fid !== null) clearInterval(fid);
        }
    };
}

// Hindrar skärmen/datorn från att somna medan boten körs (så länge fliken syns)
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', function () { wakeLock = null; });
        }
    } catch (e) {}
}
function releaseWakeLock() {
    try { if (wakeLock) wakeLock.release(); } catch (e) {}
    wakeLock = null;
}

// Om sidan varit stängd eller i vila: kolla om stop, mål eller säljsignal inträffade medan vi var borta
function catchUp() {
    if (!hasOpenPosition || !entryTime) return;
    const closed = candles.slice(0, -1);
    const st = (posStrategyId && STRATEGIES[posStrategyId]) ? STRATEGIES[posStrategyId] : strategy;
    const sig = st.compute(closed);
    for (let j = 0; j < closed.length; j++) {
        const c = closed[j];
        if (c.time <= entryTime) continue;
        if (c.low <= dynamicStopPrice) {
            addLog('(Händelse medan sidan var stängd)', 'info');
            closePosition(Math.min(c.open, dynamicStopPrice), 'stop', c.time);
            return;
        }
        if (c.high >= dynamicTakeProfitPrice) {
            addLog('(Händelse medan sidan var stängd)', 'info');
            closePosition(Math.max(c.open, dynamicTakeProfitPrice), 'tp', c.time);
            return;
        }
        if (sig.sell[j]) {
            addLog('(Händelse medan sidan var stängd)', 'info');
            closePosition(c.close, 'signal', c.time);
            return;
        }
    }
}

function startBot(resumed) {
    isRunning = true;
    toggleBtn.className = "w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-4 rounded-lg text-xs transition flex items-center justify-center gap-2";
    toggleBtn.innerHTML = '<i class="fa-solid fa-stop"></i> Stoppa AI-Robot';
    botStatusBadge.className = "px-3 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-2";
    botStatusBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Bot Aktiv';
    addLog(resumed ? 'Robot återupptogs automatiskt efter omladdning.' : 'Robot startad.', 'success');
    if (candles.length > 1) lastEvalTime = candles[candles.length - 2].time;
    if (botTicker) botTicker.stop();
    botTicker = makeTicker(runBot, BOT_MS);
    requestWakeLock();
    saveBotState();
}

function stopBot() {
    isRunning = false;
    toggleBtn.className = "w-full bg-white hover:bg-gray-200 text-black font-semibold py-2.5 px-4 rounded-lg text-xs transition flex items-center justify-center gap-2";
    toggleBtn.innerHTML = '<i class="fa-solid fa-play"></i> Starta AI-Robot';
    botStatusBadge.className = "px-3 py-1 rounded-md text-xs font-semibold bg-gray-900 text-gray-400 border border-gray-800 flex items-center gap-2";
    botStatusBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-gray-600"></span> Bot Pausad';
    addLog("Robot pausad.", "warn");
    if (botTicker) botTicker.stop();
    botTicker = null;
    releaseWakeLock();
    saveBotState();
}

// ---------- Händelser ----------
function resetAuto() {
    autoPick = null;
    autoLastPick = 0;
    if (strategy.kind === 'auto') setView(NONE);
    updateAutoInfo();
}

cryptoSelect.addEventListener('change', function (e) {
    if (hasOpenPosition) closePosition(sellPx(), 'switch');
    selectedSymbol = e.target.value;
    saveSetting('cryptoai_symbol', selectedSymbol);
    markers = [];
    candleSeries.setMarkers([]);
    currentPrice = 0; currentBid = 0; currentAsk = 0;
    cryptoPriceEl.textContent = '$0.00';
    applyPrecision();
    resetAuto();
    addLog('Bytte till ' + selectedSymbol, 'info');
    loadHistory();
    runBacktests();
});

intervalSelect.addEventListener('change', function (e) {
    selectedInterval = e.target.value;
    saveSetting('cryptoai_interval', selectedInterval);
    resetAuto();
    addLog('Tidsintervall: ' + selectedInterval, 'info');
    loadHistory();
    runBacktests();
});

strategySelect.addEventListener('change', function (e) {
    if (!STRATEGIES[e.target.value]) return;
    strategy = STRATEGIES[e.target.value];
    saveSetting('cryptoai_strategy', e.target.value);
    if (strategy.kind === 'auto') {
        autoPick = null;
        autoLastPick = 0;
        setView(NONE);
        if (historyReady) autoRepick(candles.slice(0, -1), true);
    } else {
        setView(strategy);
    }
    updateAutoInfo();
    addLog('Strategi: ' + strategy.name, 'info');
});

riskRange.addEventListener('input', function (e) {
    riskValue.textContent = e.target.value + ' / 10';
    saveSetting('cryptoai_risk', e.target.value);
});
// Risken påverkar stop/take-profit, så stjärnorna räknas om när reglaget släpps
riskRange.addEventListener('change', function () {
    runBacktests();
});

toggleBtn.addEventListener('click', function () {
    if (isRunning) stopBot(); else startBot(false);
});

// När fliken blir synlig igen: hämta färsk data direkt och begär skärmlås på nytt
if (document.addEventListener) {
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') {
            if (isRunning) requestWakeLock();
            refreshMarket();
        }
    });
}

// ---------- Serverbot (körs 24/7 av GitHub Actions) ----------
// Panelerna läser serverbotarnas sparade läge från grenen "bot-state" i GitHub-repot.
// Byt SERVER_REPO om repot heter något annat. Repot måste vara publikt för att webbläsaren ska kunna läsa filerna.
const SERVER_REPO = 'XpawSir/crypto-ai-bot';
const SERVER_BASE = 'https://raw.githubusercontent.com/' + SERVER_REPO + '/bot-state/';
const BADGE_TONES = {
    ok: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warn: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    bad: 'bg-red-500/10 text-red-400 border-red-500/20',
    off: 'bg-gray-900 text-gray-400 border-gray-800'
};

function ago(iso) {
    const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (!isFinite(m)) return '?';
    if (m < 1) return 'nyss';
    if (m < 90) return m + ' min sedan';
    const h = Math.round(m / 60);
    return h < 48 ? h + ' tim sedan' : Math.round(h / 24) + ' dygn sedan';
}

const money = function (v, sign) {
    const t = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return sign ? (v >= 0 ? '+$' : '-$') + t : '$' + t;
};
const priceTxt = function (v) { return v === null || v === undefined ? 'ingen' : '$' + Number(v).toFixed(4).replace(/0+$/, '').replace(/\.$/, ''); };

function makeServerPanel(prefix, file, onState) {
    const el = {};
    ['badge', 'balance', 'pnl', 'trades', 'winrate', 'pos', 'note', 'log', 'chart', 'bh', 'markets'].forEach(function (k) {
        el[k] = document.getElementById(prefix + '-' + k);
    });
    if (!el.badge) return { load: function () {} };
    let chart = null, botLine = null, bhLine = null;

    function badge(text, tone) {
        el.badge.className = 'px-2.5 py-1 rounded-md text-[11px] font-semibold border ' + (BADGE_TONES[tone] || BADGE_TONES.off);
        el.badge.textContent = text;
        overview.status(prefix, text, tone);
    }

    function drawChart(points) {
        if (!el.chart || typeof LightweightCharts === 'undefined' || !points || points.length < 2) return;
        if (!chart) {
            chart = LightweightCharts.createChart(el.chart, {
                autoSize: true,
                layout: { background: { type: LightweightCharts.ColorType.Solid, color: 'transparent' }, textColor: '#8b93a7' },
                grid: { vertLines: { visible: false }, horzLines: { color: 'rgba(255,255,255,0.05)' } },
                rightPriceScale: { borderVisible: false }, timeScale: { borderVisible: false, timeVisible: true },
                handleScroll: false, handleScale: false, crosshair: { mode: 0 }
            });
            serverCharts.push(chart);
            chart.applyOptions({ layout: { textColor: themeColors().text }, grid: { horzLines: { color: themeColors().grid } } });
            botLine = chart.addLineSeries({ color: '#34d399', lineWidth: 2, priceLineVisible: false, title: 'Boten' });
            bhLine = chart.addLineSeries({ color: '#94a3b8', lineWidth: 1, lineStyle: 2, priceLineVisible: false, title: 'Buy & hold' });
        }
        const a = [], b = []; let last = 0;
        points.forEach(function (p) {
            const t = Math.floor(p[0] / 1000);
            if (t <= last) return;
            last = t; a.push({ time: t, value: p[1] }); b.push({ time: t, value: p[2] });
        });
        botLine.setData(a); bhLine.setData(b);
        chart.timeScale().fitContent();
    }

    async function load() {
        try {
            const res = await fetch(SERVER_BASE + file + '?t=' + Date.now(), { cache: 'no-store' });
            if (res.status === 404) {
                badge('Ingen data än', 'off');
                el.note.textContent = 'Boten har inte kört än. Starta workflow "Crypto bot" i GitHub (fliken Actions). Är repot privat kan sidan inte läsa filen.';
                return;
            }
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const st = await res.json();
            if (onState) { try { onState(st); } catch (e) { console.warn('Panel ' + prefix + ':', e); } }
            try { overview.update(prefix, st); } catch (e) { console.warn('Översikt:', e); }
            const minutes = (Date.now() - new Date(st.lastRun).getTime()) / 60000;
            if (st.lastError) badge('Fel vid senaste körning', 'bad');
            else if (st.enabled === false) badge('Avstängd i config', 'off');
            else if (minutes > 45) badge('Inte körts på ' + Math.round(minutes) + ' min', 'warn');
            else badge('Aktiv', 'ok');

            el.balance.textContent = money(st.balance);
            el.pnl.textContent = money(st.pnl, true);
            el.pnl.className = 'stat-val ' + (st.pnl >= 0 ? 'text-emerald-400' : 'text-red-400');
            el.trades.textContent = String(st.totalTrades);
            el.winrate.textContent = st.totalTrades > 0 ? Math.round(100 * st.winningTrades / st.totalTrades) + '%' : '-';

            // Jämförelse mot att bara köpa och behålla sedan start
            if (el.bh) {
                if (typeof st.buyHoldValue === 'number') {
                    const botNow = st.equity && st.equity.length ? st.equity[st.equity.length - 1][1] : st.balance;
                    const diff = botNow - st.buyHoldValue;
                    el.bh.textContent = (st.buyHoldLabel || 'Buy & hold') + ' sedan start: ' + money(st.buyHoldValue) + ' · boten ' + (diff >= 0 ? 'ligger ' + money(diff) + ' före' : 'ligger ' + money(-diff) + ' efter');
                    el.bh.className = 'text-[11px] font-mono ' + (diff >= 0 ? 'text-emerald-400' : 'text-gray-400');
                } else el.bh.textContent = '';
            }
            drawChart(st.equity);

            // Läget per valuta
            if (el.markets) {
                el.markets.textContent = '';
                (st.marketsView || []).forEach(function (m) {
                    const row = document.createElement('div');
                    row.className = 'tile px-3 py-2 flex items-center justify-between gap-3 text-[11px] font-mono';
                    const l = document.createElement('span'); l.className = 'text-white font-semibold'; l.textContent = m.symbol.replace('USDT', '');
                    const p = document.createElement('span'); p.className = 'text-gray-300'; p.textContent = m.price ? priceTxt(m.price) + (typeof m.spreadPct === 'number' ? ' · spread ' + m.spreadPct.toFixed(3) + '%' : '') : '-';
                    const sName = m.strat && STRATEGIES[m.strat] ? STRATEGIES[m.strat].name : '';
                    const r = document.createElement('span');
                    r.className = m.inPosition ? 'text-emerald-400' : 'text-gray-500';
                    r.textContent = typeof m.target === 'number' ? 'mål ' + Math.round(100 * m.target) + ' %' + (m.why ? ' · ' + m.why : '') : (m.inPosition ? 'i marknaden' + (sName ? ' · ' + sName : '') : (sName ? 'väntar · ' + sName : 'väntar'));
                    if (typeof m.target === 'number') r.className = m.target > 0 ? 'text-emerald-400' : 'text-gray-500';
                    row.appendChild(l); row.appendChild(p); row.appendChild(r);
                    el.markets.appendChild(row);
                });
            }

            const list = Array.isArray(st.openPositions) ? st.openPositions : [];
            if (list.length) {
                el.pos.style.whiteSpace = 'pre-line';
                el.pos.textContent = 'Öppna positioner (' + list.length + '):\n' + list.map(function (p) {
                    const u = (typeof p.unrealized === 'number') ? ' | orealiserat ' + money(p.unrealized, true) : '';
                    return p.symbol + ' köpt @ ' + priceTxt(p.entryPrice) + ((p.stop === null || p.stop === undefined) && (p.tp === null || p.tp === undefined) ? '' : ' | stop ' + priceTxt(p.stop) + ' | mål ' + priceTxt(p.tp)) + u;
                }).join('\n');
            } else {
                el.pos.textContent = 'Ingen öppen position. Boten väntar på nästa signal.';
            }
            const c = st.config || {};
            const syms = Array.isArray(c.symbols) ? c.symbols.join(', ') : (Array.isArray(c.universe) ? c.universe.length + ' valutor' : (c.symbol || ''));
            const stratTxt = c.strategy ? c.strategy + (c.noStops ? ' (ingen stop)' : '') : (c.lookback ? 'momentum ' + c.lookback + 'd, topp ' + c.top + ', ombalans var ' + c.rebalDays + ':e dag' : '');
            el.note.textContent = 'Senaste körning ' + ago(st.lastRun) + ' | ' + syms + ' | ' + (c.interval || '') + ' | ' + stratTxt + ' | simulerad handel';

            el.log.textContent = '';
            (st.log || []).slice(-8).reverse().forEach(function (l) {
                const d = document.createElement('div');
                d.className = l.k === 'success' ? 'text-emerald-400' : (l.k === 'danger' ? 'text-red-400' : 'text-gray-300');
                const t = document.createElement('span');
                t.className = 'text-gray-500';
                t.textContent = '[' + new Date(l.t).toLocaleString('sv-SE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + '] ';
                d.appendChild(t);
                d.appendChild(document.createTextNode(l.m));
                el.log.appendChild(d);
            });
        } catch (e) {
            badge('Kunde inte hämta', 'bad');
            el.note.textContent = 'Kunde inte läsa statusen (' + e.message + ').';
        }
    }
    return { load: load };
}

// ---------- Trend-ensemble-sidan (#trend) ----------
// Prisgraf med de fem medelvärdena och köp/sälj-pilar, signalmätare och en simulering bakåt. Data kommer från ensemble.json.
const trendView = (function () {
    const MA_COLORS = ['#facc15', '#fb923c', '#f472b6', '#a78bfa', '#38bdf8'];
    let priceChart = null, candleS = null, maS = [], histChart = null, histBot = null, histBh = null;
    const pct = function (v) { return (v >= 0 ? '+' : '') + (100 * v).toFixed(0) + ' %'; };

    function baseOpts(extra) {
        const c = themeColors();
        return Object.assign({
            autoSize: true,
            layout: { background: { type: LightweightCharts.ColorType.Solid, color: 'transparent' }, textColor: c.text },
            grid: { vertLines: { visible: false }, horzLines: { color: c.grid } },
            rightPriceScale: { borderVisible: false }, timeScale: { borderVisible: false }
        }, extra || {});
    }

    function render(st) {
        if (typeof LightweightCharts === 'undefined') return;
        const w = typeof st.weight === 'number' ? st.weight : 0;
        const wait = document.getElementById('tr-live-wait');
        if (wait) wait.style.display = (st.equity && st.equity.length >= 2) ? 'none' : '';
        const wEl = document.getElementById('tr-weight');
        if (wEl) { wEl.textContent = Math.round(100 * w) + ' %'; wEl.className = 'stat-val ' + (w > 0 ? 'text-emerald-400' : 'text-white'); }

        // Signalmätaren: en ruta per medelvärde
        const meter = document.getElementById('tr-meter');
        if (meter && Array.isArray(st.signal)) {
            meter.textContent = '';
            st.signal.forEach(function (s) {
                const d = document.createElement('div'); d.className = 'tr-ma' + (s.above ? ' on' : '');
                const b = document.createElement('b'); b.textContent = s.len + 'd';
                const sp = document.createElement('span'); sp.textContent = (s.above ? 'över · ' : 'under · ') + '$' + Math.round(s.sma).toLocaleString('en-US');
                d.appendChild(b); d.appendChild(sp); meter.appendChild(d);
            });
            const above = st.signal.filter(function (s) { return s.above; }).length;
            const tgt = typeof st.target === 'number' ? st.target : 0;
            document.getElementById('tr-target').textContent = Math.round(100 * tgt) + ' % i BTC';
            document.getElementById('tr-bar').style.width = Math.round(100 * tgt) + '%';
            document.getElementById('tr-explain').textContent = 'Stängningskursen $' + Math.round(st.signalClose || 0).toLocaleString('en-US') + ' ligger över ' + above + ' av ' + st.signal.length + ' medelvärden, alltså ' + above + '/' + st.signal.length + ' = ' + Math.round(100 * above / st.signal.length) + ' %, avrundat till ' + Math.round(100 * tgt) + ' %. Nästa beslut tas när dagens candle stänger (02:00 svensk tid).';
        }

        // Prisgraf: dagscandles + medelvärden + pilar för regelns affärer (simulering och live)
        const box = document.getElementById('tr-price');
        if (box && st.chart && Array.isArray(st.chart.candles)) {
            if (!priceChart) {
                priceChart = LightweightCharts.createChart(box, baseOpts({ timeScale: { borderVisible: false, timeVisible: false } }));
                serverCharts.push(priceChart);
                candleS = priceChart.addCandlestickSeries({ upColor: '#0ecb81', downColor: '#f6465d', borderVisible: false, wickUpColor: '#0ecb81', wickDownColor: '#f6465d', priceFormat: { type: 'price', precision: 0, minMove: 1 } });
                maS = MA_COLORS.map(function (col) { return priceChart.addLineSeries({ color: col, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, priceFormat: { type: 'price', precision: 0, minMove: 1 } }); });
            }
            candleS.setData(st.chart.candles.map(function (k) { return { time: k[0], open: k[1], high: k[2], low: k[3], close: k[4] }; }));
            (st.chart.smas || []).forEach(function (m, i) { if (maS[i]) maS[i].setData(m.data.map(function (p) { return { time: p[0], value: p[1] }; })); });
            const first = st.chart.candles.length ? st.chart.candles[0][0] : 0, marks = {};
            ((st.history && st.history.trades) || []).forEach(function (t) { if (t.t >= first) marks[t.t] = t; });
            (st.trades || []).forEach(function (t) { const day = Math.floor(new Date(t.t).getTime() / 86400000) * 86400; marks[day] = { t: day, side: t.side, weight: t.weight }; });
            candleS.setMarkers(Object.keys(marks).map(Number).sort(function (a, b) { return a - b; }).map(function (k) {
                const t = marks[k], buy = t.side === 'buy';
                return { time: k, position: buy ? 'belowBar' : 'aboveBar', color: buy ? '#34d399' : '#f87171', shape: buy ? 'arrowUp' : 'arrowDown', size: 0.6 };
            }));
            if (!priceChart._fitted) { priceChart.timeScale().fitContent(); priceChart._fitted = true; }
        }

        // Simulering bakåt
        const hb = document.getElementById('tr-hist');
        if (hb && st.history && Array.isArray(st.history.equity) && st.history.equity.length > 1) {
            if (!histChart) {
                histChart = LightweightCharts.createChart(hb, baseOpts({ handleScroll: false, handleScale: false, crosshair: { mode: 0 } }));
                serverCharts.push(histChart);
                histBot = histChart.addLineSeries({ color: '#34d399', lineWidth: 2, priceLineVisible: false, title: 'Regeln', priceFormat: { type: 'price', precision: 0, minMove: 1 } });
                histBh = histChart.addLineSeries({ color: '#94a3b8', lineWidth: 1, lineStyle: 2, priceLineVisible: false, title: 'Buy & hold', priceFormat: { type: 'price', precision: 0, minMove: 1 } });
            }
            histBot.setData(st.history.equity.map(function (p) { return { time: p[0], value: p[1] }; }));
            histBh.setData(st.history.equity.map(function (p) { return { time: p[0], value: p[2] }; }));
            histChart.timeScale().fitContent();
            const h = st.history;
            document.getElementById('tr-hist-txt').textContent = 'Från ' + new Date(h.from * 1000).toLocaleDateString('sv-SE') + ': regeln ' + pct(h.total) + ' (värsta ras ' + pct(h.maxDD) + ') · buy & hold ' + pct(h.bhTotal) + ' (värsta ras ' + pct(h.bhMaxDD) + ') · ' + h.trades.length + ' justeringar';
        }
    }
    // Statistik och månadstabell (från simuleringen; live-siffror när boten gjort affärer)
    function renderStats(st) {
        const box = document.getElementById('tr-stats'), tbl = document.getElementById('tr-months');
        const h = st.history; if (!box || !h || !h.stats) return;
        const S = h.stats, months = S.months || [];
        const done = months.filter(function (m) { return !m.partial; });
        const best = done.reduce(function (a, m) { return !a || m.bot > a.bot ? m : a; }, null);
        const worst = done.reduce(function (a, m) { return !a || m.bot < a.bot ? m : a; }, null);
        const mName = function (m) { return m ? new Date(m.m + '-15').toLocaleDateString('sv-SE', { month: 'short', year: 'numeric' }) : '-'; };
        const p1 = function (v) { return (v >= 0 ? '+' : '') + (100 * v).toFixed(1) + ' %'; };
        const beat = done.filter(function (m) { return m.bot > m.bh; }).length;
        const items = [
            ['Dagar i BTC', Math.round(100 * S.daysIn / Math.max(1, S.days)) + ' %', S.daysIn + ' av ' + S.days + ' dagar'],
            ['Snittandel i BTC', Math.round(100 * S.avgWeight) + ' %', 'resten kontanter'],
            ['Justeringar per år', String(Math.round(S.tradesPerYear)), 'köp eller sälj'],
            ['Längsta tid utan BTC', S.longestOut + ' dagar', 'i följd'],
            ['Bästa månad', best ? p1(best.bot) : '-', mName(best) + (best ? ' · B&H ' + p1(best.bh) : '')],
            ['Sämsta månad', worst ? p1(worst.bot) : '-', mName(worst) + (worst ? ' · B&H ' + p1(worst.bh) : '')]
        ];
        // Live: dagar sedan start och realiserat resultat
        const liveDays = st.startedAt ? Math.max(0, Math.floor((Date.now() - new Date(st.startedAt).getTime()) / 86400000)) : 0;
        document.getElementById('tr-stat-src').textContent = 'Simulering ' + new Date(h.from * 1000).toLocaleDateString('sv-SE') + ' – idag · ' + beat + ' av ' + done.length + ' månader bättre än buy & hold · live i ' + liveDays + ' dagar, ' + (st.trades || []).length + ' affärer';
        box.textContent = '';
        items.forEach(function (it) {
            const d = document.createElement('div'); d.className = 'tr-stat';
            const a = document.createElement('span'); a.textContent = it[0];
            const b = document.createElement('b'); b.textContent = it[1];
            if (/^[+-]/.test(it[1])) b.className = it[1][0] === '+' ? 'up' : 'down';
            const c = document.createElement('i'); c.textContent = it[2];
            d.appendChild(a); d.appendChild(b); d.appendChild(c); box.appendChild(d);
        });
        // Månadstabell: år som rader, månader som kolumner, sist hela året
        if (tbl) {
            const byYear = {};
            months.forEach(function (m) { const y = m.m.slice(0, 4); (byYear[y] = byYear[y] || {})[+m.m.slice(5) - 1] = m; });
            const MN = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
            let html = '<thead><tr><th></th>' + MN.map(function (x) { return '<th>' + x + '</th>'; }).join('') + '<th>år</th></tr></thead><tbody>';
            Object.keys(byYear).sort().forEach(function (y) {
                let yb = 1, yh = 1; html += '<tr><td class="y">' + y + '</td>';
                for (let k = 0; k < 12; k++) {
                    const m = byYear[y][k];
                    if (!m) { html += '<td></td>'; continue; }
                    yb *= 1 + m.bot; yh *= 1 + m.bh;
                    const a = Math.min(1, Math.abs(m.bot) / 0.25) * 0.35;
                    const bg = m.bot >= 0 ? 'rgba(52,211,153,' + a.toFixed(2) + ')' : 'rgba(248,113,113,' + a.toFixed(2) + ')';
                    html += '<td style="background:' + bg + '" title="' + MN[k] + ' ' + y + (m.partial ? ' (pågår)' : '') + ': regeln ' + p1(m.bot) + ', buy & hold ' + p1(m.bh) + '">' + p1(m.bot).replace(' %', '') + '<small>' + p1(m.bh).replace(' %', '') + '</small></td>';
                }
                html += '<td class="y">' + p1(yb - 1).replace(' %', '') + '<small>' + p1(yh - 1).replace(' %', '') + '</small></td></tr>';
            });
            tbl.innerHTML = html + '</tbody>';
        }
    }
    return { render: function (st) { render(st); renderStats(st); } };
})();

// ---------- Startsidan: kort per bot och topplista ----------
const overview = (function () {
    const BOTS = {
        srv: { name: 'Trend BTC + ETH', color: '#60a5fa', href: '#btceth' },
        srv2: { name: 'Volatilitetsstyrd trend', color: '#fbbf24', href: '#voltrend' },
        srv3: { name: 'Rotationsbot', color: '#c084fc', href: '#botrot' },
        srv4: { name: 'Trend-ensemble', color: '#34d399', href: '#trend' }
    };
    const START = 10000, states = {};
    let lbChart = null, lbSeries = {}, timer = null;
    const card = function (p) { return document.querySelector('.ov-card[data-bot="' + p + '"]'); };
    const part = function (p, k) { const c = card(p); return c ? c.querySelector('[data-k="' + k + '"]') : null; };
    const pctTxt = function (v) { return (v >= 0 ? '+' : '') + v.toFixed(2) + ' %'; };

    function lastBot(st) { return st.equity && st.equity.length ? st.equity[st.equity.length - 1][1] : st.balance; }
    function maxDD(st) {
        let pk = 0, dd = 0;
        (st.equity || []).forEach(function (q) { pk = Math.max(pk, q[1]); if (pk) dd = Math.min(dd, q[1] / pk - 1); });
        return dd;
    }

    // Liten kurva i SVG (boten heldragen, buy & hold streckad)
    function spark(el, eq, color) {
        el.textContent = '';
        if (!eq || eq.length < 2) { el.innerHTML = '<span style="font-size:11px;color:var(--muted)">Kurvan fylls på när boten kört en stund</span>'; return; }
        const W = 200, H = 56, xs = eq.map(function (q) { return q[0]; }), vals = [];
        eq.forEach(function (q) { vals.push(q[1], q[2]); });
        const x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
        const X = function (t) { return x1 > x0 ? (t - x0) / (x1 - x0) * W : 0; }, Y = function (v) { return hi > lo ? H - 3 - (v - lo) / (hi - lo) * (H - 6) : H / 2; };
        const line = function (i) { return eq.map(function (q) { return X(q[0]).toFixed(1) + ',' + Y(q[i]).toFixed(1); }).join(' '); };
        el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' +
            '<polyline points="' + line(2) + '" fill="none" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/>' +
            '<polyline points="' + line(1) + '" fill="none" stroke="' + color + '" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>';
    }

    function status(p, text, tone) {
        const b = part(p, 'badge'); if (!b) return;
        b.textContent = text; b.className = 'ov-badge ' + (tone || '');
        if (tone === 'bad' || text === 'Ingen data än') { states[p] = states[p] || null; schedule(); }
    }

    function update(p, st) {
        states[p] = st;
        const meta = BOTS[p], now = lastBot(st);
        const bal = part(p, 'balance'); if (bal) bal.textContent = money(st.balance);
        const pnl = part(p, 'pnl');
        if (pnl) { const r = (now / START - 1) * 100; pnl.textContent = pctTxt(r) + ' sedan start'; pnl.className = r >= 0 ? 'up' : 'down'; }
        const vs = part(p, 'vs');
        if (vs) {
            if (typeof st.buyHoldValue === 'number' && st.buyHoldValue > 0) { const d = (now / st.buyHoldValue - 1) * 100; vs.textContent = pctTxt(d) + ' mot B&H'; vs.className = d >= 0 ? 'up' : ''; }
            else vs.textContent = '';
        }
        const sp = part(p, 'spark'); if (sp) spark(sp, st.equity, meta.color);
        schedule();
    }

    function schedule() { clearTimeout(timer); timer = setTimeout(board, 150); }

    // Affärer = köp och sälj. totalTrades räknar bara avslutade (sålda) affärer, så en bot som köpt men inte sålt visade 0.
    function tradeText(st) {
        const t = Array.isArray(st.trades) ? st.trades : [];
        const buys = t.filter(function (x) { return x && x.side === 'buy'; }).length;
        const sells = t.filter(function (x) { return x && x.side === 'sell'; }).length;
        if (buys + sells === 0) return String(st.totalTrades || 0);
        return buys + ' köp · ' + sells + ' sålda';
    }

    // ---------- Dagens sammanfattning ----------
    const DAY = 86400000;
    function valueAt(st, t) { // botens värde vid tidpunkten t (före start: startkapital)
        const eq = st.equity || []; let v = START;
        for (let i = 0; i < eq.length; i++) { if (eq[i][0] <= t) v = eq[i][1]; else break; }
        return v;
    }
    function ago(ms) { const m = Math.round(ms / 60000); return m < 1 ? 'nyss' : m < 90 ? m + ' min sedan' : Math.round(m / 60) + ' tim sedan'; }
    function mk(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
    function sym(s) { return String(s || '').replace(/USDT$/, ''); }

    function briefing() {
        const root = document.getElementById('brief'); if (!root) return;
        const keys = Object.keys(BOTS).filter(function (p) { return states[p]; });
        if (!keys.length) return;
        const now = Date.now(), h = new Date().getHours();
        document.getElementById('br-kicker').textContent = (h < 5 ? 'God natt' : h < 10 ? 'God morgon' : h < 18 ? 'Hej' : 'God kväll') + ' · dagens sammanfattning';

        // totalt läge
        let total = 0, total24 = 0, bh = 0, bhN = 0, latest = 0, latestRun = 0;
        const rows = keys.map(function (p) {
            const st = states[p], v = lastBot(st), v24 = valueAt(st, now - DAY);
            total += v; total24 += v24;
            if (typeof st.buyHoldValue === 'number' && st.buyHoldValue > 0) { bh += st.buyHoldValue; bhN++; }
            const lr = st.lastRun ? Date.parse(st.lastRun) : 0; if (lr) latestRun = Math.max(latestRun, lr);
            const pos = st.openPositions || [], inv = pos.reduce(function (a, q) { return a + (q.exposure || 0); }, 0);
            return { p: p, st: st, v: v, d24: v24 ? v / v24 - 1 : 0, inv: st.balance ? inv / st.balance : 0, n: pos.length };
        });
        const base = START * keys.length, ret = total / base - 1, d24 = total24 ? total / total24 - 1 : 0;
        const best = rows.slice().sort(function (a, b) { return b.d24 - a.d24; });
        const bhRet = bhN === keys.length ? bh / base - 1 : null;

        const tt = document.getElementById('br-title');
        tt.textContent = (d24 >= 0 ? 'Plus ' : 'Minus ') + Math.abs(d24 * 100).toFixed(2) + ' % senaste dygnet';
        tt.className = 'br-title ' + (d24 >= 0 ? 'up' : 'down');

        const sum = document.getElementById('br-sum'); sum.textContent = '';
        const parts = [];
        parts.push(['Alla ' + keys.length + ' botar tillsammans: ', money(total) + ' (' + pctTxt(ret * 100) + ' sedan start). ']);
        if (bhRet !== null) { const diff = (ret - bhRet) * 100; parts.push([diff >= 0 ? 'Det är ' : 'Det är ', Math.abs(diff).toFixed(2) + ' procentenheter ' + (diff >= 0 ? 'före' : 'efter') + ' att bara ha hållit Bitcoin. ']); }
        const moved = rows.reduce(function (a, r) { return a + (r.st.trades || []).filter(function (t) { return Date.parse(t.t) > now - DAY; }).length; }, 0);
        parts.push([moved ? moved + (moved === 1 ? ' affär' : ' affärer') + ' gjordes senaste dygnet. ' : 'Inga affärer senaste dygnet: botarna väntar på sina signaler. ', '']);
        parts.push(['Bäst senaste dygnet: ', BOTS[best[0].p].name + ' (' + pctTxt(best[0].d24 * 100) + '), svagast: ' + BOTS[best[best.length - 1].p].name + ' (' + pctTxt(best[best.length - 1].d24 * 100) + ').']);
        parts.forEach(function (x) { if (x[1]) { const b = document.createElement('b'); b.textContent = x[1]; sum.append(x[0], b); } else sum.append(x[0]); });

        // hälsokontroll: botarna ska köra var 10:e minut
        const fr = document.getElementById('br-fresh');
        if (latestRun) { const age = now - latestRun; fr.textContent = 'senast kört ' + ago(age); fr.className = 'br-fresh' + (age > 90 * 60000 ? ' bad' : age > 30 * 60000 ? ' warn' : ''); }

        // bot för bot
        const bots = document.getElementById('br-bots'); bots.textContent = '';
        rows.forEach(function (r) {
            const a = mk('a', 'tile br-bot'); a.href = BOTS[r.p].href;
            const dot = mk('span', 'dot'); dot.style.background = BOTS[r.p].color;
            const mid = mk('span', 'min-w-0'); mid.append(mk('div', 'nm', BOTS[r.p].name), mk('div', 'sub', r.n ? Math.round(r.inv * 100) + ' % investerat · ' + r.n + (r.n === 1 ? ' innehav' : ' innehav') : 'Kontanter'));
            const c = mk('span', 'chg ' + (r.d24 >= 0 ? 'up' : 'down'), pctTxt(r.d24 * 100)); c.append(mk('div', 'sub', 'senaste dygnet'));
            a.append(dot, mid, c); bots.appendChild(a);
        });

        // händelser senaste dygnet
        const ev = document.getElementById('br-events'); ev.textContent = '';
        const items = [];
        rows.forEach(function (r) {
            (r.st.trades || []).forEach(function (t) { const ts = Date.parse(t.t); if (ts > now - DAY) items.push({ ts: ts, text: (t.side === 'buy' ? 'Köpte ' : 'Sålde ') + sym(t.symbol) + (t.price ? ' @ ' + Number(t.price).toLocaleString('en-US', { maximumFractionDigits: 4 }) : '') + ' · ' + BOTS[r.p].name }); });
        });
        items.sort(function (a, b) { return b.ts - a.ts; });
        if (!items.length) {
            ev.appendChild(mk('li', '', 'Inga köp eller sälj. Trendbotar handlar sällan, och de behåller sina innehav så länge trenden håller.'));
            const dec = rows.map(function (r) { const l = (r.st.log || []).slice().reverse().find(function (x) { return /Dagens beslut/.test(x.m); }); return l ? BOTS[r.p].name + ': ' + l.m.replace(/^Dagens beslut:\s*/, '') : null; }).filter(Boolean);
            dec.slice(0, 4).forEach(function (d) { ev.appendChild(mk('li', '', d)); });
        } else items.slice(0, 8).forEach(function (i) { ev.appendChild(mk('li', '', new Date(i.ts).toLocaleString('sv-SE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' · ' + i.text)); });

        // sju dagar: totalvärde vid dygnets slut (lokal tid)
        const dayBox = document.getElementById('br-days'); dayBox.textContent = '';
        const end = new Date(); end.setHours(23, 59, 59, 999);
        for (let i = 6; i >= 0; i--) {
            const e = end.getTime() - i * DAY, e0 = e - DAY, cut = Math.min(e, now);
            let a = 0, b = 0; keys.forEach(function (p) { a += valueAt(states[p], e0); b += valueAt(states[p], cut); });
            const ch = a ? b / a - 1 : 0, started = keys.some(function (p) { const sa = states[p].startedAt ? Date.parse(states[p].startedAt) : 0; return sa && sa <= e; });
            const box = mk('div', 'br-day'); box.append(mk('div', 'd', new Date(e - 1000).toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric' })), started ? mk('div', 'v ' + (ch >= 0 ? 'up' : 'down'), pctTxt(ch * 100)) : mk('div', 'v', '–'));
            dayBox.appendChild(box);
        }
    }

    function board() {
        briefing();
        const list = Object.keys(BOTS).filter(function (p) { return states[p]; }).map(function (p) {
            const st = states[p], now = lastBot(st);
            return {
                p: p, st: st, ret: now / START - 1, vs: typeof st.buyHoldValue === 'number' && st.buyHoldValue > 0 ? now / st.buyHoldValue - 1 : null,
                dd: maxDD(st), started: st.startedAt ? new Date(st.startedAt) : null
            };
        }).sort(function (a, b) { return b.ret - a.ret; });

        const body = document.getElementById('lb-body');
        if (body) {
            body.textContent = '';
            if (!list.length) { body.innerHTML = '<tr><td colspan="8" class="muted">Ingen bot har data än.</td></tr>'; }
            list.forEach(function (r, i) {
                const tr = document.createElement('tr');
                const cells = [
                    [String(i + 1), 'muted'],
                    ['<a href="' + BOTS[r.p].href + '" class="hover:underline"><span class="lb-dot" style="background:' + BOTS[r.p].color + '"></span>' + BOTS[r.p].name + '</a>', '', true],
                    [money(r.st.balance), ''],
                    [pctTxt(r.ret * 100), r.ret >= 0 ? 'up' : 'down'],
                    [r.vs === null ? '-' : pctTxt(r.vs * 100), r.vs === null ? 'muted' : (r.vs >= 0 ? 'up' : 'down')],
                    [(r.dd * 100).toFixed(2) + ' %', 'muted'],
                    [tradeText(r.st), ''],
                    [r.started ? r.started.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' }) : '-', 'muted']
                ];
                cells.forEach(function (c) { const td = document.createElement('td'); if (c[2]) td.innerHTML = c[0]; else td.textContent = c[0]; if (c[1]) td.className = c[1]; tr.appendChild(td); });
                body.appendChild(tr);
            });
        }

        // Gemensam graf i procent sedan respektive start, plus buy & hold BTC från den äldsta BTC-boten
        const box = document.getElementById('lb-chart');
        if (!box || typeof LightweightCharts === 'undefined') return;
        if (!lbChart) {
            lbChart = LightweightCharts.createChart(box, {
                autoSize: true,
                layout: { background: { type: LightweightCharts.ColorType.Solid, color: 'transparent' }, textColor: themeColors().text },
                grid: { vertLines: { visible: false }, horzLines: { color: themeColors().grid } },
                rightPriceScale: { borderVisible: false }, timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
                localization: { priceFormatter: function (v) { return (v >= 0 ? '+' : '') + v.toFixed(1) + ' %'; } }
            });
            serverCharts.push(lbChart);
        }
        const toPts = function (eq, i) {
            const out = []; let last = 0;
            (eq || []).forEach(function (q) { const t = Math.floor(q[0] / 1000); if (t <= last) return; last = t; out.push({ time: t, value: (q[i] / START - 1) * 100 }); });
            return out;
        };
        const legend = [];
        Object.keys(BOTS).forEach(function (p) {
            const st = states[p]; if (!st) return;
            if (!lbSeries[p]) lbSeries[p] = lbChart.addLineSeries({ color: BOTS[p].color, lineWidth: 2, priceLineVisible: false, lastValueVisible: true, title: '' });
            lbSeries[p].setData(toPts(st.equity, 1));
            legend.push('<span><i style="background:' + BOTS[p].color + '"></i>' + BOTS[p].name + '</span>');
        });
        const btcRef = Object.keys(BOTS).map(function (p) { return states[p]; })
            .filter(function (st) { return st && st.buyHoldLabel === 'Buy & hold BTC' && st.equity && st.equity.length > 1; })
            .sort(function (a, b) { return a.equity[0][0] - b.equity[0][0]; })[0];
        if (btcRef) {
            if (!lbSeries.bh) lbSeries.bh = lbChart.addLineSeries({ color: '#94a3b8', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: true });
            lbSeries.bh.setData(toPts(btcRef.equity, 2));
            legend.push('<span><i style="background:#94a3b8"></i>Buy &amp; hold BTC</span>');
        }
        const lg = document.getElementById('lb-legend'); if (lg) lg.innerHTML = legend.join('');
        lbChart.timeScale().fitContent();
    }
    return { update: update, status: status };
})();

const serverPanels = [makeServerPanel('srv', 'btceth.json'), makeServerPanel('srv2', 'voltrend.json'), makeServerPanel('srv3', 'rotation.json'), makeServerPanel('srv4', 'ensemble.json', trendView.render)];
function loadServerBot() { serverPanels.forEach(function (p) { p.load(); }); }

// ---------- Logga ut ----------
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
        if (isRunning) stopBot(); // spara läget som pausat
        const go = function () { window.location.href = 'login.html'; };
        signOut(auth).then(go, go);
    });
}

// ---------- Start (körs när inloggningen är bekräftad) ----------
let appStarted = false;
function initApp() {
    if (appStarted) return;
    appStarted = true;
    applyPrecision();
    updateLegend();
    updateAutoInfo();
    updateStats();
    loadHistory();
    runBacktests();
    makeTicker(refreshMarket, REFRESH_MS);
    loadServerBot();
    setInterval(loadServerBot, 60000);
    if (wasRunning) startBot(true);
}
