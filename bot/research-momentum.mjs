// ============================================================
//  Kan aktiemomentum-boten förbättras? Testar tre ändringar mot botens nuvarande regel, med regler satta INNAN resultatet sågs.
//  Universum: de 30 största amerikanska bolagen i början av 2010 (litet överlevnadsfel). 2010–2026, kostnad 0,12 % per sida.
//  Nuvarande bot: momentum (L dagar, hoppa 21), topp 5, månadsvis, kvarvarande aktier justeras inte, ingen marknadsfilter.
//  Ändringar: (1) topp 10 i stället för 5, (2) marknadsfilter: bara i aktier när SPY ligger över sitt 200-dagars medelvärde, annars kontanter,
//  (3) justera till lika delar varje månad (så som det först testades) i stället för att lämna kvarvarande aktier orörda.
//  Varje ändring prövas i 8 par (L i {120, 250} x övriga två ändringar av/på x ...) och antas BARA om den ger bättre Calmar
//  (tillväxt per värsta ras) i BÅDA halvorna av perioden i minst 6 av 8 par. Annars är det troligen brus eller överanpassning.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
const OUT_DIR = process.env.RESEARCH_OUT || 'research-out';
const COST = 0.001 + 0.0002, START_CASH = 10000, DAY = 86400;
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; cryptoai-research)' };
const SYMS = 'AAPL,XOM,MSFT,GE,WMT,JNJ,PG,IBM,CVX,JPM,T,KO,PFE,BAC,WFC,C,CSCO,INTC,VZ,MRK,ORCL,PEP,AMGN,DIS,MCD,HD,UNH,ABT,HPQ,AMZN'.split(',');

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

function runPortfolio(M, weightsFn, rebalDays, from, noTrim) {
    let cash = START_CASH; const units = {}, eq = new Array(M.n).fill(null);
    let trades = 0;
    for (let i = from; i < M.n; i++) {
        let val = cash; for (const s in units) if (M.px[s][i] !== null) val += units[s] * M.px[s][i];
        if ((i - from) % rebalDays === 0) {
            const w = weightsFn(i - 1) || {}, targets = {}; let cost = 0;
            for (const s in w) targets[s] = val * w[s];
            const all = [...new Set([...Object.keys(units), ...Object.keys(targets)])];
            // sälj först så att kontanter finns
            all.sort((x, y) => ((targets[x] || 0) - (units[x] || 0) * (M.px[x][i] || 0)) - ((targets[y] || 0) - (units[y] || 0) * (M.px[y][i] || 0)));
            for (const s of all) {
                const price = M.px[s][i]; if (price === null) continue;
                const cur = (units[s] || 0) * price, tgt = targets[s] || 0;
                if (noTrim && cur > 1 && tgt > 0) continue;               // behåll kvarvarande aktier orörda
                let diff = tgt - cur;
                if (diff > 0) diff = Math.min(diff, cash);
                if (Math.abs(diff) > val * 0.002) { cost += Math.abs(diff) * COST; cash -= diff; units[s] = (cur + diff) / price; if ((cur < 1) !== ((cur + diff) < 1)) trades++; }
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


async function main() {
    const sets = [], cutoff = Date.UTC(2010, 0, 1) / 1000;
    for (const sym of [...SYMS, 'SPY']) {
        try { const d = (await fetchYahoo(sym, Date.UTC(2009, 0, 1))).filter(c => c.time >= cutoff - 400 * DAY); if (d.length > 1500) sets.push({ sym, d }); else console.log(sym + ' för kort'); }
        catch (e) { console.log(sym + ' hoppas över: ' + e.message); }
    }
    if (!sets.find(s => s.sym === 'SPY') || sets.length < 20) throw new Error('För få aktier med data');
    const M = buildMatrix(sets), names = M.syms.filter(s => s !== 'SPY'), n = names.length;
    const FROM = Math.max(300, M.days.findIndex(d => d >= Math.floor(cutoff / DAY))), MID = FROM + Math.floor((M.n - FROM) / 2);
    const iso = i => new Date(M.days[i] * DAY * 1000).toISOString().slice(0, 10), yrs = (M.n - FROM) / 252;
    const avail = i => names.filter(s => M.px[s][i] !== null && M.px[s][i - 1] !== null);
    const mkt = i => { const m = smaAt(M.px.SPY, i, 200); return m !== null && M.px.SPY[i] > m; };
    const variants = [];
    for (const L of [120, 250]) for (const N of [5, 10]) for (const filter of [false, true]) for (const noTrim of [true, false]) {
        variants.push({ L, N, filter, noTrim, name: 'Momentum ' + L + 'd, topp ' + N + (filter ? ', marknadsfilter' : '') + (noTrim ? ', justera ej' : ', lika delar månadsvis'),
            w: i => { if (filter && !mkt(i)) return {}; const c = []; for (const s of avail(i)) { const r = retAt(M.px[s], i, L, 21); if (r !== null) c.push([s, r]); } c.sort((a, b) => b[1] - a[1]); const o = {}; c.slice(0, N).forEach(x => o[x[0]] = 1 / N); return o; } });
    }
    const ew = runPortfolio(M, i => { const o = {}, a = avail(i); a.forEach(s => o[s] = 1 / a.length); return o; }, 21, FROM);
    const ewM = { all: metrics(ew.eq, FROM, M.n), h1: metrics(ew.eq, FROM, MID), h2: metrics(ew.eq, MID, M.n) };
    const spyEq = runPortfolio(M, () => ({ SPY: 1 }), 100000, FROM);
    const spyM = { all: metrics(spyEq.eq, FROM, M.n), h1: metrics(spyEq.eq, FROM, MID), h2: metrics(spyEq.eq, MID, M.n) };
    for (const v of variants) { const r = runPortfolio(M, v.w, 21, FROM, v.noTrim); v.trades = r.trades; v.all = metrics(r.eq, FROM, M.n); v.h1 = metrics(r.eq, FROM, MID); v.h2 = metrics(r.eq, MID, M.n); }
    const cur = L => variants.find(v => v.L === L && v.N === 5 && !v.filter && v.noTrim);

    const L = ['# Test: kan aktiemomentum-boten förbättras?', '',
        'Period ' + iso(FROM) + ' – ' + iso(M.n - 1) + ' (' + yrs.toFixed(1) + ' år), mitten ' + iso(MID) + '. 30 stora amerikanska bolag (valda 2010), kostnad 0,12 % per sida. Botens nuvarande regel är "topp 5, justera ej, inget marknadsfilter". Kalmar = årlig tillväxt delat med värsta ras.', '',
        '| Variant | Tillväxt/år | Värsta ras | Kalmar | Affärer/år | 1:a halvan (tillv., Kalmar) | 2:a halvan (tillv., Kalmar) |', '|---|---|---|---|---|---|---|'];
    L.push('| *Köp och behåll lika delar* | ' + f1(ewM.all.cagr) + ' % | −' + f1(ewM.all.dd) + ' % | ' + f2(ewM.all.calmar) + ' | 1.8 | ' + f1(ewM.h1.cagr) + ' %, ' + f2(ewM.h1.calmar) + ' | ' + f1(ewM.h2.cagr) + ' %, ' + f2(ewM.h2.calmar) + ' |');
    L.push('| *Köp och behåll S&P 500 (SPY)* | ' + f1(spyM.all.cagr) + ' % | −' + f1(spyM.all.dd) + ' % | ' + f2(spyM.all.calmar) + ' | 0 | ' + f1(spyM.h1.cagr) + ' %, ' + f2(spyM.h1.calmar) + ' | ' + f1(spyM.h2.cagr) + ' %, ' + f2(spyM.h2.calmar) + ' |');
    for (const v of variants) L.push('| ' + v.name + ((v.L === 120 && v.N === 5 && !v.filter && v.noTrim) ? ' **(nuvarande bot)**' : '') + ' | ' + f1(v.all.cagr) + ' % | −' + f1(v.all.dd) + ' % | ' + f2(v.all.calmar) + ' | ' + f1(v.trades / yrs) + ' | ' + f1(v.h1.cagr) + ' %, ' + f2(v.h1.calmar) + ' | ' + f1(v.h2.cagr) + ' %, ' + f2(v.h2.calmar) + ' |');
    L.push('');
    // Parvisa jämförelser: ändringen på/av med övriga inställningar lika
    const mods = [
        { key: 'topp 10 i stället för topp 5', a: v => v.N === 10, b: v => v.N === 5, same: (x, y) => x.L === y.L && x.filter === y.filter && x.noTrim === y.noTrim },
        { key: 'marknadsfilter (SPY över SMA 200)', a: v => v.filter, b: v => !v.filter, same: (x, y) => x.L === y.L && x.N === y.N && x.noTrim === y.noTrim },
        { key: 'lika delar varje månad i stället för att inte justera', a: v => !v.noTrim, b: v => v.noTrim, same: (x, y) => x.L === y.L && x.N === y.N && x.filter === y.filter }
    ];
    L.push('## Paren: bättre Kalmar i båda halvorna?', '', '| Ändring | Par som blir bättre i båda halvorna | Median ändring i tillväxt/år | Median ändring i värsta ras (procentenheter) | Beslut (kräver minst 6 av 8) |', '|---|---|---|---|---|');
    const adopt = [];
    for (const m of mods) {
        const pairs = []; for (const x of variants.filter(m.a)) { const y = variants.find(z => m.b(z) && m.same(x, z)); if (y) pairs.push([x, y]); }
        const wins = pairs.filter(([x, y]) => x.h1.calmar > y.h1.calmar && x.h2.calmar > y.h2.calmar).length;
        const dC = median(pairs.map(([x, y]) => x.all.cagr - y.all.cagr)), dD = median(pairs.map(([x, y]) => x.all.dd - y.all.dd));
        const ok = wins >= 6; if (ok) adopt.push(m.key);
        L.push('| ' + m.key + ' | ' + wins + ' av ' + pairs.length + ' | ' + (dC >= 0 ? '+' : '') + f1(dC) + ' | ' + (dD >= 0 ? '+' : '') + f1(dD) + ' | ' + (ok ? '**antas**' : 'antas inte') + ' |');
    }
    L.push('', '## Slutsats', '', adopt.length ? 'Ändringar som uppfyller kravet: **' + adopt.join('; ') + '**. De kan införas i boten, men ska fortfarande följas live.' : '**Ingen ändring uppfyller kravet.** Då lämnas botens regler som de är: att ändra efter att ha sett resultatet vore mest överanpassning.');
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, 'REPORT-MOMENTUM.md'), L.join('\n') + '\n');
    console.log(L.join('\n'));
}
main().catch(e => { console.error(e); process.exit(1); });
