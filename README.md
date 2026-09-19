# Prancha CAA

Aplicativo web de **Comunicação Aumentativa e Alternativa (CAA)** em português do Brasil, para
pessoas não-verbais ou com fala limitada (autismo, paralisia cerebral, afasia, apraxia).

Funciona **inteiramente no navegador**: sem backend, sem login, sem nenhuma chamada de rede
durante o uso. Depois do primeiro carregamento, abre offline e pode ser instalado na tela inicial
do celular como um app nativo (PWA).

---

## Como rodar localmente

Requisitos: Node.js 18 ou mais novo.

```bash
npm install && npm run dev
```

O terminal mostra o endereço (por padrão `http://localhost:5173`). Para testar no celular na
mesma rede Wi-Fi:

```bash
npm run dev -- --host
```

Outros comandos:

```bash
npm run build
```

```bash
npm run preview
```

`build` faz a verificação de tipos e gera a pasta `dist/` (é nesse modo que o service worker é
gerado). `preview` serve a `dist/` localmente — use para testar o funcionamento offline e a
instalação do PWA.

### Testar offline

1. `npm run build && npm run preview`
2. Abra no navegador e carregue a página uma vez.
3. Desligue a internet (ou marque "Offline" na aba Network do DevTools) e recarregue: o app abre
   normalmente, com todas as pranchas.

### Instalar no celular

No Chrome/Android: menu ⋮ → **Instalar aplicativo**.
No Safari/iOS: botão Compartilhar → **Adicionar à Tela de Início**.

> A voz usa a Web Speech API do próprio aparelho. Se nenhuma voz em português aparecer nas
> configurações, instale uma voz **pt-BR** nas configurações de acessibilidade do sistema
> (Android: *Configurações → Acessibilidade → Saída de conversão de texto em voz*).

---

## Como publicar na Vercel

### Opção 1 — pelo site (mais simples)

1. Suba o projeto para um repositório no GitHub/GitLab.
2. Em [vercel.com/new](https://vercel.com/new), importe o repositório.
3. A Vercel detecta o Vite automaticamente:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Clique em **Deploy**. Não há variável de ambiente nenhuma para configurar.

### Opção 2 — pela linha de comando

```bash
npm i -g vercel
```

```bash
vercel
```

Para publicar em produção:

```bash
vercel --prod
```

O app é 100% estático, então cabe no plano gratuito sem custo de execução.

---

## Estrutura de pastas

```
src/
├── main.tsx                    # ponto de entrada, registra o service worker
├── App.tsx                     # abas (Falar, Editar, Histórico, Perfis, Ajustes) e bloqueio por PIN
├── index.css                   # temas (claro/escuro/alto contraste), tamanhos de fonte, foco visível
│
├── tipos/                      # tipos TypeScript de todo o app (símbolo, prancha, perfil...)
├── dados/
│   ├── vocabularioInicial.ts   # vocabulário inicial em PT-BR (núcleo + 14 categorias)
│   ├── modelos.ts              # pranchetas prontas (Escola, Casa, Refeição...) e banco de palavras
│   ├── cartoesIlustrados.ts    # os 9 cartões ilustrados (imagens em public/cartoes)
│   ├── coresFitzgerald.ts      # padrão Fitzgerald Key (cores por categoria gramatical)
│   └── emojisSugeridos.ts      # emojis oferecidos no editor
│
├── armazenamento/
│   └── db.ts                   # persistência no IndexedDB (idb-keyval) + seed inicial
│
├── estado/
│   └── AppContext.tsx          # estado global: perfis, pranchas, frase, histórico, export/import
│
├── fala/
│   ├── frase.ts                # montagem da frase com regras de concordância
│   └── sintetizador.ts         # Web Speech API (voz pt-BR, velocidade, tom)
│
├── utilidades/
│   └── larguraTexto.ts         # mede a largura real de cada palavra para nunca cortar texto
│
├── ganchos/
│   └── useLayoutGrade.ts       # colunas da grade por orientação e densidade
│
├── componentes/
│   ├── BarraFrase.tsx          # barra fixa no topo com FALAR / APAGAR / LIMPAR
│   ├── BotaoSimbolo.tsx        # botão de símbolo (imagem em cima, texto em caixa alta embaixo)
│   ├── BancoDePalavras.tsx     # escolher palavras prontas para uma categoria
│   ├── GaleriaModelos.tsx      # escolher uma prancheta pronta ou um modelo salvo
│   ├── EscolherEmoji.tsx       # seletor de emoji do editor
│   └── BloqueioPin.tsx         # teclado numérico do PIN de 4 dígitos
│
└── telas/
    ├── Comunicador.tsx         # tela principal: grade, pastas, núcleo fixo, varredura, atalhos
    ├── Montar.tsx              # montar pranchetas por momento arrastando e soltando
    ├── Editor.tsx              # criar/editar pranchas e símbolos, exportar e importar .json
    ├── Configuracoes.tsx       # voz, tela, acessibilidade e PIN
    ├── Perfis.tsx              # múltiplos perfis no mesmo aparelho
    └── Historico.tsx           # últimas 30 frases + favoritas
```

---

## Vocabulário inicial

Já vem populado na primeira execução (nenhuma configuração necessária):

| Prancha | Itens |
| --- | --- |
| **Núcleo** (faixa fixa) | 15 palavras de alta frequência: eu, você, quero, não quero, mais, acabou, sim, não, ajuda, parar, ir, gosto, não gosto, meu, dá |
| Sentimentos | 14 |
| Necessidades | 15 |
| Comida | 18 |
| Pessoas | 14 |
| Lugares | 14 |
| Ações | 14 |
| Escola | 14 |
| Social | 12 |
| Números | 13 |
| Cores | 11 |
| Dias da semana | 10 |
| Clima | 10 |
| Corpo humano | 12 |
| Higiene | 10 |

Os verbos vêm **já conjugados na primeira pessoa** ("quero", "gosto"), como nas pranchas usadas
por terapeutas no Brasil.

As 6 últimas categorias (Números até Higiene) chegaram numa atualização depois das 8 primeiras.
Perfis criados antes delas recebem essas categorias automaticamente na próxima vez que abrem o
app (`migrarVocabulario` em `src/armazenamento/db.ts`) — sem duplicar nada e sem trazer de volta
uma categoria que a pessoa já tenha excluído por conta própria.

### Frase natural

Antes de enviar o texto ao sintetizador, `src/fala/frase.ts` aplica regras simples de
concordância. Exemplos reais do que o app fala:

| Símbolos tocados | Frase falada |
| --- | --- |
| eu + quero + água | **Eu quero água.** |
| eu + ir + escola | **Eu vou para a escola.** |
| eu + gosto + ouvir música | **Eu gosto de ouvir música.** |
| eu + triste | **Eu estou triste.** |
| você + ir + mercado | **Você vai para o mercado.** |
| eu + quero + banheiro | **Eu quero ir ao banheiro.** |
| eu + não gosto + feijão | **Eu não gosto de feijão.** |

---

## Modo editor

Pensado para mãe, pai ou terapeuta usar sem saber tecnologia:

- criar prancha nova do zero;
- adicionar símbolo com **palavra + emoji** ou **foto tirada na hora / imagem do aparelho**;
- toda imagem enviada é **redimensionada no próprio aparelho (canvas) para no máximo 300px**
  antes de ir para o IndexedDB;
- editar texto, imagem e cor de qualquer símbolo;
- reordenar arrastando (computador) ou pelas setas ⬆️ ⬇️ (celular);
- excluir com confirmação;
- cor de fundo pelo **padrão Fitzgerald Key**: pessoas em amarelo, ações em verde, descritivos em
  azul, substantivos em laranja, social em rosa, diversos em branco;
- **voz gravada pelo microfone**: em vez da voz sintetizada, grava a própria voz (ou a de quem a
  pessoa reconhece) dizendo a palavra — toca essa gravação sempre que o símbolo é tocado. O
  áudio fica no IndexedDB (nunca sai do aparelho) e viaja junto no export/import de prancha;
- **exportar** a prancha como arquivo `.json` e **importar** de um arquivo — é assim que
  terapeutas trocam pranchas entre si, sem servidor nenhum.

Para impedir que a criança entre no editor sem querer, ative o **PIN de 4 dígitos** em
*Ajustes → Bloqueio da edição*.

### Personalizar categorias e palavras

Na aba **Editar** a pessoa monta a prancheta do jeito que precisa:

- **🗂️ Nova categoria**: escolhe nome, ícone e cor. Ela aparece como um bloco na tela de Início;
- **✏️ Editar categoria**: muda nome, ícone e cor (o bloco no Início acompanha);
- **🗑️ Excluir categoria** (com confirmação);
- **📚 Palavras prontas**: banco com todas as palavras de fábrica, com busca — toca nas que quer
  e elas entram na categoria, sem digitar nem escolher ícone;
- em cada palavra, o campo **"Em qual categoria esta palavra fica?"** move a palavra de uma
  categoria para outra;
- reordenar as palavras com ⬆️ ⬇️ ou arrastando.

---

## Pranchetas prontas e uma prancheta por aluno

Cada **perfil** é a prancheta de uma pessoa. Ao criar um perfil (aba **Perfis**), escolhe-se de
qual modelo ele começa — o aluno recebe uma **cópia** e pode mudar tudo depois sem afetar os
outros:

| Modelo | O que traz |
| --- | --- |
| Completa | todas as categorias de fábrica |
| Escola | sentimentos, necessidades, social, pessoas, lanche, dias, números, cores |
| Casa | comida, rotina, higiene, ações, lugares |
| Refeição, Brincadeiras, Terapia, Passeio | conjuntos menores para cada atividade |

Também é possível **somar** as categorias de um modelo a uma prancheta que já existe
(*Editar → Adicionar categorias de um modelo*); categorias com o mesmo nome não se repetem.

**Publicar / compartilhar** uma prancheta:

- **⭐ Salvar como modelo**: guarda a prancheta de um aluno em *Minhas pranchetas*, para criar a
  de outros alunos a partir dela;
- **⬇️ Exportar prancheta**: gera um único arquivo `.json` com todas as categorias, imagens e
  vozes gravadas; **⬆️ Importar prancheta** (aba Perfis) recebe o arquivo de um colega ou
  terapeuta e cria um novo perfil. Tudo continua sem servidor e sem enviar dados a ninguém.

---

## Montar prancheta por momento (arrastar e soltar)

Aba **Montar**: pensada para a professora (ou terapeuta, ou família) criar a prancheta de um aluno
para um momento específico — escola, almoço, aula — só com as palavras que ele provavelmente vai
usar ali.

- **Embaixo ficam todos os itens**: os cartões ilustrados, as categorias do aluno e as palavras de
  fábrica que ele não tem. Tem busca e cada grupo abre e fecha.
- **Em cima fica a prancheta em montagem.** É só **arrastar e soltar** os itens nela. No celular,
  segure um instante e arraste (rolar a lista continua normal). Funciona com mouse e com o dedo.
- **Vários de uma vez**: toque em vários itens para marcá-los (ou use *Marcar todos* de um grupo) e
  arraste um deles — todos os marcados vão juntos. Também há o botão *Adicionar à prancheta*.
- **Reordenar** arrastando dentro da prancheta (ou com as setas do teclado); **tirar** com o ✕ ou
  arrastando o item de volta para a lista.
- **Salvar**: dá nome e ícone (🏫 Escola, 🍽️ Almoço, 📚 Aula...). A prancheta vira uma **versão** do
  perfil do aluno e já fica em uso. Um perfil pode ter quantas versões quiser.
- Na tela **Falar**, um seletor ao lado do 🏠 troca entre a prancheta *Completa* (todas as
  categorias) e cada versão. A versão mostra só os itens escolhidos, em blocos grandes; a faixa de
  palavras básicas fixas só aparece se você marcar essa opção ao montar.
- As versões viajam junto no **exportar/importar prancheta** e no **salvar como modelo**.

### Cartões ilustrados e imagens próprias

- Os 9 primeiros cartões ilustrados (eu, não, mais, acabou, sim, você, ajuda, ir, parar) vêm com o
  app, em `public/cartoes`, e funcionam offline. No Montar, o botão *Começar com os 9 cartões*
  já preenche a prancheta com eles.
- Um bloco pode ser um **cartão de imagem**: a imagem já traz fundo, desenho e palavra, então o
  bloco mostra só ela (quadrada, com sombra no estilo do app). A palavra continua sendo falada.
- Para usar imagens suas: *Editar → 🖼️ Adicionar várias imagens (cartões)* envia várias de uma
  vez (o nome do arquivo vira a palavra), ou, ao editar um símbolo, marque *"A imagem já é o
  cartão inteiro"*. As imagens ficam só no aparelho.

---

## Texto que não corta

Nenhuma palavra é cortada, em nenhum tamanho de tela:

- `src/utilidades/larguraTexto.ts` mede a largura real de cada palavra (canvas, mesma fonte do
  botão) e o texto se ajusta ao bloco (`container query units`), com piso legível de 10px;
- o número de colunas da grade diminui sozinho quando existe uma palavra longa
  (ex.: "envergonhado") que não caberia numa coluna estreita;
- os blocos pequenos (núcleo, sugestões) ganharam mais altura e espaço interno;
- em *Ajustes → Tela → **Tamanho dos blocos***, a opção **GRANDE** dá blocos mais altos, letra
  maior e uma coluna a menos.

Verificado medindo o DOM: 611 blocos de 14 categorias em 320, 375, 820 e 1440px, nos dois
tamanhos de bloco, sem nenhuma palavra cortada.


---

## Sugestões, rotinas e reforço positivo

- **Sugestões de palavras**: depois de tocar em "quero" ou "não quero", uma faixa de sugestões
  aparece com os símbolos que a pessoa mais usa (o app aprende sozinho, contando o uso de cada
  símbolo). Sem uso suficiente ainda, sugere itens da categoria Comida como ponto de partida.
  Liga e desliga em *Ajustes → Sugestões e rotinas*.
- **Rotinas prontas**: monte uma sequência normalmente (tocando os símbolos) e toque em
  **"Salvar esta frase como rotina"**, na barra de frase. A rotina vira um atalho de um toque só
  na tela principal (🔁 ROTINAS) — toca, fala a sequência inteira e já mostra na barra de frase.
  Ótimo para rotinas do dia a dia ("hora de dormir", "hora do lanche"). Renomeia e exclui em
  *Ajustes → Sugestões e rotinas*.
- **Reforço positivo**: um breve brilho de estrelinhas (menos de 1 segundo, `prefers-reduced-motion`
  desliga) depois de falar uma frase completa ou usar uma rotina. Desligável em Ajustes para quem
  prefere menos estímulo visual.

---

## Visual

O visual é de app de jogo (referência: capas coloridas em grade "bento", cantos bem
arredondados, botões com relevo), mas cada escolha estética passa pela acessibilidade:

- **Tiles coloridos com relevo**: cada símbolo é um cartão com preenchimento vivo da sua
  categoria, borda inferior mais escura (o "chão") e afundamento no toque.
- **Ícone em destaque, nunca cortado**: o desenho fica dentro de um círculo claro, e o tamanho
  do emoji é calculado a partir do próprio círculo (unidades de container CSS) — em qualquer
  densidade de grade o ícone cabe inteiro, sem corte.
- **Texto uniforme**: a palavra tem o mesmo tamanho em todos os tiles; só as poucas palavras
  muito longas ("NECESSIDADES") diminuem o suficiente para caber numa linha, em vez de quebrar
  no meio da palavra.
- **Cor com significado**: as cores seguem o padrão Fitzgerald Key, então a tela fica colorida
  *e* ensina o tipo de palavra (pessoas em amarelo, ações em verde, sentimentos em azul,
  coisas em laranja, social em rosa).
- **Contraste garantido**: todo preenchimento vivo usa texto escuro da mesma família de cor.
  Nos três temas (claro, escuro e alto contraste) todos os textos medidos ficam **acima de
  4,5:1** — bem além do mínimo WCAG AA para texto grande.
- **Cada categoria com identidade própria**: as oito pastas da tela inicial têm cores
  diferentes entre si *e* texturas diferentes (bolinhas, listras, grade, quadriculado). A
  diferença entre "Comida", "Pessoas" e "Sentimentos" fica visível de longe — e continua
  visível para quem não distingue bem as cores. Cada capa ainda traz a marca d'água do desenho
  no canto e uma etiqueta com a quantidade de palavras dentro.
- **A pasta também fala**: tocar em "Comida" fala "comida" e abre a prancha — o mesmo gesto
  ensina a palavra e navega.
- **Tema claro e escuro**: o cromo muda (fundo, cartões, texto), mas as cores dos símbolos
  continuam as mesmas nos dois temas — a criança não precisa reaprender nada à noite.
- **Tipografia**: Nunito (arredondada, pesos 700–900), empacotada junto com o app; nenhuma
  fonte é buscada na internet, o que mantém tudo funcionando offline.
- Os tokens de cor, relevo e tipografia ficam todos em `src/index.css`, em variáveis CSS
  (`--pessoas`, `--acoes`, `--cartao`…): trocar a identidade visual é mexer num só arquivo.

### Dois estilos visuais

Em *Ajustes → Estilo visual* dá para escolher entre dois visuais para o app inteiro (a escolha
fica salva no perfil, junto com as outras configurações):

| Estilo | Aparência |
| --- | --- |
| **Contorno** (padrão) | contorno preto grosso em tudo, sombra sólida deslocada (sem desfoque) e cores chapadas — visual tipo "sticker". |
| **Dinâmico** | relevo suave, sombra desfocada e texturas nas capas — um estilo alternativo mais colorido. |

As cores de cada categoria e símbolo são as mesmas nos dois estilos; só o tratamento de borda e
sombra muda. A tela de Ajustes mostra os dois lado a lado numa prévia antes de aplicar, e a
troca só acontece ao tocar em **APLICAR ESTILO** — nada muda sozinho enquanto a pessoa está só
olhando as opções.

Tecnicamente, o estilo escolhido vira o atributo `data-estilo` no `<html>`, e a diferença toda
está em um bloco de CSS em `src/index.css` (seção "ESTILO VISUAL PADRÃO: CONTORNO") que
sobrescreve bordas e sombras — funciona em conjunto com qualquer tema (claro, escuro ou alto
contraste), porque a cor do contorno vem da própria variável de texto do tema ativo.

### Desktop, tablet e celular

O app roda igual nos três, mas o layout se adapta:

- **Celular e tablet em pé** (até 1023px de largura): o app ocupa a tela inteira, como um
  aplicativo nativo. 3 colunas de símbolos no celular em pé, 4 no celular deitado ou tablet.
- **Tablet deitado e computador** (1024px ou mais): o app vira um cartão centralizado na tela,
  com folga nas laterais — sem isso, num monitor largo os símbolos ficavam gigantes e
  espalhados de ponta a ponta. 6 colunas de símbolos. A moldura usa contorno preto grosso e
  sombra sólida no estilo Contorno, e borda fina com sombra suave no estilo Dinâmico.
- Em qualquer tamanho de tela, a altura de cada símbolo tem um teto (`22vh`): isso evita que,
  em telas altas e estreitas (um tablet em pé, por exemplo), os símbolos virem retângulos
  compridos e deformados — o espaço que sobra vira margem equilibrada em vez de esticar os
  símbolos.
- Espaçamentos e preenchimentos (entre símbolos, dentro dos cartões, nas bordas da tela)
  aumentam um pouco em telas maiores (`sm:`/`lg:` do Tailwind), para nada ficar apertado.

---

### Movimento

O app responde ao toque de forma bem visível — é isso que dá a sensação de app dinâmico e
confirma para a pessoa que o toque funcionou:

| Ação | O que acontece |
| --- | --- |
| Tocar em um símbolo | o tile pula (260ms) e uma onda clara sai do centro |
| Abrir uma pasta | os tiles da nova prancha entram em sequência, de baixo para cima |
| Palavra nova na frase | o chip aparece com um "pop" |
| Enquanto a voz fala | três barrinhas sobem e descem na barra de frase |

As regras que o movimento respeita, pensando em sensibilidade sensorial: nada pisca, nada muda
de cor bruscamente, nada fica em laço infinito (exceto as barrinhas, que existem só enquanto a
voz está falando), cada animação dura entre 150ms e 420ms — e **`prefers-reduced-motion`
desliga todas elas**, deixando só a resposta estática do toque.

---

## Acessibilidade

- Contraste mínimo WCAG AA em todos os elementos; tema de **alto contraste** (preto/branco/amarelo)
  disponível.
- **Alvos de toque nunca menores que 64×64px** — verificado em tela.
- Transições de no máximo **150ms** e nenhuma animação decorativa;
  `prefers-reduced-motion` desliga o que restar.
- Foco sempre visível, com contorno grosso de 4px.
- **Atalhos de teclado** (para acionador/switch):
  - `ESPAÇO` fala a frase (ou seleciona o símbolo destacado, quando a varredura está ligada);
  - `BACKSPACE` apaga a última palavra;
  - `SETAS` navegam entre os símbolos com foco destacado.
- **Modo varredura (scanning)**: destaca os símbolos em sequência automática, com intervalo
  configurável de 1 a 5 segundos. A seleção acontece com `ESPAÇO` **ou tocando em qualquer lugar
  da área de símbolos** — recurso essencial para limitação motora severa e ausente na maioria dos
  apps gratuitos.
- **Zona morta**: toques repetidos no mesmo botão em menos de 300ms são ignorados.

---

## Privacidade

Nada sai do aparelho. Pranchas, fotos, perfis e histórico ficam no IndexedDB do navegador; a voz
é sintetizada localmente. O app não tem backend, não faz requisições em tempo de execução e não
coleta nenhum dado.

Para apagar tudo, basta limpar os dados do site no navegador (ou desinstalar o app da tela
inicial).

Se o armazenamento do navegador não responder (banco bloqueado por outra aba, modo privado,
disco cheio), o app **abre de qualquer jeito** em até 4 segundos, com o vocabulário inicial, e
avisa no console que as mudanças daquela sessão não serão salvas — um dispositivo de
comunicação não pode ficar preso numa tela de carregamento.

---

## Tecnologias

React + TypeScript + Vite · Tailwind CSS · PWA (vite-plugin-pwa / Workbox) ·
Web Speech API (SpeechSynthesis) · IndexedDB via `idb-keyval`.
