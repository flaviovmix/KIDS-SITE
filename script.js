/*
 * createInfiniteCarousel — mecânica de carrossel infinito reutilizável.
 * Extraída do carrossel do hero; usada também na fileira de personagens.
 *  - velocidade automática contínua em uma direção
 *  - drag manual com pointer events + inércia ao soltar (soltar arrastando troca a direção)
 *  - loop infinito via triplicação da sequência e normalizeOffset()
 *  - opcional: botões de direção (hero) e pausa-no-hover (fileira de personagens)
 *
 * Retorna { rebuild } pra reconstruir o loop quando os itens mudam (ex: filtro).
 */
function createInfiniteCarousel(config) {
    const sliderContainer = config.container;
    const viewport = config.viewport;
    const track = config.track;
    if (!sliderContainer || !viewport || !track) return null;

    const leftButton = config.leftButton || null;
    const rightButton = config.rightButton || null;
    const loopDuration = config.loopDuration || 60000;   // ms pra atravessar 1 sequência
    const pauseOnHover = !!config.pauseOnHover;

    let sequenceWidth = 0;
    let originalSlideCount = 0;
    let currentOffset = 0;
    let lastFrameTime = null;
    let direction = config.direction || -1;   // -1 = pra esquerda, +1 = pra direita
    let isPaused = false;
    let isSoftStopping = false;
    let isHoverPaused = false;
    let isPointerDown = false;
    let isDragging = false;
    let lastPointerX = 0;
    let lastDragTime = 0;
    let glideVelocity = null;
    let recentSamples = [];
    let dragTotalDistance = 0;
    // movimento (px) que vira drag de verdade — e que invalida o click do item.
    // Abaixo disso é um toque: o click passa normal (seleciona/filtra) e não move nada.
    const dragThreshold = 6;

    const glideBoost = 2.45;
    const maxGlideMultiplier = 62;
    const glideFrictionDuration = 820;
    const releaseSampleWindow = 140;

    function tripleSequence() {
        // Clona os itens originais 2x mais → 3 sequências pro loop infinito funcionar
        const originals = Array.from(track.children).filter(n => !n.hasAttribute('data-carousel-clone'));
        originalSlideCount = originals.length;
        for (let i = 0; i < 2; i++) {
            originals.forEach(node => {
                const clone = node.cloneNode(true);
                clone.setAttribute('aria-hidden', 'true');
                clone.setAttribute('data-carousel-clone', '');
                track.appendChild(clone);
            });
        }
    }

    function preventImageDrag() {
        track.querySelectorAll('img').forEach(img => {
            img.setAttribute('draggable', 'false');
            img.addEventListener('dragstart', e => e.preventDefault());
        });
    }

    function updateScrollDistance() {
        const firstCard = track.children[0];
        const firstDuplicatedCard = track.children[originalSlideCount];
        if (!firstCard || !firstDuplicatedCard) { sequenceWidth = 0; return; }
        sequenceWidth = firstDuplicatedCard.offsetLeft - firstCard.offsetLeft;
    }

    function normalizeOffset(offset) {
        if (sequenceWidth <= 0) return offset;
        let n = offset;
        while (n <= sequenceWidth * -2) n += sequenceWidth;
        while (n > sequenceWidth * -1) n -= sequenceWidth;
        return n;
    }

    function changeDirection(newDirection) {
        direction = newDirection;
        isPaused = false;
        isSoftStopping = false;
        glideVelocity = null;
        updateControlButtons();
    }

    function pauseCarousel() {
        isSoftStopping = true;
        isPaused = false;
        glideVelocity = direction * (sequenceWidth / loopDuration);
        updateControlButtons();
    }

    function handleDirectionButton(buttonDirection) {
        if (!isPaused && direction === buttonDirection) { pauseCarousel(); return; }
        changeDirection(buttonDirection);
    }

    function updateControlButtons() {
        if (!leftButton || !rightButton) return;
        const movingLeft  = (!isPaused || isSoftStopping) && direction === -1;
        const movingRight = (!isPaused || isSoftStopping) && direction ===  1;
        leftButton.classList.toggle('active',  movingLeft);
        rightButton.classList.toggle('active', movingRight);
    }

    function startDrag(event) {
        if (event.target.closest('.carousel-arrow')) return;   // ignora drag iniciado em botão
        // Só registra o ponteiro. O drag de verdade (com preventDefault) só começa
        // quando o movimento passa do limiar — assim um clique simples passa normal
        // e dispara a seleção/filtro, sem captura de ponteiro engolindo o click.
        isPointerDown = true;
        isDragging = false;
        lastPointerX = event.clientX;
        lastDragTime = event.timeStamp;
        dragTotalDistance = 0;
        recentSamples = [];
    }

    function dragSlider(event) {
        if (!isPointerDown) return;
        const deltaX = event.clientX - lastPointerX;
        const elapsed = Math.max(event.timeStamp - lastDragTime, 1);
        dragTotalDistance += Math.abs(deltaX);
        lastPointerX = event.clientX;
        lastDragTime = event.timeStamp;
        if (!isDragging) {
            if (dragTotalDistance <= dragThreshold) return;   // ainda é toque, não move nada
            isDragging = true;                                 // virou drag: segura o carrossel
            isPaused = true;
            isSoftStopping = false;
            glideVelocity = null;
            sliderContainer.classList.add('dragging');
        }
        if (event.cancelable) event.preventDefault();   // evita seleção de texto durante o arrasto
        currentOffset += deltaX;
        recentSamples.push({ deltaX: deltaX, elapsed: elapsed, time: event.timeStamp });
        while (recentSamples.length && (event.timeStamp - recentSamples[0].time) > releaseSampleWindow) {
            recentSamples.shift();
        }
        track.style.transform = `translateX(${normalizeOffset(currentOffset)}px)`;
    }

    function stopDrag(event) {
        if (!isPointerDown) return;
        isPointerDown = false;
        sliderContainer.classList.remove('dragging');
        if (!isDragging) return;   // foi um toque: deixa o click rolar (seleção/filtro)
        isDragging = false;
        isSoftStopping = false;

        let recentVelocity = 0;
        if (recentSamples.length > 0) {
            const totalDelta = recentSamples.reduce((s, x) => s + x.deltaX, 0);
            const span = recentSamples.reduce((s, x) => s + x.elapsed, 0);
            recentVelocity = totalDelta / span;
        }
        const timeSinceLastMove = event.timeStamp - lastDragTime;
        const wasMovingAtRelease = timeSinceLastMove < 100 && Math.abs(recentVelocity) > 0.05;

        if (wasMovingAtRelease) {
            isPaused = false;
            direction = recentVelocity > 0 ? 1 : -1;   // soltar arrastando troca a direção
            const maxGlideVelocity = (sequenceWidth / loopDuration) * maxGlideMultiplier;
            const boosted = recentVelocity * glideBoost;
            glideVelocity = Math.max(Math.min(boosted, maxGlideVelocity), -maxGlideVelocity);
        } else {
            isPaused = true;
            glideVelocity = null;
        }

        updateControlButtons();
    }

    function animateSlider(time) {
        if (lastFrameTime === null) lastFrameTime = time;
        const elapsed = Math.min(time - lastFrameTime, 100);
        const speed = sequenceWidth / loopDuration;
        const normalVelocity = direction * speed;

        if (!isDragging && !isPaused && !isHoverPaused) {
            if (isSoftStopping) {
                glideVelocity = glideVelocity === null ? normalVelocity : glideVelocity;
                currentOffset += glideVelocity * elapsed;
                glideVelocity *= Math.exp(-elapsed / 420);
                if (Math.abs(glideVelocity) < 0.003) {
                    glideVelocity = null;
                    isSoftStopping = false;
                    isPaused = true;
                    updateControlButtons();
                }
            } else if (glideVelocity !== null) {
                currentOffset += glideVelocity * elapsed;
                glideVelocity = normalVelocity + ((glideVelocity - normalVelocity) * Math.exp(-elapsed / glideFrictionDuration));
                if (Math.abs(glideVelocity - normalVelocity) < 0.006) {
                    glideVelocity = null;
                    updateControlButtons();
                }
            } else {
                currentOffset += normalVelocity * elapsed;
            }
        }

        track.style.transform = `translateX(${normalizeOffset(currentOffset)}px)`;
        lastFrameTime = time;
        requestAnimationFrame(animateSlider);
    }

    function rebuild() {
        // reconstrói o loop a partir dos itens atuais (ex: depois de um filtro trocar a fileira)
        Array.from(track.querySelectorAll('[data-carousel-clone]')).forEach(n => n.remove());
        tripleSequence();
        preventImageDrag();
        updateScrollDistance();
        currentOffset = sequenceWidth * -1;
        lastFrameTime = null;
    }

    // init
    tripleSequence();
    preventImageDrag();
    updateScrollDistance();
    currentOffset = sequenceWidth * -1;
    updateControlButtons();

    if (leftButton)  leftButton.addEventListener('click',  () => handleDirectionButton(-1));
    if (rightButton) rightButton.addEventListener('click', () => handleDirectionButton( 1));

    // Cancela o click do item só quando houve arrasto de verdade (> limiar)
    track.addEventListener('click', (event) => {
        if (dragTotalDistance > dragThreshold) {
            event.preventDefault();
            event.stopPropagation();
        }
    }, true);

    // Drag começa no viewport; movimento/soltura na window (segue fora do viewport,
    // sem setPointerCapture — que estava redirecionando o click e matando a seleção)
    viewport.addEventListener('pointerdown', startDrag);
    window.addEventListener('pointermove',   dragSlider);
    window.addEventListener('pointerup',     stopDrag);
    window.addEventListener('pointercancel', stopDrag);

    if (pauseOnHover) {
        viewport.addEventListener('mouseenter', () => { isHoverPaused = true; });
        viewport.addEventListener('mouseleave', () => { isHoverPaused = false; });
    }

    // Pausa animação ao trocar de aba (economiza CPU e evita "salto" na volta)
    document.addEventListener('visibilitychange', () => { lastFrameTime = null; });
    window.addEventListener('resize', () => { updateScrollDistance(); });

    requestAnimationFrame(animateSlider);

    return { rebuild: rebuild };
}

/* Carrossel do hero — usa a mecânica acima (sem dots, sem labels, com botões de direção). */
(function () {
    function init() {
        const container = document.getElementById('heroCarousel');
        if (!container) return;
        createInfiniteCarousel({
            container: container,
            viewport: container.querySelector('.carousel-viewport'),
            track: document.getElementById('carouselTrack'),
            leftButton: document.getElementById('carouselLeft'),
            rightButton: document.getElementById('carouselRight'),
            loopDuration: 60000,
            direction: -1,
        });
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

/* ===== Smooth scroll na seta (e em qualquer âncora interna) ===== */
(function () {
    function init() {
        document.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                const id = link.getAttribute('href');
                if (!id || id === '#') return;
                const target = document.querySelector(id);
                if (!target) return;
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
    }
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

/* ===== Parallax suave da faixa do Kaco ===== */
(function () {
    function init() {
        const strip = document.getElementById('parallaxStrip');
        const bg = strip && strip.querySelector('.parallax-bg');
        if (!strip || !bg) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const maxShift = 200;   // dentro da sangria de 220px do .parallax-bg
        let ticking = false;

        function update() {
            ticking = false;
            const rect = strip.getBoundingClientRect();
            if (rect.bottom < 0 || rect.top > window.innerHeight) return;
            // -1 (faixa saindo por cima) .. +1 (faixa entrando por baixo)
            const progress = (rect.top + rect.height / 2 - window.innerHeight / 2)
                           / (window.innerHeight / 2 + rect.height / 2);
            const clamped = Math.max(-1, Math.min(1, progress));
            bg.style.transform = `translateY(${(-clamped * maxShift).toFixed(1)}px)`;
        }

        function onScroll() {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(update);
        }

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        update();
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

/* Menu hamburger virou componente reutilizável em components/kids-menu.js
   (injeta o <nav>, marca o link ativo e cuida do toggle). */

/* Showcase de personagens: fileira de miniaturas vira carrossel infinito (mesma
   mecânica do hero); a miniatura ativa (hover/clique) -> painel desliza embaixo.
   O carrossel pausa no hover pra dar pra mirar e clicar; seleção via delegação
   (funciona nos clones do loop) por data-index. */
(function () {
    function init() {
        document.querySelectorAll('[data-char-showcase]').forEach((showcase) => {
            const track = showcase.querySelector('[data-char-track]');               // palco (painéis)
            const thumbsCarousel = showcase.querySelector('[data-char-thumbs-carousel]');
            const thumbsViewport = showcase.querySelector('.char-thumbs-viewport');
            const thumbsTrack = showcase.querySelector('.char-thumbs');
            // só as miniaturas dentro do track (exclui o ★Todos, que fica fora da fileira)
            const allOriginalThumbs = Array.from(showcase.querySelectorAll('.char-thumbs .char-thumb'));
            const panels = Array.from(showcase.querySelectorAll('.char-panel'));
            const chips = Array.from(showcase.querySelectorAll('[data-char-filtros] .chip'));
            const float = showcase.querySelector('[data-char-float]');
            const frame = showcase.querySelector('[data-char-float-frame]');
            const videos = showcase.querySelectorAll('[data-char-videos] .char-stage-video');
            const stage = showcase.querySelector('.char-stage');
            if (!track || !thumbsTrack) return;

            const show = (el, on) => { if (el) el.style.display = on ? '' : 'none'; };

            // mensagem de "categoria sem personagem" (criada uma vez, ao lado do palco)
            let vazio = showcase.querySelector('.char-vazio');
            if (!vazio && stage) {
                vazio = document.createElement('p');
                vazio.className = 'char-vazio';
                vazio.textContent = 'Ainda não temos personagens nessa categoria.';
                stage.parentNode.insertBefore(vazio, stage.nextSibling);
            }

            // índices (data-index) dos personagens visíveis no filtro atual, em ordem.
            // O slide do painel é por posição VISÍVEL: o N-ésimo visível fica em N*100%.
            let order = [];
            let current = null;   // personagem (data-index) ativo, pra navegar prev/next

            const thumbByIndex = (idx) => allOriginalThumbs.find(t => Number(t.dataset.index) === idx);

            function select(charIndex) {
                const pos = order.indexOf(charIndex);
                if (pos < 0) return;
                current = charIndex;
                track.style.marginLeft = '-' + (pos * 100) + '%';
                // marca ativo em TODAS as cópias (original + clones do loop) do personagem
                thumbsTrack.querySelectorAll('.char-thumb').forEach((t) => {
                    const active = Number(t.dataset.index) === charIndex;
                    t.classList.toggle('is-active', active);
                    t.setAttribute('aria-selected', active ? 'true' : 'false');
                });
                const src = thumbByIndex(charIndex);
                if (!src) return;
                if (frame) frame.classList.toggle('is-sticker', src.dataset.sticker === '1');
                videos.forEach((v, i) => v.classList.toggle('is-active', i === charIndex));
                const thumbImg = src.querySelector('img');
                // imagem grande do flutuante: data-full do botão, ou o src da miniatura
                const fullSrc = src.dataset.full || (thumbImg && thumbImg.src);
                if (float && fullSrc && !float.src.endsWith(fullSrc)) {
                    float.src = fullSrc;
                    float.alt = thumbImg ? thumbImg.alt : '';
                    // reinicia o fade mesmo em hovers rápidos
                    float.classList.remove('is-swapping');
                    void float.offsetWidth;
                    float.classList.add('is-swapping');
                }
            }

            // Carrossel infinito da fileira (mesma mecânica do hero, com setas de direção)
            const carousel = createInfiniteCarousel({
                container: thumbsCarousel,
                viewport: thumbsViewport,
                track: thumbsTrack,
                leftButton: showcase.querySelector('#charThumbsLeft'),
                rightButton: showcase.querySelector('#charThumbsRight'),
                loopDuration: 42000,
                direction: -1,
            });

            // Filtra por condição (autismo / paralisia / …). Sem data-cond = autismo.
            // Remonta a fileira só com os personagens do filtro e reconstrói o loop.
            function applyFilter(cond) {
                const matching = allOriginalThumbs.filter(
                    (t) => cond === 'all' || (t.dataset.cond || 'autismo') === cond
                );
                Array.from(thumbsTrack.querySelectorAll('[data-carousel-clone]')).forEach((n) => n.remove());
                allOriginalThumbs.forEach((t) => { if (t.parentNode === thumbsTrack) thumbsTrack.removeChild(t); });
                matching.forEach((t) => thumbsTrack.appendChild(t));

                order = matching.map((t) => Number(t.dataset.index));
                panels.forEach((p, i) => show(p, order.indexOf(i) >= 0));
                chips.forEach((c) => c.classList.toggle('active', (c.dataset.cond || 'all') === cond));

                const tem = order.length > 0;
                show(stage, tem);
                show(vazio, !tem);
                if (carousel) carousel.rebuild();
                if (tem) select(order[0]);
            }

            // seleção só no clique, por delegação (pega original e clones do loop).
            // sem hover-select: a fileira rola, então hover trocaria o painel sozinho.
            thumbsTrack.addEventListener('click', (e) => {
                const b = e.target.closest('.char-thumb');
                if (!b) return;
                select(Number(b.dataset.index));
            });

            chips.forEach((chip) => {
                chip.addEventListener('click', () => applyFilter(chip.dataset.cond || 'all'));
            });

            // setas prev/next do palco: andam pela ordem visível do filtro, dando a volta
            function step(dir) {
                if (!order.length) return;
                const pos = order.indexOf(current);
                const base = pos < 0 ? 0 : pos;
                const next = (base + dir + order.length) % order.length;
                select(order[next]);
            }
            const navPrev = showcase.querySelector('[data-char-nav="prev"]');
            const navNext = showcase.querySelector('[data-char-nav="next"]');
            if (navPrev) navPrev.addEventListener('click', () => step(-1));
            if (navNext) navNext.addEventListener('click', () => step(1));

            applyFilter('all');
        });
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

/* Page TOC virou componente reutilizável em components/kids-toc.js */
