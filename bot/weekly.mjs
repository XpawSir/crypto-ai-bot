// Veckorapport: läget för alla botar och vilka experiment som är kandidater att ta bort.
// Regel (satt i förväg): ett experiment är kandidat när det varit igång minst 90 dagar OCH ligger mer än 5 procentenheter
// efter sitt köp och behåll OCH ligger sämre än varje huvudbot sedan start. Inget tas bort automatiskt.
import fs from 'node:fs';
const OUT = process.env.RESEARCH_OUT || 'research-out';
const BASE = 'https://raw.githubusercontent.com/' + (process.env.GITHUB_REPOSITORY || 'XpawSir/crypto-ai-bot') + '/bot-state/';
const BOTS = [['btceth', 'Trend BTC + ETH', 1], ['multi', 'Trendkorg flera tillgångar', 1], ['combo', 'Kombinationsbot', 1], ['voltrend', 'Volatilitetsstyrd trend', 0], ['rotation', 'Rotationsbot', 0], ['ensemble', 'Trend-ensemble', 0], ['dca', 'Veckosparande (DCA)', 0], ['lev', 'Hävstångstrend 1,5x', 0], ['stocks', 'Aktiemomentum', 0]];
const pc = v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2).replace('.', ',') + ' %';
const dd = eq => { let pk = 0, d = 0; for (const e of eq || []) { pk = Math.max(pk, e[1]); if (pk > 0) d = Math.min(d, e[1] / pk - 1); } return d * 100; };
const rows = [];
for (const [f, name, main] of BOTS) {
    let st = null;
    try { const r = await fetch(BASE + f + '.json?t=' + Date.now()); if (r.ok) st = await r.json(); } catch { /* saknas */ }
    if (!st) { rows.push({ name, main, missing: true }); continue; }
    const eq = st.equity || [], last = eq.length ? eq[eq.length - 1] : null, v = last ? last[1] : st.balance, bh = last ? last[2] : null;
    const days = st.startedAt ? (Date.now() - Date.parse(st.startedAt)) / 86400000 : 0;
    const ageMin = st.lastRun ? (Date.now() - Date.parse(st.lastRun)) / 60000 : 1e9;
    rows.push({ name, main, days, res: (v / 10000 - 1) * 100, vs: bh ? (v / bh - 1) * 100 : null, dd: dd(eq), trades: (st.trades || []).length, stale: ageMin > 90, err: st.lastError || '' });
}
const mains = rows.filter(r => r.main && !r.missing);
const worstMain = Math.min(...mains.map(r => r.res));
const L = ['# Veckorapport', '', 'Skapad ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC. Pappershandel, historik garanterar inget.', '',
    '| Bot | Roll | Dagar | Sedan start | Mot köp och behåll | Största nedgång | Affärer | Status |', '|---|---|---|---|---|---|---|---|'];
const cand = [];
for (const r of rows) {
    if (r.missing) { L.push(`| ${r.name} | ${r.main ? 'Huvudbot' : 'Experiment'} | – | – | – | – | – | **saknar data** |`); continue; }
    const isCand = !r.main && r.days >= 90 && r.vs !== null && r.vs < -5 && r.res < worstMain;
    if (isCand) cand.push(r.name);
    L.push(`| ${r.name} | ${r.main ? 'Huvudbot' : 'Experiment'} | ${Math.round(r.days)} | ${pc(r.res)} | ${r.vs === null ? '–' : pc(r.vs)} | ${pc(r.dd)} | ${r.trades} | ${r.stale ? '**har inte körts på över 90 min**' : r.err ? 'fel: ' + r.err : isCand ? '**kandidat att ta bort**' : 'ok'} |`);
}
L.push('', cand.length ? '**Kandidater att ta bort:** ' + cand.join(', ') + '.' : 'Inga experiment uppfyller borttagningsregeln (minst 90 dagar, mer än 5 procentenheter efter köp och behåll, och sämre än varje huvudbot).', '');
const maxDays = Math.max(0, ...rows.filter(r => !r.missing).map(r => r.days));
if (maxDays < 90) L.push(`Äldsta boten har bara ${Math.round(maxDays)} dagar. Det är för tidigt för att dra slutsatser.`, '');
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(OUT + '/REPORT-WEEKLY.md', L.join('\n') + '\n');
console.log(L.join('\n'));
