// ---------------------------------------------------------------------------
// Gravação de voz pelo microfone, para guardar a voz de uma pessoa real
// (mãe, pai, terapeuta) num símbolo, em vez de usar a voz sintetizada.
//
// Tudo roda só no navegador: o áudio nunca sai do aparelho. Guardamos como
// data URL (mesma técnica das fotos), para caber no mesmo mecanismo de
// exportar/importar prancha em .json.
// ---------------------------------------------------------------------------

export function gravacaoDisponivel(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== 'undefined'
  );
}

/** Um formato de áudio que o MediaRecorder deste navegador sabe gravar. */
function escolherTipoDeAudio(): string {
  const candidatos = ['audio/webm', 'audio/mp4', 'audio/ogg'];
  for (const tipo of candidatos) {
    if (MediaRecorder.isTypeSupported?.(tipo)) return tipo;
  }
  return '';
}

export interface ControleGravacao {
  /** Para a gravação e devolve o áudio já como data URL. */
  parar: () => Promise<string>;
  /** Cancela sem salvar nada (ex.: a pessoa desistiu no meio). */
  cancelar: () => void;
}

/**
 * Pede permissão do microfone e começa a gravar. Devolve um controle com
 * `parar()` (que resolve com o áudio gravado) e `cancelar()`.
 */
export async function iniciarGravacao(): Promise<ControleGravacao> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const tipo = escolherTipoDeAudio();
  const gravador = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
  const pedacos: BlobPart[] = [];

  gravador.ondataavailable = (evento) => {
    if (evento.data.size > 0) pedacos.push(evento.data);
  };

  const encerrarFaixas = () => stream.getTracks().forEach((faixa) => faixa.stop());

  gravador.start();

  return {
    parar: () =>
      new Promise<string>((resolver, rejeitar) => {
        gravador.onstop = async () => {
          encerrarFaixas();
          try {
            const blob = new Blob(pedacos, { type: gravador.mimeType || tipo || 'audio/webm' });
            resolver(await blobParaDataUrl(blob));
          } catch (erro) {
            rejeitar(erro);
          }
        };
        gravador.stop();
      }),
    cancelar: () => {
      gravador.onstop = null;
      try {
        gravador.stop();
      } catch {
        // já parado — sem problema.
      }
      encerrarFaixas();
    }
  };
}

function blobParaDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader();
    leitor.onload = () => resolver(String(leitor.result));
    leitor.onerror = () => rejeitar(new Error('Falha ao processar o áudio gravado.'));
    leitor.readAsDataURL(blob);
  });
}

/**
 * Toca um áudio gravado (data URL). Mesmo formato de callback de
 * `falar()` em `sintetizador.ts`, para a barra de frase mostrar o
 * indicador de "falando" também para áudios gravados.
 */
export function tocarAudioGravado(dataUrl: string, aoMudarEstado?: (tocando: boolean) => void): void {
  const audio = new Audio(dataUrl);
  if (aoMudarEstado) {
    audio.onplay = () => aoMudarEstado(true);
    audio.onended = () => aoMudarEstado(false);
    audio.onerror = () => aoMudarEstado(false);
    audio.onpause = () => aoMudarEstado(false);
  }
  void audio.play().catch(() => aoMudarEstado?.(false));
}
