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

    // Personagens (slug → nome de exibição). Alimenta os chips da página
    // personagens.html. O `personagens` de cada história abaixo aponta pra estes
    // slugs. (Os mesmos slugs/nomes estão na seção Personagens do index.html.)
    window.KIDS_PERSONAGENS = {
        kaco: { nome: 'Kaco', icone: 'img/icone-kaco.png', cor: '#a9744f' },
        mae:  { nome: 'Mãe',  icone: 'img/icone-mae.png',  cor: '#e0729e' },
        gato: { nome: 'Gato', icone: 'img/icone-gato.png', cor: '#f0922b' },
        rato: { nome: 'Rato', icone: 'img/icone-rato.png', cor: '#6f7bd1' },
        pato: { nome: 'Pato', icone: 'img/icone-pato.png', cor: '#2aa9e0' },
        pai:  { nome: 'Pai',  icone: 'img/icone-pai.png',  cor: '#ec5a5a' },
        motorista: { nome: 'Motorista', icone: 'img/icone-motorista.png', cor: '#9b6fd1' },
        terapeuta: { nome: 'Tio Thiago', icone: 'img/icone-terapeuta.png', cor: '#5bbf6a' },
    };

    window.KIDS_STORIES = [
        {
            id: 'o-passeio-feliz', t: 'O Passeio Feliz', cat: 'emocoes',
            img: 'historias/o-passeio-feliz/1.jpeg', dur: '', src: '',
            cenas: 9,
            personagens: ['kaco', 'mae'],
            desc: 'Num passeio no parque, o Kaco se frustra e chora. Com o colo da Mãe ele aprende a se acalmar, e o dia volta a ficar feliz.',
            tx: 'Num passeio no parque, o Kaco se frustra e chora. Com o colo da Mãe ele aprende a se acalmar, e o dia volta a ficar feliz.',
        },
        {
            id: 'o-gato-o-rato-e-o-pato', t: 'O Gato, o Rato e o Pato', cat: 'aventura',
            img: 'historias/o-gato-o-rato-e-o-pato/1.jpeg', dur: '', src: '',
            cenas: 7,
            personagens: ['gato', 'rato', 'pato'],
            desc: 'Uma brincadeira animada no jardim, cheia de rimas e correria. O gato, o rato e o pato aprontam e se divertem juntos.',
            tx: 'Uma brincadeira animada no jardim, cheia de rimas e correria. O gato, o rato e o pato aprontam e se divertem juntos.',
        },
        {
            id: 'kaco-anda-de-bicicleta', t: 'Kaco Anda de Bicicleta', cat: 'aventura',
            img: 'historias/kaco-anda-de-bicicleta/1.jpeg', dur: '', src: '',
            cenas: 8,
            personagens: ['kaco', 'pai'],
            desc: 'O Kaco ganha uma bicicleta e pede ajuda ao Pai pra aprender. De capacete, ele cai, levanta e no fim pedala sozinho, feliz da vida.',
            tx: 'O Kaco ganha uma bicicleta e pede ajuda ao Pai pra aprender. De capacete, ele cai, levanta e no fim pedala sozinho, feliz da vida.',
        },
        {
            id: 'kaco-vai-a-praia', t: 'Kaco Vai à Praia', cat: 'aventura',
            img: 'historias/kaco-vai-a-praia/1.jpeg', dur: '', src: '',
            cenas: 10,
            personagens: ['kaco', 'mae', 'motorista'],
            desc: 'O Kaco vai à praia com a Mãe, anda de ônibus, faz uma piscininha na areia e vê o pôr do sol. Um passeio gostoso que termina em sono bom.',
            tx: 'O Kaco vai à praia com a Mãe, anda de ônibus, faz uma piscininha na areia e vê o pôr do sol. Um passeio gostoso que termina em sono bom.',
        },
        {
            id: 'kaco-com-tio-thiago', t: 'Kaco com Tio Thiago', cat: 'emocoes',
            img: 'historias/kaco-com-tio-thiago/1.jpeg', dur: '', src: '',
            cenas: 9,
            personagens: ['kaco', 'mae', 'terapeuta'],
            desc: 'Na terapia, o Kaco chega tímido e se irrita na hora de guardar os brinquedos. Com o Tio Thiago ele respira, coopera e termina o dia orgulhoso.',
            tx: 'Na terapia, o Kaco chega tímido e se irrita na hora de guardar os brinquedos. Com o Tio Thiago ele respira, coopera e termina o dia orgulhoso.',
        },
    ];

    // Desenhos pra colorir (linha preta sobre branco). Fonte única: tanto colorir.html
    // quanto o feed de personagens.html leem desta lista. Cada desenho marca os
    // personagens que aparecem nele (alimenta o filtro por personagem). Por ora só o
    // Kaco tem desenho — é o que o torna o único personagem com os 3 tipos (história,
    // colorir, quebra-cabeça). Adicionar desenho de outro personagem é só incluir aqui.
    //   id  — identificador estável do desenho (arquivo em colorir/<id>.jpeg)
    //   t   — título do card
    //   img — imagem do desenho
    //   personagens — slugs (ver KIDS_PERSONAGENS) que aparecem no desenho
    // OBS: o card "Desenhe ou carregue" (canvas em branco + upload) NÃO entra aqui —
    // ele é uma ferramenta da página colorir.html, não um desenho de personagem.
    window.KIDS_COLORIR = [
        {
            id: 'desenho1', t: 'Desenho 1', img: 'colorir/desenho1.jpeg',
            personagens: ['kaco'],
            desc: 'Clique e pinte do seu jeito!',
        },
    ];
})();
