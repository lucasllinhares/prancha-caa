// ---------------------------------------------------------------------------
// Tipos centrais do aplicativo. Tudo aqui e serializavel em JSON, porque os
// dados vao para o IndexedDB e tambem para os arquivos de exportacao.
// ---------------------------------------------------------------------------

/**
 * Cores dos simbolos.
 *
 * As seis primeiras sao o padrao Fitzgerald Key, que fonoaudiologos e escolas
 * ja usam. As quatro ultimas sao cores extras de "capa", para que cada pasta
 * de categoria na tela inicial tenha uma cor propria e inconfundivel.
 */
export type CorFitzgerald =
  | 'pessoas' // amarelo
  | 'acoes' // verde
  | 'descritivos' // azul
  | 'substantivos' // laranja
  | 'social' // rosa
  | 'diversos' // branco
  | 'roxo'
  | 'turquesa'
  | 'vermelho'
  | 'lima';

/** Um botao da prancha. Pode falar uma palavra ou abrir outra prancha. */
export interface Simbolo {
  id: string;
  /** Texto exibido no botao (mostrado em caixa alta). */
  texto: string;
  /** Texto realmente enviado ao sintetizador, quando diferente do exibido. */
  textoFala?: string;
  /** Emoji usado como imagem, quando nao ha foto. */
  emoji?: string;
  /** Chave da imagem guardada no IndexedDB (data URL redimensionada). */
  imagemId?: string;
  /**
   * Chave do audio gravado pelo microfone, guardado no IndexedDB (data URL).
   * Quando presente, tocar o simbolo reproduz essa gravacao em vez de usar a
   * voz sintetizada — util para a voz da propria familia ou do terapeuta.
   */
  audioId?: string;
  cor: CorFitzgerald;
  /** Quando preenchido, tocar no simbolo navega para essa prancha. */
  pranchaDestinoId?: string;
}

/** Uma prancha (tela de simbolos). Pranchas podem ter pranchas filhas. */
export interface Prancha {
  id: string;
  nome: string;
  emoji?: string;
  simbolos: Simbolo[];
  /** Marca a prancha inicial do perfil. */
  inicial?: boolean;
}

/**
 * Rotina: uma sequencia pronta de simbolos que a pessoa monta uma vez e
 * guarda para usar com um toque só (ex.: "hora de dormir" = escovar dente +
 * banho + pijama). Guarda uma copia dos simbolos, nao so os ids — assim a
 * rotina continua funcionando mesmo se o simbolo original for editado ou
 * apagado depois.
 */
export interface Rotina {
  id: string;
  nome: string;
  emoji: string;
  simbolos: Simbolo[];
}

export type VelocidadeFala = 'lenta' | 'normal' | 'rapida';
export type TomVoz = 'grave' | 'medio' | 'agudo';
export type Tema = 'claro' | 'escuro' | 'contraste';

/**
 * Estilo visual do app inteiro (independente do tema claro/escuro):
 *  - 'contorno': o visual padrão do app — bordas pretas grossas, sombra
 *    sólida deslocada (sem desfoque) e cores chapadas, estilo "sticker".
 *  - 'dinamico': estilo alternativo com relevo suave, sombra desfocada e
 *    texturas nas capas (referência: apps de jogo/Duolingo).
 */
export type EstiloVisual = 'dinamico' | 'contorno';
export type Densidade = 4 | 6 | 9 | 12 | 16;
export type TamanhoFonte = 'pequeno' | 'medio' | 'grande' | 'enorme';

export interface Configuracoes {
  velocidadeFala: VelocidadeFala;
  tomVoz: TomVoz;
  /** voiceURI da voz escolhida; vazio = escolha automatica de voz pt-BR. */
  vozURI: string;
  falarAoTocar: boolean;
  densidade: Densidade;
  tamanhoFonte: TamanhoFonte;
  tema: Tema;
  /** Estilo visual do app: 'contorno' (padrão) ou 'dinamico'. */
  estiloVisual: EstiloVisual;
  /** PIN de 4 digitos que protege o modo editor. Vazio = sem bloqueio. */
  pinEditor: string;
  /** Modo varredura (scanning) para usuarios de acionador. */
  varreduraAtiva: boolean;
  /** Intervalo da varredura em segundos (1 a 5). */
  varreduraIntervalo: number;
  /** Mostrar a faixa fixa de vocabulario nuclear. */
  mostrarNucleo: boolean;
  /** Mostrar sugestoes de palavras depois de "quero" / "não quero". */
  sugestoesAtivas: boolean;
  /** Pequena animação/som ao falar uma frase completa. */
  reforcoPositivo: boolean;
}

/** Frase guardada no historico. */
export interface FraseHistorico {
  id: string;
  /** Textos dos simbolos, na ordem em que foram tocados. */
  palavras: string[];
  /** Frase ja ajustada, do jeito que foi falada. */
  textoFalado: string;
  emMs: number;
  favorita?: boolean;
}

export interface Perfil {
  id: string;
  nome: string;
  /** Chave da foto no IndexedDB (opcional). */
  fotoId?: string;
  pranchas: Prancha[];
  configuracoes: Configuracoes;
  historico: FraseHistorico[];
  rotinas: Rotina[];
  /** Quantas vezes cada simbolo (por id) foi usado — alimenta as sugestões. */
  usoSimbolos: Record<string, number>;
  /**
   * Versão do vocabulário inicial que este perfil já recebeu. Usada para
   * adicionar novas categorias de fábrica a perfis antigos sem duplicar
   * nem trazer de volta categorias que a pessoa já excluiu.
   */
  versaoVocabulario: number;
}

/** Estado completo persistido. */
export interface EstadoPersistido {
  versao: number;
  perfis: Perfil[];
  perfilAtivoId: string;
  /**
   * Verdadeiro quando o app abriu sem conseguir ler o armazenamento (banco
   * bloqueado, modo privado, disco cheio). Nesse caso NAO salvamos nada, para
   * nao apagar os dados que podem estar la.
   */
  somenteMemoria?: boolean;
}

/** Formato do arquivo .json de exportacao/importacao de prancha. */
export interface ArquivoPranchaExportada {
  formato: 'prancha-caa';
  versao: number;
  exportadoEm: string;
  prancha: Prancha;
  /** Imagens usadas pela prancha: id -> data URL. */
  imagens: Record<string, string>;
  /** Áudios gravados usados pela prancha: id -> data URL. */
  audios: Record<string, string>;
}
