import type { CorFitzgerald, Prancha, Simbolo } from '../tipos';
import { PRANCHAS_CATEGORIA } from './vocabularioInicial';
import { novoId } from '../utilidades/id';

// ---------------------------------------------------------------------------
// Modelos de prancheta prontos.
//
// Cada modelo é uma receita: uma lista de categorias, montadas a partir do
// vocabulário de fábrica. Ao usar um modelo, o app cria cópias novas (com ids
// próprios) — a pessoa pode então mexer à vontade, sem afetar o modelo nem
// as pranchetas de outros alunos.
// ---------------------------------------------------------------------------

type CategoriaDeFabrica = (typeof PRANCHAS_CATEGORIA)[number];

/** Todos os símbolos de fábrica, por id (o "banco de palavras"). */
const BANCO = new Map<string, Simbolo>(
  PRANCHAS_CATEGORIA.flatMap((c) => c.simbolos).map((s) => [s.id, s])
);

/** Uma categoria de fábrica inteira, ou uma categoria montada com palavras escolhidas. */
export type EspecCategoria =
  | { categoriaId: string }
  | { nome: string; emoji: string; cor: CorFitzgerald; palavras: string[] };

export interface ModeloPronto {
  id: string;
  nome: string;
  emoji: string;
  descricao: string;
  categorias: EspecCategoria[];
}

const todas = PRANCHAS_CATEGORIA.map((c) => ({ categoriaId: c.id }));

export const MODELOS_PRONTOS: ModeloPronto[] = [
  {
    id: 'modelo-completa',
    nome: 'Completa',
    emoji: '🧰',
    descricao: 'Todas as categorias de fábrica — o ponto de partida mais amplo.',
    categorias: todas
  },
  {
    id: 'modelo-escola',
    nome: 'Escola',
    emoji: '🏫',
    descricao: 'Sala de aula, lanche, colegas, professora, números, cores e dias da semana.',
    categorias: [
      { categoriaId: 'p-escola' },
      { categoriaId: 'p-sentimentos' },
      { categoriaId: 'p-necessidades' },
      { categoriaId: 'p-social' },
      { categoriaId: 'p-pessoas' },
      {
        nome: 'Lanche',
        emoji: '🥪',
        cor: 'substantivos',
        palavras: [
          'com-pao', 'com-suco', 'com-fruta', 'com-bolacha', 'com-agua', 'com-leite',
          'com-iogurte', 'com-banana'
        ]
      },
      { categoriaId: 'p-dias' },
      { categoriaId: 'p-numeros' },
      { categoriaId: 'p-cores' }
    ]
  },
  {
    id: 'modelo-casa',
    nome: 'Casa',
    emoji: '🏠',
    descricao: 'Rotina do dia, comida, higiene, família e sentimentos.',
    categorias: [
      { categoriaId: 'p-necessidades' },
      { categoriaId: 'p-comida' },
      { categoriaId: 'p-sentimentos' },
      { categoriaId: 'p-pessoas' },
      {
        nome: 'Minha rotina',
        emoji: '⏰',
        cor: 'roxo',
        palavras: [
          'aco-banho', 'aco-escovar', 'aco-vestir', 'nec-dormir', 'nec-comer', 'aco-assistir',
          'aco-brincar', 'lug-quarto', 'lug-cozinha', 'lug-banheiro'
        ]
      },
      { categoriaId: 'p-higiene' },
      { categoriaId: 'p-acoes' },
      { categoriaId: 'p-lugares' }
    ]
  },
  {
    id: 'modelo-refeicao',
    nome: 'Hora da refeição',
    emoji: '🍽️',
    descricao: 'Pedir comida e bebida, dizer que acabou ou que não gosta.',
    categorias: [
      { categoriaId: 'p-comida' },
      { categoriaId: 'p-necessidades' },
      { categoriaId: 'p-sentimentos' },
      { categoriaId: 'p-social' },
      { categoriaId: 'p-pessoas' }
    ]
  },
  {
    id: 'modelo-brincadeiras',
    nome: 'Brincadeiras',
    emoji: '🧸',
    descricao: 'Escolher o que brincar, com quem, cores, números e sentimentos.',
    categorias: [
      {
        nome: 'Brincar',
        emoji: '🎈',
        cor: 'acoes',
        palavras: [
          'aco-brincar', 'aco-desenhar', 'aco-musica', 'aco-assistir', 'aco-celular',
          'lug-parque', 'pes-amigo', 'aco-passear'
        ]
      },
      { categoriaId: 'p-acoes' },
      { categoriaId: 'p-cores' },
      { categoriaId: 'p-numeros' },
      { categoriaId: 'p-sentimentos' },
      { categoriaId: 'p-social' },
      { categoriaId: 'p-pessoas' }
    ]
  },
  {
    id: 'modelo-terapia',
    nome: 'Terapia e saúde',
    emoji: '🩺',
    descricao: 'Consultas e terapia: dor, corpo, remédio, sentimentos e quem cuida.',
    categorias: [
      {
        nome: 'Consulta',
        emoji: '🏥',
        cor: 'vermelho',
        palavras: [
          'lug-terapia', 'pes-terapeuta', 'pes-medico', 'lug-medico', 'sen-dor', 'nec-remedio',
          'nec-silencio', 'nec-agua'
        ]
      },
      { categoriaId: 'p-sentimentos' },
      { categoriaId: 'p-corpo' },
      { categoriaId: 'p-necessidades' },
      { categoriaId: 'p-pessoas' },
      { categoriaId: 'p-higiene' },
      { categoriaId: 'p-social' }
    ]
  },
  {
    id: 'modelo-passeio',
    nome: 'Passeio',
    emoji: '🚌',
    descricao: 'Sair de casa: lugares, transporte, clima, comida e necessidades.',
    categorias: [
      {
        nome: 'Passeio',
        emoji: '🚗',
        cor: 'turquesa',
        palavras: [
          'lug-carro', 'lug-onibus', 'lug-parque', 'lug-praia', 'lug-mercado', 'lug-igreja',
          'aco-passear', 'nec-banheiro'
        ]
      },
      { categoriaId: 'p-lugares' },
      { categoriaId: 'p-clima' },
      { categoriaId: 'p-comida' },
      { categoriaId: 'p-necessidades' },
      { categoriaId: 'p-social' },
      { categoriaId: 'p-pessoas' }
    ]
  }
];

/** Uma categoria já montada: a prancha com seus símbolos e o botão que a abre. */
export interface CategoriaMontada {
  prancha: Prancha;
  botao: Simbolo;
}

function copiarSimbolo(s: Simbolo): Simbolo {
  return { ...s, id: novoId('sim'), pranchaDestinoId: undefined };
}

function dadosDaEspec(spec: EspecCategoria): {
  nome: string;
  emoji: string;
  cor: CorFitzgerald;
  simbolos: Simbolo[];
} | null {
  if ('categoriaId' in spec) {
    const cat: CategoriaDeFabrica | undefined = PRANCHAS_CATEGORIA.find(
      (c) => c.id === spec.categoriaId
    );
    return cat
      ? { nome: cat.nome, emoji: cat.emoji ?? '📁', cor: cat.cor, simbolos: cat.simbolos }
      : null;
  }
  const simbolos = spec.palavras
    .map((id) => BANCO.get(id))
    .filter((s): s is Simbolo => Boolean(s));
  return { nome: spec.nome, emoji: spec.emoji, cor: spec.cor, simbolos };
}

/** Monta as categorias de um modelo, com ids novos em tudo. */
export function montarCategorias(modelo: ModeloPronto): CategoriaMontada[] {
  const montadas: CategoriaMontada[] = [];
  for (const spec of modelo.categorias) {
    const dados = dadosDaEspec(spec);
    if (!dados) continue;
    const pranchaId = novoId('prancha');
    montadas.push({
      prancha: {
        id: pranchaId,
        nome: dados.nome,
        emoji: dados.emoji,
        simbolos: dados.simbolos.map(copiarSimbolo)
      },
      botao: {
        id: novoId('sim'),
        texto: dados.nome,
        emoji: dados.emoji,
        cor: dados.cor,
        pranchaDestinoId: pranchaId
      }
    });
  }
  return montadas;
}

/** Monta a prancheta completa de um modelo: Início + todas as categorias. */
export function montarPranchasDoModelo(modelo: ModeloPronto): Prancha[] {
  const categorias = montarCategorias(modelo);
  const inicial: Prancha = {
    id: novoId('prancha'),
    nome: 'Início',
    emoji: '🏠',
    inicial: true,
    simbolos: categorias.map((c) => c.botao)
  };
  return [inicial, ...categorias.map((c) => c.prancha)];
}

/** Quantas categorias e palavras um modelo tem (para mostrar no cartão). */
export function resumoDoModelo(modelo: ModeloPronto): { categorias: number; palavras: number } {
  const montadas = modelo.categorias
    .map(dadosDaEspec)
    .filter((d): d is NonNullable<ReturnType<typeof dadosDaEspec>> => d !== null);
  return {
    categorias: montadas.length,
    palavras: montadas.reduce((total, d) => total + d.simbolos.length, 0)
  };
}

// --- Banco de palavras (para a pessoa escolher palavras avulsas) --------------

export interface GrupoDePalavras {
  id: string;
  nome: string;
  emoji: string;
  cor: CorFitzgerald;
  simbolos: Simbolo[];
}

/** As palavras de fábrica, agrupadas por categoria, para escolher uma a uma. */
export function gruposDoBanco(): GrupoDePalavras[] {
  return PRANCHAS_CATEGORIA.map((c) => ({
    id: c.id,
    nome: c.nome,
    emoji: c.emoji ?? '📁',
    cor: c.cor,
    simbolos: c.simbolos
  }));
}

/** Cópia de um símbolo do banco, pronta para entrar numa prancha. */
export function copiarDoBanco(simbolo: Simbolo): Simbolo {
  return copiarSimbolo(simbolo);
}
