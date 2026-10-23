// "Bevis": botarnas läge, startdatumtestet, gravstenen och en samlad beslutslogg.
(function () {
    var BASE = 'https://raw.githubusercontent.com/XpawSir/crypto-ai-bot/';
    var BOTS = [
        ['btceth', 'Trend BTC + ETH', 'Huvudbot'], ['multi', 'Trendkorg flera tillgångar', 'Huvudbot'], ['combo', 'Kombinationsbot', 'Huvudbot'],
        ['voltrend', 'Volatilitetsstyrd trend', 'Experiment'], ['rotation', 'Rotationsbot', 'Experiment'], ['ensemble', 'Trend-ensemble', 'Experiment'],
        ['dca', 'Veckosparande (DCA)', 'Experiment'], ['lev', 'Hävstångstrend 1,5x', 'Experiment'], ['stocks', 'Aktiemomentum', 'Experiment']
    ];
    var GRAVE = [
        ['Funding-carry (hedgad BTC/ETH)', 'Ingen bot', 'Gav ca 9 % per år i snitt, men föll från 13 % till 6 % i andra halvan av perioden. ETH klarade inte kriteriet. Ingen carry-bot lades till.'],
        ['Fler och snabbare filter på trendregeln', 'Förkastad', 'Att kräva både 50 och 200 dagar, eller något av dem, eller extra momentumfilter gav sämre resultat än den enkla 50-dagarsregeln för både BTC och ETH.'],
        ['Volatilitetsmål, nedgångsbroms, regimfilter', 'Förkastad', 'Ingen av sex varianter klarade kriterierna. Nedgångsbromsen halverade nedgången men sänkte tillväxten för BTC från 56 % till ca 41 % per år.'],
        ['Större kryptokorg (4, 6 eller 8 mynt)', 'Förkastad', 'Bättre i första halvan men inte i andra (Kalmar 0,64, 0,40 och 0,28 mot 0,80 för BTC+ETH). Dessutom saknas mynt som försvann efter 2018.'],
        ['Maskininlärning (LightGBM, walk-forward)', 'Förkastad', 'Ensam: BTC 36 % per år mot 61 % för trendregeln, ETH 13 % mot 57 %. Med trendfilter: BTC lägre tillväxt (50 % mot 61 %) men mindre nedgång, ETH betydligt sämre (7 % mot 57 %). Ingen version klarade kriterierna.'],
        ['Hävstång 1,5x på trenden', 'Bara som experiment', 'Klarade kriterierna (BTC 68 % per år) men kan ge totalförlust vid snabba fall. Därför bara som en liten testbot med riskgräns.'],
        ['Prediktionsmarknader (Polymarket): köp utfall på 0,90–0,98 en vecka före slut', 'Förkastad', 'Test på 100 avgjorda marknader: 92 % vann men snittet blev −3,9 % per affär efter 1 % kostnad, eftersom en enda förlust (−100 %) tar ut ca tio vinster. Klarade inte kriterierna i första halvan. Ingen bot byggdes. (Urvalet är litet, så det är inget bevis för att det aldrig fungerar.)'],
        ['Ränta på kontanter', 'Behölls', 'Små men stabila plus i båda halvorna (BTC 53,5 % → 56,0 % per år). Kräver att pengarna står på ett räntekonto.'],
        ['Kombinera krypto-trend, ETF-trend och aktiemomentum', 'Behölls som riskminskare', 'Värsta nedgången −26 % mot −54 % för krypto-trend ensam, men inte bättre avkastning per risk (Kalmar 1,02 mot 1,12). Aktiedelen är uppblåst av överlevnadsbias.']
    ];
    var $ = function (id) { return document.getElementById(id); };
    function row(tb, cells) { var tr = document.createElement('tr'); cells.forEach(function (c) { var td = document.createElement('td'); if (c && c.cls) { td.className = c.cls; td.textContent = c.t; } else td.textContent = c; tr.appendChild(td); }); tb.appendChild(tr); }
    var pc = function (v) { return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2).replace('.', ',') + ' %'; };
    var pc0 = function (v) { return (v * 100).toFixed(0) + ' %'; };

    function grave() {
        var tb = $('p-grave'); if (!tb || tb.children.length) return;
        GRAVE.forEach(function (g) { row(tb, [{ t: g[0], cls: 'g-name' }, { t: g[1], cls: g[1] === 'Behölls' || g[1].indexOf('Behölls') === 0 ? 'up' : 'g-bad' }, g[2]]); });
    }
    function maxDD(eq) { var pk = 0, dd = 0; (eq || []).forEach(function (e) { var v = e[1]; if (v > pk) pk = v; if (pk > 0) dd = Math.min(dd, v / pk - 1); }); return dd; }

    function load() {
        grave();
        var states = {}, left = BOTS.length;
        BOTS.forEach(function (b) {
            fetch(BASE + 'bot-state/' + b[0] + '.json?t=' + Date.now()).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (st) {
                states[b[0]] = st; if (--left === 0) render(states);
            });
        });
        fetch(BASE + 'research-report/startdates.json?t=' + Date.now()).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
            if (!j || !j.results) return; var tb = $('p-sd'); tb.textContent = '';
            j.results.forEach(function (r) {
                row(tb, [r.sym + ' (' + r.rule + '-d)', r.window + ' år', pc0(r.beatHold), pc0(r.lowerDD), pc0(r.medTrend) + ' / ' + pc0(r.medHold), (r.worstDiff * 100).toFixed(0) + ' pe, start ' + r.worstStart, { t: r.robust ? 'Ja' : 'Nej', cls: r.robust ? 'up' : 'g-bad' }]);
            });
            var sub = $('p-sd-sub'); if (sub && j.updated) sub.textContent = 'Rullande fönster, ny start var 7:e dag, trendregel mot köp och behåll. Körd ' + j.updated.slice(0, 10) + '.';
        }).catch(function () { /* testet kan saknas */ });
    }

    function render(states) {
        var tb = $('p-bots'); tb.textContent = '';
        var log = [];
        BOTS.forEach(function (b) {
            var st = states[b[0]]; if (!st) { row(tb, [b[1], b[2], '–', '–', '–', '–', '–']); return; }
            var eq = st.equity || [], last = eq.length ? eq[eq.length - 1] : null, v = last ? last[1] : st.balance, bh = last ? last[2] : null;
            var days = st.startedAt ? Math.max(0, Math.round((Date.now() - Date.parse(st.startedAt)) / 86400000)) : '–';
            var res = (v / 10000 - 1) * 100, vs = bh ? (v / bh - 1) * 100 : null, tr = st.trades || [];
            row(tb, [b[1], b[2], String(days), { t: pc(res), cls: res >= 0 ? 'up' : 'down' }, vs === null ? '–' : { t: pc(vs), cls: vs >= 0 ? 'up' : 'down' }, pc(maxDD(eq) * 100), String(tr.length)]);
            (st.log || []).slice(-25).forEach(function (l) { var ts = Date.parse(l.t); if (isFinite(ts) && l.m) log.push({ ts: ts, bot: b[1], m: l.m }); });
        });
        log.sort(function (a, b) { return b.ts - a.ts; });
        var ul = $('p-log'); ul.textContent = '';
        log.slice(0, 40).forEach(function (l) {
            var li = document.createElement('li'), a = document.createElement('span'), m = document.createElement('span');
            a.className = 'p-msg'; a.textContent = l.m; m.className = 'nw-meta';
            m.textContent = l.bot + ' · ' + new Date(l.ts).toLocaleString('sv-SE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
            li.appendChild(a); li.appendChild(m); ul.appendChild(li);
        });
        if (!log.length) { var li = document.createElement('li'); li.textContent = 'Inga beslut loggade än.'; ul.appendChild(li); }
    }

    var loaded = 0;
    function maybe() { if (location.hash === '#proof' && Date.now() - loaded > 60000) { loaded = Date.now(); load(); } }
    window.addEventListener('hashchange', maybe); maybe();
})();
