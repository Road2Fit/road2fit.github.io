import { useCallback, useEffect, useRef, useState } from 'react';
import { STORAGE_KEY } from '../config';
import { setMuscleMode } from '../data/muscles';
import { setAvatar } from '../anim/avatar';
import { loadLocalState } from '../data/state';
import * as store from '../sync/storage';
import { useCloudSync } from './useCloudSync';

/**
 * L'état de l'application (progression, quêtes, poids…), enregistré sur l'appareil à chaque modification
 * et synchronisé avec le compte de l'application (useCloudSync).
 */
export function useGameState() {
  const [gameState, setRawState] = useState(loadLocalState);
  setAvatar(gameState.avatar); // avatar des animations (4.39) : état global lu par anim/Figure.jsx
  setMuscleMode(gameState.muscleMode); // mode des muscles : état global lu par l'interface et le coach (voir data/muscles.js)
  const stateRef = useRef(gameState);
  stateRef.current = gameState;
  const version = useRef(0);        // augmente à chaque modification faite par l'utilisateur
  const fromRemote = useRef(false); // l'état vient d'être reçu de la sauvegarde en ligne : ce n'est pas une modification locale
  const mounted = useRef(false);

  const applyRemote = useCallback(state => {
    if (state === stateRef.current) return; // rien à changer : pas d'affichage suivant, donc rien à « consommer »
    stateRef.current = state;
    fromRemote.current = true;
    setRawState(state);
  }, []);

  const sync = useCloudSync({ stateRef, version, applyRemote });
  const { scheduleSync } = sync;

  // Toute modification de l'utilisateur est notée « à envoyer » tout de suite, avant même l'affichage suivant.
  const setGameState = useCallback(update => {
    version.current++;
    store.markDirty();
    store.setLocalTs(Date.now());
    setRawState(update);
  }, []);

  // Modification automatique (ex. trophées débloqués au démarrage) : tant que l'appareil n'a jamais été utilisé,
  // elle ne compte pas comme une modification de l'utilisateur, pour qu'un appareil neuf ne puisse pas écraser
  // une sauvegarde existante avec ses données de départ.
  const setGameStateAuto = useCallback(update => {
    if (store.getLocalTs() !== 0) {
      version.current++;
      store.markDirty();
      store.setLocalTs(Date.now());
    }
    setRawState(update);
  }, []);

  const warned = useRef(false);
  // Enregistrement sur l'appareil à chaque changement, puis envoi différé vers le compte.
  useEffect(() => {
    // 4.22 : un échec d'écriture (stockage du navigateur plein) n'est plus silencieux, et on prévient avant la limite (≈ 5 Mo)
    try {
      const json = JSON.stringify(gameState);
      localStorage.setItem(STORAGE_KEY, json);
      store.persistTabMarkers(); // 4.47.5 : les marqueurs de synchro de CET onglet vont avec ses données (voir sync/storage.js)
      if (json.length > 3500000 && !warned.current) { warned.current = true; window.dispatchEvent(new CustomEvent('rondoufit-storage', { detail: { full: false } })); }
    } catch (e) {
      try { window.dispatchEvent(new CustomEvent('rondoufit-storage', { detail: { full: true } })); } catch (e2) { /* rien */ }
    }
    if (fromRemote.current) { fromRemote.current = false; return; }
    if (!mounted.current) { mounted.current = true; return; }
    scheduleSync();
  }, [gameState]);

  return { gameState, setGameState, setGameStateAuto, sync, isLoaded: sync.isLoaded };
}
