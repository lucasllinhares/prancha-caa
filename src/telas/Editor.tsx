import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../estado/AppContext';
import { CORES_FITZGERALD, classesDaCor } from '../dados/coresFitzgerald';
import { EscolherEmoji } from '../componentes/EscolherEmoji';
import { lerComoTexto, redimensionarImagem } from '../utilidades/imagem';
import type { CorFitzgerald, Simbolo } from '../tipos';

interface Rascunho {
  simboloId?: string;
  texto: string;
  textoFala: string;
  emoji: string;
  cor: CorFitzgerald;
  pranchaDestinoId: string;
  /** Imagem nova escolhida agora (data URL já redimensionada). */
  imagemNova?: string;
  /** Imagem que já estava salva no símbolo. */
  imagemAtual?: string;
}

const RASCUNHO_VAZIO: Rascunho = {
  texto: '',
  textoFala: '',
  emoji: '',
  cor: 'diversos',
  pranchaDestinoId: ''
};

/**
 * Modo editor: pensado para mãe, pai ou terapeuta usar sem saber tecnologia.
 * Tudo em português, um passo por vez, com confirmação antes de excluir.
 */
export function Editor() {
  const {
    pranchas,
    imagens,
    criarPrancha,
    renomearPrancha,
    excluirPrancha,
    adicionarSimbolo,
    atualizarSimbolo,
    excluirSimbolo,
    moverSimbolo,
    exportarPrancha,
    importarPrancha
  } = useApp();

  const [pranchaId, setPranchaId] = useState(pranchas[0]?.id ?? '');
  const prancha = useMemo(
    () => pranchas.find((p) => p.id === pranchaId) ?? pranchas[0],
    [pranchas, pranchaId]
  );

  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [aviso, setAviso] = useState('');
  const [arrastando, setArrastando] = useState<number | null>(null);
  const inputImagem = useRef<HTMLInputElement>(null);
  const inputJson = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (prancha && prancha.id !== pranchaId) setPranchaId(prancha.id);
  }, [prancha, pranchaId]);

  if (!prancha) return null;

  const mostrarAviso = (texto: string) => {
    setAviso(texto);
    window.setTimeout(() => setAviso(''), 4000);
  };

  // --- Pranchas ------------------------------------------------------------

  const novaPrancha = () => {
    const nome = window.prompt('Nome da nova prancha:', 'Minha prancha');
    if (!nome?.trim()) return;
    const criada = criarPrancha(nome.trim(), '📁');
    setPranchaId(criada.id);
    mostrarAviso(`Prancha “${criada.nome}” criada.`);
  };

  const renomear = () => {
    const nome = window.prompt('Novo nome da prancha:', prancha.nome);
    if (!nome?.trim()) return;
    renomearPrancha(prancha.id, nome.trim());
  };

  const apagarPrancha = () => {
    if (prancha.inicial) {
      mostrarAviso('A prancha de início não pode ser excluída.');
      return;
    }
    const ok = window.confirm(
      `Excluir a prancha “${prancha.nome}” e todos os seus símbolos? Isso não pode ser desfeito.`
    );
    if (!ok) return;
    excluirPrancha(prancha.id);
    setPranchaId(pranchas.find((p) => p.inicial)?.id ?? pranchas[0].id);
  };

  const importar = async (arquivo: File) => {
    try {
      const conteudo = await lerComoTexto(arquivo);
      const nome = await importarPrancha(conteudo);
      mostrarAviso(`Prancha “${nome}” importada com sucesso.`);
    } catch (erro) {
      mostrarAviso(erro instanceof Error ? erro.message : 'Não foi possível importar o arquivo.');
    }
  };

  // --- Símbolos ------------------------------------------------------------

  const abrirNovo = () => setRascunho({ ...RASCUNHO_VAZIO });

  const abrirEdicao = (simbolo: Simbolo) =>
    setRascunho({
      simboloId: simbolo.id,
      texto: simbolo.texto,
      textoFala: simbolo.textoFala ?? '',
      emoji: simbolo.emoji ?? '',
      cor: simbolo.cor,
      pranchaDestinoId: simbolo.pranchaDestinoId ?? '',
      imagemAtual: simbolo.imagemId ? imagens[simbolo.imagemId] : undefined
    });

  const escolherImagem = async (arquivo: File) => {
    try {
      // Redimensionada para 300px no próprio aparelho antes de salvar.
      const dataUrl = await redimensionarImagem(arquivo, 300);
      setRascunho((r) => (r ? { ...r, imagemNova: dataUrl } : r));
    } catch (erro) {
      mostrarAviso(erro instanceof Error ? erro.message : 'Não foi possível usar essa imagem.');
    }
  };

  const salvar = async () => {
    if (!rascunho) return;
    const texto = rascunho.texto.trim();
    if (!texto) {
      mostrarAviso('Escreva a palavra do símbolo.');
      return;
    }

    const dados = {
      texto,
      textoFala: rascunho.textoFala.trim() || undefined,
      emoji: rascunho.emoji || undefined,
      cor: rascunho.cor,
      pranchaDestinoId: rascunho.pranchaDestinoId || undefined
    };

    if (rascunho.simboloId) {
      await atualizarSimbolo(prancha.id, rascunho.simboloId, dados, rascunho.imagemNova);
    } else {
      await adicionarSimbolo(prancha.id, dados, rascunho.imagemNova);
    }
    setRascunho(null);
    mostrarAviso(`Símbolo “${texto}” salvo.`);
  };

  const apagarSimbolo = (simbolo: Simbolo) => {
    const ok = window.confirm(`Excluir o símbolo “${simbolo.texto}”?`);
    if (ok) excluirSimbolo(prancha.id, simbolo.id);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-3 pb-16 sm:gap-5 sm:p-4 lg:p-6 lg:pb-10">
      <h1 className="titulo-tela">Editar pranchas</h1>

      {aviso && (
        <p
          role="status"
          className="cartao font-extrabold"
          style={{ borderColor: 'var(--primaria)' }}
        >
          {aviso}
        </p>
      )}

      {/* Seleção e ações da prancha */}
      <section className="flex flex-col gap-2 cartao">
        <label className="rotulo-campo" htmlFor="seletor-prancha">
          Prancha que você está editando
        </label>
        <select
          id="seletor-prancha"
          className="campo"
          value={prancha.id}
          onChange={(e) => setPranchaId(e.target.value)}
        >
          {pranchas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.emoji ? `${p.emoji} ` : ''}
              {p.nome} ({p.simbolos.length} símbolos)
            </option>
          ))}
        </select>

        <button type="button" className="botao botao-primario w-full text-lg" onClick={abrirNovo}>
          + NOVO SÍMBOLO
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="botao" onClick={novaPrancha}>
            🆕 NOVA PRANCHA
          </button>
          <button type="button" className="botao" onClick={renomear}>
            ✏️ RENOMEAR
          </button>
          <button type="button" className="botao" onClick={() => exportarPrancha(prancha.id)}>
            ⬇️ EXPORTAR
          </button>
          <button type="button" className="botao" onClick={() => inputJson.current?.click()}>
            ⬆️ IMPORTAR
          </button>
          <button type="button" className="botao col-span-2" onClick={apagarPrancha}>
            🗑️ EXCLUIR PRANCHA
          </button>
        </div>
        <input
          ref={inputJson}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const arquivo = e.target.files?.[0];
            if (arquivo) void importar(arquivo);
            e.target.value = '';
          }}
        />
        <p className="text-sm opacity-80">
          Exportar gera um arquivo que outra pessoa pode importar neste app, mesmo sem internet —
          é assim que terapeutas trocam pranchas entre si.
        </p>
      </section>

      {/* Formulário de símbolo */}
      {rascunho && (
        <section className="flex flex-col gap-3 cartao" style={{ borderColor: 'var(--primaria)', borderWidth: 4 }}>
          <h2 className="titulo-tela">
            {rascunho.simboloId ? 'Editar símbolo' : 'Novo símbolo'}
          </h2>

          <div>
            <label className="rotulo-campo" htmlFor="campo-texto">
              Palavra que aparece no botão
            </label>
            <input
              id="campo-texto"
              className="campo"
              value={rascunho.texto}
              placeholder="Ex.: suco"
              onChange={(e) => setRascunho({ ...rascunho, texto: e.target.value })}
            />
          </div>

          <div>
            <label className="rotulo-campo" htmlFor="campo-fala">
              O que a voz vai falar (opcional)
            </label>
            <input
              id="campo-fala"
              className="campo"
              value={rascunho.textoFala}
              placeholder="Ex.: eu quero suco de laranja"
              onChange={(e) => setRascunho({ ...rascunho, textoFala: e.target.value })}
            />
          </div>

          <div>
            <span className="rotulo-campo">Imagem do símbolo</span>
            <div className="mb-2 flex items-center gap-3">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-xl border-2"
                style={{ borderColor: 'var(--borda)' }}
              >
                {rascunho.imagemNova || rascunho.imagemAtual ? (
                  <img
                    src={rascunho.imagemNova ?? rascunho.imagemAtual}
                    alt="Prévia da imagem escolhida"
                    className="h-full w-full rounded-xl object-cover"
                  />
                ) : (
                  <span aria-hidden="true" className="text-4xl">
                    {rascunho.emoji || '🔤'}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button type="button" className="botao" onClick={() => inputImagem.current?.click()}>
                  📷 TIRAR FOTO / ENVIAR IMAGEM
                </button>
                {(rascunho.imagemNova || rascunho.imagemAtual) && (
                  <button
                    type="button"
                    className="botao"
                    onClick={() =>
                      setRascunho({ ...rascunho, imagemNova: undefined, imagemAtual: undefined })
                    }
                  >
                    ❌ USAR EMOJI EM VEZ DA FOTO
                  </button>
                )}
              </div>
            </div>
            <input
              ref={inputImagem}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const arquivo = e.target.files?.[0];
                if (arquivo) void escolherImagem(arquivo);
                e.target.value = '';
              }}
            />
            <EscolherEmoji
              valor={rascunho.emoji}
              onEscolher={(emoji) => setRascunho({ ...rascunho, emoji })}
            />
          </div>

          <div>
            <span className="rotulo-campo">Cor de fundo (padrão Fitzgerald Key)</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CORES_FITZGERALD.map((cor) => (
                <button
                  key={cor.id}
                  type="button"
                  onClick={() => setRascunho({ ...rascunho, cor: cor.id })}
                  aria-pressed={rascunho.cor === cor.id}
                  className={`min-h-toque amostra-tile rounded-2xl border-4 px-3 py-2 text-left font-extrabold ${classesDaCor(
                    cor.id
                  )} ${rascunho.cor === cor.id ? 'ring-4 ring-violet-600' : ''}`}
                >
                  {cor.rotulo}
                  <span className="block text-xs font-semibold">{cor.descricao}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="rotulo-campo" htmlFor="campo-destino">
              Este símbolo abre outra prancha? (opcional)
            </label>
            <select
              id="campo-destino"
              className="campo"
              value={rascunho.pranchaDestinoId}
              onChange={(e) => setRascunho({ ...rascunho, pranchaDestinoId: e.target.value })}
            >
              <option value="">Não — é uma palavra para falar</option>
              {pranchas
                .filter((p) => p.id !== prancha.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    Abrir “{p.nome}”
                  </option>
                ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button type="button" className="botao botao-primario flex-1" onClick={() => void salvar()}>
              ✅ SALVAR
            </button>
            <button type="button" className="botao flex-1" onClick={() => setRascunho(null)}>
              CANCELAR
            </button>
          </div>
        </section>
      )}

      {/* Lista de símbolos com reordenação */}
      <section className="flex flex-col gap-2">
        <h2 className="titulo-tela">
          Símbolos de “{prancha.nome}” ({prancha.simbolos.length})
        </h2>
        <p className="text-sm opacity-80">
          Arraste para reordenar (no computador) ou use as setas ⬆️ ⬇️ (no celular).
        </p>

        {prancha.simbolos.map((simbolo, indice) => (
          <div
            key={simbolo.id}
            draggable
            onDragStart={() => setArrastando(indice)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (arrastando !== null && arrastando !== indice) {
                moverSimbolo(prancha.id, arrastando, indice);
              }
              setArrastando(null);
            }}
            className="cartao flex flex-wrap items-center gap-2 p-2 sm:flex-nowrap"
          >
            <span aria-hidden="true" className="cursor-grab px-1 text-2xl opacity-60">
              ⠿
            </span>
            <div
              className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center amostra-tile rounded-2xl border-2 ${classesDaCor(
                simbolo.cor
              )}`}
            >
              {simbolo.imagemId && imagens[simbolo.imagemId] ? (
                <img src={imagens[simbolo.imagemId]} alt="" className="h-full w-full rounded-xl object-cover" />
              ) : (
                <span aria-hidden="true" className="text-3xl">
                  {simbolo.emoji || '🔤'}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1 basis-40">
              <p className="truncate font-extrabold uppercase">{simbolo.texto}</p>
              <p className="truncate text-sm opacity-80">
                {simbolo.pranchaDestinoId
                  ? `abre: ${pranchas.find((p) => p.id === simbolo.pranchaDestinoId)?.nome ?? '—'}`
                  : simbolo.textoFala
                    ? `fala: ${simbolo.textoFala}`
                    : 'fala a própria palavra'}
              </p>
            </div>
            {/* No celular os quatro comandos ganham uma linha inteira, em
                quatro colunas iguais — sem nada cortado na borda da tela. */}
            <div className="grid w-full shrink-0 grid-cols-4 gap-1 sm:flex sm:w-auto sm:justify-end">
              <button
                type="button"
                className="botao px-3"
                aria-label={`Mover ${simbolo.texto} para cima`}
                onClick={() => moverSimbolo(prancha.id, indice, indice - 1)}
                disabled={indice === 0}
              >
                ⬆️
              </button>
              <button
                type="button"
                className="botao px-3"
                aria-label={`Mover ${simbolo.texto} para baixo`}
                onClick={() => moverSimbolo(prancha.id, indice, indice + 1)}
                disabled={indice === prancha.simbolos.length - 1}
              >
                ⬇️
              </button>
              <button
                type="button"
                className="botao px-3"
                aria-label={`Editar ${simbolo.texto}`}
                onClick={() => abrirEdicao(simbolo)}
              >
                ✏️
              </button>
              <button
                type="button"
                className="botao px-3"
                aria-label={`Excluir ${simbolo.texto}`}
                onClick={() => apagarSimbolo(simbolo)}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}

        {prancha.simbolos.length === 0 && (
          <p className="cartao text-center font-bold">
            Nenhum símbolo aqui ainda. Toque em <strong>NOVO SÍMBOLO</strong>.
          </p>
        )}
      </section>
    </div>
  );
}
