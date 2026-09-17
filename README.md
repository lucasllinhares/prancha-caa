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
│   ├── vocabularioInicial.ts   # vocabulário inicial em PT-BR (núcleo + 8 categorias)
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
├── ganchos/
│   └── useLayoutGrade.ts       # colunas da grade por orientação e densidade
│
├── componentes/
│   ├── BarraFrase.tsx          # barra fixa no topo com FALAR / APAGAR / LIMPAR
│   ├── BotaoSimbolo.tsx        # botão de símbolo (imagem em cima, texto em caixa alta embaixo)
│   ├── EscolherEmoji.tsx       # seletor de emoji do editor
│   └── BloqueioPin.tsx         # teclado numérico do PIN de 4 dígitos
│
└── telas/
    ├── Comunicador.tsx         # tela principal: grade, pastas, núcleo fixo, varredura, atalhos
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

Os verbos vêm **já conjugados na primeira pessoa** ("quero", "gosto"), como nas pranchas usadas
por terapeutas no Brasil.

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
- **exportar** a prancha como arquivo `.json` e **importar** de um arquivo — é assim que
  terapeutas trocam pranchas entre si, sem servidor nenhum.

Para impedir que a criança entre no editor sem querer, ative o **PIN de 4 dígitos** em
*Ajustes → Bloqueio da edição*.

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
| **Dinâmico** (padrão) | o descrito acima: relevo suave, sombra desfocada e texturas nas capas. |
| **Contorno** | visual tipo "sticker": contorno preto grosso em tudo, sombra sólida deslocada (sem desfoque) e sem texturas — cores chapadas. |

As cores de cada categoria e símbolo são as mesmas nos dois estilos; só o tratamento de borda e
sombra muda. A tela de Ajustes mostra os dois lado a lado numa prévia antes de aplicar, e a
troca só acontece ao tocar em **APLICAR ESTILO** — nada muda sozinho enquanto a pessoa está só
olhando as opções.

Tecnicamente, o estilo escolhido vira o atributo `data-estilo` no `<html>`, e a diferença toda
está em um bloco de CSS em `src/index.css` (seção "ESTILO VISUAL ALTERNATIVO: CONTORNO") que
sobrescreve bordas e sombras — funciona em conjunto com qualquer tema (claro, escuro ou alto
contraste), porque a cor do contorno vem da própria variável de texto do tema ativo.

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
