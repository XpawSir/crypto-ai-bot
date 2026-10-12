// ============================================================
//  CryptoAI forskning – ärligt test av strategierna mot "köp och behåll".
//  Körs av GitHub Actions (workflow "Research"). Hämtar riktig historik från Binance (publik data),
//  kör alla strategier med samma regler som boten (ATR-stop/TP, 0,1 % avgift per sida),
//  och skriver REPORT.md + results.json.
//
//  Tester:
//   A) Alla strategier x risknivåer x symboler x tidsintervall över hela perioden, mot buy & hold.
//   B) Slumpkoll: slumpmässiga köp med samma stop/TP. Om en strategi inte slår slumpen har den ingen egen förmåga.
//   C) AUTO "walk-forward": väljer strategi bara utifrån data fram till varje ögonblick (ingen framtid).
//   D) Håll-ut-test: välj bästa strategierna på första halvan, mät dem på andra halvan (som de aldrig sett).
//   E) År för år: hur ofta slår AUTO buy & hold.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import {
    STRATEGIES, AUTO_POOL, BASE_IDS, FEE, AUTO_REEVAL, AUTO_WINDOW,
    prepare, pickBest, simulate, riskMultFor, setDecimals
} from './engine.mjs';

const OUT_DIR = process.env.RESEARCH_OUT || 'research-out';
const SOURCES = (process.env.RESEARCH_API_BASES
    ? process.env.RESEARCH_API_BASES.split(',')
    : ['https://data-api.binance.vision/api/v3', 'https://api.binance.com/api/v3', 'https://api.binance.us/api/v3']);
const SYMBOLS = (process.env.RESEARCH_SYMS || 'BTCUSDT,ETHUSDT,SOLUSDT,XRPUSDT').split(',');
const START_YEAR = +(process.env.RESEARCH_START_YEAR || 2019);
const RISKS = [2, 5, 8];
const WARMUP = 800; // gemensam startpunkt för alla tester så att resultaten går att jämföra
const MS = { '15m': 900e3, '1h': 3600e3, '4h': 14400e3 };

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

// ---------- Mått ----------
function buyHold(d, from, to) {
    const e = d[from].close;
    let peak = e, dd = 0;
    for (let i = from; i < to; i++) { peak = Math.max(peak, d[i].close); dd = Math.max(dd, (peak - d[i].close) / peak * 100); }
    return { net: ((d[to - 1].close / e) * (1 - FEE) * (1 - FEE) - 1) * 100, maxDD: dd };
}
const score = r => r.net - 0.5 * r.maxDD;
const calmar = r => r.net / Math.max(r.maxDD, 1);
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const f1 = v => (v === null || v === undefined || !isFinite(v)) ? '–' : (v >= 0 ? '+' : '') + v.toFixed(1);
const f0 = v => (v === null || v === undefined || !isFinite(v)) ? '–' : v.toFixed(0);

function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function randomBaseline(d, ctx, from, to, rm, prob) {
    const res = [];
    for (let s = 1; s <= 8; s++) {
        const r = rng(s * 7919);
        const buy = new Array(d.length).fill(false);
        for (let i = from; i < to; i++) buy[i] = r() < prob;
        res.push(simulate({ buy, sell: new Array(d.length).fill(false) }, d, ctx.atr, from, to, rm));
    }
    return { net: mean(res.map(x => x.net)), maxDD: mean(res.map(x => x.maxDD)), trades: mean(res.map(x => x.trades)) };
}

function runAuto(d, ctx, from, to, rm) {
    let current = null, lastPick = -1e9;
    const picks = {};
    const getSig = i => {
        if (i - lastPick >= AUTO_REEVAL) {
            lastPick = i;
            const win = Math.min(AUTO_WINDOW, i - 200);
            const p = pickBest(ctx, d, i, win, rm, current);
            current = p.id;
        }
        if (current) picks[current] = (picks[current] || 0) + 1;
        return current ? ctx.sigs[current] : null;
    };
    const r = simulate(getSig, d, ctx.atr, from, to, rm);
    r.picks = picks;
    return r;
}

const yearOf = c => new Date(c.time * 1000).getUTCFullYear();

// ---------- Huvudprogram ----------
async function main() {
    const t0 = Date.now();
    const datasets = []; // {sym, tf, d}
    for (const sym of SYMBOLS) {
        console.log('Hämtar ' + sym + ' 1h från ' + START_YEAR + '...');
        const h1 = await fetchKlines(sym, '1h', Date.UTC(START_YEAR, 0, 1));
        console.log('  ' + h1.length + ' candles, källa ' + source);
        if (h1.length < WARMUP + 1500) { console.log('  för lite data, hoppar över'); continue; }
        datasets.push({ sym, tf: '1h', d: h1 });
        datasets.push({ sym, tf: '4h', d: aggregate(h1, 4) });
        // 15 minuter: bara de senaste 2 åren (annars blir det väldigt mycket data)
        const from15 = Math.max(Date.UTC(START_YEAR, 0, 1), Date.now() - 2 * 365 * 86400e3);
        console.log('Hämtar ' + sym + ' 15m...');
        const m15 = await fetchKlines(sym, '15m', from15);
        console.log('  ' + m15.length + ' candles');
        if (m15.length > WARMUP + 1500) datasets.push({ sym, tf: '15m', d: m15 });
    }
    if (!datasets.length) throw new Error('Ingen data kunde hämtas');

    const results = [];   // en rad per dataset
    for (const ds of datasets) {
        setDecimals(2);
        const { sym, tf, d } = ds;
        const ctx = prepare(d);
        const n = d.length, from = WARMUP, to = n;
        const bh = buyHold(d, from, to);
        const row = {
            sym, tf, candles: n,
            period: new Date(d[from].time * 1000).toISOString().slice(0, 10) + ' – ' + new Date(d[to - 1].time * 1000).toISOString().slice(0, 10),
            bh, byRisk: {}
        };
        for (const risk of RISKS) {
            const rm = riskMultFor(risk);
            const strat = {};
            for (const id of BASE_IDS) strat[id] = simulate(ctx.sigs[id], d, ctx.atr, from, to, rm);
            const nets = BASE_IDS.map(id => strat[id].trades);
            const prob = Math.min(0.2, Math.max(0.002, mean(nets) / Math.max(1, (to - from)) * 3));
            const rnd = randomBaseline(d, ctx, from, to, rm, prob);
            const auto = runAuto(d, ctx, from, to, rm);
            // år för år för AUTO och buy & hold
            const years = {};
            const ys = [...new Set(d.slice(from).map(yearOf))];
            for (const y of ys) {
                const idx = []; for (let i = from; i < to; i++) if (yearOf(d[i]) === y) idx.push(i);
                if (idx.length < 24 * (tf === '15m' ? 4 : tf === '4h' ? 0.25 : 1) * 60) continue;
                const a = idx[0], b = idx[idx.length - 1] + 1;
                years[y] = { bh: buyHold(d, a, b) };
            }
            // AUTO per år: kör om med delad "pick"-logik över årsfönstret (väljer ändå bara med data före)
            for (const y of Object.keys(years)) {
                const idx = []; for (let i = from; i < to; i++) if (yearOf(d[i]) === +y) idx.push(i);
                years[y].auto = runAuto(d, ctx, Math.max(idx[0], from), idx[idx.length - 1] + 1, rm);
            }
            // håll-ut-test: rangordna på första halvan, mät på andra
            const mid = from + Math.floor((to - from) / 2);
            const isRes = {}, oosRes = {};
            for (const id of BASE_IDS) {
                isRes[id] = simulate(ctx.sigs[id], d, ctx.atr, from, mid, rm);
                oosRes[id] = simulate(ctx.sigs[id], d, ctx.atr, mid, to, rm);
            }
            const ranked = BASE_IDS.filter(id => isRes[id].trades >= 5).sort((a, b) => score(isRes[b]) - score(isRes[a]));
            const top = ranked.slice(0, 3);
            const bhOOS = buyHold(d, mid, to);
            row.byRisk[risk] = {
                strat, random: rnd, auto,
                years,
                holdout: {
                    top, topIS: top.map(id => isRes[id]), topOOS: top.map(id => oosRes[id]),
                    allOOSMean: mean(BASE_IDS.map(id => oosRes[id].net)), allOOSMedian: median(BASE_IDS.map(id => oosRes[id].net)),
                    bhOOS, midDate: new Date(d[mid].time * 1000).toISOString().slice(0, 10)
                }
            };
        }
        results.push(row);
        console.log('Klar: ' + sym + ' ' + tf + ' (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s)');
    }

    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify({ generated: new Date().toISOString(), source, results }));
    const md = buildReport(results);
    fs.writeFileSync(path.join(OUT_DIR, 'REPORT.md'), md);
    console.log(md);
}

// ---------- Rapport ----------
function buildReport(results) {
    const L = [];
    const P = s => L.push(s);
    P('# CryptoAI – forskningsrapport');
    P('');
    P('Skapad: ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC. Data: Binance (publik), ' + results.map(r => r.sym + ' ' + r.tf).join(', ') + '.');
    P('Alla affärer följer botens regler: signal på stängd candle, ATR-stop och take-profit, 0,1 % avgift per sida, hela kapitalet i varje affär (ränta på ränta). Allt är simulering, inga riktiga pengar.');
    P('');
    P('"Buy & hold" = köp i början och sitta still hela tiden. Det är måttstocken: en strategi är bara värd något om den slår den efter avgifter och helst med mindre nedgångar.');
    P('');

    const RK = 5;
    // --- 1. Översikt
    P('## 1. Översikt (risk ' + RK + ')');
    P('');
    P('| Marknad | Period | Buy & hold | (största nedgång) | AUTO | (nedgång) | affärer | Slump-köp | Median av alla strategier |');
    P('|---|---|---|---|---|---|---|---|---|');
    let autoBeatsNet = 0, autoBeatsCalmar = 0, autoPositive = 0;
    for (const r of results) {
        const x = r.byRisk[RK];
        const med = median(BASE_IDS.map(id => x.strat[id].net));
        if (x.auto.net > r.bh.net) autoBeatsNet++;
        if (calmar(x.auto) > calmar(r.bh)) autoBeatsCalmar++;
        if (x.auto.net > 0) autoPositive++;
        P('| ' + r.sym + ' ' + r.tf + ' | ' + r.period + ' | ' + f0(r.bh.net) + ' % | -' + f0(r.bh.maxDD) + ' % | ' + f0(x.auto.net) + ' % | -' + f0(x.auto.maxDD) + ' % | ' + x.auto.trades +
            ' | ' + f0(x.random.net) + ' % | ' + f0(med) + ' % |');
    }
    P('');
    P('AUTO slog buy & hold på avkastning i **' + autoBeatsNet + ' av ' + results.length + '** marknader, på avkastning per risk (avkastning / största nedgång) i **' + autoBeatsCalmar + ' av ' + results.length + '**, och var plus i ' + autoPositive + ' av ' + results.length + '.');
    P('');

    // --- 2. Strategi-ranking
    P('## 2. Strategierna var för sig (alla risknivåer, alla marknader)');
    P('');
    P('"Slår B&H" = i hur många av alla tester (marknad x risknivå) strategin hade högre avkastning än buy & hold. "Slår slump" = högre än slumpköp med samma stop/TP. "Plus" = avkastning över 0.');
    P('');
    P('| Strategi | Typ | Snitt-avkastning | Median | Slår B&H | Slår slump | Plus | Snitt största nedgång | Snitt affärer |');
    P('|---|---|---|---|---|---|---|---|---|');
    const rows = BASE_IDS.map(id => {
        const nets = [], dds = [], tr = [];
        let beatBH = 0, beatRnd = 0, pos = 0, tot = 0;
        for (const r of results) for (const risk of RISKS) {
            const x = r.byRisk[risk], s = x.strat[id];
            nets.push(s.net); dds.push(s.maxDD); tr.push(s.trades); tot++;
            if (s.net > r.bh.net) beatBH++;
            if (s.net > x.random.net) beatRnd++;
            if (s.net > 0) pos++;
        }
        return { id, mean: mean(nets), med: median(nets), beatBH, beatRnd, pos, tot, dd: mean(dds), tr: mean(tr) };
    }).sort((a, b) => b.mean - a.mean);
    for (const x of rows) P('| ' + STRATEGIES[x.id].name + ' | ' + STRATEGIES[x.id].kind + ' | ' + f1(x.mean) + ' % | ' + f1(x.med) + ' % | ' + x.beatBH + '/' + x.tot + ' | ' + x.beatRnd + '/' + x.tot + ' | ' + x.pos + '/' + x.tot + ' | -' + f0(x.dd) + ' % | ' + f0(x.tr) + ' |');
    P('');

    // --- 3. Håll-ut-test
    P('## 3. Håll-ut-testet: fungerar det att välja "bästa" strategin i efterhand?');
    P('');
    P('Perioden delas på mitten. De 3 bästa strategierna på första halvan väljs ut, och mäts sedan på andra halvan som de aldrig "sett". Om historiskt bra betyder framtida bra ska de ligga över snittet.');
    P('');
    P('| Marknad | Delningsdatum | Valda | Deras avkastning 2:a halvan | Snitt av ALLA strategier 2:a halvan | Buy & hold 2:a halvan |');
    P('|---|---|---|---|---|---|');
    let hoBeatAll = 0, hoBeatBH = 0, hoTot = 0;
    for (const r of results) {
        const h = r.byRisk[RK].holdout;
        if (!h.top.length) continue;
        const topMean = mean(h.topOOS.map(x => x.net));
        hoTot++; if (topMean > h.allOOSMean) hoBeatAll++; if (topMean > h.bhOOS.net) hoBeatBH++;
        P('| ' + r.sym + ' ' + r.tf + ' | ' + h.midDate + ' | ' + h.top.map(id => STRATEGIES[id].name).join(', ') + ' | ' + f1(topMean) + ' % | ' + f1(h.allOOSMean) + ' % | ' + f1(h.bhOOS.net) + ' % |');
    }
    P('');
    P('De utvalda slog snittet av alla strategier i **' + hoBeatAll + ' av ' + hoTot + '** fall och buy & hold i **' + hoBeatBH + ' av ' + hoTot + '**. Slumpen ger ungefär hälften, så mycket över det tyder på riktig förmåga, nära hälften tyder på att urvalet mest var tur.');
    P('');

    // --- 4. År för år
    P('## 4. AUTO år för år mot buy & hold (risk ' + RK + ')');
    P('');
    const yearsAll = [...new Set(results.flatMap(r => Object.keys(r.byRisk[RK].years)))].sort();
    P('| Marknad | ' + yearsAll.join(' | ') + ' |');
    P('|---|' + yearsAll.map(() => '---').join('|') + '|');
    let yBeat = 0, yTot = 0, yBeatDownYears = 0, yDownYears = 0;
    for (const r of results) {
        const ys = r.byRisk[RK].years;
        P('| ' + r.sym + ' ' + r.tf + ' | ' + yearsAll.map(y => ys[y] ? 'AUTO ' + f0(ys[y].auto.net) + ' / B&H ' + f0(ys[y].bh.net) : '–').join(' | ') + ' |');
        for (const y of Object.keys(ys)) {
            yTot++; if (ys[y].auto.net > ys[y].bh.net) yBeat++;
            if (ys[y].bh.net < 0) { yDownYears++; if (ys[y].auto.net > ys[y].bh.net) yBeatDownYears++; }
        }
    }
    P('');
    P('(Procent. AUTO / buy & hold.) AUTO slog buy & hold i ' + yBeat + ' av ' + yTot + ' marknadsår. I år då marknaden föll slog den buy & hold i ' + yBeatDownYears + ' av ' + yDownYears + '.');
    P('');

    // --- 5. Snabbt vs långsamt
    P('## 5. Hjälper det att handla snabbare?');
    P('');
    P('| Tidsintervall | Snitt AUTO-avkastning | Snitt buy & hold | Snitt affärer | Snitt avgifter (andel av kapitalet, ca) |');
    P('|---|---|---|---|---|');
    for (const tf of ['15m', '1h', '4h']) {
        const rs = results.filter(r => r.tf === tf);
        if (!rs.length) continue;
        const a = mean(rs.map(r => r.byRisk[RK].auto.net)), b = mean(rs.map(r => r.bh.net)), t = mean(rs.map(r => r.byRisk[RK].auto.trades));
        P('| ' + tf + ' | ' + f1(a) + ' % | ' + f1(b) + ' % | ' + f0(t) + ' | ' + f0(t * 0.2) + ' % |');
    }
    P('');
    P('Obs: 15m täcker bara de senaste två åren, så jämför kolumnen mot buy & hold för samma period, inte mot 1h/4h-raderna.');
    P('');

    // --- 6. Dom
    P('## 6. Slutsats (automatiskt genererad ur siffrorna ovan)');
    P('');
    const verdict = [];
    if (autoBeatsNet >= results.length * 0.7) verdict.push('AUTO slog buy & hold på avkastning i de flesta marknader.');
    else if (autoBeatsNet <= results.length * 0.3) verdict.push('AUTO slog **inte** buy & hold på avkastning i de flesta marknader.');
    else verdict.push('AUTO slog buy & hold på avkastning i ungefär hälften av marknaderna, alltså inget tydligt övertag.');
    if (autoBeatsCalmar >= results.length * 0.6) verdict.push('På avkastning i förhållande till nedgångar (risk) var AUTO bättre än buy & hold i de flesta marknader. Det är den ärliga styrkan: mindre svängningar, inte nödvändigtvis mer pengar.');
    else verdict.push('Inte heller risken per avkastad krona var tydligt bättre än buy & hold.');
    if (hoTot) {
        if (hoBeatBH >= hoTot * 0.6) verdict.push('Håll-ut-testet: de på förhand utvalda strategierna slog även buy & hold i de flesta marknader.');
        else if (hoBeatAll >= hoTot * 0.7) verdict.push('Håll-ut-testet: de utvalda strategierna förlorade mindre än genomsnittet av alla strategier (' + hoBeatAll + ' av ' + hoTot + '), men slog buy & hold bara i ' + hoBeatBH + ' av ' + hoTot + '. Att välja bland strategier hjälper alltså lite, men räcker inte för att slå att bara köpa och behålla.');
        else verdict.push('Håll-ut-testet: historiskt bra strategier var INTE pålitligt bra efteråt, tecken på att tidigare vinster till stor del var tur eller anpassning till just den perioden.');
    }
    const fastWorse = results.filter(r => r.tf === '1h').length && mean(results.filter(r => r.tf === '1h').map(r => r.byRisk[RK].auto.net)) < mean(results.filter(r => r.tf === '4h').map(r => r.byRisk[RK].auto.net));
    if (fastWorse) verdict.push('Att handla snabbare (1h) gav sämre resultat än långsammare (4h): avgifterna och falska signaler äter upp vinsterna.');
    for (const v of verdict) P('- ' + v);
    P('');
    P('**Viktigt:** historik garanterar ingenting. Kryptomarknaden har haft både extrema uppgångar och fall under perioden, och resultaten beror mycket på just den. Testerna använder inga inställningar som trimmats mot datan (strategiernas parametrar är standardvärden), men att jag tittar på många strategier ökar ändå risken att någon ser bra ut av ren slump. Använd inte detta som finansiell rådgivning.');
    return L.join('\n');
}

main().catch(e => { console.error(e); process.exit(1); });
