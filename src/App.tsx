import { useEffect, useState } from 'react';
import { useApp } from './estado/AppContext';
import { Comunicador } from './telas/Comunicador';
import { Editor } from './telas/Editor';
import { Configuracoes } from './telas/Configuracoes';
import { Historico } from './telas/Historico';
import { Perfis } from './telas/Perfis';
import { BloqueioPin } from './componentes/BloqueioPin';

type Aba = 'falar' | 'editar' | 'historico' | 'perfis' | 'ajustes';

/** Cada aba tem sua própria cor, como as capas coloridas das referências. */
const ABAS: { id: Aba; rotulo: string; icone: string; cor: string }[] = [
  { id: 'falar', rotulo: 'Falar', icone: '💬', cor: 'var(--descritivos)' },
  { id: 'editar', rotulo: 'Editar', icone: '✏️', cor: 'var(--acoes)' },
  { id: 'historico', rotulo: 'Histórico', icone: '🕘', cor: 'var(--substantivos)' },
  { id: 'perfis', rotulo: 'Perfis', icone: '👥', cor: 'var(--pessoas)' },
  { id: 'ajustes', rotulo: 'Ajustes', icone: '⚙️', cor: 'var(--social)' }
];

export function App() {
  const { config, perfil } = useApp();
  const [aba, setAba] = useState<Aba>('falar');
  const [editorLiberado, setEditorLiberado] = useState(false);

  // Sair do editor tranca de novo: o PIN é pedido na próxima entrada.
  useEffect(() => {
    if (aba !== 'editar') setEditorLiberado(false);
  }, [aba]);

  const precisaPin = aba === 'editar' && Boolean(config.pinEditor) && !editorLiberado;

  return (
    <div className="flex h-screen flex-col" style={{ background: 'var(--fundo)' }}>
      {/* Área de conteúdo: é o contêiner que rola, o que mantém a barra de
          frase fixa no topo e a faixa do núcleo fixa embaixo. */}
      <div className="h-full flex-1 overflow-y-auto">
        {precisaPin ? (
          <BloqueioPin
            pinCorreto={config.pinEditor}
            onLiberar={() => setEditorLiberado(true)}
            onCancelar={() => setAba('falar')}
          />
        ) : (
          <>
            {aba === 'falar' && <Comunicador />}
            {aba === 'editar' && <Editor />}
            {aba === 'historico' && <Historico />}
            {aba === 'perfis' && <Perfis />}
            {aba === 'ajustes' && <Configuracoes />}
          </>
        )}
      </div>

      {/* Abas principais */}
      <nav
        className="shrink-0 rounded-t-3xl border-t-2 superficie"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          borderColor: 'var(--borda)',
          boxShadow: '0 -12px 30px -20px rgba(15,21,51,0.5)'
        }}
        aria-label="Seções do aplicativo"
      >
        <ul className="flex px-1 pt-1">
          {ABAS.map((a) => {
            const ativa = aba === a.id;
            return (
              <li key={a.id} className="flex-1">
                <button
                  type="button"
                  onClick={() => setAba(a.id)}
                  aria-current={ativa ? 'page' : undefined}
                  className="flex min-h-toque w-full flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 font-extrabold transition-transform duration-rapido active:scale-95"
                >
                  {/* Ícone dentro de um disco que se acende na aba ativa */}
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 text-xl leading-none transition-colors duration-rapido"
                    style={{
                      background: ativa ? a.cor : 'transparent',
                      borderColor: ativa ? a.cor : 'transparent'
                    }}
                  >
                    {a.icone}
                  </span>
                  <span
                    className="text-[11px] uppercase"
                    style={{ color: ativa ? 'var(--texto)' : 'var(--texto-suave)' }}
                  >
                    {a.rotulo}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p
          className="pb-1 text-center text-[11px] font-bold"
          style={{ color: 'var(--texto-suave)' }}
        >
          Perfil em uso: {perfil.nome} · funciona offline
        </p>
      </nav>
    </div>
  );
}
