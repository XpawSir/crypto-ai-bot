// ============================================================
//  Test av kortare "allt eller inget"-regler för BTC och ETH (Yahoo Finance, dagliga stängningar).
//  Jämför botarnas gamla regler (långa medelvärden, del-storlekar) med de nya (korta, allt eller inget),
//  mot köp och behåll. Avgift 0,1 % + 0,02 % glidning per sida. Signalen använder data till och med
//  gårdagen och handlas på dagens stängning (en dags försening, så resultatet inte blir för snällt).
//  Varje valuta har en egen lika stor "hink" (ingen ombalansering mellan dem). Skriver research-out/REPORT-SHORT.md.
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

function ensembleTarget(px, lengths, step) {
    return i => { let above = 0; for (const L of lengths) { const m = smaAt(px, i, L); if (m === null) return 0; if (px[i] > m) above++; } return Math.round(above / lengths.length / step) * step; };
}
const smaTarget = (px, L) => i => { const m = smaAt(px, i, L); return m !== null && px[i] > m ? 1 : 0; };
function volTarget(px, L, vt) { return i => { const m = smaAt(px, i, L); if (m === null || !(px[i] > m)) return 0; const v = volAt(px, i, 30); return v ? Math.round(Math.min(1, vt / v) / 0.25) * 0.25 : 0; }; }

async function main() {
    const sets = [];
    for (const sym of ['BTC-USD', 'ETH-USD']) { const d = await fetchYahoo(sym, Date.UTC(2014, 0, 1)); sets.push({ sym, d }); console.log(sym + ' ' + d.length + ' dagar'); }
    const M = align(sets, Date.UTC(2018, 0, 1) / 1000);
    const FROM = 260, N = M.n, MID = FROM + Math.floor((N - FROM) / 2);
    const iso = i => new Date((M.t0 + i * DAY) * 1000).toISOString().slice(0, 10);
    console.log('Period ' + iso(FROM) + ' – ' + iso(N - 1) + ', mitt ' + iso(MID));

    // strategier: {name, tf(px) -> targetFn, syms}
    const S = [];
    S.push({ name: 'Köp och behåll BTC + ETH (hälften var)', syms: ['BTC-USD', 'ETH-USD'], tf: () => () => 1 });
    S.push({ name: 'Köp och behåll BTC', syms: ['BTC-USD'], tf: () => () => 1 });
    const OLD = [20, 50, 100, 150, 200], NEW = [10, 20, 30, 50, 100];
    S.push({ name: 'GAMMAL Trend BTC+ETH (20–200 d, steg 25 %)', syms: ['BTC-USD', 'ETH-USD'], tf: px => ensembleTarget(px, OLD, 0.25) });
    S.push({ name: 'NY Trend BTC+ETH (10–100 d, allt eller inget)', syms: ['BTC-USD', 'ETH-USD'], tf: px => ensembleTarget(px, NEW, 1) });
    S.push({ name: 'Variant: långa medelvärden 20–200 d, allt eller inget', syms: ['BTC-USD', 'ETH-USD'], tf: px => ensembleTarget(px, OLD, 1) });
    S.push({ name: 'Variant: mycket korta 5–50 d, allt eller inget', syms: ['BTC-USD', 'ETH-USD'], tf: px => ensembleTarget(px, [5, 10, 20, 30, 50], 1) });
    S.push({ name: 'GAMMAL Trend-ensemble BTC (20–200 d, steg 50 %)', syms: ['BTC-USD'], tf: px => ensembleTarget(px, OLD, 0.5) });
    S.push({ name: 'NY Trend-ensemble BTC (10–100 d, allt eller inget)', syms: ['BTC-USD'], tf: px => ensembleTarget(px, NEW, 1) });
    S.push({ name: 'GAMMAL Volatilitetsstyrd BTC (SMA 100, vol-storlek)', syms: ['BTC-USD'], tf: px => volTarget(px, 100, 0.6) });
    S.push({ name: 'NY Volatilitetsstyrd BTC (SMA 50, allt eller inget)', syms: ['BTC-USD'], tf: px => smaTarget(px, 50) });
    for (const L of [10, 20, 30, 50, 100, 150, 200]) S.push({ name: 'Enkel regel BTC+ETH: över ' + L + '-dagars medel, allt eller inget', syms: ['BTC-USD', 'ETH-USD'], tf: px => smaTarget(px, L) });

    const run = (st, from, to) => {
        const parts = st.syms.map(s => bucket(M.px[s], st.tf(M.px[s]), from, to));
        const eq = parts[0].eq.map((_, k) => mean(parts.map(p => p.eq[k])));
        return { m: metrics(eq), trades: parts.reduce((a, p) => a + p.trades, 0), fees: mean(parts.map(p => p.fees)) };
    };
    const rows = S.map(st => ({ st, all: run(st, FROM, N), h1: run(st, FROM, MID), h2: run(st, MID, N) }));

    const yrs = (N - FROM) / 365;
    const L = [];
    L.push('# Test: kortare "allt eller inget"-regler för BTC och ETH');
    L.push('');
    L.push('Dagliga stängningar från Yahoo Finance, ' + iso(FROM) + ' till ' + iso(N - 1) + ' (' + yrs.toFixed(1) + ' år). Mitten: ' + iso(MID) + '. Avgift 0,1 % + 0,02 % glidning per sida, signalen på gårdagens data och handel på dagens stängning. Varje valuta har en egen lika stor del, ingen ombalansering mellan dem. Kalmar = årlig tillväxt delat med värsta ras (högre är bättre).');
    L.push('');
    const head = '| Strategi | Tillväxt/år | Värsta ras | Kalmar | Affärer/år | Första halvan (tillv/år, ras) | Andra halvan (tillv/år, ras) |\n|---|---|---|---|---|---|---|';
    L.push(head);
    for (const r of rows) {
        const a = r.all.m, h1 = r.h1.m, h2 = r.h2.m;
        L.push('| ' + r.st.name + ' | ' + f1(a.cagr) + ' % | −' + f1(a.dd) + ' % | ' + f2(a.calmar) + ' | ' + f1(r.all.trades / yrs) + ' | ' + f1(h1.cagr) + ' %, −' + f1(h1.dd) + ' % | ' + f1(h2.cagr) + ' %, −' + f1(h2.dd) + ' % |');
    }
    L.push('');
    // slutsats mekaniskt, utan att övertolka
    const get = n => rows.find(r => r.st.name.startsWith(n));
    const pairs = [['GAMMAL Trend BTC+ETH', 'NY Trend BTC+ETH'], ['GAMMAL Trend-ensemble', 'NY Trend-ensemble'], ['GAMMAL Volatilitetsstyrd', 'NY Volatilitetsstyrd']];
    L.push('## Gammal mot ny');
    for (const [a, b] of pairs) {
        const x = get(a), y = get(b);
        L.push('- **' + a.replace('GAMMAL ', '') + ':** tillväxt/år ' + f1(x.all.m.cagr) + ' % → ' + f1(y.all.m.cagr) + ' %, värsta ras −' + f1(x.all.m.dd) + ' % → −' + f1(y.all.m.dd) + ' %, Kalmar ' + f2(x.all.m.calmar) + ' → ' + f2(y.all.m.calmar) + ', affärer/år ' + f1(x.all.trades / yrs) + ' → ' + f1(y.all.trades / yrs) + '. Andra halvan: ' + f1(x.h2.m.cagr) + ' % → ' + f1(y.h2.m.cagr) + ' %.');
    }
    L.push('');
    L.push('Läs med försiktighet: det är en enda historia med få oberoende trendperioder, och reglerna är valda efter att vi sett kryptots historia. Tabellen visar också alla enkla regler (rad "Enkel regel"), så att man ser om resultatet hänger på ett enskilt tal. Historik garanterar inget.');
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, 'REPORT-SHORT.md'), L.join('\n') + '\n');
    console.log(L.join('\n'));
}
main().catch(e => { console.error(e); process.exit(1); });
