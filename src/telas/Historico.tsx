import { useApp } from '../estado/AppContext';

/** Mostra data e hora de forma curta e legível em pt-BR. */
function quando(ms: number): string {
  return new Date(ms).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Histórico das últimas 30 frases faladas, com botão para repetir qualquer
 * uma e estrela para fixar as favoritas (que aparecem na tela principal).
 */
export function Historico() {
  const { perfil, falarTextoLivre, alternarFavorita, removerDoHistorico, limparHistorico } = useApp();
  const lista = [...perfil.historico].sort((a, b) => {
    if (Boolean(a.favorita) !== Boolean(b.favorita)) return a.favorita ? -1 : 1;
    return b.emMs - a.emMs;
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3 p-3 pb-24">
      <h1 className="titulo-tela">Histórico de frases</h1>
      <p className="text-sm opacity-80">
        As últimas 30 frases faladas. Toque em ⭐ para fixar uma frase favorita e usá-la com um
        toque na tela principal.
      </p>

      {lista.length === 0 ? (
        <p className="cartao text-center font-bold">
          Nenhuma frase falada ainda.
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {lista.map((f) => (
              <li
                key={f.id}
                className="flex items-center gap-2 cartao p-2"
                style={f.favorita ? { borderColor: 'var(--primaria)' } : undefined}
              >
                <button
                  type="button"
                  className="botao botao-primario shrink-0"
                  aria-label={`Falar de novo: ${f.textoFalado}`}
                  onClick={() => falarTextoLivre(f.textoFalado)}
                >
                  🔊 FALAR
                </button>
                <div className="min-w-0 flex-1">
                  <p className="break-words font-bold">{f.textoFalado}</p>
                  <p className="text-sm opacity-70">{quando(f.emMs)}</p>
                </div>
                <button
                  type="button"
                  className="botao shrink-0 px-3"
                  aria-label={f.favorita ? 'Desfixar favorita' : 'Fixar como favorita'}
                  aria-pressed={Boolean(f.favorita)}
                  onClick={() => alternarFavorita(f.id)}
                >
                  {f.favorita ? '⭐' : '☆'}
                </button>
                <button
                  type="button"
                  className="botao shrink-0 px-3"
                  aria-label={`Apagar frase ${f.textoFalado}`}
                  onClick={() => removerDoHistorico(f.id)}
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="botao"
            onClick={() => {
              if (window.confirm('Apagar o histórico? As frases favoritas serão mantidas.')) {
                limparHistorico();
              }
            }}
          >
            🧹 LIMPAR HISTÓRICO (MANTER FAVORITAS)
          </button>
        </>
      )}
    </div>
  );
}
