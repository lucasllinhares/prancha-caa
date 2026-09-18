import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../estado/AppContext';
import { BarraFrase } from '../componentes/BarraFrase';
import { BotaoSimbolo } from '../componentes/BotaoSimbolo';
import { ReforcoPositivo } from '../componentes/ReforcoPositivo';
import { classesDaCor } from '../dados/coresFitzgerald';
import { useLayoutGrade } from '../ganchos/useLayoutGrade';
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
    pranchas,
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
    perfil
  } = useApp();

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

  const totalPaginas = Math.max(1, Math.ceil(pranchaAtual.simbolos.length / porPagina));
  const paginaSegura = Math.min(pagina, totalPaginas - 1);
  const simbolosVisiveis = useMemo(
    () => pranchaAtual.simbolos.slice(paginaSegura * porPagina, (paginaSegura + 1) * porPagina),
    [pranchaAtual, paginaSegura, porPagina]
  );

  // Quando a página tem menos símbolos do que colunas cabem na tela (ex.:
  // últimos 2 itens de uma categoria), usamos só as colunas necessárias —
  // assim a fileira final não fica esticada, com os tiles enormes e vazios
  // do lado. É esse valor (não o da tela) que manda na grade e nas setas.
  const colunas = Math.max(1, Math.min(colunasTela, simbolosVisiveis.length || colunasTela));

  const nucleo = config.mostrarNucleo ? SIMBOLOS_NUCLEO : [];
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

  /** Mostra quantas palavras existem dentro de uma pasta, como nas capas de
   *  categoria das referências visuais (etiqueta pequena no canto do tile). */
  const etiquetaDaPasta = (simbolo: Simbolo): string | undefined => {
    if (!simbolo.pranchaDestinoId) return undefined;
    const destino = pranchas.find((p) => p.id === simbolo.pranchaDestinoId);
    return destino ? `${destino.simbolos.length} palavras` : undefined;
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
        <p className="pilula min-w-0 truncate" aria-label="Você está em">
          {pranchaAtual.emoji} {trilha}
        </p>
      </nav>

      {favoritas.length > 0 && (
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

      {perfil.rotinas.length > 0 && (
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
            <button
              key={simbolo.id}
              type="button"
              className={`botao-simbolo tile-medido flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-0 rounded-2xl border-2 p-1 text-center ${classesDaCor(
                simbolo.cor
              )}`}
              onClick={() => ativarSimbolo(simbolo)}
            >
              <span aria-hidden="true" className="text-xl leading-none">
                {simbolo.emoji || '🔤'}
              </span>
              <span className="texto-simbolo w-full truncate font-black uppercase">
                {simbolo.texto}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Grade de símbolos */}
      <main className="relative flex min-h-0 flex-1 flex-col p-2 sm:p-3 lg:p-4">
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
            className="grid min-h-0 flex-1 content-center gap-2 sm:gap-3 lg:gap-4"
            style={{
              // As colunas vêm do tamanho da tela e as linhas dividem a
              // altura disponível, sempre respeitando o alvo mínimo de 64px
              // e um teto de 30% da altura da tela — sem o teto, em telas
              // bem altas e estreitas (tablet em pé) sobra tanta altura que
              // os símbolos viravam retângulos compridos e deformados.
              gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${Math.max(
                1,
                Math.ceil(simbolosVisiveis.length / colunas)
              )}, minmax(64px, 22vh))`
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

      {/* Faixa fixa de vocabulário nuclear */}
      {config.mostrarNucleo && (
        <footer className="sticky bottom-0 z-30 px-2 pb-2 sm:px-3 lg:px-4" aria-label="Vocabulário nuclear">
          <div className="cartao flex gap-2 overflow-x-auto p-2">
            {SIMBOLOS_NUCLEO.map((simbolo, i) => (
              <div key={simbolo.id} className="h-[80px] w-[80px] shrink-0">
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
