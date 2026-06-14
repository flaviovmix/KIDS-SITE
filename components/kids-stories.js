/* ===== kids-stories — fonte única das histórias do Kaco =====
   Título, categoria, imagem, duração e transcrição moram SÓ aqui. As páginas
   (histórias, colorir, áudio-histórias) leem desta lista; adicionar/mudar uma
   história é num lugar só.

   As cores das categorias apontam pros design tokens do style.css (--c-rotina
   etc.), então mudar a cor da marca também é num lugar só.

   Campos por história:
     id   — identificador estável (usado pra casar com textos por página)
     t    — título
     cat  — chave da categoria (ver KIDS_CATEGORIAS)
     img  — capa
     dur  — duração do áudio
     src  — caminho do .m4a (os arquivos entram em audio/ depois)
     tx   — transcrição (usada na página de áudio-histórias)
     cenas — páginas do livrinho (página historia.html). Pode ser:
             • um número N → o leitor monta historias/<id>/1.jpeg … N.jpeg
               (cena 1 = capa-título, última = FIM; texto já embutido na imagem)
             • um array de caminhos, se a história fugir da convenção
             Sem cenas, a história aparece como "em breve" no leitor. */
(function () {
    window.KIDS_CATEGORIAS = {
        emocoes:  { nome: 'Emoções',  cor: 'var(--c-emocoes)' },
        rotina:   { nome: 'Rotina',   cor: 'var(--c-rotina)' },
        aventura: { nome: 'Aventura', cor: 'var(--c-aventura)' },
    };

    window.KIDS_STORIES = [
        {
            id: 'passeio-feliz', t: 'O Passeio Feliz', cat: 'rotina',
            img: 'img-slide/0 (1).png', dur: '3:12', src: 'audio/o-passeio-feliz.m4a',
            cenas: 9,
            tx: 'Kaco sai pra passear com a mamãe e descobre que o caminho também é brincadeira. Cada esquina vira uma pequena aventura, e voltar pra casa fica tão gostoso quanto sair.',
        },
        {
            id: 'mochila-esquecida', t: 'A Mochila Esquecida', cat: 'rotina',
            img: 'img-slide/0 (2).png', dur: '2:48', src: 'audio/a-mochila-esquecida.m4a',
            tx: 'A mochila ficou em casa! Kaco aprende que esquecer faz parte e que quase tudo tem solução quando a gente respira e pensa com calma.',
        },
        {
            id: 'brincando-no-parque', t: 'Brincando no Parque', cat: 'aventura',
            img: 'img-slide/0 (3).png', dur: '4:05', src: 'audio/brincando-no-parque.m4a',
            tx: 'Um dia de parque com a turma: esperar a vez, dividir o balanço e brincar junto. Pequenas combinações que deixam todo mundo feliz.',
        },
        {
            id: 'aniversario-surpresa', t: 'Aniversário Surpresa', cat: 'emocoes',
            img: 'img-slide/0 (4).png', dur: '3:30', src: 'audio/aniversario-surpresa.m4a',
            tx: 'Uma festa inesperada! Kaco sente a surpresa batendo forte no peito e aprende a respirar fundo pra aproveitar o momento.',
        },
        {
            id: 'dia-de-chuva', t: 'Dia de Chuva', cat: 'emocoes',
            img: 'img-slide/0 (5).png', dur: '2:55', src: 'audio/dia-de-chuva.m4a',
            tx: 'O passeio foi cancelado pela chuva. E agora? Kaco lida com a mudança de plano e descobre que dentro de casa também cabe diversão.',
        },
        {
            id: 'a-lua-cheia', t: 'A Lua Cheia', cat: 'aventura',
            img: 'img-slide/0 (6).png', dur: '3:40', src: 'audio/a-lua-cheia.m4a',
            tx: 'Uma noite tranquila olhando a lua, do jeitinho calmo que o Kaco gosta. Um respiro de paz pra fechar o dia.',
        },
    ];
})();
