// ============================================================
//  Portföljtest: roterar boten mellan flera valutor i stället för att handla en i taget?
//  Idéer som är kända från forskningen: momentum (köp det som stigit mest), trendfilter per valuta,
//  marknadsfilter (BTC över sitt medelvärde) och volatilitetsstyrd storlek (mindre pengar när det svänger mycket).
//  Alla signaler räknas på data fram till IGÅR och handlas på dagens stängning (ingen framtidsblick).
//  Kostnad: 0,1 % avgift + 0,05 % glapp på allt som köps eller säljs.
//  Robusthet: hela rutnätet av inställningar redovisas, inte bara den bästa. Dessutom håll-ut-test.
//  OBS: valutorna är sådana som finns idag och var stora, vilket flatterar alla köp-och-behåll-resultat (överlevnadsfel).
// ============================================================
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = process.env.RESEARCH_OUT || 'research-out';
const SOURCES = (process.env.RESEARCH_API_BASES
    ? process.env.RESEARCH_API_BASES.split(',')
    : ['https://data-api.binance.vision/api/v3', 'https://api.binance.com/api/v3', 'https://api.binance.us/api/v3']);
const SYMBOLS = (process.env.RESEARCH_SYMS || 'BTCUSDT,ETHUSDT,BNBUSDT,XRPUSDT,ADAUSDT,LTCUSDT,TRXUSDT,LINKUSDT,SOLUSDT,DOGEUSDT').split(',');
const START_YEAR = +(process.env.RESEARCH_START_YEAR || 2019);
const COST = 0.0015;
const START_CASH = 10000;

// ---------- Data ----------
let source = null;
async function getJSON(q) {
    const order = source ? [source, ...SOURCES.filter(s => s !== source)] : SOURCES;
    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
        for (const base of order) {
            try {
                const res = await fetch(base + q, { signal: AbortSignal.timeout(20000) });
                if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + base);
                const j = await res.json();
                source = base;
                return j;
            } catch (e) { lastErr = e; }
        }
        await new Promise(r => setTimeout(r, 1500));
    }
    throw lastErr;
}
const toCandle = k => ({ time: Math.floor(k[0] / 1000), open: +k[1], high: +k[2], low: +k[3], close: +k[4], closeTime: k[6] });

async function fetchKlines(symbol, interval, fromMs) {
    const out = [];
    let t = fromMs;
    const now = Date.now();
    for (let guard = 0; guard < 400; guard++) {
        const raw = await getJSON('/klines?symbol=' + symbol + '&interval=' + interval + '&startTime=' + t + '&limit=1000');
        if (!Array.isArray(raw) || raw.length === 0) break;
        for (const k of raw) out.push(toCandle(k));
        const last = raw[raw.length - 1];
        t = last[6] + 1;
        if (raw.length < 1000) break;
    }
    return out.filter(c => c.closeTime < now);
}

function aggregate(c1h, hours) {
    const size = hours * 3600, out = [];
    let cur = null;
    for (const c of c1h) {
        const b = Math.floor(c.time / size) * size;
        if (!cur || cur.time !== b) {
            if (cur && cur.n === hours) out.push(cur);
            cur = { time: b, open: c.open, high: c.high, low: c.low, close: c.close, closeTime: c.closeTime, n: 1 };
        } else {
            cur.high = Math.max(cur.high, c.high); cur.low = Math.min(cur.low, c.low);
            cur.close = c.close; cur.closeTime = c.closeTime; cur.n++;
        }
    }
    if (cur && cur.n === hours) out.push(cur);
    return out.map(c => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close, closeTime: c.closeTime }));
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
    let prev = START_CASH;
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
            cash -= cost; val -= cost;
        }
        let v2 = cash; for (const s in units) if (units[s] && M.px[s][i] !== null) v2 += units[s] * M.px[s][i];
        eq[i] = v2; dailyRet.push(v2 / prev - 1); prev = v2;
    }
    return { eq, from };
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

async function main() {
    const sets = [];
    for (const sym of SYMBOLS) {
        try {
            const d = await fetchKlines(sym, '1d', Date.UTC(START_YEAR, 0, 1));
            if (d.length > 400) { sets.push({ sym, d }); console.log(sym + ' ' + d.length + ' dagar'); }
        } catch (e) { console.log(sym + ' hoppas över: ' + e.message); }
    }
    if (sets.length < 3) throw new Error('För få valutor');
    const M = buildMatrix(sets);
    const FROM = 250;                       // första dag vi handlar (så att medelvärden hinner bli giltiga)
    const MID = FROM + Math.floor((M.n - FROM) / 2);
    const avail = i => M.syms.filter(s => M.px[s][i] !== null && M.px[s][i - 1] !== null);

    const strategies = [];
    // Riktmärken
    strategies.push({ name: 'Buy & hold BTC', kind: 'bench', w: () => ({ BTCUSDT: 1 }), reb: 100000 });
    strategies.push({ name: 'Buy & hold lika delar (månadsvis ombalans)', kind: 'bench', w: i => { const a = avail(i); const o = {}; a.forEach(s => o[s] = 1 / a.length); return o; }, reb: 30 });
    // Momentum
    for (const L of [30, 60, 90, 120]) for (const N of [1, 2, 3]) for (const F of [0, 100, 200]) for (const vt of [0, 0.5]) {
        strategies.push({
            name: 'Momentum ' + L + 'd, topp ' + N + (F ? ', trendfilter ' + F : ', utan filter') + (vt ? ', volatilitetsstyrd' : ''), kind: 'mom', reb: 7, vt,
            w: i => {
                const c = [];
                for (const s of M.syms) { const r = retAt(M.px[s], i, L); if (r === null) continue; if (F) { const m = smaAt(M.px[s], i, F); if (m === null || M.px[s][i] <= m) continue; } if (r <= 0) continue; c.push([s, r]); }
                c.sort((a, b) => b[1] - a[1]);
                const top = c.slice(0, N), o = {}; top.forEach(x => o[x[0]] = 1 / N); return o;
            }
        });
    }
    // Korg med trendfilter per valuta (varje valuta har en plats i korgen)
    for (const F of [50, 100, 200]) for (const vt of [0, 0.5]) {
        strategies.push({
            name: 'Trendkorg (varje valuta över SMA ' + F + ')' + (vt ? ', volatilitetsstyrd' : ''), kind: 'basket', reb: 1, vt,
            w: i => { const a = avail(i); const o = {}; for (const s of a) { const m = smaAt(M.px[s], i, F); if (m !== null && M.px[s][i] > m) o[s] = 1 / a.length; } return o; }
        });
    }
    // Marknadsfilter: lika delar bara när BTC ligger över sitt medelvärde
    for (const F of [100, 200]) for (const vt of [0, 0.5]) {
        strategies.push({
            name: 'Lika delar när BTC > SMA ' + F + (vt ? ', volatilitetsstyrd' : ''), kind: 'regime', reb: 7, vt,
            w: i => { const m = smaAt(M.px.BTCUSDT, i, F); if (m === null || M.px.BTCUSDT[i] <= m) return {}; const a = avail(i); const o = {}; a.forEach(s => o[s] = 1 / a.length); return o; }
        });
    }

    const rows = strategies.map(st => {
        const r = runPortfolio(M, st.w, st.reb, FROM, st.vt);
        return { name: st.name, kind: st.kind, full: metrics(r.eq, FROM, M.n), is: metrics(r.eq, FROM, MID), oos: metrics(r.eq, MID, M.n), eq: r.eq };
    }).filter(r => r.full);

    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, 'portfolio.json'), JSON.stringify(rows.map(({ eq, ...x }) => x)));
    const md = report(rows, M, FROM, MID);
    fs.writeFileSync(path.join(OUT_DIR, 'REPORT-PORTFOLIO.md'), md);
    console.log(md);
}

function report(rows, M, FROM, MID) {
    const L = [], P = s => L.push(s);
    const d = i => new Date((M.t0 + i * DAY) * 1000).toISOString().slice(0, 10);
    const bench = rows.filter(r => r.kind === 'bench'), btc = bench[0], eqw = bench[1];
    P('# Portföljtest: rotation mellan flera valutor');
    P('');
    P('Skapad ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC. Period ' + d(FROM) + ' – ' + d(M.n - 1) + ' (delningsdatum för håll-ut-test: ' + d(MID) + '). Valutor: ' + M.syms.map(s => s.replace('USDT', '')).join(', ') + '. Kostnad 0,15 % per handlad krona. Signaler fördröjda en dag.');
    P('**Överlevnadsfel:** valutorna är sådana som är stora idag. Det flatterar buy & hold och alla strategier som äger vinnare. Riktiga resultat framåt blir sannolikt sämre.');
    P('');
    P('Mått: CAGR = årlig tillväxt, Max ned = största nedgång, Calmar = CAGR / största nedgång (högre är bättre risk för pengarna), Sharpe = avkastning per svängning.');
    P('');
    P('## Riktmärken');
    P('');
    P('| | Total | CAGR | Max ned | Sharpe | Calmar |'); P('|---|---|---|---|---|---|');
    for (const b of bench) P('| ' + b.name + ' | ' + f0(b.full.tot) + ' % | ' + f0(b.full.cagr) + ' % | -' + f0(b.full.dd) + ' % | ' + f2(b.full.sharpe) + ' | ' + f2(b.full.calmar) + ' |');
    P('');
    const strat = rows.filter(r => r.kind !== 'bench');
    P('## Topp 12 av ' + strat.length + ' strategier (efter Calmar, hela perioden)');
    P('');
    P('| Strategi | Total | CAGR | Max ned | Sharpe | Calmar |'); P('|---|---|---|---|---|---|');
    for (const r of [...strat].sort((a, b) => b.full.calmar - a.full.calmar).slice(0, 12)) P('| ' + r.name + ' | ' + f0(r.full.tot) + ' % | ' + f0(r.full.cagr) + ' % | -' + f0(r.full.dd) + ' % | ' + f2(r.full.sharpe) + ' | ' + f2(r.full.calmar) + ' |');
    P('');
    P('## Robusthet: hur ser HELA rutnätet ut (inte bara de bästa)?');
    P('');
    P('| Familj | Antal | Median-CAGR | Median Max ned | Slår buy & hold BTC på Calmar (hela / 1:a halvan / 2:a halvan) | Slår lika delar på Calmar (hela / 1:a / 2:a) |'); P('|---|---|---|---|---|---|');
    const fam = { mom: 'Momentum', basket: 'Trendkorg', regime: 'Marknadsfilter' };
    const share = (arr, key, bm) => arr.filter(r => r[key] && bm[key] && r[key].calmar > bm[key].calmar).length;
    for (const k of Object.keys(fam)) {
        const a = strat.filter(r => r.kind === k);
        P('| ' + fam[k] + ' | ' + a.length + ' | ' + f0(median(a.map(r => r.full.cagr))) + ' % | -' + f0(median(a.map(r => r.full.dd))) + ' % | ' +
            ['full', 'is', 'oos'].map(x => share(a, x, btc) + '/' + a.length).join(' / ') + ' | ' + ['full', 'is', 'oos'].map(x => share(a, x, eqw) + '/' + a.length).join(' / ') + ' |');
    }
    P('');
    // håll-ut
    P('## Håll-ut-test');
    P('');
    P('Bästa strategin på första halvan (efter Calmar) och de 5 bästa, mätta på andra halvan som de inte sett.');
    P('');
    const byIS = [...strat].filter(r => r.is).sort((a, b) => b.is.calmar - a.is.calmar);
    P('| Strategi (vald på 1:a halvan) | Calmar 1:a | CAGR 2:a | Max ned 2:a | Calmar 2:a |'); P('|---|---|---|---|---|');
    for (const r of byIS.slice(0, 5)) P('| ' + r.name + ' | ' + f2(r.is.calmar) + ' | ' + f0(r.oos && r.oos.cagr) + ' % | -' + f0(r.oos && r.oos.dd) + ' % | ' + f2(r.oos && r.oos.calmar) + ' |');
    P('| *Buy & hold BTC (2:a halvan)* | | ' + f0(btc.oos.cagr) + ' % | -' + f0(btc.oos.dd) + ' % | ' + f2(btc.oos.calmar) + ' |');
    P('| *Lika delar (2:a halvan)* | | ' + f0(eqw.oos.cagr) + ' % | -' + f0(eqw.oos.dd) + ' % | ' + f2(eqw.oos.calmar) + ' |');
    P('');
    const top5 = byIS.slice(0, 5);
    const beatBtcOOS = top5.filter(r => r.oos && r.oos.calmar > btc.oos.calmar).length;
    const beatBtcRetOOS = top5.filter(r => r.oos && r.oos.cagr > btc.oos.cagr).length;
    P('## Slutsats (automatisk)');
    P('');
    const nBeatCal = share(strat, 'oos', btc);
    P('- Av ' + strat.length + ' strategier slog ' + nBeatCal + ' buy & hold BTC på avkastning per risk (Calmar) på andra halvan.');
    P('- De 5 som var bäst på första halvan slog BTC på Calmar i ' + beatBtcOOS + ' av 5 och på tillväxt (CAGR) i ' + beatBtcRetOOS + ' av 5 på andra halvan.');
    const medDD = median(strat.map(r => r.full.dd));
    P('- Mediannedgången var -' + f0(medDD) + ' % mot -' + f0(btc.full.dd) + ' % för buy & hold BTC: ' + (medDD < btc.full.dd ? 'strategierna minskade riskerna, som väntat.' : 'ingen minskning av riskerna.'));
    P('');
    P('Läs med försiktighet: många testade varianter ger risk för tur, få valutor och ett begränsat antal marknadscykler. Historik garanterar ingenting.');
    return L.join('\n');
}

main().catch(e => { console.error(e); process.exit(1); });
