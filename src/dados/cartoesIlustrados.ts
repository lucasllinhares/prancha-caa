import type { Simbolo } from '../tipos';

// ---------------------------------------------------------------------------
// Cartões ilustrados: símbolos cuja imagem já é o cartão inteiro (fundo
// colorido + desenho + palavra). Os arquivos ficam em /public/cartoes e viajam
// junto com o app (funcionam offline).
// ---------------------------------------------------------------------------

const base = import.meta.env.BASE_URL;

function cartao(arquivo: string, texto: string): Simbolo {
  return {
    id: `cartao-${arquivo}`,
    texto,
    cor: 'diversos',
    imagemUrl: `${base}cartoes/${arquivo}.webp`,
    imagemCheia: true
  };
}

/** Primeiro conjunto de teste: as 9 palavras básicas. */
export const CARTOES_ILUSTRADOS: Simbolo[] = [
  cartao('eu', 'eu'),
  cartao('nao', 'não'),
  cartao('mais', 'mais'),
  cartao('acabou', 'acabou'),
  cartao('sim', 'sim'),
  cartao('voce', 'você'),
  cartao('ajuda', 'ajuda'),
  cartao('ir', 'ir'),
  cartao('parar', 'parar')
];
