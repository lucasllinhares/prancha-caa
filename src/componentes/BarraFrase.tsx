import { useApp } from '../estado/AppContext';
import { classesDaCor } from '../dados/coresFitzgerald';

/**
 * Barra de frase fixa no topo.
 *
 * Mostra os símbolos escolhidos em sequência com texto grande (mínimo 24px),
 * a prévia do que a voz vai falar e os três comandos principais:
 * FALAR, APAGAR ÚLTIMO e LIMPAR TUDO.
 *
 * Movimento: cada palavra nova entra com um "pop" e, enquanto a voz fala,
 * três barrinhas sobem e descem — a pessoa vê que o app está falando.
 */
export function BarraFrase() {
  const { frase, textoFrase, imagens, falarFrase, apagarUltimo, limparFrase, falando, criarRotina } =
    useApp();
  const vazia = frase.length === 0;

  const salvarComoRotina = () => {
    const nome = window.prompt('Nome da rotina (ex.: "hora de dormir"):');
    if (!nome?.trim()) return;
    criarRotina(nome.trim(), frase[0]?.emoji || '🔁');
    window.alert(`Rotina "${nome.trim()}" salva! Ela aparece na tela principal, em 🔁 ROTINAS.`);
  };

  return (
    <header
      className="sticky top-0 z-30 px-2 pb-2 pt-2 sm:px-3 lg:px-4"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)',
        background:
          'linear-gradient(to bottom, var(--fundo) 62%, color-mix(in srgb, var(--fundo) 60%, transparent))'
      }}
    >
      <div className="cartao flex flex-col gap-2 p-2 sm:gap-3 sm:p-3">
        {/* Sequência de símbolos escolhidos */}
        <div
          className="flex min-h-[84px] items-center gap-2 overflow-x-auto rounded-2xl border-2 border-dashed p-2"
          style={{ borderColor: 'var(--borda)', background: 'var(--cartao-2)' }}
          aria-live="polite"
          aria-label="Frase em construção"
        >
          {vazia ? (
            <p
              className="px-2 font-extrabold"
              style={{ fontSize: 'max(24px, 1.2rem)', color: 'var(--texto-suave)' }}
            >
              Toque nos símbolos para montar a frase
            </p>
          ) : (
            frase.map((simbolo, i) => (
              <span
                key={`${simbolo.id}-${i}`}
                className={`botao-simbolo flex shrink-0 items-center gap-2 rounded-2xl border-2 px-3 py-1.5 ${
                  i === frase.length - 1 ? 'chip-novo' : ''
                } ${classesDaCor(simbolo.cor)}`}
                style={{ boxShadow: '0 3px 0 var(--tile-borda)' }}
              >
                {/* Mesmo círculo dos tiles, para a palavra na frase ter a
                    mesma aparência do símbolo que foi tocado. */}
                <span className="prato-emoji flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
                  {simbolo.imagemId && imagens[simbolo.imagemId] ? (
                    <img
                      src={imagens[simbolo.imagemId]}
                      alt=""
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <span aria-hidden="true" className="emoji-simbolo">
                      {simbolo.emoji || '🔤'}
                    </span>
                  )}
                </span>
                <span className="font-black uppercase" style={{ fontSize: 'max(24px, 1.15rem)' }}>
                  {simbolo.texto}
                </span>
              </span>
            ))
          )}
        </div>

        {/* Prévia da frase, já com os ajustes de concordância */}
        {!vazia && (
          <p
            className="flex items-center gap-2 truncate px-1 font-bold"
            style={{ fontSize: 'max(15px, 0.95rem)', color: 'var(--texto-suave)' }}
          >
            {falando ? (
              <span
                aria-hidden="true"
                className="flex h-4 shrink-0 items-end gap-0.5"
                style={{ color: 'var(--primaria)' }}
              >
                <i className="barra-voz h-2" />
                <i className="barra-voz h-4" />
                <i className="barra-voz h-3" />
              </span>
            ) : (
              <span aria-hidden="true">🔈</span>
            )}
            <span className="truncate">{falando ? 'falando…' : `vai falar: “${textoFrase}”`}</span>
          </p>
        )}

        {/* Comandos */}
        <div className="flex gap-2">
          <button
            type="button"
            className="botao botao-falar flex-[2] text-xl"
            onClick={falarFrase}
            disabled={vazia}
          >
            <span aria-hidden="true" className="text-2xl">
              🔊
            </span>{' '}
            FALAR
          </button>
          <button
            type="button"
            className="botao min-w-0 flex-1 flex-col gap-0 px-1 text-[13px] leading-tight sm:flex-row sm:gap-2 sm:px-4 sm:text-base"
            onClick={apagarUltimo}
            disabled={vazia}
            aria-label="Apagar a última palavra"
          >
            <span aria-hidden="true">⌫</span> APAGAR
          </button>
          <button
            type="button"
            className="botao min-w-0 flex-1 flex-col gap-0 px-1 text-[13px] leading-tight sm:flex-row sm:gap-2 sm:px-4 sm:text-base"
            onClick={limparFrase}
            disabled={vazia}
            aria-label="Limpar a frase toda"
          >
            <span aria-hidden="true">🧹</span> LIMPAR
          </button>
        </div>

        {!vazia && (
          <button type="button" className="botao w-full normal-case" onClick={salvarComoRotina}>
            <span aria-hidden="true">💾</span> Salvar esta frase como rotina
          </button>
        )}
      </div>
    </header>
  );
}
