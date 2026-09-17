import type { Simbolo } from '../tipos';

// ---------------------------------------------------------------------------
// Montagem da frase em português natural.
//
// No vocabulário, os verbos já vêm conjugados na primeira pessoa ("quero",
// "gosto"), como nas pranchas usadas por terapeutas no Brasil. Ainda assim,
// a sequência de símbolos precisa de alguns ajustes antes de ir para o
// sintetizador de voz, senão sai "eu querer água" ou "eu gosto música".
//
// As regras aqui são deliberadamente simples e previsíveis:
//   1. verbo no infinitivo logo depois de pronome  -> conjuga ("eu ir" -> "eu vou")
//   2. pronome + estado/sentimento                 -> insere o verbo ser/estar
//   3. "gosto" + coisa                             -> insere "de"
//   4. verbo de movimento + lugar                  -> insere "para o/a"
//   5. contrações                                  -> "de o" -> "do", "a o" -> "ao"
//   6. remove repetição imediata da mesma palavra
//   7. primeira letra maiúscula e pontuação final
// ---------------------------------------------------------------------------

/** Conjugação dos infinitivos que existem no vocabulário inicial. */
const CONJUGACOES: Record<string, { eu: string; ele: string }> = {
  ir: { eu: 'vou', ele: 'vai' },
  parar: { eu: 'paro', ele: 'para' },
  comer: { eu: 'como', ele: 'come' },
  dormir: { eu: 'durmo', ele: 'dorme' },
  brincar: { eu: 'brinco', ele: 'brinca' },
  assistir: { eu: 'assisto', ele: 'assiste' },
  desenhar: { eu: 'desenho', ele: 'desenha' },
  vestir: { eu: 'visto', ele: 'veste' },
  sair: { eu: 'saio', ele: 'sai' },
  entrar: { eu: 'entro', ele: 'entra' },
  abrir: { eu: 'abro', ele: 'abre' },
  fechar: { eu: 'fecho', ele: 'fecha' },
  esperar: { eu: 'espero', ele: 'espera' },
  passear: { eu: 'passeio', ele: 'passeia' },
  banho: { eu: 'tomo banho', ele: 'toma banho' },
  'escovar dente': { eu: 'escovo o dente', ele: 'escova o dente' },
  'ouvir música': { eu: 'ouço música', ele: 'ouve música' },
  'usar o celular': { eu: 'uso o celular', ele: 'usa o celular' },
  'beber água': { eu: 'bebo água', ele: 'bebe água' },
  'trocar de roupa': { eu: 'troco de roupa', ele: 'troca de roupa' },
  'sair daqui': { eu: 'saio daqui', ele: 'sai daqui' }
};

/** Pronomes que funcionam como sujeito da frase. */
const PRONOMES: Record<string, 'eu' | 'ele'> = {
  eu: 'eu',
  você: 'ele',
  voce: 'ele',
  ele: 'ele',
  ela: 'ele'
};

/** Estados e sentimentos: pedem "estou"/"está" depois do pronome. */
const ESTADOS = new Set([
  'feliz',
  'triste',
  'bravo',
  'com medo',
  'cansado',
  'com dor',
  'entediado',
  'animado',
  'nervoso',
  'confuso',
  'com sono',
  'tranquilo',
  'com saudade',
  'envergonhado',
  'com frio',
  'com calor'
]);

/** Lugares e o artigo que combina com cada um. */
const LUGARES: Record<string, 'o' | 'a' | ''> = {
  casa: '',
  escola: 'a',
  terapia: 'a',
  mercado: 'o',
  parque: 'o',
  quarto: 'o',
  banheiro: 'o',
  cozinha: 'a',
  carro: 'o',
  ônibus: 'o',
  igreja: 'a',
  praia: 'a',
  sala: 'a',
  recreio: 'o'
};

/** Verbos que indicam deslocamento e aceitam "para o/a <lugar>". */
const VERBOS_MOVIMENTO = new Set(['vou', 'vai', 'quero ir', 'saio', 'sai', 'passeio', 'passeia']);

/** Verbos que pedem a preposição "de" antes do complemento. */
const VERBOS_COM_DE = new Set(['gosto', 'não gosto', 'gosta', 'não gosta']);

/** Palavras que já são preposições ou ligações: não inserimos outra antes. */
const PALAVRAS_LIGACAO = new Set(['de', 'do', 'da', 'para', 'em', 'no', 'na', 'com', 'ao', 'à']);

const PALAVRAS_PERGUNTA = new Set(['quem é', 'pode repetir', 'o que', 'onde']);

/** Texto que um símbolo manda para a voz. */
export function textoDoSimbolo(simbolo: Simbolo): string {
  return (simbolo.textoFala ?? simbolo.texto).trim();
}

function ehInfinitivo(palavra: string): boolean {
  return Object.prototype.hasOwnProperty.call(CONJUGACOES, palavra);
}

/**
 * Aplica as regras de concordância e devolve a frase pronta para ser falada.
 */
export function montarFrase(simbolos: Simbolo[]): string {
  const bruto = simbolos.map(textoDoSimbolo).filter(Boolean);
  if (bruto.length === 0) return '';

  const palavras: string[] = [];
  let sujeito: 'eu' | 'ele' | null = null;

  for (let i = 0; i < bruto.length; i++) {
    const atual = bruto[i].toLowerCase();
    const anterior = palavras.length ? palavras[palavras.length - 1].toLowerCase() : '';

    // Regra 6: ignora repetição imediata da mesma palavra (toque duplicado).
    if (atual === anterior) continue;

    // Marca o sujeito quando aparece um pronome.
    if (PRONOMES[atual] && palavras.length === 0) {
      sujeito = PRONOMES[atual];
      palavras.push(bruto[i]);
      continue;
    }
    if (PRONOMES[atual]) {
      // Pronome no meio da frase ainda pode ser sujeito de um novo verbo.
      if (!sujeito) sujeito = PRONOMES[atual];
      palavras.push(bruto[i]);
      continue;
    }

    // Regra 1: infinitivo logo depois do sujeito vira verbo conjugado.
    if (ehInfinitivo(atual) && (PRONOMES[anterior] || (anterior === '' && sujeito))) {
      const pessoa = PRONOMES[anterior] ?? sujeito ?? 'eu';
      palavras.push(CONJUGACOES[atual][pessoa]);
      continue;
    }

    // Regra 2: pronome + sentimento ganha "estou"/"está".
    if (ESTADOS.has(atual) && PRONOMES[anterior]) {
      palavras.push(PRONOMES[anterior] === 'eu' ? 'estou' : 'está');
      palavras.push(bruto[i]);
      continue;
    }

    // Regra 3: "gosto" pede "de".
    if (
      VERBOS_COM_DE.has(anterior) &&
      !PALAVRAS_LIGACAO.has(atual) &&
      !atual.startsWith('de ')
    ) {
      palavras.push('de');
      palavras.push(bruto[i]);
      continue;
    }

    // "quero" + lugar vira "quero ir ao/para a <lugar>", que é como se fala.
    if (
      (anterior === 'quero' || anterior === 'não quero') &&
      Object.prototype.hasOwnProperty.call(LUGARES, atual)
    ) {
      const artigo = LUGARES[atual];
      palavras.push(artigo === 'o' ? 'ir ao' : artigo === 'a' ? 'ir para a' : 'ir para');
      palavras.push(bruto[i]);
      continue;
    }

    // Regra 4: verbo de movimento + lugar ganha "para o/a".
    const doisAnteriores = palavras.slice(-2).join(' ').toLowerCase();
    const ehMovimento = VERBOS_MOVIMENTO.has(anterior) || VERBOS_MOVIMENTO.has(doisAnteriores);
    if (ehMovimento && Object.prototype.hasOwnProperty.call(LUGARES, atual)) {
      const artigo = LUGARES[atual];
      palavras.push(artigo ? `para ${artigo}` : 'para');
      palavras.push(bruto[i]);
      continue;
    }

    palavras.push(bruto[i]);
  }

  let frase = palavras.join(' ');

  // Regra 5: contrações mais comuns.
  frase = frase
    .replace(/\bde o\b/gi, 'do')
    .replace(/\bde a\b/gi, 'da')
    .replace(/\bem o\b/gi, 'no')
    .replace(/\bem a\b/gi, 'na')
    .replace(/\ba o\b/gi, 'ao')
    .replace(/\bde el[ea]\b/gi, 'dele')
    .replace(/\s+/g, ' ')
    .trim();

  // Regra 7: maiúscula inicial e pontuação final.
  frase = frase.charAt(0).toUpperCase() + frase.slice(1);
  const ehPergunta = [...PALAVRAS_PERGUNTA].some((p) => frase.toLowerCase().includes(p));
  if (!/[.!?]$/.test(frase)) frase += ehPergunta ? '?' : '.';

  return frase;
}
