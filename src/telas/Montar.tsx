import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../estado/AppContext';
import { BotaoSimbolo } from '../componentes/BotaoSimbolo';
import { CARTOES_ILUSTRADOS } from '../dados/cartoesIlustrados';
import { copiarDoBanco, gruposDoBanco } from '../dados/modelos';
import type { Simbolo, VersaoPrancheta } from '../tipos';

const EMOJIS_MOMENTO = ['🏫', '🍽️', '📚', '🧸', '🚌', '🩺', '🏠', '🎨', '⭐'];

/** Toque longo (ms) que "pega" um item no celular, antes de começar a arrastar. */
const TOQUE_LONGO_MS = 260;
/** Quanto o mouse precisa andar (px) para valer como arrasto e não como clique. */
const DISTANCIA_ARRASTO = 6;
/** Faixa (px) no topo/rodapé da lista de itens que rola sozinha durante o arrasto. */
const ZONA_ROLAGEM = 48;

interface Grupo {
  id: string;
  nome: string;
  emoji: string;
  simbolos: Simbolo[];
}

type Origem = 'banco' | 'bandeja';

/** O que está sendo arrastado agora (só o que muda a tela; a posição é imperativa). */
interface Arrasto {
  itens: Simbolo[];
  origem: Origem;
  x: number;
  y: number;
  /** Posição da prancheta onde o item entraria; null = fora da prancheta. */
  alvo: number | null;
  sobreBanco: boolean;
}

/** Gesto em andamento, antes e durante o arrasto. */
interface Sessao {
  origem: Origem;
  itens: Simbolo[];
  indiceOrigem: number;
  chave: string;
  x0: number;
  y0: number;
  tipo: string;
  ativo: boolean;
  timer?: number;
}

/**
 * Montar prancheta: todos os itens ficam numa lista (embaixo) e a pessoa vai
 * arrastando e soltando na prancheta (em cima), que vira uma tela só com o que
 * ela escolheu — para a escola, o almoço, a aula... Serve para a professora
 * montar a prancheta da criança com as palavras que ela provavelmente vai usar.
 *
 * O arrasto usa eventos de ponteiro, então funciona com mouse e com o dedo
 * (no celular: segurar um instante e arrastar; rolar a lista continua normal).
 * Tocar num item só o marca; dá para marcar vários e arrastar todos de uma vez.
 */
export function Montar({ onIrParaFalar }: { onIrParaFalar: () => void }) {
  const { pranchas, imagens, perfil, versoes, salvarVersao, excluirVersao, ativarVersao } = useApp();

  // --- Itens disponíveis ---------------------------------------------------

  const grupos = useMemo<Grupo[]>(() => {
    const lista: Grupo[] = [
      { id: 'cartoes', nome: 'Cartões ilustrados', emoji: '🖼️', simbolos: CARTOES_ILUSTRADOS }
    ];
    const nomesUsados = new Set<string>();
    for (const pr of pranchas) {
      const palavras = pr.simbolos.filter((s) => !s.pranchaDestinoId);
      if (palavras.length === 0) continue;
      lista.push({
        id: pr.id,
        nome: pr.inicial ? 'Início' : pr.nome,
        emoji: pr.emoji ?? '📁',
        simbolos: palavras
      });
      nomesUsados.add(pr.nome.trim().toLowerCase());
    }
    // Categorias de fábrica que este aluno não tem (ou já apagou) continuam à mão.
    for (const g of gruposDoBanco()) {
      if (!nomesUsados.has(g.nome.trim().toLowerCase())) {
        lista.push({ id: g.id, nome: g.nome, emoji: g.emoji, simbolos: g.simbolos });
      }
    }
    return lista;
  }, [pranchas]);

  const [busca, setBusca] = useState('');
  const termo = busca.trim().toLowerCase();
  const gruposVisiveis = useMemo(
    () =>
      grupos
        .map((g) => ({
          ...g,
          simbolos: termo ? g.simbolos.filter((s) => s.texto.toLowerCase().includes(termo)) : g.simbolos
        }))
        .filter((g) => g.simbolos.length > 0),
    [grupos, termo]
  );

  // --- A prancheta em montagem ---------------------------------------------

  const [bandeja, setBandeja] = useState<Simbolo[]>([]);
  const [nome, setNome] = useState('');
  const [emoji, setEmoji] = useState('🏫');
  const [comNucleo, setComNucleo] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [selecionados, setSelecionados] = useState<Record<string, Simbolo>>({});
  const [aviso, setAviso] = useState<{ texto: string; usar?: boolean } | null>(null);
  const [arrasto, setArrasto] = useState<Arrasto | null>(null);

  const refBandeja = useRef<HTMLDivElement>(null);
  const refBanco = useRef<HTMLDivElement>(null);
  const refFantasma = useRef<HTMLDivElement>(null);
  const sessao = useRef<Sessao | null>(null);
  const ponteiro = useRef({ x: 0, y: 0 });
  const ultimoAlvo = useRef<{ alvo: number | null; sobreBanco: boolean }>({ alvo: null, sobreBanco: false });
  const limpaGestoRef = useRef<() => void>(() => undefined);

  // Espelhos do estado para os ouvintes globais (que vivem além de um render).
  const bandejaRef = useRef(bandeja);
  bandejaRef.current = bandeja;
  const selecionadosRef = useRef(selecionados);
  selecionadosRef.current = selecionados;

  const avisar = useCallback((texto: string, usar?: boolean) => {
    setAviso({ texto, usar });
  }, []);

  useEffect(() => {
    if (!aviso || aviso.usar) return;
    const t = window.setTimeout(() => setAviso(null), 4500);
    return () => window.clearTimeout(t);
  }, [aviso]);

  const inserir = useCallback(
    (itens: Simbolo[], indice: number) => {
      const atual = bandejaRef.current;
      const jaTem = new Set(atual.map((s) => s.texto.trim().toLowerCase()));
      const novos: Simbolo[] = [];
      for (const item of itens) {
        const chave = item.texto.trim().toLowerCase();
        if (jaTem.has(chave)) continue;
        jaTem.add(chave);
        novos.push(copiarDoBanco(item));
      }
      const repetidos = itens.length - novos.length;
      if (novos.length === 0) {
        avisar(itens.length === 1 ? 'Esse item já está na prancheta.' : 'Esses itens já estão na prancheta.');
        return;
      }
      const posicao = Math.max(0, Math.min(indice, atual.length));
      setBandeja([...atual.slice(0, posicao), ...novos, ...atual.slice(posicao)]);
      if (repetidos > 0) avisar(`${novos.length} adicionado(s); ${repetidos} já estava(m) na prancheta.`);
    },
    [avisar]
  );

  const mover = useCallback((de: number, para: number) => {
    const lista = [...bandejaRef.current];
    if (de < 0 || de >= lista.length) return;
    const [item] = lista.splice(de, 1);
    // Ao soltar depois da posição de origem, a lista já encolheu uma casa.
    const destino = Math.max(0, Math.min(para > de ? para - 1 : para, lista.length));
    lista.splice(destino, 0, item);
    setBandeja(lista);
  }, []);

  const remover = useCallback((indice: number) => {
    setBandeja((atual) => atual.filter((_, i) => i !== indice));
  }, []);

  // --- Arrastar e soltar -----------------------------------------------------

  /** Onde o ponteiro está em relação à prancheta e à lista de itens. */
  const localizar = useCallback((x: number, y: number) => {
    let alvo: number | null = null;
    let sobreBanco = false;
    const rb = refBandeja.current?.getBoundingClientRect();
    if (refBandeja.current && rb && x >= rb.left && x <= rb.right && y >= rb.top && y <= rb.bottom) {
      const blocos = Array.from(refBandeja.current.querySelectorAll<HTMLElement>('[data-pos]'));
      if (blocos.length === 0) {
        alvo = 0;
      } else {
        // O bloco mais próximo do ponteiro manda; antes ou depois dele
        // conforme o lado do centro em que o ponteiro está.
        let melhor = { i: 0, d: Infinity, cx: 0 };
        for (const b of blocos) {
          const r = b.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const d = (x - cx) ** 2 + (y - cy) ** 2;
          if (d < melhor.d) melhor = { i: Number(b.dataset.pos), d, cx };
        }
        alvo = x < melhor.cx ? melhor.i : melhor.i + 1;
      }
    } else {
      const rl = refBanco.current?.getBoundingClientRect();
      sobreBanco = Boolean(rl && x >= rl.left && x <= rl.right && y >= rl.top && y <= rl.bottom);
    }
    return { alvo, sobreBanco };
  }, []);

  const encerrarGesto = useCallback(() => {
    limpaGestoRef.current();
    limpaGestoRef.current = () => undefined;
    const s = sessao.current;
    if (s?.timer) window.clearTimeout(s.timer);
    sessao.current = null;
    setArrasto(null);
  }, []);

  const iniciarGesto = useCallback(
    (evento: React.PointerEvent, origem: Origem, item: Simbolo, indiceOrigem: number, chave: string) => {
      if (evento.pointerType === 'mouse' && evento.button !== 0) return;
      encerrarGesto();

      // Item marcado + arrastar = leva todos os marcados; item solto = só ele.
      const marcados = Object.values(selecionadosRef.current);
      const itens =
        origem === 'banco' && selecionadosRef.current[chave] && marcados.length > 0 ? marcados : [item];

      const s: Sessao = {
        origem,
        itens,
        indiceOrigem,
        chave,
        x0: evento.clientX,
        y0: evento.clientY,
        tipo: evento.pointerType,
        ativo: false
      };
      sessao.current = s;
      ponteiro.current = { x: evento.clientX, y: evento.clientY };

      const comecar = () => {
        if (sessao.current !== s || s.ativo) return;
        s.ativo = true;
        if (navigator.vibrate) navigator.vibrate(15);
        const { alvo, sobreBanco } = localizar(ponteiro.current.x, ponteiro.current.y);
        ultimoAlvo.current = { alvo, sobreBanco };
        setArrasto({ itens: s.itens, origem: s.origem, x: ponteiro.current.x, y: ponteiro.current.y, alvo, sobreBanco });
      };

      if (evento.pointerType !== 'mouse') s.timer = window.setTimeout(comecar, TOQUE_LONGO_MS);

      const aoMover = (e: PointerEvent) => {
        if (sessao.current !== s) return;
        ponteiro.current = { x: e.clientX, y: e.clientY };
        if (!s.ativo) {
          const andou = Math.hypot(e.clientX - s.x0, e.clientY - s.y0);
          if (s.tipo === 'mouse') {
            if (andou > DISTANCIA_ARRASTO) comecar();
          } else if (andou > 12) {
            // Andou antes do toque longo: é o dedo rolando a lista, não arrasto.
            encerrarGesto();
          }
          return;
        }
        const g = refFantasma.current;
        if (g) {
          g.style.left = `${e.clientX}px`;
          g.style.top = `${e.clientY}px`;
        }
        const nova = localizar(e.clientX, e.clientY);
        const antiga = ultimoAlvo.current;
        if (nova.alvo !== antiga.alvo || nova.sobreBanco !== antiga.sobreBanco) {
          ultimoAlvo.current = nova;
          setArrasto((a) => (a ? { ...a, ...nova } : a));
        }
      };

      const aoSoltar = () => {
        if (sessao.current !== s) return;
        if (s.ativo) {
          const { alvo, sobreBanco } = ultimoAlvo.current;
          if (s.origem === 'banco') {
            if (alvo !== null) {
              inserir(s.itens, alvo);
              setSelecionados({});
            }
          } else if (alvo !== null) {
            mover(s.indiceOrigem, alvo);
          } else if (sobreBanco) {
            remover(s.indiceOrigem);
          }
        } else if (s.origem === 'banco') {
          // Toque simples: marca ou desmarca o item.
          setSelecionados((atual) => {
            const copia = { ...atual };
            if (copia[chave]) delete copia[chave];
            else copia[chave] = item;
            return copia;
          });
        }
        encerrarGesto();
      };

      const aoCancelar = () => encerrarGesto();

      // Enquanto arrasta com o dedo, a tela não pode rolar junto.
      const aoTocarMover = (e: TouchEvent) => {
        if (sessao.current?.ativo && e.cancelable) e.preventDefault();
      };

      // Rolagem automática da lista quando o item chega perto da borda.
      const rolagem = window.setInterval(() => {
        if (!s.ativo) return;
        const lista = refBanco.current;
        if (!lista) return;
        const r = lista.getBoundingClientRect();
        const { x, y } = ponteiro.current;
        if (x < r.left || x > r.right) return;
        if (y >= r.top && y < r.top + ZONA_ROLAGEM) lista.scrollTop -= 12;
        else if (y <= r.bottom && y > r.bottom - ZONA_ROLAGEM) lista.scrollTop += 12;
      }, 16);

      window.addEventListener('pointermove', aoMover);
      window.addEventListener('pointerup', aoSoltar);
      window.addEventListener('pointercancel', aoCancelar);
      window.addEventListener('touchmove', aoTocarMover, { passive: false });
      limpaGestoRef.current = () => {
        window.removeEventListener('pointermove', aoMover);
        window.removeEventListener('pointerup', aoSoltar);
        window.removeEventListener('pointercancel', aoCancelar);
        window.removeEventListener('touchmove', aoTocarMover);
        window.clearInterval(rolagem);
      };
    },
    [encerrarGesto, inserir, localizar, mover, remover]
  );

  useEffect(() => () => encerrarGesto(), [encerrarGesto]);

  // --- Ações de botões -------------------------------------------------------

  const marcarOuDesmarcar = (chave: string, item: Simbolo) => {
    setSelecionados((atual) => {
      const copia = { ...atual };
      if (copia[chave]) delete copia[chave];
      else copia[chave] = item;
      return copia;
    });
  };

  const totalMarcados = Object.keys(selecionados).length;

  const adicionarMarcados = () => {
    inserir(Object.values(selecionados), bandeja.length);
    setSelecionados({});
  };

  const marcarGrupo = (g: Grupo) => {
    setSelecionados((atual) => {
      const copia = { ...atual };
      const todos = g.simbolos.every((s) => copia[`${g.id}:${s.id}`]);
      for (const s of g.simbolos) {
        if (todos) delete copia[`${g.id}:${s.id}`];
        else copia[`${g.id}:${s.id}`] = s;
      }
      return copia;
    });
  };

  const comecarComCartoes = () => {
    setBandeja(CARTOES_ILUSTRADOS.map(copiarDoBanco));
    if (!nome.trim()) setNome('Cartões ilustrados');
    setEmoji('⭐');
  };

  const zerar = () => {
    setBandeja([]);
    setNome('');
    setEmoji('🏫');
    setComNucleo(false);
    setEditandoId(null);
    setSelecionados({});
  };

  const salvar = () => {
    const titulo = nome.trim();
    if (!titulo) {
      avisar('Dê um nome à prancheta (por exemplo: Escola, Almoço, Aula).');
      return;
    }
    if (bandeja.length === 0) {
      avisar('Arraste pelo menos um item para a prancheta.');
      return;
    }
    salvarVersao({ id: editandoId ?? undefined, nome: titulo, emoji, simbolos: bandeja, comNucleo });
    zerar();
    avisar(`Prancheta “${titulo}” salva e já em uso.`, true);
  };

  const editar = (v: VersaoPrancheta) => {
    setBandeja(v.simbolos);
    setNome(v.nome);
    setEmoji(v.emoji);
    setComNucleo(v.comNucleo);
    setEditandoId(v.id);
    setSelecionados({});
    setAviso(null);
  };

  const usar = (id: string) => {
    ativarVersao(id);
    onIrParaFalar();
  };

  const urlDaImagem = (s: Simbolo) => (s.imagemId ? imagens[s.imagemId] : undefined);

  /** Um bloco pequeno (não clicável): a imagem do item, sem ações próprias. */
  const miniatura = (s: Simbolo) => (
    <div className="pointer-events-none h-full w-full" aria-hidden="true">
      <BotaoSimbolo simbolo={s} imagemUrl={urlDaImagem(s)} onAtivar={() => undefined} compacto semFoco />
    </div>
  );

  const versoesDoAluno = versoes;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* --- Parte de cima: a prancheta em montagem ---------------------------- */}
      <section
        className="flex shrink-0 flex-col gap-2 border-b-2 p-2 sm:p-3"
        style={{ borderColor: 'var(--borda)' }}
        aria-label="Prancheta em montagem"
      >
        <div className="flex items-center justify-between gap-2">
          <h1 className="titulo-tela !text-xl">
            <span aria-hidden="true">🧩</span> {editandoId ? 'Editando prancheta' : 'Montar prancheta'}
          </h1>
          <span className="pilula">{bandeja.length} itens</span>
        </div>

        <div className="flex gap-2">
          <label className="sr-only" htmlFor="nome-prancheta">
            Nome da prancheta
          </label>
          <input
            id="nome-prancheta"
            className="campo min-w-0 flex-1"
            value={nome}
            placeholder="Nome (ex.: Escola, Almoço, Aula)"
            onChange={(e) => setNome(e.target.value)}
          />
          <button
            type="button"
            className="botao shrink-0 !px-0 text-2xl"
            style={{ width: 56 }}
            aria-label={`Ícone da prancheta: ${emoji}. Toque para trocar.`}
            title="Trocar o ícone"
            onClick={() =>
              setEmoji(EMOJIS_MOMENTO[(EMOJIS_MOMENTO.indexOf(emoji) + 1) % EMOJIS_MOMENTO.length])
            }
          >
            {emoji}
          </button>
        </div>

        {/* A prancheta: solte os itens aqui. */}
        <div
          ref={refBandeja}
          data-testid="bandeja"
          role="list"
          aria-label="Itens da prancheta"
          className="max-h-[28vh] min-h-[96px] overflow-y-auto rounded-2xl p-2"
          style={{
            background: 'var(--cartao-2)',
            border:
              arrasto && arrasto.alvo !== null
                ? '3px dashed var(--primaria)'
                : '3px dashed var(--borda)'
          }}
        >
          {bandeja.length === 0 ? (
            <div className="flex min-h-[72px] flex-col items-center justify-center gap-1 text-center">
              <p className="text-sm font-bold" style={{ color: 'var(--texto-suave)' }}>
                Arraste os itens daqui de baixo e solte aqui
              </p>
              <button type="button" className="botao !min-h-[40px] text-xs" onClick={comecarComCartoes}>
                🖼️ COMEÇAR COM OS 9 CARTÕES
              </button>
            </div>
          ) : (
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))' }}>
              {bandeja.map((s, i) => {
                const antes = arrasto?.alvo === i;
                const depoisDoUltimo = arrasto?.alvo === bandeja.length && i === bandeja.length - 1;
                const sendoArrastado = arrasto?.origem === 'bandeja' && arrasto.itens[0]?.id === s.id;
                return (
                  <div
                    key={s.id}
                    role="listitem"
                    tabIndex={0}
                    data-pos={i}
                    aria-label={`${s.texto}. Setas para os lados mudam a posição.`}
                    onPointerDown={(e) => iniciarGesto(e, 'bandeja', s, i, `bandeja:${s.id}`)}
                    onContextMenu={(e) => e.preventDefault()}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        mover(i, i - 1);
                      } else if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        mover(i, i + 2);
                      } else if (e.key === 'Delete' || e.key === 'Backspace') {
                        e.preventDefault();
                        remover(i);
                      }
                    }}
                    className={[
                      'arrastavel relative h-[88px]',
                      antes ? 'ponto-de-entrada' : '',
                      depoisDoUltimo ? 'ponto-de-entrada-fim' : '',
                      sendoArrastado ? 'opacity-40' : ''
                    ].join(' ')}
                  >
                    {miniatura(s)}
                    <button
                      type="button"
                      aria-label={`Tirar ${s.texto} da prancheta`}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => remover(i)}
                      className="absolute -right-1 -top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-sm font-black"
                      style={{ background: 'var(--cartao)', borderColor: 'var(--linha, var(--borda))' }}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex min-h-[36px] flex-1 basis-full items-center gap-2 text-xs font-bold sm:basis-40">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={comNucleo}
              onChange={(e) => setComNucleo(e.target.checked)}
            />
            Mostrar também as palavras básicas fixas
          </label>
          {(bandeja.length > 0 || editandoId) && (
            <button type="button" className="botao" onClick={zerar}>
              {editandoId ? 'CANCELAR' : 'LIMPAR'}
            </button>
          )}
          <button type="button" className="botao botao-primario flex-1" onClick={salvar}>
            ✅ {editandoId ? 'SALVAR ALTERAÇÕES' : 'SALVAR PRANCHETA'}
          </button>
        </div>

        {aviso && (
          <p
            role="status"
            className="cartao flex flex-wrap items-center justify-between gap-2 font-extrabold"
            style={{ borderColor: 'var(--primaria)' }}
          >
            <span>{aviso.texto}</span>
            {aviso.usar && (
              <button type="button" className="botao botao-primario" onClick={onIrParaFalar}>
                ▶ USAR AGORA
              </button>
            )}
          </p>
        )}
      </section>

      {/* --- Parte de baixo: todos os itens ------------------------------------- */}
      <div
        ref={refBanco}
        data-testid="banco"
        className="relative min-h-0 flex-1 overflow-y-auto p-2 sm:p-3"
        aria-label="Todos os itens"
      >
        {arrasto?.origem === 'bandeja' && (
          <div
            className="pointer-events-none sticky top-0 z-20 mb-2 rounded-2xl p-2 text-center text-sm font-extrabold"
            style={{
              background: arrasto.sobreBanco ? 'var(--vermelho, #e5484d)' : 'var(--cartao)',
              color: arrasto.sobreBanco ? '#fff' : 'var(--texto)',
              border: '3px dashed var(--borda)'
            }}
          >
            🗑️ Solte aqui para tirar da prancheta
          </div>
        )}

        {versoesDoAluno.length > 0 && (
          <details className="cartao mb-3">
            <summary className="flex min-h-toque cursor-pointer items-center gap-2 font-extrabold">
              <span aria-hidden="true">📋</span>
              <span className="flex-1">
                Pranchetas de {perfil.nome} ({versoesDoAluno.length})
              </span>
            </summary>
            <ul className="mt-2 flex flex-col gap-2">
              {versoesDoAluno.map((v) => (
                <li
                  key={v.id}
                  className="flex flex-wrap items-center gap-2 rounded-2xl p-2"
                  style={{ background: 'var(--cartao-2)', border: '2px solid var(--borda)' }}
                >
                  <span aria-hidden="true" className="text-2xl">
                    {v.emoji}
                  </span>
                  <span className="min-w-0 flex-1 font-extrabold">
                    {v.nome}
                    <span className="block text-xs font-bold opacity-70">
                      {v.simbolos.length} itens{perfil.versaoAtivaId === v.id ? ' · em uso' : ''}
                    </span>
                  </span>
                  <button type="button" className="botao" onClick={() => usar(v.id)}>
                    ▶ USAR
                  </button>
                  <button type="button" className="botao" onClick={() => editar(v)}>
                    ✏️ EDITAR
                  </button>
                  <button
                    type="button"
                    className="botao"
                    aria-label={`Excluir a prancheta ${v.nome}`}
                    onClick={() => {
                      if (window.confirm(`Excluir a prancheta “${v.nome}”? As palavras do aluno não são apagadas.`)) {
                        excluirVersao(v.id);
                        if (editandoId === v.id) zerar();
                      }
                    }}
                  >
                    🗑️
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}

        <div
          className="sticky top-0 z-10 -mx-1 mb-2 flex flex-col gap-2 px-1 pb-2"
          style={{ background: 'var(--fundo)' }}
        >
          <label className="sr-only" htmlFor="busca-itens">
            Procurar item
          </label>
          <input
            id="busca-itens"
            className="campo !min-h-[44px] !py-1"
            value={busca}
            placeholder="🔎 Procurar item (ex.: suco)"
            onChange={(e) => setBusca(e.target.value)}
          />
          <p className="text-xs font-bold" style={{ color: 'var(--texto-suave)' }}>
            Arraste para a prancheta (no celular, segure e arraste). Toque para marcar vários e
            arraste todos juntos.
          </p>
          {totalMarcados > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="pilula">{totalMarcados} marcados</span>
              <button type="button" className="botao botao-primario" onClick={adicionarMarcados}>
                ➕ ADICIONAR À PRANCHETA
              </button>
              <button type="button" className="botao" onClick={() => setSelecionados({})}>
                DESMARCAR
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {gruposVisiveis.map((g, gi) => (
            <details
              key={g.id}
              open={Boolean(termo) || gi === 0}
              className="rounded-2xl border-2 p-2"
              style={{ borderColor: 'var(--borda)' }}
            >
              <summary className="flex min-h-toque cursor-pointer items-center gap-2 font-extrabold">
                <span aria-hidden="true" className="text-2xl">
                  {g.emoji}
                </span>
                <span className="flex-1">{g.nome}</span>
                <span className="pilula">{g.simbolos.length}</span>
              </summary>
              <button type="button" className="botao my-2 !min-h-[40px] text-xs" onClick={() => marcarGrupo(g)}>
                ☑️ MARCAR / DESMARCAR TODOS
              </button>
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))' }}
              >
                {g.simbolos.map((s) => {
                  const chave = `${g.id}:${s.id}`;
                  const marcado = Boolean(selecionados[chave]);
                  return (
                    <div
                      key={chave}
                      role="button"
                      tabIndex={0}
                      aria-pressed={marcado}
                      aria-label={`${s.texto}${marcado ? ', marcado' : ''}`}
                      onPointerDown={(e) => iniciarGesto(e, 'banco', s, -1, chave)}
                      onContextMenu={(e) => e.preventDefault()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          marcarOuDesmarcar(chave, s);
                        }
                      }}
                      className={`arrastavel relative h-[88px] rounded-2xl ${
                        marcado ? 'ring-4 ring-violet-600' : ''
                      }`}
                    >
                      {miniatura(s)}
                      {marcado && (
                        <span
                          aria-hidden="true"
                          className="absolute -right-1 -top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-xs font-black text-white"
                        >
                          ✔
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </details>
          ))}
          {gruposVisiveis.length === 0 && (
            <p className="p-4 text-center font-bold">Nenhum item encontrado para “{busca}”.</p>
          )}
        </div>
      </div>

      {/* Item "na mão" durante o arrasto */}
      {arrasto && (
        <div
          ref={refFantasma}
          aria-hidden="true"
          className="pointer-events-none fixed z-[100]"
          style={{
            left: arrasto.x,
            top: arrasto.y,
            width: 84,
            height: 92,
            transform: 'translate(-50%, -60%) rotate(-4deg)',
            filter: 'drop-shadow(0 10px 12px rgba(0,0,0,0.35))'
          }}
        >
          {arrasto.itens.slice(0, 3).map((s, i) => (
            <div
              key={s.id}
              className="absolute inset-0"
              style={{ transform: `translate(${i * 6}px, ${i * 6}px)`, zIndex: 3 - i }}
            >
              {miniatura(s)}
            </div>
          ))}
          {arrasto.itens.length > 1 && (
            <span className="absolute -right-3 -top-3 z-10 flex h-7 min-w-7 items-center justify-center rounded-full bg-violet-600 px-1 text-sm font-black text-white">
              {arrasto.itens.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
