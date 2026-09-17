import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
// Fonte arredondada empacotada com o app (nada é buscado na internet).
import '@fontsource-variable/nunito/wght.css';
import { App } from './App';
import { ProvedorApp } from './estado/AppContext';
import './index.css';

// Registra o service worker: depois do primeiro carregamento o app abre
// offline, como um aplicativo instalado.
registerSW({ immediate: true });

const raiz = document.getElementById('root');
if (!raiz) throw new Error('Elemento #root não encontrado.');

createRoot(raiz).render(
  <StrictMode>
    <ProvedorApp>
      <App />
    </ProvedorApp>
  </StrictMode>
);
