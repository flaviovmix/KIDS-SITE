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

        // Dois modos de filtro:
        //  - categoria (default): chips = cfg.categorias, 1 valor por card (h.cat)
        //  - inclusão (cfg.filtros): chips = cfg.filtros, vários valores por card
        //    (h.filtros[]) — ex: filtrar histórias por personagem. O badge/cor do
        //    card continua vindo de h.cat + categorias.
        const filtros = cfg.filtros;
        const chipDefs = filtros || categorias;

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

        /* Chips: "Tudo" + um por chave. No modo `filtros` (personagens) os botões
           viram miniaturas redondas (foto + nome), iguais às do index. */
        const chaves = Object.keys(chipDefs);
        if (chaves.length > 0) {
            if (filtros) {
                chips.classList.add('hist-chips-thumbs');
                const todosHtml = cfg.semTodos ? '' :
                    `<button class="char-thumb char-thumb-all is-active" type="button" data-filter="all">
                        <span class="char-thumb-pic"><span class="char-thumb-allmark">★</span></span>
                        <span class="char-thumb-name">Todos</span>
                    </button>`;
                const thumbsHtml = chaves.map(c => {
                    const p = chipDefs[c];
                    const cor = p.cor ? ` style="--accent:${p.cor}"` : '';
                    const icone = p.icone || ('img/icone-' + c + '.png');
                    return `<button class="char-thumb" type="button" data-filter="${c}"${cor}>
                        <span class="char-thumb-pic"><img src="${icone}" alt="${p.nome}"></span>
                        <span class="char-thumb-name">${p.nome}</span>
                    </button>`;
                }).join('');
                // "Todos" fica fixo à esquerda; os personagens entram num carrossel infinito
                // (mesma mecânica do hero/index, em script.js). Fallback flat se ele não existir.
                if (!cfg.semCarrossel && typeof createInfiniteCarousel === 'function') {
                    chips.innerHTML = todosHtml +
                        `<div class="char-thumbs-carousel" data-char-thumbs-carousel>
                            <div class="char-thumbs-stage">
                                <button class="carousel-arrow left" type="button" aria-label="Mover para a esquerda">‹</button>
                                <div class="char-thumbs-viewport">
                                    <div class="char-thumbs">${thumbsHtml}</div>
                                </div>
                                <button class="carousel-arrow right" type="button" aria-label="Mover para a direita">›</button>
                            </div>
                        </div>`;
                } else {
                    chips.innerHTML = todosHtml + thumbsHtml;
                }
            } else {
                chips.innerHTML = `<button class="chip active" data-filter="all">Tudo</button>` +
                    chaves.map(c => `<button class="chip" data-filter="${c}">${chipDefs[c].nome}</button>`).join('');
            }

            const classeAtiva = filtros ? 'is-active' : 'active';
            chips.addEventListener('click', (e) => {
                const b = e.target.closest('[data-filter]');
                if (!b) return;
                const f = b.dataset.filter;
                // marca ativo em TODAS as cópias do filtro (original + clones do carrossel)
                chips.querySelectorAll('[data-filter]').forEach(c => c.classList.remove(classeAtiva));
                chips.querySelectorAll('[data-filter="' + f + '"]').forEach(c => c.classList.add(classeAtiva));
                grid.querySelectorAll('.hist-card').forEach(c => {
                    const chavesCard = (c.dataset.filtros || '').split(' ');
                    c.style.display = (f === 'all' || chavesCard.indexOf(f) !== -1) ? '' : 'none';
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
            // chaves que o filtro usa: a lista do item (modo inclusão) ou a categoria
            const chavesCard = filtros ? (h.filtros || []) : (h.cat ? [h.cat] : []);
            a.dataset.filtros = chavesCard.join(' ');
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

        // Pré-seleção via URL (?p=<chave>) — DEPOIS de montar os cards (senão não há
        // card pra filtrar). Ex: "Ver histórias" de um personagem abre já filtrado.
        // Só ativa se a chave existir nos chips.
        const inicial = new URLSearchParams(location.search).get('p');
        if (inicial && chipDefs[inicial]) {
            const alvo = chips.querySelector('[data-filter="' + inicial + '"]');
            if (alvo) alvo.click();
        }

        mount.replaceWith(hero, section);

        // Carrossel infinito da fileira de personagens (init DEPOIS de entrar no DOM,
        // senão offsetLeft não mede). Mesma mecânica do hero/index.
        if (filtros && typeof createInfiniteCarousel === 'function') {
            const carEl = section.querySelector('[data-char-thumbs-carousel]');
            if (carEl) {
                createInfiniteCarousel({
                    container: carEl,
                    viewport: carEl.querySelector('.char-thumbs-viewport'),
                    track: carEl.querySelector('.char-thumbs'),
                    leftButton: carEl.querySelector('.carousel-arrow.left'),
                    rightButton: carEl.querySelector('.carousel-arrow.right'),
                    loopDuration: 46000,
                    direction: -1,
                });
            }
        }
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
