// ============================================================
//  Test av kortare "allt eller inget"-regler för BTC och ETH (Yahoo Finance, dagliga stängningar).
//  Jämför botarnas gamla regler (långa medelvärden, del-storlekar) med de nya (korta, allt eller inget),
//  mot köp och behåll. Avgift 0,1 % + 0,02 % glidning per sida. Signalen använder data till och med
//  gårdagen och handlas på dagens stängning (en dags försening, så resultatet inte blir för snällt).
//  Varje valuta har en egen lika stor "hink" (ingen ombalansering mellan dem). Skriver research-out/REPORT-BOOST.md.
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


// Kandidater (kriterier satta INNAN resultat): en kandidat får bli bot-förbättring bara om den, jämfört med nuvarande Trend 50 d allt-eller-inget,
// ger högre årlig tillväxt I BÅDA halvorna och värsta ras inte är mer än 10 procentenheter större, med BTC och ETH var för sig.
const RATE = 0.035 / 365;
function sim(px, from, to, o) {
    let cash = START, units = 0, trades = 0, prevT = 0; const eq = [];
    for (let i = from; i < to; i++) {
        cash *= 1 + (o.idle ? RATE : 0);
        const t = o.target(px, i - 1);
        const val = cash + units * px[i];
        if (Math.abs(t - prevT) > 1e-9) {
            const diff = t * val - units * px[i], c = Math.abs(diff) * COST;
            cash -= diff + c; units += diff / px[i]; trades++; prevT = t;
        }
        let v = cash + units * px[i];
        if (v <= 0) v = 1e-6;
        eq.push(v);
        if (o.borrow && cash < 0) cash *= 1 + 0.08 / 365;     // lånekostnad 8 %/år på lånad del
    }
    return { eq, trades };
}
const sma50 = (px, i) => { const m = smaAt(px, i, 50); return m !== null && px[i] > m ? 1 : 0; };
const C = [
 { name: 'Nuvarande: över 50-d medel, allt eller inget (kontanter utan ränta)', o: { target: sma50 } },
 { name: 'A: samma + ränta 3,5 % på kontanter när ute', o: { target: sma50, idle: true } },
 { name: 'B: över 50-d OCH 200-d medel (långsammare filter) + ränta', o: { target: (px, i) => { const a = smaAt(px, i, 50), b = smaAt(px, i, 200); return a !== null && b !== null && px[i] > a && px[i] > b ? 1 : 0; }, idle: true } },
 { name: 'C: över 50-d ELLER 200-d medel + ränta (kvar längre)', o: { target: (px, i) => { const a = smaAt(px, i, 50), b = smaAt(px, i, 200); return (a !== null && px[i] > a) || (b !== null && px[i] > b) ? 1 : 0; }, idle: true } },
 { name: 'D: 50-d medel + bara in om pris också över 20-d högsta stängning-lågpunkt (momentum 20 d > 0) + ränta', o: { target: (px, i) => i >= 50 && sma50(px, i) && px[i] > px[i - 20] ? 1 : 0, idle: true } },
 { name: 'E: 1,5x hävstång när över både 50-d och 200-d, annars 1x över 50-d, annars ute + ränta + lånekostnad', o: { target: (px, i) => { const a = smaAt(px, i, 50), b = smaAt(px, i, 200); if (a === null || b === null || !(px[i] > a)) return 0; return px[i] > b ? 1.5 : 1; }, idle: true, borrow: true } },
 { name: 'F: Köp och behåll (referens)', o: { target: () => 1 } }
];
async function main() {
    const sets = [];
    for (const sym of ['BTC-USD', 'ETH-USD']) sets.push({ sym, d: await fetchYahoo(sym, Date.UTC(2014, 0, 1)) });
    const M = align(sets, Date.UTC(2018, 0, 1) / 1000);
    const FROM = 260, N = M.n, MID = FROM + Math.floor((N - FROM) / 2), yrs = (N - FROM) / 365;
    const iso = i => new Date((M.t0 + i * DAY) * 1000).toISOString().slice(0, 10);
    const L = ['# Test: förbättringar av trendbotten (ränta på kontanter, filter, hävstång)', '', 'Yahoo Finance dagliga stängningar ' + iso(FROM) + ' till ' + iso(N - 1) + ' (' + yrs.toFixed(1) + ' år), mitt ' + iso(MID) + '. Avgift 0,12 % per sida, signal på gårdagens data. Ränta 3,5 % på kontanter förutsätter att pengarna faktiskt står i ett räntekonto/penningmarknadsfond.', ''];
    const res = {};
    for (const sym of ['BTC-USD', 'ETH-USD']) {
        const px = M.px[sym];
        L.push('## ' + sym, '', '| Kandidat | Tillväxt/år | Värsta ras | Kalmar | Affärer/år | 1:a halvan | 2:a halvan |', '|---|---|---|---|---|---|---|');
        res[sym] = C.map(c => { const g = (a, b) => metrics(sim(px, a, b, c.o).eq); const all = sim(px, FROM, N, c.o); return { c, all: metrics(all.eq), tr: all.trades / yrs, h1: g(FROM, MID), h2: g(MID, N) }; });
        for (const r of res[sym]) L.push('| ' + r.c.name + ' | ' + f1(r.all.cagr) + ' % | −' + f1(r.all.dd) + ' % | ' + f2(r.all.calmar) + ' | ' + f1(r.tr) + ' | ' + f1(r.h1.cagr) + ' %, −' + f1(r.h1.dd) + ' % | ' + f1(r.h2.cagr) + ' %, −' + f1(r.h2.dd) + ' % |');
        L.push('');
    }
    L.push('## Kriterier mot nuvarande regel (BTC och ETH var för sig)', '', '| Kandidat | BTC bättre i båda halvor, ras ≤ +10 pe | ETH bättre i båda halvor, ras ≤ +10 pe | Godkänd |', '|---|---|---|---|');
    for (let k = 1; k < C.length - 1; k++) {
        const ok = sym => { const b = res[sym][0], r = res[sym][k]; return r.h1.cagr > b.h1.cagr && r.h2.cagr > b.h2.cagr && r.all.dd <= b.all.dd + 10; };
        const a = ok('BTC-USD'), b = ok('ETH-USD');
        L.push('| ' + C[k].name + ' | ' + (a ? 'ja' : 'nej') + ' | ' + (b ? 'ja' : 'nej') + ' | ' + (a && b ? '**JA**' : 'nej') + ' |');
    }
    L.push('', 'Historik garanterar inget. Hävstång (E) kan ge totalförlust vid snabba fall och är ingen rekommendation.');
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, 'REPORT-BOOST.md'), L.join('\n') + '\n');
    console.log(L.join('\n'));
}
main().catch(e => { console.error(e); process.exit(1); });
