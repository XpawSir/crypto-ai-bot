// ============================================================
//  Nyheter och marknadspuls. Hämtar rubriker (RSS), rädsla/girighet, index och kryptodata och sparar state/news.json.
//  Bara rubrik, källa, tid och länk sparas (inga artiklar). Varje källa är oberoende: en som fallerar stoppar inte resten.
//  Om allt fallerar behålls föregående fil.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.env.NEWS_OUT || path.join('state', 'news.json');
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; algiz-news/1.0)' };
const get = async (url, ms = 15000) => {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(ms) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r;
};
const prev = (() => { try { return JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) { return null; } })();
const errors = [];
const safe = async (name, fn, dflt) => { try { return await fn(); } catch (e) { errors.push(name + ': ' + e.message); return dflt; } };

// ---------- RSS ----------
const ents = s => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, ' ');
const decode = s => ents(ents(s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')).replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const tag = (x, t) => { const m = x.match(new RegExp('<' + t + '[^>]*>([\\s\\S]*?)</' + t + '>', 'i')); return m ? decode(m[1]) : ''; };
async function rss(source, url, max = 20) {
    const xml = await (await get(url)).text();
    const items = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) || [];
    const out = [];
    for (const it of items) {
        const title = tag(it, 'title'); let link = tag(it, 'link');
        if (!link) { const m = it.match(/<link[^>]*href="([^"]+)"/i); link = m ? m[1] : ''; }
        const d = Date.parse(tag(it, 'pubDate') || tag(it, 'published') || tag(it, 'updated') || tag(it, 'dc:date'));
        if (title && /^https?:\/\//.test(link) && title.length > 12) out.push({ t: title.slice(0, 220), u: link, s: source, ts: isFinite(d) ? d : 0 });
        if (out.length >= max) break;
    }
    if (!out.length) throw new Error('inga rubriker');
    return out;
}
const merge = lists => {
    const seen = new Set(), all = lists.flat().filter(x => x.ts > Date.now() - 4 * 86400e3 || !x.ts);
    all.sort((a, b) => b.ts - a.ts);
    return all.filter(x => { const k = x.t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').slice(0, 60); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 40);
};

// ---------- Kurser (Yahoo chart) ----------
async function quote(sym, name) {
    const j = await (await get('https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(sym) + '?range=5d&interval=1d')).json();
    const m = j.chart.result[0].meta, cl = (j.chart.result[0].indicators.quote[0].close || []).filter(v => v > 0);
    const price = m.regularMarketPrice, prevClose = m.chartPreviousClose && cl.length > 1 ? cl[cl.length - 2] : m.chartPreviousClose;
    return { sym, name, price, chg: prevClose ? (price / prevClose - 1) * 100 : null };
}

const main = async () => {
    const stockFeeds = await Promise.all([
        safe('CNBC', () => rss('CNBC', 'https://www.cnbc.com/id/10000664/device/rss/rss.html'), []),
        safe('MarketWatch', () => rss('MarketWatch', 'https://feeds.content.dowjones.io/public/rss/mw_topstories'), []),
        safe('Yahoo Finance', () => rss('Yahoo Finance', 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC&region=US&lang=en-US'), []),
        safe('CNBC marknader', () => rss('CNBC', 'https://www.cnbc.com/id/20910258/device/rss/rss.html'), [])
    ]);
    const cryptoFeeds = await Promise.all([
        safe('CoinDesk', () => rss('CoinDesk', 'https://www.coindesk.com/arc/outboundfeeds/rss/'), []),
        safe('Cointelegraph', () => rss('Cointelegraph', 'https://cointelegraph.com/rss'), []),
        safe('Decrypt', () => rss('Decrypt', 'https://decrypt.co/feed'), []),
        safe('Bitcoin Magazine', () => rss('Bitcoin Magazine', 'https://bitcoinmagazine.com/feed'), [])
    ]);
    const idx = await Promise.all([['^GSPC', 'S&P 500'], ['^IXIC', 'Nasdaq'], ['^VIX', 'VIX (rädsla börsen)'], ['GC=F', 'Guld'], ['DX-Y.NYB', 'Dollarindex'], ['^TNX', 'USA 10-årsränta']].map(([s, n]) => safe('kurs ' + s, () => quote(s, n), null)));
    const fng = await safe('Fear&Greed', async () => {
        const j = await (await get('https://api.alternative.me/fng/?limit=2')).json();
        const a = j.data[0], b = j.data[1];
        return { value: +a.value, label: a.value_classification, prev: b ? +b.value : null };
    }, null);
    const gecko = await safe('CoinGecko global', async () => {
        const j = (await (await get('https://api.coingecko.com/api/v3/global')).json()).data;
        return { cap: j.total_market_cap.usd, capChg: j.market_cap_change_percentage_24h_usd, btcDom: j.market_cap_percentage.btc, ethDom: j.market_cap_percentage.eth };
    }, null);
    const coins = await safe('CoinGecko topp', async () => {
        const j = await (await get('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&price_change_percentage=24h')).json();
        return j.map(c => ({ sym: String(c.symbol).toUpperCase(), name: c.name, price: c.current_price, chg: c.price_change_percentage_24h, cap: c.market_cap }));
    }, []);
    const btc = await safe('BTC', () => quote('BTC-USD', 'Bitcoin'), null), eth = await safe('ETH', () => quote('ETH-USD', 'Ethereum'), null);

    const stocks = merge(stockFeeds), crypto = merge(cryptoFeeds), quotes = idx.filter(Boolean);
    if (!stocks.length && !crypto.length && !quotes.length && !coins.length && prev) { console.log('Alla källor föll, behåller föregående fil. Fel: ' + errors.join('; ')); process.exit(0); }
    const sorted = coins.filter(c => c.chg !== null && c.chg !== undefined && !/[_]|USD|HELOC/i.test(c.sym) && !/stable|usd|heloc|treasury|tokenized|gold|yield|\bdai\b|fund|bond/i.test(c.name)).sort((a, b) => b.chg - a.chg);
    const res = {
        v: 1, updated: new Date().toISOString(), errors,
        market: { indices: quotes, btc, eth, fng, gecko },
        stockNews: stocks, cryptoNews: crypto,
        movers: { up: sorted.slice(0, 5), down: sorted.slice(-5).reverse() }
    };
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(res));
    console.log('Nyheter sparade: ' + stocks.length + ' börs, ' + crypto.length + ' krypto, ' + quotes.length + ' kurser, ' + coins.length + ' mynt. Fel: ' + (errors.join('; ') || 'inga'));
};
main().catch(e => { console.error(e); process.exit(0); });
