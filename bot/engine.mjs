// ============================================================
//  Delad strategimotor (genererad från script.js, ändra inte för hand).
//  Rena funktioner utan webbläsare: indikatorer, 15 strategier, backtest-simulering och AUTO-val.
//  Används av serverboten (bot/run.mjs).
// ============================================================
export const BACKTEST_START = 200;
export const AUTO_WINDOW = 600;
export const AUTO_REEVAL = 10;
export const AUTO_SWITCH_MARGIN = 2;
export const FEE = 0.001;
export const MODE_TEXT = { trend: 'trendande marknad', revert: 'sidledes marknad', any: 'osäkert läge' };

let _dec = 2;
export function setDecimals(n) { _dec = n; }
function fmt(p) {
    return Number(p).toLocaleString('en-US', { minimumFractionDigits: _dec, maximumFractionDigits: _dec });
}

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
// trendFilter = n > 0: köpsignaler räknas bara när kursen ligger över SMA(n) (följ den stora trenden). Säljsignaler påverkas inte.
export function smaFilterMask(d, n) {
    const ok = new Array(d.length).fill(false);
    let sum = 0;
    for (let i = 0; i < d.length; i++) {
        sum += d[i].close; if (i >= n) sum -= d[i - n].close;
        if (i >= n - 1) ok[i] = d[i].close > sum / n;
    }
    return ok;
}
function prepare(d, trendFilter) {
    const sigs = {};
    const mask = trendFilter > 0 ? smaFilterMask(d, trendFilter) : null;
    BASE_IDS.forEach(function (id) {
        const sg = STRATEGIES[id].compute(d);
        sigs[id] = mask ? { buy: sg.buy.map(function (b, i) { return b && mask[i]; }), sell: sg.sell } : sg;
    });
    return { sigs: sigs, atr: atrSimple(d, 14), adx: adxCalc(d, 14).adx };
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


export function riskMultFor(risk) { return Math.max(0.5, (11 - risk) * 0.2); }
export { STRATEGIES, BASE_IDS, AUTO_POOL, calculateATR, simulate, prepare, pickBest, atrSimple };
