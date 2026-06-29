/* ===== kids-menu — barra de navegação do topo (reutilizável) =====
   Drop-in: basta <script src="components/kids-menu.js"></script> em qualquer
   página. O componente se injeta sozinho no topo do <body> (não precisa marcar
   HTML), marca o link da página atual como .active e cuida do menu hamburger.
   O CSS mora em style.css (.menu e filhos).

   Fonte única: mexer nos links AQUI reflete em todas as páginas. */
(function () {
    // Itens do topo. Quando tem `children`, vira dropdown (o pai não navega, só abre).
    var LINKS = [
        { href: 'index.html',     label: 'Início' },
        { href: 'historias.html', label: 'Histórias' },
        // { href: 'audio-historias.html', label: 'Áudio-histórias' }, // oculto até ter áudios
        { label: 'Brincar', children: [
            { href: 'colorir.html',       label: 'Colorir' },
            { href: 'quebra-cabeca.html', label: 'Quebra-cabeça' },
            { href: 'aprender.html',      label: 'Vamos Aprender' }
        ] },
        { label: 'Mundo do Kaco', children: [
            { href: 'personagens.html',  label: 'Personagens' },
            { href: 'emocoes.html',      label: 'Emoções' },
            { href: 'index.html#rotina', label: 'Rotina' }
        ] },
        { label: 'Pra Família', children: [
            { href: 'familia.html', label: 'Como usar' },
            { href: 'sobre.html',   label: 'Sobre' }
        ] }
    ];

    // Prefixo até a raiz do site. Páginas em subpasta (ex: MATEMATICA/somar/)
    // definem window.kidsMenuBase = '../../' pros links/logo apontarem certo.
    var BASE = window.kidsMenuBase || '';

    function currentPage() {
        var p = location.pathname.split('/').pop();
        return p === '' ? 'index.html' : p;
    }

    // Em subpasta o CSS do menu (style.css da raiz) não está carregado: injeta a
    // versão portátil (components/kids-menu.css). Páginas da raiz já têm no style.css.
    function ensureCss() {
        if (!BASE) return;
        if (document.querySelector('link[data-kids-menu-css]')) return;
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = BASE + 'components/kids-menu.css';
        link.setAttribute('data-kids-menu-css', '');
        document.head.appendChild(link);
    }

    function build() {
        if (document.querySelector('.menu')) return null; // não duplica

        var page = currentPage();
        var logoHref = page === 'index.html' ? '#' : BASE + 'index.html';

        var items = LINKS.map(function (l) {
            if (l.children) {
                var anyActive = l.children.some(function (c) { return c.href === page; });
                var kids = l.children.map(function (c) {
                    var ca = c.href === page ? ' active' : '';
                    return '<li><a href="' + BASE + c.href + '" class="menu-link menu-sub' + ca + '">' + c.label + '</a></li>';
                }).join('');
                return '<li class="menu-group' + (anyActive ? ' active' : '') + '">' +
                    '<button type="button" class="menu-link menu-trigger' + (anyActive ? ' active' : '') + '" aria-expanded="false">' +
                        l.label + '<span class="menu-caret" aria-hidden="true">▾</span>' +
                    '</button>' +
                    '<ul class="menu-dropdown">' + kids + '</ul>' +
                '</li>';
            }
            var active = l.href === page ? ' active' : '';
            return '<li><a href="' + BASE + l.href + '" class="menu-link' + active + '">' + l.label + '</a></li>';
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

        function closeGroups() {
            menu.querySelectorAll('.menu-group.open').forEach(function (g) {
                g.classList.remove('open');
                var t = g.querySelector('.menu-trigger');
                if (t) t.setAttribute('aria-expanded', 'false');
            });
        }

        // Dropdowns: clique no pai abre/fecha; abrir um fecha os outros.
        menu.querySelectorAll('.menu-trigger').forEach(function (trig) {
            trig.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                var li = trig.closest('.menu-group');
                var wasOpen = li.classList.contains('open');
                closeGroups();
                if (!wasOpen) {
                    li.classList.add('open');
                    trig.setAttribute('aria-expanded', 'true');
                }
            });
        });

        // Passar o mouse por um item do topo abre o dropdown dele (e fecha os
        // outros); por um link simples, fecha o que estiver aberto. O clique
        // continua valendo pro touch/celular (onde não há hover).
        menu.querySelectorAll('.menu-list > li').forEach(function (li) {
            li.addEventListener('mouseenter', function () {
                if (li.classList.contains('open')) return; // já é o aberto
                closeGroups();
                var trig = li.querySelector('.menu-trigger');
                if (trig) {
                    li.classList.add('open');
                    trig.setAttribute('aria-expanded', 'true');
                }
            });
        });

        burger.addEventListener('click', function () {
            setOpen(!menu.classList.contains('open'));
        });
        list.addEventListener('click', function (e) {
            // só links de navegação fecham o menu mobile; o pai (trigger) só abre a sanfona
            if (e.target.closest('.menu-link') && !e.target.closest('.menu-trigger')) setOpen(false);
        });
        document.addEventListener('click', function (e) {
            if (menu.contains(e.target)) return;
            setOpen(false);
            closeGroups();
        });
        window.addEventListener('resize', function () {
            if (window.innerWidth > 700) { setOpen(false); closeGroups(); }
        });
    }

    function init() {
        ensureCss();
        var menu = build();
        if (menu) wire(menu);
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
