import { useApp } from '../estado/AppContext';

const ESTRELAS = ['⭐', '✨', '🎉', '✨', '⭐'];

/**
 * Reforço positivo: um breve brilho de estrelinhas no topo da tela depois de
 * falar uma frase completa. Dura menos de 1 segundo, não bloqueia nada
 * (pointer-events: none) e pode ser desligado em Ajustes → Acessibilidade
 * para quem prefere menos estímulo. Some sozinho se prefers-reduced-motion
 * estiver ativo (a marcação `.reforco-positivo` já respeita isso no CSS).
 */
export function ReforcoPositivo() {
  const { comemorando } = useApp();
  if (!comemorando) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-2 z-40 flex justify-center gap-2"
    >
      {ESTRELAS.map((estrela, i) => (
        <span
          key={i}
          className="reforco-positivo text-3xl"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          {estrela}
        </span>
      ))}
    </div>
  );
}
