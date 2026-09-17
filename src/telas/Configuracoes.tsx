import { useEffect, useState } from 'react';
import { useApp } from '../estado/AppContext';
import { observarVozes, sinteseDisponivel } from '../fala/sintetizador';
import type { Densidade, TamanhoFonte, Tema, TomVoz, VelocidadeFala } from '../tipos';

/** Grupo de botões que funcionam como um seletor único, grande e tocável. */
function Opcoes<T extends string | number>({
  titulo,
  valor,
  opcoes,
  onEscolher
}: {
  titulo: string;
  valor: T;
  opcoes: { valor: T; rotulo: string }[];
  onEscolher: (v: T) => void;
}) {
  return (
    <div>
      <span className="rotulo-campo">{titulo}</span>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((o) => (
          <button
            key={String(o.valor)}
            type="button"
            aria-pressed={valor === o.valor}
            onClick={() => onEscolher(o.valor)}
            className={`botao ${valor === o.valor ? 'botao-primario' : ''}`}
          >
            {o.rotulo}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Configuracoes() {
  const { config, atualizarConfig, falarTextoLivre } = useApp();
  const [vozes, setVozes] = useState<SpeechSynthesisVoice[]>([]);
  const [pin, setPin] = useState('');

  useEffect(() => observarVozes(setVozes), []);

  const definirPin = () => {
    if (!/^\d{4}$/.test(pin)) {
      window.alert('O PIN precisa ter exatamente 4 números.');
      return;
    }
    atualizarConfig({ pinEditor: pin });
    setPin('');
    window.alert('Bloqueio de edição ativado. Guarde bem o PIN.');
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 p-3 pb-24">
      <h1 className="titulo-tela">Configurações</h1>

      {/* --- Voz ------------------------------------------------------------ */}
      <section className="flex flex-col gap-4 cartao">
        <h2 className="text-lg font-extrabold">Voz</h2>

        {!sinteseDisponivel() && (
          <p className="rounded-xl border-2 p-3 font-bold">
            Este navegador não tem voz sintetizada. O app continua funcionando para montar frases.
          </p>
        )}

        <Opcoes<VelocidadeFala>
          titulo="Velocidade da fala"
          valor={config.velocidadeFala}
          opcoes={[
            { valor: 'lenta', rotulo: '🐢 LENTA' },
            { valor: 'normal', rotulo: '🚶 NORMAL' },
            { valor: 'rapida', rotulo: '🐇 RÁPIDA' }
          ]}
          onEscolher={(v) => atualizarConfig({ velocidadeFala: v })}
        />

        <Opcoes<TomVoz>
          titulo="Tom da voz"
          valor={config.tomVoz}
          opcoes={[
            { valor: 'grave', rotulo: 'GRAVE' },
            { valor: 'medio', rotulo: 'MÉDIO' },
            { valor: 'agudo', rotulo: 'AGUDO' }
          ]}
          onEscolher={(v) => atualizarConfig({ tomVoz: v })}
        />

        <div>
          <label className="rotulo-campo" htmlFor="seletor-voz">
            Voz do aparelho (português)
          </label>
          <select
            id="seletor-voz"
            className="campo"
            value={config.vozURI}
            onChange={(e) => atualizarConfig({ vozURI: e.target.value })}
          >
            <option value="">Automática (melhor voz pt-BR)</option>
            {vozes.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} — {v.lang}
              </option>
            ))}
          </select>
          {vozes.length === 0 && (
            <p className="mt-1 text-sm opacity-80">
              Nenhuma voz em português encontrada. No Android, instale uma voz pt-BR nas
              configurações de acessibilidade do aparelho.
            </p>
          )}
        </div>

        <button
          type="button"
          className="botao botao-primario"
          onClick={() => falarTextoLivre('Oi! Eu falo por você. Está bom assim?')}
        >
          🔊 TESTAR A VOZ
        </button>

        <Opcoes<string>
          titulo="Falar a palavra ao tocar no símbolo"
          valor={config.falarAoTocar ? 'sim' : 'nao'}
          opcoes={[
            { valor: 'sim', rotulo: 'LIGADO' },
            { valor: 'nao', rotulo: 'DESLIGADO' }
          ]}
          onEscolher={(v) => atualizarConfig({ falarAoTocar: v === 'sim' })}
        />
      </section>

      {/* --- Tela ----------------------------------------------------------- */}
      <section className="flex flex-col gap-4 cartao">
        <h2 className="text-lg font-extrabold">Tela</h2>

        <Opcoes<Densidade>
          titulo="Símbolos por tela"
          valor={config.densidade}
          opcoes={[
            { valor: 4, rotulo: '4' },
            { valor: 6, rotulo: '6' },
            { valor: 9, rotulo: '9' },
            { valor: 12, rotulo: '12' },
            { valor: 16, rotulo: '16' }
          ]}
          onEscolher={(v) => atualizarConfig({ densidade: v })}
        />

        <Opcoes<TamanhoFonte>
          titulo="Tamanho da fonte"
          valor={config.tamanhoFonte}
          opcoes={[
            { valor: 'pequeno', rotulo: 'PEQUENA' },
            { valor: 'medio', rotulo: 'MÉDIA' },
            { valor: 'grande', rotulo: 'GRANDE' },
            { valor: 'enorme', rotulo: 'ENORME' }
          ]}
          onEscolher={(v) => atualizarConfig({ tamanhoFonte: v })}
        />

        <Opcoes<Tema>
          titulo="Tema"
          valor={config.tema}
          opcoes={[
            { valor: 'claro', rotulo: '☀️ CLARO' },
            { valor: 'escuro', rotulo: '🌙 ESCURO' },
            { valor: 'contraste', rotulo: '◼️ ALTO CONTRASTE' }
          ]}
          onEscolher={(v) => atualizarConfig({ tema: v })}
        />

        <Opcoes<string>
          titulo="Faixa fixa de palavras do núcleo"
          valor={config.mostrarNucleo ? 'sim' : 'nao'}
          opcoes={[
            { valor: 'sim', rotulo: 'MOSTRAR' },
            { valor: 'nao', rotulo: 'ESCONDER' }
          ]}
          onEscolher={(v) => atualizarConfig({ mostrarNucleo: v === 'sim' })}
        />
      </section>

      {/* --- Acessibilidade ------------------------------------------------- */}
      <section className="flex flex-col gap-4 cartao">
        <h2 className="text-lg font-extrabold">Acessibilidade</h2>

        <Opcoes<string>
          titulo="Modo varredura (para acionador / switch)"
          valor={config.varreduraAtiva ? 'sim' : 'nao'}
          opcoes={[
            { valor: 'sim', rotulo: 'LIGADO' },
            { valor: 'nao', rotulo: 'DESLIGADO' }
          ]}
          onEscolher={(v) => atualizarConfig({ varreduraAtiva: v === 'sim' })}
        />
        <p className="text-sm opacity-80">
          Com a varredura ligada, os símbolos são destacados um por um. A pessoa seleciona
          apertando <strong>ESPAÇO</strong> ou tocando em qualquer lugar da área de símbolos.
        </p>

        <Opcoes<number>
          titulo="Intervalo da varredura"
          valor={config.varreduraIntervalo}
          opcoes={[
            { valor: 1, rotulo: '1s' },
            { valor: 2, rotulo: '2s' },
            { valor: 3, rotulo: '3s' },
            { valor: 4, rotulo: '4s' },
            { valor: 5, rotulo: '5s' }
          ]}
          onEscolher={(v) => atualizarConfig({ varreduraIntervalo: v })}
        />

        <div className="rounded-xl border-2 p-3" style={{ borderColor: 'var(--borda)' }}>
          <h3 className="font-extrabold">Atalhos de teclado</h3>
          <ul className="mt-1 list-inside list-disc text-sm">
            <li>
              <strong>ESPAÇO</strong>: fala a frase (ou seleciona, na varredura)
            </li>
            <li>
              <strong>BACKSPACE</strong>: apaga a última palavra
            </li>
            <li>
              <strong>SETAS</strong>: navegam entre os símbolos com foco destacado
            </li>
          </ul>
        </div>
      </section>

      {/* --- Bloqueio de edição --------------------------------------------- */}
      <section className="flex flex-col gap-3 cartao">
        <h2 className="text-lg font-extrabold">Bloqueio da edição</h2>
        <p className="text-sm opacity-80">
          Com o PIN ativado, a criança não entra no modo editor por engano.
        </p>

        {config.pinEditor ? (
          <button
            type="button"
            className="botao"
            onClick={() => {
              if (window.confirm('Remover o PIN e liberar o modo editor?')) {
                atualizarConfig({ pinEditor: '' });
              }
            }}
          >
            🔓 REMOVER PIN
          </button>
        ) : (
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1">
              <label className="rotulo-campo" htmlFor="campo-pin">
                PIN de 4 números
              </label>
              <input
                id="campo-pin"
                className="campo"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="0000"
              />
            </div>
            <button type="button" className="botao botao-primario" onClick={definirPin}>
              🔒 ATIVAR PIN
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
