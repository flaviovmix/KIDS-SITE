/* ===== kids-menu — barra de navegação do topo (reutilizável) =====
   Drop-in: basta <script src="components/kids-menu.js"></script> em qualquer
   página. O componente se injeta sozinho no topo do <body> (não precisa marcar
   HTML), marca o link da página atual como .active e cuida do menu hamburger.
   O CSS mora em style.css (.menu e filhos).

   Fonte única: mexer nos links AQUI reflete em todas as páginas. */
(function () {
    var LINKS = [
        { href: 'index.html',           label: 'Início' },
        { href: 'historias.html',       label: 'Histórias' },
        { href: 'emocoes.html',         label: 'Emoções' },
        { href: 'colorir.html',         label: 'Colorir' },
        { href: 'audio-historias.html', label: 'Áudio-histórias' },
        { href: 'familia.html',         label: 'Pra Família' }
    ];

    function currentPage() {
        var p = location.pathname.split('/').pop();
        return p === '' ? 'index.html' : p;
    }

    function build() {
        if (document.querySelector('.menu')) return null; // não duplica

        var page = currentPage();
        var logoHref = page === 'index.html' ? '#' : 'index.html';

        var items = LINKS.map(function (l) {
            var active = l.href === page ? ' active' : '';
            return '<li><a href="' + l.href + '" class="menu-link' + active + '">' + l.label + '</a></li>';
        }).join('');

        var nav = document.createElement('nav');
        nav.className = 'menu';
        nav.id = 'menu';
        nav.innerHTML =
            '<a href="' + logoHref + '" class="menu-logo">KACO</a>' +
            '<button class="menu-burger" id="menuBurger" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="menuList">' +
                '<span></span><span></span><span></span>' +
            '</button>' +
            '<ul class="menu-list" id="menuList">' + items + '</ul>';

        document.body.insertBefore(nav, document.body.firstChild);
        return nav;
    }

    function wire(menu) {
        var burger = menu.querySelector('#menuBurger');
        var list = menu.querySelector('#menuList');

        function setOpen(open) {
            menu.classList.toggle('open', open);
            burger.setAttribute('aria-expanded', open ? 'true' : 'false');
            burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
        }

        burger.addEventListener('click', function () {
            setOpen(!menu.classList.contains('open'));
        });
        list.addEventListener('click', function (e) {
            if (e.target.closest('.menu-link')) setOpen(false);
        });
        document.addEventListener('click', function (e) {
            if (!menu.classList.contains('open')) return;
            if (!menu.contains(e.target)) setOpen(false);
        });
        window.addEventListener('resize', function () {
            if (window.innerWidth > 700) setOpen(false);
        });
    }

    function init() {
        var menu = build();
        if (menu) wire(menu);
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
