import { forwardRef, useMemo, useRef, useState, type CSSProperties, type ForwardedRef } from 'react';
import { larguraEmEm, useFontesProntas } from '../utilidades/larguraTexto';
import type { Simbolo } from '../tipos';
import { classesDaCor } from '../dados/coresFitzgerald';

interface Props {
  simbolo: Simbolo;
  /** data URL da imagem, quando o símbolo usa foto em vez de emoji. */
  imagemUrl?: string;
  onAtivar: (simbolo: Simbolo) => void;
  /** Destaque da varredura automática (scanning). */
  destacado?: boolean;
  /** Versão reduzida, usada na faixa fixa do vocabulário nuclear. */
  compacto?: boolean;
  /** Texto pequeno no canto (ex.: "18 palavras" nas pastas). */
  etiqueta?: string;
  /** Posição na grade, usada para a entrada em sequência dos tiles. */
  indiceEntrada?: number;
}

/**
 * Tile do símbolo: desenho grande direto no tile (sem caixa interna) e a
 * palavra em CAIXA ALTA embaixo, sempre no mesmo tamanho em todos os tiles.
 *
 * Movimento: ao tocar, o tile pula (260ms) e uma onda clara sai do centro —
 * confirmação visual imediata de que o toque funcionou. Tudo é desligado por
 * `prefers-reduced-motion`.
 */
export const BotaoSimbolo = forwardRef(function BotaoSimbolo(
  { simbolo, imagemUrl, onAtivar, destacado, compacto, etiqueta, indiceEntrada }: Props,
  ref: ForwardedRef<HTMLButtonElement>
) {
  const ehPasta = Boolean(simbolo.pranchaDestinoId);
  const emoji = simbolo.emoji || (ehPasta ? '📁' : '🔤');

  // Largura real (em "em") da maior palavra do texto, medida na fonte do app.
  // O CSS divide a largura do bloco por esse número para achar a maior letra
  // que ainda cabe — assim nada é cortado. Quando a fonte termina de carregar,
  // o bloco mede de novo (useFontesProntas).
  const fontesProntas = useFontesProntas();
  const emTexto = useMemo(
    () => larguraEmEm(simbolo.texto),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [simbolo.texto, fontesProntas]
  );

  // Cada toque gera uma onda com id próprio, que se apaga sozinha no fim.
  const [ondas, setOndas] = useState<number[]>([]);
  const [pulando, setPulando] = useState(false);
  const proximaOnda = useRef(0);

  const aoTocar = () => {
    const id = proximaOnda.current++;
    setOndas((atual) => [...atual, id]);
    setPulando(true);
    window.setTimeout(() => setOndas((atual) => atual.filter((o) => o !== id)), 400);
    window.setTimeout(() => setPulando(false), 280);
    onAtivar(simbolo);
  };

  return (
    <button
      ref={ref}
      type="button"
      data-varredura={destacado ? 'ativo' : undefined}
      onClick={aoTocar}
      aria-label={ehPasta ? `Abrir pasta ${simbolo.texto}` : simbolo.texto}
      className={[
        'botao-simbolo tile-medido relative flex min-h-toque min-w-toque flex-col items-center justify-center',
        'h-full w-full overflow-hidden border-2 text-center',
        compacto ? 'gap-0.5 rounded-2xl px-0.5 pb-1 pt-1' : 'gap-1 rounded-3xl px-1.5 pb-1.5 pt-1',
        ehPasta && !compacto ? 'capa-pasta' : '',
        pulando ? 'tocado' : '',
        indiceEntrada !== undefined ? 'entrando' : '',
        classesDaCor(simbolo.cor)
      ].join(' ')}
      style={
        indiceEntrada !== undefined
          ? { animationDelay: `${Math.min(indiceEntrada, 15) * 22}ms` }
          : undefined
      }
    >
      {/* Ondas de toque */}
      {ondas.map((id) => (
        <span key={id} aria-hidden="true" className="onda-toque" />
      ))}

      {/* Desenho dentro de um círculo claro. O círculo é quadrado e cresce até
          onde sobra altura no tile; o emoji é dimensionado a partir do próprio
          círculo, então nunca fica cortado. */}
      <span
        className={[
          'prato-emoji relative z-[1] flex items-center justify-center rounded-full',
          compacto ? 'h-8 w-8 flex-none' : 'min-h-[26px] flex-1'
        ].join(' ')}
        style={compacto ? undefined : { aspectRatio: '1', width: 'auto', maxWidth: '100%' }}
      >
        {imagemUrl ? (
          <img
            src={imagemUrl}
            alt=""
            className="h-full w-full rounded-full object-cover"
            draggable={false}
          />
        ) : (
          <span aria-hidden="true" className="emoji-simbolo">
            {emoji}
          </span>
        )}
      </span>

      <span
        lang="pt-BR"
        className="texto-simbolo relative z-[1] w-full shrink-0 font-black uppercase"
        style={{ '--em-texto': emTexto } as CSSProperties}
      >
        {simbolo.texto}
      </span>

      {/* A etiqueta flutua no canto: não ocupa altura, então o ícone pode
          ficar o maior possível dentro do tile. */}
      {etiqueta && !compacto && (
        <span aria-hidden="true" className="etiqueta-tile absolute right-1.5 top-1.5 z-[2]">
          {etiqueta}
        </span>
      )}
    </button>
  );
});
