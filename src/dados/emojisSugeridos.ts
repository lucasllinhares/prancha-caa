/**
 * Lista de emojis sugeridos no editor, agrupada por assunto.
 * A ideia é que mãe, pai ou terapeuta encontre rápido, sem teclado de emoji.
 */
export const EMOJIS_SUGERIDOS: { grupo: string; emojis: string[] }[] = [
  {
    grupo: 'Sentimentos',
    emojis: ['😀', '😁', '🙂', '😢', '😭', '😠', '😡', '😨', '🥱', '🤕', '😑', '🤩', '😰', '😕', '😴', '😌', '🥺', '😳']
  },
  {
    grupo: 'Pessoas',
    emojis: ['🙋', '👉', '👩', '👨', '👵', '👴', '👦', '👧', '🧒', '🧑', '🧑‍🏫', '🧑‍⚕️', '👮', '🤝', '👶', '💃']
  },
  {
    grupo: 'Comida e bebida',
    emojis: ['🍚', '🫘', '🍞', '🥛', '🧃', '🍌', '🍪', '🍝', '🍗', '🍎', '💧', '🥤', '🥣', '🍿', '🍰', '🧀', '🥚', '🍫', '🍇', '🥕']
  },
  {
    grupo: 'Casa e lugares',
    emojis: ['🏠', '🏫', '🏥', '🛒', '🌳', '🛏️', '🚻', '🍳', '🚗', '🚌', '⛪', '🏖️', '🛋️', '🚪', '🪟', '🚽']
  },
  {
    grupo: 'Ações',
    emojis: ['🤲', '🙅', '🛑', '🚶', '❤️', '💔', '🫴', '🧸', '📺', '🎵', '🖍️', '🛁', '🪥', '👚', '🔓', '🔒', '⏳', '📱', '🏃', '🤸']
  },
  {
    grupo: 'Escola e objetos',
    emojis: ['📝', '📓', '✏️', '🎒', '📚', '🧩', '⚽', '🎨', '🧱', '🪑', '💊', '🩹', '🧴', '🧻', '🎂', '🎈']
  },
  {
    grupo: 'Social e respostas',
    emojis: ['✅', '❌', '➕', '🔚', '🆘', '👋', '🤚', '🙏', '👌', '🤔', '❓', '🔁', '⭐', '🥰', '🤗', '🤫']
  },
  {
    grupo: 'Pastas',
    emojis: ['📁', '📂', '🗂️', '🔤', '🔢', '🌈', '🎯', '🧭']
  }
];
