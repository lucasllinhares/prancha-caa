import { useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Medição da largura real do texto dos blocos.
//
// Para o texto NUNCA ser cortado, o tamanho da letra de cada bloco é calculado
// a partir da largura verdadeira da maior palavra (em caixa alta e negrito, na
// fonte do app) — e não de uma estimativa por número de letras, que erra até
// 10% (letras como M, O e Q são bem mais largas que I ou L).
//
// A medição usa um <canvas> (barato e sem mexer no layout). Antes da fonte
// terminar de carregar, usamos a estimativa; quando ela carrega, os blocos são
// avisados e medem de novo.
// ---------------------------------------------------------------------------

const FONTE = '900 100px "Nunito Variable", "Nunito", system-ui, sans-serif';
/** Espaçamento entre letras usado no CSS (.texto-simbolo), em em. */
const ESPACAMENTO_EM = -0.02;
/** Folga de segurança sobre a medida (arredondamentos, antialiasing). */
const FOLGA = 1.05;

let fontesProntas = false;
const ouvintes = new Set<() => void>();

if (typeof document !== 'undefined' && document.fonts) {
  // Passar texto com acentos garante que o subconjunto latino seja baixado.
  document.fonts
    .load('900 16px "Nunito Variable"', 'ABCÇÃÕÉÊÍÓÚâãçéêíóõú')
    .then(() => document.fonts.ready)
    .then(() => {
      fontesProntas = true;
      limparCache();
      ouvintes.forEach((avisar) => avisar());
    })
    .catch(() => undefined);
}

let contexto: CanvasRenderingContext2D | null = null;
const cache = new Map<string, number>();

function limparCache() {
  cache.clear();
}

function estimar(palavra: string): number {
  return palavra.length * (palavra.length <= 6 ? 0.74 : 0.68);
}

function larguraDaPalavra(palavra: string): number {
  const maiuscula = palavra.toUpperCase();
  if (!fontesProntas) return estimar(palavra);

  const guardada = cache.get(maiuscula);
  if (guardada !== undefined) return guardada;

  try {
    if (!contexto) contexto = document.createElement('canvas').getContext('2d');
    if (!contexto) return estimar(palavra);
    contexto.font = FONTE;
    const largura = contexto.measureText(maiuscula).width / 100 + ESPACAMENTO_EM * maiuscula.length;
    cache.set(maiuscula, largura);
    return largura;
  } catch {
    return estimar(palavra);
  }
}

/** Largura (em "em") da maior palavra do texto, já com folga de segurança. */
export function larguraEmEm(texto: string): number {
  const palavras = texto.trim().split(/\s+/).filter(Boolean);
  const maior = palavras.reduce((max, p) => Math.max(max, larguraDaPalavra(p)), 0);
  return Math.max(maior, 1.6) * FOLGA;
}

/** Re-renderiza o componente quando a fonte do app termina de carregar. */
export function useFontesProntas(): boolean {
  const [pronto, setPronto] = useState(fontesProntas);
  useEffect(() => {
    if (fontesProntas) {
      setPronto(true);
      return;
    }
    const avisar = () => setPronto(true);
    ouvintes.add(avisar);
    return () => {
      ouvintes.delete(avisar);
    };
  }, []);
  return pronto;
}
