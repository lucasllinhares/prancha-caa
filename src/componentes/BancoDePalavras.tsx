import { useMemo, useState } from 'react';
import { gruposDoBanco } from '../dados/modelos';
import { classesDaCor } from '../dados/coresFitzgerald';
import type { Simbolo } from '../tipos';

interface Props {
  /** Nome da categoria que vai receber as palavras (só para o título). */
  nomeDestino: string;
  /** Recebe os símbolos escolhidos; devolve quantos foram de fato adicionados. */
  onAdicionar: (simbolos: Simbolo[]) => number;
  onFechar: () => void;
}

/**
 * Banco de palavras: a pessoa escolhe, uma a uma, palavras prontas do
 * vocabulário de fábrica para colocar na categoria que está editando — sem ter
 * que digitar e escolher ícone de cada uma.
 */
export function BancoDePalavras({ nomeDestino, onAdicionar, onFechar }: Props) {
  const grupos = useMemo(() => gruposDoBanco(), []);
  const [escolhidas, setEscolhidas] = useState<Record<string, Simbolo>>({});
  const [busca, setBusca] = useState('');
  const [aviso, setAviso] = useState('');

  const termo = busca.trim().toLowerCase();
  const quantidade = Object.keys(escolhidas).length;

  const alternar = (simbolo: Simbolo) => {
    setAviso('');
    setEscolhidas((atual) => {
      const copia = { ...atual };
      if (copia[simbolo.id]) delete copia[simbolo.id];
      else copia[simbolo.id] = simbolo;
      return copia;
    });
  };

  const adicionar = () => {
    const adicionadas = onAdicionar(Object.values(escolhidas));
    const ignoradas = quantidade - adicionadas;
    setEscolhidas({});
    setAviso(
      adicionadas === 0
        ? 'Essas palavras já estavam na categoria.'
        : `${adicionadas} palavra${adicionadas > 1 ? 's' : ''} adicionada${adicionadas > 1 ? 's' : ''}${
            ignoradas > 0 ? ` (${ignoradas} já existia${ignoradas > 1 ? 'm' : ''})` : ''
          }.`
    );
  };

  return (
    <section
      className="cartao flex flex-col gap-3"
      style={{ borderColor: 'var(--primaria)', borderWidth: 4 }}
      aria-label="Banco de palavras"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="titulo-tela">Palavras prontas</h2>
          <p className="text-sm" style={{ color: 'var(--texto-suave)' }}>
            Toque nas palavras que quer e depois em ADICIONAR. Elas entram em{' '}
            <strong>{nomeDestino}</strong>.
          </p>
        </div>
        <button type="button" className="botao shrink-0" onClick={onFechar}>
          FECHAR
        </button>
      </div>

      <div>
        <label className="rotulo-campo" htmlFor="busca-palavras">
          Procurar palavra
        </label>
        <input
          id="busca-palavras"
          className="campo"
          value={busca}
          placeholder="Ex.: suco"
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {aviso && (
        <p role="status" className="pilula normal-case">
          {aviso}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {grupos.map((grupo) => {
          const visiveis = termo
            ? grupo.simbolos.filter((s) => s.texto.toLowerCase().includes(termo))
            : grupo.simbolos;
          if (visiveis.length === 0) return null;
          const marcadas = visiveis.filter((s) => escolhidas[s.id]).length;
          return (
            <details
              key={grupo.id}
              open={Boolean(termo)}
              className="rounded-2xl border-2 p-2"
              style={{ borderColor: 'var(--borda)' }}
            >
              <summary className="flex min-h-toque cursor-pointer items-center gap-2 font-extrabold">
                <span aria-hidden="true" className="text-2xl">
                  {grupo.emoji}
                </span>
                <span className="flex-1">{grupo.nome}</span>
                {marcadas > 0 && <span className="pilula">{marcadas} ✔</span>}
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {visiveis.map((s) => {
                  const marcada = Boolean(escolhidas[s.id]);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={marcada}
                      onClick={() => alternar(s)}
                      className={`amostra-tile flex min-h-toque items-center gap-2 rounded-2xl border-2 px-2 py-2 text-left font-extrabold ${classesDaCor(
                        s.cor
                      )} ${marcada ? 'ring-4 ring-violet-600' : ''}`}
                    >
                      <span aria-hidden="true" className="text-2xl leading-none">
                        {s.emoji}
                      </span>
                      <span className="min-w-0 flex-1 break-words text-sm leading-tight">
                        {s.texto}
                      </span>
                      {marcada && <span aria-hidden="true">✔</span>}
                    </button>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>

      <div className="sticky bottom-0 -mx-1 flex gap-2 px-1 pt-1" style={{ background: 'var(--cartao)' }}>
        <button
          type="button"
          className="botao botao-primario flex-1"
          onClick={adicionar}
          disabled={quantidade === 0}
        >
          + ADICIONAR {quantidade > 0 ? `(${quantidade})` : ''}
        </button>
        {quantidade > 0 && (
          <button type="button" className="botao" onClick={() => setEscolhidas({})}>
            LIMPAR
          </button>
        )}
      </div>
    </section>
  );
}
