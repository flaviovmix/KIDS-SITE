/*
 * kids-historias — componente reutilizável de página de coleção:
 * hero compacto (kicker + título + sub + onda) + chips de filtro + grid de cards.
 *
 * Uso em qualquer página:
 *
 *   <div id="kidsHistorias"></div>
 *   <script>
 *       window.kidsHistoriasConfig = {
 *           kicker: 'AS AVENTURAS DO KACO',
 *           titulo: 'Histórias',
 *           sub: 'Cada história é curtinha, ilustrada e no ritmo de quem lê.',
 *           hint: 'Clique numa história pra ler ↗',     // opcional
 *           acaoLabel: 'Ler →',                          // opcional (default 'Ler →')
 *           categorias: {                                // chave usada no cat dos itens
 *               emocoes:  { nome: 'Emoções',  cor: '#f59e0b' },
 *               rotina:   { nome: 'Rotina',   cor: '#2aa9e0' },
 *               aventura: { nome: 'Aventura', cor: '#22b07d' },
 *           },
 *           itens: [
 *               { t: 'Título', cat: 'rotina', status: 'no ar',
 *                 img: 'img-slide/0 (1).png', desc: 'Descrição curta.', link: '#' },
 *           ],
 *       };
 *   </script>
 *   <script src="components/kids-historias.js"></script>
 *
 * O CSS mora no style.css (seção "Página Histórias").
 */
(function () {
    function init() {
        const mount = document.getElementById('kidsHistorias');
        const cfg = window.kidsHistoriasConfig;
        if (!mount || !cfg) return;

        const categorias = cfg.categorias || {};
        const itens = cfg.itens || [];
        const acaoLabel = cfg.acaoLabel || 'Ler →';

        /* ----- Hero compacto (componente único kids-hero) ----- */
        const hero = window.KidsHero.build({
            kicker: cfg.kicker,
            titulo: cfg.titulo,
            sub: cfg.sub,
            emojis: cfg.emojis || ['🍌', '🪐'],
        });

        /* ----- Seção: chips de filtro + grid ----- */
        const section = document.createElement('main');
        section.className = 'content';
        section.innerHTML = `
            <section class="section section-light">
                <div class="hist-wrap">
                    <div class="hist-controls">
                        <div class="hist-chips"></div>
                        ${cfg.hint ? `<span class="hist-hint">${cfg.hint}</span>` : ''}
                    </div>
                    <div class="hist-grid"></div>
                </div>
            </section>`;

        const chips = section.querySelector('.hist-chips');
        const grid = section.querySelector('.hist-grid');

        /* Chips: "Tudo" + uma por categoria (só se houver categorias) */
        const chaves = Object.keys(categorias);
        if (chaves.length > 0) {
            chips.innerHTML = `<button class="chip active" data-filter="all">Tudo</button>` +
                chaves.map(c => `<button class="chip" data-filter="${c}">${categorias[c].nome}</button>`).join('');

            chips.addEventListener('click', (e) => {
                const b = e.target.closest('.chip');
                if (!b) return;
                chips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                b.classList.add('active');
                const f = b.dataset.filter;
                grid.querySelectorAll('.hist-card').forEach(c => {
                    c.style.display = (f === 'all' || c.dataset.cat === f) ? '' : 'none';
                });
            });
        } else {
            section.querySelector('.hist-controls').style.display = 'none';
        }

        /* Cards */
        itens.forEach(h => {
            const cat = categorias[h.cat] || { nome: h.cat, cor: '#2aa9e0' };
            const a = document.createElement('a');
            a.className = 'hist-card';
            a.dataset.cat = h.cat;
            a.style.setProperty('--accent', cat.cor);
            a.href = h.link || '#';
            a.innerHTML = `
                <div class="hist-head">
                    <img src="${h.img}" alt="${h.t}">
                    <span class="hist-badge">${cat.nome}</span>
                    ${h.status ? `<span class="hist-status"><i></i>${h.status}</span>` : ''}
                </div>
                <div class="hist-body">
                    <h3>${h.t}</h3>
                    <p>${h.desc || ''}</p>
                    <span class="hist-go">${acaoLabel}</span>
                </div>`;
            grid.appendChild(a);
        });

        mount.replaceWith(hero, section);
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
