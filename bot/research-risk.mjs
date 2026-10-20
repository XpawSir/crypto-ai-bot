// ============================================================
//  Test av kortare "allt eller inget"-regler för BTC och ETH (Yahoo Finance, dagliga stängningar).
//  Jämför botarnas gamla regler (långa medelvärden, del-storlekar) med de nya (korta, allt eller inget),
//  mot köp och behåll. Avgift 0,1 % + 0,02 % glidning per sida. Signalen använder data till och med
//  gårdagen och handlas på dagens stängning (en dags försening, så resultatet inte blir för snällt).
//  Varje valuta har en egen lika stor "hink" (ingen ombalansering mellan dem). Skriver research-out/REPORT-RISK.md.
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



// Risk-/regimtest ovanpå nuvarande regel (över 50-d medel, allt eller inget, ränta 3,5 % på kontanter).
// KRITERIER (satta innan resultat): en kandidat införs bara om den för BÅDE BTC och ETH har högre Kalmar än nuvarande i BÅDA halvorna
// och hela periodens tillväxt inte är mer än 4 procentenheter lägre än nuvarande.
const RATE = 0.035 / 365;
function sim(px, from, to, o) {
    let cash = START, units = 0, trades = 0, prevT = 0, peak = START, capUntil = -1; const eq = [];
    for (let i = from; i < to; i++) {
        cash *= 1 + RATE;
        const m = smaAt(px, i - 1, 50); let t = m !== null && px[i - 1] > m ? 1 : 0;
        if (t > 0 && o.volTarget) { const v = volAt(px, i - 1, 30); if (v) t = Math.min(1, o.volTarget / v); }
        if (t > 0 && o.volCut) { const v = volAt(px, i - 1, 30); if (v && v > o.volCut) t = 0; }
        const val = cash + units * px[i];
        peak = Math.max(peak, val);
        if (o.breaker) { if ((peak - val) / peak >= o.breaker) capUntil = i + 30; if (i < capUntil) t = Math.min(t, 0.5); }
        t = Math.round(t / 0.25) * 0.25;
        if (Math.abs(t - prevT) > 1e-9) { const diff = t * val - units * px[i], c = Math.abs(diff) * COST; cash -= diff + c; units += diff / px[i]; prevT = t; trades++; }
        eq.push(cash + units * px[i]);
    }
    return { eq, trades };
}
const C = [
 { name: 'Nuvarande (50-d, allt eller inget, ränta)', o: {} },
 { name: 'V1: volatilitetsmål 80 %/år (max 1x)', o: { volTarget: 0.8 } },
 { name: 'V2: volatilitetsmål 60 %/år (max 1x)', o: { volTarget: 0.6 } },
 { name: 'V3: nedgångsbroms: halvera i 30 dagar efter −15 % från topp', o: { breaker: 0.15 } },
 { name: 'V4: nedgångsbroms: halvera i 30 dagar efter −25 % från topp', o: { breaker: 0.25 } },
 { name: 'V5: stå utanför när 30-d volatilitet över 120 %/år', o: { volCut: 1.2 } },
 { name: 'V6: V2 + V3 tillsammans', o: { volTarget: 0.6, breaker: 0.15 } }
];
async function main() {
    const sets = [];
    for (const sym of ['BTC-USD', 'ETH-USD']) sets.push({ sym, d: await fetchYahoo(sym, Date.UTC(2014, 0, 1)) });
    const M = align(sets, Date.UTC(2018, 0, 1) / 1000);
    const FROM = 260, N = M.n, MID = FROM + Math.floor((N - FROM) / 2), yrs = (N - FROM) / 365;
    const iso = i => new Date((M.t0 + i * DAY) * 1000).toISOString().slice(0, 10);
    const L = ['# Test: riskregler (volatilitetsmål, nedgångsbroms, regimfilter)', '', 'Yahoo Finance ' + iso(FROM) + ' – ' + iso(N - 1) + ' (' + yrs.toFixed(1) + ' år), mitt ' + iso(MID) + '. Avgift 0,12 %/sida, ränta 3,5 % på kontanter, storlek i steg om 25 %.', ''];
    const res = {};
    for (const sym of ['BTC-USD', 'ETH-USD']) {
        const px = M.px[sym];
        L.push('## ' + sym, '', '| Kandidat | Tillväxt/år | Värsta ras | Kalmar | Affärer/år | 1:a halvan (tillv, ras, Kalmar) | 2:a halvan (tillv, ras, Kalmar) |', '|---|---|---|---|---|---|---|');
        res[sym] = C.map(c => { const g = (a, b) => metrics(sim(px, a, b, c.o).eq); const all = sim(px, FROM, N, c.o); return { c, all: metrics(all.eq), tr: all.trades / yrs, h1: g(FROM, MID), h2: g(MID, N) }; });
        const f = r => f1(r.cagr) + ' %, −' + f1(r.dd) + ' %, ' + f2(r.calmar);
        for (const r of res[sym]) L.push('| ' + r.c.name + ' | ' + f1(r.all.cagr) + ' % | −' + f1(r.all.dd) + ' % | ' + f2(r.all.calmar) + ' | ' + f1(r.tr) + ' | ' + f(r.h1) + ' | ' + f(r.h2) + ' |');
        L.push('');
    }
    L.push('## Kriterier mot nuvarande', '', '| Kandidat | BTC | ETH | Godkänd |', '|---|---|---|---|');
    for (let k = 1; k < C.length; k++) {
        const ok = sym => { const b = res[sym][0], r = res[sym][k]; return r.h1.calmar > b.h1.calmar && r.h2.calmar > b.h2.calmar && r.all.cagr >= b.all.cagr - 4; };
        const a = ok('BTC-USD'), b = ok('ETH-USD');
        L.push('| ' + C[k].name + ' | ' + (a ? 'ja' : 'nej') + ' | ' + (b ? 'ja' : 'nej') + ' | ' + (a && b ? '**JA**' : 'nej') + ' |');
    }
    L.push('', 'Historik garanterar inget.');
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, 'REPORT-RISK.md'), L.join('\n') + '\n');
    console.log(L.join('\n'));
}
main().catch(e => { console.error(e); process.exit(1); });
