// ============================================================
//  Forskning: funding-arbitrage (köp spot + sälj lika mycket perpetual-terminer).
//  Priset tar ut sig självt; man får (eller betalar) funding var 8:e timme.
//  Kapital: hälften i spot, hälften som säkerhet för en 1x kort termin (ingen hävstång, låg risk för likvidering).
//  Avkastning per dag = 0,5 × (spotavkastning − terminsavkastning + summa funding för dagen) − kostnader.
//  Kostnader: in/ut 0,1 % spot + 0,05 % termin per sida, daglig ombalansering av hedgen 0,01 %.
//  Data: Binance spot + USDⓈ-M perpetual (publika API).
// ============================================================
import fs from 'node:fs';

const SPOT = process.env.SPOT_BASE || 'https://data-api.binance.vision/api/v3';
const FUT = process.env.FUT_BASE || 'https://fapi.binance.com/fapi/v1';
const COINS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT'];
const DAY = 86400000, ENTRY = 0.001 + 0.0005, REBAL = 0.0001;
const OUT = 'research-out';

async function get(url) {
    for (let i = 0; i < 4; i++) {
        try { const r = await fetch(url, { signal: AbortSignal.timeout(20000) }); if (r.ok) return r.json(); console.log('HTTP', r.status, url); if (r.status === 451 || r.status === 403) throw new Error('blockerad ' + r.status); } catch (e) { console.log('fel', e.message); }
        await new Promise(r => setTimeout(r, 1500));
    }
    throw new Error('misslyckades: ' + url);
}
import { execFileSync } from 'node:child_process';
const VISION = 'https://data.binance.vision/data/futures/um/monthly';
async function klines(base, sym) {
    let start = Date.UTC(2019, 8, 1), out = [];
    for (;;) {
        const k = await get(`${base}/klines?symbol=${sym}&interval=1d&limit=1000&startTime=${start}`);
        if (!k.length) break;
        out.push(...k.filter(x => x[6] < Date.now()).map(x => [x[0], +x[4]]));
        if (k.length < 1000) break; start = k[k.length - 1][0] + DAY;
    }
    return new Map(out);
}
// Månadsfiler (zip med CSV) från data.binance.vision. Rader som inte börjar med en siffra (rubriker) hoppas över.
async function visionRows(kind, sym) {
    const rows = [];
    for (let y = 2019, m = 9; ; m++) {
        if (m > 12) { m = 1; y++; }
        const ym = y + '-' + String(m).padStart(2, '0');
        if (Date.UTC(y, m - 1, 1) > Date.now() - 28 * DAY) break;
        const url = kind === 'funding' ? `${VISION}/fundingRate/${sym}/${sym}-fundingRate-${ym}.zip` : `${VISION}/klines/${sym}/1d/${sym}-1d-${ym}.zip`;
        try {
            const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
            if (!r.ok) continue;
            fs.writeFileSync('/tmp/f.zip', Buffer.from(await r.arrayBuffer()));
            const txt = execFileSync('unzip', ['-p', '/tmp/f.zip']).toString();
            for (const line of txt.split('\n')) { const c = line.split(','); if (/^\d/.test(c[0])) rows.push(c); }
        } catch (e) { console.log('fel', url, e.message); }
    }
    return rows;
}
async function futKlines(sym) {
    try { return await klines(FUT, sym); } catch (e) { console.log('fapi blockerad, använder månadsfiler'); }
    return new Map((await visionRows('klines', sym)).map(c => [+c[0], +c[4]]));
}
async function funding(sym) {
    let out = [];
    try {
        let start = Date.UTC(2019, 8, 1);
        for (;;) {
            const f = await get(`${FUT}/fundingRate?symbol=${sym}&limit=1000&startTime=${start}`);
            if (!f.length) break;
            out.push(...f.map(x => [x.fundingTime, +x.fundingRate]));
            if (f.length < 1000) break; start = f[f.length - 1][0] + 1;
        }
    } catch (e) {
        // CSV: calc_time, funding_interval_hours, last_funding_rate
        out = (await visionRows('funding', sym)).map(c => [+c[0], +c[c.length - 1]]);
    }
    const byDay = new Map();
    for (const [t, r] of out) { const d = Math.floor(t / DAY) * DAY; byDay.set(d, (byDay.get(d) || 0) + r); }
    return byDay;
}

// Vilka börser går att nå härifrån (för en framtida livebot)?
const probes = {
    'Binance terminer (fapi)': 'https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT',
    'Binance spot (data-api)': 'https://data-api.binance.vision/api/v3/ticker/bookTicker?symbol=BTCUSDT',
    'OKX funding': 'https://www.okx.com/api/v5/public/funding-rate?instId=BTC-USDT-SWAP',
    'Bybit tickers': 'https://api.bybit.com/v5/market/tickers?category=linear&symbol=BTCUSDT',
    'Kraken Futures': 'https://futures.kraken.com/derivatives/api/v3/tickers',
    'Deribit': 'https://www.deribit.com/api/v2/public/get_funding_rate_value?instrument_name=BTC-PERPETUAL&start_timestamp=' + (Date.now() - 86400000) + '&end_timestamp=' + Date.now(),
    'Hyperliquid': 'https://api.hyperliquid.xyz/info'
};
let probeMd = '\n## Nåbara datakällor från GitHub Actions\n\n';
for (const [n, u] of Object.entries(probes)) {
    try {
        const r = n === 'Hyperliquid' ? await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'metaAndAssetCtxs' }), signal: AbortSignal.timeout(15000) }) : await fetch(u, { signal: AbortSignal.timeout(15000) });
        const t = await r.text(); probeMd += `- ${n}: HTTP ${r.status} ${t.slice(0, 120).replace(/\n/g, ' ')}\n`;
    } catch (e) { probeMd += `- ${n}: fel ${e.message}\n`; }
}
console.log(probeMd);

const data = {};
for (const s of COINS) {
    try {
        const [sp, pp, fr] = [await klines(SPOT, s), await futKlines(s), await funding(s)];
        const days = [...fr.keys()].filter(d => sp.has(d) && pp.has(d) && sp.has(d - DAY) && pp.has(d - DAY)).sort((a, b) => a - b);
        data[s] = { days, sp, pp, fr };
        console.log(s, days.length, 'dagar från', new Date(days[0]).toISOString().slice(0, 10));
    } catch (e) { console.log('hoppar över', s, e.message); }
}

// Daglig avkastning (på hela kapitalet) för en valuta när positionen är öppen
function dayRet(s, d) {
    const x = data[s];
    const rs = x.sp.get(d) / x.sp.get(d - DAY) - 1, rp = x.pp.get(d) / x.pp.get(d - DAY) - 1;
    return 0.5 * (rs - rp + x.fr.get(d)) - 0.5 * REBAL;
}

// Strategier: syms = korg (lika delar), filter = när man ska vara inne
function run(syms, filt) {
    const all = [...new Set(syms.flatMap(s => data[s] ? data[s].days : []))].sort((a, b) => a - b);
    let val = 1, on = {}; const eq = [], dates = [];
    for (const d of all) {
        let r = 0, n = 0;
        for (const s of syms) {
            const x = data[s]; if (!x || !x.fr.has(d) || !x.sp.has(d - DAY)) continue;
            n++;
            // beslut tas på gårdagens funding-snitt (känt i förväg)
            const want = filt(s, d - DAY);
            if (want !== !!on[s]) { r -= ENTRY; on[s] = want; }   // in- eller utträde (båda benen)
            if (on[s]) r += dayRet(s, d);
        }
        if (n) { val *= 1 + r / n; eq.push(val); dates.push(d); }
    }
    return { eq, dates };
}
function avgFunding(s, d, days) {
    const x = data[s]; let sum = 0, k = 0;
    for (let i = 0; i < days; i++) { const v = x.fr.get(d - i * DAY); if (v !== undefined) { sum += v; k++; } }
    return k ? sum / k * 365 : 0;   // årstakt
}
function stats(eq, dates, from = 0, to = eq.length) {
    const e = eq.slice(from, to), yrs = (dates[to - 1] - dates[from]) / (365 * DAY);
    let pk = e[0], dd = 0; for (const v of e) { pk = Math.max(pk, v); dd = Math.min(dd, v / pk - 1); }
    const tot = e[e.length - 1] / e[0] - 1, cagr = Math.pow(1 + tot, 1 / yrs) - 1;
    const rs = e.slice(1).map((v, i) => v / e[i] - 1), m = rs.reduce((a, b) => a + b, 0) / rs.length;
    const sd = Math.sqrt(rs.reduce((a, b) => a + (b - m) ** 2, 0) / rs.length);
    return { tot, cagr, dd, sharpe: sd ? m / sd * Math.sqrt(365) : 0, worst: Math.min(...rs), negDays: rs.filter(x => x < 0).length / rs.length };
}

const avail = Object.keys(data);
const always = () => true;
const runs = [];
for (const s of avail) runs.push([coin(s) + ', alltid inne', run([s], always)]);
for (const s of avail) runs.push([coin(s) + ', bara när funding 7 d > 5 %/år', run([s], (x, d) => avgFunding(x, d, 7) > 0.05)]);
runs.push(['BTC + ETH, alltid inne', run(['BTCUSDT', 'ETHUSDT'].filter(s => data[s]), always)]);
runs.push(['BTC + ETH, funding 7 d > 5 %/år', run(['BTCUSDT', 'ETHUSDT'].filter(s => data[s]), (x, d) => avgFunding(x, d, 7) > 0.05)]);
runs.push(['BTC + ETH, funding 14 d > 0', run(['BTCUSDT', 'ETHUSDT'].filter(s => data[s]), (x, d) => avgFunding(x, d, 14) > 0)]);
runs.push(['Alla 5, funding 7 d > 5 %/år', run(avail, (x, d) => avgFunding(x, d, 7) > 0.05)]);
runs.push(['Alla 5, funding 7 d > 10 %/år', run(avail, (x, d) => avgFunding(x, d, 7) > 0.10)]);
function coin(s) { return s.replace('USDT', ''); }

const f = v => (v * 100).toFixed(1) + ' %';
let md = `# Funding-arbitrage: test\n\nSkapad ${new Date().toISOString().slice(0, 16)} UTC. Hälften spot, hälften säkerhet för 1x kort perpetual. Kostnad in/ut ${(ENTRY * 100).toFixed(2)} % per gång, ombalansering 0,01 %/dag.\n\n`;
md += '| Variant | Period | Total | Per år | Största nedgång | Sharpe | Sämsta dag | Minusdagar | Per år 1:a halvan | Per år 2:a halvan | Senaste 365 d |\n|---|---|---|---|---|---|---|---|---|---|---|\n';
const res = [];
for (const [n, r] of runs) {
    if (r.eq.length < 400) continue;
    const h = Math.floor(r.eq.length / 2), a = stats(r.eq, r.dates), h1 = stats(r.eq, r.dates, 0, h + 1), h2 = stats(r.eq, r.dates, h), y = stats(r.eq, r.dates, r.eq.length - 366);
    res.push({ n, a, h1, h2, y });
    md += `| ${n} | ${new Date(r.dates[0]).toISOString().slice(0, 10)} – | ${f(a.tot)} | ${f(a.cagr)} | ${f(a.dd)} | ${a.sharpe.toFixed(2)} | ${f(a.worst)} | ${f(a.negDays)} | ${f(h1.cagr)} | ${f(h2.cagr)} | ${f(y.tot)} |\n`;
}
// funding per år för BTC och ETH (årstakt, snitt)
md += '\n## Snittfunding per år (årstakt, det en kort position fick)\n\n| År | ' + avail.map(coin).join(' | ') + ' |\n|---|' + avail.map(() => '---').join('|') + '|\n';
for (let y = 2019; y <= new Date().getUTCFullYear(); y++) {
    md += '| ' + y + ' | ' + avail.map(s => { const v = [...data[s].fr.entries()].filter(([d]) => new Date(d).getUTCFullYear() === y).map(x => x[1]); return v.length ? f(v.reduce((a, b) => a + b, 0) / v.length * 365) : '-'; }).join(' | ') + ' |\n';
}
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(OUT + '/REPORT-FUNDING.md', md + probeMd);
fs.writeFileSync(OUT + '/funding-results.json', JSON.stringify(res, null, 1));
console.log(md);
