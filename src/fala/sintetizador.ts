import type { Configuracoes, TomVoz, VelocidadeFala } from '../tipos';

// ---------------------------------------------------------------------------
// Voz do app: Web Speech API (SpeechSynthesis), que já vem no navegador.
// Não há chamada de rede: a voz é a instalada no próprio aparelho.
// ---------------------------------------------------------------------------

const VELOCIDADES: Record<VelocidadeFala, number> = {
  lenta: 0.7,
  normal: 1,
  rapida: 1.35
};

const TONS: Record<TomVoz, number> = {
  grave: 0.8,
  medio: 1,
  agudo: 1.25
};

let vozesEmCache: SpeechSynthesisVoice[] = [];

export function sinteseDisponivel(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Só as vozes em português (pt-BR na frente, pt-PT depois). */
export function vozesPortugues(): SpeechSynthesisVoice[] {
  return vozesEmCache
    .filter((v) => v.lang?.toLowerCase().startsWith('pt'))
    .sort((a, b) => {
      const aBr = a.lang.toLowerCase().includes('br') ? 0 : 1;
      const bBr = b.lang.toLowerCase().includes('br') ? 0 : 1;
      return aBr - bBr || a.name.localeCompare(b.name);
    });
}

/**
 * Carrega a lista de vozes. No Chrome ela chega de forma assíncrona, por isso
 * escutamos `voiceschanged` além de ler na hora.
 */
export function observarVozes(aoAtualizar: (vozes: SpeechSynthesisVoice[]) => void): () => void {
  if (!sinteseDisponivel()) return () => {};

  const atualizar = () => {
    vozesEmCache = window.speechSynthesis.getVoices();
    aoAtualizar(vozesPortugues());
  };

  atualizar();
  window.speechSynthesis.addEventListener('voiceschanged', atualizar);
  // Alguns navegadores só populam depois de um tique.
  const tempo = window.setTimeout(atualizar, 400);

  return () => {
    window.speechSynthesis.removeEventListener('voiceschanged', atualizar);
    window.clearTimeout(tempo);
  };
}

/** Escolhe a voz configurada ou, se não houver, a melhor voz pt-BR do aparelho. */
function escolherVoz(vozURI: string): SpeechSynthesisVoice | undefined {
  const emPortugues = vozesPortugues();
  if (vozURI) {
    const escolhida = emPortugues.find((v) => v.voiceURI === vozURI);
    if (escolhida) return escolhida;
  }
  return emPortugues.find((v) => v.lang.toLowerCase().includes('br')) ?? emPortugues[0];
}

/** Interrompe qualquer fala em andamento. */
export function pararFala(): void {
  if (sinteseDisponivel()) window.speechSynthesis.cancel();
}

/**
 * Fala um texto. Chamadas novas cancelam a anterior, para o app responder
 * rápido quando a pessoa toca em vários símbolos em sequência.
 *
 * `aoMudarEstado` avisa quando a voz começa e termina — é o que liga e desliga
 * o indicador animado de fala na interface.
 */
export function falar(
  texto: string,
  config: Configuracoes,
  aoMudarEstado?: (falando: boolean) => void
): void {
  if (!sinteseDisponivel() || !texto.trim()) return;

  const fala = new SpeechSynthesisUtterance(texto);
  const voz = escolherVoz(config.vozURI);
  if (voz) {
    fala.voice = voz;
    fala.lang = voz.lang;
  } else {
    fala.lang = 'pt-BR';
  }
  fala.rate = VELOCIDADES[config.velocidadeFala];
  fala.pitch = TONS[config.tomVoz];
  fala.volume = 1;

  if (aoMudarEstado) {
    fala.onstart = () => aoMudarEstado(true);
    fala.onend = () => aoMudarEstado(false);
    fala.onerror = () => aoMudarEstado(false);
  }

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(fala);
}
