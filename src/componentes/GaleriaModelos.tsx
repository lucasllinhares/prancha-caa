import { useApp } from '../estado/AppContext';
import { MODELOS_PRONTOS, resumoDoModelo } from '../dados/modelos';

interface Props {
  /** id do modelo escolhido (pronto ou do usuário). */
  valor: string;
  onEscolher: (id: string) => void;
  /** Mostra o botão de excluir nos modelos criados pelo usuário. */
  permitirExcluir?: boolean;
}

/**
 * Galeria de modelos de prancheta: os prontos (Escola, Casa, Passeio...) e os
 * que a própria pessoa salvou ("Minhas pranchetas"). Serve tanto para criar a
 * prancheta de um aluno novo quanto para somar categorias ao perfil atual.
 */
export function GaleriaModelos({ valor, onEscolher, permitirExcluir }: Props) {
  const { modelosUsuario, excluirModelo } = useApp();

  const cartao = (
    id: string,
    emoji: string,
    nome: string,
    descricao: string,
    resumo: string,
    excluivel: boolean
  ) => {
    const selecionado = valor === id;
    return (
      <li key={id} className="flex gap-2">
        <button
          type="button"
          role="radio"
          aria-checked={selecionado}
          onClick={() => onEscolher(id)}
          className="flex min-h-toque flex-1 items-start gap-3 rounded-2xl p-3 text-left transition-transform duration-rapido active:scale-[0.98]"
          style={{
            background: 'var(--cartao-2)',
            border: selecionado ? '3px solid var(--primaria)' : '2px solid var(--borda)'
          }}
        >
          <span aria-hidden="true" className="text-3xl leading-none">
            {emoji}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2">
              <span className="text-base font-extrabold">{nome}</span>
              {selecionado && (
                <span className="pilula" aria-hidden="true">
                  ✔ escolhido
                </span>
              )}
            </span>
            <span className="mt-0.5 block text-sm" style={{ color: 'var(--texto-suave)' }}>
              {descricao}
            </span>
            <span className="mt-1 block text-xs font-extrabold uppercase opacity-70">{resumo}</span>
          </span>
        </button>
        {excluivel && permitirExcluir && (
          <button
            type="button"
            className="botao shrink-0 px-3"
            aria-label={`Excluir o modelo ${nome}`}
            onClick={() => {
              if (window.confirm(`Excluir o modelo “${nome}”? As pranchetas já criadas com ele não mudam.`)) {
                if (valor === id) onEscolher(MODELOS_PRONTOS[0].id);
                void excluirModelo(id);
              }
            }}
          >
            🗑️
          </button>
        )}
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <span className="rotulo-campo">Modelos prontos</span>
        <ul role="radiogroup" aria-label="Modelos prontos" className="flex flex-col gap-2">
          {MODELOS_PRONTOS.map((m) => {
            const r = resumoDoModelo(m);
            return cartao(
              m.id,
              m.emoji,
              m.nome,
              m.descricao,
              `${r.categorias} categorias · ${r.palavras} palavras`,
              false
            );
          })}
        </ul>
      </div>

      {modelosUsuario.length > 0 && (
        <div>
          <span className="rotulo-campo">Minhas pranchetas (modelos salvos por mim)</span>
          <ul role="radiogroup" aria-label="Minhas pranchetas" className="flex flex-col gap-2">
            {modelosUsuario.map((m) =>
              cartao(
                m.id,
                m.emoji,
                m.nome,
                'Modelo salvo por você.',
                `${m.totalCategorias} categorias`,
                true
              )
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
