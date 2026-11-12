import { useCallback, useEffect, useRef, useState } from 'react';
import { SUPABASE, supabaseReady } from '../config';
import { getTodayISODate } from '../lib/dates';
import { buildFriendProfile } from '../lib/friendProfile';
import { friends as api } from '../sync/supabase';

const PUBLISH_DEBOUNCE_MS = 2000; // mon profil part 2 s après un changement
const LIVE_REFRESH_MS = 8000; // la liste d'amis est relue toutes les 8 s quand l'onglet Amis est ouvert
const msg = e => (e && e.message) || 'Erreur du service d’amis.';

/**
 * Amis : mon code à 7 caractères, ma liste d'amis et leur résumé de profil. Nécessite un compte connecté.
 * Mon résumé (sans poids ni photos) est publié automatiquement quand mes données changent, sauf si j'ai coupé le partage.
 */
export function useFriends({ gameState, setGameState, user, active = false, isLoaded = null }) {
  const ready = () => !isLoaded || isLoaded.current !== false; // sauvegarde en ligne lue (sinon l'état local peut être une vieille copie)
  const cfg = SUPABASE;
  const connected = supabaseReady(cfg) && !!user;
  // Rien n'est publié tant que la personne n'a pas activé les amis (bouton dans l'onglet) : choix explicite, mémorisé sur l'appareil
  // (l'accord est aussi enregistré dans les données du compte : gameState.friendsOn, pour que TOUS ses appareils publient)
  const [localOn, setEnabled] = useState(() => { try { return localStorage.getItem('rondoufit:friends') === '1'; } catch { return false; } });
  const enabled = localOn || !!gameState.friendsOn;
  const on = connected && enabled;
  // amis activés avant cette version sur un seul appareil : on l'enregistre dans le compte pour ses autres appareils
  useEffect(() => {
    if (connected && localOn && !gameState.friendsOn && setGameState && ready()) setGameState(prev => (prev.friendsOn ? prev : { ...prev, friendsOn: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, localOn, gameState.friendsOn, gameState.quests]);
  const [code, setCode] = useState('');
  const [share, setShareState] = useState(true);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const lastSent = useRef('');
  const serverName = useRef(''); // prénom déjà publié : jamais remplacé par un prénom vide
  const stateRef = useRef(gameState);
  stateRef.current = gameState;
  const shareRef = useRef(true);
  shareRef.current = share;

  // `silent` : mise à jour automatique en arrière-plan (pas de « Mise à jour… », pas d'erreur affichée, pas de changement si rien de neuf)
  const refresh = useCallback(async (silent = false) => {
    if (!on) return;
    if (silent !== true) setLoading(true);
    try {
      const next = await api.list(cfg);
      setList(prev => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      setError('');
    } catch (e) { if (silent !== true) setError(msg(e)); } finally { if (silent !== true) setLoading(false); }
  }, [on, cfg]);

  // En direct : tant que l'onglet Amis est ouvert, la liste se met à jour toute seule ; elle se met aussi à jour au retour sur l'appli
  useEffect(() => {
    if (!on) return undefined;
    const tick = () => { if (typeof document === 'undefined' || !document.hidden) refresh(true); };
    const timer = active ? setInterval(tick, LIVE_REFRESH_MS) : null;
    if (active) tick();
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => { if (timer) clearInterval(timer); document.removeEventListener('visibilitychange', tick); window.removeEventListener('focus', tick); };
  }, [on, active, refresh]);

  // Première ouverture : profil (crée mon code) puis liste
  const userId = user && user.id;
  useEffect(() => {
    if (!on) { setCode(''); setList([]); return undefined; }
    let alive = true;
    (async () => {
      try {
        let mine = await api.mine(cfg);
        if (!mine) mine = await api.publish(cfg, buildFriendProfile(gameState, getTodayISODate()), true);
        if (!alive) return;
        if (mine) {
          setCode(mine.friend_code || '');
          setShareState(mine.share !== false);
          serverName.current = String((mine.summary && mine.summary.name) || '');
        }
        const l = await api.list(cfg);
        if (alive) { setList(l); setError(''); }
      } catch (e) { if (alive) setError(msg(e)); }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, userId]);

  // Mon résumé se met à jour tout seul quand mes séances / exercices changent
  useEffect(() => {
    if (!on || !code) return undefined;
    let t = null;
    const run = async () => {
      if (!shareRef.current) return;
      // ⚠️ sauvegarde en ligne pas encore lue : on RÉESSAIE un peu plus tard. Avant, on abandonnait jusqu'au prochain
      // changement (séance, EXP…) : un prénom ajouté ne partait jamais et les amis voyaient « Ami sans prénom ».
      if (!ready()) { t = setTimeout(run, 1500); return; }
      const st = stateRef.current; // dernières données (pas celles du moment où le délai a été lancé)
      const summary = buildFriendProfile(st, getTodayISODate());
      // prénom vide sur cet appareil (vieille copie) alors qu'un prénom est déjà publié : on garde celui-là, et on le remet dans l'appli
      if (!summary.name && serverName.current) {
        summary.name = serverName.current;
        if (setGameState && !st.heroName) setGameState(prev => (prev.heroName ? prev : { ...prev, heroName: serverName.current }));
      } else if (summary.name) serverName.current = summary.name;
      const key = JSON.stringify(summary);
      if (key === lastSent.current) return;
      try { await api.publish(cfg, summary, true); lastSent.current = key; } catch (e) { setError(msg(e)); }
    };
    t = setTimeout(run, PUBLISH_DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, code, gameState.quests, gameState.maxRecords, gameState.xp, gameState.rankTrials, gameState.heroName, gameState.coach && gameState.coach.sport, gameState.muscleMode, gameState.gameBest]);

  const enable = () => {
    try { localStorage.setItem('rondoufit:friends', '1'); } catch { /* sans mémoire : valable pour cette session */ }
    setEnabled(true);
    if (setGameState) setGameState(prev => (prev.friendsOn ? prev : { ...prev, friendsOn: true }));
  };

  const addFriend = async c => {
    setError('');
    try {
      await api.add(cfg, c);
      await refresh();
      return { ok: true };
    } catch (e) { return { ok: false, message: msg(e) }; }
  };
  const removeFriend = async id => {
    try { await api.remove(cfg, id); setList(l => l.filter(f => f.user_id !== id)); } catch (e) { setError(msg(e)); }
  };
  const setShare = async v => {
    setShareState(v);
    try { await api.publish(cfg, buildFriendProfile(gameState, getTodayISODate()), v); lastSent.current = ''; } catch (e) { setError(msg(e)); setShareState(!v); }
  };
  const regenerateCode = async () => {
    try { setCode(await api.regenerateCode(cfg)); setError(''); return true; } catch (e) { setError(msg(e)); return false; }
  };

  return { available: connected, enabled, enable, code, share, list, loading, error, refresh, addFriend, removeFriend, setShare, regenerateCode };
}
