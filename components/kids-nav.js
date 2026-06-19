/* ===== kids-nav — botões "Voltar" e "Avançar" flutuantes (reutilizável) =====
   Drop-in: basta <script src="components/kids-nav.js"></script> em qualquer
   página. O componente se injeta sozinho no <body> (não precisa marcar HTML).
   O CSS mora em style.css (.kids-nav / .kids-back / .kids-fwd).

   Os botões só espelham o histórico do navegador: Voltar = history.back(),
   Avançar = history.forward(). Quando não há pra onde ir, o navegador
   simplesmente ignora (mesmo comportamento das setas dele). */
(function () {
    function build() {
        if (document.querySelector('.kids-nav')) return; // não duplica

        var nav = document.createElement('div');
        nav.className = 'kids-nav';
        nav.innerHTML =
            '<button class="kids-back" type="button" aria-label="Voltar">' +
                '<span class="kids-back-arrow" aria-hidden="true">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
                    'stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
                    '<polyline points="15 5 8 12 15 19"></polyline></svg>' +
                '</span>Voltar' +
            '</button>' +
            '<button class="kids-fwd" type="button" aria-label="Avançar">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
                'stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
                '<polyline points="9 5 16 12 9 19"></polyline></svg>' +
            '</button>';

        nav.querySelector('.kids-back').addEventListener('click', function () {
            window.history.back();
        });
        nav.querySelector('.kids-fwd').addEventListener('click', function () {
            window.history.forward();
        });

        document.body.appendChild(nav);
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', build);
    } else {
        build();
    }
})();
