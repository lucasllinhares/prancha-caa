import { useState } from 'react';

interface Props {
  pinCorreto: string;
  onLiberar: () => void;
  onCancelar: () => void;
}

/**
 * Tela de PIN que protege o modo editor, para a criança não entrar sem querer.
 * Teclado numérico grande, feito para dedo e não para mouse.
 */
export function BloqueioPin({ pinCorreto, onLiberar, onCancelar }: Props) {
  const [digitado, setDigitado] = useState('');
  const [erro, setErro] = useState(false);

  const teclar = (tecla: string) => {
    setErro(false);
    const novo = (digitado + tecla).slice(0, 4);
    setDigitado(novo);
    if (novo.length === 4) {
      if (novo === pinCorreto) onLiberar();
      else {
        setErro(true);
        setDigitado('');
      }
    }
  };

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-4 p-4">
      <h1 className="titulo-tela text-center">Digite o PIN para editar</h1>

      <div className="flex gap-3" aria-live="polite" aria-label={`${digitado.length} de 4 números`}>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="flex h-14 w-12 items-center justify-center rounded-xl border-2 text-3xl font-extrabold"
            style={{ borderColor: erro ? '#dc2626' : 'var(--borda)' }}
          >
            {digitado[i] ? '•' : ''}
          </span>
        ))}
      </div>

      {erro && (
        <p role="alert" className="font-bold" style={{ color: '#dc2626' }}>
          PIN incorreto. Tente de novo.
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
          <button key={n} type="button" className="botao h-16 text-2xl" onClick={() => teclar(n)}>
            {n}
          </button>
        ))}
        <button
          type="button"
          className="botao h-16"
          onClick={() => setDigitado((d) => d.slice(0, -1))}
          aria-label="Apagar um número"
        >
          ⌫
        </button>
        <button type="button" className="botao h-16 text-2xl" onClick={() => teclar('0')}>
          0
        </button>
        <button type="button" className="botao h-16" onClick={onCancelar}>
          SAIR
        </button>
      </div>
    </div>
  );
}
