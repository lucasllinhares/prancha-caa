import { useEffect, useState } from 'react';
import type { Densidade } from '../tipos';

/**
 * Calcula quantas colunas a grade deve ter, pela largura real da tela:
 * 3 colunas no celular em pé, 4 no celular deitado/tablet e 6 no
 * computador. Esse número não depende da densidade escolhida — a
 * densidade só decide quantos símbolos cabem em cada página (paginação);
 * quem decide o número de colunas é o tamanho da tela, para o layout ficar
 * sempre bem proporcionado, do celular ao monitor grande.
 *
 * Quando uma página tem menos símbolos do que colunas (ex.: só restaram 2
 * símbolos na última página), quem chama este gancho deve limitar as
 * colunas ao número de itens daquela página — assim a última fileira não
 * fica esticada e vazia. Isso é feito em `Comunicador.tsx`.
 */
export function useLayoutGrade(densidade: Densidade): { colunas: number; porPagina: number } {
  const [colunas, setColunas] = useState(() => calcularColunas());

  useEffect(() => {
    const atualizar = () => setColunas(calcularColunas());
    window.addEventListener('resize', atualizar);
    window.addEventListener('orientationchange', atualizar);
    return () => {
      window.removeEventListener('resize', atualizar);
      window.removeEventListener('orientationchange', atualizar);
    };
  }, []);

  return { colunas, porPagina: densidade };
}

function calcularColunas(): number {
  if (typeof window === 'undefined') return 3;
  const largura = window.innerWidth;
  const deitado = window.innerWidth > window.innerHeight;

  if (largura >= 1024) return 6; // computador e tablet deitado grande
  if (largura >= 700 || deitado) return 4; // tablet em pé ou celular deitado
  return 3; // celular em pé
}
