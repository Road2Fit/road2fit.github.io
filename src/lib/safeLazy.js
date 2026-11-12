import { lazy } from 'react';

// Morceau de l'appli chargé à la demande (caméra, mini-animation…). Deux causes d'échec fréquentes :
// pas de réseau à la salle, ou une nouvelle version publiée entre-temps (l'ancien fichier n'existe plus).
// Avant (React.lazy seul), l'erreur faisait planter tout l'écran (« Oups ») : maintenant on réessaie,
// puis on affiche `Fallback` (la séance continue).
const wait = ms => new Promise(ok => setTimeout(ok, ms));

export function retryImport(loader, tries = 3, delay = 800) {
  return loader().catch(e => (tries > 1 ? wait(delay).then(() => retryImport(loader, tries - 1, delay)) : Promise.reject(e)));
}

export function safeLazy(loader, Fallback = () => null) {
  let pending = null;
  const preload = () => pending || (pending = retryImport(loader).catch(e => { pending = null; throw e; }));
  const Comp = lazy(() => preload().catch(() => ({ default: Fallback })));
  Comp.preload = () => preload().catch(() => {});
  return Comp;
}
