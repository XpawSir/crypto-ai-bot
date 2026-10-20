// Flikar (Home / Market / Latest Updates / Learn) och tema (mörkt/ljust). Fristående från script.js.
(function () {
    var views = { home: 'view-home', market: 'view-market', trend: 'view-trend', btceth: 'view-btceth', voltrend: 'view-voltrend', botrot: 'view-botrot', multi: 'view-multi', dca: 'view-dca', lev: 'view-lev', stocks: 'view-stocks', lab: 'view-lab', wealth: 'view-wealth', updates: 'view-updates', learn: 'view-learn' };
    // detaljsidorna hör till Home i menyn
    var tabFor = { btceth: 'home', voltrend: 'home', botrot: 'home', multi: 'home', dca: 'home', lev: 'home' };

    var current = null;
    function show(name) {
        if (!views[name]) name = 'home';
        if (current === 'market' && name !== 'market') window.dispatchEvent(new Event('market:hide'));
        Object.keys(views).forEach(function (k) {
            var el = document.getElementById(views[k]);
            if (el) el.classList.toggle('hidden', k !== name);
        });
        document.querySelectorAll('[data-tab]').forEach(function (a) {
            if (a.getAttribute('data-tab') === (tabFor[name] || name)) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
        });
        window.scrollTo(0, 0);
        if (name === 'market' && current !== 'market') window.dispatchEvent(new Event('market:show'));
        current = name;
        // graferna måste få veta sin storlek igen när Home visas
        if (name !== 'market') setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 30);
    }
    function route() { show((location.hash || '#home').slice(1)); }
    window.addEventListener('hashchange', route);
    route();

    function setTheme(t) {
        document.documentElement.dataset.theme = t;
        try { localStorage.setItem('cryptoai_theme', t); } catch (e) { /* privat läge */ }
        var b = document.getElementById('theme-btn');
        if (b) b.innerHTML = t === 'light' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
        if (window.setChartTheme) window.setChartTheme();
    }
    var btn = document.getElementById('theme-btn');
    if (btn) btn.addEventListener('click', function () {
        setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
    });
    setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
})();

(function () { var el = document.getElementById('ops-clock'); if (!el) return; function t() { el.textContent = new Date().toISOString().slice(11, 19); } t(); setInterval(t, 1000); })();
