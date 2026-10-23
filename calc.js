// "Vad blir kvar?": vinst på en aktie efter courtage, valutaväxling och skatt, i kronor.
(function () {
    var $ = function (id) { return document.getElementById(id); };
    if (!$('c-qty')) return;
    var IDS = ['c-tick', 'c-cur', 'c-qty', 'c-buy', 'c-now', 'c-fxb', 'c-fxn', 'c-fee', 'c-fxfee', 'c-acc', 'c-isk', 'c-yrs', 'c-sell'];
    var KEY = 'algiz_calc_v1', BASE = 'https://raw.githubusercontent.com/XpawSir/crypto-ai-bot/bot-state/';
    var num = function (id) { var v = parseFloat(String($(id).value).replace(',', '.')); return isFinite(v) ? v : 0; };
    var sek = function (v) { return Math.round(v).toLocaleString('sv-SE') + ' kr'; };
    var sgn = function (v) { return (v >= 0 ? '+' : '−') + Math.abs(Math.round(v)).toLocaleString('sv-SE') + ' kr'; };
    var pc = function (v) { return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1).replace('.', ',') + ' %'; };
    var stocks = null;

    function save() { try { var o = {}; IDS.forEach(function (i) { o[i] = $(i).value; }); localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* privat läge */ } }
    function restore() { try { var o = JSON.parse(localStorage.getItem(KEY) || '{}'); IDS.forEach(function (i) { if (o[i] !== undefined && o[i] !== null) $(i).value = o[i]; }); } catch (e) { /* inget sparat */ } }

    function cell(tr, text, cls) { var td = document.createElement('td'); td.textContent = text; if (cls) td.className = cls; tr.appendChild(td); }

    function calc() {
        var usd = $('c-cur').value === 'USD', acc = $('c-acc').value;
        $('c-isk-w').style.display = acc === 'isk' ? '' : 'none';
        $('c-yrs-w').style.display = acc === 'isk' ? '' : 'none';
        ['c-fxb', 'c-fxn'].forEach(function (i) { $(i).closest('label').style.display = usd ? '' : 'none'; });
        var n = num('c-qty'), buy = num('c-buy'), fxb = usd ? num('c-fxb') : 1, fxn = usd ? num('c-fxn') : 1;
        var fee = num('c-fee') / 100, fxf = usd ? num('c-fxfee') / 100 : 0, isk = num('c-isk') / 100, yrs = num('c-yrs');
        var prices = String($('c-sell').value).split(/[;,\s]+/).map(function (x) { return parseFloat(x.replace(',', '.')); }).filter(function (x) { return isFinite(x) && x > 0; });
        if (!prices.length && num('c-now') > 0) prices = [num('c-now')];
        var body = $('c-body'), sum = $('c-sum'), be = $('c-be'); body.textContent = ''; sum.textContent = ''; be.textContent = '';
        if (!(n > 0 && buy > 0 && fxb > 0 && fxn > 0) || !prices.length) {
            var tr = document.createElement('tr'); cell(tr, 'Fyll i antal, köpkurs' + (usd ? ', växelkurser' : '') + ' och minst en säljkurs.'); tr.firstChild.colSpan = 6; body.appendChild(tr); return;
        }
        var cost = n * buy * fxb, buyFees = cost * (fee + fxf), totalIn = cost + buyFees, first = null;
        prices.forEach(function (p, idx) {
            var proceeds = n * p * fxn, sellFees = proceeds * (fee + fxf), net = proceeds - sellFees;
            var gross = proceeds - cost, fees = buyFees + sellFees, gain = net - totalIn, tax = 0;
            if (acc === 'af') tax = Math.max(0, gain) * 0.30; else if (acc === 'isk') tax = proceeds * isk * yrs;
            var left = net - tax, res = left - totalIn;
            if (idx === 0) first = { p: p, gross: gross, fees: fees, tax: tax, res: res };
            var tr = document.createElement('tr');
            cell(tr, (usd ? '$' : '') + p.toLocaleString('sv-SE', { maximumFractionDigits: 2 }) + (usd ? '' : ' kr'));
            cell(tr, sgn(gross), gross >= 0 ? 'up' : 'down'); cell(tr, '−' + sek(fees)); cell(tr, tax ? '−' + sek(tax) : '0 kr');
            cell(tr, sgn(res), res >= 0 ? 'up' : 'down'); cell(tr, pc(res / totalIn * 100), res >= 0 ? 'up' : 'down');
            body.appendChild(tr);
        });
        var keep = first.gross > 0 ? Math.round(first.res / first.gross * 100) : null;
        sum.textContent = 'Insats inklusive köpkostnader: ' + sek(totalIn) + '. Vid säljkurs ' + (usd ? '$' : '') + first.p.toLocaleString('sv-SE', { maximumFractionDigits: 2 }) + ': före kostnader ' + sgn(first.gross) + ', kvar ' + sgn(first.res) + (keep !== null ? ', alltså ' + keep + ' % av vinsten.' : '.');
        // brytpunkt: säljkurs där resultatet blir noll efter kostnader (och ISK-skatt)
        var drag = fee + fxf + (acc === 'isk' ? isk * yrs : 0), be0 = totalIn / (n * fxn * (1 - drag));
        be.textContent = 'Du går jämnt upp efter alla kostnader vid en säljkurs på ' + (usd ? '$' : '') + be0.toLocaleString('sv-SE', { maximumFractionDigits: 2 }) + (usd ? '' : ' kr') + (be0 > buy ? ' (' + pc((be0 / buy - 1) * 100) + ' över ditt köp).' : '.');
    }

    function loadStocks() {
        fetch(BASE + 'stocks.json?t=' + Date.now()).then(function (r) { return r.ok ? r.json() : null; }).then(function (st) {
            if (!st) return; stocks = st;
            if (typeof st.usdsek === 'number' && !num('c-fxn')) $('c-fxn').value = st.usdsek.toFixed(2);
            hint(); calc();
        }).catch(function () { /* offline: fyll i själv */ });
    }
    function hint() {
        var t = String($('c-tick').value).trim().toUpperCase(), h = $('c-hint'); h.textContent = '';
        if (!t || !stocks || !Array.isArray(stocks.stocks)) return;
        var s = stocks.stocks.filter(function (x) { return x.symbol === t; })[0];
        if (s && typeof s.price === 'number') { h.textContent = t + ' kostar just nu ca $' + s.price.toFixed(2) + ' (Yahoo Finance, fördröjd ca 15 min). '; if (!num('c-now')) $('c-now').value = s.price.toFixed(2); }
        else h.textContent = 'Kursen för ' + t + ' hämtas inte automatiskt. Skriv in den själv.';
    }

    restore(); calc(); loadStocks();
    IDS.forEach(function (i) { $(i).addEventListener('input', function () { if (i === 'c-tick') hint(); save(); calc(); }); $(i).addEventListener('change', function () { save(); calc(); }); });
})();
