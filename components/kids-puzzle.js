/* ===== kids-puzzle — motor do quebra-cabeça (canvas) =====
   Peças que arrastam, encaixam (snap por vizinho + no tabuleiro) e agrupam.
   Controles: roda = zoom; rodinha pressionada = pan; pinça = zoom; botão direito =
   dica (mostra a solução montada e volta); arrastar no vazio = laço de seleção, e
   arrastar uma peça selecionada move o lote inteiro junto. Imagem vem por param.

   Uso (ver quebra-cabeca-jogo.html):
     <div id="game-container" data-img="img/kaco.png">
       <canvas id="puzzleCanvas" style="touch-action:none"></canvas>
     </div>
     <script src="components/kids-puzzle.js"></script>

   Params da URL:
     ?n=3      → grade 3×3 (quantidade de peças)
     ?f=...    → FORMA dos cortes:
                 'reto'    (padrão) retângulos;
                 'geo'     polígonos irregulares (grade de vértices deslocada);
                           no 2×2 vira o corte radial (4 polígonos no centro);
                 'encaixe' jigsaw clássico (grade regular + linguinha/reentrância
                           bézier nas bordas internas, vizinhos complementares).
     ?img=...  → imagem direta (fallback); senão usa data-img (vindo de ?h=<id>).
   Ao completar, mostra o overlay #puzzle-win se existir (senão, alert).

   Modelo das peças: cada peça é um POLÍGONO definido numa grade de vértices
   normalizada (uvVerts). Todas as peças compartilham o mesmo espaço de coords da
   imagem, então "montado" = todas com a mesma posição-de-origem (posX/posY) =
   (offsetXTarget, offsetYTarget). Peças do mesmo grupo compartilham posX/posY. */
(function () {
  // ======= BASE =======
  const canvas = document.getElementById("puzzleCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const container = document.getElementById("game-container");

  // Alta nitidez em telas high-DPI
  function fitCanvasToWindow() {
    const dpr = window.devicePixelRatio || 1;
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ======= PARAMS (URL > data-img) =======
  const params = new URLSearchParams(window.location.search);
  const n = parseInt(params.get("n"), 10) || 3;
  const rows = n, cols = n;
  // A página (quebra-cabeca-jogo.html) resolve a forma (URL > lembrada > padrão)
  // e expõe em window.PZ_FORMA. Fallback: ?f= direto ou "encaixe".
  const forma = window.PZ_FORMA
    || (["geo", "encaixe", "reto"].indexOf(params.get("f")) >= 0 ? params.get("f") : "encaixe");

  function buildImageSrc() {
    const fromUrl = params.get("img");
    if (fromUrl) return fromUrl;
    const dataImg = container ? container.getAttribute("data-img") : null;
    if (dataImg) return dataImg;
    return "img/kaco.png";
  }

  // ======= VARS =======
  let imageWidth = 0, imageHeight = 0;
  let displayW = 0, displayH = 0;
  let offsetXTarget = 0, offsetYTarget = 0;
  let scale = 1;

  const SNAP = 30;
  const JITTER = forma === "geo" ? 0.6 : 0; // intensidade do deslocamento dos cortes

  // ======= VIEWPORT (zoom/pan da câmera) =======
  let viewScale = 1;
  let viewX = 0, viewY = 0;
  function applyViewTransform() { ctx.save(); ctx.translate(viewX, viewY); ctx.scale(viewScale, viewScale); }
  function restoreViewTransform() { ctx.restore(); }
  function screenToWorld(x, y) { return { x: (x - viewX) / viewScale, y: (y - viewY) / viewScale }; }

  // ======= IMAGEM =======
  let imageSrc = buildImageSrc();
  const image = new Image();

  // ======= PEÇAS & GRUPOS =======
  let pieces = [];
  let uvVerts = null;            // grade de vértices normalizada (define os cortes)
  let hCut = null, vCut = null;  // sinais das bordas internas (modo encaixe)
  let draggingGroup = null;
  let grabDX = 0, grabDY = 0;    // pega relativa à posX/posY do grupo
  let groupSeq = 0;

  // Pan (botão do meio), laço de seleção (rubber-band) e dica (botão direito)
  let panning = false, panStartX = 0, panStartY = 0, panStartVX = 0, panStartVY = 0;
  let isSelecting = false, selStart = null, selEnd = null;
  let selectedPieces = new Set();
  let selDragging = false, selLastX = 0, selLastY = 0;
  let hintActive = false, hintAnimId = null, hintOriginal = null;

  // Gera a grade de vértices (rows+1)×(cols+1) em coords normalizadas [0..1].
  // Cantos fixos; vértices de borda deslizam SÓ ao longo da borda; internos em 2D.
  // JITTER=0 → grade regular (retângulos). JITTER>0 → polígonos irregulares.
  function buildVerts() {
    const uv = [];
    for (let r = 0; r <= rows; r++) {
      uv[r] = [];
      for (let c = 0; c <= cols; c++) {
        let u = c / cols, v = r / rows;
        if (c > 0 && c < cols) u += (Math.random() - 0.5) * (1 / cols) * JITTER;
        if (r > 0 && r < rows) v += (Math.random() - 0.5) * (1 / rows) * JITTER;
        uv[r][c] = { u: u, v: v };
      }
    }
    return uv;
  }

  // Sinais aleatórios (±1) das bordas internas — definem onde fica saliência /
  // reentrância. O vizinho recebe o complemento (-), então sempre encaixa.
  function buildCuts() {
    hCut = []; vCut = [];
    for (let r = 0; r < rows; r++) { hCut[r] = []; for (let c = 0; c < cols - 1; c++) hCut[r][c] = Math.random() < 0.5 ? 1 : -1; }
    for (let r = 0; r < rows - 1; r++) { vCut[r] = []; for (let c = 0; c < cols; c++) vCut[r][c] = Math.random() < 0.5 ? 1 : -1; }
  }

  // Desenha uma borda da peça (modo encaixe): reta (s=0) ou com linguinha /
  // reentrância (s=±1) via bézier. Assume o ponto atual em A; termina em B.
  // t = fração ao longo da borda; q = saliência perpendicular (s inverte o lado).
  function knobEdge(A, B, s) {
    if (!s) { ctx.lineTo(B.x, B.y); return; }
    const ex = B.x - A.x, ey = B.y - A.y;
    const P = (t, q) => [A.x + ex * t + ey * q * s, A.y + ey * t - ex * q * s];
    ctx.lineTo(...P(0.40, 0));
    ctx.bezierCurveTo(...P(0.33, 0.05), ...P(0.30, 0.20), ...P(0.42, 0.22));
    ctx.bezierCurveTo(...P(0.48, 0.24), ...P(0.52, 0.24), ...P(0.58, 0.22));
    ctx.bezierCurveTo(...P(0.70, 0.20), ...P(0.67, 0.05), ...P(0.60, 0.00));
    ctx.lineTo(B.x, B.y);
  }

  function pointInPoly(pts, x, y) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y;
      const hit = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (hit) inside = !inside;
    }
    return inside;
  }

  class Piece {
    constructor(row, col) {
      this.row = row;
      this.col = col;
      // 4 cantos do polígono em uv (sentido horário)
      this.uv = [
        uvVerts[row][col], uvVerts[row][col + 1],
        uvVerts[row + 1][col + 1], uvVerts[row + 1][col]
      ];
      // sinais das 4 bordas (modo encaixe): 0 = plana (borda externa); ±1 =
      // saliência/reentrância. O vizinho usa o complemento (-) pra casar.
      if (forma === "encaixe") {
        this.eTop    = row === 0        ? 0 : -vCut[row - 1][col];
        this.eRight  = col === cols - 1 ? 0 :  hCut[row][col];
        this.eBottom = row === rows - 1 ? 0 :  vCut[row][col];
        this.eLeft   = col === 0        ? 0 : -hCut[row][col - 1];
      }
      this.posX = 0; this.posY = 0;   // origem-da-imagem desta peça (no mundo)
      this.locked = false;
      this.groupId = null;
      this.pts = [];                   // cantos em coords de display (recalc no layout)
      this.minX = 0; this.minY = 0; this.maxX = 0; this.maxY = 0;
      this.recalcPts();
    }
    recalcPts() {
      this.pts = this.uv.map(p => ({ x: p.u * displayW, y: p.v * displayH }));
      const xs = this.pts.map(p => p.x), ys = this.pts.map(p => p.y);
      this.minX = Math.min(...xs); this.maxX = Math.max(...xs);
      this.minY = Math.min(...ys); this.maxY = Math.max(...ys);
    }
    bboxW() { return this.maxX - this.minX; }
    bboxH() { return this.maxY - this.minY; }
    pathLocal() {
      ctx.beginPath();
      if (forma === "encaixe") {
        const p = this.pts;                 // TL, TR, BR, BL (sentido horário)
        ctx.moveTo(p[0].x, p[0].y);
        knobEdge(p[0], p[1], this.eTop);
        knobEdge(p[1], p[2], this.eRight);
        knobEdge(p[2], p[3], this.eBottom);
        knobEdge(p[3], p[0], this.eLeft);
      } else {
        this.pts.forEach((pt, i) => i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y));
      }
      ctx.closePath();
    }
    draw() {
      ctx.save();
      ctx.translate(this.posX, this.posY);
      this.pathLocal();
      ctx.save();
      ctx.clip();
      ctx.drawImage(image, 0, 0, displayW, displayH);
      ctx.restore();
      const sel = selectedPieces.has(this);
      if (sel || forma !== "reto") {    // contorno: azul se selecionada; branco nos modos recortados
        ctx.lineWidth = (sel ? 2.5 : 1.5) / viewScale;
        ctx.strokeStyle = sel ? "rgba(80,160,255,0.95)" : "rgba(255,255,255,0.85)";
        ctx.stroke();
      }
      ctx.restore();
    }
    isClicked(x, y) {
      if (this.locked) return false;
      return pointInPoly(this.pts, x - this.posX, y - this.posY);
    }
  }

  // ======= GRUPOS (peças do mesmo grupo compartilham posX/posY) =======
  function moveGroupTo(id, posX, posY) {
    pieces.forEach(p => { if (p.groupId === id) { p.posX = posX; p.posY = posY; } });
  }
  // Multi-seleção: move os GRUPOS de todas as peças selecionadas por (dx,dy),
  // mantendo a invariante (todo grupo move rígido, peças do grupo seguem juntas).
  function moveSelectedBy(dx, dy) {
    const gids = new Set();
    selectedPieces.forEach(p => gids.add(p.groupId));
    pieces.forEach(p => { if (gids.has(p.groupId)) { p.posX += dx; p.posY += dy; } });
  }
  function bringSelectedToFront() {
    const gids = new Set();
    selectedPieces.forEach(p => gids.add(p.groupId));
    const sel = pieces.filter(p => gids.has(p.groupId));
    pieces = pieces.filter(p => !gids.has(p.groupId)).concat(sel);
  }
  function bringToFront(id) {
    const grp = pieces.filter(p => p.groupId === id);
    pieces = pieces.filter(p => p.groupId !== id).concat(grp);
  }
  function sendToBack(id) {
    const grp = pieces.filter(p => p.groupId === id);
    pieces = grp.concat(pieces.filter(p => p.groupId !== id));
  }

  // Encaixa o grupo: 1) funde com vizinhos de grade alinhados; 2) trava no tabuleiro.
  function trySnapGroup(id) {
    let merged = true;
    while (merged) {
      merged = false;
      for (const p of pieces) {
        if (p.groupId !== id) continue;
        for (const o of pieces) {
          if (o.groupId === id) continue;
          if ((Math.abs(p.row - o.row) + Math.abs(p.col - o.col)) !== 1) continue; // vizinho na grade
          if (Math.abs(p.posX - o.posX) < SNAP && Math.abs(p.posY - o.posY) < SNAP) {
            // alinha todo o grupo `id` ao vizinho e funde nele
            const tgt = o.groupId, px = o.posX, py = o.posY;
            pieces.forEach(q => { if (q.groupId === id) { q.groupId = tgt; q.posX = px; q.posY = py; } });
            id = tgt; merged = true; break;
          }
        }
        if (merged) break;
      }
    }
    // trava no tabuleiro (posição-alvo da imagem montada)
    const any = pieces.find(p => p.groupId === id);
    if (any && Math.abs(any.posX - offsetXTarget) < SNAP && Math.abs(any.posY - offsetYTarget) < SNAP) {
      pieces.forEach(p => { if (p.groupId === id) { p.posX = offsetXTarget; p.posY = offsetYTarget; p.locked = true; } });
      sendToBack(id);
    }
    return id;
  }

  // ======= DRAW =======
  function drawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    applyViewTransform();
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.fillRect(offsetXTarget, offsetYTarget, displayW, displayH);
    pieces.forEach(p => p.draw());
    // retângulo do laço de seleção (rubber-band)
    if (isSelecting && selStart && selEnd) {
      const rx = Math.min(selStart.x, selEnd.x), ry = Math.min(selStart.y, selEnd.y);
      const rw = Math.abs(selEnd.x - selStart.x), rh = Math.abs(selEnd.y - selStart.y);
      ctx.fillStyle = "rgba(80,160,255,0.10)";
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = "rgba(80,160,255,0.85)";
      ctx.lineWidth = 1 / viewScale;
      ctx.setLineDash([6 / viewScale, 3 / viewScale]);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.setLineDash([]);
    }
    restoreViewTransform();
  }

  function checkCompleted() { return pieces.length > 0 && pieces.every(p => p.locked); }

  function showWin() {
    const overlay = document.getElementById("puzzle-win");
    if (overlay) {
      const winImg = document.getElementById("pzWinImg");
      if (winImg) winImg.src = image.src;   // mostra a figura montada no modal
      overlay.classList.add("show");
      return;
    }
    alert("Parabéns! Quebra-cabeça concluído!");
    location.reload();
  }

  // ======= DICA (botão direito): mostra a solução e volta =======
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

  function animateTo(targets, duration, onDone) {
    cancelAnimationFrame(hintAnimId);
    const starts = pieces.map(p => ({ x: p.posX, y: p.posY }));
    const t0 = performance.now();
    function step(now) {
      const t = Math.min((now - t0) / duration, 1), e = easeInOut(t);
      pieces.forEach((p, i) => {
        p.posX = starts[i].x + (targets[i].x - starts[i].x) * e;
        p.posY = starts[i].y + (targets[i].y - starts[i].y) * e;
      });
      drawAll();
      if (t < 1) hintAnimId = requestAnimationFrame(step);
      else if (onDone) onDone();
    }
    hintAnimId = requestAnimationFrame(step);
  }

  // 1º clique direito: anima todas as peças até o lugar certo (figura montada);
  // 2º clique direito: devolve cada peça exatamente pra onde estava.
  function toggleHint() {
    selectedPieces.clear();
    if (!hintActive) {
      hintOriginal = pieces.map(p => ({ x: p.posX, y: p.posY }));
      hintActive = true;
      animateTo(pieces.map(() => ({ x: offsetXTarget, y: offsetYTarget })), 700);
    } else {
      hintActive = false;
      animateTo(hintOriginal, 700, () => { hintOriginal = null; });
    }
  }

  // ======= LAYOUT =======
  // Borda inferior de TODO o cromo fixo do topo (menu + barra de níveis +
  // Voltar/Avançar): a figura e as peças vivem na área de trabalho ABAIXO disso,
  // com uma folga em volta, pra deixar claro o espaço pra montar.
  function topInset() {
    let b = 0;
    [".kids-nav", ".pz-bar", ".menu"].forEach((s) => {
      const el = document.querySelector(s);
      if (el) b = Math.max(b, el.getBoundingClientRect().bottom);
    });
    return b;
  }

  function computeLayout(preservePositions = false) {
    const margin = 28;
    const inset = topInset();
    // Figura ocupa no máx ~60% da tela: muito respiro em volta, bem centralizada.
    const maxW = Math.min(canvas.clientWidth  - margin * 2, canvas.clientWidth  * 0.60);
    const maxH = Math.max(120, Math.min(canvas.clientHeight - inset - margin * 2, (canvas.clientHeight - inset) * 0.60));

    const prevOX = offsetXTarget, prevOY = offsetYTarget;
    const prevW = displayW || 1, prevH = displayH || 1;

    scale = Math.min(maxW / imageWidth, maxH / imageHeight);
    displayW = Math.floor(imageWidth  * scale);
    displayH = Math.floor(imageHeight * scale);

    offsetXTarget = Math.floor((canvas.clientWidth  - displayW) / 2);
    // Centra a figura na área de trabalho abaixo das barras (espaço igual em cima
    // e embaixo dela), bem afastada do topo.
    offsetYTarget = inset + Math.floor((canvas.clientHeight - inset - displayH) / 2);

    if (preservePositions && pieces.length) {
      pieces.forEach(p => {
        const fx = (p.posX - prevOX) / prevW, fy = (p.posY - prevOY) / prevH;
        p.posX = offsetXTarget + fx * displayW;
        p.posY = offsetYTarget + fy * displayH;
        p.recalcPts();
      });
    } else {
      pieces.forEach(p => p.recalcPts());
    }
  }

  // ======= FULLSCREEN + RESIZE =======
  function resizeCanvas() {
    fitCanvasToWindow();
    if (imageWidth && imageHeight) { computeLayout(true); drawAll(); }
  }
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("orientationchange", resizeCanvas);
  resizeCanvas();

  // ======= INICIALIZA =======
  image.onload = function () {
    imageWidth  = image.width;
    imageHeight = image.height;

    uvVerts = buildVerts();
    if (forma === "encaixe") buildCuts();
    computeLayout(false);

    const pad = 24;
    const inset = topInset();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const piece = new Piece(r, c);
        piece.groupId = groupSeq++;
        // espalha pela bbox visível (não pela origem-da-imagem) pra não sair da tela
        const x1 = Math.max(pad, canvas.clientWidth  - piece.bboxW() - pad);
        const y1 = Math.max(inset + pad, canvas.clientHeight - piece.bboxH() - pad);
        const sx = pad + Math.random() * Math.max(0, x1 - pad);
        const sy = (inset + pad) + Math.random() * Math.max(0, y1 - (inset + pad));
        piece.posX = sx - piece.minX;
        piece.posY = sy - piece.minY;
        pieces.push(piece);
      }
    }
    drawAll();
  };

  image.onerror = function () {
    console.error("Falha ao carregar imagem:", imageSrc);
    alert("Não foi possível carregar a imagem do quebra-cabeça.");
  };

  image.src = imageSrc;

  // ======= INPUT (Pointer Events) =======
  let activePointerId = null;
  const pointers = new Map();
  let pinch = null;

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function updatePinchState() {
    if (pointers.size < 2) { pinch = null; return; }
    const pts = Array.from(pointers.values());
    const p0 = pts[0], p1 = pts[1];

    const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);

    if (!pinch) {
      pinch = { startDist: dist || 1, startScale: viewScale, worldCenter: screenToWorld(mid.x, mid.y) };
    } else {
      // Zoom focado no centro do gesto (sem rotação no motor de polígono)
      viewScale = Math.max(0.2, Math.min(5, pinch.startScale * (dist / pinch.startDist || 1)));
      viewX = mid.x - pinch.worldCenter.x * viewScale;
      viewY = mid.y - pinch.worldCenter.y * viewScale;
      drawAll();
    }
  }

  // Botão direito: dica (mostra a solução e volta), sem menu do navegador.
  canvas.addEventListener("contextmenu", (e) => { e.preventDefault(); toggleHint(); });

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const pos = getPos(e);
    pointers.set(e.pointerId, pos);

    if (pointers.size === 1) {
      activePointerId = e.pointerId;
      canvas.setPointerCapture(e.pointerId);

      if (hintActive) return;             // durante a dica, interação travada
      if (e.button === 2) return;         // botão direito → tratado no contextmenu

      // botão do meio (rodinha): pan da câmera
      if (e.button === 1) {
        panning = true;
        panStartX = pos.x; panStartY = pos.y;
        panStartVX = viewX; panStartVY = viewY;
        return;
      }

      const world = screenToWorld(pos.x, pos.y);

      // botão esquerdo: peça (sozinha/grupo), lote selecionado, ou laço no vazio
      let hit = false;
      for (let i = pieces.length - 1; i >= 0; i--) {
        if (!pieces[i].isClicked(world.x, world.y)) continue;
        const clicked = pieces[i];
        if (selectedPieces.has(clicked) && selectedPieces.size > 1) {
          selDragging = true;             // arrasta todas as selecionadas juntas
          selLastX = world.x; selLastY = world.y;
          bringSelectedToFront();
        } else {
          selectedPieces.clear();
          draggingGroup = clicked.groupId;
          grabDX = world.x - clicked.posX;
          grabDY = world.y - clicked.posY;
          bringToFront(draggingGroup);
        }
        hit = true;
        drawAll();
        break;
      }

      // vazio: inicia o laço de seleção (rubber-band)
      if (!hit) {
        selectedPieces.clear();
        isSelecting = true;
        selStart = { x: world.x, y: world.y };
        selEnd = { x: world.x, y: world.y };
        drawAll();
      }
    } else if (pointers.size === 2) {
      updatePinchState();
      draggingGroup = null;
      isSelecting = false;
      selDragging = false;
      panning = false;
      activePointerId = null;
    }
  }, { passive: false });

  canvas.addEventListener("pointermove", (e) => {
    e.preventDefault();
    const pos = getPos(e);
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, pos);

    if (pointers.size >= 2) { updatePinchState(); return; }
    if (activePointerId !== e.pointerId || hintActive) return;

    if (panning) {                        // pan com a rodinha
      viewX = panStartVX + (pos.x - panStartX);
      viewY = panStartVY + (pos.y - panStartY);
      drawAll();
      return;
    }

    const world = screenToWorld(pos.x, pos.y);

    if (isSelecting) {                    // arrastando o laço
      selEnd = { x: world.x, y: world.y };
      drawAll();
      return;
    }

    if (selDragging) {                    // movendo o lote selecionado
      moveSelectedBy(world.x - selLastX, world.y - selLastY);
      selLastX = world.x; selLastY = world.y;
      drawAll();
      return;
    }

    if (draggingGroup === null) return;
    moveGroupTo(draggingGroup, world.x - grabDX, world.y - grabDY);
    drawAll();
  }, { passive: false });

  function endPointer(e) {
    if (pointers.has(e.pointerId)) pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (activePointerId !== e.pointerId) return;

    panning = false;

    // finaliza o laço: marca peças (não travadas) cuja caixa cruza o retângulo
    if (isSelecting) {
      isSelecting = false;
      const x1 = Math.min(selStart.x, selEnd.x), y1 = Math.min(selStart.y, selEnd.y);
      const x2 = Math.max(selStart.x, selEnd.x), y2 = Math.max(selStart.y, selEnd.y);
      if (x2 - x1 > 5 || y2 - y1 > 5) {
        pieces.forEach(p => {
          if (p.locked) return;
          if (p.posX + p.minX < x2 && p.posX + p.maxX > x1 &&
              p.posY + p.minY < y2 && p.posY + p.maxY > y1) selectedPieces.add(p);
        });
      }
      drawAll();
      activePointerId = null;
      canvas.releasePointerCapture(e.pointerId);
      return;
    }

    // finaliza o arraste do lote selecionado
    if (selDragging) {
      selDragging = false;
      const gids = new Set();
      selectedPieces.forEach(p => gids.add(p.groupId));
      gids.forEach(id => trySnapGroup(id));
      selectedPieces.forEach(p => { if (p.locked) selectedPieces.delete(p); });
      drawAll();
      if (checkCompleted()) setTimeout(showWin, 1000);
      activePointerId = null;
      canvas.releasePointerCapture(e.pointerId);
      return;
    }

    if (draggingGroup !== null) {
      trySnapGroup(draggingGroup);
      drawAll();
      if (checkCompleted()) setTimeout(showWin, 1000);
    }
    draggingGroup = null;
    activePointerId = null;
    canvas.releasePointerCapture(e.pointerId);
  }
  canvas.addEventListener("pointerup", endPointer, { passive: false });
  canvas.addEventListener("pointercancel", endPointer, { passive: false });

  // ======= ZOOM RODA DO MOUSE =======
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const pos = getPos(e);
    const world = screenToWorld(pos.x, pos.y);
    const factor = Math.exp((e.deltaY > 0 ? -1 : 1) * 0.1);
    const newScale = Math.max(0.2, Math.min(5, viewScale * factor));
    viewX = pos.x - world.x * newScale;
    viewY = pos.y - world.y * newScale;
    viewScale = newScale;
    drawAll();
  }, { passive: false });
})();
