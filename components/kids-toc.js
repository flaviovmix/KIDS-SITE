/* ===== kids-toc — menu flutuante "Nesta página" (reutilizável) =====
   Drop-in: basta <script src="components/kids-toc.js"></script> em qualquer
   página. O componente se injeta sozinho no <body> (não precisa marcar HTML).
   O CSS mora em style.css (.page-toc / .page-toc-toggle / .toc-icon-*).

   Os itens apontam pras seções da HOME. Na própria home viram âncora local
   (#secao) com scroll suave; em qualquer outra página viram index.html#secao,
   levando o visitante pra posição certa na home. */
(function () {
    // Fonte única dos itens — mexer aqui reflete em todas as páginas.
    var ITEMS = [
        { id: 'sobre',       label: 'Sobre' },
        { id: 'personagens', label: 'Personagens' },
        { id: 'emocoes',     label: 'Lidando com Emoções' },
        { id: 'rotina',      label: 'Ser Criança' },
        { id: 'familia',     label: 'Família' }
    ];

    function isHome() {
        var page = location.pathname.split('/').pop();
        return page === '' || page === 'index.html';
    }

    function build(home) {
        if (document.querySelector('.page-toc')) return null; // não duplica

        var toggle = document.createElement('button');
        toggle.className = 'page-toc-toggle';
        toggle.type = 'button';
        toggle.setAttribute('aria-label', 'Alternar menu da página');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-controls', 'pageToc');
        toggle.innerHTML =
            '<span class="toc-icon-menu" aria-hidden="true"><i></i><i></i><i></i></span>' +
            '<span class="toc-icon-close" aria-hidden="true"><i></i><i></i></span>';

        var lis = ITEMS.map(function (it) {
            var href = (home ? '#' : 'index.html#') + it.id;
            return '<li><a href="' + href + '">' + it.label + '</a></li>';
        }).join('');

        var nav = document.createElement('nav');
        nav.className = 'page-toc collapsed';
        nav.id = 'pageToc';
        nav.setAttribute('aria-label', 'Nesta página');
        nav.innerHTML = '<div class="page-toc-title">Nesta página</div><ul>' + lis + '</ul>';

        document.body.appendChild(toggle);
        document.body.appendChild(nav);
        return { toggle: toggle, nav: nav };
    }

    function init() {
        var home = isHome();
        var built = build(home);
        if (!built) return;
        var toggle = built.toggle, nav = built.nav;

        nav.querySelectorAll('li').forEach(function (item, i) {
            item.style.animationDelay = (0.25 + i * 0.05) + 's';
        });

        function setOpen(open) {
            nav.classList.toggle('collapsed', !open);
            toggle.classList.toggle('active', open);
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        }
        // Sempre começa fechado; abre só no clique do usuário.
        setOpen(false);

        toggle.addEventListener('click', function () {
            setOpen(nav.classList.contains('collapsed'));
        });

        nav.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function (e) {
                // Na home: scroll suave pro alvo local. Fora dela: deixa navegar.
                if (home) {
                    var target = document.querySelector(link.getAttribute('href'));
                    if (target) {
                        e.preventDefault();
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
                if (window.innerWidth <= 1440) setOpen(false);
            });
        });
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
