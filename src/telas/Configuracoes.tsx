import { useEffect, useState } from 'react';
import { useApp } from '../estado/AppContext';
import { observarVozes, sinteseDisponivel } from '../fala/sintetizador';
import type {
  Densidade,
  EstiloVisual,
  TamanhoBlocos,
  TamanhoFonte,
  Tema,
  TomVoz,
  VelocidadeFala
} from '../tipos';

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

/**
 * Mostra em miniatura como os símbolos ficam em cada estilo visual, sem
 * depender do estilo que está ativo agora — assim dá para comparar os dois
 * lado a lado antes de escolher.
 */
function PreviewEstilo({ estilo }: { estilo: EstiloVisual }) {
  const dinamico = estilo === 'dinamico';
  const cores = [
    { emoji: '😀', bg: '#ffc93c', bd: '#d19700' },
    { emoji: '🍎', bg: '#4ade80', bd: '#16a34a' },
    { emoji: '🚗', bg: '#7cc4ff', bd: '#2b82d4' }
  ];
  return (
    <div className="flex gap-2" aria-hidden="true">
      {cores.map((c, i) => (
        <div
          key={i}
          className="flex h-14 w-14 shrink-0 items-center justify-center text-2xl"
          style={
            dinamico
              ? {
                  background: c.bg,
                  borderRadius: '1rem',
                  border: `2px solid ${c.bd}`,
                  boxShadow: `0 4px 0 ${c.bd}`
                }
              : {
                  background: c.bg,
                  borderRadius: '0.7rem',
                  border: '3px solid var(--texto)',
                  boxShadow: '3px 3px 0 var(--texto)'
                }
          }
        >
          {c.emoji}
        </div>
      ))}
    </div>
  );
}

/** Lista as rotinas salvas, com opção de renomear e excluir. */
function GerenciarRotinas() {
  const { perfil, renomearRotina, excluirRotina } = useApp();

  if (perfil.rotinas.length === 0) {
    return (
      <p className="text-sm opacity-80">
        Nenhuma rotina salva ainda. Monte uma frase na tela Falar e toque em{' '}
        <strong>"Salvar esta frase como rotina"</strong>.
      </p>
    );
  }

  return (
    <div>
      <span className="rotulo-campo">Rotinas salvas</span>
      <ul className="flex flex-col gap-2">
        {perfil.rotinas.map((r) => (
          <li
            key={r.id}
            className="flex items-center gap-2 rounded-2xl border-2 p-2"
            style={{ borderColor: 'var(--borda)' }}
          >
            <span aria-hidden="true" className="text-2xl">
              {r.emoji}
            </span>
            <span className="flex-1 truncate font-bold">{r.nome}</span>
            <button
              type="button"
              className="botao px-3"
              aria-label={`Renomear ${r.nome}`}
              onClick={() => {
                const nome = window.prompt('Novo nome da rotina:', r.nome);
                if (nome?.trim()) renomearRotina(r.id, nome.trim());
              }}
            >
              ✏️
            </button>
            <button
              type="button"
              className="botao px-3"
              aria-label={`Excluir rotina ${r.nome}`}
              onClick={() => {
                if (window.confirm(`Excluir a rotina "${r.nome}"?`)) excluirRotina(r.id);
              }}
            >
              🗑️
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Configuracoes() {
  const { config, atualizarConfig, falarTextoLivre } = useApp();
  const [vozes, setVozes] = useState<SpeechSynthesisVoice[]>([]);
  const [pin, setPin] = useState('');
  /** Estilo escolhido na tela, ainda não aplicado — vira ativo só ao tocar em APLICAR. */
  const [estiloEscolhido, setEstiloEscolhido] = useState<EstiloVisual>(config.estiloVisual);

  useEffect(() => observarVozes(setVozes), []);
  // Se o estilo mudar por outro caminho (outro perfil, importação...), a
  // prévia acompanha o que está realmente ativo.
  useEffect(() => setEstiloEscolhido(config.estiloVisual), [config.estiloVisual]);

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
    <div className="mx-auto flex max-w-3xl flex-col gap-5 p-3 pb-16 sm:gap-6 sm:p-4 lg:p-6 lg:pb-10">
      <h1 className="titulo-tela">Configurações</h1>

      {/* --- Voz ------------------------------------------------------------ */}
      <section className="flex flex-col gap-4 cartao">
        <h2 className="text-lg font-extrabold">Voz</h2>

        {!sinteseDisponivel() && (
          <p className="rounded-xl border-2 p-3 font-bold">
            Este navegador não tem voz sintetizada. O app continua funcionando para montar frases.
          </p>
        )}

        <Opcoes<string>
          titulo="Falar a palavra ao tocar no símbolo"
          valor={config.falarAoTocar ? 'sim' : 'nao'}
          opcoes={[
            { valor: 'sim', rotulo: 'LIGADO' },
            { valor: 'nao', rotulo: 'DESLIGADO' }
          ]}
          onEscolher={(v) => atualizarConfig({ falarAoTocar: v === 'sim' })}
        />

        <button
          type="button"
          className="botao botao-primario"
          onClick={() => falarTextoLivre('Oi! Eu falo por você. Está bom assim?')}
        >
          🔊 TESTAR A VOZ
        </button>

        <details className="detalhe-opcoes">
          <summary className="detalhe-opcoes-titulo">🎚️ Personalizar a voz</summary>
          <div className="mt-3 flex flex-col gap-4">
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
          </div>
        </details>
      </section>

      {/* --- Estilo visual --------------------------------------------------- */}
      <section className="flex flex-col gap-4 cartao">
        <h2 className="text-lg font-extrabold">Estilo visual</h2>
        <p className="text-sm" style={{ color: 'var(--texto-suave)' }}>
          Muda a aparência do app inteiro. Escolha um estilo e toque em APLICAR ESTILO.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(['contorno', 'dinamico'] as const).map((estilo) => {
            const selecionado = estiloEscolhido === estilo;
            return (
              <button
                key={estilo}
                type="button"
                onClick={() => setEstiloEscolhido(estilo)}
                aria-pressed={selecionado}
                className="flex min-h-toque flex-col items-center gap-3 rounded-2xl p-4 text-center transition-transform duration-rapido active:scale-95"
                style={{
                  background: 'var(--cartao-2)',
                  border: selecionado ? '3px solid var(--primaria)' : '2px solid var(--borda)'
                }}
              >
                <PreviewEstilo estilo={estilo} />
                <span className="font-extrabold">
                  {estilo === 'contorno' ? 'Contorno (padrão)' : 'Dinâmico'}
                </span>
                <span className="text-sm" style={{ color: 'var(--texto-suave)' }}>
                  {estilo === 'contorno'
                    ? 'Bordas grossas e sombra sólida, estilo adesivo — o visual padrão do app.'
                    : 'Cores vivas, relevo e texturas — um estilo alternativo mais colorido.'}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="botao botao-primario w-full text-lg"
          onClick={() => atualizarConfig({ estiloVisual: estiloEscolhido })}
          disabled={estiloEscolhido === config.estiloVisual}
        >
          ✅ APLICAR ESTILO
        </button>
      </section>

      {/* --- Sugestões, reforço e rotinas ------------------------------------ */}
      <section className="flex flex-col gap-4 cartao">
        <h2 className="text-lg font-extrabold">Sugestões e rotinas</h2>

        <Opcoes<string>
          titulo="Sugestões de palavras"
          valor={config.sugestoesAtivas ? 'sim' : 'nao'}
          opcoes={[
            { valor: 'sim', rotulo: 'LIGADO' },
            { valor: 'nao', rotulo: 'DESLIGADO' }
          ]}
          onEscolher={(v) => atualizarConfig({ sugestoesAtivas: v === 'sim' })}
        />
        <p className="text-sm opacity-80">
          Depois de tocar em "quero" ou "não quero", mostra os símbolos que a pessoa mais usa —
          aprende sozinho com o uso.
        </p>

        <Opcoes<string>
          titulo="Reforço positivo ao falar"
          valor={config.reforcoPositivo ? 'sim' : 'nao'}
          opcoes={[
            { valor: 'sim', rotulo: 'LIGADO' },
            { valor: 'nao', rotulo: 'DESLIGADO' }
          ]}
          onEscolher={(v) => atualizarConfig({ reforcoPositivo: v === 'sim' })}
        />
        <p className="text-sm opacity-80">
          Um breve brilho de estrelinhas (menos de 1 segundo) depois de falar uma frase completa.
        </p>

        <GerenciarRotinas />
      </section>

      {/* --- Tela ----------------------------------------------------------- */}
      <section className="flex flex-col gap-4 cartao">
        <h2 className="text-lg font-extrabold">Tela</h2>

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

        <Opcoes<TamanhoBlocos>
          titulo="Tamanho dos blocos"
          valor={config.tamanhoBlocos}
          opcoes={[
            { valor: 'normal', rotulo: 'NORMAL' },
            { valor: 'grande', rotulo: 'GRANDE (MAIS ESPAÇO)' }
          ]}
          onEscolher={(v) => atualizarConfig({ tamanhoBlocos: v })}
        />
        <p className="text-sm opacity-80">
          "Grande" deixa cada bloco mais alto e a letra maior — ótimo quando as palavras são
          longas ou a tela é pequena. Nenhum texto é cortado em nenhum dos dois tamanhos.
        </p>

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

        <details className="detalhe-opcoes">
          <summary className="detalhe-opcoes-titulo">🔧 Mais opções de tela</summary>
          <div className="mt-3 flex flex-col gap-4">
            <Opcoes<Densidade>
              titulo="Símbolos por tela (dentro de cada categoria)"
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

            <Opcoes<string>
              titulo="Faixa fixa de palavras do núcleo"
              valor={config.mostrarNucleo ? 'sim' : 'nao'}
              opcoes={[
                { valor: 'sim', rotulo: 'MOSTRAR' },
                { valor: 'nao', rotulo: 'ESCONDER' }
              ]}
              onEscolher={(v) => atualizarConfig({ mostrarNucleo: v === 'sim' })}
            />
          </div>
        </details>
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

        <details className="detalhe-opcoes">
          <summary className="detalhe-opcoes-titulo">⌨️ Mais opções de acessibilidade</summary>
          <div className="mt-3 flex flex-col gap-4">
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
          </div>
        </details>
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
