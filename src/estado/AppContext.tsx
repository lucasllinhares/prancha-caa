import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import type {
  ArquivoPacote,
  ArquivoPranchaExportada,
  Configuracoes,
  CorFitzgerald,
  EstadoPersistido,
  FraseHistorico,
  ModeloUsuario,
  Perfil,
  Prancha,
  Rotina,
  Simbolo
} from '../tipos';
import {
  VERSAO_DADOS,
  carregarEstado,
  criarPerfil,
  excluirModeloArmazenado,
  lerModelo,
  lerTodasImagens,
  lerTodosAudios,
  salvarAudio,
  salvarEstado,
  salvarImagem,
  salvarModelo
} from '../armazenamento/db';
import {
  MODELOS_PRONTOS,
  copiarDoBanco,
  montarCategorias,
  montarPranchasDoModelo,
  type CategoriaMontada
} from '../dados/modelos';
import { montarFrase, textoDoSimbolo } from '../fala/frase';
import { falar as falarTexto, pararFala } from '../fala/sintetizador';
import { tocarAudioGravado } from '../fala/gravador';
import { novoId } from '../utilidades/id';

/** Dados de uma categoria (pasta) para criar ou editar. */
export interface DadosCategoria {
  nome: string;
  emoji: string;
  cor: CorFitzgerald;
}

/** Baixa um objeto como arquivo .json. */
function baixarArquivo(nomeArquivo: string, conteudo: unknown) {
  const blob = new Blob([JSON.stringify(conteudo, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

const nomeSeguro = (nome: string) => nome.toLowerCase().replace(/[^a-z0-9]+/gi, '-');

/**
 * Transforma as pranchas de um modelo do usuário em categorias novas (ids
 * novos em tudo), prontas para serem somadas a outro perfil.
 */
function categoriasDoPacote(pranchas: Prancha[]): CategoriaMontada[] {
  const inicial = pranchas.find((p) => p.inicial);
  const categorias = pranchas.filter((p) => !p.inicial);
  const novosIds: Record<string, string> = {};
  categorias.forEach((c) => {
    novosIds[c.id] = novoId('prancha');
  });
  return categorias.map((c) => {
    const idNovo = novosIds[c.id];
    const botaoOriginal = inicial?.simbolos.find((s) => s.pranchaDestinoId === c.id);
    return {
      prancha: {
        id: idNovo,
        nome: c.nome,
        emoji: c.emoji,
        simbolos: c.simbolos.map((s) => ({
          ...s,
          id: novoId('sim'),
          pranchaDestinoId: s.pranchaDestinoId ? novosIds[s.pranchaDestinoId] : undefined
        }))
      },
      botao: botaoOriginal
        ? { ...botaoOriginal, id: novoId('sim'), pranchaDestinoId: idNovo }
        : { id: novoId('sim'), texto: c.nome, emoji: c.emoji, cor: 'diversos', pranchaDestinoId: idNovo }
    };
  });
}

const MAX_HISTORICO = 30;
/** Quantos símbolos as sugestões mostram no máximo. */
const MAX_SUGESTOES = 6;
/** Palavras que disparam sugestões (comparadas em minúsculas). */
const GATILHOS_SUGESTAO = new Set(['quero', 'não quero']);

interface ValorContexto {
  carregando: boolean;
  perfis: Perfil[];
  perfil: Perfil;
  config: Configuracoes;
  pranchas: Prancha[];
  /** Cache de imagens em memória: id -> data URL. */
  imagens: Record<string, string>;
  /** Cache de áudios gravados em memória: id -> data URL. */
  audios: Record<string, string>;

  // Frase em construção
  frase: Simbolo[];
  textoFrase: string;
  adicionarNaFrase: (simbolo: Simbolo) => void;
  apagarUltimo: () => void;
  limparFrase: () => void;
  falarFrase: () => void;
  falarSimbolo: (simbolo: Simbolo) => void;
  falarTextoLivre: (texto: string) => void;
  /** Verdadeiro enquanto a voz (ou um áudio gravado) está tocando. */
  falando: boolean;
  /** Verdadeiro por um instante depois de falar uma frase — liga a animação de reforço positivo. */
  comemorando: boolean;
  /** Símbolos sugeridos agora, com base no que a pessoa acabou de tocar e no histórico de uso. */
  sugestoes: Simbolo[];

  // Histórico
  alternarFavorita: (id: string) => void;
  removerDoHistorico: (id: string) => void;
  limparHistorico: () => void;

  // Rotinas (sequências prontas)
  criarRotina: (nome: string, emoji: string) => void;
  renomearRotina: (id: string, nome: string, emoji?: string) => void;
  excluirRotina: (id: string) => void;
  usarRotina: (id: string) => void;

  // Perfis
  trocarPerfil: (id: string) => void;
  /** Cria o perfil (prancheta de um aluno), opcionalmente a partir de um modelo. */
  adicionarPerfil: (nome: string, fotoDataUrl?: string, modeloId?: string) => Promise<void>;
  renomearPerfil: (id: string, nome: string) => void;
  definirFotoPerfil: (id: string, dataUrl: string) => Promise<void>;
  excluirPerfil: (id: string) => void;

  // Configurações
  atualizarConfig: (mudancas: Partial<Configuracoes>) => void;

  // Pranchas e símbolos
  criarPrancha: (nome: string, emoji?: string) => Prancha;
  renomearPrancha: (pranchaId: string, nome: string, emoji?: string) => void;
  excluirPrancha: (pranchaId: string) => void;
  /** Devolve o id do símbolo criado, para poder anexar um áudio gravado logo em seguida. */
  adicionarSimbolo: (pranchaId: string, simbolo: Omit<Simbolo, 'id'>, imagem?: string) => Promise<string>;
  atualizarSimbolo: (
    pranchaId: string,
    simboloId: string,
    mudancas: Partial<Simbolo>,
    imagem?: string
  ) => Promise<void>;
  excluirSimbolo: (pranchaId: string, simboloId: string) => void;
  moverSimbolo: (pranchaId: string, de: number, para: number) => void;

  // Voz gravada por símbolo (microfone)
  definirAudioSimbolo: (pranchaId: string, simboloId: string, dataUrlAudio: string) => Promise<void>;
  removerAudioSimbolo: (pranchaId: string, simboloId: string) => void;

  // Exportação / importação
  exportarPrancha: (pranchaId: string) => void;
  importarPrancha: (conteudoJson: string) => Promise<string>;

  // Categorias e palavras (personalização da prancheta)
  criarCategoria: (dados: DadosCategoria) => string;
  editarCategoria: (pranchaId: string, dados: DadosCategoria) => void;
  transferirSimbolo: (deId: string, simboloId: string, paraId: string) => void;
  /** Devolve quantas palavras foram realmente adicionadas (repetidas são ignoradas). */
  adicionarSimbolosProntos: (pranchaId: string, simbolos: Simbolo[]) => number;

  // Modelos de prancheta e pranchetas completas
  modelosUsuario: ModeloUsuario[];
  /** Soma as categorias de um modelo ao perfil atual; devolve quantas entraram. */
  aplicarModelo: (modeloId: string) => Promise<number>;
  salvarPerfilComoModelo: (perfilId: string, nome: string, emoji: string) => Promise<void>;
  excluirModelo: (id: string) => Promise<void>;
  exportarPerfil: (perfilId: string) => void;
  importarPerfil: (conteudoJson: string) => Promise<string>;
}

const Contexto = createContext<ValorContexto | null>(null);

export function ProvedorApp({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoPersistido | null>(null);
  const [imagens, setImagens] = useState<Record<string, string>>({});
  const [audios, setAudios] = useState<Record<string, string>>({});
  const [frase, setFrase] = useState<Simbolo[]>([]);
  /** Fica verdadeiro enquanto a voz está falando (liga o indicador animado). */
  const [falando, setFalando] = useState(false);
  /** Fica verdadeiro por um instante após falar uma frase completa. */
  const [comemorando, setComemorando] = useState(false);
  const primeiraCarga = useRef(true);

  // Carrega os dados salvos (ou o vocabulário inicial) uma única vez.
  useEffect(() => {
    let ativo = true;
    (async () => {
      const [salvo, imgs, auds] = await Promise.all([
        carregarEstado(),
        lerTodasImagens(),
        lerTodosAudios()
      ]);
      if (!ativo) return;
      setEstado(salvo);
      setImagens(imgs);
      setAudios(auds);
    })();
    return () => {
      ativo = false;
    };
  }, []);

  // Salva a cada mudança (sem bloquear a interface).
  useEffect(() => {
    if (!estado) return;
    if (primeiraCarga.current) {
      primeiraCarga.current = false;
      return;
    }
    const tempo = window.setTimeout(() => void salvarEstado(estado), 150);
    return () => window.clearTimeout(tempo);
  }, [estado]);

  const perfil = useMemo(() => {
    if (!estado) return null;
    return estado.perfis.find((p) => p.id === estado.perfilAtivoId) ?? estado.perfis[0];
  }, [estado]);

  const config = perfil?.configuracoes ?? null;

  // Aplica tema, fonte e estilo visual no documento.
  useEffect(() => {
    if (!config) return;
    document.documentElement.dataset.tema = config.tema;
    document.documentElement.dataset.fonte = config.tamanhoFonte;
    document.documentElement.dataset.blocos = config.tamanhoBlocos;
    document.documentElement.dataset.estilo = config.estiloVisual;
  }, [config]);

  /** Atualiza apenas o perfil ativo, mantendo o resto do estado intacto. */
  const alterarPerfilAtivo = useCallback((mudar: (p: Perfil) => Perfil) => {
    setEstado((anterior) => {
      if (!anterior) return anterior;
      return {
        ...anterior,
        perfis: anterior.perfis.map((p) => (p.id === anterior.perfilAtivoId ? mudar(p) : p))
      };
    });
  }, []);

  const alterarPrancha = useCallback(
    (pranchaId: string, mudar: (p: Prancha) => Prancha) => {
      alterarPerfilAtivo((p) => ({
        ...p,
        pranchas: p.pranchas.map((pr) => (pr.id === pranchaId ? mudar(pr) : pr))
      }));
    },
    [alterarPerfilAtivo]
  );

  // --- Fala e frase --------------------------------------------------------

  const textoFrase = useMemo(() => montarFrase(frase), [frase]);

  /** Soma 1 ao contador de uso do símbolo — alimenta as sugestões de palavras. */
  const registrarUso = useCallback(
    (simboloId: string) => {
      alterarPerfilAtivo((p) => ({
        ...p,
        usoSimbolos: { ...p.usoSimbolos, [simboloId]: (p.usoSimbolos[simboloId] ?? 0) + 1 }
      }));
    },
    [alterarPerfilAtivo]
  );

  const falarSimbolo = useCallback(
    (simbolo: Simbolo) => {
      if (!config) return;
      // Se a pessoa gravou a própria voz para esse símbolo, toca a gravação
      // em vez da voz sintetizada.
      if (simbolo.audioId && audios[simbolo.audioId]) {
        tocarAudioGravado(audios[simbolo.audioId], setFalando);
        return;
      }
      falarTexto(textoDoSimbolo(simbolo), config, setFalando);
    },
    [config, audios]
  );

  const falarTextoLivre = useCallback(
    (texto: string) => {
      if (!config) return;
      falarTexto(texto, config, setFalando);
    },
    [config]
  );

  const adicionarNaFrase = useCallback(
    (simbolo: Simbolo) => {
      setFrase((atual) => [...atual, simbolo]);
      registrarUso(simbolo.id);
    },
    [registrarUso]
  );

  const apagarUltimo = useCallback(() => {
    pararFala();
    setFalando(false);
    setFrase((atual) => atual.slice(0, -1));
  }, []);

  const limparFrase = useCallback(() => {
    pararFala();
    setFalando(false);
    setFrase([]);
  }, []);

  const falarFrase = useCallback(() => {
    if (!config || frase.length === 0) return;
    const texto = montarFrase(frase);
    falarTexto(texto, config, setFalando);

    // Reforço positivo: um breve "brilho" comemorativo depois de falar.
    if (config.reforcoPositivo) {
      setComemorando(true);
      window.setTimeout(() => setComemorando(false), 900);
    }

    // Guarda no histórico (no máximo 30 frases, favoritas nunca são cortadas).
    const registro: FraseHistorico = {
      id: novoId('frase'),
      palavras: frase.map((s) => s.texto),
      textoFalado: texto,
      emMs: Date.now()
    };
    alterarPerfilAtivo((p) => {
      const semDuplicada = p.historico.filter((h) => h.textoFalado !== texto || h.favorita);
      const favoritas = semDuplicada.filter((h) => h.favorita);
      const comuns = [registro, ...semDuplicada.filter((h) => !h.favorita)].slice(
        0,
        Math.max(1, MAX_HISTORICO - favoritas.length)
      );
      return { ...p, historico: [...comuns, ...favoritas].sort((a, b) => b.emMs - a.emMs) };
    });
  }, [config, frase, alterarPerfilAtivo]);

  const alternarFavorita = useCallback(
    (id: string) => {
      alterarPerfilAtivo((p) => ({
        ...p,
        historico: p.historico.map((h) => (h.id === id ? { ...h, favorita: !h.favorita } : h))
      }));
    },
    [alterarPerfilAtivo]
  );

  const removerDoHistorico = useCallback(
    (id: string) => {
      alterarPerfilAtivo((p) => ({ ...p, historico: p.historico.filter((h) => h.id !== id) }));
    },
    [alterarPerfilAtivo]
  );

  const limparHistorico = useCallback(() => {
    alterarPerfilAtivo((p) => ({ ...p, historico: p.historico.filter((h) => h.favorita) }));
  }, [alterarPerfilAtivo]);

  // --- Sugestões de palavras -------------------------------------------------
  //
  // Depois de "quero" ou "não quero", sugere os símbolos mais usados pela
  // pessoa (aprendido com o uso real, guardado em perfil.usoSimbolos). Sem
  // uso suficiente ainda, completa com a categoria Comida como ponto de
  // partida sensato.

  const sugestoes = useMemo<Simbolo[]>(() => {
    if (!perfil || !config?.sugestoesAtivas || frase.length === 0) return [];
    const ultimo = frase[frase.length - 1];
    if (!GATILHOS_SUGESTAO.has(ultimo.texto.toLowerCase())) return [];

    const todos = perfil.pranchas.flatMap((p) => p.simbolos.filter((s) => !s.pranchaDestinoId));
    const usados = todos
      .filter((s) => (perfil.usoSimbolos[s.id] ?? 0) > 0)
      .sort((a, b) => (perfil.usoSimbolos[b.id] ?? 0) - (perfil.usoSimbolos[a.id] ?? 0));

    if (usados.length >= 4) return usados.slice(0, MAX_SUGESTOES);

    const comida = perfil.pranchas.find((p) => p.nome.toLowerCase() === 'comida');
    const extras = (comida?.simbolos ?? []).filter((s) => !usados.some((u) => u.id === s.id));
    return [...usados, ...extras].slice(0, MAX_SUGESTOES);
  }, [perfil, config?.sugestoesAtivas, frase]);

  // --- Rotinas (sequências prontas) -----------------------------------------

  const criarRotina = useCallback(
    (nome: string, emoji: string) => {
      if (frase.length === 0) return;
      const rotina: Rotina = { id: novoId('rotina'), nome, emoji, simbolos: [...frase] };
      alterarPerfilAtivo((p) => ({ ...p, rotinas: [...p.rotinas, rotina] }));
    },
    [frase, alterarPerfilAtivo]
  );

  const renomearRotina = useCallback(
    (id: string, nome: string, emoji?: string) => {
      alterarPerfilAtivo((p) => ({
        ...p,
        rotinas: p.rotinas.map((r) => (r.id === id ? { ...r, nome, emoji: emoji ?? r.emoji } : r))
      }));
    },
    [alterarPerfilAtivo]
  );

  const excluirRotina = useCallback(
    (id: string) => {
      alterarPerfilAtivo((p) => ({ ...p, rotinas: p.rotinas.filter((r) => r.id !== id) }));
    },
    [alterarPerfilAtivo]
  );

  const usarRotina = useCallback(
    (id: string) => {
      const rotina = perfil?.rotinas.find((r) => r.id === id);
      if (!rotina || !config) return;
      pararFala();
      setFrase(rotina.simbolos);
      falarTexto(montarFrase(rotina.simbolos), config, setFalando);
      if (config.reforcoPositivo) {
        setComemorando(true);
        window.setTimeout(() => setComemorando(false), 900);
      }
    },
    [perfil, config]
  );

  // --- Perfis --------------------------------------------------------------

  const trocarPerfil = useCallback((id: string) => {
    pararFala();
    setFalando(false);
    setFrase([]);
    setEstado((anterior) => (anterior ? { ...anterior, perfilAtivoId: id } : anterior));
  }, []);

  /** Guarda imagens e áudios no armazenamento e no cache em memória. */
  const registrarMidias = useCallback(
    async (imgs: Record<string, string>, auds: Record<string, string>) => {
      for (const [id, url] of Object.entries(imgs)) await salvarImagem(id, url);
      for (const [id, url] of Object.entries(auds)) await salvarAudio(id, url);
      if (Object.keys(imgs).length) setImagens((atual) => ({ ...atual, ...imgs }));
      if (Object.keys(auds).length) setAudios((atual) => ({ ...atual, ...auds }));
    },
    []
  );

  /** As pranchas de um modelo pronto ou de um modelo salvo pelo usuário. */
  const resolverModelo = useCallback(
    async (modeloId: string): Promise<Prancha[] | null> => {
      const pronto = MODELOS_PRONTOS.find((m) => m.id === modeloId);
      if (pronto) return montarPranchasDoModelo(pronto);
      const pacote = await lerModelo(modeloId);
      if (!pacote) return null;
      await registrarMidias(pacote.imagens ?? {}, pacote.audios ?? {});
      return JSON.parse(JSON.stringify(pacote.pranchas)) as Prancha[];
    },
    [registrarMidias]
  );

  const adicionarPerfil = useCallback(async (nome: string, fotoDataUrl?: string, modeloId?: string) => {
    const pranchasDoModelo = modeloId ? await resolverModelo(modeloId) : null;
    const novo = criarPerfil(nome.trim() || 'Novo perfil', pranchasDoModelo ?? undefined);
    if (fotoDataUrl) {
      const idImagem = novoId('img');
      await salvarImagem(idImagem, fotoDataUrl);
      novo.fotoId = idImagem;
      setImagens((atual) => ({ ...atual, [idImagem]: fotoDataUrl }));
    }
    setEstado((anterior) =>
      anterior ? { ...anterior, perfis: [...anterior.perfis, novo], perfilAtivoId: novo.id } : anterior
    );
    setFrase([]);
  }, [resolverModelo]);

  const renomearPerfil = useCallback((id: string, nome: string) => {
    setEstado((anterior) =>
      anterior
        ? { ...anterior, perfis: anterior.perfis.map((p) => (p.id === id ? { ...p, nome } : p)) }
        : anterior
    );
  }, []);

  const definirFotoPerfil = useCallback(async (id: string, dataUrl: string) => {
    const idImagem = novoId('img');
    await salvarImagem(idImagem, dataUrl);
    setImagens((atual) => ({ ...atual, [idImagem]: dataUrl }));
    setEstado((anterior) =>
      anterior
        ? {
            ...anterior,
            perfis: anterior.perfis.map((p) => (p.id === id ? { ...p, fotoId: idImagem } : p))
          }
        : anterior
    );
  }, []);

  const excluirPerfil = useCallback((id: string) => {
    setEstado((anterior) => {
      if (!anterior || anterior.perfis.length <= 1) return anterior;
      const perfis = anterior.perfis.filter((p) => p.id !== id);
      return {
        ...anterior,
        perfis,
        perfilAtivoId: anterior.perfilAtivoId === id ? perfis[0].id : anterior.perfilAtivoId
      };
    });
  }, []);

  // --- Configurações -------------------------------------------------------

  const atualizarConfig = useCallback(
    (mudancas: Partial<Configuracoes>) => {
      alterarPerfilAtivo((p) => ({ ...p, configuracoes: { ...p.configuracoes, ...mudancas } }));
    },
    [alterarPerfilAtivo]
  );

  // --- Pranchas e símbolos -------------------------------------------------

  const criarPrancha = useCallback(
    (nome: string, emoji?: string) => {
      const prancha: Prancha = { id: novoId('prancha'), nome, emoji, simbolos: [] };
      alterarPerfilAtivo((p) => ({ ...p, pranchas: [...p.pranchas, prancha] }));
      return prancha;
    },
    [alterarPerfilAtivo]
  );

  const renomearPrancha = useCallback(
    (pranchaId: string, nome: string, emoji?: string) => {
      alterarPrancha(pranchaId, (pr) => ({ ...pr, nome, emoji: emoji ?? pr.emoji }));
    },
    [alterarPrancha]
  );

  const excluirPrancha = useCallback(
    (pranchaId: string) => {
      alterarPerfilAtivo((p) => ({
        ...p,
        // Remove a prancha e também os atalhos que apontavam para ela.
        pranchas: p.pranchas
          .filter((pr) => pr.id !== pranchaId || pr.inicial)
          .map((pr) => ({
            ...pr,
            simbolos: pr.simbolos.filter((s) => s.pranchaDestinoId !== pranchaId)
          }))
      }));
    },
    [alterarPerfilAtivo]
  );

  const adicionarSimbolo = useCallback(
    async (pranchaId: string, simbolo: Omit<Simbolo, 'id'>, imagem?: string) => {
      let imagemId = simbolo.imagemId;
      if (imagem) {
        imagemId = novoId('img');
        await salvarImagem(imagemId, imagem);
        setImagens((atual) => ({ ...atual, [imagemId as string]: imagem }));
      }
      const id = novoId('sim');
      alterarPrancha(pranchaId, (pr) => ({
        ...pr,
        simbolos: [...pr.simbolos, { ...simbolo, imagemId, id }]
      }));
      return id;
    },
    [alterarPrancha]
  );

  const atualizarSimbolo = useCallback(
    async (pranchaId: string, simboloId: string, mudancas: Partial<Simbolo>, imagem?: string) => {
      let imagemId = mudancas.imagemId;
      if (imagem) {
        imagemId = novoId('img');
        await salvarImagem(imagemId, imagem);
        setImagens((atual) => ({ ...atual, [imagemId as string]: imagem }));
      }
      alterarPrancha(pranchaId, (pr) => ({
        ...pr,
        simbolos: pr.simbolos.map((s) =>
          s.id === simboloId
            ? { ...s, ...mudancas, ...(imagemId ? { imagemId } : {}) }
            : s
        )
      }));
    },
    [alterarPrancha]
  );

  const excluirSimbolo = useCallback(
    (pranchaId: string, simboloId: string) => {
      alterarPrancha(pranchaId, (pr) => ({
        ...pr,
        simbolos: pr.simbolos.filter((s) => s.id !== simboloId)
      }));
    },
    [alterarPrancha]
  );

  const moverSimbolo = useCallback(
    (pranchaId: string, de: number, para: number) => {
      alterarPrancha(pranchaId, (pr) => {
        const lista = [...pr.simbolos];
        if (de < 0 || para < 0 || de >= lista.length || para >= lista.length) return pr;
        const [item] = lista.splice(de, 1);
        lista.splice(para, 0, item);
        return { ...pr, simbolos: lista };
      });
    },
    [alterarPrancha]
  );

  // --- Voz gravada por símbolo (microfone) ----------------------------------

  const definirAudioSimbolo = useCallback(
    async (pranchaId: string, simboloId: string, dataUrlAudio: string) => {
      const audioId = novoId('audio');
      await salvarAudio(audioId, dataUrlAudio);
      setAudios((atual) => ({ ...atual, [audioId]: dataUrlAudio }));
      alterarPrancha(pranchaId, (pr) => ({
        ...pr,
        simbolos: pr.simbolos.map((s) => (s.id === simboloId ? { ...s, audioId } : s))
      }));
    },
    [alterarPrancha]
  );

  const removerAudioSimbolo = useCallback(
    (pranchaId: string, simboloId: string) => {
      alterarPrancha(pranchaId, (pr) => ({
        ...pr,
        simbolos: pr.simbolos.map((s) => (s.id === simboloId ? { ...s, audioId: undefined } : s))
      }));
    },
    [alterarPrancha]
  );

  // --- Exportar / importar -------------------------------------------------

  const exportarPrancha = useCallback(
    (pranchaId: string) => {
      const prancha = perfil?.pranchas.find((p) => p.id === pranchaId);
      if (!prancha) return;

      const imagensUsadas: Record<string, string> = {};
      const audiosUsados: Record<string, string> = {};
      for (const s of prancha.simbolos) {
        if (s.imagemId && imagens[s.imagemId]) imagensUsadas[s.imagemId] = imagens[s.imagemId];
        if (s.audioId && audios[s.audioId]) audiosUsados[s.audioId] = audios[s.audioId];
      }

      const arquivo: ArquivoPranchaExportada = {
        formato: 'prancha-caa',
        versao: VERSAO_DADOS,
        exportadoEm: new Date().toISOString(),
        prancha: { ...prancha, inicial: false },
        imagens: imagensUsadas,
        audios: audiosUsados
      };

      const blob = new Blob([JSON.stringify(arquivo, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `prancha-${prancha.nome.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.json`;
      link.click();
      // Alguns navegadores (Safari, Firefox) só terminam o download depois do
      // clique, então liberamos a URL um pouco mais tarde.
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    },
    [perfil, imagens, audios]
  );

  const importarPrancha = useCallback(
    async (conteudoJson: string) => {
      const dados = JSON.parse(conteudoJson) as ArquivoPranchaExportada;
      if (dados?.formato !== 'prancha-caa' || !dados.prancha?.simbolos) {
        throw new Error('Este arquivo não é uma prancha do Prancha CAA.');
      }

      // Regrava as imagens com ids novos, para não colidir com as existentes.
      const mapaImagens: Record<string, string> = {};
      const novasImagens: Record<string, string> = {};
      for (const [idAntigo, dataUrl] of Object.entries(dados.imagens ?? {})) {
        const idNovo = novoId('img');
        mapaImagens[idAntigo] = idNovo;
        novasImagens[idNovo] = dataUrl;
        await salvarImagem(idNovo, dataUrl);
      }
      if (Object.keys(novasImagens).length) {
        setImagens((atual) => ({ ...atual, ...novasImagens }));
      }

      // O mesmo, para os áudios gravados.
      const mapaAudios: Record<string, string> = {};
      const novosAudios: Record<string, string> = {};
      for (const [idAntigo, dataUrl] of Object.entries(dados.audios ?? {})) {
        const idNovo = novoId('audio');
        mapaAudios[idAntigo] = idNovo;
        novosAudios[idNovo] = dataUrl;
        await salvarAudio(idNovo, dataUrl);
      }
      if (Object.keys(novosAudios).length) {
        setAudios((atual) => ({ ...atual, ...novosAudios }));
      }

      const prancha: Prancha = {
        id: novoId('prancha'),
        nome: dados.prancha.nome || 'Prancha importada',
        emoji: dados.prancha.emoji,
        simbolos: dados.prancha.simbolos.map((s) => ({
          ...s,
          id: novoId('sim'),
          imagemId: s.imagemId ? mapaImagens[s.imagemId] : undefined,
          audioId: s.audioId ? mapaAudios[s.audioId] : undefined,
          // Atalhos para outras pranchas não fazem sentido fora do aparelho
          // de origem, então viram símbolos comuns.
          pranchaDestinoId: undefined
        }))
      };

      // A categoria importada ganha um bloco no Início — sem ele não daria
      // para chegar nela na tela principal.
      const botao: Simbolo = {
        id: novoId('sim'),
        texto: prancha.nome,
        emoji: prancha.emoji ?? '📁',
        cor: 'diversos',
        pranchaDestinoId: prancha.id
      };
      alterarPerfilAtivo((p) => ({
        ...p,
        pranchas: [
          ...p.pranchas.map((pr) =>
            pr.inicial ? { ...pr, simbolos: [...pr.simbolos, botao] } : pr
          ),
          prancha
        ]
      }));
      return prancha.nome;
    },
    [alterarPerfilAtivo]
  );

  // --- Categorias e palavras (personalização da prancheta) -------------------

  /** Cria uma categoria nova: a prancha vazia + o botão que a abre no Início. */
  const criarCategoria = useCallback(
    (dados: DadosCategoria): string => {
      const id = novoId('prancha');
      alterarPerfilAtivo((p) => ({
        ...p,
        pranchas: [
          ...p.pranchas.map((pr) =>
            pr.inicial
              ? {
                  ...pr,
                  simbolos: [
                    ...pr.simbolos,
                    {
                      id: novoId('sim'),
                      texto: dados.nome,
                      emoji: dados.emoji,
                      cor: dados.cor,
                      pranchaDestinoId: id
                    }
                  ]
                }
              : pr
          ),
          { id, nome: dados.nome, emoji: dados.emoji, simbolos: [] }
        ]
      }));
      return id;
    },
    [alterarPerfilAtivo]
  );

  /** Muda nome, ícone e cor de uma categoria — na prancha e em todos os botões que a abrem. */
  const editarCategoria = useCallback(
    (pranchaId: string, dados: DadosCategoria) => {
      alterarPerfilAtivo((p) => ({
        ...p,
        pranchas: p.pranchas.map((pr) =>
          pr.id === pranchaId
            ? { ...pr, nome: dados.nome, emoji: dados.emoji }
            : {
                ...pr,
                simbolos: pr.simbolos.map((s) =>
                  s.pranchaDestinoId === pranchaId
                    ? { ...s, texto: dados.nome, textoFala: undefined, emoji: dados.emoji, cor: dados.cor }
                    : s
                )
              }
        )
      }));
    },
    [alterarPerfilAtivo]
  );

  /** Move um símbolo de uma categoria para outra. */
  const transferirSimbolo = useCallback(
    (deId: string, simboloId: string, paraId: string) => {
      alterarPerfilAtivo((p) => {
        if (deId === paraId) return p;
        const simbolo = p.pranchas.find((pr) => pr.id === deId)?.simbolos.find((s) => s.id === simboloId);
        // Uma pasta não pode ir parar dentro dela mesma.
        if (!simbolo || simbolo.pranchaDestinoId === paraId) return p;
        return {
          ...p,
          pranchas: p.pranchas.map((pr) =>
            pr.id === deId
              ? { ...pr, simbolos: pr.simbolos.filter((s) => s.id !== simboloId) }
              : pr.id === paraId
                ? { ...pr, simbolos: [...pr.simbolos, simbolo] }
                : pr
          )
        };
      });
    },
    [alterarPerfilAtivo]
  );

  /** Acrescenta palavras prontas (do banco) a uma categoria, sem repetir as que já existem. */
  const adicionarSimbolosProntos = useCallback(
    (pranchaId: string, simbolos: Simbolo[]): number => {
      const alvo = perfil?.pranchas.find((pr) => pr.id === pranchaId);
      if (!alvo) return 0;
      const jaTem = new Set(alvo.simbolos.map((s) => s.texto.trim().toLowerCase()));
      const novos = simbolos
        .filter((s) => !jaTem.has(s.texto.trim().toLowerCase()))
        .map(copiarDoBanco);
      if (novos.length === 0) return 0;
      alterarPrancha(pranchaId, (pr) => ({ ...pr, simbolos: [...pr.simbolos, ...novos] }));
      return novos.length;
    },
    [perfil, alterarPrancha]
  );

  // --- Modelos de prancheta e pranchetas completas ------------------------------

  const modelosUsuario = useMemo(() => estado?.modelos ?? [], [estado?.modelos]);

  /** Pacote (para exportar ou guardar como modelo) com as pranchas de um perfil. */
  const montarPacote = useCallback(
    (p: Perfil, nome: string, emoji?: string): ArquivoPacote => {
      const imgs: Record<string, string> = {};
      const auds: Record<string, string> = {};
      for (const pr of p.pranchas) {
        for (const s of pr.simbolos) {
          if (s.imagemId && imagens[s.imagemId]) imgs[s.imagemId] = imagens[s.imagemId];
          if (s.audioId && audios[s.audioId]) auds[s.audioId] = audios[s.audioId];
        }
      }
      return {
        formato: 'prancha-caa-pacote',
        versao: VERSAO_DADOS,
        exportadoEm: new Date().toISOString(),
        nome,
        emoji,
        pranchas: JSON.parse(JSON.stringify(p.pranchas)) as Prancha[],
        imagens: imgs,
        audios: auds
      };
    },
    [imagens, audios]
  );

  const aplicarModelo = useCallback(
    async (modeloId: string): Promise<number> => {
      if (!perfil) return 0;
      let categorias: CategoriaMontada[] = [];
      const pronto = MODELOS_PRONTOS.find((m) => m.id === modeloId);
      if (pronto) {
        categorias = montarCategorias(pronto);
      } else {
        const pacote = await lerModelo(modeloId);
        if (!pacote) return 0;
        await registrarMidias(pacote.imagens ?? {}, pacote.audios ?? {});
        categorias = categoriasDoPacote(pacote.pranchas);
      }
      // Categorias com o mesmo nome de alguma que já existe não entram de novo.
      const existentes = new Set(
        perfil.pranchas.filter((p) => !p.inicial).map((p) => p.nome.trim().toLowerCase())
      );
      const novas = categorias.filter((c) => !existentes.has(c.prancha.nome.trim().toLowerCase()));
      if (novas.length === 0) return 0;
      alterarPerfilAtivo((p) => ({
        ...p,
        pranchas: [
          ...p.pranchas.map((pr) =>
            pr.inicial ? { ...pr, simbolos: [...pr.simbolos, ...novas.map((n) => n.botao)] } : pr
          ),
          ...novas.map((n) => n.prancha)
        ]
      }));
      return novas.length;
    },
    [perfil, registrarMidias, alterarPerfilAtivo]
  );

  const salvarPerfilComoModelo = useCallback(
    async (perfilId: string, nome: string, emoji: string) => {
      const p = estado?.perfis.find((x) => x.id === perfilId);
      if (!p) return;
      const id = novoId('modelo');
      const titulo = nome.trim() || p.nome;
      await salvarModelo(id, montarPacote(p, titulo, emoji));
      const ficha: ModeloUsuario = {
        id,
        nome: titulo,
        emoji,
        criadoEm: Date.now(),
        totalCategorias: p.pranchas.filter((x) => !x.inicial).length
      };
      setEstado((anterior) =>
        anterior ? { ...anterior, modelos: [...(anterior.modelos ?? []), ficha] } : anterior
      );
    },
    [estado?.perfis, montarPacote]
  );

  const excluirModelo = useCallback(async (id: string) => {
    await excluirModeloArmazenado(id);
    setEstado((anterior) =>
      anterior
        ? { ...anterior, modelos: (anterior.modelos ?? []).filter((m) => m.id !== id) }
        : anterior
    );
  }, []);

  const exportarPerfil = useCallback(
    (perfilId: string) => {
      const p = estado?.perfis.find((x) => x.id === perfilId);
      if (!p) return;
      baixarArquivo(`prancheta-${nomeSeguro(p.nome)}.json`, montarPacote(p, p.nome));
    },
    [estado?.perfis, montarPacote]
  );

  const importarPerfil = useCallback(
    async (conteudoJson: string): Promise<string> => {
      const dados = JSON.parse(conteudoJson) as ArquivoPacote;
      if (
        dados?.formato !== 'prancha-caa-pacote' ||
        !Array.isArray(dados.pranchas) ||
        dados.pranchas.length === 0
      ) {
        throw new Error('Este arquivo não é uma prancheta completa do Prancha CAA.');
      }

      // Imagens e áudios ganham ids novos, para não colidirem com os daqui.
      const mapaImg: Record<string, string> = {};
      const mapaAud: Record<string, string> = {};
      const novasImg: Record<string, string> = {};
      const novosAud: Record<string, string> = {};
      for (const [antigo, url] of Object.entries(dados.imagens ?? {})) {
        const novo = novoId('img');
        mapaImg[antigo] = novo;
        novasImg[novo] = url;
      }
      for (const [antigo, url] of Object.entries(dados.audios ?? {})) {
        const novo = novoId('audio');
        mapaAud[antigo] = novo;
        novosAud[novo] = url;
      }
      await registrarMidias(novasImg, novosAud);

      const pranchas: Prancha[] = dados.pranchas.map((pr) => ({
        ...pr,
        simbolos: pr.simbolos.map((s) => ({
          ...s,
          imagemId: s.imagemId ? mapaImg[s.imagemId] : undefined,
          audioId: s.audioId ? mapaAud[s.audioId] : undefined
        }))
      }));

      const nome = dados.nome?.trim() || 'Prancheta importada';
      const novo = criarPerfil(nome, pranchas);
      setEstado((anterior) =>
        anterior ? { ...anterior, perfis: [...anterior.perfis, novo], perfilAtivoId: novo.id } : anterior
      );
      setFrase([]);
      return nome;
    },
    [registrarMidias]
  );

  const valor = useMemo<ValorContexto | null>(() => {
    if (!estado || !perfil || !config) return null;
    return {
      carregando: false,
      perfis: estado.perfis,
      perfil,
      config,
      pranchas: perfil.pranchas,
      imagens,
      audios,
      frase,
      textoFrase,
      adicionarNaFrase,
      apagarUltimo,
      limparFrase,
      falarFrase,
      falarSimbolo,
      falarTextoLivre,
      falando,
      comemorando,
      sugestoes,
      alternarFavorita,
      removerDoHistorico,
      limparHistorico,
      criarRotina,
      renomearRotina,
      excluirRotina,
      usarRotina,
      trocarPerfil,
      adicionarPerfil,
      renomearPerfil,
      definirFotoPerfil,
      excluirPerfil,
      atualizarConfig,
      criarPrancha,
      renomearPrancha,
      excluirPrancha,
      adicionarSimbolo,
      atualizarSimbolo,
      excluirSimbolo,
      moverSimbolo,
      definirAudioSimbolo,
      removerAudioSimbolo,
      exportarPrancha,
      importarPrancha,
      criarCategoria,
      editarCategoria,
      transferirSimbolo,
      adicionarSimbolosProntos,
      modelosUsuario,
      aplicarModelo,
      salvarPerfilComoModelo,
      excluirModelo,
      exportarPerfil,
      importarPerfil
    };
  }, [
    estado,
    perfil,
    config,
    imagens,
    audios,
    frase,
    textoFrase,
    adicionarNaFrase,
    apagarUltimo,
    limparFrase,
    falarFrase,
    falarSimbolo,
    falarTextoLivre,
    falando,
    comemorando,
    sugestoes,
    alternarFavorita,
    removerDoHistorico,
    limparHistorico,
    criarRotina,
    renomearRotina,
    excluirRotina,
    usarRotina,
    trocarPerfil,
    adicionarPerfil,
    renomearPerfil,
    definirFotoPerfil,
    excluirPerfil,
    atualizarConfig,
    criarPrancha,
    renomearPrancha,
    excluirPrancha,
    adicionarSimbolo,
    atualizarSimbolo,
    excluirSimbolo,
    moverSimbolo,
    definirAudioSimbolo,
    removerAudioSimbolo,
    exportarPrancha,
    importarPrancha,
    criarCategoria,
    editarCategoria,
    transferirSimbolo,
    adicionarSimbolosProntos,
    modelosUsuario,
    aplicarModelo,
    salvarPerfilComoModelo,
    excluirModelo,
    exportarPerfil,
    importarPerfil
  ]);

  if (!valor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-6 text-center text-xl text-slate-700">
        Carregando as pranchas…
      </div>
    );
  }

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

/** Acesso ao estado do app. Use dentro de <ProvedorApp>. */
export function useApp(): ValorContexto {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useApp precisa estar dentro de <ProvedorApp>.');
  return valor;
}
