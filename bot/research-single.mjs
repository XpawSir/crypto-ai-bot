// ============================================================
//  Test av handelsstrategier på ENSKILDA aktier (Yahoo Finance, justerade kurser, utdelning ingår).
//  Två universum:
//   A) De 30 största amerikanska bolagen i början av 2010 (urval gjort före perioden, med förlorare som
//      Intel, GE, Citigroup, Pfizer): litet överlevnadsfel.
//   B) Dagens största amerikanska bolag (NVIDIA, Tesla, Meta ...): STORT överlevnadsfel, med för att visa hur mycket det flatterar.
//  Strategier: trendfilter per aktie, momentum (12-1 och 6-1 månader), kortsiktig återgång (RSI2),
//  utbrott (Donchian), lågvolatilitet. Alla med 0,1 % + 0,02 % kostnad per handlad krona, signal på data
//  till och med gårdagen, handel på dagens stängning. Jämförs med köp och behåll lika delar och SPY.
//
//  GODKÄNNANDEKRITERIER (satta INNAN resultatet sågs). En strategi är kandidat för sajten bara om den:
//   1) slår köp och behåll lika delar på Calmar (tillväxt per värsta ras) i BÅDA halvorna av perioden,
//   2) i sin familj har medianen över hela rutnätet minst lika bra Calmar som lika delar på andra halvan (inte bara bästa raden),
//   3) behåller minst 70 % av lika delars tillväxt per år på andra halvan (så vinsten inte bara kommer av att ligga i kontanter),
//   4) handlar högst 150 gånger per år,
//   5) och gäller i universum A (det med litet överlevnadsfel).
// ============================================================
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = process.env.RESEARCH_OUT || 'research-out';
const COST = 0.001 + 0.0002, START_CASH = 10000, DAY = 86400;
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; cryptoai-research)' };
const UNIVERSES = [
    { name: 'A) De 30 största amerikanska bolagen i början av 2010 (litet överlevnadsfel)', key: 'A', syms: 'AAPL,XOM,MSFT,GE,WMT,JNJ,PG,IBM,CVX,JPM,T,KO,PFE,BAC,WFC,C,CSCO,INTC,VZ,MRK,ORCL,PEP,AMGN,DIS,MCD,HD,UNH,ABT,HPQ,AMZN'.split(',') },
    { name: 'B) Dagens största amerikanska bolag (STORT överlevnadsfel)', key: 'B', syms: 'AAPL,MSFT,NVDA,AMZN,GOOGL,META,TSLA,AVGO,JPM,V,MA,UNH,COST,NFLX,ADBE,CRM,LLY,HD,PG,WMT,KO,PEP,ABBV,MRK,AMD,CSCO,ORCL,MCD,NKE,TXN'.split(',') }
];

async function fetchYahoo(sym, fromMs) {
    const p1 = Math.floor(fromMs / 1000), p2 = Math.floor(Date.now() / 1000);
    const res = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(sym) + '?period1=' + p1 + '&period2=' + p2 + '&interval=1d&events=div%7Csplit', { headers: UA, signal: AbortSignal.timeout(25000) });
    if (!res.ok) throw new Error('Yahoo HTTP ' + res.status);
    const j = await res.json(), r = j.chart && j.chart.result && j.chart.result[0];
    if (!r || !r.timestamp) throw new Error('Yahoo: ingen data');
    const adj = r.indicators.adjclose && r.indicators.adjclose[0] && r.indicators.adjclose[0].adjclose, cl = r.indicators.quote[0].close, out = [];
    r.timestamp.forEach((t, i) => { const v = adj ? adj[i] : cl[i]; if (v > 0) out.push({ time: t, close: v }); });
    return out;
}

const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const f0 = v => (v === null || !isFinite(v)) ? '–' : v.toFixed(0);
const f1 = v => (v === null || !isFinite(v)) ? '–' : v.toFixed(1);
const f2 = v => (v === null || !isFinite(v)) ? '–' : v.toFixed(2);

// Matris över handelsdagar (union av alla aktiers handelsdagar), framåtfylld
function buildMatrix(sets) {
    const dset = new Set(); for (const s of sets) for (const c of s.d) dset.add(Math.floor(c.time / DAY));
    const days = [...dset].sort((a, b) => a - b), idx = new Map(days.map((d, i) => [d, i])), n = days.length, px = {};
    for (const s of sets) {
        const a = new Array(n).fill(null);
        for (const c of s.d) a[idx.get(Math.floor(c.time / DAY))] = c.close;
        let seen = false;
        for (let i = 0; i < n; i++) { if (a[i] !== null) seen = true; else if (seen) a[i] = a[i - 1]; }
        px[s.sym] = a;
    }
    return { days, n, px, syms: sets.map(s => s.sym) };
}
function smaAt(a, i, p) { if (i < p - 1) return null; let s = 0; for (let k = i - p + 1; k <= i; k++) { if (a[k] === null) return null; s += a[k]; } return s / p; }
function retAt(a, i, L, skip) { const j = i - (skip || 0); if (j - L < 0 || a[j] === null || a[j - L] === null) return null; return a[j] / a[j - L] - 1; }
function volAt(a, i, L) { if (i < L) return null; const r = []; for (let k = i - L + 1; k <= i; k++) { if (a[k] === null || a[k - 1] === null) return null; r.push(a[k] / a[k - 1] - 1); } const m = mean(r); return Math.sqrt(mean(r.map(x => (x - m) ** 2))) * Math.sqrt(252); }
function rsiAt(a, i, p) { if (i < p) return null; let g = 0, l = 0; for (let k = i - p + 1; k <= i; k++) { const d = a[k] - a[k - 1]; if (d > 0) g += d; else l -= d; } return l === 0 ? 100 : 100 - 100 / (1 + g / l); }

function runPortfolio(M, weightsFn, rebalDays, from) {
    let cash = START_CASH; const units = {}, eq = new Array(M.n).fill(null);
    let trades = 0;
    for (let i = from; i < M.n; i++) {
        let val = cash; for (const s in units) if (M.px[s][i] !== null) val += units[s] * M.px[s][i];
        if ((i - from) % rebalDays === 0) {
            const w = weightsFn(i - 1) || {}, targets = {}; let cost = 0;
            for (const s in w) targets[s] = val * w[s];
            for (const s of new Set([...Object.keys(units), ...Object.keys(targets)])) {
                const price = M.px[s][i]; if (price === null) continue;
                const cur = (units[s] || 0) * price, tgt = targets[s] || 0, diff = tgt - cur;
                if (Math.abs(diff) > val * 0.002) { cost += Math.abs(diff) * COST; cash -= diff; units[s] = tgt / price; if ((cur < 1) !== (tgt < 1)) trades++; }
            }
            cash -= cost;
        }
        let v2 = cash; for (const s in units) if (units[s] && M.px[s][i] !== null) v2 += units[s] * M.px[s][i];
        eq[i] = v2;
    }
    return { eq, trades };
}
function metrics(eq, from, to) {
    const v = []; for (let i = from; i < to; i++) if (eq[i] !== null) v.push(eq[i]);
    if (v.length < 60) return null;
    let peak = v[0], dd = 0; const r = [];
    for (let k = 0; k < v.length; k++) { peak = Math.max(peak, v[k]); dd = Math.max(dd, (peak - v[k]) / peak); if (k) r.push(v[k] / v[k - 1] - 1); }
    const yrs = v.length / 252, tot = v[v.length - 1] / v[0], cagr = Math.pow(tot, 1 / yrs) - 1;
    const m = mean(r), sd = Math.sqrt(mean(r.map(x => (x - m) ** 2)));
    return { tot: (tot - 1) * 100, cagr: cagr * 100, dd: dd * 100, sharpe: sd > 0 ? m / sd * Math.sqrt(252) : 0, calmar: dd > 0 ? cagr / dd : 0 };
}

async function runUniverse(uni) {
    const sets = [], cutoff = Date.UTC(2010, 0, 1) / 1000;
    for (const sym of uni.syms) {
        try { const d = (await fetchYahoo(sym, Date.UTC(2009, 0, 1))).filter(c => c.time >= cutoff - 400 * DAY); if (d.length > 1500) sets.push({ sym, d }); else console.log(sym + ' för kort'); }
        catch (e) { console.log(sym + ' hoppas över: ' + e.message); }
    }
    if (sets.length < 12) { console.log('För få aktier för ' + uni.key); return null; }
    const M = buildMatrix(sets), n = sets.length;
    const FROM = Math.max(300, M.days.findIndex(d => d >= Math.floor(cutoff / DAY))), MID = FROM + Math.floor((M.n - FROM) / 2);
    const avail = i => M.syms.filter(s => M.px[s][i] !== null && M.px[s][i - 1] !== null);
    const S = [];
    S.push({ name: 'Köp och behåll lika delar (månadsvis ombalans)', fam: 'bench', reb: 30, w: i => { const o = {}, a = avail(i); a.forEach(s => o[s] = 1 / a.length); return o; } });
    if (M.px.AAPL) S.push({ name: 'Köp och behåll Apple', fam: 'bench1', reb: 100000, w: () => ({ AAPL: 1 }) });
    // 1) Trendfilter per aktie
    for (const F of [50, 100, 200]) for (const reb of [1, 7]) S.push({ name: 'Trend: äg aktien över SMA ' + F + ', ombalans var ' + reb + ':e dag', fam: 'Trendfilter', reb,
        w: i => { const o = {}; for (const s of avail(i)) { const m = smaAt(M.px[s], i, F); if (m !== null && M.px[s][i] > m) o[s] = 1 / n; } return o; } });
    // 2) Momentum (tvärsnitt): de N bästa
    for (const [L, skip] of [[250, 21], [120, 21], [60, 5]]) for (const N of [5, 10]) S.push({ name: 'Momentum ' + L + 'd (hoppa ' + skip + 'd), topp ' + N + ', månadsvis', fam: 'Momentum', reb: 21,
        w: i => { const c = []; for (const s of avail(i)) { const r = retAt(M.px[s], i, L, skip); if (r !== null) c.push([s, r]); } c.sort((a, b) => b[1] - a[1]); const o = {}; c.slice(0, N).forEach(x => o[x[0]] = 1 / N); return o; } });
    // 3) Lågvolatilitet
    for (const N of [5, 10]) S.push({ name: 'Lågvolatilitet: de ' + N + ' lugnaste (60d), månadsvis', fam: 'Lågvolatilitet', reb: 21,
        w: i => { const c = []; for (const s of avail(i)) { const v = volAt(M.px[s], i, 60); if (v) c.push([s, v]); } c.sort((a, b) => a[1] - b[1]); const o = {}; c.slice(0, N).forEach(x => o[x[0]] = 1 / N); return o; } });
    // 4) Återgång efter kraftigt fall (RSI 2) i upptrend, tillståndsmaskin
    for (const [lo, maxPos] of [[5, 10], [10, 10], [10, 5], [20, 10]]) {
        const held = new Set();
        S.push({ name: 'Återgång: köp RSI(2) < ' + lo + ' över SMA 200, sälj när RSI(2) > 60, max ' + maxPos + ' aktier (dagligen)', fam: 'Återgång', reb: 1,
            w: i => {
                for (const s of [...held]) { const r = rsiAt(M.px[s], i, 2); if (r === null || r > 60 || M.px[s][i] < (smaAt(M.px[s], i, 200) || Infinity) * 0.9) held.delete(s); }
                const cand = []; for (const s of avail(i)) { if (held.has(s)) continue; const m = smaAt(M.px[s], i, 200), r = rsiAt(M.px[s], i, 2); if (m !== null && r !== null && M.px[s][i] > m && r < lo) cand.push([s, r]); }
                cand.sort((a, b) => a[1] - b[1]); for (const c of cand) if (held.size < maxPos) held.add(c[0]);
                const o = {}; held.forEach(s => o[s] = 1 / maxPos); return o;
            } });
    }
    // 5) Utbrott (Donchian): köp vid nytt N-dagars högsta, sälj vid nytt M-dagars lägsta
    for (const [hi, lo] of [[55, 20], [100, 50], [20, 10]]) {
        const held = new Set();
        S.push({ name: 'Utbrott: köp nytt ' + hi + 'd-högsta, sälj nytt ' + lo + 'd-lägsta (dagligen)', fam: 'Utbrott', reb: 1,
            w: i => {
                for (const s of avail(i)) {
                    const a = M.px[s]; let mx = -Infinity, mn = Infinity;
                    for (let k = i - hi; k < i; k++) if (a[k] !== null && a[k] > mx) mx = a[k];
                    for (let k = i - lo; k < i; k++) if (a[k] !== null && a[k] < mn) mn = a[k];
                    if (i < hi + 1) continue;
                    if (!held.has(s) && a[i] > mx) held.add(s); else if (held.has(s) && a[i] < mn) held.delete(s);
                }
                const o = {}; held.forEach(s => o[s] = 1 / n); return o;
            } });
    }
    const rows = S.map(st => { const r = runPortfolio(M, st.w, st.reb, FROM); return { st, trades: r.trades, all: metrics(r.eq, FROM, M.n), h1: metrics(r.eq, FROM, MID), h2: metrics(r.eq, MID, M.n) }; }).filter(r => r.all && r.h1 && r.h2);
    return { uni, M, n, FROM, MID, rows };
}

function report(res) {
    const { uni, M, n, FROM, MID, rows } = res, L = [];
    const iso = i => new Date(M.days[i] * DAY * 1000).toISOString().slice(0, 10), yrs = (M.n - FROM) / 252;
    L.push('## ' + uni.name, '');
    L.push('Period ' + iso(FROM) + ' – ' + iso(M.n - 1) + ' (' + yrs.toFixed(1) + ' år), delning för håll-ut-test ' + iso(MID) + '. ' + n + ' aktier med data. Kostnad 0,12 % per handlad krona, signal på gårdagens data. Kalmar = årlig tillväxt delat med värsta ras.', '');
    L.push('| Strategi | Tillväxt/år | Värsta ras | Kalmar | Affärer/år | 1:a halvan (tillv., ras, Kalmar) | 2:a halvan (tillv., ras, Kalmar) |', '|---|---|---|---|---|---|---|');
    const sorted = rows.slice().sort((a, b) => b.all.calmar - a.all.calmar);
    for (const r of sorted.slice(0, 14).concat(rows.filter(r => r.st.fam.startsWith('bench') && !sorted.slice(0, 14).includes(r)))) {
        L.push('| ' + r.st.name + ' | ' + f1(r.all.cagr) + ' % | −' + f1(r.all.dd) + ' % | ' + f2(r.all.calmar) + ' | ' + f1(r.trades / yrs) + ' | ' + f1(r.h1.cagr) + ' %, −' + f0(r.h1.dd) + ' %, ' + f2(r.h1.calmar) + ' | ' + f1(r.h2.cagr) + ' %, −' + f0(r.h2.dd) + ' %, ' + f2(r.h2.calmar) + ' |');
    }
    L.push('');
    const bench = rows.find(r => r.st.fam === 'bench');
    L.push('### Familjer: hela rutnätet, inte bara de bästa', '', '| Familj | Antal | Median tillväxt/år | Median värsta ras | Median Kalmar | Slår lika delar på Kalmar (1:a / 2:a halvan) | Median affärer/år |', '|---|---|---|---|---|---|---|');
    const fams = [...new Set(rows.filter(r => !r.st.fam.startsWith('bench')).map(r => r.st.fam))], verdicts = [];
    for (const f of fams) {
        const fr = rows.filter(r => r.st.fam === f), b1 = fr.filter(r => r.h1.calmar > bench.h1.calmar).length, b2 = fr.filter(r => r.h2.calmar > bench.h2.calmar).length;
        L.push('| ' + f + ' | ' + fr.length + ' | ' + f1(median(fr.map(r => r.all.cagr))) + ' % | −' + f1(median(fr.map(r => r.all.dd))) + ' % | ' + f2(median(fr.map(r => r.all.calmar))) + ' | ' + b1 + '/' + fr.length + ' / ' + b2 + '/' + fr.length + ' | ' + f1(median(fr.map(r => r.trades / yrs))) + ' |');
        // kriterier 1–4 för familjens bästa rad (efter Kalmar hela perioden)
        const best = fr.slice().sort((a, b) => b.all.calmar - a.all.calmar)[0];
        const c1 = best.h1.calmar > bench.h1.calmar && best.h2.calmar > bench.h2.calmar;
        const c2 = median(fr.map(r => r.h2.calmar)) >= bench.h2.calmar;
        const c3 = best.h2.cagr >= 0.7 * bench.h2.cagr;
        const c4 = best.trades / yrs <= 150;
        verdicts.push({ f, best, c1, c2, c3, c4, pass: c1 && c2 && c3 && c4 });
    }
    L.push('', '### Godkännandekriterier (satta före testet)', '', '| Familj | Bästa raden | 1) slår lika delar på Kalmar i båda halvorna | 2) familjens median ≥ lika delar (2:a halvan) | 3) ≥ 70 % av lika delars tillväxt (2:a halvan) | 4) ≤ 150 affärer/år | Resultat |', '|---|---|---|---|---|---|---|');
    for (const v of verdicts) L.push('| ' + v.f + ' | ' + v.best.st.name + ' | ' + (v.c1 ? 'ja' : 'nej') + ' | ' + (v.c2 ? 'ja' : 'nej') + ' | ' + (v.c3 ? 'ja' : 'nej') + ' | ' + (v.c4 ? 'ja' : 'nej') + ' | ' + (v.pass ? '**klarar**' : 'klarar inte') + ' |');
    L.push('');
    return { text: L.join('\n'), verdicts, bench };
}

async function main() {
    const out = ['# Test: handel i enskilda aktier', '', 'Strategier på enskilda aktier (trendfilter, momentum, lågvolatilitet, återgång, utbrott), jämförda med att bara köpa och behålla lika delar. **Överlevnadsfel:** universum A är de 30 största bolagen i början av 2010, valda före perioden och med förlorare. Universum B är dagens största bolag, vilket gör alla siffror för vackra och visas bara för att visa hur stort felet är. Godkännandekriterierna sattes innan resultatet sågs (se kodens första kommentar). Historik garanterar inget, och kostnaden för spread och skatt är grovt räknad.', ''];
    const summary = [];
    for (const uni of UNIVERSES) {
        console.log('Universum ' + uni.key);
        const res = await runUniverse(uni); if (!res) continue;
        const r = report(res); out.push(r.text); summary.push({ key: uni.key, verdicts: r.verdicts });
    }
    const A = summary.find(s => s.key === 'A');
    out.push('## Slutsats', '');
    if (!A) out.push('Universum A kunde inte köras.');
    else {
        const ok = A.verdicts.filter(v => v.pass);
        out.push(ok.length ? 'Familjer som klarar alla fyra kriterier i universum A: **' + ok.map(v => v.f).join(', ') + '**. De är kandidater för en pappersbot, men ska fortfarande utvärderas live i 2–3 månader.' : '**Ingen familj klarar alla fyra kriterier i universum A.** Då hör ingen aktiestrategi hemma som egen bot på sajten.');
        out.push('', 'Familjer som inte klarar: ' + (A.verdicts.filter(v => !v.pass).map(v => v.f + ' (' + [!v.c1 && 'slår inte lika delar i båda halvor', !v.c2 && 'medianen sämre än lika delar', !v.c3 && 'tappar för mycket tillväxt', !v.c4 && 'för många affärer'].filter(Boolean).join(', ') + ')').join('; ') || 'inga') + '.');
    }
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, 'REPORT-SINGLE.md'), out.join('\n') + '\n');
    console.log(out.join('\n'));
}
main().catch(e => { console.error(e); process.exit(1); });
