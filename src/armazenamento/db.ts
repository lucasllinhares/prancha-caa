import { get, set, del, keys } from 'idb-keyval';
import type { Configuracoes, EstadoPersistido, Perfil } from '../tipos';
import { criarPranchasIniciais } from '../dados/vocabularioInicial';
import { novoId } from '../utilidades/id';

// ---------------------------------------------------------------------------
// Persistência local. Tudo fica no IndexedDB do próprio dispositivo:
// nenhum dado é enviado para servidor algum.
//
//  chave 'caa:estado'      -> perfis, configurações, pranchas e histórico
//  chave 'caa:img:<id>'    -> imagens (data URL já redimensionada)
// ---------------------------------------------------------------------------

const CHAVE_ESTADO = 'caa:estado';
const PREFIXO_IMAGEM = 'caa:img:';
export const VERSAO_DADOS = 1;

export const CONFIGURACOES_PADRAO: Configuracoes = {
  velocidadeFala: 'normal',
  tomVoz: 'medio',
  vozURI: '',
  falarAoTocar: true,
  densidade: 9,
  tamanhoFonte: 'medio',
  tema: 'claro',
  pinEditor: '',
  varreduraAtiva: false,
  varreduraIntervalo: 2,
  mostrarNucleo: true
};

/** Perfil semeado no primeiro uso, já com todo o vocabulário pronto. */
export function criarPerfil(nome = 'Meu perfil'): Perfil {
  return {
    id: novoId('perfil'),
    nome,
    pranchas: criarPranchasIniciais(),
    configuracoes: { ...CONFIGURACOES_PADRAO },
    historico: []
  };
}

export function estadoInicial(): EstadoPersistido {
  const perfil = criarPerfil();
  return { versao: VERSAO_DADOS, perfis: [perfil], perfilAtivoId: perfil.id };
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
    // Garante que configurações novas (de versões futuras) tenham valor.
    salvo.perfis = salvo.perfis.map((p) => ({
      ...p,
      configuracoes: { ...CONFIGURACOES_PADRAO, ...p.configuracoes },
      historico: p.historico ?? []
    }));
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
  const resultado: Record<string, string> = {};
  try {
    const todasChaves = await comLimiteDeTempo(keys(), LIMITE_LEITURA_MS);
    if (todasChaves === 'tempo-esgotado') return resultado;
    for (const chave of todasChaves) {
      if (typeof chave === 'string' && chave.startsWith(PREFIXO_IMAGEM)) {
        const valor = await get<string>(chave);
        if (valor) resultado[chave.slice(PREFIXO_IMAGEM.length)] = valor;
      }
    }
  } catch (erro) {
    console.warn('Não foi possível ler as imagens salvas:', erro);
  }
  return resultado;
}
