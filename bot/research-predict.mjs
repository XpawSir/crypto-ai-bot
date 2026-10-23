// ============================================================
//  Test: prediktionsmarknader (Polymarket, endast läsning). Är utfall som kostar ≥ 90 öre 7 dagar före slut
//  underprissatta (köp och håll till avgörande)? Kalibrering per prisgrupp + enkel strategi.
//  Kriterier satta före körningen (strategin "köp utfall på 0,90–0,98 sju dagar före slut, håll till avgörande"):
//   minst 100 affärer, positiv avkastning efter 1 % kostnad per affär i hela urvalet OCH i båda halvorna (tidsmässigt).
//  Skriver research-out/REPORT-PREDICT.md.
// ============================================================
import fs from 'node:fs';
const OUT = process.env.RESEARCH_OUT || 'research-out', COST = 0.01, LEAD = 7 * 86400;
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; cryptoai-research)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function jget(url) {
    for (let k = 0; k < 4; k++) {
        try { const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(25000) }); if (r.ok) return await r.json(); if (r.status === 429) await sleep(1500 * (k + 1)); else throw new Error('HTTP ' + r.status); }
        catch (e) { if (k === 3) throw new Error(e.message + ' ' + url.slice(0, 90)); await sleep(500); }
    }
}
const parse = s => { try { return typeof s === 'string' ? JSON.parse(s) : s; } catch { return null; } };
const notes = [];
let markets = []; const rej = { total: 0, ids: 0, end: 0, px: 0 };
for (let w = 0; w < 18; w++) {                       // en månad i taget, så urvalet sprids över tid
    const hi = Date.now() - (2 + 30 * w) * 86400000, lo = hi - 30 * 86400000;
    for (let off = 0; off < 300; off += 100) {
        let page;
        try { page = await jget('https://gamma-api.polymarket.com/markets?closed=true&limit=100&offset=' + off + '&order=volumeNum&ascending=false&volume_num_min=20000&end_date_max=' + encodeURIComponent(new Date(hi).toISOString()) + '&end_date_min=' + encodeURIComponent(new Date(lo).toISOString())); } catch (e) { notes.push('Marknadslista: ' + e.message); break; }
        if (!Array.isArray(page) || !page.length) break;
        if (w === 0 && off === 0) notes.push('Exempel: ' + JSON.stringify(page[0]).slice(0, 300));
        for (const m of page) {
            rej.total++;
            const ids = parse(m.clobTokenIds), px = parse(m.outcomePrices), end = Date.parse(m.endDate), st0 = Date.parse(m.startDate);
            if (!ids || !px || ids.length !== 2 || px.length !== 2) { rej.ids++; continue; }
            if (!isFinite(end) || end > Date.now() - 86400000 || !isFinite(st0) || end - st0 < 14 * 86400000) { rej.end++; continue; }   // bara marknader som levt minst 14 dagar
            const p0 = +px[0], p1 = +px[1]; if (!((p0 > 0.99 && p1 < 0.01) || (p1 > 0.99 && p0 < 0.01))) { rej.px++; continue; }
            markets.push({ q: m.question, end: end / 1000, ids, win: p0 > 0.5 ? 0 : 1, vol: +m.volumeNum || 0 });
        }
        await sleep(150);
        if (page.length < 100) break;
    }
}
notes.push('Avgjorda marknader hittade: ' + markets.length + ' av ' + rej.total + ' (avvisade: id/pris ' + rej.ids + ', kort liv/slutdatum ' + rej.end + ', ej tydligt avgjord ' + rej.px + ')');
const obs = [];                      // en observation per utfall: pris vid T-7d, vann?
let noHist = 0, errs = 0;
for (const m of markets.slice(0, 900)) {
    const t = m.end - LEAD;
    try {
        const h = await jget('https://clob.polymarket.com/prices-history?market=' + m.ids[0] + '&startTs=' + Math.floor(t - 2 * 86400) + '&endTs=' + Math.floor(t + 86400) + '&fidelity=60');
        const hist = (h && h.history) || [];
        if (!hist.length) { noHist++; continue; }
        let best = hist[0]; for (const x of hist) if (Math.abs(x.t - t) < Math.abs(best.t - t)) best = x;
        if (Math.abs(best.t - t) > 86400) { noHist++; continue; }
        const p0 = best.p; if (!(p0 > 0.01 && p0 < 0.99)) { if (!(p0 > 0 && p0 < 1)) { noHist++; continue; } }
        obs.push({ end: m.end, p: p0, won: m.win === 0 ? 1 : 0, q: m.q });          // utfall 0
        obs.push({ end: m.end, p: 1 - p0, won: m.win === 1 ? 1 : 0, q: m.q });       // utfall 1 (approx. 1 − p0, ingen spread)
    } catch (e) { errs++; if (errs < 4) notes.push('Prishistorik: ' + e.message); }
    await sleep(120);
}
notes.push('Marknader med prishistorik: ' + obs.length / 2 + ' (utan: ' + noHist + ', fel: ' + errs + ')');
const L = ['# Test: prediktionsmarknader (Polymarket)', '', 'Pris 7 dagar före slut för avgjorda marknader, mot vad som faktiskt hände. Endast läsning av öppen data, ingen handel. Priset på det andra utfallet antas vara 1 minus första (ingen spread), vilket är snällt mot strategin.', ''];
const buckets = [[0, .1], [.1, .3], [.3, .5], [.5, .7], [.7, .9], [.9, .95], [.95, .98], [.98, 1.01]];
L.push('| Prisgrupp (vid T−7d) | Antal | Snittpris | Andel som vann | Skillnad (pe) |', '|---|---|---|---|---|');
for (const [a, b] of buckets) {
    const o = obs.filter(x => x.p >= a && x.p < b); if (!o.length) continue;
    const ap = o.reduce((s, x) => s + x.p, 0) / o.length, wr = o.reduce((s, x) => s + x.won, 0) / o.length;
    L.push(`| ${a.toFixed(2)}–${Math.min(b, 1).toFixed(2)} | ${o.length} | ${(ap * 100).toFixed(1)} % | ${(wr * 100).toFixed(1)} % | ${((wr - ap) * 100).toFixed(1)} |`);
}
function strat(lo, hi, from, to) {
    const o = obs.filter(x => x.p >= lo && x.p <= hi && x.end >= from && x.end < to); if (!o.length) return null;
    const r = o.map(x => (x.won ? 1 / x.p : 0) / (1 + COST) - 1), mean = r.reduce((s, v) => s + v, 0) / r.length;
    return { n: o.length, mean, wr: o.reduce((s, x) => s + x.won, 0) / o.length, worst: Math.min(...r) };
}
const ends = obs.map(x => x.end).sort((a, b) => a - b), mid = ends.length ? ends[Math.floor(ends.length / 2)] : 0, lo0 = ends[0] || 0, hi0 = (ends[ends.length - 1] || 0) + 1;
L.push('', '## Strategi: köp utfall som kostar 0,90–0,98 sju dagar före slut, håll till avgörande (kostnad 1 % per affär)', '', '| Period | Affärer | Vinstandel | Snittavkastning per affär | Värsta affär |', '|---|---|---|---|---|');
const rows = [['Hela urvalet', lo0, hi0], ['Första halvan (tid)', lo0, mid], ['Andra halvan (tid)', mid, hi0]], res = [];
for (const [nm, f, t] of rows) { const s = strat(0.9, 0.98, f, t); res.push(s); L.push(s ? `| ${nm} | ${s.n} | ${(s.wr * 100).toFixed(1)} % | ${(s.mean * 100).toFixed(2)} % | ${(s.worst * 100).toFixed(0)} % |` : `| ${nm} | 0 | – | – | – |`); }
const ok = res[0] && res[0].n >= 100 && res.every(s => s && s.mean > 0);
L.push('', 'Kriterier (satta före): minst 100 affärer, positiv avkastning efter 1 % kostnad i hela urvalet och i båda halvorna.', '', ok ? '**Strategin klarar kriterierna.** Ändå: en förlust tar ut ungefär tio vinster, urvalet är litet och marknader med låg omsättning är uteslutna.' : '**Strategin klarar inte kriterierna** (eller för få affärer). Då är den bara ett pappersexperiment utan belägg.', '');
L.push('## Anmärkningar', ...notes.map(n => '- ' + n), '- Urval: avgjorda marknader med omsättning över 20 000 USD, som levt minst 14 dagar, högst 300 per månad (störst omsättning först), och tydligt resultat. Marknader som annullerats eller blev oklara saknas, vilket kan göra resultatet snällare än verkligheten.', '- Historik garanterar inget. Ingen riktig handel.');
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(OUT + '/REPORT-PREDICT.md', L.join('\n') + '\n');
fs.writeFileSync(OUT + '/predict.json', JSON.stringify({ updated: new Date().toISOString(), ok, rows: rows.map((r, i) => ({ period: r[0], ...(res[i] || {}) })) }));
console.log(L.join('\n'));
