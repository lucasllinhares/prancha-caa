/** Gera um identificador curto e único, sem depender de bibliotecas. */
export function novoId(prefixo = 'id'): string {
  const aleatorio = Math.random().toString(36).slice(2, 8);
  return `${prefixo}-${Date.now().toString(36)}-${aleatorio}`;
}
