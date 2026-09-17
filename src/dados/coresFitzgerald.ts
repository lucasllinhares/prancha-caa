import type { CorFitzgerald } from '../tipos';

/**
 * Padrão Fitzgerald Key: cada categoria gramatical tem uma cor que terapeutas
 * e escolas já reconhecem.
 *
 * Aqui as cores aparecem numa versão saturada (visual de app de jogo), sempre
 * com texto escuro da mesma família de cor — o que mantém contraste WCAG AA
 * mesmo com preenchimento bem vivo. As cores em si ficam definidas como
 * variáveis CSS em `src/index.css` (classes `.tile-*`), para que o tema claro,
 * escuro e de alto contraste possam ajustá-las num só lugar.
 */
export interface DefinicaoCor {
  id: CorFitzgerald;
  rotulo: string;
  descricao: string;
  /** Classe que aplica as variáveis de cor do tile. */
  classes: string;
  /** Cor sólida para as amostras do editor. */
  amostra: string;
}

export const CORES_FITZGERALD: DefinicaoCor[] = [
  {
    id: 'pessoas',
    rotulo: 'Pessoas',
    descricao: 'Pronomes e pessoas (amarelo)',
    classes: 'tile-pessoas',
    amostra: '#ffc93c'
  },
  {
    id: 'acoes',
    rotulo: 'Ações',
    descricao: 'Verbos e ações (verde)',
    classes: 'tile-acoes',
    amostra: '#4ade80'
  },
  {
    id: 'descritivos',
    rotulo: 'Descritivos',
    descricao: 'Adjetivos e sentimentos (azul)',
    classes: 'tile-descritivos',
    amostra: '#7cc4ff'
  },
  {
    id: 'substantivos',
    rotulo: 'Substantivos',
    descricao: 'Coisas, comidas e lugares (laranja)',
    classes: 'tile-substantivos',
    amostra: '#ffa25c'
  },
  {
    id: 'social',
    rotulo: 'Social',
    descricao: 'Palavras sociais (rosa)',
    classes: 'tile-social',
    amostra: '#ff93c4'
  },
  {
    id: 'diversos',
    rotulo: 'Diversos',
    descricao: 'Demais palavras (branco)',
    classes: 'tile-diversos',
    amostra: '#ffffff'
  },
  // Cores extras, usadas principalmente nas capas das pastas.
  {
    id: 'roxo',
    rotulo: 'Roxo',
    descricao: 'Cor extra para capas de pasta',
    classes: 'tile-roxo',
    amostra: '#c9a4ff'
  },
  {
    id: 'turquesa',
    rotulo: 'Turquesa',
    descricao: 'Cor extra para capas de pasta',
    classes: 'tile-turquesa',
    amostra: '#5fe3d0'
  },
  {
    id: 'vermelho',
    rotulo: 'Vermelho',
    descricao: 'Cor extra para capas de pasta',
    classes: 'tile-vermelho',
    amostra: '#ff8b7b'
  },
  {
    id: 'lima',
    rotulo: 'Lima',
    descricao: 'Cor extra para capas de pasta',
    classes: 'tile-lima',
    amostra: '#d9f24d'
  }
];

export function classesDaCor(cor: CorFitzgerald): string {
  return (CORES_FITZGERALD.find((c) => c.id === cor) ?? CORES_FITZGERALD[5]).classes;
}

/** Cor sólida da categoria, para amostras e miniaturas. */
export function amostraDaCor(cor: CorFitzgerald): string {
  return (CORES_FITZGERALD.find((c) => c.id === cor) ?? CORES_FITZGERALD[5]).amostra;
}
