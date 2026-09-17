import { useEffect, useState } from 'react';
import type { Densidade } from '../tipos';

/**
 * Calcula quantas colunas a grade deve ter.
 *
 * Regra da especificação: 3 colunas no celular em pé, 4 deitado e 6 no
 * desktop. A densidade escolhida nas configurações (4, 6, 9, 12 ou 16
 * símbolos por tela) limita esse número, para os botões nunca ficarem
 * menores que o alvo mínimo de toque.
 */
export function useLayoutGrade(densidade: Densidade): { colunas: number; porPagina: number } {
  const [colunasBase, setColunasBase] = useState(() => calcularColunasBase());

  useEffect(() => {
    const atualizar = () => setColunasBase(calcularColunasBase());
    window.addEventListener('resize', atualizar);
    window.addEventListener('orientationchange', atualizar);
    return () => {
      window.removeEventListener('resize', atualizar);
      window.removeEventListener('orientationchange', atualizar);
    };
  }, []);

  // Limite de colunas por densidade no celular em pé. Em telas maiores
  // permitimos 50% mais colunas (o que dá as 6 colunas do desktop com
  // densidade 12 ou 16), sem nunca passar do número de símbolos da tela.
  const limiteCelular: Record<Densidade, number> = { 4: 2, 6: 3, 9: 3, 12: 4, 16: 4 };
  const limite = colunasBase >= 6 ? Math.round(limiteCelular[densidade] * 1.5) : limiteCelular[densidade];
  const colunas = Math.max(1, Math.min(colunasBase, limite, densidade));

  return { colunas, porPagina: densidade };
}

function calcularColunasBase(): number {
  if (typeof window === 'undefined') return 3;
  const largura = window.innerWidth;
  const deitado = window.innerWidth > window.innerHeight;

  if (largura >= 1024) return 6; // desktop
  if (largura >= 700 || deitado) return 4; // tablet ou celular deitado
  return 3; // celular em pé
}
