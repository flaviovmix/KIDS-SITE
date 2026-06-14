/*
 * Carrossel do hero — mecânica adaptada do componente codex (assets-codex/img):
 *  - velocidade automática contínua em uma direção
 *  - botões esquerda/direita: 1º clique troca direção, 2º pausa
 *  - drag manual com pointer events + inércia ao soltar
 *  - loop infinito via triplicação da sequência e normalizeOffset()
 *
 * Diferente do original: sem dots, sem labels, sem click pra centralizar.
 */
(function () {
    let sliderContainer, viewport, track, leftButton, rightButton;
    let sequenceWidth = 0;
    let originalSlideCount = 0;
    let currentOffset = 0;
    let lastFrameTime = null;
    let direction = -1;            // -1 = pra esquerda, +1 = pra direita
    let isPaused = false;
    let isSoftStopping = false;
    let isDragging = false;
    let lastPointerX = 0;
    let lastDragTime = 0;
    let glideVelocity = null;
    let recentSamples = [];
    let dragStartX = 0;
    let dragTotalDistance = 0;
    const clickCancelThreshold = 8;    // px de movimento que invalida o click do link

    const loopDuration = 60000;        // ms pra atravessar 1 sequência completa
    const glideBoost = 2.45;
    const maxGlideMultiplier = 62;
    const glideFrictionDuration = 820;
    const releaseSampleWindow = 140;

    function tripleSequence() {
        // Pega os slides originais e clona 2x mais → 3 sequências pro loop infinito funcionar
        const originals = Array.from(track.children);
        originalSlideCount = originals.length;
        for (let i = 0; i < 2; i++) {
            originals.forEach(node => {
                const clone = node.cloneNode(true);
                clone.setAttribute('aria-hidden', 'true');
                track.appendChild(clone);
            });
        }
    }

    function updateScrollDistance() {
        const firstCard = track.children[0];
        const firstDuplicatedCard = track.children[originalSlideCount];
        if (!firstCard || !firstDuplicatedCard) return;
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
        const movingLeft  = (!isPaused || isSoftStopping) && direction === -1;
        const movingRight = (!isPaused || isSoftStopping) && direction ===  1;
        leftButton.classList.toggle('active',  movingLeft);
        rightButton.classList.toggle('active', movingRight);
    }

    function startDrag(event) {
        // Ignora drag iniciado em botão
        if (event.target.closest('.carousel-arrow')) return;
        event.preventDefault();        // bloqueia drag-and-drop nativo da img / seleção de texto
        isDragging = true;
        isPaused = true;
        isSoftStopping = false;
        lastPointerX = event.clientX;
        lastDragTime = event.timeStamp;
        dragStartX = event.clientX;
        dragTotalDistance = 0;
        glideVelocity = null;
        recentSamples = [];
        sliderContainer.classList.add('dragging');
        sliderContainer.setPointerCapture(event.pointerId);
    }

    function dragSlider(event) {
        if (!isDragging) return;
        const deltaX = event.clientX - lastPointerX;
        const elapsed = Math.max(event.timeStamp - lastDragTime, 1);
        currentOffset += deltaX;
        dragTotalDistance += Math.abs(deltaX);
        lastPointerX = event.clientX;
        lastDragTime = event.timeStamp;
        recentSamples.push({ deltaX: deltaX, elapsed: elapsed, time: event.timeStamp });
        while (recentSamples.length && (event.timeStamp - recentSamples[0].time) > releaseSampleWindow) {
            recentSamples.shift();
        }
        track.style.transform = `translateX(${normalizeOffset(currentOffset)}px)`;
    }

    function stopDrag(event) {
        if (!isDragging) return;
        isDragging = false;
        isSoftStopping = false;
        sliderContainer.classList.remove('dragging');

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
            direction = recentVelocity > 0 ? 1 : -1;
            const maxGlideVelocity = (sequenceWidth / loopDuration) * maxGlideMultiplier;
            const boosted = recentVelocity * glideBoost;
            glideVelocity = Math.max(Math.min(boosted, maxGlideVelocity), -maxGlideVelocity);
        } else {
            isPaused = true;
            glideVelocity = null;
        }

        if (sliderContainer.hasPointerCapture(event.pointerId)) {
            sliderContainer.releasePointerCapture(event.pointerId);
        }
        updateControlButtons();
    }

    function animateSlider(time) {
        if (lastFrameTime === null) lastFrameTime = time;
        const elapsed = Math.min(time - lastFrameTime, 100);
        const speed = sequenceWidth / loopDuration;
        const normalVelocity = direction * speed;

        if (!isDragging && !isPaused) {
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

    function init() {
        sliderContainer = document.getElementById('heroCarousel');
        viewport = sliderContainer && sliderContainer.querySelector('.carousel-viewport');
        track = document.getElementById('carouselTrack');
        leftButton = document.getElementById('carouselLeft');
        rightButton = document.getElementById('carouselRight');
        if (!sliderContainer || !track || !leftButton || !rightButton) return;

        tripleSequence();
        // Reforço: desabilita drag-and-drop nativo em todas as imgs (cinto + suspensório)
        track.querySelectorAll('img').forEach(img => {
            img.setAttribute('draggable', 'false');
            img.addEventListener('dragstart', e => e.preventDefault());
        });
        updateScrollDistance();
        currentOffset = sequenceWidth * -1;
        updateControlButtons();

        leftButton.addEventListener('click',  () => handleDirectionButton(-1));
        rightButton.addEventListener('click', () => handleDirectionButton( 1));

        // Cancela navegação dos slides-link quando o usuário arrastou (drag > 8px)
        track.addEventListener('click', (event) => {
            if (dragTotalDistance > clickCancelThreshold) {
                event.preventDefault();
                event.stopPropagation();
            }
        }, true);

        // Drag funciona apenas na área do viewport (não nos botões)
        viewport.addEventListener('pointerdown',   startDrag);
        sliderContainer.addEventListener('pointermove',   dragSlider);
        sliderContainer.addEventListener('pointerup',     stopDrag);
        sliderContainer.addEventListener('pointercancel', stopDrag);

        // Pausa animação ao trocar de aba (economiza CPU e evita "salto" na volta)
        document.addEventListener('visibilitychange', () => {
            lastFrameTime = null;
        });

        window.addEventListener('resize', () => {
            updateScrollDistance();
        });

        requestAnimationFrame(animateSlider);
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

/* Showcase de personagens: miniatura no hover/clique -> painel desliza embaixo */
(function () {
    function init() {
        document.querySelectorAll('[data-char-showcase]').forEach((showcase) => {
            const track = showcase.querySelector('[data-char-track]');
            const thumbs = showcase.querySelectorAll('.char-thumb');
            const float = showcase.querySelector('[data-char-float]');
            const frame = showcase.querySelector('[data-char-float-frame]');
            const videos = showcase.querySelectorAll('[data-char-videos] .char-stage-video');
            if (!track || !thumbs.length) return;

            function select(index) {
                track.style.marginLeft = '-' + (index * 100) + '%';
                thumbs.forEach((t, i) => {
                    const active = i === index;
                    t.classList.toggle('is-active', active);
                    t.setAttribute('aria-selected', active ? 'true' : 'false');
                });
                if (frame) frame.classList.toggle('is-sticker', thumbs[index].dataset.sticker === '1');
                videos.forEach((v, i) => v.classList.toggle('is-active', i === index));
                const thumbImg = thumbs[index].querySelector('img');
                // imagem grande do flutuante: data-full do botão, ou o src da miniatura
                const fullSrc = thumbs[index].dataset.full || (thumbImg && thumbImg.src);
                if (float && fullSrc && !float.src.endsWith(fullSrc)) {
                    float.src = fullSrc;
                    float.alt = thumbImg ? thumbImg.alt : '';
                    // reinicia o fade mesmo em hovers rápidos
                    float.classList.remove('is-swapping');
                    void float.offsetWidth;
                    float.classList.add('is-swapping');
                }
            }

            // delay no hover: só troca se o mouse parar ~300ms na miniatura,
            // pra não mudar quando você só passa de raspão indo pra baixo
            let hoverTimer = null;
            const HOVER_DELAY = 300;
            thumbs.forEach((thumb, i) => {
                thumb.setAttribute('role', 'tab');
                thumb.addEventListener('mouseenter', () => {
                    clearTimeout(hoverTimer);
                    hoverTimer = setTimeout(() => select(i), HOVER_DELAY);
                });
                thumb.addEventListener('mouseleave', () => clearTimeout(hoverTimer));
                thumb.addEventListener('focus', () => select(i));
                thumb.addEventListener('click', () => {
                    clearTimeout(hoverTimer);
                    select(i);
                });
            });

            select(0);
        });
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

/* Page TOC virou componente reutilizável em components/kids-toc.js */
