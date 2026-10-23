// ============================================================
//  Algiz prediktionsbot (PAPER TRADING, låtsaspengar). Körs av GitHub Actions var 10:e minut.
//  Läser öppna marknader på Polymarket (endast läsning, ingen handel, ingen inloggning).
//  Regel: köp utfall som kostar 0,90–0,98 när marknaden avgörs om 5–9 dagar, $200 per marknad, högst 25 öppna,
//  håll till avgörande (utfallet blir 1 eller 0). Modellerad kostnad 1 % per affär. Experiment: se REPORT-PREDICT.md.
//  En enda förlust tar ut ungefär tio vinster, så resultatet kan se bra ut länge och sedan rasa.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = process.env.BOT_STATE || path.join(HERE, '..', 'state', 'predict.json');
const API = 'https://gamma-api.polymarket.com/markets';
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; algiz-paper-bot)' };
const START = 10000, DAY = 86400000, COST = 0.01, STAKE = 200, MAXPOS = 25, LO = 0.90, HI = 0.98, MIN_D = 5, MAX_D = 9, MIN_VOL = 20000, CASH_RATE = 0.035;
const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
const r2 = v => Math.round(v * 100) / 100;
const parse = s => { try { return typeof s === 'string' ? JSON.parse(s) : s; } catch { return null; } };
const short = q => String(q).length > 48 ? String(q).slice(0, 47) + '…' : String(q);

async function jget(url) {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(25000) });
    if (!r.ok) throw new Error('Polymarket HTTP ' + r.status);
    return r.json();
}
function freshState() {
    return { v: 1, kind: 'predictbot', balance: START, cash: START, pnl: 0, totalTrades: 0, winningTrades: 0, equity: [], trades: [], log: [], pos: {}, startedAt: new Date().toISOString(), buyHoldLabel: 'Kontanter med ränta', buyHoldValue: START, openPositions: [], marketsView: [], interest: 0, lastAccrual: 0, settled: { n: 0, wins: 0, pnl: 0 }, weight: 0, cashShare: 100, lastError: null };
}
function loadState() {
    const s = readJSON(STATE_FILE, null);
    if (!s || s.v !== 1 || s.kind !== 'predictbot') return freshState();
    const f = freshState(); for (const k of Object.keys(f)) if (s[k] === undefined) s[k] = f[k];
    return s;
}
const logger = st => (m, k) => { st.log.push({ t: new Date().toISOString(), m, k: k || 'info' }); if (st.log.length > 100) st.log.shift(); console.log('[' + (k || 'info') + '] ' + m); };

// pris att köpa respektive sälja utfall i (0 eller 1) på en marknad
function quote(m, i) {
    const bid = +m.bestBid, ask = +m.bestAsk, px = parse(m.outcomePrices);
    if (i === 0) return { ask: ask > 0 ? ask : null, bid: bid > 0 ? bid : (px ? +px[0] : null) };
    return { ask: bid > 0 ? 1 - bid : null, bid: ask > 0 ? 1 - ask : (px ? +px[1] : null) };
}

export async function main() {
    const st = loadState(), log = logger(st);
    st.config = { label: 'Prediktionsbot (Polymarket)', enabled: true, strategy: 'utfall 0,90–0,98 som avgörs om 5–9 dagar', symbols: [] };
    st.lastRun = new Date().toISOString(); st.enabled = true;
    try {
        const now = Date.now();
        const dt = st.lastAccrual ? Math.min(2, Math.max(0, (now - st.lastAccrual) / DAY)) : 0;
        const gain = st.cash * CASH_RATE * dt / 365; if (gain > 0) { st.cash += gain; st.interest += gain; } st.lastAccrual = now;

        // 1) avgörande: hämta varje öppen position
        for (const id of Object.keys(st.pos)) {
            const p = st.pos[id];
            let m = null;
            try { const a = await jget(API + '?id=' + id); m = Array.isArray(a) ? a[0] : a; } catch (e) { log('Kunde inte läsa marknad ' + id + ': ' + e.message, 'warn'); continue; }
            if (!m) continue;
            const px = parse(m.outcomePrices), fin = px && px.length === 2 ? +px[p.i] : null;
            const decided = m.closed && fin !== null && (fin > 0.99 || fin < 0.01);
            const cancelled = m.closed && fin !== null && !decided && Date.now() > p.end + 7 * DAY;
            if (decided || cancelled) {
                const val = p.shares * fin; st.cash += val; const pnl = val - p.cost;
                st.totalTrades++; if (pnl > 0) st.winningTrades++; st.settled.n++; if (pnl > 0) st.settled.wins++; st.settled.pnl = r2(st.settled.pnl + pnl);
                st.trades.push({ t: new Date().toISOString(), side: 'sell', symbol: short(p.q), price: fin, amount: r2(val) });
                log((pnl > 0 ? '🟢 Avgjord, vann: ' : '🔴 Avgjord, förlorade: ') + short(p.q) + ' (' + p.name + '). ' + (pnl >= 0 ? '+$' : '−$') + Math.abs(pnl).toFixed(2), pnl > 0 ? 'success' : 'danger');
                delete st.pos[id];
            } else { p.last = quote(m, p.i).bid || p.last; }
        }

        // 2) nya köp
        const open = Object.keys(st.pos).length;
        if (open < MAXPOS) {
            const min = new Date(now + MIN_D * DAY).toISOString(), max = new Date(now + MAX_D * DAY).toISOString();
            let cands = [];
            for (let off = 0; off < 600; off += 100) {
                const page = await jget(API + '?closed=false&active=true&limit=100&offset=' + off + '&order=endDate&ascending=true&volume_num_min=' + MIN_VOL + '&end_date_min=' + encodeURIComponent(min) + '&end_date_max=' + encodeURIComponent(max));
                if (!Array.isArray(page) || !page.length) break;
                for (const m of page) {
                    const ids = parse(m.clobTokenIds), outs = parse(m.outcomes); if (!ids || ids.length !== 2 || !outs || m.closed || st.pos[m.id]) continue;
                    for (let i = 0; i < 2; i++) { const q = quote(m, i); if (q.ask && q.ask >= LO && q.ask <= HI) cands.push({ m, i, ask: q.ask, name: String(outs[i]), liq: +m.liquidityNum || 0 }); }
                }
                if (page.length < 100) break;
            }
            // en per marknad; mest likvida först
            const seen = new Set(); cands = cands.sort((a, b) => b.liq - a.liq).filter(c => !seen.has(c.m.id) && seen.add(c.m.id));
            let bought = 0;
            for (const c of cands) {
                if (Object.keys(st.pos).length >= MAXPOS || st.cash < STAKE) break;
                const price = c.ask, cost = STAKE, shares = (STAKE / (1 + COST)) / price;
                st.cash -= cost;
                st.pos[c.m.id] = { q: c.m.question, name: c.name, i: c.i, shares, cost, entry: price, last: price, end: Date.parse(c.m.endDate) };
                st.trades.push({ t: new Date().toISOString(), side: 'buy', symbol: short(c.m.question), price: r2(price), amount: STAKE });
                log('🟢 Köper "' + c.name + '" i: ' + short(c.m.question) + ' @ ' + price.toFixed(3) + ' för $' + STAKE + ' (avgörs ' + String(c.m.endDate).slice(0, 10) + ')', 'success'); bought++;
            }
            if (!bought && !open) log('Inga marknader som uppfyller regeln just nu.', 'info');
        }

        // 3) värdering
        const held = Object.values(st.pos), mtm = held.reduce((s, p) => s + p.shares * (p.last || p.entry), 0);
        st.balance = r2(st.cash + mtm); st.pnl = r2(st.balance - START);
        st.buyHoldValue = r2(START * (1 + CASH_RATE * (now - Date.parse(st.startedAt)) / (365 * DAY)));
        const lastPt = st.equity[st.equity.length - 1];
        if (!lastPt || now - lastPt[0] > 50 * 60000) { st.equity.push([now, st.balance, st.buyHoldValue]); if (st.equity.length > 2000) st.equity.shift(); }
        st.openPositions = held.map(p => ({ symbol: short(p.q).slice(0, 28) + ' · ' + p.name, strat: null, entryPrice: r2(p.entry), stop: null, tp: null, exposure: r2(p.shares * (p.last || p.entry)), unrealized: r2(p.shares * ((p.last || p.entry)) - p.cost) }));
        st.weight = Math.round(100 * (1 - st.cash / Math.max(st.balance, 1e-9))) / 100; st.cashShare = Math.round(100 * st.cash / Math.max(1, st.balance));
        if (st.trades.length > 200) st.trades.splice(0, st.trades.length - 200);
        st.lastError = null;
    } catch (e) {
        log('Fel under körningen: ' + e.message + ' (försöker igen vid nästa körning)', 'danger');
        st.lastError = e.message;
    }
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(st));
    console.log('Läge sparat. Värde $' + (st.balance || 0).toFixed(2) + ', öppna ' + Object.keys(st.pos).length);
    return st.lastError ? 1 : 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { main().then(() => { process.exitCode = 0; }); }
