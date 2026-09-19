import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../estado/AppContext';
import { BarraFrase } from '../componentes/BarraFrase';
import { BotaoSimbolo } from '../componentes/BotaoSimbolo';
import { ReforcoPositivo } from '../componentes/ReforcoPositivo';
import { useLayoutGrade } from '../ganchos/useLayoutGrade';
import { larguraEmEm, useFontesProntas } from '../utilidades/larguraTexto';
import { SIMBOLOS_NUCLEO } from '../dados/vocabularioInicial';
import type { Simbolo } from '../tipos';

/** Tempo mínimo entre dois toques no MESMO botão (zona morta). */
const ZONA_MORTA_MS = 300;

/**
 * Tela principal: barra de frase fixa, faixa de vocabulário nuclear,
 * grade de símbolos com navegação por pastas, varredura automática e
 * atalhos de teclado para acionador.
 */
export function Comunicador() {
  const {
    pranchas: pranchasReais,
    config,
    imagens,
    frase,
    adicionarNaFrase,
    falarSimbolo,
    falarFrase,
    apagarUltimo,
    falarTextoLivre,
    usarRotina,
    sugestoes,
    perfil,
    versoes,
    ativarVersao
  } = useApp();

  // Versão de prancheta em uso (escola, almoço...): vira a tela inicial, com
  // só os itens escolhidos. Sem versão, vale a prancheta completa (categorias).
  const versaoAtiva = versoes.find((v) => v.id === perfil.versaoAtivaId);
  const pranchas = useMemo(
    () =>
      versaoAtiva
        ? [
            {
              id: versaoAtiva.id,
              nome: versaoAtiva.nome,
              emoji: versaoAtiva.emoji,
              simbolos: versaoAtiva.simbolos,
              inicial: true
            },
            ...pranchasReais.map((p) => ({ ...p, inicial: false }))
          ]
        : pranchasReais,
    [versaoAtiva, pranchasReais]
  );

  const pranchaInicial = pranchas.find((p) => p.inicial) ?? pranchas[0];
  const [pilha, setPilha] = useState<string[]>([pranchaInicial.id]);
  const [pagina, setPagina] = useState(0);

  const pranchaAtual = pranchas.find((p) => p.id === pilha[pilha.length - 1]) ?? pranchaInicial;
  const { colunas: colunasTela, porPagina } = useLayoutGrade(config.densidade);

  // Se a prancha for excluída no editor, volta para o início.
  useEffect(() => {
    if (!pranchas.some((p) => p.id === pilha[pilha.length - 1])) {
      setPilha([pranchaInicial.id]);
      setPagina(0);
    }
  }, [pranchas, pilha, pranchaInicial.id]);

  // Largura útil da área de símbolos (para escolher quantas colunas cabem).
  const refMain = useRef<HTMLElement>(null);
  const [larguraMain, setLarguraMain] = useState(0);
  useEffect(() => {
    const el = refMain.current;
    if (!el) return;
    // Mede na hora (síncrono) e de novo a cada mudança de tamanho.
    const medir = () => {
      const estilo = getComputedStyle(el);
      setLarguraMain(
        el.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight)
      );
    };
    medir();
    window.addEventListener('resize', medir);
    const observador = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null;
    observador?.observe(el);
    return () => {
      window.removeEventListener('resize', medir);
      observador?.disconnect();
    };
  }, []);

  // A prancha de Início lista categorias (pastas) — todas aparecem juntas,
  // sem paginar, para a pessoa ver o mapa completo do app de uma vez. A
  // paginação continua valendo dentro de cada categoria, onde pode haver
  // muitas palavras.
  const semPaginacao = Boolean(pranchaAtual.inicial);
  const totalPaginas = semPaginacao
    ? 1
    : Math.max(1, Math.ceil(pranchaAtual.simbolos.length / porPagina));
  const paginaSegura = Math.min(pagina, totalPaginas - 1);
  const simbolosVisiveis = useMemo(
    () =>
      semPaginacao
        ? pranchaAtual.simbolos
        : pranchaAtual.simbolos.slice(paginaSegura * porPagina, (paginaSegura + 1) * porPagina),
    [pranchaAtual, paginaSegura, porPagina, semPaginacao]
  );

  // Em telas maiores (tablet/computador) a tela de Início ganha uma coluna a
  // mais, para ver mais categorias de uma vez. No celular em pé ficam 3
  // colunas: nomes longos como "NECESSIDADES" precisam da largura para caber
  // inteiros sem quebrar no meio.
  const colunasBase = semPaginacao && colunasTela >= 4 ? colunasTela + 1 : colunasTela;

  // Quando a página tem menos símbolos do que colunas cabem na tela (ex.:
  // últimos 2 itens de uma categoria), usamos só as colunas necessárias —
  // assim a fileira final não fica esticada, com os tiles enormes e vazios
  // do lado. É esse valor (não o da tela) que manda na grade e nas setas.
  // Com "blocos grandes" (Ajustes), uma coluna a menos: cada bloco fica mais
  // largo — é a folga que faz palavras longas caberem inteiras.
  const colunasFinal = config.tamanhoBlocos === 'grande' ? Math.max(2, colunasBase - 1) : colunasBase;

  // Colunas que a maior palavra da página permite: cada bloco precisa ser
  // largo o bastante para a palavra caber inteira numa letra de pelo menos
  // ~10,5px. Se não for, usamos menos colunas (blocos mais largos) — assim
  // nenhuma palavra, nem as que a própria pessoa criar, é cortada ou quebrada.
  const fontesProntas = useFontesProntas();
  const colunasPelaPalavra = useMemo(() => {
    if (larguraMain <= 0) return colunasFinal;
    const emMaximo = simbolosVisiveis.reduce(
      (max, s) => (s.imagemCheia ? max : Math.max(max, larguraEmEm(s.texto))),
      0
    );
    const larguraMinimaBloco = emMaximo * 10.5 + 18; // + borda e margem interna
    const espaco = 8; // espaço entre blocos
    return Math.max(2, Math.floor((larguraMain + espaco) / (larguraMinimaBloco + espaco)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [larguraMain, simbolosVisiveis, colunasFinal, fontesProntas]);

  const colunasPossiveis = Math.min(colunasFinal, colunasPelaPalavra);
  const colunas = Math.max(1, Math.min(colunasPossiveis, simbolosVisiveis.length || colunasPossiveis));

  // A faixa de palavras básicas some numa versão de prancheta, a não ser que
  // a pessoa tenha pedido para ela aparecer ali.
  const mostrarNucleo = config.mostrarNucleo && (!versaoAtiva || versaoAtiva.comNucleo);
  const nucleo = mostrarNucleo ? SIMBOLOS_NUCLEO : [];
  /** Ordem usada pela varredura e pelas setas do teclado. */
  const itensNavegaveis = useMemo(() => [...nucleo, ...simbolosVisiveis], [nucleo, simbolosVisiveis]);

  const refsBotoes = useRef<(HTMLButtonElement | null)[]>([]);
  const ultimoToque = useRef<Record<string, number>>({});
  const [indiceVarredura, setIndiceVarredura] = useState(0);

  // --- Ativação de símbolo -------------------------------------------------

  const ativarSimbolo = useCallback(
    (simbolo: Simbolo) => {
      // Zona morta: ignora toque repetido no mesmo botão em menos de 300ms.
      const agora = Date.now();
      if (agora - (ultimoToque.current[simbolo.id] ?? 0) < ZONA_MORTA_MS) return;
      ultimoToque.current[simbolo.id] = agora;

      if (simbolo.pranchaDestinoId) {
        const destino = pranchas.find((p) => p.id === simbolo.pranchaDestinoId);
        if (destino) {
          // A pasta também fala o nome da categoria ("comida", "sentimentos"):
          // ajuda a criança a associar a capa colorida à palavra.
          if (config.falarAoTocar) falarSimbolo(simbolo);
          setPilha((atual) => [...atual, destino.id]);
          setPagina(0);
          setIndiceVarredura(0);
        }
        return;
      }

      if (config.falarAoTocar) falarSimbolo(simbolo);
      adicionarNaFrase(simbolo);
    },
    [pranchas, config.falarAoTocar, falarSimbolo, adicionarNaFrase]
  );

  const voltar = useCallback(() => {
    setPilha((atual) => (atual.length > 1 ? atual.slice(0, -1) : atual));
    setPagina(0);
    setIndiceVarredura(0);
  }, []);

  const irParaInicio = useCallback(() => {
    setPilha([pranchaInicial.id]);
    setPagina(0);
    setIndiceVarredura(0);
  }, [pranchaInicial.id]);

  // --- Varredura automática (scanning) -------------------------------------

  useEffect(() => {
    if (!config.varreduraAtiva || itensNavegaveis.length === 0) return;
    const intervalo = window.setInterval(
      () => setIndiceVarredura((i) => (i + 1) % itensNavegaveis.length),
      Math.round(config.varreduraIntervalo * 1000)
    );
    return () => window.clearInterval(intervalo);
  }, [config.varreduraAtiva, config.varreduraIntervalo, itensNavegaveis.length]);

  const selecionarDaVarredura = useCallback(() => {
    const item = itensNavegaveis[indiceVarredura];
    if (item) ativarSimbolo(item);
  }, [itensNavegaveis, indiceVarredura, ativarSimbolo]);

  // --- Atalhos de teclado (usuários de acionador) --------------------------

  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      const alvo = evento.target as HTMLElement | null;
      // Não atrapalha quem está digitando em um campo.
      if (alvo && ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName)) return;

      // Alguns acionadores mandam apenas `key`, outros apenas `code`.
      if (evento.code === 'Space' || evento.key === ' ' || evento.key === 'Spacebar') {
        evento.preventDefault();
        // Com varredura ligada, ESPAÇO seleciona o símbolo destacado.
        if (config.varreduraAtiva) selecionarDaVarredura();
        else falarFrase();
        return;
      }

      if (evento.key === 'Backspace') {
        evento.preventDefault();
        apagarUltimo();
        return;
      }

      const setas: Record<string, number> = {
        ArrowRight: 1,
        ArrowLeft: -1,
        ArrowDown: colunas,
        ArrowUp: -colunas
      };
      const passo = setas[evento.key];
      if (passo === undefined) return;

      evento.preventDefault();
      const atual = refsBotoes.current.findIndex((b) => b === document.activeElement);
      const total = itensNavegaveis.length;
      if (total === 0) return;
      const proximo = atual < 0 ? 0 : (atual + passo + total) % total;
      refsBotoes.current[proximo]?.focus();
      setIndiceVarredura(proximo);
    };

    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [
    colunas,
    itensNavegaveis.length,
    config.varreduraAtiva,
    selecionarDaVarredura,
    falarFrase,
    apagarUltimo
  ]);

  // Frases favoritas ficam à mão na tela principal.
  const favoritas = perfil.historico.filter((h) => h.favorita).slice(0, 4);

  /** Quantos símbolos existem dentro de uma pasta — só o número, num
   *  selinho discreto no canto do tile (sem a palavra "palavras", para
   *  ficar mais simples de ler rápido). */
  const etiquetaDaPasta = (simbolo: Simbolo): string | undefined => {
    if (!simbolo.pranchaDestinoId) return undefined;
    const destino = pranchas.find((p) => p.id === simbolo.pranchaDestinoId);
    return destino ? String(destino.simbolos.length) : undefined;
  };

  const trilha = pilha
    .map((id) => pranchas.find((p) => p.id === id)?.nome ?? '')
    .filter(Boolean)
    .join(' › ');

  return (
    <div className="relative flex h-full min-h-full flex-col">
      <ReforcoPositivo />
      <BarraFrase />

      {/* Navegação: VOLTAR sempre visível e grande + trilha (breadcrumb) */}
      <nav className="flex items-center gap-2 px-2 pb-1 sm:gap-3 sm:px-3 lg:px-4">
        <button
          type="button"
          className="botao"
          onClick={voltar}
          disabled={pilha.length === 1}
          aria-label="Voltar para a prancha anterior"
        >
          <span aria-hidden="true">⬅️</span> VOLTAR
        </button>
        <button type="button" className="botao" onClick={irParaInicio} aria-label="Ir para o início">
          <span aria-hidden="true" className="text-2xl">
            🏠
          </span>
        </button>
        {/* Versão da prancheta (escola, almoço, aula...): troca a tela inteira.
            Fica na mesma linha do VOLTAR para não roubar altura da grade. */}
        {versoes.length > 0 && (
          <>
            <label className="sr-only" htmlFor="seletor-versao">
              Prancheta em uso
            </label>
            <select
              id="seletor-versao"
              className="campo min-h-toque min-w-0 flex-1 truncate !px-2 text-sm font-extrabold sm:text-base"
              value={versaoAtiva?.id ?? ''}
              onChange={(e) => ativarVersao(e.target.value || null)}
            >
              <option value="">🧰 Completa</option>
              {versoes.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.emoji} {v.nome}
                </option>
              ))}
            </select>
          </>
        )}
        {/* A trilha só aparece dentro de uma categoria — na tela de Início
            já dá pra ver onde se está pelo próprio ícone da casa, então o
            selo "Início" ali do lado seria só repetição. */}
        {pilha.length > 1 && (
          <p className="pilula min-w-0 truncate" aria-label="Você está em">
            {pranchaAtual.emoji} {trilha}
          </p>
        )}
      </nav>

      {/* Favoritas e rotinas são atalhos de partida — só fazem sentido na
          tela de Início, para não disputar espaço com os símbolos quando a
          pessoa já está dentro de uma categoria. */}
      {pilha.length === 1 && favoritas.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-2 pb-1 pt-1">
          <span className="pilula shrink-0 self-center">⭐ favoritas</span>
          {favoritas.map((f) => (
            <button
              key={f.id}
              type="button"
              className="botao shrink-0 normal-case"
              onClick={() => falarTextoLivre(f.textoFalado)}
            >
              {f.textoFalado}
            </button>
          ))}
        </div>
      )}

      {pilha.length === 1 && perfil.rotinas.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-2 pb-1 pt-1">
          <span className="pilula shrink-0 self-center">🔁 rotinas</span>
          {perfil.rotinas.map((r) => (
            <button
              key={r.id}
              type="button"
              className="botao shrink-0 normal-case"
              onClick={() => usarRotina(r.id)}
            >
              <span aria-hidden="true">{r.emoji}</span> {r.nome}
            </button>
          ))}
        </div>
      )}

      {/* Sugestões: aparecem depois de "quero"/"não quero", com base no que
          a pessoa mais usa (ou na categoria Comida, sem uso suficiente ainda). */}
      {sugestoes.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto px-2 pb-1 pt-1">
          <span className="pilula shrink-0">💡 sugestões</span>
          {sugestoes.map((simbolo) => (
            <div key={simbolo.id} className="h-[80px] w-[76px] shrink-0">
              <BotaoSimbolo
                simbolo={simbolo}
                imagemUrl={simbolo.imagemId ? imagens[simbolo.imagemId] : undefined}
                onAtivar={ativarSimbolo}
                compacto
              />
            </div>
          ))}
        </div>
      )}

      {/* Grade de símbolos. `main` sempre rola por conta própria (nunca a
          página toda) — assim o cabeçalho e o rodapé do núcleo continuam
          sempre fixos e visíveis. Nas categorias com paginação, a grade
          normalmente já cabe inteira (linhas com teto de 22vh); na tela de
          Início, com todas as 14+ categorias juntas, é o próprio `main`
          que rola para mostrar o resto. */}
      <main
        ref={refMain}
        className="relative flex min-h-0 flex-1 flex-col overflow-y-auto p-2 sm:p-3 lg:p-4"
      >
        {config.varreduraAtiva && (
          // Durante a varredura, um toque em qualquer lugar da área de
          // símbolos seleciona o item que está destacado.
          <button
            type="button"
            className="absolute inset-0 z-20 h-full w-full cursor-pointer bg-transparent"
            onClick={selecionarDaVarredura}
            aria-label="Selecionar o símbolo destacado"
          />
        )}

        {pranchaAtual.simbolos.length === 0 ? (
          <p className="p-6 text-center text-lg font-semibold opacity-80">
            Esta prancha ainda não tem símbolos. Abra a aba <strong>Editar</strong> para
            adicionar.
          </p>
        ) : (
          <div
            // A chave muda ao trocar de prancha ou de página: os tiles
            // remontam e a animação de entrada acontece de novo.
            key={`${pranchaAtual.id}-${paginaSegura}`}
            className={`grid gap-2 sm:gap-3 lg:gap-4 ${
              semPaginacao ? 'shrink-0' : 'min-h-0 flex-1 content-center'
            }`}
            style={{
              gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))`,
              // Categorias (Início): cada linha tem uma altura confortável e
              // fixa — a grade cresce pelo conteúdo, a página é que rola.
              // Palavras dentro de uma categoria: as linhas dividem a altura
              // disponível, com teto de 22vh (senão, em telas altas e
              // estreitas, os símbolos viravam retângulos compridos).
              gridTemplateRows: semPaginacao
                ? `repeat(${Math.max(1, Math.ceil(simbolosVisiveis.length / colunas))}, minmax(calc(100px + var(--bloco-extra, 0px)), auto))`
                : `repeat(${Math.max(
                    1,
                    Math.ceil(simbolosVisiveis.length / colunas)
                  )}, minmax(calc(92px + var(--bloco-extra, 0px)), 22vh))`
            }}
          >
            {simbolosVisiveis.map((simbolo, i) => {
              const indiceGlobal = nucleo.length + i;
              return (
                <BotaoSimbolo
                  key={simbolo.id}
                  ref={(el) => {
                    refsBotoes.current[indiceGlobal] = el;
                  }}
                  simbolo={simbolo}
                  imagemUrl={simbolo.imagemId ? imagens[simbolo.imagemId] : undefined}
                  onAtivar={ativarSimbolo}
                  destacado={config.varreduraAtiva && indiceVarredura === indiceGlobal}
                  etiqueta={etiquetaDaPasta(simbolo)}
                  indiceEntrada={i}
                  quadrado={semPaginacao}
                />
              );
            })}
          </div>
        )}

        {totalPaginas > 1 && (
          <div className="mt-3 flex items-center justify-center gap-3">
            <button
              type="button"
              className="botao"
              onClick={() => setPagina((p) => Math.max(0, p - 1))}
              disabled={paginaSegura === 0}
            >
              ⬅️ ANTERIORES
            </button>
            <span className="font-bold">
              {paginaSegura + 1}/{totalPaginas}
            </span>
            <button
              type="button"
              className="botao"
              onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
              disabled={paginaSegura === totalPaginas - 1}
            >
              MAIS ➡️
            </button>
          </div>
        )}
      </main>

      {/* Faixa fixa de vocabulário nuclear — quebra em linhas (sem rolagem
          lateral), para todas as 15 palavras ficarem visíveis de uma vez. */}
      {mostrarNucleo && (
        <footer className="sticky bottom-0 z-30 px-2 pb-2 sm:px-3 lg:px-4" aria-label="Vocabulário nuclear">
          <div
            className="cartao grid gap-1.5 p-2 sm:gap-2"
            style={{
              // Colunas de ~64px (alvo de toque) e linhas de 84px:
              // dá folga para ícone + palavra em até duas linhas ("NÃO QUERO").
              gridTemplateColumns: 'repeat(auto-fill, minmax(58px, 1fr))',
              gridAutoRows: 'minmax(calc(84px + var(--bloco-extra, 0px)), auto)'
            }}
          >
            {SIMBOLOS_NUCLEO.map((simbolo, i) => (
              <div key={simbolo.id} className="min-h-0">
                <BotaoSimbolo
                  ref={(el) => {
                    refsBotoes.current[i] = el;
                  }}
                  simbolo={simbolo}
                  onAtivar={ativarSimbolo}
                  destacado={config.varreduraAtiva && indiceVarredura === i}
                  compacto
                />
              </div>
            ))}
          </div>
        </footer>
      )}

      {/* Aviso discreto de quantas palavras já foram escolhidas (leitores de tela) */}
      <p className="sr-only" aria-live="polite">
        {frase.length} palavras na frase.
      </p>
    </div>
  );
}
