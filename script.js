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
    let sliderContainer, viewport, track, leftButton, rightButton, titleEl;
    let lastTitle = '';
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
        updateActiveTitle();
        lastFrameTime = time;
        requestAnimationFrame(animateSlider);
    }

    function updateActiveTitle() {
        if (!titleEl) return;
        const viewportRect = viewport.getBoundingClientRect();
        const viewportCenter = viewportRect.left + viewportRect.width / 2;
        let closestTitle = null;
        let closestDist = Infinity;
        track.querySelectorAll('.slide-wrap').forEach(wrap => {
            const rect = wrap.getBoundingClientRect();
            const center = rect.left + rect.width / 2;
            const dist = Math.abs(viewportCenter - center);
            if (dist < closestDist) {
                closestDist = dist;
                const img = wrap.querySelector('.slide');
                closestTitle = (img && img.alt) ? img.alt : '';
            }
        });
        if (closestTitle !== null && closestTitle !== lastTitle) {
            titleEl.textContent = closestTitle;
            lastTitle = closestTitle;
        }
    }

    function init() {
        sliderContainer = document.getElementById('heroCarousel');
        viewport = sliderContainer && sliderContainer.querySelector('.carousel-viewport');
        track = document.getElementById('carouselTrack');
        leftButton = document.getElementById('carouselLeft');
        rightButton = document.getElementById('carouselRight');
        titleEl = document.getElementById('carouselTitle');
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

/* ===== Menu hamburger ===== */
(function () {
    function init() {
        const menu = document.getElementById('menu');
        const burger = document.getElementById('menuBurger');
        const list = document.getElementById('menuList');
        if (!menu || !burger || !list) return;

        function setOpen(open) {
            menu.classList.toggle('open', open);
            burger.setAttribute('aria-expanded', open ? 'true' : 'false');
            burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
        }

        burger.addEventListener('click', () => {
            setOpen(!menu.classList.contains('open'));
        });

        list.addEventListener('click', (e) => {
            if (e.target.closest('.menu-link')) setOpen(false);
        });

        document.addEventListener('click', (e) => {
            if (!menu.classList.contains('open')) return;
            if (!menu.contains(e.target)) setOpen(false);
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 700) setOpen(false);
        });
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
