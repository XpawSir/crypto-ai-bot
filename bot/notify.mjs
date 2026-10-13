// ============================================================
//  Push-notiser till mobilen via ntfy (https://ntfy.sh, gratis app för Android och iPhone).
//  Körs efter varje runda. Skickar en notis för varje nytt köp/sälj och när en bot får fel.
//  Ämnet (topic) läses från GitHub-secret NTFY_TOPIC. Saknas det görs ingenting.
//  Repot är publikt, därför ligger ämnet som secret: den som känner till ämnet kan läsa notiserna.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';

const DIR = process.env.BOT_STATE_DIR || 'state';
const TOPIC = (process.env.NTFY_TOPIC || '').trim();
const SERVER = (process.env.NTFY_SERVER || 'https://ntfy.sh').replace(/\/$/, '');
const MARK = path.join(DIR, 'notify.json');
const NAMES = { 'ensemble.json': 'Trend-ensemble', 'btceth.json': 'Trend BTC + ETH', 'voltrend.json': 'Volatilitetsstyrd trend', 'rotation.json': 'Rotationsbot' };

const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
const mark = readJSON(MARK, null);
const first = !mark;
const next = { files: {} };
const out = [];

for (const file of Object.keys(NAMES)) {
    const st = readJSON(path.join(DIR, file), null);
    if (!st) continue;
    const prev = (mark && mark.files[file]) || {};
    const since = prev.t || '';
    const fresh = (st.log || []).filter(l => l.t > since && /^(🟢|🔴)/.test(l.m));
    for (const l of fresh) out.push({ title: 'Algiz · ' + NAMES[file], msg: l.m, tags: l.m.startsWith('🟢') ? 'green_circle' : 'red_circle' });
    if (st.lastError && !prev.err) out.push({ title: 'Algiz · ' + NAMES[file] + ' har fel', msg: st.lastError, tags: 'warning', prio: 4 });
    if (!st.lastError && prev.err) out.push({ title: 'Algiz · ' + NAMES[file] + ' fungerar igen', msg: 'Senaste körningen gick bra.', tags: 'white_check_mark' });
    const lastT = (st.log || []).reduce((a, l) => l.t > a ? l.t : a, since);
    next.files[file] = { t: lastT, err: !!st.lastError };
}

// Första gången: sätt bara bokmärket, så att gamla affärer inte skickas
if (first) console.log('Notiser: första körningen, sparar startpunkt utan att skicka.');
else if (!TOPIC) console.log('Notiser: NTFY_TOPIC saknas, hoppar över (' + out.length + ' händelser).');
else {
    for (const n of out.slice(0, 10)) {
        try {
            const body = { topic: TOPIC, title: n.title, message: n.msg, tags: [n.tags], priority: n.prio || 3 };
            if (process.env.SITE_URL) body.click = process.env.SITE_URL;
            const res = await fetch(SERVER + '/', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10000) });
            console.log('Notis skickad (' + res.status + '): ' + n.title + ' – ' + n.msg);
        } catch (e) { console.log('Notis misslyckades: ' + e.message); }
    }
    if (out.length > 10) console.log('Fler än 10 händelser, skickade de 10 första.');
}
fs.writeFileSync(MARK, JSON.stringify(next));
