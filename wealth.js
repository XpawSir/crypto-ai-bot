// ============================================================
//  Fliken Förmögenhet: dina innehav + uppskattning framåt.
//  Fristående från script.js. Innehaven sparas bara i den här webbläsaren (localStorage).
//
//  Uppskattningen är statistik, inte en spådom: varje typ av tillgång har ett antaget
//  årligt snitt (förväntad avkastning) och en antagen svängning (volatilitet), satta
//  försiktigt utifrån lång historik. Ett enskilt år kan hamna långt utanför intervallet.
// ============================================================
(function () {
    'use strict';
    var KEY = 'algiz_wealth_v1';
    // mu = antagen årlig avkastning, sig = årlig svängning, rho = hur mycket den följer börsen i stort
    var TYPES = {
        cash:   { name: 'Sparkonto / räntefond', mu: 0.025, sig: 0.01, rho: 0 },
        global: { name: 'Global indexfond',       mu: 0.07,  sig: 0.15, rho: 0.85 },
        sweden: { name: 'Sverige-indexfond',      mu: 0.07,  sig: 0.18, rho: 0.75 },
        stock:  { name: 'Enskild stor aktie',     mu: 0.08,  sig: 0.28, rho: 0.55 },
        growth: { name: 'Tillväxt-/techaktie',    mu: 0.09,  sig: 0.45, rho: 0.5 },
        crypto: { name: 'Krypto (BTC/ETH)',       mu: 0.10,  sig: 0.65, rho: 0.3 },
        other:  { name: 'Annat',                  mu: 0.05,  sig: 0.20, rho: 0.5 }
    };
    // Gissa typ från namnet (du kan alltid ändra själv)
    var GUESS = [
        [/spar|ränt|rant|bank|kontant|cash|likvid/i, 'cash'],
        [/zero|sverige|sweden|omx|investor|industrivärden|latour/i, 'sweden'],
        [/global|world|msci|all world|acwi|s&p|sp500|500|usa|nasdaq|tillväxtmarknad|emerging|index/i, 'global'],
        [/bitcoin|btc|ethereum|eth|krypto|crypto|solana|xrp|xbt/i, 'crypto'],
        [/nvidia|nvda|tesla|amd|palantir|meta|microsoft|apple|amazon|alphabet|google|netflix|shopify|spotify|evolution|sinch|embracer|asml|broadcom|arm/i, 'growth'],
        [/volvo|ericsson|h&m|hm|atlas|abb|sandvik|seb|swedbank|handelsbanken|nordea|telia|astra|essity|skf|saab|alfa laval|hexagon|boliden|ica|axfood|novo/i, 'stock']
    ];
    var SVG_NS = 'http://www.w3.org/2000/svg';
    var Z = 1.2816;   // 10:e och 90:e percentilen
    var state = load();
    var chart = null, sP10, sP50, sP90, sIn;

    function load() {
        try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && Array.isArray(s.items)) return s; } catch (e) { }
        return { items: [], monthly: 0, years: 10, saveTo: 'global' };
    }
    function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { } }
    function guess(name) { for (var i = 0; i < GUESS.length; i++) if (GUESS[i][0].test(name)) return GUESS[i][1]; return 'stock'; }
    function kr(v) { return Math.round(v).toLocaleString('sv-SE') + ' kr'; }
    function pct(v) { return (v >= 0 ? '+' : '') + (v * 100).toFixed(0) + ' %'; }
    function $(id) { return document.getElementById(id); }

    // Lognormal: utfall efter t år för 1 kr
    function lognorm(type, t) {
        var T = TYPES[type] || TYPES.other, m = Math.log(1 + T.mu) - T.sig * T.sig / 2, s = T.sig * Math.sqrt(t);
        return { p10: Math.exp(m * t - Z * s), p50: Math.exp(m * t), p90: Math.exp(m * t + Z * s), mean: Math.pow(1 + T.mu, t) };
    }

    // Monte Carlo för hela portföljen: en gemensam börsfaktor + egen slump per innehav, månadssparande fördelas som idag
    function simulate(years, monthly, sims) {
        if (monthly === undefined) monthly = state.monthly;
        var items = state.items.filter(function (x) { return x.amount > 0; });
        var total = items.reduce(function (a, x) { return a + x.amount; }, 0);
        // månadssparandet går till en egen "hink" av vald typ (standard global indexfond)
        items = items.concat([{ amount: 0, type: TYPES[state.saveTo] ? state.saveTo : 'global', bucket: true }]);
        var N = sims || 3000, seed = 12345, out = [];
        function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
        function gauss() { var u = 0, v = 0; while (u === 0) u = rnd(); v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
        var paths = [];
        for (var n = 0; n < N; n++) {
            var vals = items.map(function (x) { return x.amount; }), row = [total];
            for (var y = 1; y <= years; y++) {
                var F = gauss(), sum = 0;
                for (var i = 0; i < items.length; i++) {
                    var T = TYPES[items[i].type] || TYPES.other;
                    var z = Math.sqrt(T.rho) * F + Math.sqrt(1 - T.rho) * gauss();
                    var g = Math.exp(Math.log(1 + T.mu) - T.sig * T.sig / 2 + T.sig * z);
                    // sparandet sätts in jämnt under året: i snitt halva årets avkastning
                    vals[i] = vals[i] * g + (items[i].bucket ? monthly * 12 * Math.sqrt(g) : 0);
                    sum += vals[i];
                }
                row.push(sum);
            }
            paths.push(row);
        }
        for (var yy = 0; yy <= years; yy++) {
            var col = paths.map(function (r) { return r[yy]; }).sort(function (a, b) { return a - b; });
            out.push({ y: yy, mean: col.reduce(function (a, b) { return a + b; }, 0) / N, p10: col[Math.floor(N * 0.1)], p50: col[Math.floor(N * 0.5)], p90: col[Math.floor(N * 0.9)], inv: total + monthly * 12 * yy, loss: col.filter(function (v) { return v < total + monthly * 12 * yy; }).length / N });
        }
        return out;
    }

    function renderTable() {
        var body = $('wl-body'); if (!body) return;
        body.textContent = '';
        if (!state.items.length) {
            var tr = document.createElement('tr'), td = document.createElement('td');
            td.colSpan = 5; td.className = 'muted'; td.textContent = 'Inga innehav än. Skriv in något ovan, till exempel "Avanza Zero" och 100.';
            tr.appendChild(td); body.appendChild(tr); return;
        }
        state.items.forEach(function (it, idx) {
            var tr = document.createElement('tr');
            var tdN = document.createElement('td'); tdN.textContent = it.name; tdN.style.color = 'var(--accent)'; tdN.style.fontWeight = '600';
            var tdT = document.createElement('td'), sel = document.createElement('select');
            sel.className = 'wl-input'; Object.keys(TYPES).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = TYPES[k].name; if (k === it.type) o.selected = true; sel.appendChild(o); });
            sel.addEventListener('change', function () { it.type = sel.value; save(); renderAll(); });
            tdT.appendChild(sel);
            var tdA = document.createElement('td'), inp = document.createElement('input');
            inp.type = 'number'; inp.min = '0'; inp.step = '1'; inp.value = it.amount; inp.className = 'wl-input'; inp.style.width = '110px';
            inp.addEventListener('change', function () { it.amount = Math.max(0, +inp.value || 0); save(); renderAll(); });
            tdA.appendChild(inp);
            var f = lognorm(it.type, 1), tdE = document.createElement('td');
            tdE.innerHTML = '<b>' + kr(it.amount * f.mean) + '</b> <span class="up">' + pct(f.mean - 1) + '</span><small>' + kr(it.amount * f.p10) + ' – ' + kr(it.amount * f.p90) + '</small>';
            var tdD = document.createElement('td'), del = document.createElement('button');
            del.className = 'wl-del'; del.title = 'Ta bort'; del.setAttribute('aria-label', 'Ta bort ' + it.name); del.textContent = '✕';
            del.addEventListener('click', function () { state.items.splice(idx, 1); save(); renderAll(); });
            tdD.appendChild(del);
            [tdN, tdE, tdA, tdT, tdD].forEach(function (c) { tr.appendChild(c); });
            body.appendChild(tr);
        });
    }

    function renderSummary(sim) {
        var total = state.items.reduce(function (a, x) { return a + x.amount; }, 0);
        var one = sim[1] || sim[0], end = sim[sim.length - 1];
        $('wl-total').textContent = kr(total);
        var sav = state.monthly > 0 ? ' inkl. sparande' : '';
        $('wl-1y').textContent = kr(one.mean);
        $('wl-1y-sub').textContent = 'förväntat' + sav + ' · ' + kr(one.p10) + ' – ' + kr(one.p90);
        $('wl-end-label').textContent = 'Om ' + state.years + ' år';
        $('wl-end').textContent = kr(end.mean);
        $('wl-end-sub').textContent = 'förväntat, varav insatt ' + kr(end.inv) + ' · ' + kr(end.p10) + ' – ' + kr(end.p90);
        // risk: andel krypto + enskilda aktier
        var risky = state.items.filter(function (x) { return x.type === 'crypto' || x.type === 'growth' || x.type === 'stock'; }).reduce(function (a, x) { return a + x.amount; }, 0);
        var cr = state.items.filter(function (x) { return x.type === 'crypto'; }).reduce(function (a, x) { return a + x.amount; }, 0);
        var rs = total ? risky / total : 0;
        $('wl-risk').textContent = Math.round(rs * 100) + ' %';
        $('wl-risk').className = 'stat-val ' + (rs > 0.5 ? 'down' : '');
        var notes = [];
        if (total && cr / total > 0.2) notes.push('Krypto är ' + Math.round(cr / total * 100) + ' % av allt. Algiz-regeln är högst 20 %.');
        if (total && rs > 0.5) notes.push('Mer än hälften ligger i enskilda aktier och krypto, som kan falla 50–80 % ett dåligt år. En global indexfond som bas sprider risken.');
        notes.push('Risk att ha mindre än insatt efter 1 år: ca ' + Math.round(one.loss * 100) + ' %, efter ' + state.years + ' år: ca ' + Math.round(end.loss * 100) + ' %.');
        $('wl-risk-sub').textContent = 'enskilda aktier + krypto';
        $('wl-notes').innerHTML = notes.map(function (n) { return '<li>' + n.replace(/</g, '&lt;') + '</li>'; }).join('');
    }

    function colors() { var light = document.documentElement.dataset.theme === 'light'; return { text: light ? '#475569' : '#8a8f9c', grid: light ? '#e5e7eb' : 'rgba(255,255,255,0.06)' }; }
    function renderChart(sim) {
        var box = $('wl-chart'); if (!box || typeof LightweightCharts === 'undefined') return;
        if (!chart) {
            var c = colors();
            chart = LightweightCharts.createChart(box, {
                autoSize: true,
                layout: { background: { type: LightweightCharts.ColorType.Solid, color: 'transparent' }, textColor: c.text },
                grid: { vertLines: { visible: false }, horzLines: { color: c.grid } },
                rightPriceScale: { borderVisible: false }, timeScale: { borderVisible: false },
                handleScroll: false, handleScale: false,
                localization: { priceFormatter: function (v) { return Math.round(v).toLocaleString('sv-SE') + ' kr'; } }
            });
            sP90 = chart.addLineSeries({ color: 'rgba(52,211,153,.45)', lineWidth: 1, lineStyle: 2, priceLineVisible: false, title: 'bra (90 %)' });
            sP50 = chart.addLineSeries({ color: '#34d399', lineWidth: 3, priceLineVisible: false, title: 'förväntat' });
            sP10 = chart.addLineSeries({ color: 'rgba(248,113,113,.6)', lineWidth: 1, lineStyle: 2, priceLineVisible: false, title: 'dåligt (10 %)' });
            sIn = chart.addLineSeries({ color: '#94a3b8', lineWidth: 1, priceLineVisible: false, title: 'insatt' });
            new MutationObserver(function () { var c2 = colors(); chart.applyOptions({ layout: { textColor: c2.text }, grid: { horzLines: { color: c2.grid } } }); })
                .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        }
        var y0 = new Date().getFullYear();
        var pts = function (k) { return sim.map(function (r) { return { time: (y0 + r.y) + '-01-01', value: Math.round(r[k]) }; }); };
        sP90.setData(pts('p90')); sP50.setData(pts('mean')); sP10.setData(pts('p10')); sIn.setData(pts('inv'));
        chart.timeScale().fitContent();
    }

    // ---------- Väg till miljonen: hur många år till 1 och 10 miljoner ----------
    var MAXY = 60;
    // första året (med decimaler) då kolumnen key når målet, annars null
    function yearsTo(sim, key, target) {
        if (sim[0][key] >= target) return 0;
        for (var y = 1; y < sim.length; y++) {
            if (sim[y][key] >= target) { var a = sim[y - 1][key], b = sim[y][key]; return y - 1 + (target - a) / (b - a); }
        }
        return null;
    }
    // ungefärligt månadssparande som behövs för att nå målet på `years` år med 50 % chans
    function neededMonthly(target, years) {
        var lo = 0, hi = target / (12 * years) * 1.2 + 1000;
        if (simulate(years, 0, 500)[years].p50 >= target) return 0;
        for (var k = 0; k < 14; k++) { var mid = (lo + hi) / 2; if (simulate(years, mid, 500)[years].p50 >= target) hi = mid; else lo = mid; }
        return Math.ceil(hi / 50) * 50;
    }
    function yrTxt(y) {
        if (y === null) return 'över ' + MAXY + ' år';
        if (y === 0) return 'redan nått';
        var yr = new Date().getFullYear() + Math.ceil(y);
        return (y < 10 ? y.toFixed(1).replace('.', ',') : Math.round(y)) + ' år <small>(' + yr + ')</small>';
    }
    function renderGoals() {
        var box = $('wl-goals'); if (!box) return;
        var total = state.items.reduce(function (a, x) { return a + x.amount; }, 0);
        if (!total && !state.monthly) { box.innerHTML = '<p class="wl-empty">Lägg in innehav eller ett månadssparande ovan så räknas vägen fram.</p>'; return; }
        var sim = simulate(MAXY, state.monthly, 1500), simMore = simulate(MAXY, state.monthly + 1000, 1000);
        var goals = [1e6, 1e7];
        var custom = +state.goal; if (custom > 0 && goals.indexOf(custom) < 0) goals.push(custom);
        box.innerHTML = goals.map(function (g) {
            var exp = yearsTo(sim, 'mean', g), med = yearsTo(sim, 'p50', g), safe = yearsTo(sim, 'p10', g), more = yearsTo(simMore, 'p50', g);
            var horizon = g >= 1e7 ? 20 : 10, need = neededMonthly(g, horizon);
            var title = g === 1e6 ? '1 miljon' : g === 1e7 ? '10 miljoner' : kr(g);
            return '<div class="wl-goal">' +
                '<div class="wl-goal-h">' + title + '</div>' +
                '<div class="wl-goal-big">' + yrTxt(med) + '</div><div class="wl-goal-cap">med 50 % chans (mittenutfall)</div>' +
                '<dl>' +
                '<dt>Förväntat (snitt)</dt><dd>' + yrTxt(exp) + '</dd>' +
                '<dt>Med 90 % chans</dt><dd>' + yrTxt(safe) + '</dd>' +
                '<dt>Med 1 000 kr mer/mån</dt><dd>' + yrTxt(more) + '</dd>' +
                '<dt>Sparande för ' + horizon + ' år</dt><dd>' + (need === 0 ? 'inget extra behövs' : kr(need) + '/mån') + '</dd>' +
                '</dl></div>';
        }).join('');
    }

    function renderAll() {
        renderTable();
        var sim = simulate(state.years);
        renderSummary(sim);
        renderChart(sim);
        renderGoals();
    }

    function init() {
        if (!$('view-wealth')) return;
        var name = $('wl-name'), amt = $('wl-amount'), type = $('wl-type');
        Object.keys(TYPES).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = TYPES[k].name; type.appendChild(o); });
        var typeTouched = false;
        name.addEventListener('input', function () { if (!typeTouched) type.value = guess(name.value); });
        type.addEventListener('change', function () { typeTouched = true; });
        $('wl-form').addEventListener('submit', function (e) {
            e.preventDefault();
            var n = name.value.trim(), a = +amt.value;
            if (!n || !(a > 0)) { (n ? amt : name).focus(); return; }
            var same = state.items.filter(function (x) { return x.name.toLowerCase() === n.toLowerCase(); })[0];
            if (same) { same.amount += a; same.type = type.value; } else state.items.push({ name: n, amount: a, type: type.value });
            name.value = ''; amt.value = ''; typeTouched = false; type.value = 'stock'; name.focus();
            save(); renderAll();
        });
        var mon = $('wl-monthly'), yrs = $('wl-years');
        mon.value = state.monthly || ''; yrs.value = String(state.years);
        var goal = $('wl-goal');
        if (goal) { goal.value = state.goal || ''; goal.addEventListener('change', function () { state.goal = Math.max(0, +goal.value || 0); save(); renderGoals(); }); }
        var st2 = $('wl-saveto');
        if (st2) {
            Object.keys(TYPES).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = TYPES[k].name; st2.appendChild(o); });
            st2.value = TYPES[state.saveTo] ? state.saveTo : 'global';
            st2.addEventListener('change', function () { state.saveTo = st2.value; save(); renderAll(); });
        }
        mon.addEventListener('change', function () { state.monthly = Math.max(0, +mon.value || 0); save(); renderAll(); });
        yrs.addEventListener('change', function () { state.years = +yrs.value || 10; save(); renderAll(); });
        // antagandena
        var ab = $('wl-assume');
        if (ab) ab.innerHTML = Object.keys(TYPES).map(function (k) { var T = TYPES[k], f = lognorm(k, 1); return '<tr><td>' + T.name + '</td><td>' + (T.mu * 100).toFixed(1) + ' %</td><td>' + Math.round(T.sig * 100) + ' %</td><td>' + pct(f.p10 - 1) + ' till ' + pct(f.p90 - 1) + '</td></tr>'; }).join('');
        renderAll();
        window.addEventListener('hashchange', function () { if (location.hash === '#wealth' && chart) setTimeout(function () { chart.timeScale().fitContent(); }, 50); });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
