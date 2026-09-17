/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-tema="escuro"]'],
  theme: {
    extend: {
      // Alvo minimo de toque exigido pela especificacao de acessibilidade.
      minHeight: { toque: '64px' },
      minWidth: { toque: '64px' },
      transitionDuration: { rapido: '150ms' }
    }
  },
  plugins: []
};
