/* ===== kids-footer — rodapé único do site (reutilizável) =====
   Drop-in: basta <script src="components/kids-footer.js"></script> em qualquer
   página. O componente se injeta sozinho no fim do <body> (não precisa marcar
   HTML). O CSS mora em style.css (.site-footer e filhos).

   Fonte única: mexer nos links/textos AQUI reflete em todas as páginas. */
(function () {
    var LINKS = [
        { href: 'index.html',           label: 'Início' },
        { href: 'historias.html',       label: 'Histórias' },
        { href: 'colorir.html',         label: 'Colorir' },
        { href: 'audio-historias.html', label: 'Áudio-histórias' },
        { href: 'familia.html',         label: 'Pra Família' }
    ];

    function build() {
        if (document.querySelector('.site-footer')) return; // não duplica

        var ano = new Date().getFullYear();

        var navLinks = LINKS.map(function (l) {
            return '<a href="' + l.href + '">' + l.label + '</a>';
        }).join('');

        var footer = document.createElement('footer');
        footer.className = 'site-footer';
        footer.innerHTML =
            '<div class="site-footer-inner">' +
                '<div class="footer-brand">' +
                    '<a href="index.html" class="footer-logo">KACO</a>' +
                    '<p class="footer-tagline">Histórias, sons e desenhos no ritmo de cada criança. 💛</p>' +
                '</div>' +
                '<nav class="footer-nav" aria-label="Rodapé">' + navLinks + '</nav>' +
            '</div>' +
            '<div class="footer-bottom">' +
                '<span>© ' + ano + ' Kaco · Feito com 💛 por Flávio Passos</span>' +
            '</div>';

        document.body.appendChild(footer);
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', build);
    } else {
        build();
    }
})();
