/* ===== kids-story — leitor de história em flip 3D (sem lib) =====
   Lê ?id= e as `cenas` de KIDS_STORIES. A troca de cena é um giro 3D (rotateY)
   numa dobradiça à esquerda — funciona nos DOIS sentidos e dá pra ARRASTAR com
   mouse/dedo (a página acompanha o cursor).

   A folha que vira tem DUAS faces: frente = a cena, verso = papel. Ela completa
   o giro de 180° e DESCANSA virada à esquerda (não some no meio). Voltar
   desdobra a última folha de volta pro lugar. Mantemos no máximo uma folha em
   repouso (a página anterior, deitada à esquerda). CSS em style.css (.book3d /
   .b3-base / .b3-leaf / .b3-face).

   Drop-in:
        <div id="kidsStory"></div>
        <script src="components/kids-stories.js"></script>
        <script src="components/kids-story.js"></script> */
(function () {
    var DUR = 2400;   // duração do giro por clique (ms) — ajustável

    function paramId() {
        var m = location.search.match(/[?&]id=([^&]+)/);
        return m ? decodeURIComponent(m[1]) : '';
    }
    function cenasDe(s) {
        if (Array.isArray(s.cenas)) return s.cenas;
        if (typeof s.cenas === 'number') {
            var a = [];
            for (var i = 1; i <= s.cenas; i++) a.push('historias/' + s.id + '/' + i + '.jpeg');
            return a;
        }
        return [];
    }
    function aviso(titulo, msg) {
        var main = document.createElement('main');
        main.className = 'content story-aviso';
        main.innerHTML =
            '<div class="story-aviso-box">' +
                '<span class="story-aviso-emoji">🐒</span>' +
                '<h1>' + titulo + '</h1><p>' + msg + '</p>' +
                '<a class="story-aviso-link" href="historias.html">← Ver todas as histórias</a>' +
            '</div>';
        return main;
    }

    function init() {
        var mount = document.getElementById('kidsStory');
        if (!mount) return;

        var STORIES = window.KIDS_STORIES || [];
        var CATS = window.KIDS_CATEGORIAS || {};
        var id = paramId(), s = null;
        for (var i = 0; i < STORIES.length; i++) { if (STORIES[i].id === id) { s = STORIES[i]; break; } }

        if (!s) {
            mount.replaceWith(aviso('História não encontrada', 'Talvez o link esteja errado. Volte e escolha uma história.'));
            return;
        }
        document.title = s.t + ' — Kaco';
        var cat = CATS[s.cat] || { nome: s.cat, cor: 'var(--c-blue)' };
        var cenas = cenasDe(s);
        if (!cenas.length) {
            mount.replaceWith(aviso(s.t, 'Essa história ainda está sendo ilustrada. Volta logo! 💛'));
            return;
        }

        var dots = cenas.map(function (_, i) {
            return '<button class="story-dot" data-i="' + i + '" aria-label="Ir pra cena ' + (i + 1) + '"></button>';
        }).join('');

        var main = document.createElement('main');
        main.className = 'content story-page';
        main.style.setProperty('--accent', cat.cor);
        main.innerHTML =
            '<div class="story-head">' +
                '<a class="story-back" href="historias.html">← Histórias</a>' +
            '</div>' +
            '<div class="story-stage">' +
                '<button class="story-nav prev" type="button" aria-label="Cena anterior">‹</button>' +
                '<div class="story-frame book3d"><img class="b3-base" alt="' + s.t + '" draggable="false"><div class="book-holes" aria-hidden="true"></div></div>' +
                '<button class="story-nav next" type="button" aria-label="Próxima cena">›</button>' +
                '<button class="story-fs" type="button" aria-label="Tela cheia" title="Tela cheia">⛶</button>' +
                '<span class="story-fscount"></span>' +
            '</div>' +
            '<div class="story-foot">' +
                '<div class="story-dots">' + dots + '</div>' +
                '<span class="story-counter"></span>' +
            '</div>';

        var book = main.querySelector('.book3d');
        var base = main.querySelector('.b3-base');
        var prev = main.querySelector('.story-nav.prev');
        var next = main.querySelector('.story-nav.next');
        var counter = main.querySelector('.story-counter');
        var fscount = main.querySelector('.story-fscount');
        var dotEls = main.querySelectorAll('.story-dot');

        cenas.forEach(function (src) { var im = new Image(); im.src = src; });

        var idx = 0, animating = false, restedStack = [];   // folhas já viradas, empilhadas à esquerda

        function meta(i) {
            var label = (i + 1) + ' / ' + cenas.length;
            counter.textContent = label;
            fscount.textContent = label;
            prev.disabled = i === 0;
            next.disabled = i === cenas.length - 1;
            dotEls.forEach(function (d, k) { d.classList.toggle('active', k === i); });
        }

        function setAngle(el, a) { el.style.transform = 'rotateY(' + a + 'deg)'; }
        function makeLeaf(frontSrc) {
            var leaf = document.createElement('div');
            leaf.className = 'b3-leaf';
            // Verso = a própria cena (a face já está girada 180°, então aparece
            // espelhada). Pra usar uma arte fixa, troque este src por um asset.
            leaf.innerHTML =
                '<div class="b3-face front"><img src="' + frontSrc + '" draggable="false" alt=""><div class="book-holes" aria-hidden="true"></div></div>' +
                '<div class="b3-face back"><img src="' + frontSrc + '" draggable="false" alt=""></div>';
            book.appendChild(leaf);
            return leaf;
        }
        function animTurn(el, to, dur, cb) {
            var done = function () { try { cb(); } catch (_) { animating = false; } };
            var end = 'rotateY(' + to + 'deg)';
            if (!el.animate) { el.style.transform = end; done(); return; }
            // desfoque de movimento: borra no meio do giro, nítido nas pontas.
            // Só na FRENTE — o verso já tem blur fixo (no CSS) e não pode ser zerado.
            var front = el.querySelector('.b3-face.front');
            if (front) front.animate(
                [{ filter: 'blur(0px)' }, { filter: 'blur(3px)' }, { filter: 'blur(0px)' }],
                { duration: dur, easing: 'ease-in-out' }
            );
            var a = el.animate(
                [{ transform: el.style.transform || 'rotateY(0deg)' }, { transform: end }],
                { duration: dur, easing: 'ease-in-out', fill: 'forwards' }
            );
            a.finished.then(function () {
                el.style.transform = end;   // grava o ângulo final no inline (o próximo giro parte daqui)
                a.cancel();                 // solta o fill; o inline segura o estado
                done();
            }, done);
        }
        function clearAllRested() { while (restedStack.length) restedStack.pop().remove(); }

        // Giro completo por clique/teclado/bolinha.
        function go(target) {
            target = Math.max(0, Math.min(cenas.length - 1, target));
            if (animating || target === idx) return;
            var fwd = target > idx;
            meta(target);
            animating = true;
            if (fwd) {
                var seq = target === idx + 1;
                if (!seq) clearAllRested();              // pulo (bolinha) zera a pilha
                var leaf = makeLeaf(cenas[idx]); setAngle(leaf, 0);
                base.src = cenas[target];
                animTurn(leaf, -180, DUR, function () {
                    if (seq) restedStack.push(leaf); else leaf.remove();
                    idx = target; animating = false;
                });
            } else if (target === idx - 1 && restedStack.length) {
                var L = restedStack.pop();              // desdobra a última folha virada
                animTurn(L, 0, DUR, function () { base.src = cenas[target]; L.remove(); idx = target; animating = false; });
            } else {
                if (target !== idx - 1) clearAllRested();
                var leaf2 = makeLeaf(cenas[target]); setAngle(leaf2, -180);
                animTurn(leaf2, 0, DUR, function () { base.src = cenas[target]; leaf2.remove(); idx = target; animating = false; });
            }
        }

        prev.addEventListener('click', function () { go(idx - 1); });
        next.addEventListener('click', function () { go(idx + 1); });
        main.querySelector('.story-dots').addEventListener('click', function (e) {
            var d = e.target.closest('.story-dot');
            if (d) go(Number(d.dataset.i));
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowLeft') go(idx - 1);
            else if (e.key === 'ArrowRight') go(idx + 1);
        });

        /* ----- Arrastar interativo (mouse + toque via Pointer Events) ----- */
        var down = false, startX = 0, width = 1, dir = null, leaf = null, moved = false, fromRested = false;

        function frac(clientX) {
            var f = (dir === 'fwd') ? (startX - clientX) / width : (clientX - startX) / width;
            return Math.max(0, Math.min(1, f));
        }
        book.addEventListener('pointerdown', function (e) {
            if (animating) return;
            down = true; moved = false; dir = null; leaf = null; fromRested = false;
            startX = e.clientX; width = book.clientWidth || 1;
            book.setPointerCapture(e.pointerId);
        });
        book.addEventListener('pointermove', function (e) {
            if (!down) return;
            var dx = e.clientX - startX;
            if (!dir) {
                if (dx <= -6 && idx < cenas.length - 1) {            // avançar
                    dir = 'fwd';
                    leaf = makeLeaf(cenas[idx]); setAngle(leaf, 0);  // empilha sobre as anteriores
                    base.src = cenas[idx + 1];
                } else if (dx >= 6 && idx > 0) {                     // voltar
                    dir = 'back';
                    if (restedStack.length) { leaf = restedStack.pop(); fromRested = true; }
                    else { leaf = makeLeaf(cenas[idx - 1]); setAngle(leaf, -180); }
                } else { return; }
                moved = true;
                book.classList.add('dragging');
            }
            var f = frac(e.clientX);
            setAngle(leaf, dir === 'fwd' ? -180 * f : -180 + 180 * f);
        });
        function release(e) {
            if (!down) return;
            down = false;
            book.classList.remove('dragging');
            try { book.releasePointerCapture(e.pointerId); } catch (_) {}

            if (dir && leaf) {
                var f = frac(e.clientX);
                var L = leaf, dr = dir, fr = fromRested;
                dir = null; leaf = null;
                animating = true;
                if (f > 0.35) {                                      // completa
                    if (dr === 'fwd') {
                        meta(idx + 1);
                        animTurn(L, -180, Math.max(260, Math.round(DUR * (1 - f))), function () {
                            restedStack.push(L); idx = idx + 1; animating = false;
                        });
                    } else {
                        var tgt = idx - 1; meta(tgt);
                        animTurn(L, 0, Math.max(260, Math.round(DUR * (1 - f))), function () {
                            base.src = cenas[tgt]; L.remove(); idx = tgt; animating = false;
                        });
                    }
                } else {                                             // volta pro lugar
                    if (dr === 'fwd') {
                        animTurn(L, 0, Math.max(240, Math.round(DUR * f)), function () {
                            base.src = cenas[idx]; L.remove(); animating = false;
                        });
                    } else {
                        animTurn(L, -180, Math.max(240, Math.round(DUR * f)), function () {
                            if (fr) restedStack.push(L); else L.remove();
                            animating = false;
                        });
                    }
                }
            } else if (!moved) {                                     // clique simples: metade direita avança
                var r = book.getBoundingClientRect();
                if (e.clientX - r.left > r.width / 2) go(idx + 1); else go(idx - 1);
            }
        }
        book.addEventListener('pointerup', release);
        book.addEventListener('pointercancel', release);

        /* ----- Tela cheia ----- */
        var stage = main.querySelector('.story-stage');
        var fs = main.querySelector('.story-fs');
        fs.addEventListener('click', function () {
            if (document.fullscreenElement) document.exitFullscreen();
            else if (stage.requestFullscreen) stage.requestFullscreen();
        });
        document.addEventListener('fullscreenchange', function () {
            var on = document.fullscreenElement === stage;
            fs.textContent = on ? '✕' : '⛶';
            fs.title = on ? 'Sair da tela cheia' : 'Tela cheia';
        });

        mount.replaceWith(main);
        base.src = cenas[0];
        meta(0);
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
