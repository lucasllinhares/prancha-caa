import type { Prancha, Simbolo } from '../tipos';

// ---------------------------------------------------------------------------
// Vocabulário inicial em português do Brasil.
//
// Os verbos já aparecem conjugados na primeira pessoa ("quero", "gosto"),
// que é como as pranchas brasileiras funcionam na prática. Isso faz a frase
// montada sair natural sem precisar de gramática complexa.
// ---------------------------------------------------------------------------

/** Atalho para criar símbolos com menos repetição. */
function s(
  id: string,
  texto: string,
  emoji: string,
  cor: Simbolo['cor'],
  extra: Partial<Simbolo> = {}
): Simbolo {
  return { id, texto, emoji, cor, ...extra };
}

/**
 * NÚCLEO: palavras de altíssima frequência. Ficam numa faixa fixa, sempre
 * visíveis, em qualquer prancha. Com essas 15 palavras a pessoa já consegue
 * pedir, recusar, comentar e pedir ajuda.
 */
export const SIMBOLOS_NUCLEO: Simbolo[] = [
  s('nuc-eu', 'eu', '🙋', 'pessoas'),
  s('nuc-voce', 'você', '👉', 'pessoas'),
  s('nuc-quero', 'quero', '🤲', 'acoes'),
  s('nuc-nao-quero', 'não quero', '🙅', 'acoes'),
  s('nuc-mais', 'mais', '➕', 'diversos'),
  s('nuc-acabou', 'acabou', '🔚', 'diversos'),
  s('nuc-sim', 'sim', '✅', 'social'),
  s('nuc-nao', 'não', '❌', 'social'),
  s('nuc-ajuda', 'ajuda', '🆘', 'social', { textoFala: 'me ajuda' }),
  s('nuc-parar', 'parar', '🛑', 'acoes'),
  s('nuc-ir', 'ir', '🚶', 'acoes'),
  s('nuc-gosto', 'gosto', '❤️', 'acoes'),
  s('nuc-nao-gosto', 'não gosto', '💔', 'acoes'),
  s('nuc-meu', 'meu', '🫵', 'descritivos'),
  s('nuc-da', 'dá', '🫴', 'acoes', { textoFala: 'me dá' })
];

const sentimentos: Simbolo[] = [
  s('sen-feliz', 'feliz', '😀', 'descritivos'),
  s('sen-triste', 'triste', '😢', 'descritivos'),
  s('sen-bravo', 'bravo', '😠', 'descritivos'),
  s('sen-medo', 'com medo', '😨', 'descritivos'),
  s('sen-cansado', 'cansado', '🥱', 'descritivos'),
  s('sen-dor', 'com dor', '🤕', 'descritivos'),
  s('sen-entediado', 'entediado', '😑', 'descritivos'),
  s('sen-animado', 'animado', '🤩', 'descritivos'),
  s('sen-nervoso', 'nervoso', '😰', 'descritivos'),
  s('sen-confuso', 'confuso', '😕', 'descritivos'),
  s('sen-sono', 'com sono', '😴', 'descritivos'),
  s('sen-tranquilo', 'tranquilo', '😌', 'descritivos'),
  s('sen-saudade', 'com saudade', '🥺', 'descritivos'),
  s('sen-envergonhado', 'envergonhado', '😳', 'descritivos')
];

const necessidades: Simbolo[] = [
  s('nec-banheiro', 'banheiro', '🚽', 'substantivos'),
  s('nec-agua', 'água', '💧', 'substantivos'),
  s('nec-comer', 'comer', '🍽️', 'acoes'),
  s('nec-dormir', 'dormir', '🛏️', 'acoes'),
  s('nec-remedio', 'remédio', '💊', 'substantivos'),
  s('nec-colo', 'colo', '🤱', 'substantivos'),
  s('nec-silencio', 'silêncio', '🤫', 'substantivos'),
  s('nec-sair-daqui', 'sair daqui', '🚪', 'acoes'),
  s('nec-muito-barulho', 'muito barulho', '🔊', 'descritivos', {
    textoFala: 'está muito barulho'
  }),
  s('nec-muita-luz', 'muita luz', '💡', 'descritivos', { textoFala: 'está com muita luz' }),
  s('nec-sozinho', 'quero ficar sozinho', '🧍', 'social'),
  s('nec-abraco', 'me abraça', '🤗', 'social'),
  s('nec-frio', 'estou com frio', '🥶', 'descritivos'),
  s('nec-calor', 'estou com calor', '🥵', 'descritivos'),
  s('nec-trocar', 'trocar de roupa', '👕', 'acoes')
];

const comida: Simbolo[] = [
  s('com-arroz', 'arroz', '🍚', 'substantivos'),
  s('com-feijao', 'feijão', '🫘', 'substantivos'),
  s('com-pao', 'pão', '🍞', 'substantivos'),
  s('com-leite', 'leite', '🥛', 'substantivos'),
  s('com-suco', 'suco', '🧃', 'substantivos'),
  s('com-banana', 'banana', '🍌', 'substantivos'),
  s('com-bolacha', 'bolacha', '🍪', 'substantivos'),
  s('com-macarrao', 'macarrão', '🍝', 'substantivos'),
  s('com-frango', 'frango', '🍗', 'substantivos'),
  s('com-fruta', 'fruta', '🍎', 'substantivos'),
  s('com-agua', 'água', '💧', 'substantivos'),
  s('com-achocolatado', 'achocolatado', '🥤', 'substantivos'),
  s('com-iogurte', 'iogurte', '🥣', 'substantivos'),
  s('com-salgadinho', 'salgadinho', '🍿', 'substantivos'),
  s('com-pipoca', 'pipoca', '🌽', 'substantivos'),
  s('com-bolo', 'bolo', '🍰', 'substantivos'),
  s('com-queijo', 'queijo', '🧀', 'substantivos'),
  s('com-ovo', 'ovo', '🥚', 'substantivos')
];

const pessoas: Simbolo[] = [
  s('pes-mae', 'mãe', '👩', 'pessoas'),
  s('pes-pai', 'pai', '👨', 'pessoas'),
  s('pes-vo-f', 'vó', '👵', 'pessoas'),
  s('pes-vo-m', 'vô', '👴', 'pessoas'),
  s('pes-irmao', 'irmão', '👦', 'pessoas'),
  s('pes-irma', 'irmã', '👧', 'pessoas'),
  s('pes-professora', 'professora', '🧑‍🏫', 'pessoas'),
  s('pes-terapeuta', 'terapeuta', '🧑‍⚕️', 'pessoas'),
  s('pes-amigo', 'amigo', '🧒', 'pessoas'),
  s('pes-medico', 'médico', '🩺', 'pessoas'),
  s('pes-tia', 'tia', '💃', 'pessoas'),
  s('pes-motorista', 'motorista', '🚐', 'pessoas'),
  s('pes-cuidadora', 'cuidadora', '🤝', 'pessoas'),
  s('pes-primo', 'primo', '🧑', 'pessoas')
];

const lugares: Simbolo[] = [
  s('lug-casa', 'casa', '🏠', 'substantivos'),
  s('lug-escola', 'escola', '🏫', 'substantivos'),
  s('lug-terapia', 'terapia', '🧩', 'substantivos'),
  s('lug-mercado', 'mercado', '🛒', 'substantivos'),
  s('lug-parque', 'parque', '🌳', 'substantivos'),
  s('lug-quarto', 'quarto', '🛏️', 'substantivos'),
  s('lug-banheiro', 'banheiro', '🚻', 'substantivos'),
  s('lug-cozinha', 'cozinha', '🍳', 'substantivos'),
  s('lug-carro', 'carro', '🚗', 'substantivos'),
  s('lug-onibus', 'ônibus', '🚌', 'substantivos'),
  s('lug-medico', 'médico', '🏥', 'substantivos'),
  s('lug-igreja', 'igreja', '⛪', 'substantivos'),
  s('lug-praia', 'praia', '🏖️', 'substantivos'),
  s('lug-sala', 'sala', '🛋️', 'substantivos')
];

const acoes: Simbolo[] = [
  s('aco-brincar', 'brincar', '🧸', 'acoes'),
  s('aco-assistir', 'assistir', '📺', 'acoes'),
  s('aco-musica', 'ouvir música', '🎵', 'acoes'),
  s('aco-desenhar', 'desenhar', '🖍️', 'acoes'),
  s('aco-banho', 'banho', '🛁', 'acoes', { textoFala: 'tomar banho' }),
  s('aco-escovar', 'escovar dente', '🪥', 'acoes'),
  s('aco-vestir', 'vestir', '👚', 'acoes'),
  s('aco-sair', 'sair', '🚪', 'acoes'),
  s('aco-entrar', 'entrar', '🏠', 'acoes'),
  s('aco-abrir', 'abrir', '🔓', 'acoes'),
  s('aco-fechar', 'fechar', '🔒', 'acoes'),
  s('aco-esperar', 'esperar', '⏳', 'acoes'),
  s('aco-celular', 'usar o celular', '📱', 'acoes'),
  s('aco-passear', 'passear', '🚶', 'acoes')
];

const escola: Simbolo[] = [
  s('esc-professora', 'professora', '🧑‍🏫', 'pessoas'),
  s('esc-sala', 'sala', '🚪', 'substantivos'),
  s('esc-lanche', 'lanche', '🥪', 'substantivos'),
  s('esc-recreio', 'recreio', '🤸', 'substantivos'),
  s('esc-tarefa', 'tarefa', '📝', 'substantivos'),
  s('esc-caderno', 'caderno', '📓', 'substantivos'),
  s('esc-colega', 'colega', '🧑', 'pessoas'),
  s('esc-terminei', 'terminei', '🏁', 'acoes'),
  s('esc-nao-entendi', 'não entendi', '❓', 'social'),
  s('esc-preciso-ajuda', 'preciso de ajuda', '🙋', 'social'),
  s('esc-quero-sair', 'quero sair', '🚶', 'acoes'),
  s('esc-banheiro', 'banheiro', '🚽', 'substantivos'),
  s('esc-agua', 'beber água', '🚰', 'acoes'),
  s('esc-repetir', 'pode repetir', '🔁', 'social')
];

const social: Simbolo[] = [
  s('soc-oi', 'oi', '👋', 'social'),
  s('soc-tchau', 'tchau', '🤚', 'social'),
  s('soc-obrigado', 'obrigado', '🙏', 'social'),
  s('soc-porfavor', 'por favor', '🥹', 'social'),
  s('soc-desculpa', 'desculpa', '😞', 'social'),
  s('soc-bom-dia', 'bom dia', '🌞', 'social'),
  s('soc-boa-noite', 'boa noite', '🌙', 'social'),
  s('soc-tudo-bem', 'tudo bem', '👌', 'social'),
  s('soc-espera', 'espera um pouco', '✋', 'social'),
  s('soc-vem-ca', 'vem cá', '🫱', 'social'),
  s('soc-te-amo', 'eu te amo', '🥰', 'social'),
  s('soc-quem-e', 'quem é', '🤔', 'social')
];

const numeros: Simbolo[] = [
  s('num-zero', 'zero', '0️⃣', 'lima'),
  s('num-um', 'um', '1️⃣', 'lima'),
  s('num-dois', 'dois', '2️⃣', 'lima'),
  s('num-tres', 'três', '3️⃣', 'lima'),
  s('num-quatro', 'quatro', '4️⃣', 'lima'),
  s('num-cinco', 'cinco', '5️⃣', 'lima'),
  s('num-seis', 'seis', '6️⃣', 'lima'),
  s('num-sete', 'sete', '7️⃣', 'lima'),
  s('num-oito', 'oito', '8️⃣', 'lima'),
  s('num-nove', 'nove', '9️⃣', 'lima'),
  s('num-dez', 'dez', '🔟', 'lima'),
  s('num-muitos', 'muitos', '🔢', 'lima'),
  s('num-poucos', 'poucos', '🤏', 'lima')
];

const cores: Simbolo[] = [
  s('cor-vermelho', 'vermelho', '🔴', 'diversos'),
  s('cor-azul', 'azul', '🔵', 'diversos'),
  s('cor-amarelo', 'amarelo', '🟡', 'diversos'),
  s('cor-verde', 'verde', '🟢', 'diversos'),
  s('cor-laranja', 'laranja', '🟠', 'diversos'),
  s('cor-roxo', 'roxo', '🟣', 'diversos'),
  s('cor-rosa', 'rosa', '🌸', 'diversos'),
  s('cor-marrom', 'marrom', '🟤', 'diversos'),
  s('cor-preto', 'preto', '⚫', 'diversos'),
  s('cor-branco', 'branco', '⚪', 'diversos'),
  s('cor-cinza', 'cinza', '🌫️', 'diversos')
];

const dias: Simbolo[] = [
  s('dia-segunda', 'segunda-feira', '📅', 'descritivos'),
  s('dia-terca', 'terça-feira', '📅', 'descritivos'),
  s('dia-quarta', 'quarta-feira', '📅', 'descritivos'),
  s('dia-quinta', 'quinta-feira', '📅', 'descritivos'),
  s('dia-sexta', 'sexta-feira', '📅', 'descritivos'),
  s('dia-sabado', 'sábado', '🎉', 'descritivos'),
  s('dia-domingo', 'domingo', '☀️', 'descritivos'),
  s('dia-hoje', 'hoje', '👉', 'descritivos'),
  s('dia-amanha', 'amanhã', '⏭️', 'descritivos'),
  s('dia-ontem', 'ontem', '⏮️', 'descritivos')
];

const clima: Simbolo[] = [
  s('cli-sol', 'sol', '☀️', 'vermelho'),
  s('cli-chuva', 'chuva', '🌧️', 'vermelho'),
  s('cli-nublado', 'nublado', '☁️', 'vermelho'),
  s('cli-vento', 'vento', '💨', 'vermelho'),
  s('cli-frio', 'frio', '🥶', 'vermelho'),
  s('cli-calor', 'calor', '🥵', 'vermelho'),
  s('cli-quente', 'quente', '🔥', 'vermelho'),
  s('cli-trovao', 'trovão', '⛈️', 'vermelho'),
  s('cli-arco-iris', 'arco-íris', '🌈', 'vermelho'),
  s('cli-umido', 'úmido', '💧', 'vermelho')
];

const corpo: Simbolo[] = [
  s('crp-cabeca', 'cabeça', '🗣️', 'substantivos'),
  s('crp-olho', 'olho', '👁️', 'substantivos'),
  s('crp-nariz', 'nariz', '👃', 'substantivos'),
  s('crp-boca', 'boca', '👄', 'substantivos'),
  s('crp-orelha', 'orelha', '👂', 'substantivos'),
  s('crp-mao', 'mão', '✋', 'substantivos'),
  s('crp-pe', 'pé', '🦶', 'substantivos'),
  s('crp-barriga', 'barriga', '🫃', 'substantivos'),
  s('crp-braco', 'braço', '💪', 'substantivos'),
  s('crp-perna', 'perna', '🦵', 'substantivos'),
  s('crp-dente', 'dente', '🦷', 'substantivos'),
  s('crp-cabelo', 'cabelo', '💇', 'substantivos')
];

const higiene: Simbolo[] = [
  s('hig-lavar-mao', 'lavar mão', '🧼', 'acoes'),
  s('hig-escovar-dente', 'escovar dente', '🪥', 'acoes'),
  s('hig-pentear', 'pentear cabelo', '💇', 'acoes'),
  s('hig-cortar-unha', 'cortar unha', '💅', 'acoes'),
  s('hig-sabonete', 'usar sabonete', '🧴', 'acoes'),
  s('hig-banho', 'tomar banho', '🚿', 'acoes'),
  s('hig-secar', 'secar o corpo', '🩹', 'acoes'),
  s('hig-fralda', 'trocar fralda', '🧷', 'acoes'),
  s('hig-limpar-nariz', 'limpar nariz', '🤧', 'acoes'),
  s('hig-perfume', 'usar perfume', '🌸', 'acoes')
];

/**
 * Versão atual do vocabulário de fábrica. Sobe quando novas categorias são
 * adicionadas ao app. `migrarVocabulario` (em `armazenamento/db.ts`) usa isso
 * para trazer as categorias novas para perfis que já existiam, sem duplicar
 * nada nem trazer de volta o que a pessoa já excluiu.
 */
export const VERSAO_VOCABULARIO_ATUAL = 2;

/**
 * Pranchas de categoria criadas no primeiro uso do app.
 *
 * `cor` é a cor da capa da categoria na tela inicial. Cada categoria tem uma
 * cor DIFERENTE das outras, e cada cor traz também uma textura própria
 * (bolinhas, listras, grade...), definida em `src/index.css`. Assim a criança
 * reconhece "Comida" e "Pessoas" de longe, pela cor e pelo padrão — e a
 * diferença continua visível para quem não distingue bem as cores.
 *
 * `versao` marca em qual atualização do vocabulário a categoria apareceu:
 * 1 = as 8 categorias originais, 2 = as 6 novas (Números, Cores, Dias da
 * semana, Clima, Corpo humano, Higiene).
 */
export const PRANCHAS_CATEGORIA: (Prancha & { cor: Simbolo['cor']; versao: number })[] = [
  { id: 'p-sentimentos', nome: 'Sentimentos', emoji: '😀', cor: 'descritivos', versao: 1, simbolos: sentimentos },
  { id: 'p-necessidades', nome: 'Necessidades', emoji: '🆘', cor: 'vermelho', versao: 1, simbolos: necessidades },
  { id: 'p-comida', nome: 'Comida', emoji: '🍽️', cor: 'substantivos', versao: 1, simbolos: comida },
  { id: 'p-pessoas', nome: 'Pessoas', emoji: '👨', cor: 'pessoas', versao: 1, simbolos: pessoas },
  { id: 'p-lugares', nome: 'Lugares', emoji: '🏠', cor: 'turquesa', versao: 1, simbolos: lugares },
  { id: 'p-acoes', nome: 'Ações', emoji: '🏃', cor: 'acoes', versao: 1, simbolos: acoes },
  { id: 'p-escola', nome: 'Escola', emoji: '🏫', cor: 'roxo', versao: 1, simbolos: escola },
  { id: 'p-social', nome: 'Social', emoji: '👋', cor: 'social', versao: 1, simbolos: social },
  { id: 'p-numeros', nome: 'Números', emoji: '🔢', cor: 'lima', versao: 2, simbolos: numeros },
  { id: 'p-cores', nome: 'Cores', emoji: '🎨', cor: 'diversos', versao: 2, simbolos: cores },
  { id: 'p-dias', nome: 'Dias da semana', emoji: '📅', cor: 'descritivos', versao: 2, simbolos: dias },
  { id: 'p-clima', nome: 'Clima', emoji: '⛅', cor: 'vermelho', versao: 2, simbolos: clima },
  { id: 'p-corpo', nome: 'Corpo humano', emoji: '🧑', cor: 'substantivos', versao: 2, simbolos: corpo },
  { id: 'p-higiene', nome: 'Higiene', emoji: '🧼', cor: 'acoes', versao: 2, simbolos: higiene }
];

/** Monta o botão de categoria que fica na prancha de Início. */
function botaoDaCategoria(p: (typeof PRANCHAS_CATEGORIA)[number]): Simbolo {
  return s(`cat-${p.id}`, p.nome, p.emoji ?? '📁', p.cor, { pranchaDestinoId: p.id });
}

/** Prancha inicial: cada botão abre uma categoria. */
export const PRANCHA_INICIAL: Prancha = {
  id: 'p-inicial',
  nome: 'Início',
  emoji: '🏠',
  inicial: true,
  simbolos: PRANCHAS_CATEGORIA.map(botaoDaCategoria)
};

/** Clona o vocabulário para que cada perfil tenha suas próprias pranchas. */
export function criarPranchasIniciais(): Prancha[] {
  return JSON.parse(JSON.stringify([PRANCHA_INICIAL, ...PRANCHAS_CATEGORIA])) as Prancha[];
}

/**
 * Categorias de fábrica que um perfil ainda não tem, dado a versão de
 * vocabulário que ele já recebeu. Usado para trazer categorias novas
 * (Números, Cores...) para perfis criados antes delas existirem.
 */
export function categoriasFaltando(
  versaoJaRecebida: number,
  idsExistentes: Set<string>
): (Prancha & { cor: Simbolo['cor']; versao: number })[] {
  return PRANCHAS_CATEGORIA.filter(
    (p) => p.versao > versaoJaRecebida && !idsExistentes.has(p.id)
  );
}

/** Clona uma categoria (prancha) e devolve também o botão que abre ela. */
export function clonarCategoriaComBotao(
  categoria: (typeof PRANCHAS_CATEGORIA)[number]
): { prancha: Prancha; botao: Simbolo } {
  const prancha = JSON.parse(JSON.stringify(categoria)) as Prancha;
  return { prancha, botao: botaoDaCategoria(categoria) };
}
