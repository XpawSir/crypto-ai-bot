// Flikar (Home / Latest Updates / Learn) och tema (mörkt/ljust). Fristående från script.js.
(function () {
    var views = { home: 'view-home', updates: 'view-updates', learn: 'view-learn' };

    function show(name) {
        if (!views[name]) name = 'home';
        Object.keys(views).forEach(function (k) {
            var el = document.getElementById(views[k]);
            if (el) el.classList.toggle('hidden', k !== name);
        });
        document.querySelectorAll('[data-tab]').forEach(function (a) {
            if (a.getAttribute('data-tab') === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
        });
        window.scrollTo(0, 0);
        // graferna måste få veta sin storlek igen när Home visas
        if (name === 'home') setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 30);
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
