/* ===== kids-hero — cabeçalho compacto das páginas internas (reutilizável) =====
   Os floaters, a onda SVG e o markup do hero moram SÓ aqui — fonte única.

   Dois jeitos de usar:

   1) Auto-mount por config (familia, áudio-histórias):
        <div id="kidsHero"></div>
        <script>
            window.kidsHeroConfig = {
                kicker: 'PARA PAIS E TERAPEUTAS',
                titulo: 'Pra Família',
                sub:    'De onde o Kaco veio...',
                emojis: ['💛', '🤝']        // os 2 emojis flutuantes (opcional)
            };
        </script>
        <script src="components/kids-hero.js"></script>

   2) Via API, pra outro componente montar o hero (ex: kids-historias):
        const header = window.KidsHero.build({ kicker, titulo, sub, emojis });

   O CSS mora em style.css (.page-hero e filhos). */
(function () {
    function build(cfg) {
        cfg = cfg || {};
        var emojis = cfg.emojis || ['🌟', '🪐'];

        var header = document.createElement('header');
        header.className = 'page-hero';
        header.innerHTML =
            '<div class="floaters">' +
                '<span class="floater f1">★</span>' +
                '<span class="floater f2">✦</span>' +
                '<span class="floater f4">✧</span>' +
                '<span class="floater f10">★</span>' +
                '<span class="floater f14 emoji">' + emojis[0] + '</span>' +
                '<span class="floater f18 emoji">' + emojis[1] + '</span>' +
            '</div>' +
            '<div class="page-hero-content">' +
                (cfg.kicker ? '<span class="page-hero-kicker">' + cfg.kicker + '</span>' : '') +
                '<h1 class="page-hero-title">' + (cfg.titulo || '') + '</h1>' +
                (cfg.sub ? '<p class="page-hero-sub">' + cfg.sub + '</p>' : '') +
            '</div>' +
            '<div class="wave-wrap page-hero-wave" aria-hidden="true">' +
                '<svg class="wave" viewBox="0 24 150 28" preserveAspectRatio="none">' +
                    '<defs><path id="wave-path-hero" d="M-160 44c30 0 58-18 88-18s58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z" /></defs>' +
                    '<g class="wave-parallax"><use href="#wave-path-hero" x="48" y="-3" fill="#ffffff" /></g>' +
                '</svg>' +
            '</div>';
        return header;
    }

    // API pública (síncrona, disponível assim que o script carrega).
    window.KidsHero = { build: build };

    // Auto-mount: troca <div id="kidsHero"> pelo hero montado a partir do config.
    function autoMount() {
        var mount = document.getElementById('kidsHero');
        if (!mount || !window.kidsHeroConfig) return;
        mount.replaceWith(build(window.kidsHeroConfig));
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', autoMount);
    } else {
        autoMount();
    }
})();
