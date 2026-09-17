import { useState } from 'react';
import { EMOJIS_SUGERIDOS } from '../dados/emojisSugeridos';

interface Props {
  valor?: string;
  onEscolher: (emoji: string) => void;
}

/** Seletor simples de emoji, por grupos, sem depender do teclado do sistema. */
export function EscolherEmoji({ valor, onEscolher }: Props) {
  const [grupoAberto, setGrupoAberto] = useState(EMOJIS_SUGERIDOS[0].grupo);
  const grupo = EMOJIS_SUGERIDOS.find((g) => g.grupo === grupoAberto) ?? EMOJIS_SUGERIDOS[0];

  return (
    <div className="cartao p-2">
      <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
        {EMOJIS_SUGERIDOS.map((g) => (
          <button
            key={g.grupo}
            type="button"
            onClick={() => setGrupoAberto(g.grupo)}
            className={`botao shrink-0 px-3 py-2 text-base ${
              g.grupo === grupoAberto ? 'botao-primario' : ''
            }`}
          >
            {g.grupo}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-6 gap-1 sm:grid-cols-8">
        {grupo.emojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onEscolher(emoji)}
            aria-label={`Usar emoji ${emoji}`}
            aria-pressed={valor === emoji}
            className={`flex min-h-toque min-w-toque items-center justify-center rounded-xl border-2 text-3xl transition-transform duration-rapido active:scale-95 ${
              valor === emoji ? 'border-4 border-violet-600' : ''
            }`}
            style={{ borderColor: valor === emoji ? 'var(--foco)' : 'var(--borda)' }}
          >
            <span aria-hidden="true">{emoji}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
