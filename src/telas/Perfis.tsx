import { useRef, useState } from 'react';
import { useApp } from '../estado/AppContext';
import { GaleriaModelos } from '../componentes/GaleriaModelos';
import { MODELOS_PRONTOS } from '../dados/modelos';
import { lerComoTexto, redimensionarImagem } from '../utilidades/imagem';

/**
 * Perfis: cada um tem suas próprias pranchas, configurações e histórico.
 * Útil para terapeuta que atende vários pacientes no mesmo aparelho.
 * A troca acontece em dois toques: abrir a aba e tocar no perfil.
 */
export function Perfis() {
  const {
    perfis,
    perfil,
    imagens,
    trocarPerfil,
    adicionarPerfil,
    renomearPerfil,
    definirFotoPerfil,
    excluirPerfil,
    exportarPerfil,
    importarPerfil,
    salvarPerfilComoModelo
  } = useApp();

  const [nomeNovo, setNomeNovo] = useState('');
  const [fotoNova, setFotoNova] = useState<string | undefined>();
  const inputFotoNova = useRef<HTMLInputElement>(null);
  const inputFotoPerfil = useRef<HTMLInputElement>(null);
  const [idParaFoto, setIdParaFoto] = useState<string | null>(null);
  const [modeloNovo, setModeloNovo] = useState(MODELOS_PRONTOS[0].id);
  const [aviso, setAviso] = useState('');
  const inputPacote = useRef<HTMLInputElement>(null);

  const mostrarAviso = (texto: string) => {
    setAviso(texto);
    window.setTimeout(() => setAviso(''), 5000);
  };

  const importarArquivo = async (arquivo: File) => {
    try {
      const nome = await importarPerfil(await lerComoTexto(arquivo));
      mostrarAviso(`Prancheta “${nome}” importada e já em uso.`);
    } catch (erro) {
      mostrarAviso(erro instanceof Error ? erro.message : 'Não foi possível importar o arquivo.');
    }
  };

  const guardarComoModelo = async (id: string, nomeAtual: string) => {
    const nome = window.prompt(
      'Nome do modelo (ele fica em "Minhas pranchetas" para criar a prancheta de outros alunos):',
      nomeAtual
    );
    if (!nome?.trim()) return;
    await salvarPerfilComoModelo(id, nome.trim(), '⭐');
    mostrarAviso(`Modelo “${nome.trim()}” salvo. Use-o ao criar um novo perfil.`);
  };

  const criar = async () => {
    if (!nomeNovo.trim()) {
      window.alert('Escreva o nome do perfil.');
      return;
    }
    await adicionarPerfil(nomeNovo, fotoNova, modeloNovo);
    mostrarAviso(`Prancheta de “${nomeNovo.trim()}” criada e já em uso.`);
    setNomeNovo('');
    setFotoNova(undefined);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-3 pb-16 sm:gap-5 sm:p-4 lg:p-6 lg:pb-10">
      <h1 className="titulo-tela">Perfis e pranchetas</h1>
      <p className="text-sm opacity-80">
        Cada perfil é a prancheta de uma pessoa (um aluno, por exemplo), com as próprias
        categorias, palavras, configurações e histórico. Toque em um perfil para usá-lo agora.
      </p>

      {aviso && (
        <p role="status" className="cartao font-extrabold" style={{ borderColor: 'var(--primaria)' }}>
          {aviso}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {perfis.map((p) => {
          const ativo = p.id === perfil.id;
          return (
            <li
              key={p.id}
              className={`cartao flex flex-col gap-3 ${ativo ? 'border-4' : ''}`}
              style={ativo ? { borderColor: 'var(--primaria)' } : undefined}
            >
              <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex min-h-toque flex-1 items-center gap-3 text-left"
                onClick={() => trocarPerfil(p.id)}
                aria-current={ativo}
              >
                <span
                  className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2"
                  style={{ borderColor: 'var(--borda)' }}
                >
                  {p.fotoId && imagens[p.fotoId] ? (
                    <img src={imagens[p.fotoId]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span aria-hidden="true" className="text-3xl">
                      🙂
                    </span>
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-lg font-extrabold">{p.nome}</span>
                  <span className="block text-sm opacity-80">
                    {p.pranchas.length} pranchas · {p.historico.length} frases no histórico
                    {ativo ? ' · EM USO' : ''}
                  </span>
                </span>
              </button>

              <div className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  className="botao px-3"
                  aria-label={`Renomear ${p.nome}`}
                  onClick={() => {
                    const nome = window.prompt('Novo nome do perfil:', p.nome);
                    if (nome?.trim()) renomearPerfil(p.id, nome.trim());
                  }}
                >
                  ✏️
                </button>
                <button
                  type="button"
                  className="botao px-3"
                  aria-label={`Trocar a foto de ${p.nome}`}
                  onClick={() => {
                    setIdParaFoto(p.id);
                    inputFotoPerfil.current?.click();
                  }}
                >
                  📷
                </button>
                <button
                  type="button"
                  className="botao px-3"
                  aria-label={`Excluir ${p.nome}`}
                  disabled={perfis.length === 1}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Excluir o perfil “${p.nome}” com todas as suas pranchas? Isso não pode ser desfeito.`
                      )
                    ) {
                      excluirPerfil(p.id);
                    }
                  }}
                >
                  🗑️
                </button>
              </div>
              </div>

              {/* Levar a prancheta deste aluno para outro aparelho, ou guardá-la
                  como modelo para criar a de outros alunos. */}
              <div className="flex flex-wrap gap-2">
                <button type="button" className="botao flex-1 basis-40" onClick={() => exportarPerfil(p.id)}>
                  ⬇️ EXPORTAR PRANCHETA
                </button>
                <button
                  type="button"
                  className="botao flex-1 basis-40"
                  onClick={() => void guardarComoModelo(p.id, p.nome)}
                >
                  ⭐ SALVAR COMO MODELO
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <input
        ref={inputFotoPerfil}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const arquivo = e.target.files?.[0];
          e.target.value = '';
          if (!arquivo || !idParaFoto) return;
          const dataUrl = await redimensionarImagem(arquivo, 300);
          await definirFotoPerfil(idParaFoto, dataUrl);
          setIdParaFoto(null);
        }}
      />

      <section className="flex flex-col gap-3 cartao">
        <h2 className="text-lg font-extrabold">Criar novo perfil</h2>
        <div>
          <label className="rotulo-campo" htmlFor="campo-nome-perfil">
            Nome
          </label>
          <input
            id="campo-nome-perfil"
            className="campo"
            value={nomeNovo}
            placeholder="Ex.: João"
            onChange={(e) => setNomeNovo(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <span
            className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2"
            style={{ borderColor: 'var(--borda)' }}
          >
            {fotoNova ? (
              <img src={fotoNova} alt="Prévia da foto" className="h-full w-full object-cover" />
            ) : (
              <span aria-hidden="true" className="text-3xl">
                🙂
              </span>
            )}
          </span>
          <button type="button" className="botao" onClick={() => inputFotoNova.current?.click()}>
            📷 FOTO (OPCIONAL)
          </button>
          <input
            ref={inputFotoNova}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const arquivo = e.target.files?.[0];
              e.target.value = '';
              if (arquivo) setFotoNova(await redimensionarImagem(arquivo, 300));
            }}
          />
        </div>

        <div>
          <span className="rotulo-campo">Começar de qual modelo?</span>
          <p className="mb-2 text-sm opacity-80">
            O aluno recebe uma cópia do modelo e pode mudar tudo depois, sem afetar os outros.
          </p>
          <GaleriaModelos valor={modeloNovo} onEscolher={setModeloNovo} permitirExcluir />
        </div>

        <button type="button" className="botao botao-primario" onClick={() => void criar()}>
          + CRIAR PRANCHETA DO ALUNO
        </button>
      </section>

      <section className="flex flex-col gap-2 cartao">
        <h2 className="text-lg font-extrabold">Receber uma prancheta pronta</h2>
        <p className="text-sm opacity-80">
          Recebeu o arquivo de uma prancheta de um colega ou terapeuta? Importe aqui — ela vira um
          novo perfil, com todas as categorias, imagens e vozes gravadas.
        </p>
        <button type="button" className="botao" onClick={() => inputPacote.current?.click()}>
          ⬆️ IMPORTAR PRANCHETA (ARQUIVO .JSON)
        </button>
        <input
          ref={inputPacote}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const arquivo = e.target.files?.[0];
            e.target.value = '';
            if (arquivo) void importarArquivo(arquivo);
          }}
        />
      </section>
    </div>
  );
}
