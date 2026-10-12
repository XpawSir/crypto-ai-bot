// ============================================================
//   CryptoAI Pro Terminal – script.js (v2.2: med Firebase & Moln-synk)
// ============================================================

// ---------- Firebase & Inloggningsskydd ----------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "DIN_API_KEY",
    authDomain: "ditt-projekt.firebaseapp.com",
    projectId: "ditt-projekt",
    storageBucket: "ditt-projekt.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123:web:abc"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Skydda sidan: Skicka direkt till login.html om ingen är inloggad
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
    } else {
        console.log("Inloggad som:", user.email);
        loadCloudState(); // Ladda sparad data när inloggningen är klar
    }
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
const HISTORY_LIMIT = 1000;     // candles som hämtas till grafen
const MAX_CANDLES = 1300;
const REFRESH_MS = 3000;
const BOT_MS = 4000;
const BACKTEST_CANDLES = 4000;  
const BACKTEST_START = 200;     
const FEE = 0.001;              // 0,1 % per köp/sälj
const AUTO_WINDOW = 600;        
const AUTO_REEVAL = 10;         
const AUTO_SWITCH_MARGIN = 2;   
const COLORS = { up: '#0ecb81', down: '#f6465d' };
const decimalsBySymbol = { BTCUSDT: 2, ETHUSDT: 2, SOLUSDT: 2, XRPUSDT: 4 };
const MODE_TEXT = { trend: 'trendande marknad', revert: 'sidledes marknad', any: 'osäkert läge' };

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
    'donchian': donchianStrategy('Donchian 20/10 (breakout)', 20, 10
