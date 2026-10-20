// ============================================================
//  Test av kortare "allt eller inget"-regler för BTC och ETH (Yahoo Finance, dagliga stängningar).
//  Jämför botarnas gamla regler (långa medelvärden, del-storlekar) med de nya (korta, allt eller inget),
//  mot köp och behåll. Avgift 0,1 % + 0,02 % glidning per sida. Signalen använder data till och med
//  gårdagen och handlas på dagens stängning (en dags försening, så resultatet inte blir för snällt).
//  Varje valuta har en egen lika stor "hink" (ingen ombalansering mellan dem). Skriver research-out/REPORT-BASKET.md.
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



// Krypto-korg: lika stor hink per mynt, varje hink äger myntet bara över sitt 50-d medel (allt eller inget), kontantränta 3,5 % när ute.
// Myntlistan = toppmynt i början av 2018 som fortfarande handlas (överlevnadsbias: dåliga mynt som försvann saknas, så resultatet är för snällt för de större korgarna).
// KRITERIER (satta innan): en större korg ersätter BTC+ETH-botten bara om den har högre tillväxt/år OCH högre Kalmar än BTC+ETH i BÅDA halvorna.
// Därtill ska den vinna även efter ett "bias-avdrag" på 5 procentenheter/år för överlevnadsbias.
const RATE = 0.035 / 365;
function sim(px, from, to) {
    let cash = START, units = 0, prevT = 0, trades = 0; const eq = [];
    for (let i = from; i < to; i++) {
        cash *= 1 + RATE;
        const m = smaAt(px, i - 1, 50), t = m !== null && px[i - 1] > m ? 1 : 0;
        const val = cash + units * px[i];
        if (t !== prevT) { const diff = t * val - units * px[i], c = Math.abs(diff) * COST; cash -= diff + c; units += diff / px[i]; prevT = t; trades++; }
        eq.push(cash + units * px[i]);
    }
    return { eq, trades };
}
const BASK = {
  'BTC+ETH (nuvarande)': ['BTC-USD', 'ETH-USD'],
  'Korg 4: BTC ETH BNB XRP': ['BTC-USD', 'ETH-USD', 'BNB-USD', 'XRP-USD'],
  'Korg 6: + LTC ADA': ['BTC-USD', 'ETH-USD', 'BNB-USD', 'XRP-USD', 'LTC-USD', 'ADA-USD'],
  'Korg 8: + BCH XLM': ['BTC-USD', 'ETH-USD', 'BNB-USD', 'XRP-USD', 'LTC-USD', 'ADA-USD', 'BCH-USD', 'XLM-USD'],
  'Köp och behåll korg 8': null
};
async function main() {
    const syms = ['BTC-USD', 'ETH-USD', 'BNB-USD', 'XRP-USD', 'LTC-USD', 'ADA-USD', 'BCH-USD', 'XLM-USD'], sets = [], miss = [];
    for (const sym of syms) { try { sets.push({ sym, d: await fetchYahoo(sym, Date.UTC(2014, 0, 1)) }); } catch (e) { miss.push(sym); } }
    for (const k of Object.keys(BASK)) if (BASK[k]) BASK[k] = BASK[k].filter(x => !miss.includes(x));
    const M = align(sets, Date.UTC(2018, 0, 1) / 1000);
    const FROM = 260, N = M.n, MID = FROM + Math.floor((N - FROM) / 2), yrs = (N - FROM) / 365;
    const iso = i => new Date((M.t0 + i * DAY) * 1000).toISOString().slice(0, 10);
    const L = ['# Test: större krypto-korg med trendregel', '', 'Yahoo Finance ' + iso(FROM) + ' – ' + iso(N - 1) + ' (' + yrs.toFixed(1) + ' år), mitt ' + iso(MID) + (miss.length ? '. Saknades: ' + miss.join(', ') : '') + '. Över 50-d medel per mynt, lika stora hinkar, avgift 0,12 %/sida, ränta 3,5 % på kontanter.', '', '| Korg | Tillväxt/år | Värsta ras | Kalmar | Affärer/år | 1:a halvan (tillv, ras, Kalmar) | 2:a halvan (tillv, ras, Kalmar) |', '|---|---|---|---|---|---|---|'];
    const out = {};
    for (const [name, list] of Object.entries(BASK)) {
        const syms2 = list || BASK['Korg 8: + BCH XLM'];
        const run = (a, b) => { const parts = syms2.map(s => list ? sim(M.px[s], a, b) : { eq: (() => { const px = M.px[s]; return px.slice(a, b).map(v => START * v / px[a]); })(), trades: 0 }); return { m: metrics(parts[0].eq.map((_, k) => mean(parts.map(p => p.eq[k])))), tr: parts.reduce((x, p) => x + p.trades, 0) }; };
        const all = run(FROM, N), h1 = run(FROM, MID), h2 = run(MID, N);
        out[name] = { all, h1, h2 };
        const c = r => f1(r.m.cagr) + ' %, −' + f1(r.m.dd) + ' %, ' + f2(r.m.calmar);
        L.push('| ' + name + ' | ' + f1(all.m.cagr) + ' % | −' + f1(all.m.dd) + ' % | ' + f2(all.m.calmar) + ' | ' + f1(all.tr / yrs) + ' | ' + c(h1) + ' | ' + c(h2) + ' |');
    }
    const base = out['BTC+ETH (nuvarande)'];
    L.push('', '## Kriterier mot BTC+ETH', '', '| Korg | Högre tillväxt OCH Kalmar i båda halvor | Fortfarande bättre efter −5 pe/år bias-avdrag (hela perioden) | Godkänd |', '|---|---|---|---|');
    for (const k of Object.keys(BASK).slice(1, 4)) {
        const o = out[k], a = o.h1.m.cagr > base.h1.m.cagr && o.h2.m.cagr > base.h2.m.cagr && o.h1.m.calmar > base.h1.m.calmar && o.h2.m.calmar > base.h2.m.calmar, b = o.all.m.cagr - 5 > base.all.m.cagr;
        L.push('| ' + k + ' | ' + (a ? 'ja' : 'nej') + ' | ' + (b ? 'ja' : 'nej') + ' | ' + (a && b ? '**JA**' : 'nej') + ' |');
    }
    L.push('', 'Historik garanterar inget. Överlevnadsbias: mynt som försvann efter 2018 saknas.');
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, 'REPORT-BASKET.md'), L.join('\n') + '\n');
    console.log(L.join('\n'));
}
main().catch(e => { console.error(e); process.exit(1); });
