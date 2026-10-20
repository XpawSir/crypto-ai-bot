// ============================================================
//  Test av kortare "allt eller inget"-regler för BTC och ETH (Yahoo Finance, dagliga stängningar).
//  Jämför botarnas gamla regler (långa medelvärden, del-storlekar) med de nya (korta, allt eller inget),
//  mot köp och behåll. Avgift 0,1 % + 0,02 % glidning per sida. Signalen använder data till och med
//  gårdagen och handlas på dagens stängning (en dags försening, så resultatet inte blir för snällt).
//  Varje valuta har en egen lika stor "hink" (ingen ombalansering mellan dem). Skriver research-out/REPORT-SELFCHECK.md.
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


const smaTarget = (px, L) => i => { const m = smaAt(px, i, L); return m !== null && px[i] > m ? 1 : 0; };
// Självgranskning: varje vecka jämförs botens regel (över 50-dagars medel, allt eller inget) med alla enkla längder 10–200 dagar,
// över de senaste 365 dagarna, 730 dagarna och hela historiken. Larm (GitHub-issue) bara om den nuvarande regeln hamnar i den sämsta tredjedelen
// i ALLA tre fönster för BTC och ETH. Inget ändras automatiskt – en människa (eller Claude i en ny session) beslutar. Det hindrar överanpassning till senaste veckans marknad.
async function main() {
    const sets = [];
    for (const sym of ['BTC-USD', 'ETH-USD']) sets.push({ sym, d: await fetchYahoo(sym, Date.UTC(2014, 0, 1)) });
    const M = align(sets, Date.UTC(2018, 0, 1) / 1000), N = M.n;
    const LENS = [10, 20, 30, 40, 50, 60, 80, 100, 120, 150, 200], CUR = 50;
    const windows = [['365 d', N - 365], ['730 d', N - 730], ['hela (' + ((N - 260) / 365).toFixed(1) + ' år)', 260]];
    const L = ['# Självgranskning av trendreglerna', '', 'Körd ' + new Date().toISOString().slice(0, 16) + ' UTC. Nuvarande regel: över ' + CUR + '-dagars medel, allt eller inget. Rangordning av ' + LENS.length + ' enkla längder (1 = bäst på Kalmar = tillväxt delat med värsta ras).', ''];
    let alarmCount = 0, rows = 0;
    for (const sym of ['BTC-USD', 'ETH-USD']) {
        L.push('## ' + sym, '', '| Fönster | Nuvarande: tillväxt/ras | Rank | Bästa längd | Köp och behåll |', '|---|---|---|---|---|');
        let bad = 0;
        for (const [name, from] of windows) {
            const res = LENS.map(l => ({ l, m: metrics(bucket(M.px[sym], smaTarget(M.px[sym], l), from, N).eq) })).filter(x => x.m);
            const bh = metrics(bucket(M.px[sym], () => 1, from, N).eq);
            res.sort((a, b) => b.m.calmar - a.m.calmar);
            const rank = res.findIndex(x => x.l === CUR) + 1, cur = res.find(x => x.l === CUR).m;
            if (rank > Math.ceil(res.length * 2 / 3)) bad++;
            L.push('| ' + name + ' | ' + f1(cur.cagr) + ' % / −' + f1(cur.dd) + ' % | ' + rank + ' av ' + res.length + ' | ' + res[0].l + ' d (' + f2(res[0].m.calmar) + ') | ' + f1(bh.cagr) + ' % / −' + f1(bh.dd) + ' % |');
        }
        L.push('');
        if (bad === windows.length) alarmCount++;
    }
    const alarm = alarmCount === 2;
    L.push('## Resultat', '', alarm ? '**LARM:** nuvarande regel ligger i sämsta tredjedelen i alla fönster för både BTC och ETH. Granska reglerna.' : 'Inget larm: nuvarande regel är inte genomgående dålig. Ingen ändring behövs.');
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, 'REPORT-SELFCHECK.md'), L.join('\n') + '\n');
    fs.writeFileSync(path.join(OUT_DIR, 'ALARM'), alarm ? '1' : '0');
    console.log(L.join('\n'));
}
main().catch(e => { console.error(e); process.exit(1); });
