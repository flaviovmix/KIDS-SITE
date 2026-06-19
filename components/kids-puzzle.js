/* ===== kids-puzzle — motor do quebra-cabeça (canvas) =====
   Mecânica só: peças que arrastam, encaixam (snap), agrupam, com zoom/pan
   (roda do mouse / pinça) e rotação de grupo (dois dedos). Sem nada do
   template original (fases/medidas/pixel_ai) — a imagem vem direto por param.

   Uso (ver quebra-cabeca-jogo.html):
     <div id="game-container" data-img="img/kaco.png">
       <canvas id="puzzleCanvas" style="touch-action:none"></canvas>
     </div>
     <script src="components/kids-puzzle.js"></script>

   Imagem e grade vêm da URL (têm prioridade) ou do data-img:
     ?img=historias/o-passeio-feliz/1.jpeg&linha=3&coluna=3
   Ao completar, mostra o overlay #puzzle-win se existir (senão, alert). */
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
  const rows = parseInt(params.get("linha"), 10) || 3;
  const cols = parseInt(params.get("coluna"), 10) || 3;

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
  let srcPieceW = 0, srcPieceH = 0;
  let pieceWidth = 0, pieceHeight = 0;
  let offsetXTarget = 0, offsetYTarget = 0;
  let scale = 1;

  const SNAP = 30;

  // ======= VIEWPORT (zoom/pan da câmera) =======
  let viewScale = 1;
  let viewX = 0, viewY = 0;
  function applyViewTransform() { ctx.save(); ctx.translate(viewX, viewY); ctx.scale(viewScale, viewScale); }
  function restoreViewTransform() { ctx.restore(); }
  function screenToWorld(x, y) { return { x: (x - viewX) / viewScale, y: (y - viewY) / viewScale }; }

  // ======= FULLSCREEN + RESIZE =======
  function resizeCanvas() {
    fitCanvasToWindow();
    if (imageWidth && imageHeight) {
      computeLayout(true);
      pieces.forEach(p => { p.width = pieceWidth; p.height = pieceHeight; });
      drawAll();
    }
  }
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("orientationchange", resizeCanvas);
  resizeCanvas();

  // ======= IMAGEM =======
  let imageSrc = buildImageSrc();
  const image = new Image();
  image.src = imageSrc;

  // ======= PEÇAS & GRUPOS =======
  let pieces = [];
  let groups = [];
  let draggingGroup = null;
  let groupOffsetX = 0, groupOffsetY = 0;

  class Piece {
    constructor(row, col, startX, startY) {
      this.row = row;
      this.col = col;
      this.srcX = col * srcPieceW;
      this.srcY = row * srcPieceH;
      this.canvasX = startX;
      this.canvasY = startY;
      this.width   = pieceWidth;
      this.height  = pieceHeight;
      this.locked = false;
      this.groupId = null;
    }
    draw() {
      ctx.drawImage(image, this.srcX, this.srcY, srcPieceW, srcPieceH, this.canvasX, this.canvasY, this.width, this.height);
    }
    isClicked(x, y) {
      return !this.locked && x > this.canvasX && x < this.canvasX + this.width && y > this.canvasY && y < this.canvasY + this.height;
    }
    isInCorrectPosition() {
      const expectedX = offsetXTarget + this.col * pieceWidth;
      const expectedY = offsetYTarget + this.row * pieceHeight;
      return Math.abs(this.canvasX - expectedX) < SNAP && Math.abs(this.canvasY - expectedY) < SNAP;
    }
  }

  function createGroup(piece) {
    const groupId = groups.length;
    piece.groupId = groupId;
    groups.push([piece]);
  }

  function mergeGroups(groupA, groupB, anchorPiece, otherPiece) {
    if (groupA === groupB) return;
    const dx = (otherPiece.canvasX + (anchorPiece.col - otherPiece.col) * pieceWidth) - anchorPiece.canvasX;
    const dy = (otherPiece.canvasY + (anchorPiece.row - otherPiece.row) * pieceHeight) - anchorPiece.canvasY;
    groups[groupA].forEach(p => { p.canvasX += dx; p.canvasY += dy; p.groupId = groupB; });
    groups[groupB] = groups[groupB].concat(groups[groupA]);
    groups[groupA] = [];
  }

  function moveGroup(groupId, dx, dy) {
    groups[groupId].forEach(p => { p.canvasX += dx; p.canvasY += dy; });
  }

  function trySnap(piece) {
    for (let other of pieces) {
      if (piece === other || other.locked) continue;
      const isNeighbor =
        (piece.row === other.row && Math.abs(piece.col - other.col) === 1) ||
        (piece.col === other.col && Math.abs(piece.row - other.row) === 1);
      if (!isNeighbor) continue;

      const dx = (other.col - piece.col) * pieceWidth;
      const dy = (other.row - piece.row) * pieceHeight;

      if (Math.abs((piece.canvasX + dx) - other.canvasX) < SNAP &&
          Math.abs((piece.canvasY + dy) - other.canvasY) < SNAP) {
        mergeGroups(piece.groupId, other.groupId, piece, other);
      }
    }
  }

  // ======= DRAW =======
  function drawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    applyViewTransform();
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.fillRect(offsetXTarget, offsetYTarget, displayW, displayH);
    pieces.forEach(p => p.draw());
    restoreViewTransform();
  }

  function checkCompleted() { return pieces.every(p => p.isInCorrectPosition()); }

  function showWin() {
    const overlay = document.getElementById("puzzle-win");
    if (overlay) { overlay.classList.add("show"); return; }
    alert("Parabéns! Quebra-cabeça concluído!");
    location.reload();
  }

  // ======= LAYOUT =======
  function computeLayout(preservePositions = false) {
    const margin = 20;
    const maxW = canvas.clientWidth  - margin * 2;
    const maxH = canvas.clientHeight - margin * 2;

    const prevOffsetX = offsetXTarget;
    const prevOffsetY = offsetYTarget;
    const prevPieceW  = pieceWidth  || 1;
    const prevPieceH  = pieceHeight || 1;

    scale = Math.min(maxW / imageWidth, maxH / imageHeight);
    displayW = Math.floor(imageWidth  * scale);
    displayH = Math.floor(imageHeight * scale);

    srcPieceW = imageWidth  / cols;
    srcPieceH = imageHeight / rows;

    pieceWidth  = displayW / cols;
    pieceHeight = displayH / rows;

    offsetXTarget = Math.floor((canvas.clientWidth  - displayW) / 2);
    offsetYTarget = Math.floor((canvas.clientHeight - displayH) / 2);

    if (preservePositions && pieces.length) {
      pieces.forEach(p => {
        const relX = (p.canvasX - prevOffsetX) / prevPieceW;
        const relY = (p.canvasY - prevOffsetY) / prevPieceH;
        p.canvasX = offsetXTarget + relX * pieceWidth;
        p.canvasY = offsetYTarget + relY * pieceHeight;
      });
    }
  }

  // ======= INICIALIZA =======
  image.onload = function () {
    imageWidth  = image.width;
    imageHeight = image.height;

    computeLayout(false);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const startX = Math.random() * (canvas.clientWidth  - pieceWidth);
        const startY = Math.random() * (canvas.clientHeight - pieceHeight);
        const piece = new Piece(r, c, startX, startY);
        pieces.push(piece);
        createGroup(piece);
      }
    }
    drawAll();
  };

  image.onerror = function () {
    console.error("Falha ao carregar imagem:", imageSrc);
    alert("Não foi possível carregar a imagem do quebra-cabeça.");
  };

  // ======= INPUT (Pointer Events) =======
  let activePointerId = null;
  const pointers = new Map();
  let pinch = null;

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function angleBetween(p0, p1) { return Math.atan2(p1.y - p0.y, p1.x - p0.x); }

  function updatePinchState() {
    if (pointers.size < 2) { pinch = null; return; }
    const pts = Array.from(pointers.values());
    const p0 = pts[0], p1 = pts[1];

    const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    const dx = p1.x - p0.x, dy = p1.y - p0.y;
    const dist = Math.hypot(dx, dy);

    if (!pinch) {
      pinch = {
        startDist: dist || 1,
        startScale: viewScale,
        startMid: mid,
        worldCenter: screenToWorld(mid.x, mid.y),
        startAngle: angleBetween(p0, p1)
      };
    } else {
      const newScale = Math.max(0.2, Math.min(5, pinch.startScale * (dist / pinch.startDist || 1)));

      const currentAngle = angleBetween(p0, p1);
      let deltaAngle = currentAngle - pinch.startAngle;
      while (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;
      while (deltaAngle >  Math.PI) deltaAngle -= 2 * Math.PI;

      // Rotação de grupo ativo
      if (draggingGroup !== null) {
        const group = groups[draggingGroup];
        const centerX = group.reduce((s, p) => s + p.canvasX + p.width / 2, 0) / group.length;
        const centerY = group.reduce((s, p) => s + p.canvasY + p.height / 2, 0) / group.length;

        const sin = Math.sin(deltaAngle);
        const cos = Math.cos(deltaAngle);

        group.forEach(p => {
          const x = p.canvasX + p.width / 2 - centerX;
          const y = p.canvasY + p.height / 2 - centerY;
          const rx = x * cos - y * sin;
          const ry = x * sin + y * cos;
          p.canvasX = centerX + rx - p.width / 2;
          p.canvasY = centerY + ry - p.height / 2;
        });

        pinch.startAngle = currentAngle;
        drawAll();
      }

      // Zoom focado no centro do gesto
      viewScale = newScale;
      viewX = mid.x - pinch.worldCenter.x * viewScale;
      viewY = mid.y - pinch.worldCenter.y * viewScale;

      drawAll();
    }
  }

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const pos = getPos(e);
    pointers.set(e.pointerId, pos);

    if (pointers.size === 1) {
      activePointerId = e.pointerId;
      canvas.setPointerCapture(e.pointerId);

      const world = screenToWorld(pos.x, pos.y);
      for (let i = pieces.length - 1; i >= 0; i--) {
        if (pieces[i].isClicked(world.x, world.y)) {
          draggingGroup = pieces[i].groupId;

          const groupPieces = groups[draggingGroup];
          const minX = Math.min(...groupPieces.map(p => p.canvasX));
          const minY = Math.min(...groupPieces.map(p => p.canvasY));

          groupOffsetX = world.x - minX;
          groupOffsetY = world.y - minY;

          // traz grupo para frente
          groupPieces.forEach(p => {
            const idx = pieces.indexOf(p);
            if (idx !== -1) { pieces.splice(idx, 1); pieces.push(p); }
          });
          drawAll();
          break;
        }
      }
    } else if (pointers.size === 2) {
      updatePinchState();
      draggingGroup = null;
      activePointerId = null;
    }
  }, { passive: false });

  canvas.addEventListener("pointermove", (e) => {
    e.preventDefault();
    const pos = getPos(e);
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, pos);

    if (pointers.size >= 2) { updatePinchState(); return; }
    if (draggingGroup === null || activePointerId !== e.pointerId) return;

    const world = screenToWorld(pos.x, pos.y);
    const groupPieces = groups[draggingGroup];
    const minX = Math.min(...groupPieces.map(p => p.canvasX));
    const minY = Math.min(...groupPieces.map(p => p.canvasY));
    const dx = world.x - groupOffsetX - minX;
    const dy = world.y - groupOffsetY - minY;

    moveGroup(draggingGroup, dx, dy);
    drawAll();
  }, { passive: false });

  function endPointer(e) {
    if (pointers.has(e.pointerId)) pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;

    if (activePointerId === e.pointerId) {
      if (draggingGroup !== null) {
        groups[draggingGroup].forEach(p => trySnap(p));
        drawAll();
        if (checkCompleted()) setTimeout(showWin, 10);
      }
      draggingGroup = null;
      activePointerId = null;
      canvas.releasePointerCapture(e.pointerId);
    }
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
