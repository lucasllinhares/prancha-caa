import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../estado/AppContext';
import { CORES_FITZGERALD, classesDaCor } from '../dados/coresFitzgerald';
import { EscolherEmoji } from '../componentes/EscolherEmoji';
import { BancoDePalavras } from '../componentes/BancoDePalavras';
import { GaleriaModelos } from '../componentes/GaleriaModelos';
import { MODELOS_PRONTOS } from '../dados/modelos';
import { lerComoTexto, redimensionarImagem } from '../utilidades/imagem';
import {
  gravacaoDisponivel,
  iniciarGravacao,
  tocarAudioGravado,
  type ControleGravacao
} from '../fala/gravador';
import type { CorFitzgerald, Simbolo } from '../tipos';

interface Rascunho {
  simboloId?: string;
  texto: string;
  textoFala: string;
  emoji: string;
  cor: CorFitzgerald;
  pranchaDestinoId: string;
  /** Categoria onde o símbolo fica (mudar aqui move o símbolo de categoria). */
  categoriaId: string;
  /** Imagem nova escolhida agora (data URL já redimensionada). */
  imagemNova?: string;
  /** Imagem que já estava salva no símbolo. */
  imagemAtual?: string;
  /** Áudio recém-gravado pelo microfone, ainda não salvo. */
  audioNovo?: string;
  /** Áudio que já estava salvo no símbolo. */
  audioAtual?: string;
  /** A imagem é o cartão inteiro (fundo + desenho + palavra): mostrar só ela. */
  imagemCheia: boolean;
  /** Imagem que vem com o app (cartões ilustrados), quando o símbolo usa uma. */
  imagemUrl?: string;
}

const RASCUNHO_VAZIO: Rascunho = {
  texto: '',
  textoFala: '',
  emoji: '',
  cor: 'diversos',
  pranchaDestinoId: '',
  categoriaId: '',
  imagemCheia: false
};

/** Formulário de categoria (nova ou em edição). */
interface FormCategoria {
  modo: 'nova' | 'editar';
  nome: string;
  emoji: string;
  cor: CorFitzgerald;
}

/**
 * Modo editor: pensado para mãe, pai ou terapeuta usar sem saber tecnologia.
 * Tudo em português, um passo por vez, com confirmação antes de excluir.
 */
export function Editor() {
  const {
    pranchas,
    imagens,
    audios,
    criarCategoria,
    editarCategoria,
    transferirSimbolo,
    adicionarSimbolosProntos,
    aplicarModelo,
    excluirPrancha,
    adicionarSimbolo,
    atualizarSimbolo,
    excluirSimbolo,
    moverSimbolo,
    definirAudioSimbolo,
    removerAudioSimbolo,
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
  const [gravando, setGravando] = useState(false);
  const [formCategoria, setFormCategoria] = useState<FormCategoria | null>(null);
  const [mostrarBanco, setMostrarBanco] = useState(false);
  const [mostrarModelos, setMostrarModelos] = useState(false);
  const [modeloEscolhido, setModeloEscolhido] = useState(MODELOS_PRONTOS[1].id);
  const controleGravacao = useRef<ControleGravacao | null>(null);
  const inputImagem = useRef<HTMLInputElement>(null);
  const inputJson = useRef<HTMLInputElement>(null);
  const inputVarias = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (prancha && prancha.id !== pranchaId) setPranchaId(prancha.id);
  }, [prancha, pranchaId]);

  if (!prancha) return null;

  const mostrarAviso = (texto: string) => {
    setAviso(texto);
    window.setTimeout(() => setAviso(''), 4000);
  };

  // --- Pranchas ------------------------------------------------------------

  const abrirNovaCategoria = () => {
    setRascunho(null);
    setFormCategoria({ modo: 'nova', nome: '', emoji: '📁', cor: 'diversos' });
  };

  const abrirEdicaoCategoria = () => {
    if (prancha.inicial) {
      mostrarAviso('O Início lista as categorias. Para mudar uma categoria, escolha-a na lista acima.');
      return;
    }
    // A cor e o ícone da categoria vivem no botão que a abre no Início.
    const botao = pranchas
      .flatMap((pr) => pr.simbolos)
      .find((sim) => sim.pranchaDestinoId === prancha.id);
    setRascunho(null);
    setFormCategoria({
      modo: 'editar',
      nome: prancha.nome,
      emoji: prancha.emoji ?? botao?.emoji ?? '📁',
      cor: botao?.cor ?? 'diversos'
    });
  };

  const salvarCategoria = () => {
    if (!formCategoria) return;
    const nome = formCategoria.nome.trim();
    if (!nome) {
      mostrarAviso('Escreva o nome da categoria.');
      return;
    }
    const dados = { nome, emoji: formCategoria.emoji || '📁', cor: formCategoria.cor };
    if (formCategoria.modo === 'nova') {
      const id = criarCategoria(dados);
      setPranchaId(id);
      mostrarAviso(`Categoria “${nome}” criada. Agora é só adicionar as palavras.`);
    } else {
      editarCategoria(prancha.id, dados);
      mostrarAviso(`Categoria “${nome}” atualizada.`);
    }
    setFormCategoria(null);
  };

  const apagarPrancha = () => {
    if (prancha.inicial) {
      mostrarAviso('O Início não pode ser excluído — ele é o mapa das categorias.');
      return;
    }
    const ok = window.confirm(
      `Excluir a categoria “${prancha.nome}” e todas as suas palavras? Isso não pode ser desfeito.`
    );
    if (!ok) return;
    excluirPrancha(prancha.id);
    setPranchaId(pranchas.find((p) => p.inicial)?.id ?? pranchas[0].id);
  };

  const adicionarModeloAoPerfil = async () => {
    const adicionadas = await aplicarModelo(modeloEscolhido);
    mostrarAviso(
      adicionadas === 0
        ? 'Todas as categorias desse modelo já existem na sua prancheta.'
        : `${adicionadas} categoria${adicionadas > 1 ? 's' : ''} adicionada${adicionadas > 1 ? 's' : ''} ao Início.`
    );
  };

  const importar = async (arquivo: File) => {
    try {
      const conteudo = await lerComoTexto(arquivo);
      const nome = await importarPrancha(conteudo);
      mostrarAviso(`Categoria “${nome}” importada — ela já aparece no Início.`);
    } catch (erro) {
      mostrarAviso(erro instanceof Error ? erro.message : 'Não foi possível importar o arquivo.');
    }
  };

  // --- Símbolos ------------------------------------------------------------

  const abrirNovo = () => {
    setFormCategoria(null);
    setRascunho({ ...RASCUNHO_VAZIO, categoriaId: prancha.id });
  };

  const abrirEdicao = (simbolo: Simbolo) => {
    setFormCategoria(null);
    setRascunho({
      simboloId: simbolo.id,
      categoriaId: prancha.id,
      texto: simbolo.texto,
      textoFala: simbolo.textoFala ?? '',
      emoji: simbolo.emoji ?? '',
      cor: simbolo.cor,
      pranchaDestinoId: simbolo.pranchaDestinoId ?? '',
      imagemAtual: simbolo.imagemId ? imagens[simbolo.imagemId] : simbolo.imagemUrl,
      imagemUrl: simbolo.imagemUrl,
      imagemCheia: Boolean(simbolo.imagemCheia),
      audioAtual: simbolo.audioId ? audios[simbolo.audioId] : undefined
    });
  };

  /**
   * Envia várias imagens de uma vez: cada uma vira um bloco-cartão na
   * categoria escolhida. O nome do arquivo vira a palavra (dá para mudar
   * depois, tocando no bloco).
   */
  const adicionarVariasImagens = async (arquivos: File[]) => {
    let adicionadas = 0;
    for (const arquivo of arquivos) {
      try {
        const dataUrl = await redimensionarImagem(arquivo, 420, true);
        const texto =
          arquivo.name
            .replace(/\.[^.]+$/, '')
            .replace(/[-_]+/g, ' ')
            .trim()
            .slice(0, 30) || 'imagem';
        await adicionarSimbolo(prancha.id, { texto, cor: 'diversos', imagemCheia: true }, dataUrl);
        adicionadas++;
      } catch {
        // Uma imagem inválida não impede as outras.
      }
    }
    mostrarAviso(
      adicionadas === 0
        ? 'Não foi possível usar essas imagens.'
        : `${adicionadas} imagem${adicionadas > 1 ? 'ns' : ''} adicionada${adicionadas > 1 ? 's' : ''} em “${prancha.nome}”. Toque em cada bloco para trocar a palavra.`
    );
  };

  // --- Gravação de voz pelo microfone ---------------------------------------

  const comecarGravacao = async () => {
    try {
      controleGravacao.current = await iniciarGravacao();
      setGravando(true);
    } catch {
      mostrarAviso('Não foi possível usar o microfone. Verifique a permissão do navegador.');
    }
  };

  const pararGravacao = async () => {
    if (!controleGravacao.current) return;
    try {
      const dataUrl = await controleGravacao.current.parar();
      setRascunho((r) => (r ? { ...r, audioNovo: dataUrl } : r));
    } catch {
      mostrarAviso('Não foi possível salvar a gravação.');
    } finally {
      controleGravacao.current = null;
      setGravando(false);
    }
  };

  const cancelarGravacao = () => {
    controleGravacao.current?.cancelar();
    controleGravacao.current = null;
    setGravando(false);
  };

  const escolherImagem = async (arquivo: File) => {
    try {
      // Redimensionada para 300px no próprio aparelho antes de salvar.
      // Se for um cartão inteiro, guarda com transparência e um pouco maior.
      const dataUrl = await redimensionarImagem(
        arquivo,
        rascunho?.imagemCheia ? 420 : 300,
        Boolean(rascunho?.imagemCheia)
      );
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
      pranchaDestinoId: rascunho.pranchaDestinoId || undefined,
      imagemCheia: rascunho.imagemCheia && Boolean(rascunho.imagemNova || rascunho.imagemAtual),
      // Foto nova (ou emoji no lugar da imagem) substitui a imagem que veio com o app.
      imagemUrl: rascunho.imagemNova || !rascunho.imagemAtual ? undefined : rascunho.imagemUrl
    };

    let simboloId = rascunho.simboloId;
    if (simboloId) {
      await atualizarSimbolo(prancha.id, simboloId, dados, rascunho.imagemNova);
    } else {
      simboloId = await adicionarSimbolo(
        rascunho.categoriaId || prancha.id,
        dados,
        rascunho.imagemNova
      );
    }
    // Onde o símbolo mora agora (a categoria pode ter sido trocada no formulário).
    const moradaAtual = rascunho.simboloId ? prancha.id : rascunho.categoriaId || prancha.id;

    // Voz gravada: só grava/remove se algo mudou nesta edição.
    if (rascunho.audioNovo) {
      await definirAudioSimbolo(moradaAtual, simboloId, rascunho.audioNovo);
    } else if (rascunho.simboloId && !rascunho.audioAtual) {
      removerAudioSimbolo(moradaAtual, simboloId);
    }

    // Trocou de categoria ao editar? Então move o símbolo.
    const mudouDeCategoria =
      Boolean(rascunho.simboloId) && rascunho.categoriaId && rascunho.categoriaId !== prancha.id;
    if (mudouDeCategoria) {
      transferirSimbolo(prancha.id, simboloId, rascunho.categoriaId);
      const destino = pranchas.find((p) => p.id === rascunho.categoriaId);
      mostrarAviso(`Símbolo “${texto}” salvo e movido para “${destino?.nome ?? 'outra categoria'}”.`);
      setRascunho(null);
      return;
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

      {/* Seleção e ações da categoria */}
      <section className="flex flex-col gap-2 cartao">
        <label className="rotulo-campo" htmlFor="seletor-prancha">
          Categoria que você está editando
        </label>
        <select
          id="seletor-prancha"
          className="campo"
          value={prancha.id}
          onChange={(e) => {
            setPranchaId(e.target.value);
            setFormCategoria(null);
          }}
        >
          {pranchas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.emoji ? `${p.emoji} ` : ''}
              {p.inicial ? 'Início (mapa das categorias)' : p.nome} ({p.simbolos.length})
            </option>
          ))}
        </select>

        <button type="button" className="botao botao-primario w-full text-lg" onClick={abrirNovo}>
          + NOVA PALAVRA
        </button>
        <button type="button" className="botao w-full" onClick={() => setMostrarBanco((v) => !v)} disabled={prancha.inicial}>
          📚 PALAVRAS PRONTAS
        </button>

        <details className="detalhe-opcoes">
          <summary className="detalhe-opcoes-titulo">⚙️ Mais opções da categoria</summary>
          <div className="mt-3 flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="botao" onClick={abrirNovaCategoria}>
                🗂️ NOVA CATEGORIA
              </button>
              <button type="button" className="botao" onClick={abrirEdicaoCategoria} disabled={prancha.inicial}>
                ✏️ EDITAR CATEGORIA
              </button>
              <button type="button" className="botao" onClick={apagarPrancha} disabled={prancha.inicial}>
                🗑️ EXCLUIR CATEGORIA
              </button>
              <button
                type="button"
                className="botao"
                onClick={() => inputVarias.current?.click()}
              >
                🖼️ VÁRIAS IMAGENS
              </button>
              <button type="button" className="botao" onClick={() => exportarPrancha(prancha.id)}>
                ⬇️ EXPORTAR
              </button>
              <button type="button" className="botao" onClick={() => inputJson.current?.click()}>
                ⬆️ IMPORTAR
              </button>
            </div>
            <input
              ref={inputVarias}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const arquivos = Array.from(e.target.files ?? []);
                e.target.value = '';
                if (arquivos.length > 0) void adicionarVariasImagens(arquivos);
              }}
            />
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
              Exportar/importar gera um arquivo desta categoria para trocar com outra pessoa, mesmo
              sem internet. Para levar a prancheta INTEIRA de um aluno, use a aba{' '}
              <strong>Perfis</strong>.
            </p>
          </div>
        </details>
      </section>

      {/* Formulário de categoria (nova ou editar) */}
      {formCategoria && (
        <section
          className="flex flex-col gap-3 cartao"
          style={{ borderColor: 'var(--primaria)', borderWidth: 4 }}
        >
          <h2 className="titulo-tela">
            {formCategoria.modo === 'nova' ? 'Nova categoria' : 'Editar categoria'}
          </h2>
          <p className="text-sm" style={{ color: 'var(--texto-suave)' }}>
            A categoria aparece como um bloco colorido na tela de Início. Depois de criar, é só
            adicionar as palavras dela.
          </p>

          <div>
            <label className="rotulo-campo" htmlFor="campo-nome-categoria">
              Nome da categoria
            </label>
            <input
              id="campo-nome-categoria"
              className="campo"
              value={formCategoria.nome}
              placeholder="Ex.: Brinquedos"
              onChange={(e) => setFormCategoria({ ...formCategoria, nome: e.target.value })}
            />
          </div>

          <div>
            <span className="rotulo-campo">Ícone da categoria</span>
            <div className="mb-2 flex items-center gap-3">
              <span
                className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 text-4xl"
                style={{ borderColor: 'var(--borda)' }}
              >
                {formCategoria.emoji}
              </span>
              <span className="text-sm opacity-80">Escolha um desenho abaixo:</span>
            </div>
            <EscolherEmoji
              valor={formCategoria.emoji}
              onEscolher={(emoji) => setFormCategoria({ ...formCategoria, emoji })}
            />
          </div>

          <div>
            <span className="rotulo-campo">Cor do bloco</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CORES_FITZGERALD.map((cor) => (
                <button
                  key={cor.id}
                  type="button"
                  onClick={() => setFormCategoria({ ...formCategoria, cor: cor.id })}
                  aria-pressed={formCategoria.cor === cor.id}
                  className={`min-h-toque amostra-tile rounded-2xl border-4 px-3 py-2 text-left font-extrabold ${classesDaCor(
                    cor.id
                  )} ${formCategoria.cor === cor.id ? 'ring-4 ring-violet-600' : ''}`}
                >
                  {cor.rotulo}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button type="button" className="botao botao-primario flex-1" onClick={salvarCategoria}>
              ✅ SALVAR CATEGORIA
            </button>
            <button type="button" className="botao flex-1" onClick={() => setFormCategoria(null)}>
              CANCELAR
            </button>
          </div>
        </section>
      )}

      {/* Banco de palavras prontas */}
      {mostrarBanco && !prancha.inicial && (
        <BancoDePalavras
          nomeDestino={prancha.nome}
          onAdicionar={(simbolos) => adicionarSimbolosProntos(prancha.id, simbolos)}
          onFechar={() => setMostrarBanco(false)}
        />
      )}

      {/* Modelos de prancheta: somar categorias prontas ao perfil atual */}
      <details className="detalhe-opcoes" open={mostrarModelos} onToggle={(e) => setMostrarModelos(e.currentTarget.open)}>
        <summary className="detalhe-opcoes-titulo">🎒 Adicionar categorias de um modelo</summary>
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-sm opacity-80">
            Escolha um modelo (Escola, Casa, Passeio...) e some as categorias dele a esta
            prancheta. Categorias com o mesmo nome de alguma que você já tem não são repetidas.
          </p>
          <GaleriaModelos valor={modeloEscolhido} onEscolher={setModeloEscolhido} />
          <button
            type="button"
            className="botao botao-primario w-full"
            onClick={() => void adicionarModeloAoPerfil()}
          >
            + ADICIONAR AO INÍCIO
          </button>
        </div>
      </details>

      {/* Formulário de símbolo */}
      {rascunho && (
        <section className="flex flex-col gap-3 cartao" style={{ borderColor: 'var(--primaria)', borderWidth: 4 }}>
          <h2 className="titulo-tela">
            {rascunho.simboloId ? 'Editar palavra' : 'Nova palavra'}
          </h2>

          <div>
            <label className="rotulo-campo" htmlFor="campo-texto">
              Palavra que aparece no bloco
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
            {(rascunho.imagemNova || rascunho.imagemAtual) && (
              <label className="mb-2 flex min-h-toque items-center gap-2 text-sm font-bold">
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={rascunho.imagemCheia}
                  onChange={(e) => setRascunho({ ...rascunho, imagemCheia: e.target.checked })}
                />
                A imagem já é o cartão inteiro (com fundo e palavra): mostrar só ela no bloco
              </label>
            )}
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
            <label className="rotulo-campo" htmlFor="campo-categoria">
              Em qual categoria esta palavra fica?
            </label>
            <select
              id="campo-categoria"
              className="campo"
              value={rascunho.categoriaId}
              onChange={(e) => setRascunho({ ...rascunho, categoriaId: e.target.value })}
            >
              {pranchas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.emoji ? `${p.emoji} ` : ''}
                  {p.inicial ? 'Início (mapa das categorias)' : p.nome}
                </option>
              ))}
            </select>
            {rascunho.simboloId && (
              <p className="mt-1 text-sm opacity-80">
                Trocar a categoria aqui move a palavra para lá ao salvar.
              </p>
            )}
          </div>

          <details className="detalhe-opcoes">
            <summary className="detalhe-opcoes-titulo">⚙️ Opções avançadas da palavra</summary>
            <div className="mt-3 flex flex-col gap-4">
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
                <span className="rotulo-campo">Voz gravada</span>
                <p className="mb-2 text-sm opacity-80">
                  Grave a sua voz (ou de quem a pessoa reconhece) dizendo a palavra. Quando houver
                  uma gravação, ela toca em vez da voz do aparelho.
                </p>
                {!gravacaoDisponivel() ? (
                  <p className="cartao text-sm font-bold">
                    Este navegador não permite gravar áudio pelo microfone.
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    {!gravando ? (
                      <button type="button" className="botao" onClick={() => void comecarGravacao()}>
                        🎤 GRAVAR MINHA VOZ
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="botao botao-falar"
                          onClick={() => void pararGravacao()}
                        >
                          ⏹️ PARAR E SALVAR
                        </button>
                        <button type="button" className="botao" onClick={cancelarGravacao}>
                          CANCELAR GRAVAÇÃO
                        </button>
                        <span className="pilula" aria-live="polite">
                          🔴 gravando…
                        </span>
                      </>
                    )}
                    {(rascunho.audioNovo || rascunho.audioAtual) && !gravando && (
                      <>
                        <button
                          type="button"
                          className="botao"
                          onClick={() =>
                            tocarAudioGravado((rascunho.audioNovo ?? rascunho.audioAtual) as string)
                          }
                        >
                          ▶️ OUVIR
                        </button>
                        <button
                          type="button"
                          className="botao"
                          onClick={() =>
                            setRascunho({ ...rascunho, audioNovo: undefined, audioAtual: undefined })
                          }
                        >
                          🗑️ APAGAR GRAVAÇÃO
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="rotulo-campo" htmlFor="campo-destino">
                  Este bloco abre outra categoria? (opcional)
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
            </div>
          </details>

          <div className="flex gap-2">
            <button type="button" className="botao botao-primario flex-1" onClick={() => void salvar()}>
              ✅ SALVAR
            </button>
            <button
              type="button"
              className="botao flex-1"
              onClick={() => {
                cancelarGravacao();
                setRascunho(null);
              }}
            >
              CANCELAR
            </button>
          </div>
        </section>
      )}

      {/* Lista de símbolos com reordenação */}
      <section className="flex flex-col gap-2">
        <h2 className="titulo-tela">
          Palavras de “{prancha.nome}” ({prancha.simbolos.length})
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
              {(simbolo.imagemId ? imagens[simbolo.imagemId] : simbolo.imagemUrl) ? (
                <img
                  src={simbolo.imagemId ? imagens[simbolo.imagemId] : simbolo.imagemUrl}
                  alt=""
                  className={`h-full w-full rounded-xl ${
                    simbolo.imagemCheia ? 'object-contain' : 'object-cover'
                  }`}
                />
              ) : (
                <span aria-hidden="true" className="text-3xl">
                  {simbolo.emoji || '🔤'}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1 basis-40">
              <p className="truncate font-extrabold uppercase">
                {simbolo.texto} {simbolo.audioId && <span title="Tem voz gravada">🎤</span>}
              </p>
              <p className="truncate text-sm opacity-80">
                {simbolo.pranchaDestinoId
                  ? `abre: ${pranchas.find((p) => p.id === simbolo.pranchaDestinoId)?.nome ?? '—'}`
                  : simbolo.audioId
                    ? 'toca a voz gravada'
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
            Nenhuma palavra aqui ainda. Toque em <strong>NOVA PALAVRA</strong> ou <strong>PALAVRAS PRONTAS</strong>.
          </p>
        )}
      </section>
    </div>
  );
}
