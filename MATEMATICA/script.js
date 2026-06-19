// =========================
//   JOGO: Adição/Subtração
//   script.js (refeito)
// =========================

// ===== Estado do Jogo =====
let perguntaAtualIndex = 0;
let a = 0, b = 0, op = "+";
let hits = 0, miss = 0;

let answered = false;     // já clicou numa resposta?
let hintRunning = false;  // animação rolando?

// ===== Seleção de elementos =====
const elN1 = document.getElementById("n1");
const elN2 = document.getElementById("n2");
const elOp = document.getElementById("op");
const elOpBadge = document.getElementById("opBadge");
const elStageCounter = document.getElementById("stageCounter");
const elFinalQuestionText = document.getElementById("finalQuestionText");
const elBuddyImg = document.getElementById("buddyImg");

const elDotsA = document.getElementById("dotsA");
const elDotsB = document.getElementById("dotsB");
const stageInner = document.getElementById("stageInner");

const elMsg = document.getElementById("message");
const elHintText = document.getElementById("hintText");

const btnReset = document.getElementById("btnReset");
const btnHint = document.getElementById("btnHint");
const btnNext = document.getElementById("btnNext");

const buttonsDiv = document.getElementById("buttons");
const animLayer = document.getElementById("animLayer");

const wait = (ms) => new Promise(r => setTimeout(r, ms));

// ===== Painel da tabuada (visível em telas grandes durante multiplicação) =====
const tabuadaPanel = document.createElement("div");
tabuadaPanel.className = "tabuada-panel";
document.body.appendChild(tabuadaPanel);

function renderTabuada() {
  if (op !== "×") {
    tabuadaPanel.classList.remove("active");
    return;
  }
  tabuadaPanel.classList.add("active");
  tabuadaPanel.classList.remove("revealed");
  let html = `<div class="tabuada-title">Tabuada do ${a}</div>`;
  for (let i = 1; i <= 10; i++) {
    const cls = i === b ? "tabuada-line highlight" : "tabuada-line";
    html += `<div class="${cls}"><span>${a} × ${i}</span><span class="resultado">= ${a * i}</span></div>`;
  }
  html += `<button class="tabuada-reveal-btn" type="button">Mostrar respostas</button>`;
  tabuadaPanel.innerHTML = html;

  // Stagger da animação de entrada (60ms entre linhas)
  tabuadaPanel.querySelectorAll(".tabuada-line").forEach((line, i) => {
    line.querySelector(".resultado").style.transitionDelay = (i * 60) + "ms";
  });

  tabuadaPanel.querySelector(".tabuada-reveal-btn").addEventListener("click", () => {
    tabuadaPanel.classList.add("revealed");
  });
}

const imgPrefix = (() => {
  const s = document.querySelector('script[src*="script.js"]');
  if (!s) return "";
  const src = s.getAttribute("src");
  return src.substring(0, src.lastIndexOf("/") + 1);
})();

// ===== Botões de resposta (5 opções: 1 certa + 4 erradas) =====
const answerButtons = [];

function generateOptions(correct) {
  const options = new Set([correct]);
  while (options.size < 5) {
    const offset = Math.floor(Math.random() * 5) + 1;
    let d = Math.random() < 0.5 ? correct - offset : correct + offset;
    if (d < 0) d = correct + offset;
    options.add(d);
  }
  const arr = [...options];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function renderAnswerButtons(correct) {
  buttonsDiv.innerHTML = "";
  answerButtons.length = 0;
  const options = generateOptions(correct);
  for (const val of options) {
    const btn = document.createElement("button");
    btn.textContent = val;
    btn.addEventListener("click", () => checkAnswer(val));
    buttonsDiv.appendChild(btn);
    answerButtons.push(btn);
  }
}

// ===== Helpers UI =====
function setBuddy(state, title, text) {
  elBuddyImg.src = `${imgPrefix}${state}.png`;
  document.getElementById("buddyTitle").textContent = title;
  document.getElementById("buddyText").textContent = text;
}

function setStats() {
  document.getElementById("hits").textContent = hits;
  document.getElementById("miss").textContent = miss;
  document.getElementById("total").textContent = hits + miss;
}

function setAnswerButtonsDisabled(disabled) {
  answerButtons.forEach(btn => btn.disabled = disabled);
}

function updateControls() {
  // Dica fica travada se animação rolando
  btnHint.disabled = hintRunning;

  // Próxima:
  // - só ativa se já respondeu E não está em animação
  btnNext.disabled = (!answered) || hintRunning;
}

// ===== Layout do palco (igual ao espaçamento do 1º número) =====
function getStageSlot(index) {
  const css = getComputedStyle(document.documentElement);
  const dotSize = parseFloat(css.getPropertyValue("--dot")) || 22;
  const gap = parseFloat(css.getPropertyValue("--dotGap")) || 10;

  const hGap = gap;
  const vGap = gap;
  const groupGap = gap * 2;

  const perRow = 6;
  const row = Math.floor(index / perRow);
  const colInRow = index % perRow;
  const groupInRow = Math.floor(colInRow / 3);

  const x = colInRow * (dotSize + hGap) + (groupInRow * groupGap);
  const y = row * (dotSize + vGap);

  return { x, y };
}

function renderDots(container, count, colorClass) {
  container.innerHTML = "";
  const tens = Math.floor(count / 10);
  const units = count % 10;

  for (let i = 0; i < tens; i++) {
    const bar = document.createElement("div");
    bar.className = "bar" + (colorClass ? " " + colorClass : "");
    for (let j = 0; j < 10; j++) {
      const u = document.createElement("div");
      u.className = "bar-unit";
      bar.appendChild(u);
    }
    container.appendChild(bar);
  }

  if (units > 0) {
    const row = document.createElement("div");
    row.className = "units";
    for (let i = 0; i < units; i++) {
      const d = document.createElement("div");
      d.className = "dot" + (colorClass ? " " + colorClass : "");
      row.appendChild(d);
    }
    container.appendChild(row);
  }
}

// ===== Animação (ghosts) =====
function createGhost(dotEl, colorClass) {
  const r = dotEl.getBoundingClientRect();
  const g = document.createElement("div");
  g.className = "ghost " + colorClass;
  g.style.left = r.left + "px";
  g.style.top = r.top + "px";
  g.dataset.baseLeft = r.left;
  g.dataset.baseTop = r.top;
  animLayer.appendChild(g);
  return g;
}

function moveGhost(ghost, slot) {
  const stageR = stageInner.getBoundingClientRect();
  const dx = (stageR.left + slot.x) - parseFloat(ghost.dataset.baseLeft);
  const dy = (stageR.top + slot.y) - parseFloat(ghost.dataset.baseTop);
  ghost.style.transform = `translate(${dx}px, ${dy}px)`;
}

// ===== Lógica de resposta =====
async function checkAnswer(value) {
  if (answered || hintRunning) return;

  const correct = (op === "+") ? (a + b) : (op === "-") ? (a - b) : (a * b);

  // AQUI é o ponto que você pediu:
  // desativa os botões numéricos e ativa o Próxima
  answered = true;
  setAnswerButtonsDisabled(true);
  btnNext.disabled = false; // ✅ EXATAMENTE aqui
  // (mas updateControls vai garantir o bloqueio durante animação)
  
  elFinalQuestionText.textContent = value;
  elFinalQuestionText.style.color = (value === correct) ? "#16a34a" : "#dc2626";

  if (value === correct) {
    hits++;
    elMsg.textContent = "Acertou! 🎉";
    setBuddy("acertou", "Incrível!", "Você domina tudo!");
  } else {
    miss++;
    elMsg.textContent = "Ops! Vamos ver?";
    setBuddy("errou", "Observe...", "Vou te ensinar o caminho.");
  }

  setStats();
  updateControls();

  // Em vez de rodar a animação automaticamente, mostra botão "Exibir animação"
  showStageButton("Exibir animação", () => showHint());
}

// ===== Dica/Explicar (animação) =====
async function showHint() {
  if (hintRunning) return;

  // guarda se já tinha respondido antes de iniciar a dica
  const alreadyAnswered = answered;

  hintRunning = true;

  // durante animação: trava dica e próxima, e trava os botões numéricos
  setAnswerButtonsDisabled(true);
  updateControls();

  // limpa palco
  stageInner.innerHTML = "";
  stageInner.style.cssText = "";
  animLayer.innerHTML = "";
  elStageCounter.textContent = "0";
  elStageCounter.classList.remove("negative");

  const result = (op === "+") ? (a + b) : (op === "-") ? (a - b) : (a * b);

  const dtsA = [...elDotsA.querySelectorAll(".dot")];
  const dtsB = [...elDotsB.querySelectorAll(".dot")];

  if (op === "+") {
    // move A (pretas) + B (azuis) pro palco
    const ghosts = [
      ...dtsA.map(d => createGhost(d, "")),
      ...dtsB.map(d => createGhost(d, "blue"))
    ];

    ghosts.forEach((g, i) => setTimeout(() => moveGhost(g, getStageSlot(i)), i * 50));
    await wait(ghosts.length * 50 + 600);

    animLayer.innerHTML = "";

    const stageDots = [];
    for (let i = 0; i < a; i++) stageDots.push(putFixedDot(i, ""));
    for (let i = 0; i < b; i++) stageDots.push(putFixedDot(a + i, "blue"));

    await countPulse(stageDots);

  } else if (op === "-") {
    // SUBTRAÇÃO
    // 1) Move A pro palco
    const ghostsA = dtsA.map(d => createGhost(d, ""));
    ghostsA.forEach((g, i) => setTimeout(() => moveGhost(g, getStageSlot(i)), i * 50));
    await wait(a * 50 + 600);

    animLayer.innerHTML = "";

    const fixedA = [];
    for (let i = 0; i < a; i++) fixedA.push(putFixedDot(i, ""));
    await wait(400);

    // 2) Move B (vermelhas) anulando do fim pro começo
    dtsB.forEach((d, i) => {
      const g = createGhost(d, "red");

      const isNegativeBalance = (i >= a);
      const targetIndex = isNegativeBalance ? i : (a - 1 - i);
      const slot = getStageSlot(targetIndex);

      setTimeout(async () => {
        moveGhost(g, slot);
        await wait(550);

        g.style.opacity = "0";
        if (!isNegativeBalance) {
          if (fixedA[targetIndex]) fixedA[targetIndex].style.opacity = "0";
        } else {
          putFixedDot(targetIndex, "negative-result");
        }
      }, i * 200);
    });

    await wait(b * 200 + 900);

    // 3) Contagem final
    stageInner.innerHTML = "";
    const remain = [];

    if (result >= 0) {
      for (let i = 0; i < result; i++) remain.push(putFixedDot(i, ""));
      await countPulse(remain);
    } else {
      const numNegativos = Math.abs(result);
      elStageCounter.classList.add("negative");

      for (let i = 0; i < numNegativos; i++) {
        remain.push(putFixedDot(i, "negative-result"));
      }

      for (let i = 0; i < remain.length; i++) {
        remain[i].classList.add("pulse");
        elStageCounter.textContent = "-" + (i + 1);
        await wait(400);
        remain[i].classList.remove("pulse");
      }
    }
  } else {
    // MULTIPLICAÇÃO: 2 × 5 = "o 2 desce 5 vezes" → b grupos de a
    // Layout horizontal: ●● + ●● + ●● + ●● + ●●  (com wrap)
    let srcA = [...elDotsA.querySelectorAll(".dot")];
    if (srcA.length === 0) srcA = [...elDotsA.querySelectorAll(".bar-unit")];
    let srcB = [...elDotsB.querySelectorAll(".dot")];
    if (srcB.length === 0) srcB = [...elDotsB.querySelectorAll(".bar-unit")];

    const groups = b;
    const perGroup = a;

    stageInner.style.display = "flex";
    stageInner.style.flexWrap = "wrap";
    stageInner.style.alignItems = "center";
    stageInner.style.gap = "6px";
    stageInner.style.height = "auto";

    for (let group = 0; group < groups; group++) {
      const cls = group % 2 === 0 ? "blue" : "blue-alt";

      if (srcB[group]) srcB[group].classList.add("active-group");

      // Wrapper que mantém [grupo + plus] na mesma linha
      const wrapper = document.createElement("div");
      wrapper.className = "mult-wrapper";

      // Container do grupo (invisível para pegar posições)
      const groupDiv = document.createElement("div");
      groupDiv.className = "mult-group";
      groupDiv.style.visibility = "hidden";
      const dots = [];
      for (let i = 0; i < perGroup; i++) {
        const d = document.createElement("div");
        d.className = "mult-dot " + cls;
        dots.push(d);
        groupDiv.appendChild(d);
      }
      wrapper.appendChild(groupDiv);
      stageInner.appendChild(wrapper);

      await wait(20);
      const targetRects = dots.map(d => d.getBoundingClientRect());

      // Ghosts voam da zona A para as posições do grupo
      const ghosts = srcA.map(d => createGhost(d, cls));
      await wait(30);
      ghosts.forEach((g, i) => {
        if (i < targetRects.length) {
          setTimeout(() => {
            const r = targetRects[i];
            const dx = r.left - parseFloat(g.dataset.baseLeft);
            const dy = r.top - parseFloat(g.dataset.baseTop);
            g.style.transform = `translate(${dx}px, ${dy}px)`;
          }, i * 60);
        }
      });
      await wait(perGroup * 60 + 600);

      // Revela grupo
      animLayer.innerHTML = "";
      groupDiv.style.visibility = "visible";

      // "+" aparece depois do grupo revelado (exceto o último)
      if (group < groups - 1) {
        const plusEl = document.createElement("span");
        plusEl.className = "mult-plus";
        plusEl.textContent = "+";
        wrapper.appendChild(plusEl);
      }

      elStageCounter.textContent = (group + 1) * perGroup;

      if (srcB[group]) {
        srcB[group].classList.remove("active-group");
        srcB[group].classList.add("fade-out");
      }
      await wait(350);
    }

    // Zona A some ao final
    srcA.forEach(d => d.classList.add("fade-out"));
    await wait(400);
  }

  // número voando pro resultado
  await animateNumberToEquation(result);

  // terminou animação
  elStageCounter.classList.remove("negative");
  hintRunning = false;

  // se o usuário AINDA não respondeu (clicou dica antes):
  // reativa botões numéricos e mantém Próxima desativado
  if (!alreadyAnswered) {
    setAnswerButtonsDisabled(false);
  }

  updateControls();

  // Multiplicação: oferecer botão "Agrupar" se faz sentido (>= 10 dots)
  if (op === "×" && a * b >= 10) {
    const aFixed = a, bFixed = b;
    showStageButton("Agrupar em dezenas", () => runGroupingAnimation(aFixed, bFixed));
  }
}

// ===== Botões de ação flutuantes no stage =====
function removeStageButtons() {
  document.querySelectorAll(".stage-action-wrap").forEach(b => b.remove());
}

function showStageButton(label, onClick) {
  removeStageButtons();
  const wrap = document.createElement("div");
  wrap.className = "stage-action-wrap";
  const btn = document.createElement("button");
  btn.className = "btn btn-stage-action";
  btn.type = "button";
  btn.textContent = label;
  wrap.appendChild(btn);

  document.getElementById("stage").appendChild(wrap);

  btn.addEventListener("click", async () => {
    wrap.remove();
    await onClick();
  }, { once: true });
}

async function runGroupingAnimation(aVal, bVal) {
  if (hintRunning) return;
  hintRunning = true;
  updateControls();

  const allMultDots = [...stageInner.querySelectorAll(".mult-dot")];
  const startRects = allMultDots.map(d => d.getBoundingClientRect());

  // Cria ghosts em cima dos mult-dots atuais (todos azuis durante o voo)
  animLayer.innerHTML = "";
  const regroupGhosts = startRects.map(r => {
    const g = document.createElement("div");
    g.className = "ghost blue";
    g.style.width = r.width + "px";
    g.style.height = r.height + "px";
    g.style.left = r.left + "px";
    g.style.top = r.top + "px";
    g.dataset.baseLeft = r.left;
    g.dataset.baseTop = r.top;
    animLayer.appendChild(g);
    return g;
  });

  // Fade out dos mult-dots originais + sinais "+"
  stageInner.querySelectorAll(".mult-plus").forEach(p => p.classList.add("fade-out"));
  allMultDots.forEach(d => d.classList.add("fade-out"));
  await wait(350);

  // Constrói layout final: floor(total/10) barras de 10 + (total%10) dots soltos
  const total = aVal * bVal;
  const numBars = Math.floor(total / 10);
  const numUnits = total % 10;

  stageInner.innerHTML = "";
  stageInner.style.flexDirection = "column";
  stageInner.style.alignItems = "flex-start";
  stageInner.style.gap = "6px";

  const finalDotEls = [];
  for (let i = 0; i < numBars; i++) {
    const bar = document.createElement("div");
    bar.className = "bar purple";
    for (let j = 0; j < 10; j++) {
      const u = document.createElement("div");
      u.className = "bar-unit";
      u.style.opacity = "0";
      bar.appendChild(u);
      finalDotEls.push(u);
    }
    stageInner.appendChild(bar);
  }
  if (numUnits > 0) {
    const unitRow = document.createElement("div");
    unitRow.className = "units";
    for (let i = 0; i < numUnits; i++) {
      const d = document.createElement("div");
      d.className = "dot blue";
      d.style.opacity = "0";
      unitRow.appendChild(d);
      finalDotEls.push(d);
    }
    stageInner.appendChild(unitRow);
  }

  await wait(30);
  const endRects = finalDotEls.map(d => d.getBoundingClientRect());

  // Dispara todos os voos (stagger curto pra caber 100 dots)
  const stagger = 15;
  const flightDur = 600;
  regroupGhosts.forEach((g, i) => {
    if (i >= endRects.length) return;
    const r = endRects[i];
    const dx = r.left - parseFloat(g.dataset.baseLeft);
    const dy = r.top - parseFloat(g.dataset.baseTop);
    setTimeout(() => {
      g.style.width = r.width + "px";
      g.style.height = r.height + "px";
      g.style.transform = `translate(${dx}px, ${dy}px)`;
    }, i * stagger);
  });

  // Revela cada barra quando o 10º dot pousa (vira roxa nesse momento)
  let elapsed = 0;
  for (let barIdx = 0; barIdx < numBars; barIdx++) {
    const lastIdx = barIdx * 10 + 9;
    const arriveAt = lastIdx * stagger + flightDur;
    await wait(arriveAt - elapsed);
    elapsed = arriveAt;
    for (let k = 0; k < 10; k++) {
      finalDotEls[barIdx * 10 + k].style.opacity = "1";
      regroupGhosts[barIdx * 10 + k].remove();
    }
    await wait(150);
    elapsed += 150;
  }

  // Revela dots soltos (sobras azuis) quando o último pousar
  if (numUnits > 0) {
    const lastUnitIdx = numBars * 10 + numUnits - 1;
    const unitArriveAt = lastUnitIdx * stagger + flightDur;
    await wait(Math.max(0, unitArriveAt - elapsed));
    for (let k = 0; k < numUnits; k++) {
      finalDotEls[numBars * 10 + k].style.opacity = "1";
      regroupGhosts[numBars * 10 + k].remove();
    }
  }

  animLayer.innerHTML = "";
  await wait(250);

  hintRunning = false;
  updateControls();
}

// ===== Palco: bolinhas fixas =====
function putFixedDot(i, cls) {
  const d = document.createElement("div");
  d.className = "stageDot " + cls;
  const s = getStageSlot(i);
  d.style.left = s.x + "px";
  d.style.top = s.y + "px";
  stageInner.appendChild(d);
  return d;
}

async function countPulse(dots) {
  for (let i = 0; i < dots.length; i++) {
    dots[i].classList.add("pulse");
    elStageCounter.textContent = i + 1;
    await wait(350);
    dots[i].classList.remove("pulse");
  }
}

async function animateNumberToEquation(finalValue) {
  const start = elStageCounter.getBoundingClientRect();
  const end = elFinalQuestionText.getBoundingClientRect();

  const flyer = document.createElement("div");
  flyer.className = "flying-number";
  flyer.textContent = finalValue;

  flyer.style.width = start.width + "px";
  flyer.style.height = start.height + "px";
  flyer.style.left = start.left + "px";
  flyer.style.top = start.top + "px";
  flyer.style.fontSize = window.getComputedStyle(elStageCounter).fontSize;

  document.body.appendChild(flyer);

  elFinalQuestionText.style.visibility = "hidden";
  await wait(20);

  const moveX = (end.left + end.width / 2) - (start.left + start.width / 2);
  const moveY = (end.top + end.height / 2) - (start.top + start.height / 2);

  const scale =
    parseFloat(window.getComputedStyle(elFinalQuestionText).fontSize) /
    parseFloat(window.getComputedStyle(elStageCounter).fontSize);

  flyer.style.transform = `translate(${moveX}px, ${moveY}px) scale(${scale})`;
  await wait(850);

  elFinalQuestionText.textContent = finalValue;
  elFinalQuestionText.style.visibility = "visible";
  elFinalQuestionText.style.color = "#111827";
  elFinalQuestionText.style.transform = "scale(1.3)";
  await wait(150);
  elFinalQuestionText.style.transform = "scale(1)";

  flyer.remove();
}

// ===== Nova pergunta =====
function newQuestion() {
  answered = false;
  hintRunning = false;
  removeStageButtons();

  // reset textos
  elMsg.textContent = "";
  elHintText.textContent = "";

  // reset resultado
  elFinalQuestionText.textContent = "?";
  elFinalQuestionText.style.color = "#9ca3af";
  elFinalQuestionText.style.visibility = "visible";

  // reset palco
  elStageCounter.textContent = "?";
  elStageCounter.classList.remove("negative");
  stageInner.innerHTML = "";
  stageInner.style.cssText = "";
  animLayer.innerHTML = "";

  // carrega conta
  const conta = bancoDeContas.contas[perguntaAtualIndex];
  a = conta.a;
  b = conta.b;
  op = conta.operacao;

  const correct = (op === "+") ? (a + b) : (op === "-") ? (a - b) : (a * b);
  renderAnswerButtons(correct);

  elN1.textContent = a;
  elN2.textContent = b;
  elOp.textContent = op;
  elOpBadge.textContent = op;

  renderDots(elDotsA, a, (op === "×" ? "blue" : ""));
  renderDots(elDotsB, b, (op === "+" ? "blue" : op === "-" ? "red" : "orange"));

  setBuddy("espera", `Nível ${conta.nivel}`, "Quanto dá?");

  renderTabuada();

  // avança índice
  perguntaAtualIndex = (perguntaAtualIndex + 1) % bancoDeContas.contas.length;

  // Próxima deve começar travado até responder
  updateControls();
}

// ===== Eventos =====
btnNext.addEventListener("click", () => {
  if (hintRunning) return;
  newQuestion();
});

btnReset.addEventListener("click", () => {
  newQuestion();
});

btnHint.addEventListener("click", async () => {
  if (hintRunning) return;
  await showHint();
});

// ===== Start =====
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
shuffle(bancoDeContas.contas);

setStats();
newQuestion();