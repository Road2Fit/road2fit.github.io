import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { startUpdateCheck } from './lib/updateCheck';
import { startScrollLock } from './lib/scrollLock';
import { applyUiPrefs, readUiPrefs } from './lib/uiPrefs';
import { applyEdition } from './edition';
import { startErrorReport } from './lib/errorReport';
import { startWheelHScroll } from './lib/hScroll';

if (import.meta.env.PROD) startErrorReport();
import './styles.css';

applyEdition();
applyUiPrefs(readUiPrefs());
createRoot(document.getElementById('root')).render(<ErrorBoundary><App /></ErrorBoundary>);
// fenêtre ouverte : la page derrière ne défile plus (téléphone compris)
startScrollLock();
// rangées qui défilent sur le côté (groupes d'exercices, pages du Coach) : la molette de la souris les fait glisser
startWheelHScroll();

// Mode hors ligne : l'application reste utilisable sans réseau (salle de sport) une fois ouverte une première fois.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.warn('Service worker indisponible', err));
    // bandeau « Nouvelle version disponible » quand un déploiement plus récent existe
    startUpdateCheck(note => window.dispatchEvent(new CustomEvent('rondoufit-update', { detail: note })));
  });
}
