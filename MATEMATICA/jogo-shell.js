// =========================
//   JOGO: shell compartilhado
//   Monta o header (3 níveis: Fácil/Médio/Difícil, centralizados) e o corpo
//   do jogo a partir de window.JOGO = { op, nivel }. Antes esse HTML era
//   copiado em cada página; agora vive num lugar só.
//
//   Uso na página (dentro de uma pasta de operação, ex: somar/facil.html):
//     <script id="dados-jogo"> const bancoDeContas = {...}; </script>
//     <script> window.JOGO = { op: "somar", nivel: "facil" }; </script>
//     <script src="../jogo-shell.js"></script>
//     <script src="../script.js"></script>
// =========================
(function () {
  const cfg = window.JOGO || {};
  const op = cfg.op || "somar";       // somar | subtrair | misturado | multiplicar
  const nivel = cfg.nivel || "facil"; // facil | medio | dificil

  // Operações irmãs (rótulo do select + pasta de destino)
  const OPS = [
    { key: "somar",       label: "➕ Somar",       folder: "somar" },
    { key: "subtrair",    label: "➖ Subtrair",    folder: "subtrair" },
    { key: "misturado",   label: "🔢 Misturado", folder: "misturado" },
    { key: "multiplicar", label: "✖️ Multiplicar", folder: "multiplicar" },
  ];

  // Os 3 níveis padronizados
  const NIVEIS = [
    { key: "facil",   classe: "facil",   rotulo: "Fácil" },
    { key: "medio",   classe: "medio",   rotulo: "Médio" },
    { key: "dificil", classe: "dificil", rotulo: "Difícil" },
  ];

  const opAtual = OPS.find(o => o.key === op) || OPS[0];
  const nivelAtual = NIVEIS.find(n => n.key === nivel) || NIVEIS[0];
  document.title = `${opAtual.label.replace(/^\S+\s/, "")} — ${nivelAtual.rotulo}`;

  // Botões de nível → página irmã na mesma pasta (facil.html / medio.html / dificil.html)
  const botoesNivel = NIVEIS.map(n => {
    const ativo = n.key === nivel;
    const check = ativo ? '<i class="fa-solid fa-circle-check"></i> ' : "";
    return `<button class="nivel ${n.classe}${ativo ? " ativo" : ""}" type="button"
              onclick="window.location.href='${n.key}.html'">${check}${n.rotulo}</button>`;
  }).join("\n          ");

  // Select de operação → facil.html da operação escolhida
  const opcoesOp = OPS.map(o => {
    const sel = o.key === op ? " selected" : "";
    return `<option value="../${o.folder}/facil.html"${sel}>${o.label}</option>`;
  }).join("\n              ");

  const html = `
  <div class="app">
    <header>
      <div class="config-jogo">
        <div class="btn-niveis">
          ${botoesNivel}
          <div class="operacoes">
            <select id="operacao">
              ${opcoesOp}
            </select>
          </div>
          <div class="stats">
            <div class="pill">Acertos: <strong id="hits">0</strong></div>
            <div class="pill">Erros: <strong id="miss">0</strong></div>
            <div class="pill">Total de: <strong id="total">0</strong><strong> de 30</strong></div>
          </div>
        </div>
      </div>
      <button class="btn btn-reset" id="btnReset" type="button">
        <i class="fa-solid fa-rotate-left"></i> RECOMEÇAR
      </button>
    </header>

    <div class="content">
      <div class="card">
        <div class="zones">
          <div class="zone" id="zoneA">
            <div class="zoneTitle">1º número</div>
            <div class="dots" id="dotsA"></div>
          </div>
          <div class="opBadge" id="opBadge">+</div>
          <div class="zone" id="zoneB">
            <div class="zoneTitle">2º número</div>
            <div class="dots" id="dotsB"></div>
          </div>
        </div>

        <div class="stage" id="stage">
          <div class="stageTitle">(dica)</div>
          <div class="stageInner" id="stageInner"></div>
          <div id="stageCounter" class="stageCounter">?</div>
        </div>

        <div class="question">
          <div class="big">
            <span id="n1">?</span>
            <span id="op">+</span>
            <span id="n2">?</span>
            =
            <span id="finalQuestionText">?</span>
          </div>
        </div>

        <div class="buttons" id="buttons"></div>
        <div id="message" class="msg"></div>

        <div class="controls">
          <button class="btn btn-hint" id="btnHint" type="button">
            <i class="fa-solid fa-graduation-cap"></i> Dica / Explicar
          </button>
          <button class="btn btn-next" id="btnNext" type="button">
            Próxima <i class="fa-solid fa-arrow-right"></i>
          </button>
        </div>

        <div id="hintText" class="hintText"></div>
      </div>

      <div class="card buddy">
        <div class="avatar-container">
          <img src="../espera.png" id="buddyImg" alt="Personagem" class="buddy-img">
        </div>
        <h2 id="buddyTitle">Vamos começar!</h2>
        <p id="buddyText">Escolha um número.</p>
      </div>
    </div>
  </div>

  <div id="animLayer"></div>`;

  document.body.insertAdjacentHTML("beforeend", html);

  // Troca de operação pelo select
  document.getElementById("operacao").addEventListener("change", function () {
    window.location.href = this.value;
  });
})();
