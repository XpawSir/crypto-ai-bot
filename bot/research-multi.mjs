// ============================================================
//  Flerslagstest: daglig trendföljning över krypto, aktie-ETF:er, obligationer, guld och råvaror.
//  Idén (tidsserie-momentum / managed futures-stil) är den med bäst stöd i forskningen: äg varje
//  tillgång bara när den ligger i upptrend, annars kontanter. Olika tillgångsslag rör sig olika,
//  så nedgångarna blir mindre än för bara krypto.
//  Data: Yahoo Finance (reserv Stooq), justerade dagskurser. Signaler räknas på data till IGÅR och
//  handlas på dagens stängning. Kostnad 0,10 % per handlad krona. Helger fylls med föregående stängning.
//  Två universum: (A) 2015-> utan Ethereum, (B) 2018-> med Ethereum.
//  OBS: bara 1-2 stora kryptovalutor, som är stora idag (överlevnadsfel för krypto).
// ============================================================
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = process.env.RESEARCH_OUT || 'research-out';
const COST = 0.001;
const UNIVERSES = [
    { name: 'A: ETF:er + Bitcoin (från 2015)', start: 2015, bench: 'SPY', label: 'SPY (S&P 500)', syms: 'SPY,QQQ,EFA,EEM,TLT,GLD,DBC,VNQ,BTC-USD'.split(',') },
    { name: 'B: ETF:er + Bitcoin + Ethereum (från 2018)', start: 2018, bench: 'SPY', label: 'SPY (S&P 500)', syms: 'SPY,QQQ,TLT,GLD,DBC,BTC-USD,ETH-USD'.split(',') }
];
const SOURCES = { yahoo: 'https://query1.finance.yahoo.com/v8/finance/chart/', stooq: 'https://stooq.com/q/d/l/' };
const START_CASH = 10000;

// ---------- Data (Yahoo Finance, reserv Stooq) ----------
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; cryptoai-research)' };
async function fetchYahoo(sym, fromMs) {
    const p1 = Math.floor(fromMs / 1000), p2 = Math.floor(Date.now() / 1000);
    const res = await fetch(SOURCES.yahoo + encodeURIComponent(sym) + '?period1=' + p1 + '&period2=' + p2 + '&interval=1d&events=div%7Csplit', { headers: UA, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error('Yahoo HTTP ' + res.status);
    const j = await res.json(), r = j.chart && j.chart.result && j.chart.result[0];
    if (!r || !r.timestamp) throw new Error('Yahoo: ingen data');
    const adj = r.indicators.adjclose && r.indicators.adjclose[0] && r.indicators.adjclose[0].adjclose, cl = r.indicators.quote[0].close;
    const out = [];
    r.timestamp.forEach((t, i) => { const v = adj ? adj[i] : cl[i]; if (v > 0) out.push({ time: t, close: v }); });
    return out;
}
async function fetchStooq(sym) {
    const code = sym.endsWith('.ST') ? sym.replace('.ST', '').replace('-', '-').toLowerCase() + '.se' : sym.toLowerCase() + '.us';
    const res = await fetch(SOURCES.stooq + '?s=' + code + '&i=d', { headers: UA, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error('Stooq HTTP ' + res.status);
    const lines = (await res.text()).trim().split('\n').slice(1), out = [];
    for (const l of lines) { const c = l.split(','); const t = Date.parse(c[0] + 'T00:00:00Z') / 1000, v = +c[4]; if (t && v > 0) out.push({ time: t, close: v }); }
    if (!out.length) throw new Error('Stooq: ingen data');
    return out;
}
async function fetchDaily(sym, fromMs) {
    try { return await fetchYahoo(sym, fromMs); } catch (e1) { try { return await fetchStooq(sym); } catch (e2) { throw new Error(e1.message + ' / ' + e2.message); } }
}

const DAY = 86400;
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const f0 = v => (v === null || v === undefined || !isFinite(v)) ? '–' : v.toFixed(0);
const f2 = v => (v === null || v === undefined || !isFinite(v)) ? '–' : v.toFixed(2);

// ---- Kursmatris: priser[sym][dagIndex]
function buildMatrix(sets) {
    let t0 = Infinity, t1 = 0;
    for (const s of sets) { t0 = Math.min(t0, s.d[0].time); t1 = Math.max(t1, s.d[s.d.length - 1].time); }
    t0 = Math.floor(t0 / DAY) * DAY;
    const n = Math.floor((t1 - t0) / DAY) + 1;
    const px = {};
    for (const s of sets) {
        const a = new Array(n).fill(null);
        for (const c of s.d) a[Math.floor((c.time - t0) / DAY)] = c.close;
        for (let i = 1; i < n; i++) if (a[i] === null && a[i - 1] !== null) a[i] = a[i - 1];   // helger, helgdagar och dagar som bara kryptot handlas: föregående stängning (annars räknas ETF:en som noll sista dagarna)
        px[s.sym] = a;
    }
    return { t0, n, px, syms: sets.map(s => s.sym) };
}
function smaAt(a, i, p) { if (i < p - 1) return null; let s = 0; for (let k = i - p + 1; k <= i; k++) { if (a[k] === null) return null; s += a[k]; } return s / p; }
function retAt(a, i, L) { if (i < L || a[i] === null || a[i - L] === null) return null; return a[i] / a[i - L] - 1; }

// ---- Simulator. weightsFn(i) -> {sym: vikt}, anropas med data till och med dag i-1, handlas på stängning dag i
function runPortfolio(M, weightsFn, rebalDays, from, volTarget) {
    let cash = START_CASH; const units = {};
    const eq = new Array(M.n).fill(null);
    const dailyRet = [];
    let prev = START_CASH, tradeDays = 0;
    for (let i = from; i < M.n; i++) {
        let val = cash; for (const s in units) if (M.px[s][i] !== null) val += units[s] * M.px[s][i]; else val += 0;
        if ((i - from) % rebalDays === 0) {
            const w = weightsFn(i - 1) || {};
            let scale = 1;
            if (volTarget) {
                // senaste 30 dagarnas risk för en lika viktad korg av valda valutor
                const names = Object.keys(w);
                if (names.length) {
                    const rs = [];
                    for (let k = i - 30; k < i; k++) { let r = 0, ok = true; for (const s of names) { const a = M.px[s][k], b = M.px[s][k - 1]; if (a === null || b === null) { ok = false; break; } r += w[s] * (a / b - 1); } if (ok) rs.push(r); }
                    if (rs.length > 10) { const m = mean(rs); const sd = Math.sqrt(mean(rs.map(x => (x - m) * (x - m)))); const ann = sd * Math.sqrt(365); if (ann > 0) scale = Math.min(1, volTarget / ann); }
                }
            }
            // handla till målvikter
            let cost = 0;
            const targets = {};
            for (const s in w) targets[s] = val * w[s] * scale;
            const all = new Set([...Object.keys(units), ...Object.keys(targets)]);
            for (const s of all) {
                const price = M.px[s][i]; if (price === null) continue;
                const cur = (units[s] || 0) * price, tgt = targets[s] || 0;
                const diff = tgt - cur; cost += Math.abs(diff) * COST;
                cash -= diff; units[s] = tgt / price;
            }
            cash -= cost; val -= cost; if (cost / COST > val * 0.01) tradeDays++;
        }
        let v2 = cash; for (const s in units) if (units[s] && M.px[s][i] !== null) v2 += units[s] * M.px[s][i];
        eq[i] = v2; dailyRet.push(v2 / prev - 1); prev = v2;
    }
    return { eq, from, tradeDays };
}
function metrics(eq, from, to) {
    // eq: array med värden; mått över [from,to)
    const v = []; for (let i = from; i < to; i++) if (eq[i] !== null) v.push(eq[i]);
    if (v.length < 30) return null;
    let peak = v[0], dd = 0; const r = [];
    for (let k = 0; k < v.length; k++) { peak = Math.max(peak, v[k]); dd = Math.max(dd, (peak - v[k]) / peak); if (k) r.push(v[k] / v[k - 1] - 1); }
    const years = v.length / 365, tot = v[v.length - 1] / v[0];
    const cagr = Math.pow(tot, 1 / years) - 1;
    const m = mean(r), sd = Math.sqrt(mean(r.map(x => (x - m) * (x - m))));
    return { tot: (tot - 1) * 100, cagr: cagr * 100, dd: dd * 100, vol: sd * Math.sqrt(365) * 100, sharpe: sd > 0 ? m / sd * Math.sqrt(365) : 0, calmar: dd > 0 ? cagr / dd : 0 };
}


function volAt(a, i, L) { // årlig volatilitet över L dagar (kalenderdagar)
    if (i < L) return null; const r = [];
    for (let k = i - L + 1; k <= i; k++) { if (a[k] === null || a[k - 1] === null) return null; r.push(a[k] / a[k - 1] - 1); }
    const m = mean(r), sd = Math.sqrt(mean(r.map(x => (x - m) * (x - m)))); return sd * Math.sqrt(365);
}

async function runUniverse(uni) {
    const sets = [], cutoff = Date.UTC(uni.start, 0, 1) / 1000;
    for (const sym of uni.syms) {
        try {
            const d = (await fetchDaily(sym, Date.UTC(uni.start, 0, 1))).filter(c => c.time >= cutoff);
            if (d.length > 500) { sets.push({ sym, d }); console.log(sym + ' ' + d.length + ' dagar'); } else console.log(sym + ' för kort (' + d.length + ')');
        } catch (e) { console.log(sym + ' hoppas över: ' + e.message); }
    }
    if (sets.length < 4) { console.log('För få instrument för ' + uni.name); return null; }
    const M = buildMatrix(sets);
    const FROM = 250, MID = FROM + Math.floor((M.n - FROM) / 2);
    const avail = i => M.syms.filter(s => M.px[s][i] !== null && M.px[s][i - 1] !== null);
    const S = [];
    // Riktmärken (bench[0] = huvudriktmärke, bench[1] = lika delar)
    S.push({ name: 'Köp och behåll ' + uni.label, kind: 'bench', w: () => ({ [uni.bench]: 1 }), reb: 100000 });
    S.push({ name: 'Köp och behåll lika delar (månadsvis ombalans)', kind: 'bench', w: i => { const a = avail(i); const o = {}; a.forEach(s => o[s] = 1 / a.length); return o; }, reb: 30 });
    if (M.px.TLT) S.push({ name: 'Köp och behåll 60/40 (SPY/TLT, månadsvis ombalans)', kind: 'bench', w: () => ({ SPY: 0.6, TLT: 0.4 }), reb: 30 });
    S.push({ name: 'Köp och behåll Bitcoin', kind: 'bench', w: () => ({ 'BTC-USD': 1 }), reb: 100000 });
    // 1) Trendkorg: varje tillgång äger sin lika stora del bara när kursen > SMA(F). Resten är kontanter.
    for (const F of [50, 100, 150, 200]) for (const reb of [1, 7, 30]) S.push({
        name: 'Trendkorg SMA ' + F + ', ombalans var ' + reb + ':e dag', kind: 'basket', reb,
        w: i => { const a = avail(i); const o = {}; for (const s of a) { const m = smaAt(M.px[s], i, F); if (m !== null && M.px[s][i] > m) o[s] = 1 / M.syms.length; } return o; }
    });
    // 2) Tidsserie-momentum: äg tillgången om dess avkastning över L dagar är positiv
    for (const L of [60, 120, 180, 250]) for (const reb of [1, 7, 30]) S.push({
        name: 'Tidsserie-momentum ' + L + 'd, ombalans var ' + reb + ':e dag', kind: 'tsmom', reb,
        w: i => { const a = avail(i); const o = {}; for (const s of a) { const r = retAt(M.px[s], i, L); if (r !== null && r > 0) o[s] = 1 / M.syms.length; } return o; }
    });
    // 3) Riskviktad trend: vikt ∝ 1/volatilitet bland tillgångar i upptrend (krypto får mindre vikt). Resten kontanter.
    for (const F of [100, 200]) for (const reb of [1, 7]) S.push({
        name: 'Riskviktad trend SMA ' + F + ', ombalans var ' + reb + ':e dag', kind: 'riskw', reb,
        w: i => {
            const a = avail(i), inv = {}; let tot = 0;
            for (const s of a) { const v = volAt(M.px[s], i, 60); if (v && v > 0) { inv[s] = 1 / v; tot += 1 / v; } }
            const o = {}; for (const s of Object.keys(inv)) { const m = smaAt(M.px[s], i, F); if (m !== null && M.px[s][i] > m) o[s] = inv[s] / tot; } return o;
        }
    });
    // 4) Dubbelmomentum: de N bästa över L dagar som också ligger över sitt SMA(200)
    for (const L of [90, 180]) for (const N of [2, 3]) S.push({
        name: 'Dubbelmomentum ' + L + 'd, topp ' + N + ', filter SMA 200 (veckovis)', kind: 'dual', reb: 7,
        w: i => {
            const c = []; for (const s of avail(i)) { const r = retAt(M.px[s], i, L), m = smaAt(M.px[s], i, 200); if (r !== null && r > 0 && m !== null && M.px[s][i] > m) c.push([s, r]); }
            c.sort((x, y) => y[1] - x[1]); const o = {}; c.slice(0, N).forEach(x => o[x[0]] = 1 / N); return o;
        }
    });
    const rows = S.map(st => {
        const r = runPortfolio(M, st.w, st.reb, FROM, 0);
        return { name: st.name, kind: st.kind, full: metrics(r.eq, FROM, M.n), is: metrics(r.eq, FROM, MID), oos: metrics(r.eq, MID, M.n), tpy: r.tradeDays / ((M.n - FROM) / 365), eq: r.eq };
    }).filter(r => r.full);
    return report(rows, M, FROM, MID, uni);
}

function report(rows, M, FROM, MID, uni) {
    const L = [], P = s => L.push(s);
    const d = i => new Date((M.t0 + i * DAY) * 1000).toISOString().slice(0, 10);
    const bench = rows.filter(r => r.kind === 'bench'), spy = bench[0], eqw = bench[1];
    P('## ' + uni.name);
    P('');
    P('Skapad ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC. Period ' + d(FROM) + ' – ' + d(M.n - 1) + ' (delningsdatum för håll-ut-test: ' + d(MID) + '). Tillgångar: ' + M.syms.join(', ') + '. Kostnad 0,10 % per handlad krona. Signaler fördröjda en dag. Justerade kurser (utdelning ingår).');
    P('');
    P('Mått: CAGR = årlig tillväxt, Max ned = största nedgång, Calmar = CAGR / största nedgång (högre är bättre avkastning per risk), Sharpe = avkastning per svängning, Affärsdagar/år = hur många dagar om året som boten faktiskt handlar.');
    P('');
    P('### Riktmärken'); P('');
    P('| | Total | CAGR | Max ned | Sharpe | Calmar |'); P('|---|---|---|---|---|---|');
    for (const b of bench) P('| ' + b.name + ' | ' + f0(b.full.tot) + ' % | ' + f0(b.full.cagr) + ' % | -' + f0(b.full.dd) + ' % | ' + f2(b.full.sharpe) + ' | ' + f2(b.full.calmar) + ' |');
    P('');
    const strat = rows.filter(r => r.kind !== 'bench');
    P('### Topp 12 av ' + strat.length + ' strategier (efter Calmar, hela perioden)'); P('');
    P('| Strategi | Total | CAGR | Max ned | Sharpe | Calmar | Affärsdagar/år |'); P('|---|---|---|---|---|---|---|');
    for (const r of [...strat].sort((a, b) => b.full.calmar - a.full.calmar).slice(0, 12)) P('| ' + r.name + ' | ' + f0(r.full.tot) + ' % | ' + f0(r.full.cagr) + ' % | -' + f0(r.full.dd) + ' % | ' + f2(r.full.sharpe) + ' | ' + f2(r.full.calmar) + ' | ' + f0(r.tpy) + ' |');
    P('');
    P('### Robusthet: hela rutnätet, inte bara de bästa'); P('');
    P('| Familj | Antal | Median-CAGR | Median Max ned | Slår köp och behåll lika delar på Calmar (hela / 1:a halvan / 2:a halvan) | Slår ' + uni.label + ' på Calmar (hela / 1:a / 2:a) |'); P('|---|---|---|---|---|---|');
    const fam = { basket: 'Trendkorg', tsmom: 'Tidsserie-momentum', riskw: 'Riskviktad trend', dual: 'Dubbelmomentum' };
    const share = (arr, key, bm) => arr.filter(r => r[key] && bm[key] && r[key].calmar > bm[key].calmar).length;
    for (const k of Object.keys(fam)) {
        const a = strat.filter(r => r.kind === k); if (!a.length) continue;
        P('| ' + fam[k] + ' | ' + a.length + ' | ' + f0(median(a.map(r => r.full.cagr))) + ' % | -' + f0(median(a.map(r => r.full.dd))) + ' % | ' +
            ['full', 'is', 'oos'].map(x => share(a, x, eqw) + '/' + a.length).join(' / ') + ' | ' + ['full', 'is', 'oos'].map(x => share(a, x, spy) + '/' + a.length).join(' / ') + ' |');
    }
    P('');
    P('### Daglig eller långsammare ombalansering?'); P('');
    P('| Ombalans | Median-CAGR | Median Calmar | Median affärsdagar/år |'); P('|---|---|---|---|');
    for (const reb of [1, 7, 30]) {
        const a = strat.filter(r => new RegExp('ombalans var ' + reb + ':e dag').test(r.name)); if (!a.length) continue;
        P('| var ' + reb + ':e dag | ' + f0(median(a.map(r => r.full.cagr))) + ' % | ' + f2(median(a.map(r => r.full.calmar))) + ' | ' + f0(median(a.map(r => r.tpy))) + ' |');
    }
    P('');
    P('### Håll-ut-test'); P('');
    P('Bästa strategierna på första halvan (efter Calmar), mätta på andra halvan som de inte sett.'); P('');
    const byIS = [...strat].filter(r => r.is && r.oos).sort((a, b) => b.is.calmar - a.is.calmar);
    P('| Strategi (vald på 1:a halvan) | Calmar 1:a | CAGR 2:a | Max ned 2:a | Calmar 2:a |'); P('|---|---|---|---|---|');
    for (const r of byIS.slice(0, 6)) P('| ' + r.name + ' | ' + f2(r.is.calmar) + ' | ' + f0(r.oos.cagr) + ' % | -' + f0(r.oos.dd) + ' % | ' + f2(r.oos.calmar) + ' |');
    for (const b of [spy, eqw]) P('| *' + b.name + ' (2:a halvan)* | | ' + f0(b.oos.cagr) + ' % | -' + f0(b.oos.dd) + ' % | ' + f2(b.oos.calmar) + ' |');
    P('');
    const top = byIS.slice(0, 6);
    P('### Slutsats (automatisk)'); P('');
    P('- Av ' + strat.length + ' strategier slog ' + share(strat, 'oos', eqw) + ' köp och behåll lika delar på avkastning per risk (Calmar) på andra halvan, och ' + share(strat, 'oos', spy) + ' slog ' + uni.label + '.');
    P('- De 6 som var bäst på första halvan slog lika delar på Calmar i ' + top.filter(r => r.oos.calmar > eqw.oos.calmar).length + ' av 6 och på tillväxt (CAGR) i ' + top.filter(r => r.oos.cagr > eqw.oos.cagr).length + ' av 6 på andra halvan.');
    const medDD = median(strat.map(r => r.full.dd));
    P('- Mediannedgången var -' + f0(medDD) + ' % mot -' + f0(eqw.full.dd) + ' % för lika delar och -' + f0(spy.full.dd) + ' % för ' + uni.label + '.');
    P('');
    P('Läs med försiktighet: många varianter ger risk för tur, få tillgångar och få marknadscykler. Historik garanterar ingenting.');
    return L.join('\n');
}

async function main() {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const parts = ['# Flerslagstest: daglig trendföljning', ''];
    for (const u of UNIVERSES) { const r = await runUniverse(u); if (r) parts.push(r, ''); }
    if (parts.length <= 2) throw new Error('Ingen data kunde hämtas (Yahoo och Stooq svarade inte)');
    parts.push('Historik garanterar ingenting, och inget här är finansiell rådgivning. Alla resultat är simuleringar.');
    fs.writeFileSync(path.join(OUT_DIR, 'REPORT-MULTI.md'), parts.join('\n'));
    console.log(parts.join('\n'));
}
main().catch(e => { console.error(e); process.exit(1); });
