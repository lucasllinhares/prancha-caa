import { get, set, del, keys } from 'idb-keyval';
import type { ArquivoPacote, Configuracoes, EstadoPersistido, Perfil, Prancha } from '../tipos';
import {
  categoriasFaltando,
  clonarCategoriaComBotao,
  criarPranchasIniciais,
  VERSAO_VOCABULARIO_ATUAL
} from '../dados/vocabularioInicial';
import { novoId } from '../utilidades/id';

// ---------------------------------------------------------------------------
// Persistência local. Tudo fica no IndexedDB do próprio dispositivo:
// nenhum dado é enviado para servidor algum.
//
//  chave 'caa:estado'      -> perfis, configurações, pranchas e histórico
//  chave 'caa:img:<id>'    -> imagens (data URL já redimensionada)
//  chave 'caa:audio:<id>'  -> áudios gravados pelo microfone (data URL)
//  chave 'caa:modelo:<id>' -> conteúdo de um modelo de prancheta do usuário
// ---------------------------------------------------------------------------

const CHAVE_ESTADO = 'caa:estado';
const PREFIXO_IMAGEM = 'caa:img:';
const PREFIXO_AUDIO = 'caa:audio:';
const PREFIXO_MODELO = 'caa:modelo:';
export const VERSAO_DADOS = 1;

export const CONFIGURACOES_PADRAO: Configuracoes = {
  velocidadeFala: 'normal',
  tomVoz: 'medio',
  vozURI: '',
  falarAoTocar: true,
  densidade: 9,
  tamanhoFonte: 'medio',
  tamanhoBlocos: 'normal',
  tema: 'claro',
  estiloVisual: 'contorno',
  pinEditor: '',
  varreduraAtiva: false,
  varreduraIntervalo: 2,
  mostrarNucleo: true,
  sugestoesAtivas: true,
  reforcoPositivo: true
};

/**
 * Perfil novo. Sem `pranchas`, já vem com todo o vocabulário de fábrica; com
 * `pranchas`, começa daquelas (ex.: as de um modelo de prancheta).
 */
export function criarPerfil(nome = 'Meu perfil', pranchas?: Prancha[]): Perfil {
  return {
    id: novoId('perfil'),
    nome,
    pranchas: pranchas ?? criarPranchasIniciais(),
    configuracoes: { ...CONFIGURACOES_PADRAO },
    historico: [],
    rotinas: [],
    usoSimbolos: {},
    versaoVocabulario: VERSAO_VOCABULARIO_ATUAL
  };
}

export function estadoInicial(): EstadoPersistido {
  const perfil = criarPerfil();
  return { versao: VERSAO_DADOS, perfis: [perfil], perfilAtivoId: perfil.id };
}

/**
 * Adiciona ao perfil as categorias de fábrica que ainda não existem nele
 * (ex.: Números, Cores...), sem duplicar e sem trazer de volta categorias
 * que a pessoa já excluiu manualmente — a checagem é só "essa categoria já
 * existe?", então uma vez adicionada (ou removida por escolha da pessoa),
 * a próxima migração não mexe mais nela.
 */
function migrarVocabulario(perfil: Perfil): Perfil {
  const versaoAtual = perfil.versaoVocabulario ?? 1;
  if (versaoAtual >= VERSAO_VOCABULARIO_ATUAL) return perfil;

  const idsExistentes = new Set(perfil.pranchas.map((p) => p.id));
  const faltando = categoriasFaltando(versaoAtual, idsExistentes);
  if (faltando.length === 0) {
    return { ...perfil, versaoVocabulario: VERSAO_VOCABULARIO_ATUAL };
  }

  const novasPranchas = faltando.map((c) => clonarCategoriaComBotao(c));
  const novosBotoes = novasPranchas.map((n) => n.botao);

  return {
    ...perfil,
    versaoVocabulario: VERSAO_VOCABULARIO_ATUAL,
    pranchas: [
      // Os novos botões de categoria entram na prancha de início.
      ...perfil.pranchas.map((p) =>
        p.inicial ? { ...p, simbolos: [...p.simbolos, ...novosBotoes] } : p
      ),
      // E as próprias pranchas novas (Números, Cores...) entram no fim.
      ...novasPranchas.map((n) => n.prancha)
    ]
  };
}

/** Tempo máximo de espera pelo IndexedDB antes de abrir o app mesmo assim. */
const LIMITE_LEITURA_MS = 4000;

/**
 * Corre contra o relógio: se o IndexedDB travar (acontece quando o navegador
 * está com o banco bloqueado por outra aba, em modo privado ou com o
 * armazenamento cheio), o app precisa abrir de qualquer jeito — é um
 * dispositivo de comunicação, não pode ficar preso numa tela de carregamento.
 */
function comLimiteDeTempo<T>(promessa: Promise<T>, ms: number): Promise<T | 'tempo-esgotado'> {
  return Promise.race([
    promessa,
    new Promise<'tempo-esgotado'>((resolver) => window.setTimeout(() => resolver('tempo-esgotado'), ms))
  ]);
}

/** Carrega o estado salvo; na primeira execução devolve o seed já populado. */
export async function carregarEstado(): Promise<EstadoPersistido> {
  try {
    const resultado = await comLimiteDeTempo(get<EstadoPersistido>(CHAVE_ESTADO), LIMITE_LEITURA_MS);

    if (resultado === 'tempo-esgotado') {
      console.warn(
        'O armazenamento do navegador não respondeu. O app abriu com o vocabulário inicial, ' +
          'mas as mudanças não serão salvas nesta sessão.'
      );
      return { ...estadoInicial(), somenteMemoria: true };
    }

    const salvo = resultado;
    if (!salvo || !salvo.perfis?.length) {
      const inicial = estadoInicial();
      await salvarEstado(inicial);
      return inicial;
    }
    // Garante que configurações e campos novos (de versões futuras) tenham
    // valor, e traz categorias de vocabulário novas para perfis antigos.
    salvo.modelos = salvo.modelos ?? [];
    salvo.perfis = salvo.perfis.map((p) =>
      migrarVocabulario({
        ...p,
        configuracoes: { ...CONFIGURACOES_PADRAO, ...p.configuracoes },
        historico: p.historico ?? [],
        rotinas: p.rotinas ?? [],
        usoSimbolos: p.usoSimbolos ?? {},
        versaoVocabulario: p.versaoVocabulario ?? 1
      })
    );
    if (!salvo.perfis.some((p) => p.id === salvo.perfilAtivoId)) {
      salvo.perfilAtivoId = salvo.perfis[0].id;
    }
    return salvo;
  } catch (erro) {
    // Navegador em modo privado ou IndexedDB bloqueado: o app continua
    // funcionando só em memória, sem salvar.
    console.warn('Não foi possível ler os dados salvos:', erro);
    return estadoInicial();
  }
}

export async function salvarEstado(estado: EstadoPersistido): Promise<void> {
  // Sessao em memoria: nao gravamos para nao sobrescrever dados existentes.
  if (estado.somenteMemoria) return;
  try {
    await set(CHAVE_ESTADO, estado);
  } catch (erro) {
    console.warn('Não foi possível salvar os dados:', erro);
  }
}

// --- Imagens ---------------------------------------------------------------

export async function salvarImagem(id: string, dataUrl: string): Promise<void> {
  await set(PREFIXO_IMAGEM + id, dataUrl);
}

export async function lerImagem(id: string): Promise<string | undefined> {
  return get<string>(PREFIXO_IMAGEM + id);
}

export async function excluirImagem(id: string): Promise<void> {
  await del(PREFIXO_IMAGEM + id);
}

/** Carrega todas as imagens de uma vez, para o cache em memória da interface. */
export async function lerTodasImagens(): Promise<Record<string, string>> {
  return lerTodosPorPrefixo(PREFIXO_IMAGEM);
}

// --- Áudios gravados ---------------------------------------------------------

export async function salvarAudio(id: string, dataUrl: string): Promise<void> {
  await set(PREFIXO_AUDIO + id, dataUrl);
}

export async function lerAudio(id: string): Promise<string | undefined> {
  return get<string>(PREFIXO_AUDIO + id);
}

export async function excluirAudio(id: string): Promise<void> {
  await del(PREFIXO_AUDIO + id);
}

/** Carrega todos os áudios gravados de uma vez, para o cache em memória. */
export async function lerTodosAudios(): Promise<Record<string, string>> {
  return lerTodosPorPrefixo(PREFIXO_AUDIO);
}

async function lerTodosPorPrefixo(prefixo: string): Promise<Record<string, string>> {
  const resultado: Record<string, string> = {};
  try {
    const todasChaves = await comLimiteDeTempo(keys(), LIMITE_LEITURA_MS);
    if (todasChaves === 'tempo-esgotado') return resultado;
    for (const chave of todasChaves) {
      if (typeof chave === 'string' && chave.startsWith(prefixo)) {
        const valor = await get<string>(chave);
        if (valor) resultado[chave.slice(prefixo.length)] = valor;
      }
    }
  } catch (erro) {
    console.warn('Não foi possível ler os dados salvos:', erro);
  }
  return resultado;
}

// --- Modelos de prancheta do usuário ("Minhas pranchetas") --------------------

export async function salvarModelo(id: string, pacote: ArquivoPacote): Promise<void> {
  await set(PREFIXO_MODELO + id, pacote);
}

export async function lerModelo(id: string): Promise<ArquivoPacote | undefined> {
  return get<ArquivoPacote>(PREFIXO_MODELO + id);
}

export async function excluirModeloArmazenado(id: string): Promise<void> {
  await del(PREFIXO_MODELO + id);
}
