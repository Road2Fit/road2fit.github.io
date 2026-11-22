import { useCallback, useEffect, useRef, useState } from 'react';
import { SUPABASE, supabaseReady } from '../config';
import { getTodayISODate } from '../lib/dates';
import { makeQuestFromCatalog } from '../lib/questFactory';
import { buildDuoPart, mergeDuoPlan, syncDuos } from '../coach/duo';
import { duo as api } from '../sync/supabase';

const SLOW_MS = 60000; // invitations relues chaque minute
const FAST_MS = 8000;  // toutes les 8 s quand l'onglet Amis est ouvert
const COACH_MS = 30000; // toutes les 30 s quand le Coach est ouvert
const msg = e => (e && e.message) || 'Erreur de la séance à deux.';

/**
 * Séance à deux (4.51) : invitations envoyées / reçues, réponse, annulation. Une séance acceptée est recopiée dans
 * coach.duos (syncDuos) : le coach la construit ce jour-là pour chacun des deux, avec ses propres charges.
 * Seulement avec un compte connecté et les amis activés.
 */
export function useDuo({ gameState, setGameState, user, enabled, active = false, coachOpen = false, isLoaded = null, friendsList = [] }) {
  const on = supabaseReady(SUPABASE) && !!user && !!enabled;
  const [rows, setRows] = useState(null); // null tant que la liste n'a jamais été lue (hors ligne : rien n'est retiré)
  const rowsRef = useRef(null);
  rowsRef.current = rows;
  const [error, setError] = useState('');
  const stateRef = useRef(gameState);
  stateRef.current = gameState;
  const ready = () => !isLoaded || isLoaded.current !== false;

  const refresh = useCallback(async () => {
    if (!on) return;
    try {
      const next = await api.list(SUPABASE);
      setRows(prev => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      setError('');
    } catch (e) { if (e && e.code !== 'not_installed') setError(msg(e)); }
  }, [on]);

  useEffect(() => {
    if (!on) { setRows(null); return undefined; }
    const tick = () => { if (typeof document === 'undefined' || !document.hidden) refresh(); };
    tick();
    const timer = setInterval(tick, active ? FAST_MS : coachOpen ? COACH_MS : SLOW_MS);
    window.addEventListener('focus', tick);
    return () => { clearInterval(timer); window.removeEventListener('focus', tick); };
  }, [on, active, coachOpen, refresh]);

  // séances acceptées (ou annulées) → réglages du coach, une fois la sauvegarde en ligne lue
  useEffect(() => {
    if (!on || !setGameState || !rows) return undefined;
    let t = null;
    const run = () => {
      if (!ready()) { t = setTimeout(run, 1500); return; }
      const today = getTodayISODate();
      // identifiant fixe par exercice : deux appareils qui ajoutent le même exercice en même temps ne font qu'un (fusion par id)
      const make = st => c => (c ? { ...makeQuestFromCatalog(c, st, today, 'ajouté pour une séance à deux').quest, id: `q_duo_${c.id}` } : null);
      const cur = stateRef.current;
      const next = syncDuos(cur, rowsRef.current, today, make(cur));
      if (next === cur) return; // rien de neuf : la sauvegarde n'est pas marquée comme modifiée
      setGameState(prev => syncDuos(prev, rowsRef.current, today, make(prev)));
    };
    run();
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, rows]);

  const invite = async (friendId, date, theme) => {
    try {
      await api.invite(SUPABASE, friendId, date, theme, buildDuoPart(stateRef.current, getTodayISODate()));
      await refresh();
      return { ok: true };
    } catch (e) { return { ok: false, message: msg(e) }; }
  };
  // coach IA : « prépare une séance avec Paul jeudi » → l'ami est retrouvé par son prénom publié (sur l'appareil)
  const inviteByName = async (name, date, theme) => {
    const norm = v => String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    const want = norm(name);
    const hits = (friendsList || []).filter(f => norm(f.summary && f.summary.name) === want);
    const loose = hits; // prénom exact seulement : jamais d'invitation au mauvais ami
    if (loose.length !== 1) return { ok: false, message: loose.length ? `Plusieurs amis s’appellent « ${name} » : invite-le depuis l’onglet Amis.` : `Aucun ami « ${name} » dans ta liste.` };
    return invite(loose[0].user_id, date, theme);
  };
  const accept = async row => {
    const plan = mergeDuoPlan(stateRef.current, row.part, row.theme, getTodayISODate());
    if (!plan) return { ok: false, message: 'Aucun exercice possible pour vous deux sur ce thème : propose un autre thème à ton ami.' };
    try { await api.answer(SUPABASE, row.id, true, plan); await refresh(); return { ok: true }; } catch (e) { return { ok: false, message: msg(e) }; }
  };
  const decline = async row => {
    try { await api.answer(SUPABASE, row.id, false, null); await refresh(); return { ok: true }; } catch (e) { return { ok: false, message: msg(e) }; }
  };
  const cancel = async row => {
    try { await api.cancel(SUPABASE, row.id); await refresh(); return { ok: true }; } catch (e) { return { ok: false, message: msg(e) }; }
  };

  const today = getTodayISODate();
  const list = rows || [];
  const incoming = list.filter(r => !r.mine && r.status === 'pending' && r.date >= today);
  const outgoing = list.filter(r => r.mine && r.status === 'pending' && r.date >= today);
  const accepted = list.filter(r => r.status === 'accepted' && r.date >= today);
  return { available: on, rows: list, incoming, outgoing, accepted, error, refresh, invite, inviteByName, accept, decline, cancel };
}
