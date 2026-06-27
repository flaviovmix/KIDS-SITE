/* ===== kids-nav — botão "Voltar" flutuante (reutilizável) =====
   Drop-in: basta <script src="components/kids-nav.js"></script> em qualquer
   página. O componente se injeta sozinho no <body> (não precisa marcar HTML).
   O CSS mora em style.css (.kids-nav / .kids-back).

   VOLTAR é CONTEXTUAL (não é o back do navegador): cada página conhece a sua
   "página-mãe" (a seção de onde ela faz parte) e o Voltar leva SEMPRE pra lá,
   não importa por onde a criança chegou. O mapa PARENT abaixo só lista quem
   volta pra uma seção; todo o resto (os hubs de topo) cai no default index.html.
   Na própria home não há mãe, então a navegação nem aparece. */
(function () {
    // Nome do arquivo da página atual ('index.html' quando a URL termina em '/').
    function currentPage() {
        var p = location.pathname.split('/').pop();
        return p === '' ? 'index.html' : p;
    }

    // Página-mãe de cada filho de seção. Quem não está aqui volta pra index.html.
    var PARENT = {
        // Pra Família
        'alimentacao.html':    'familia.html',
        'agressividade.html':  'familia.html',
        'atraso-na-fala.html': 'familia.html',
        // Emoções
        'emocao-alegria.html':  'emocoes.html',
        'emocao-calma.html':    'emocoes.html',
        'emocao-medo.html':     'emocoes.html',
        'emocao-raiva.html':    'emocoes.html',
        'emocao-surpresa.html': 'emocoes.html',
        'emocao-tristeza.html': 'emocoes.html',
        // Rotina (a seção mora na home, na âncora #rotina)
        'rotina-acordar.html':            'index.html#rotina',
        'rotina-escovar-dentes.html':     'index.html#rotina',
        'rotina-tomar-cafe.html':         'index.html#rotina',
        'rotina-se-arrumar.html':         'index.html#rotina',
        'rotina-ir-pra-escola.html':      'index.html#rotina',
        'rotina-tomar-banho.html':        'index.html#rotina',
        'rotina-arrumar-brinquedos.html': 'index.html#rotina',
        'rotina-ajudar.html':             'index.html#rotina',
        'rotina-dormir.html':             'index.html#rotina',
        // Brincar
        'quebra-cabeca-jogo.html': 'quebra-cabeca.html',
        // Histórias
        'historia.html': 'historias.html'
    };

    function parentOf(page) {
        return PARENT[page] || 'index.html';
    }

    function build() {
        if (document.querySelector('.kids-nav')) return; // não duplica

        var page = currentPage();
        if (page === 'index.html') return; // home não tem pra onde voltar

        var nav = document.createElement('div');
        nav.className = 'kids-nav';
        nav.innerHTML =
            '<button class="kids-back" type="button" aria-label="Voltar">' +
                '<span class="kids-back-arrow" aria-hidden="true">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
                    'stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
                    '<polyline points="15 5 8 12 15 19"></polyline></svg>' +
                '</span>Voltar' +
            '</button>';

        nav.querySelector('.kids-back').addEventListener('click', function () {
            window.location.href = parentOf(page); // sobe pra página-mãe
        });

        document.body.appendChild(nav);
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', build);
    } else {
        build();
    }
})();
