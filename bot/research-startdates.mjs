// ============================================================
//  Test: hänger resultatet på startdatumet? Rullande fönster (1 och 2 år, ny start var 7:e dag).
//  Trendregel (över medelvärde, allt eller inget, ränta 3,5 % på kontanter, avgift 0,12 %/sida,
//  signal på gårdagens data) mot köp och behåll. Kriterier satta före körningen:
//   Robust = trenden har lägre värsta nedgång än köp och behåll i minst 80 % av fönstren
//            OCH slår köp och behåll i slutvärde i minst 50 % av fönstren.
//  Skriver research-out/REPORT-STARTDATES.md och startdates.json.
// ============================================================
import fs from 'node:fs';
const OUT = process.env.RESEARCH_OUT || 'research-out';
const COST = 0.0012, CASH = 0.035, DAY = 86400, UA = { 'User-Agent': 'Mozilla/5.0 (compatible; cryptoai-research)' };
async function fetchYahoo(sym, fromMs) {
    const res = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(sym) + '?period1=' + Math.floor(fromMs / 1000) + '&period2=' + Math.floor(Date.now() / 1000) + '&interval=1d', { headers: UA, signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error('Yahoo HTTP ' + res.status + ' ' + sym);
    const r = (await res.json()).chart.result[0], cl = r.indicators.quote[0].close, out = [];
    r.timestamp.forEach((t, i) => { if (cl[i] > 0) out.push({ time: t, close: cl[i] }); });
    return out;
}
function daily(d) { const t0 = d[0].time, n = Math.floor((d[d.length - 1].time - t0) / DAY) + 1, a = new Array(n).fill(null); for (const c of d) a[Math.floor((c.time - t0) / DAY)] = c.close; for (let i = 1; i < n; i++) if (a[i] === null) a[i] = a[i - 1]; return { t0, a }; }
const sma = (a, i, p) => { if (i < p - 1) return null; let s = 0; for (let k = i - p + 1; k <= i; k++) s += a[k]; return s / p; };
function trendEq(a, L, from, to) {            // equity-kurva i en hink, start 1
    let cash = 1, units = 0, prev = 0; const eq = [];
    for (let i = from; i < to; i++) {
        const m = sma(a, i - 1, L), t = m !== null && a[i - 1] > m ? 1 : 0;
        cash *= 1 + CASH / 365 * (1 - prev);
        const val = cash + units * a[i];
        if (t !== prev) { const diff = t * val - units * a[i], c = Math.abs(diff) * COST; cash -= diff + c; units += diff / a[i]; prev = t; }
        eq.push(cash + units * a[i]);
    }
    return eq;
}
const maxDD = eq => { let pk = 0, dd = 0; for (const v of eq) { pk = Math.max(pk, v); dd = Math.min(dd, v / pk - 1); } return dd; };
const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const pct = v => (v * 100).toFixed(1) + ' %';

const ASSETS = [['BTC-USD', 50], ['ETH-USD', 50], ['SPY', 100]];
const results = [], lines = ['# Test: hänger resultatet på startdatumet?', ''];
lines.push('Rullande fönster, ny start var 7:e dag. Trend = över medelvärde, allt eller inget, ränta 3,5 % på kontanter, avgift 0,12 %/sida, signal på gårdagens data.', '');
for (const [sym, L] of ASSETS) {
    const d = daily(await fetchYahoo(sym, Date.UTC(2014, 8, 20)));
    const a = d.a, n = a.length;
    for (const W of [365, 730]) {
        let wins = 0, ddWins = 0, N = 0; const diffs = [], trRet = [], bhRet = [], trDD = [], bhDD = [], worst = { diff: 1e9 };
        for (let s = L + 2; s + W < n; s += 7) {
            const te = trendEq(a, L, s, s + W), be = a.slice(s, s + W).map(x => x / a[s]);
            const tr = te[te.length - 1] - 1, bh = be[be.length - 1] - 1;
            N++; if (tr >= bh) wins++; if (maxDD(te) > maxDD(be)) ddWins++;
            diffs.push(tr - bh); trRet.push(tr); bhRet.push(bh); trDD.push(maxDD(te)); bhDD.push(maxDD(be));
            if (tr - bh < worst.diff) worst = { diff: tr - bh, start: new Date((d.t0 + s * DAY) * 1000).toISOString().slice(0, 10) };
        }
        const r = { sym, window: W / 365, rule: L, windows: N, firstDate: new Date((d.t0 + (L + 2) * DAY) * 1000).toISOString().slice(0, 10), beatHold: wins / N, lowerDD: ddWins / N, medTrend: med(trRet), medHold: med(bhRet), medDDtrend: med(trDD), medDDhold: med(bhDD), worstDiff: worst.diff, worstStart: worst.start, robust: ddWins / N >= 0.8 && wins / N >= 0.5 };
        results.push(r);
    }
}
lines.push('| Tillgång | Fönster | Antal | Trend slår köp och behåll (slutvärde) | Trend har lägre värsta nedgång | Median avkastning trend / köp och behåll | Median värsta nedgång trend / köp och behåll | Sämsta fönstret (skillnad, start) | Robust enligt kriterierna |', '|---|---|---|---|---|---|---|---|---|');
for (const r of results) lines.push(`| ${r.sym} (${r.rule}-d) | ${r.window} år | ${r.windows} | ${pct(r.beatHold)} | ${pct(r.lowerDD)} | ${pct(r.medTrend)} / ${pct(r.medHold)} | ${pct(r.medDDtrend)} / ${pct(r.medDDhold)} | ${(r.worstDiff * 100).toFixed(0)} pe, ${r.worstStart} | ${r.robust ? '**JA**' : 'nej'} |`);
lines.push('', 'Kriterier (satta före): lägre värsta nedgång i minst 80 % av fönstren OCH slår köp och behåll i slutvärde i minst 50 % av fönstren.', '', 'Fönstren överlappar varandra kraftigt, så de är inte oberoende prov. Perioden innehåller bara några få marknadscykler. Historik garanterar inget.');
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(OUT + '/REPORT-STARTDATES.md', lines.join('\n') + '\n');
fs.writeFileSync(OUT + '/startdates.json', JSON.stringify({ updated: new Date().toISOString(), results }, null, 1));
console.log(lines.join('\n'));
