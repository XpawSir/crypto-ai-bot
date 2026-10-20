// ============================================================
//  Test av "funding carry" (kassa och carry, deltaneutral) för BTC och ETH:
//  äg spot och korta samma belopp i evighetskontrakt (perpetual). Den korta sidan får (eller betalar) funding var 8:e timme.
//  Priset tar ut sig själv, kvar blir funding minus avgifter. Jämförs med att bara ligga i kontanter med ränta (3–4 %/år).
//
//  Data: provar flera publika källor (Binance, Bybit, OKX, Hyperliquid) och använder den som ger längst historik.
//  Förenklingar (se rapporten): baseringsvinst/förlust och marginalbehov räknas inte; 1x marginal på kortsidan (halva kapitalet i spot, halva som marginal);
//  ingen likvidationsrisk modellerad; motpartsrisk hos börsen räknas inte (FTX 2022 visar att den finns).
//
//  GODKÄNNANDEKRITERIER (satta INNAN resultatet sågs). Carry är kandidat för en pappersbot bara om:
//   1) nettoavkastning efter avgifter minst 2 procentenheter per år över kontantränta 3,5 % (alltså minst 5,5 % per år på hela kapitalet) i BÅDA halvorna av perioden,
//   2) värsta nedgång (funding-minus och avgifter) under 3 %,
//   3) gäller både BTC och ETH, inte bara en,
//   4) minst 2 års data.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = process.env.RESEARCH_OUT || 'research-out';
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; cryptoai-research)' };
const HOUR = 3600e3;
const CASH_RATE = 0.035;
const FEE_SPOT = 0.001, FEE_PERP = 0.0005, SLIP = 0.0002;      // per sida
const CYCLE_COST = 2 * (FEE_SPOT + FEE_PERP + 2 * SLIP);        // in + ut, båda benen, per krona nominell

const f1 = v => (v === null || !isFinite(v)) ? '–' : v.toFixed(1);
const f2 = v => (v === null || !isFinite(v)) ? '–' : v.toFixed(2);
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;

async function getJSON(url, opts) {
    const res = await fetch(url, Object.assign({ headers: UA, signal: AbortSignal.timeout(25000) }, opts || {}));
    if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url.slice(0, 60));
    return res.json();
}

// Returnerar [{t (ms), rate (per intervall), hours (intervallängd)}] äldst först
const SOURCES = {
    binance: async (coin, since) => {
        const out = []; let start = since;
        for (let k = 0; k < 40; k++) {
            const j = await getJSON('https://fapi.binance.com/fapi/v1/fundingRate?symbol=' + coin + 'USDT&limit=1000&startTime=' + start);
            if (!j.length) break;
            j.forEach(x => out.push({ t: x.fundingTime, rate: +x.fundingRate, hours: 8 }));
            start = j[j.length - 1].fundingTime + 1; if (j.length < 1000) break;
        }
        return out;
    },
    bybit: async (coin, since) => {
        const out = []; let end = Date.now();
        for (let k = 0; k < 60; k++) {
            const j = await getJSON('https://api.bybit.com/v5/market/funding/history?category=linear&symbol=' + coin + 'USDT&limit=200&endTime=' + end);
            const l = j.result && j.result.list || []; if (!l.length) break;
            l.forEach(x => out.push({ t: +x.fundingRateTimestamp, rate: +x.fundingRate, hours: 8 }));
            end = +l[l.length - 1].fundingRateTimestamp - 1; if (end < since) break;
        }
        return out.sort((a, b) => a.t - b.t).filter(x => x.t >= since);
    },
    okx: async (coin, since) => {
        const out = []; let after = '';
        for (let k = 0; k < 60; k++) {
            const j = await getJSON('https://www.okx.com/api/v5/public/funding-rate-history?instId=' + coin + '-USDT-SWAP&limit=100' + (after ? '&after=' + after : ''));
            const l = j.data || []; if (!l.length) break;
            l.forEach(x => out.push({ t: +x.fundingTime, rate: +x.realizedRate || +x.fundingRate, hours: 8 }));
            after = l[l.length - 1].fundingTime; if (+after < since) break;
        }
        return out.sort((a, b) => a.t - b.t).filter(x => x.t >= since);
    },
    hyperliquid: async (coin, since) => {
        const out = []; let start = since;
        for (let k = 0; k < 80; k++) {
            const j = await getJSON('https://api.hyperliquid.xyz/info', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, UA), body: JSON.stringify({ type: 'fundingHistory', coin, startTime: start }) });
            if (!Array.isArray(j) || !j.length) break;
            j.forEach(x => out.push({ t: x.time, rate: +x.fundingRate, hours: 1 }));
            start = j[j.length - 1].time + 1; if (j.length < 400) break;
        }
        return out;
    }
};

async function loadFunding(coin) {
    const since = Date.UTC(2019, 8, 1), tried = [];
    let best = null;
    for (const [name, fn] of Object.entries(SOURCES)) {
        try {
            const d = await fn(coin, since);
            const yrs = d.length > 1 ? (d[d.length - 1].t - d[0].t) / (365 * 24 * HOUR) : 0;
            tried.push(name + ': ' + d.length + ' punkter, ' + yrs.toFixed(1) + ' år');
            if (d.length > 100 && (!best || yrs > best.yrs)) best = { name, d, yrs };
        } catch (e) { tried.push(name + ': misslyckades (' + e.message + ')'); }
    }
    return { best, tried };
}

// Daglig funding per krona nominell (summerad över intervall)
function daily(d) {
    const m = new Map();
    for (const x of d) { const day = Math.floor(x.t / 86400e3); m.set(day, (m.get(day) || 0) + x.rate); }
    return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([day, r]) => ({ day, r }));
}

// Strategi: håll hedge när villkoret är uppfyllt. Kapital 1; nominell storlek 0,5 (halva i spot, halva marginal).
function simulate(days, rule) {
    let eq = 1, pos = false, peak = 1, dd = 0, trades = 0; const out = [];
    for (let i = 0; i < days.length; i++) {
        const want = rule(i, days);
        if (want !== pos) { eq -= 0.5 * CYCLE_COST / 2; pos = want; trades++; }   // halva kostnaden vid in, halva vid ut
        eq *= 1 + (pos ? 0.5 * days[i].r : CASH_RATE / 365);
        if (!pos) { /* kontantränta på hela kapitalet när ute ur hedgen */ } else { eq *= 1 + (0.5 * CASH_RATE / 365); }   // marginal-halvan antas ligga i kontanter/ränta; spot-halvan binds i hedgen
        out.push(eq); peak = Math.max(peak, eq); dd = Math.max(dd, (peak - eq) / peak);
    }
    return { eq: out, dd, trades };
}
function stats(eq, from, to, daysN) {
    const a = eq[from - 1] || 1, b = eq[to - 1], yrs = (to - from) / 365;
    let pk = a, dd = 0; for (let i = from; i < to; i++) { pk = Math.max(pk, eq[i - 1]); dd = Math.max(dd, (pk - eq[i - 1]) / pk); }
    return { cagr: (Math.pow(b / a, 1 / yrs) - 1) * 100, dd: dd * 100 };
}

async function main() {
    const L = ['# Test: funding carry (kassa och carry) för BTC och ETH', ''];
    const results = [];
    for (const coin of ['BTC', 'ETH']) {
        const { best, tried } = await loadFunding(coin);
        L.push('## ' + coin, '', 'Datakällor som provades: ' + tried.join('; ') + '.');
        if (!best) { L.push('', '**Ingen källa gav data.** Testet för ' + coin + ' kunde inte köras.', ''); results.push({ coin, ok: false }); continue; }
        const days = daily(best.d), n = days.length, mid = Math.floor(n / 2);
        const yrs = n / 365;
        const avgAnn = mean(days.map(x => x.r)) * 365 * 100;
        L.push('', 'Vald källa: **' + best.name + '**, ' + n + ' dagar (' + yrs.toFixed(1) + ' år). Genomsnittlig funding: ' + f1(avgAnn) + ' % per år på nominellt belopp. Andel dagar med negativ funding: ' + f1(100 * days.filter(x => x.r < 0).length / n) + ' %.', '');
        const rules = [
            { name: 'Alltid hedgad', f: () => true },
            { name: 'Hedgad när funding de senaste 7 dagarna är positiv', f: (i, d) => i >= 7 && mean(d.slice(i - 7, i).map(x => x.r)) > 0 },
            { name: 'Hedgad när funding de senaste 7 dagarna är över 10 % per år', f: (i, d) => i >= 7 && mean(d.slice(i - 7, i).map(x => x.r)) * 365 > 0.10 },
            { name: 'Hedgad när funding de senaste 30 dagarna är över 5 % per år', f: (i, d) => i >= 30 && mean(d.slice(i - 30, i).map(x => x.r)) * 365 > 0.05 }
        ];
        L.push('| Regel | Nettoavkastning/år (hela) | Värsta nedgång | Affärer | 1:a halvan/år | 2:a halvan/år |', '|---|---|---|---|---|---|');
        const rows = [];
        for (const r of rules) {
            const s = simulate(days, r.f), all = stats(s.eq, 31, n, n), h1 = stats(s.eq, 31, mid, n), h2 = stats(s.eq, mid, n, n);
            rows.push({ r, all, h1, h2, dd: s.dd, trades: s.trades });
            L.push('| ' + r.name + ' | ' + f1(all.cagr) + ' % | −' + f2(s.dd * 100) + ' % | ' + s.trades + ' | ' + f1(h1.cagr) + ' % | ' + f1(h2.cagr) + ' % |');
        }
        L.push('', 'Jämförelse: bara kontanter med ränta ger ' + (CASH_RATE * 100).toFixed(1) + ' % per år.', '');
        const c1 = rows.some(x => x.h1.cagr >= CASH_RATE * 100 + 2 && x.h2.cagr >= CASH_RATE * 100 + 2);
        const best1 = rows.filter(x => x.h1.cagr >= CASH_RATE * 100 + 2 && x.h2.cagr >= CASH_RATE * 100 + 2 && x.dd < 0.03).sort((a, b) => b.all.cagr - a.all.cagr)[0];
        results.push({ coin, ok: true, yrs, c1, c2: !!best1, best: best1, source: best.name });
    }
    L.push('## Godkännandekriterier (satta före testet)', '', '| Valuta | Källa | Minst 2 års data | Slår kontantränta +2 pe i båda halvor, nedgång < 3 % | Bästa regel |', '|---|---|---|---|---|');
    for (const r of results) L.push('| ' + r.coin + ' | ' + (r.source || '–') + ' | ' + (r.ok && r.yrs >= 2 ? 'ja' : 'nej') + ' | ' + (r.ok && r.c2 ? 'ja' : 'nej') + ' | ' + (r.best ? r.best.r.name + ' (' + f1(r.best.all.cagr) + ' %/år)' : '–') + ' |');
    const pass = results.length === 2 && results.every(r => r.ok && r.yrs >= 2 && r.c2);
    L.push('', '## Slutsats', '', pass ? '**Både BTC och ETH klarar kriterierna.** Carry kan prövas som pappersbot. Kom ihåg att motpartsrisk hos börsen, marginalbehov och baseringsrisk inte är modellerade.' : '**Carry klarar inte alla kriterier.** Då läggs ingen carry-bot på sajten som lösning för att tjäna pengar. Se tabellerna ovan för skälen.');
    L.push('', 'Förenklingar: baseringsvinst/förlust, marginalsamtal och likvidation modelleras inte; motpartsrisk hos börsen (FTX 2022) ingår inte; avgifterna är för en vanlig kund utan rabatt; kontantränta 3,5 % antas på kapital som inte är bundet. Historik garanterar inget.');
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, 'REPORT-CARRY.md'), L.join('\n') + '\n');
    console.log(L.join('\n'));
}
main().catch(e => { console.error(e); process.exit(1); });
