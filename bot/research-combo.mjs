// ============================================================
//  Test av kortare "allt eller inget"-regler för BTC och ETH (Yahoo Finance, dagliga stängningar).
//  Jämför botarnas gamla regler (långa medelvärden, del-storlekar) med de nya (korta, allt eller inget),
//  mot köp och behåll. Avgift 0,1 % + 0,02 % glidning per sida. Signalen använder data till och med
//  gårdagen och handlas på dagens stängning (en dags försening, så resultatet inte blir för snällt).
//  Varje valuta har en egen lika stor "hink" (ingen ombalansering mellan dem). Skriver research-out/REPORT-COMBO.md.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = process.env.RESEARCH_OUT || 'research-out';
const COST = 0.001 + 0.0002, DAY = 86400, START = 10000;
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; cryptoai-research)' };

async function fetchYahoo(sym, fromMs) {
    const p1 = Math.floor(fromMs / 1000), p2 = Math.floor(Date.now() / 1000);
    const res = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(sym) + '?period1=' + p1 + '&period2=' + p2 + '&interval=1d', { headers: UA, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error('Yahoo HTTP ' + res.status + ' för ' + sym);
    const j = await res.json(), r = j.chart && j.chart.result && j.chart.result[0];
    if (!r || !r.timestamp) throw new Error('Yahoo: ingen data för ' + sym);
    const cl = r.indicators.quote[0].close, out = [];
    r.timestamp.forEach((t, i) => { if (cl[i] > 0) out.push({ time: t, close: cl[i] }); });
    return out;
}

const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const f1 = v => (v === null || !isFinite(v)) ? '–' : v.toFixed(1);
const f2 = v => (v === null || !isFinite(v)) ? '–' : v.toFixed(2);
function smaAt(a, i, p) { if (i < p - 1) return null; let s = 0; for (let k = i - p + 1; k <= i; k++) s += a[k]; return s / p; }
function volAt(a, i, L) { if (i < L) return null; const r = []; for (let k = i - L + 1; k <= i; k++) r.push(a[k] / a[k - 1] - 1); const m = mean(r); return Math.sqrt(mean(r.map(x => (x - m) ** 2))) * Math.sqrt(365); }

// Matris med en stängning per kalenderdag (framåtfylld)
function align(sets, fromSec) {
    const t0 = Math.max(fromSec, ...sets.map(s => s.d[0].time)), t1 = Math.min(...sets.map(s => s.d[s.d.length - 1].time));
    const n = Math.floor((t1 - t0) / DAY) + 1, px = {};
    for (const s of sets) {
        const a = new Array(n).fill(null);
        for (const c of s.d) { const k = Math.floor((c.time - t0) / DAY); if (k >= 0 && k < n) a[k] = c.close; }
        for (let i = 1; i < n; i++) if (a[i] === null) a[i] = a[i - 1];
        px[s.sym] = a;
    }
    return { t0, n, px };
}

// En hink: handlar mot måldelen dagligen. mode 'flip' = bara när målet byter (allt eller inget).
function bucket(px, targetFn, from, to) {
    let cash = START, units = 0, trades = 0, fees = 0, prevT = 0;
    const eq = [];
    for (let i = from; i < to; i++) {
        const t = targetFn(i - 1);                      // signal på gårdagens data
        const val = cash + units * px[i];
        if (Math.abs(t - prevT) > 1e-9) {
            const diff = t * val - units * px[i];
            const c = Math.abs(diff) * COST; fees += c;
            cash -= diff + c; units += diff / px[i]; trades++; prevT = t;
        }
        eq.push(cash + units * px[i]);
    }
    return { eq, trades, fees };
}
function metrics(eq) {
    if (eq.length < 30) return null;
    let peak = eq[0], dd = 0;
    for (const v of eq) { peak = Math.max(peak, v); dd = Math.max(dd, (peak - v) / peak); }
    const tot = eq[eq.length - 1] / eq[0], yrs = eq.length / 365, cagr = Math.pow(tot, 1 / yrs) - 1;
    return { tot: (tot - 1) * 100, cagr: cagr * 100, dd: dd * 100, calmar: dd > 0 ? cagr / dd : 0 };
}


// ============================================================
// Kombinationsbot: tre "ben" med olika drivkrafter, daglig simulering med avgifter 0,12 % per sida.
//  Ben 1: Krypto-trend (BTC, ETH över 50-d medel, allt eller inget, hälften var, ränta 3,5 % på kontanter).
//  Ben 2: Trendkorg ETF:er (SPY, QQQ, TLT, GLD, DBC, lika delar, äger över 100-d medel, ränta på kontanter).
//  Ben 3: Aktiemomentum (30 stora USA-aktier, topp 5 efter 120 d minus 21 d, ombalans var 29:e dag). Överlevnadsbias: universum valt 2010.
//  Kombinationer: lika delar (1/3 var, ombalans var 30:e dag) och risk-paritet (omvänd 90-d volatilitet, ombalans var 30:e dag).
// KRITERIER (satta innan resultat): en kombination godkänns bara om den i BÅDA halvorna har högre Kalmar än medianen av de tre benen
// OCH lägre värsta ras (hela perioden) än medianen av benens värsta ras. Dessutom ska den inte ha lägre tillväxt/år än medianben minus 5 pe.
// ============================================================
const RATE = 0.035 / 365;
const STOCKS = ['AAPL','XOM','MSFT','GE','WMT','JNJ','PG','IBM','CVX','JPM','T','KO','PFE','BAC','WFC','C','CSCO','INTC','VZ','MRK','ORCL','PEP','AMGN','DIS','MCD','HD','UNH','ABT','HPQ','AMZN'];
const ETFS = ['SPY','QQQ','TLT','GLD','DBC'];

// Allmän viktbaserad simulering: wFn(i) ger målvikter per tillgång (signal på data till i-1), returnerar dagliga avkastningar
function sleeve(px, syms, wFn, from, to, rebal) {
    const out = []; let w = {}, last = -1e9;
    for (let i = from; i < to; i++) {
        let nw = w, cost = 0;
        if (rebal === 'flip' || i - last >= rebal) {
            nw = wFn(i - 1);
            const keys = new Set([...Object.keys(w), ...Object.keys(nw)]);
            let turn = 0; keys.forEach(k => { turn += Math.abs((nw[k] || 0) - (w[k] || 0)); });
            if (rebal === 'flip') { if (turn > 1e-9) { cost = turn * COST; last = i; } } else { cost = turn * COST; last = i; }
        }
        let r = 0, inv = 0;
        for (const k of Object.keys(nw)) { const a = px[k][i] / px[k][i - 1] - 1; r += nw[k] * a; inv += nw[k]; }
        r += (1 - inv) * RATE;
        out.push(r - cost); w = nw;
    }
    return out;
}
const eqOf = rets => { const e = [START]; rets.forEach(r => e.push(e[e.length - 1] * (1 + r))); return e; };
const stdev = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))); };

async function main() {
    const sets = [];
    for (const sym of ['BTC-USD', 'ETH-USD', ...ETFS, ...STOCKS]) { try { sets.push({ sym, d: await fetchYahoo(sym, Date.UTC(2014, 0, 1)) }); } catch (e) { console.log('saknas ' + sym); } }
    const have = new Set(sets.map(s => s.sym));
    const M = align(sets, Date.UTC(2018, 0, 1) / 1000), px = M.px, N = M.n, FROM = 260, MID = FROM + Math.floor((N - FROM) / 2);
    const iso = i => new Date((M.t0 + i * DAY) * 1000).toISOString().slice(0, 10);
    const yrs = (N - FROM) / 365;
    const etfs = ETFS.filter(s => have.has(s)), stks = STOCKS.filter(s => have.has(s));
    // ben 1
    const w1 = i => { const w = {}; for (const s of ['BTC-USD', 'ETH-USD']) { const m = smaAt(px[s], i, 50); if (m !== null && px[s][i] > m) w[s] = 0.5; } return w; };
    // ben 2
    const w2 = i => { const w = {}; for (const s of etfs) { const m = smaAt(px[s], i, 100); if (m !== null && px[s][i] > m) w[s] = 1 / etfs.length; } return w; };
    // ben 3
    const w3 = i => { const sc = stks.map(s => ({ s, m: i - 120 >= 0 ? px[s][i - 21] / px[s][i - 120] - 1 : -9 })).sort((a, b) => b.m - a.m).slice(0, 5); const w = {}; sc.forEach(x => { w[x.s] = 0.2; }); return w; };
    const all = [px, ...[]];
    const R = {
        'Ben 1: Krypto-trend': sleeve(px, null, w1, FROM, N, 'flip'),
        'Ben 2: Trendkorg ETF': sleeve(px, null, w2, FROM, N, 'flip'),
        'Ben 3: Aktiemomentum': sleeve(px, null, w3, FROM, N, 29)
    };
    const names = Object.keys(R), n = N - FROM;
    R['Lika delar (1/3 var)'] = (() => { const out = []; let w = [1/3, 1/3, 1/3], cum = [1, 1, 1]; for (let i = 0; i < n; i++) { if (i % 30 === 0) { const t = cum.reduce((a, b) => a + b, 0); w = cum.map(c => 1 / 3 * t / 1); const tt = w.reduce((a, b) => a + b, 0); w = w.map(x => x / tt); w = [1/3, 1/3, 1/3]; cum = [1/3, 1/3, 1/3]; } const rs = names.map((k, j) => R[k][i]); const r = rs.reduce((a, x, j) => a + x * cum[j], 0) / cum.reduce((a, b) => a + b, 0); cum = cum.map((c, j) => c * (1 + rs[j])); out.push(r); } return out; })();
    R['Risk-paritet (omvänd volatilitet)'] = (() => { const out = []; let wt = [1/3, 1/3, 1/3], cum = [1/3, 1/3, 1/3]; for (let i = 0; i < n; i++) { if (i % 30 === 0 && i >= 90) { const iv = names.map(k => 1 / Math.max(1e-6, stdev(R[k].slice(i - 90, i)))); const t = iv.reduce((a, b) => a + b, 0); wt = iv.map(x => x / t); cum = wt.slice(); } const rs = names.map(k => R[k][i]); const tot = cum.reduce((a, b) => a + b, 0); out.push(rs.reduce((a, x, j) => a + x * cum[j], 0) / tot); cum = cum.map((c, j) => c * (1 + rs[j])); } return out; })();
    // referenser
    const bh = s => { const o = []; for (let i = FROM; i < N; i++) o.push(px[s][i] / px[s][i - 1] - 1); return o; };
    R['Referens: köp och behåll S&P 500 (SPY)'] = bh('SPY');
    R['Referens: 60 % SPY + 40 % TLT (utan ombalans)'] = bh('SPY').map((r, i) => 0.6 * r + 0.4 * bh('TLT')[i]);
    const cut = (arr, a, b) => arr.slice(a, b);
    const mt = (arr, a, b) => metrics(eqOf(cut(arr, a, b)));
    const half = Math.floor(n / 2);
    const L = ['# Test: kombinationsbot (krypto-trend + ETF-trend + aktiemomentum)', '', 'Yahoo Finance dagliga stängningar ' + iso(FROM) + ' till ' + iso(N - 1) + ' (' + yrs.toFixed(1) + ' år), mitt ' + iso(MID) + '. Avgift 0,12 %/sida på all omsättning, ränta 3,5 % på kontanter, signal på gårdagens data. Aktieuniversum valt 2010 (överlevnadsbias, resultatet för ben 3 är för snällt).', '',
        '| Strategi | Tillväxt/år | Värsta ras | Kalmar | 1:a halvan (tillv, ras, Kalmar) | 2:a halvan (tillv, ras, Kalmar) |', '|---|---|---|---|---|---|'];
    const stat = {};
    for (const k of Object.keys(R)) {
        const a = mt(R[k], 0, n), h1 = mt(R[k], 0, half), h2 = mt(R[k], half, n); stat[k] = { a, h1, h2 };
        const f = m => f1(m.cagr) + ' %, −' + f1(m.dd) + ' %, ' + f2(m.calmar);
        L.push('| ' + k + ' | ' + f1(a.cagr) + ' % | −' + f1(a.dd) + ' % | ' + f2(a.calmar) + ' | ' + f(h1) + ' | ' + f(h2) + ' |');
    }
    const med = a => a.slice().sort((x, y) => x - y)[1];
    const legs = names.map(k => stat[k]);
    const mCal1 = med(legs.map(x => x.h1.calmar)), mCal2 = med(legs.map(x => x.h2.calmar)), mDD = med(legs.map(x => x.a.dd)), mCg = med(legs.map(x => x.a.cagr));
    L.push('', '## Kriterier (mot medianen av de tre benen)', '', 'Median Kalmar: 1:a halvan ' + f2(mCal1) + ', 2:a halvan ' + f2(mCal2) + '. Median värsta ras −' + f1(mDD) + ' %. Median tillväxt ' + f1(mCg) + ' %/år.', '', '| Kombination | Kalmar högre i båda halvor | Lägre värsta ras än medianen | Tillväxt inom 5 pe från medianen | Godkänd |', '|---|---|---|---|---|');
    for (const k of ['Lika delar (1/3 var)', 'Risk-paritet (omvänd volatilitet)']) {
        const s = stat[k], a = s.h1.calmar > mCal1 && s.h2.calmar > mCal2, b = s.a.dd < mDD, c = s.a.cagr >= mCg - 5;
        L.push('| ' + k + ' | ' + (a ? 'ja' : 'nej') + ' | ' + (b ? 'ja' : 'nej') + ' | ' + (c ? 'ja' : 'nej') + ' | ' + (a && b && c ? '**JA**' : 'nej') + ' |');
    }
    L.push('', 'Historik garanterar inget. Ben 3 är uppblåst av överlevnadsbias.');
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, 'REPORT-COMBO.md'), L.join('\n') + '\n');
    console.log(L.join('\n'));
}
main().catch(e => { console.error(e); process.exit(1); });
