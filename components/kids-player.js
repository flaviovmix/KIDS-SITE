/* ===== kids-player — player de áudio em destaque + playlist (reutilizável) =====
   Drop-in:
        <div id="kidsPlayer"></div>
        <script src="components/kids-stories.js"></script>
        <script src="components/kids-player.js"></script>

   Lê as faixas de window.KIDS_STORIES (fonte única) e resolve cor/nome da
   categoria por window.KIDS_CATEGORIAS. O CSS mora em style.css (.au2-*).

   Os .m4a ainda não existem — o player fica em 0:00 até os arquivos entrarem
   em audio/. Servir por http (live-server) pra tocar. */
(function () {
    function init() {
        const mount = document.getElementById('kidsPlayer');
        if (!mount) return;

        const STORIES = window.KIDS_STORIES || [];
        const CATS = window.KIDS_CATEGORIAS || {};
        if (!STORIES.length) return;

        const cat = (s) => CATS[s.cat] || { nome: s.cat, cor: 'var(--c-blue)' };

        mount.classList.add('au2-wrap');
        mount.innerHTML =
            '<div class="au2-player" id="player"></div>' +
            '<div class="au2-list" id="list"></div>';
        const player = mount.querySelector('#player');
        const list = mount.querySelector('#list');
        let atual = 0;

        const fmt = (t) => {
            if (!isFinite(t)) return '0:00';
            const m = Math.floor(t / 60), s = Math.floor(t % 60);
            return m + ':' + String(s).padStart(2, '0');
        };

        const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
        const speedLabel = (v) => (v === 0.75 ? '0.7x' : v === 1.25 ? '1.2x' : v + 'x');

        function renderPlayer() {
            const s = STORIES[atual];
            const c = cat(s);
            player.style.setProperty('--c', c.cor);
            player.innerHTML = `
                <img class="au2-cover" src="${s.img}" alt="${s.t}">
                <h2 class="au2-title">${s.t}</h2>
                <p class="au2-sub">${c.nome} · ${s.dur}</p>
                <audio preload="metadata" src="${s.src}"></audio>
                <div class="au2-bar" id="bar"><span id="fill"></span></div>
                <span class="au2-time" id="time">0:00 / ${s.dur}</span>
                <div class="au2-controls">
                    <button class="au2-ctrl" type="button" id="back" title="Voltar 10s">«10</button>
                    <button class="au2-bigplay" type="button" id="bigplay" aria-label="Tocar / pausar">▶</button>
                    <button class="au2-ctrl" type="button" id="fwd" title="Avançar 10s">10»</button>
                    <div class="au2-speedwrap">
                        <button class="au2-ctrl" type="button" id="speed">1x</button>
                        <div class="au2-speedmenu" id="speedmenu">
                            ${SPEEDS.map(v => `<button type="button" data-v="${v}" class="${v === 1 ? 'active' : ''}">${speedLabel(v)}</button>`).join('')}
                        </div>
                    </div>
                    <button class="au2-ctrl" type="button" id="vol" title="Mudo">🔊</button>
                    <input class="au2-volslider" id="volslider" type="range" min="0" max="100" value="100" aria-label="Volume">
                    <a class="au2-ctrl" id="download" href="${s.src}" download title="Baixar">⬇</a>
                </div>
                <p class="au2-tx">${s.tx}</p>`;

            const audio = player.querySelector('audio');
            const btn = player.querySelector('#bigplay');
            const bar = player.querySelector('#bar');
            const fill = player.querySelector('#fill');
            const time = player.querySelector('#time');

            btn.addEventListener('click', () => { audio.paused ? audio.play() : audio.pause(); });
            audio.addEventListener('play', () => { btn.textContent = '⏸'; });
            audio.addEventListener('pause', () => { btn.textContent = '▶'; });
            audio.addEventListener('ended', () => { btn.textContent = '▶'; fill.style.width = '0'; });
            audio.addEventListener('loadedmetadata', () => { time.textContent = '0:00 / ' + fmt(audio.duration); });
            audio.addEventListener('timeupdate', () => {
                const p = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
                fill.style.width = p + '%';
                time.textContent = fmt(audio.currentTime) + ' / ' + fmt(audio.duration);
            });
            bar.addEventListener('click', (e) => {
                const r = bar.getBoundingClientRect();
                if (audio.duration) audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration;
            });

            // −10s / +10s
            player.querySelector('#back').addEventListener('click', () => { audio.currentTime = Math.max(0, audio.currentTime - 10); });
            player.querySelector('#fwd').addEventListener('click', () => { audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10); });

            // Velocidade (dropdown)
            const speedBtn = player.querySelector('#speed');
            const speedMenu = player.querySelector('#speedmenu');
            speedBtn.addEventListener('click', (e) => { e.stopPropagation(); speedMenu.classList.toggle('show'); });
            speedMenu.addEventListener('click', (e) => {
                const opt = e.target.closest('button[data-v]');
                if (!opt) return;
                const v = parseFloat(opt.dataset.v);
                audio.playbackRate = v;
                speedBtn.textContent = speedLabel(v);
                speedMenu.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === opt));
                speedMenu.classList.remove('show');
            });

            // Volume
            const volBtn = player.querySelector('#vol');
            const volSlider = player.querySelector('#volslider');
            volBtn.addEventListener('click', () => {
                audio.muted = !audio.muted;
                volBtn.textContent = audio.muted ? '🔇' : '🔊';
                volSlider.value = audio.muted ? 0 : audio.volume * 100;
            });
            volSlider.addEventListener('input', () => {
                audio.volume = volSlider.value / 100;
                audio.muted = volSlider.value === '0';
                volBtn.textContent = audio.muted ? '🔇' : '🔊';
            });
        }

        // Fecha o menu de velocidade ao clicar fora.
        document.addEventListener('click', () => {
            const m = player.querySelector('.au2-speedmenu.show');
            if (m) m.classList.remove('show');
        });

        function renderList() {
            list.innerHTML = STORIES.map((s, i) => {
                const c = cat(s);
                return `
                <button class="au2-item ${i === atual ? 'active' : ''}" data-i="${i}" style="--ic:${c.cor}">
                    <img src="${s.img}" alt="${s.t}">
                    <span class="meta"><strong>${s.t}</strong><small>${c.nome} · ${s.dur}</small></span>
                    <span class="dot">▶</span>
                </button>`;
            }).join('');
        }

        list.addEventListener('click', (e) => {
            const item = e.target.closest('.au2-item');
            if (!item) return;
            atual = Number(item.dataset.i);
            renderPlayer();
            renderList();
        });

        renderPlayer();
        renderList();
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
