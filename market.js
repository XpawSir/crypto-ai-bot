// Market-fliken: live-priser och graf för de största kryptovalutorna (publik Binance-data, ingen inloggning mot Binance).
(function () {
    'use strict';
    var COINS = [
        ['BTC', 'Bitcoin'], ['ETH', 'Ethereum'], ['BNB', 'BNB'], ['XRP', 'XRP'], ['SOL', 'Solana'], ['DOGE', 'Dogecoin'],
        ['ADA', 'Cardano'], ['TRX', 'TRON'], ['LINK', 'Chainlink'], ['AVAX', 'Avalanche'], ['LTC', 'Litecoin'], ['DOT', 'Polkadot']
    ].map(function (c) { return { sym: c[0], name: c[1], pair: c[0] + 'USDT', price: null, open: null, high: null, low: null, vol: null }; });
    var BY_SYM = {}; COINS.forEach(function (c) { BY_SYM[c.sym] = c; });

    var REST = ['https://api.binance.com/api/v3', 'https://data-api.binance.vision/api/v3', 'https://api.binance.us/api/v3'];
    var WS = ['wss://stream.binance.com:9443/stream', 'wss://data-stream.binance.vision/stream', 'wss://stream.binance.us:9443/stream'];
    var INTERVALS = [['1m', '1 min'], ['15m', '15 min'], ['1h', '1 tim'], ['4h', '4 tim'], ['1d', '1 dag'], ['1w', '1 vecka']];

    var state = { sel: 'BTC', interval: '1h', type: 'line', active: false, started: false };
    var restBase = 0, wsIdx = 0, ws = null, wsOpen = false, wsTimer = null, pollTimer = null;
    var chart = null, series = null, lastBar = null, loadSeq = 0;
    var $ = function (id) { return document.getElementById(id); };

    function fmtPrice(p) {
        if (p == null || isNaN(p)) return '–';
        var d = p >= 100 ? 2 : p >= 1 ? 3 : p >= 0.1 ? 4 : 5;
        return '$' + p.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    }
    function fmtPct(v) { return v == null || isNaN(v) ? '–' : (v >= 0 ? '+' : '') + v.toFixed(2) + '%'; }
    function fmtVol(v) {
        if (v == null || isNaN(v)) return '–';
        return v >= 1e9 ? '$' + (v / 1e9).toFixed(2) + ' mdr' : v >= 1e6 ? '$' + (v / 1e6).toFixed(1) + ' milj' : '$' + Math.round(v).toLocaleString('en-US');
    }
    function pct(c) { return c.price != null && c.open ? (c.price / c.open - 1) * 100 : null; }
    function tone(v) { return v == null ? 'var(--muted)' : v >= 0 ? '#34d399' : '#f87171'; }

    // REST med reservadresser (Binance.com är blockerat i vissa länder)
    async function rest(path) {
        var err = null;
        for (var i = 0; i < REST.length; i++) {
            var base = REST[(restBase + i) % REST.length];
            try {
                var r = await fetch(base + path);
                if (!r.ok) throw new Error('HTTP ' + r.status);
                restBase = (restBase + i) % REST.length;
                return await r.json();
            } catch (e) { err = e; }
        }
        throw err;
    }

    function logo(c, size) {
        return '<img src="icons/' + c.sym.toLowerCase() + '.svg" width="' + size + '" height="' + size + '" alt="" class="rounded-full shrink-0" loading="lazy">';
    }

    function renderList() {
        var el = $('mk-list'); if (!el) return;
        if (!el.children.length) {
            el.innerHTML = COINS.map(function (c) {
                return '<button type="button" class="mk-row" data-sym="' + c.sym + '">' + logo(c, 28) +
                    '<span class="min-w-0 text-left"><span class="block text-[13px] font-semibold truncate" style="color:var(--accent)">' + c.name + '</span>' +
                    '<span class="block text-[11px] font-mono" style="color:var(--muted)">' + c.sym + '/USDT</span></span>' +
                    '<span class="ml-auto text-right"><span class="block text-[13px] font-mono font-semibold" data-f="p" style="color:var(--accent)">–</span>' +
                    '<span class="block text-[11px] font-mono" data-f="c">–</span></span></button>';
            }).join('');
        }
        COINS.forEach(function (c, i) {
            var row = el.children[i], v = pct(c);
            row.setAttribute('aria-pressed', c.sym === state.sel ? 'true' : 'false');
            row.querySelector('[data-f=p]').textContent = fmtPrice(c.price);
            var ce = row.querySelector('[data-f=c]'); ce.textContent = fmtPct(v); ce.style.color = tone(v);
        });
    }

    function renderHead() {
        var c = BY_SYM[state.sel], v = pct(c);
        $('mk-logo').src = 'icons/' + c.sym.toLowerCase() + '.svg';
        $('mk-name').textContent = c.name;
        $('mk-pair').textContent = c.sym + '/USDT';
        $('mk-price').textContent = fmtPrice(c.price);
        var ch = $('mk-change'); ch.textContent = fmtPct(v) + ' (24 tim)'; ch.style.color = tone(v);
        $('mk-high').textContent = fmtPrice(c.high); $('mk-low').textContent = fmtPrice(c.low); $('mk-vol').textContent = fmtVol(c.vol);
    }

    function renderControls() {
        var b = $('mk-intervals');
        if (!b.children.length) {
            b.innerHTML = INTERVALS.map(function (i) { return '<button type="button" class="seg" data-iv="' + i[0] + '">' + i[1] + '</button>'; }).join('');
        }
        Array.prototype.forEach.call(b.children, function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-iv') === state.interval ? 'true' : 'false'); });
        Array.prototype.forEach.call($('mk-types').children, function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-type') === state.type ? 'true' : 'false'); });
    }

    // ---------- Graf ----------
    function colors() {
        var light = document.documentElement.dataset.theme === 'light';
        return light ? { bg: '#ffffff', text: '#475569', grid: '#e5e7eb', border: '#d1d5db', line: '#0f766e', top: 'rgba(15,118,110,.22)' }
                     : { bg: '#030405', text: '#8a8f9c', grid: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.10)', line: '#34d399', top: 'rgba(52,211,153,.20)' };
    }
    function applyTheme() {
        if (!chart) return;
        var c = colors();
        chart.applyOptions({ layout: { background: { type: LightweightCharts.ColorType.Solid, color: c.bg }, textColor: c.text },
            grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } }, rightPriceScale: { borderColor: c.border }, timeScale: { borderColor: c.border } });
        if (series && state.type === 'line') series.applyOptions({ lineColor: c.line, topColor: c.top });
    }
    function ensureChart() {
        if (chart || typeof LightweightCharts === 'undefined') return;
        chart = LightweightCharts.createChart($('mk-chart'), {
            autoSize: true, crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
            timeScale: { timeVisible: true, secondsVisible: false },
            localization: { timeFormatter: function (t) { return new Date(t * 1000).toLocaleString('sv-SE', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }); } }
        });
        applyTheme();
    }
    function makeSeries() {
        if (series) { chart.removeSeries(series); series = null; }
        var c = colors();
        series = state.type === 'candle'
            ? chart.addCandlestickSeries({ upColor: '#34d399', downColor: '#f87171', wickUpColor: '#34d399', wickDownColor: '#f87171', borderVisible: false })
            : chart.addAreaSeries({ lineColor: c.line, topColor: c.top, bottomColor: 'rgba(0,0,0,0)', lineWidth: 2, priceLineVisible: true });
    }
    function point(k) {
        return state.type === 'candle' ? { time: k.time, open: k.open, high: k.high, low: k.low, close: k.close } : { time: k.time, value: k.close };
    }
    async function loadChart() {
        if (!state.active) return;
        ensureChart(); if (!chart) return;
        var seq = ++loadSeq, c = BY_SYM[state.sel], note = $('mk-note');
        note.textContent = 'Hämtar historik…';
        try {
            var rows = await rest('/klines?symbol=' + c.pair + '&interval=' + state.interval + '&limit=500');
            if (seq !== loadSeq) return;
            var bars = rows.map(function (k) { return { time: Math.floor(k[0] / 1000), open: +k[1], high: +k[2], low: +k[3], close: +k[4] }; });
            makeSeries();
            series.setData(bars.map(point));
            lastBar = bars[bars.length - 1] || null;
            chart.timeScale().fitContent();
            note.textContent = bars.length + ' staplar · ' + c.sym + '/USDT · uppdateras live';
            subscribeKline();
        } catch (e) {
            if (seq === loadSeq) note.textContent = 'Kunde inte hämta grafen just nu. Försöker igen vid nästa uppdatering.';
        }
    }
    function pushBar(k) { // k: {time, open, high, low, close}
        if (!series || !k) return;
        if (lastBar && k.time < lastBar.time) return;
        lastBar = k; series.update(point(k));
    }

    // ---------- Live: WebSocket med REST som reserv ----------
    var subs = [];
    function streamNames() { return COINS.map(function (c) { return c.pair.toLowerCase() + '@miniTicker'; }); }
    function klineStream() { return BY_SYM[state.sel].pair.toLowerCase() + '@kline_' + state.interval; }
    function send(method, params) { if (ws && wsOpen) ws.send(JSON.stringify({ method: method, params: params, id: Date.now() })); }
    function subscribeKline() {
        var next = klineStream();
        if (subs.indexOf(next) !== -1) return;
        if (subs.length) send('UNSUBSCRIBE', subs.slice());
        subs = [next]; send('SUBSCRIBE', subs.slice());
    }
    function onMsg(ev) {
        var m; try { m = JSON.parse(ev.data); } catch (e) { return; }
        var d = m.data || m; if (!d || !d.e) return;
        if (d.e === '24hrMiniTicker') {
            var c = BY_SYM[d.s.replace(/USDT$/, '')]; if (!c) return;
            c.price = +d.c; c.open = +d.o; c.high = +d.h; c.low = +d.l; c.vol = +d.q;
            scheduleRender();
        } else if (d.e === 'kline' && d.s === BY_SYM[state.sel].pair && d.k.i === state.interval) {
            pushBar({ time: Math.floor(d.k.t / 1000), open: +d.k.o, high: +d.k.h, low: +d.k.l, close: +d.k.c });
        }
    }
    var renderQueued = false;
    function scheduleRender() { // max ~4 ritningar per sekund
        if (renderQueued) return; renderQueued = true;
        setTimeout(function () { renderQueued = false; if (state.active) { renderList(); renderHead(); } }, 250);
    }
    function connect() {
        if (!state.active || ws) return;
        var url = WS[wsIdx % WS.length] + '?streams=' + streamNames().join('/');
        try { ws = new WebSocket(url); } catch (e) { ws = null; return fail(); }
        ws.onopen = function () { wsOpen = true; $('mk-live').classList.add('on'); stopPoll(); subs = []; subscribeKline(); };
        ws.onmessage = onMsg;
        ws.onclose = ws.onerror = function () { if (!ws) return; ws = null; wsOpen = false; $('mk-live').classList.remove('on'); fail(); };
    }
    function fail() {
        wsIdx++; startPoll();
        clearTimeout(wsTimer); wsTimer = setTimeout(connect, 5000);
    }
    function closeWS() {
        clearTimeout(wsTimer); stopPoll(); subs = [];
        if (ws) { var w = ws; ws = null; wsOpen = false; try { w.close(); } catch (e) { /* redan stängd */ } }
        var l = $('mk-live'); if (l) l.classList.remove('on');
    }
    // Reserv när WebSocket inte går att nå: hämta var 5:e sekund
    function startPoll() { if (pollTimer) return; poll(); pollTimer = setInterval(poll, 5000); }
    function stopPoll() { clearInterval(pollTimer); pollTimer = null; }
    async function poll() {
        if (!state.active) return;
        await loadTickers();
        try {
            var c = BY_SYM[state.sel];
            var rows = await rest('/klines?symbol=' + c.pair + '&interval=' + state.interval + '&limit=2');
            rows.forEach(function (k) { pushBar({ time: Math.floor(k[0] / 1000), open: +k[1], high: +k[2], low: +k[3], close: +k[4] }); });
        } catch (e) { /* nästa försök om 5 sek */ }
    }
    async function loadTickers() {
        try {
            var arr = await rest('/ticker/24hr?symbols=' + encodeURIComponent(JSON.stringify(COINS.map(function (c) { return c.pair; }))));
            arr.forEach(function (t) {
                var c = BY_SYM[t.symbol.replace(/USDT$/, '')]; if (!c) return;
                c.price = +t.lastPrice; c.open = +t.openPrice; c.high = +t.highPrice; c.low = +t.lowPrice; c.vol = +t.quoteVolume;
            });
            renderList(); renderHead();
        } catch (e) { /* visas som – tills data kommer */ }
    }

    // ---------- Start/stopp (anropas när fliken visas/döljs) ----------
    function select(sym) { if (sym === state.sel) return; state.sel = sym; renderList(); renderHead(); loadChart(); }
    function show() {
        state.active = true;
        if (!state.started) {
            state.started = true;
            $('mk-list').addEventListener('click', function (e) { var b = e.target.closest('[data-sym]'); if (b) select(b.getAttribute('data-sym')); });
            $('mk-intervals').addEventListener('click', function (e) { var b = e.target.closest('[data-iv]'); if (b) { state.interval = b.getAttribute('data-iv'); renderControls(); loadChart(); } });
            $('mk-types').addEventListener('click', function (e) { var b = e.target.closest('[data-type]'); if (b) { state.type = b.getAttribute('data-type'); renderControls(); loadChart(); } });
            new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        }
        renderList(); renderHead(); renderControls();
        loadTickers(); loadChart(); connect();
    }
    function hide() { state.active = false; closeWS(); }
    window.addEventListener('market:show', show);
    window.addEventListener('market:hide', hide);
    document.addEventListener('visibilitychange', function () { // pausa när webbläsarfliken är i bakgrunden
        if (!state.started) return;
        if (document.hidden) { if (state.active) closeWS(); } else if (state.active) { loadTickers(); loadChart(); connect(); }
    });
})();
