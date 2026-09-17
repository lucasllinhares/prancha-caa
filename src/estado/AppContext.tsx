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
  ArquivoPranchaExportada,
  Configuracoes,
  EstadoPersistido,
  FraseHistorico,
  Perfil,
  Prancha,
  Simbolo
} from '../tipos';
import {
  VERSAO_DADOS,
  carregarEstado,
  criarPerfil,
  lerTodasImagens,
  salvarEstado,
  salvarImagem
} from '../armazenamento/db';
import { montarFrase, textoDoSimbolo } from '../fala/frase';
import { falar as falarTexto, pararFala } from '../fala/sintetizador';
import { novoId } from '../utilidades/id';

const MAX_HISTORICO = 30;

interface ValorContexto {
  carregando: boolean;
  perfis: Perfil[];
  perfil: Perfil;
  config: Configuracoes;
  pranchas: Prancha[];
  /** Cache de imagens em memória: id -> data URL. */
  imagens: Record<string, string>;

  // Frase em construção
  frase: Simbolo[];
  textoFrase: string;
  adicionarNaFrase: (simbolo: Simbolo) => void;
  apagarUltimo: () => void;
  limparFrase: () => void;
  falarFrase: () => void;
  falarSimbolo: (simbolo: Simbolo) => void;
  falarTextoLivre: (texto: string) => void;
  /** Verdadeiro enquanto a voz está falando. */
  falando: boolean;

  // Histórico
  alternarFavorita: (id: string) => void;
  removerDoHistorico: (id: string) => void;
  limparHistorico: () => void;

  // Perfis
  trocarPerfil: (id: string) => void;
  adicionarPerfil: (nome: string, fotoDataUrl?: string) => Promise<void>;
  renomearPerfil: (id: string, nome: string) => void;
  definirFotoPerfil: (id: string, dataUrl: string) => Promise<void>;
  excluirPerfil: (id: string) => void;

  // Configurações
  atualizarConfig: (mudancas: Partial<Configuracoes>) => void;

  // Pranchas e símbolos
  criarPrancha: (nome: string, emoji?: string) => Prancha;
  renomearPrancha: (pranchaId: string, nome: string, emoji?: string) => void;
  excluirPrancha: (pranchaId: string) => void;
  adicionarSimbolo: (pranchaId: string, simbolo: Omit<Simbolo, 'id'>, imagem?: string) => Promise<void>;
  atualizarSimbolo: (
    pranchaId: string,
    simboloId: string,
    mudancas: Partial<Simbolo>,
    imagem?: string
  ) => Promise<void>;
  excluirSimbolo: (pranchaId: string, simboloId: string) => void;
  moverSimbolo: (pranchaId: string, de: number, para: number) => void;

  // Exportação / importação
  exportarPrancha: (pranchaId: string) => void;
  importarPrancha: (conteudoJson: string) => Promise<string>;
}

const Contexto = createContext<ValorContexto | null>(null);

export function ProvedorApp({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoPersistido | null>(null);
  const [imagens, setImagens] = useState<Record<string, string>>({});
  const [frase, setFrase] = useState<Simbolo[]>([]);
  /** Fica verdadeiro enquanto a voz está falando (liga o indicador animado). */
  const [falando, setFalando] = useState(false);
  const primeiraCarga = useRef(true);

  // Carrega os dados salvos (ou o vocabulário inicial) uma única vez.
  useEffect(() => {
    let ativo = true;
    (async () => {
      const [salvo, imgs] = await Promise.all([carregarEstado(), lerTodasImagens()]);
      if (!ativo) return;
      setEstado(salvo);
      setImagens(imgs);
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

  // Aplica tema e tamanho de fonte no documento.
  useEffect(() => {
    if (!config) return;
    document.documentElement.dataset.tema = config.tema;
    document.documentElement.dataset.fonte = config.tamanhoFonte;
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

  const falarSimbolo = useCallback(
    (simbolo: Simbolo) => {
      if (!config) return;
      falarTexto(textoDoSimbolo(simbolo), config, setFalando);
    },
    [config]
  );

  const falarTextoLivre = useCallback(
    (texto: string) => {
      if (!config) return;
      falarTexto(texto, config, setFalando);
    },
    [config]
  );

  const adicionarNaFrase = useCallback((simbolo: Simbolo) => {
    setFrase((atual) => [...atual, simbolo]);
  }, []);

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

  // --- Perfis --------------------------------------------------------------

  const trocarPerfil = useCallback((id: string) => {
    pararFala();
    setFalando(false);
    setFrase([]);
    setEstado((anterior) => (anterior ? { ...anterior, perfilAtivoId: id } : anterior));
  }, []);

  const adicionarPerfil = useCallback(async (nome: string, fotoDataUrl?: string) => {
    const novo = criarPerfil(nome.trim() || 'Novo perfil');
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
  }, []);

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
      alterarPrancha(pranchaId, (pr) => ({
        ...pr,
        simbolos: [...pr.simbolos, { ...simbolo, imagemId, id: novoId('sim') }]
      }));
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

  // --- Exportar / importar -------------------------------------------------

  const exportarPrancha = useCallback(
    (pranchaId: string) => {
      const prancha = perfil?.pranchas.find((p) => p.id === pranchaId);
      if (!prancha) return;

      const imagensUsadas: Record<string, string> = {};
      for (const s of prancha.simbolos) {
        if (s.imagemId && imagens[s.imagemId]) imagensUsadas[s.imagemId] = imagens[s.imagemId];
      }

      const arquivo: ArquivoPranchaExportada = {
        formato: 'prancha-caa',
        versao: VERSAO_DADOS,
        exportadoEm: new Date().toISOString(),
        prancha: { ...prancha, inicial: false },
        imagens: imagensUsadas
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
    [perfil, imagens]
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

      const prancha: Prancha = {
        id: novoId('prancha'),
        nome: dados.prancha.nome || 'Prancha importada',
        emoji: dados.prancha.emoji,
        simbolos: dados.prancha.simbolos.map((s) => ({
          ...s,
          id: novoId('sim'),
          imagemId: s.imagemId ? mapaImagens[s.imagemId] : undefined,
          // Atalhos para outras pranchas não fazem sentido fora do aparelho
          // de origem, então viram símbolos comuns.
          pranchaDestinoId: undefined
        }))
      };

      alterarPerfilAtivo((p) => ({ ...p, pranchas: [...p.pranchas, prancha] }));
      return prancha.nome;
    },
    [alterarPerfilAtivo]
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
      frase,
      textoFrase,
      adicionarNaFrase,
      apagarUltimo,
      limparFrase,
      falarFrase,
      falarSimbolo,
      falarTextoLivre,
      falando,
      alternarFavorita,
      removerDoHistorico,
      limparHistorico,
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
      exportarPrancha,
      importarPrancha
    };
  }, [
    estado,
    perfil,
    config,
    imagens,
    frase,
    textoFrase,
    adicionarNaFrase,
    apagarUltimo,
    limparFrase,
    falarFrase,
    falarSimbolo,
    falarTextoLivre,
    falando,
    alternarFavorita,
    removerDoHistorico,
    limparHistorico,
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
    exportarPrancha,
    importarPrancha
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
