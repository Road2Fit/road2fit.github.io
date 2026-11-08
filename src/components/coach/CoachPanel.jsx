import { Art } from '../Art';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { coachBalance, coachDayAdvice, coachEta, coachMissed, coachMissedSession, coachNutrition, coachOverview, coachPlateau, coachStrengthTrend, coachTrainingWeeks, coachWeekActivity, coachWeightPace } from '../../coach/advice';
import { sessionFocus } from '../../coach/focus';
import { coachDayInfo, coachPlanWeek, coachSlotFor } from '../../coach/planning';
import { coachRateSession } from '../../coach/rating';
import { coachBuildCustomSession, coachBuildPlanned } from '../../coach/sessions';
import { COACH_ARENAS, coachDow, coachRealEntries, coachRound, coachStep, getCoachSettings } from '../../coach/settings';
import { profileOpts } from '../../coach/profiles';
import { computeExerciseTarget } from '../../coach/targets';

import { addDaysISO, formatDayFr, getTodayISODate, getWeekStart } from '../../lib/dates';
import { evaluateQuestProgress } from '../../lib/progress';
import { CoachAdvice } from './CoachAdvice';
import { CoachBalance } from './CoachBalance';
import { CoachCycle } from './CoachCycle';
import { CoachProfile } from './CoachProfile';
import { CoachHeader } from './CoachHeader';
import { CoachNextSession } from './CoachNextSession';
import { CoachProgram } from './CoachProgram';
import { CoachChat } from './CoachChat';
import { CoachGoal } from './CoachGoal';
import { customFromSets } from '../../coach/methods';
import { CoachExperience } from './CoachExperience';
import { CoachPast } from './CoachPast';
import { programSession, programCoachOff } from '../../coach/program';
import { CoachObjectives } from './CoachObjectives';
import { CoachSettings } from './CoachSettings';
import { CoachSources } from './CoachSources';
import { CoachVolley } from './CoachVolley';
import { CoachWeek } from './CoachWeek';
import { CoachWeightHealth } from './CoachWeightHealth';
import { sportInfo } from '../../data/sports';
import { arenaOf, fineGroupOf, secondGroupOf } from '../../data/muscles';
import { MuscleBodyMap } from './MuscleBodyMap';
import { applyCardioSession, cardioPlanWeek, heartBalance } from '../../coach/cardio';
import { CardioInvite, CoachCardio, CoachHeart } from './CoachCardio';
import { CardioSession, CardioSummary, savedCardioRun } from './CardioSession';
import { EXERCISE_CATALOG } from '../../data/catalog';
import { calculateCardioCalories } from '../../lib/calories';
import { computeXp } from '../../lib/xp';
import { playGameSound } from '../../lib/sound';

// muscles allumés dans le grand rond pour une séance de cardio : le cœur, plus les jambes (et le dos au rameur)
const cardioWorked = s => ['Cœur', 'Quadriceps', 'Ischio-jambiers', 'Fessiers', 'Mollets', 'Jambes', ...(s.kind === 'rower' ? ['Dos'] : [])];

const COACH_PAGES = [['seance', 'Séance', 'dumbbell'], ['semaine', 'Semaine', 'calendar'], ['objectifs', 'Objectifs', 'target'], ['equilibre', 'Équilibre', 'scale'], ['reglages', 'Réglages', 'gear']];

export function CoachPanel({
  gameState, setGameState, onStartGuided, onOpenLevelUp, onAddExercise, onQuickCardio, onGoTab,
  guidedActive, onResumeGuided, onClaimWeekly,
}) {
  // page du Coach ; une autre partie de l'appli peut en demander une (événement rondoufit-coach-page, ex. « Équilibre » depuis le profil)
  const [page, setPage] = useState(() => { const p = typeof window !== 'undefined' && window.__r2fCoachPage; if (p) window.__r2fCoachPage = null; return p || 'seance'; });
  useEffect(() => {
    const h = e => { if (e.detail) { window.__r2fCoachPage = null; setPage(e.detail); } };
    window.addEventListener('rondoufit-coach-page', h);
    return () => window.removeEventListener('rondoufit-coach-page', h);
  }, []);
  const today = getTodayISODate();
  const coach = getCoachSettings(gameState);
  const hasGoal = !!(coach.mainGoal && coach.mainGoal.kind);
  const [showSources, setShowSources] = useState(false);
  // grand rond : toucher le bouton noir fait réagir tout le rond, puis la séance s'ouvre (le temps de voir l'animation)
  const [heroPress, setHeroPress] = useState(false);
  // le grand rond occupe le haut de l'écran : sa zone grandit jusqu'à ce que seul le titre « Prochaine séance » dépasse en bas
  // ⚠️ Hauteur d'écran FIGÉE (mémorisée par largeur) : sur téléphone la barre d'adresse se cache au premier défilement,
  // la hauteur change et la zone se recalculait → les menus s'écartaient du rond avant que la page défile.
  // ⚠️ Position du titre mesurée par rapport au HAUT DU CORPS de la page, pas avec window.scrollY : quand une fenêtre est
  // ouverte, lib/scrollLock.js fige le corps (position fixe, décalé vers le haut) et scrollY vaut 0 → l'ancienne mesure
  // croyait le titre tout en haut et gonflait la zone (rond isolé au milieu d'un grand vide, surtout vu sur PC).
  // Sur ordinateur (pas d'écran tactile), la hauteur suit la fenêtre (pas de barre d'adresse qui bouge).
  useLayoutEffect(() => {
    const touch = (() => { try { return window.matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })();
    const fit = () => {
      const z = document.querySelector('.hero-zone');
      const t = document.querySelector('[data-testid="seance-end"]');
      if (!z) return;
      if (!touch || window.__r2fVhW !== window.innerWidth) { window.__r2fVhW = window.innerWidth; window.__r2fVh = window.innerHeight; }
      const vh = window.__r2fVh;
      const nav = document.querySelector('nav[aria-label="Navigation"]');
      const navH0 = nav && getComputedStyle(nav).position === 'fixed' ? nav.getBoundingClientRect().height : 0;
      document.documentElement.style.setProperty('--bnav-h', `${Math.round(navH0)}px`);
      const bar = document.querySelector('.coach-tabs');
      const navH = navH0 + (bar && getComputedStyle(bar).position === 'fixed' ? bar.getBoundingClientRect().height : 0);
      const prev = z.style.minHeight;
      z.style.minHeight = '';
      z.style.removeProperty('--hero-d');
      if (!t) return;
      // page Séance sans défiler : si elle dépasse, le rond rapetisse (jamais sous 210 px) ; sinon la zone s'étire et le rond est centré
      const endB = () => t.getBoundingClientRect().bottom - document.body.getBoundingClientRect().top;
      // ce qui reste sous la fin de la page (marges, place de la barre du bas) : mesuré quand la page dépasse l'écran
      const sh = document.body.scrollHeight;
      const tail = sh > vh + 1 ? Math.max(navH + 10, sh - endB()) : navH + 10;
      const room = () => vh - tail - endB();
      const r = z.querySelector('.hero-round');
      let over = -room();
      if (over > 0 && r) {
        const d = Math.max(210, Math.round(r.getBoundingClientRect().width - over));
        z.style.setProperty('--hero-d', `${d}px`);
      }
      const extra = Math.min(vh * 0.6, room());
      const next = extra > 0 ? `${Math.round(z.getBoundingClientRect().height + extra)}px` : '';
      z.style.minHeight = next || '';
      if (prev && next && Math.abs(parseFloat(prev) - parseFloat(next)) < 2) z.style.minHeight = prev;
    };
    fit();
    let w = window.innerWidth, h = window.innerHeight;
    const onResize = () => { if (window.innerWidth !== w || (!touch && window.innerHeight !== h)) { w = window.innerWidth; h = window.innerHeight; fit(); } };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  });
  const heroGo = fn => {
    if (heroPress) return;
    let quick = false;
    try { quick = /jsdom/i.test(navigator.userAgent) || window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { quick = true; }
    if (quick) { fn(); return; }
    setHeroPress(true);
    setTimeout(() => { setHeroPress(false); fn(); }, 520);
  };
  const [matchInput, setMatchInput] = useState('');
  const [serie, setSerie] = useState({ dow: 0, from: today, to: addDaysISO(today, 364) });
  const [addSel, setAddSel] = useState('');
  const [extraVolleyInput, setExtraVolleyInput] = useState('');
  const [shortMode, setShortMode] = useState(false);
  const [swapFor, setSwapFor] = useState(null);

  const ov = useMemo(() => coachOverview(gameState, today, { minutes: shortMode ? 40 : undefined }), [gameState.quests, gameState.coach, gameState.userWeightKg, today, shortMode]);
  const advice = useMemo(() => coachDayAdvice(gameState, today), [gameState.coach, today]);
  const missedSession = useMemo(() => coachMissedSession(gameState, today), [gameState.quests, gameState.coach, today]);
  const missedMsgs = useMemo(() => coachMissed(gameState, today), [gameState.quests, gameState.coach, today]);
  const strengthTrend = useMemo(() => coachStrengthTrend(gameState, today), [gameState.quests, today]);
  const nutrition = useMemo(() => coachNutrition(gameState, today), [gameState.quests, gameState.coach, gameState.weightHistory, gameState.targetWeightKg, gameState.userWeightKg, today]);
  const balance = useMemo(() => coachBalance(gameState, today), [gameState.quests, today]);
  const pace = useMemo(() => coachWeightPace(gameState, today), [gameState.weightHistory, gameState.targetWeightKg, gameState.userWeightKg, today]);
  const activity = useMemo(() => coachWeekActivity(gameState, getWeekStart(today)), [gameState.quests, today]);
  const trainingWeeks = useMemo(() => coachTrainingWeeks(gameState, today), [gameState.quests, today]);
  const questRows = useMemo(
    () =>
      (gameState.quests || [])
        .filter(q => q.type === 'strength' && q.goalMode !== 'free_mode')
        .map(q => ({
          q,
          arena: arenaOf(q),
          target: computeExerciseTarget(q, { ...profileOpts(gameState, today), today }),
          progress: evaluateQuestProgress(q).percent,
          plateau: coachPlateau(q),
          eta: coachEta(q, today)
        }))
        .sort((a, b) => COACH_ARENAS.indexOf(a.arena) - COACH_ARENAS.indexOf(b.arena)),
    [gameState.quests, today]
  );

  const updateCoach = patch =>
    setGameState(prev => ({ ...prev, coach: { ...getCoachSettings(prev), ...patch } }));
  const toggleMatch = iso => {
    const set = new Set(coach.matchDates || []);
    if (set.has(iso)) set.delete(iso); else set.add(iso);
    updateCoach({ matchDates: Array.from(set).sort() });
  };
  const toggleVolleyDay = dow => {
    const set = new Set(coach.volleyDays || []);
    if (set.has(dow)) set.delete(dow); else set.add(dow);
    updateCoach({ volleyDays: Array.from(set).sort() });
  };

  const weekStart0 = getWeekStart(today);
  const upcomingGym = [];
  for (let i = 0; i < 21 && upcomingGym.length < 12; i++) {
    const d = addDaysISO(today, i);
    if (coachSlotFor(coach, d)) upcomingGym.push(d);
  }
  const toggleGymSkip = d => {
    const set = new Set(coach.gymSkips || []);
    if (set.has(d)) set.delete(d); else set.add(d);
    updateCoach({ gymSkips: Array.from(set).sort() });
  };
  const upcomingVolley = [];
  for (let i = 0; i < 28 && upcomingVolley.length < 12; i++) {
    const d = addDaysISO(today, i);
    if ((coach.volleyDays || []).includes(coachDow(d))) upcomingVolley.push(d);
  }
  const toggleVolleySkip = d => {
    const set = new Set(coach.volleySkips || []);
    if (set.has(d)) set.delete(d); else set.add(d);
    updateCoach({ volleySkips: Array.from(set).sort() });
  };
  const matchList = (coach.matchDates || []).filter(d => d >= today).slice().sort();
  const addMatches = list => {
    const set = new Set(coach.matchDates || []);
    list.forEach(d => set.add(d));
    updateCoach({ matchDates: Array.from(set).sort() });
  };
  const addSeries = () => {
    const out = [];
    let d = serie.from;
    let guard = 0;
    while (d && serie.to && d <= serie.to && guard++ < 800) {
      if (coachDow(d) === Number(serie.dow)) out.push(d);
      d = addDaysISO(d, 1);
    }
    addMatches(out);
  };

  const first = ov.first;
  // CARDIO : séances de la semaine placées autour de la muscu (coach/cardio.js) ; le cœur suivi comme un muscle
  const cardioWeeks = useMemo(() => ov.weeks.map(w => cardioPlanWeek(gameState, w.weekStart, today, w.days.filter(d => d.gym).map(d => d.iso))), [ov, gameState.coach, gameState.quests, today]);
  const cardioToday = cardioWeeks[0].sessions.find(x => x.iso === today) || null;
  const cardioNext = cardioWeeks.flatMap(w => w.sessions).find(x => x.iso >= today) || null;
  const heart = useMemo(() => heartBalance(gameState, today), [gameState.quests, gameState.coach, today]);
  const [sheet, setSheet] = useState(null);
  // téléphone : la barre des pages du Coach est fixée en bas. Elle est rendue directement dans <body> : l'animation
  // d'arrivée de l'onglet (transform) faisait sinon flotter la barre au milieu de l'écran le temps de l'animation.
  const phoneQ = () => { try { return window.matchMedia('(max-width: 767px)').matches; } catch (e) { return false; } };
  const [isPhone, setIsPhone] = useState(phoneQ);
  useEffect(() => {
    let mq = null;
    try { mq = window.matchMedia('(max-width: 767px)'); } catch (e) { return undefined; }
    const on = () => setIsPhone(mq.matches);
    if (mq.addEventListener) mq.addEventListener('change', on); else if (mq.addListener) mq.addListener(on);
    return () => { if (mq.removeEventListener) mq.removeEventListener('change', on); else if (mq.removeListener) mq.removeListener(on); };
  }, []);
  const [sheetTop, setSheetTop] = useState(0); // bas de l'encadré « Séance » : la fenêtre commence dessous // fenêtre ouverte sur la page Séance : 'next' | 'goal' | 'program'
  const [cardioPeek, setCardioPeek] = useState(null); // résumé d'une séance de cardio avant de la lancer
  const [cardioRun, setCardioRun] = useState(() => { const r = savedCardioRun(); return r && r.session ? { session: r.session } : null; });
  const [cardioMsg, setCardioMsg] = useState('');
  const saveCardio = (session, res) => {
    const r = applyCardioSession(gameState, session, { ...res, date: today, catalog: EXERCISE_CATALOG, calc: calculateCardioCalories });
    const kcal = r.entry ? r.entry.calories : 0;
    setGameState(prev => {
      const r2 = applyCardioSession(prev, session, { ...res, date: today, catalog: EXERCISE_CATALOG, calc: calculateCardioCalories });
      return { ...r2.state, ...computeXp(prev, 85 + Math.round(kcal * 0.15), today, 'session').patch };
    });
    playGameSound('xp', gameState.soundEnabled !== false);
    setCardioRun(null);
    setCardioMsg(`Cardio enregistré : ${kcal} kcal, ajoutées aux calories du jour.`);
  };
  const plannedMap = {};
  ov.plannedAll.forEach(p => { plannedMap[p.iso] = p; });
  const w0 = ov.weeks[0];
  const plan = coach.plan && Array.isArray(coach.plan.questIds) && coach.plan.date >= today ? coach.plan : null;
  const tiredToday = !!(coach.readiness && coach.readiness.date === today && coach.readiness.level === 'low');
  const planWeek = useMemo(() => (plan ? coachPlanWeek(gameState, getWeekStart(plan.date), today) : null), [gameState.quests, gameState.coach]);
  const customSession = useMemo(
    () => (plan ? coachBuildCustomSession(gameState, plan.questIds, plan.date, { deload: planWeek.deload, matchWeek: planWeek.matchInWeek, sets: plan.sets, tired: tiredToday && plan.date === today }) : null),
    [gameState.quests, gameState.coach]
  );
  const shownSession = plan ? customSession : ov.session;
  const shownDate = plan ? plan.date : first ? first.iso : today;
  const rating = useMemo(
    () => (shownSession && (plan || ov.hasExercises) ? coachRateSession(gameState, shownSession) : null),
    [gameState.quests, gameState.coach, shownSession && shownSession.date, shownSession && shownSession.exercises.map(e => e.questId).join(',')]
  );
  // « Non, je continue sans l'appli » : la suite du programme n'est montrée qu'en aperçu
  const coachOff = !plan && programCoachOff(gameState, ov.program);
  const sessionToStart = coachOff ? null : (() => {
    if (plan) {
      if (!plan.questIds.length) return null;
      return coachBuildCustomSession(gameState, plan.questIds, today, { deload: w0.deload, matchWeek: w0.matchInWeek, sets: plan.sets, tired: tiredToday });
    }
    if (!first || !ov.hasExercises) return null;
    if (first.iso === today) return ov.session;
    if (ov.program) return programSession(gameState, { ...ov.program, date: today }); // séance du programme faite en avance
    return coachBuildPlanned(gameState, first, coachDayInfo(today, coach), { deload: w0.deload, matchWeek: w0.matchInWeek, tired: tiredToday, minutes: shortMode ? 40 : undefined });
  })();
  const muscuToday = !coachOff && !!(shownSession && shownSession.exercises.length > 0 && sessionToStart && sessionToStart.exercises.length > 0 && shownDate === today);
  // Édition du plan personnalisé (mises à jour fonctionnelles pour éviter les écrasements)
  const patchPlan = fn =>
    setGameState(prev => {
      const cs = getCoachSettings(prev);
      const pl = cs.plan || { date: today, questIds: [] };
      return { ...prev, coach: { ...cs, plan: fn(pl) } };
    });
  const startCustom = () => {
    const ids = ov.session ? ov.session.exercises.map(e => e.questId) : [];
    const sets = {};
    if (ov.session) ov.session.exercises.forEach(e => { sets[e.questId] = e.sets; });
    updateCoach({ plan: { date: first ? first.iso : today, questIds: ids, sets }, planBackup: null });
  };
  const planAdd = ids => patchPlan(pl => ({ ...pl, questIds: [...pl.questIds, ...ids.filter(i => i && !pl.questIds.includes(i))] }));
  const planRemove = id => patchPlan(pl => ({ ...pl, questIds: pl.questIds.filter(x => x !== id) }));
  const planMove = (id, dir) =>
    patchPlan(pl => {
      const arr = pl.questIds.slice();
      const i = arr.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return pl;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...pl, questIds: arr };
    });
  const doSwap = (oldId, newId) => {
    if (!newId || !shownSession) return;
    const ids = shownSession.exercises.map(e => e.questId);
    const sets = { ...((plan && plan.sets) || {}) };
    shownSession.exercises.forEach(e => { if (sets[e.questId] === undefined) sets[e.questId] = e.sets; });
    const old = shownSession.exercises.find(e => e.questId === oldId);
    sets[newId] = old ? old.sets : 3;
    delete sets[oldId];
    updateCoach({ plan: { date: shownDate, questIds: ids.map(i => (i === oldId ? newId : i)), sets } });
    setSwapFor(null);
  };
  // « Tu décides » : on va à l'encontre du coach pour un exercice (plus lourd / plus léger, moins / plus d'aide, ±1 rép)
  const adjustTarget = (e, action) =>
    setGameState(prev => ({
      ...prev,
      quests: prev.quests.map(q => {
        if (q.id !== e.questId) return q;
        if (action === 'reset') {
          // on garde le réglage annulé pour pouvoir y revenir (« Revenir à mon réglage »)
          const { coachOverride, ...rest } = q;
          return coachOverride ? { ...rest, coachOverridePrev: coachOverride } : rest;
        }
        if (action === 'restore') {
          const { coachOverridePrev, ...rest } = q;
          return coachOverridePrev ? { ...rest, coachOverride: coachOverridePrev } : rest;
        }
        const n = coachRealEntries(q).length;
        const cur = q.coachOverride && q.coachOverride.entries === n ? q.coachOverride : {};
        const dir = action === 'harder' || action === 'moreSets' || action === 'moreReps' ? 1 : -1;
        const next = { ...cur, entries: n };
        if (action === 'moreSets' || action === 'lessSets') {
          next.sets = Math.max(1, Math.min(10, (Number(e.sets) || 3) + dir));
        } else if (action === 'moreReps' || action === 'lessReps') {
          if (Math.min(...e.targetReps) + dir < 1) return q;
          next.repsDelta = (cur.repsDelta || 0) + dir * (e.timed ? 5 : 1);
        } else if (e.kind === 'load') {
          const st = coachStep(q, e.load);
          next.load = Math.max(0, coachRound(e.load + dir * st, st));
        } else if (e.kind === 'assisted') {
          next.assist = Math.max(0, e.assist - dir * 2.5);
        } else {
          next.repsDelta = (cur.repsDelta || 0) + dir;
        }
        const { coachOverridePrev, ...base } = q; // nouveau réglage : l'ancien n'est plus proposé
        return { ...base, coachOverride: next };
      }),
    }));
  const planDate = d => { if (d && d >= today) patchPlan(pl => ({ ...pl, date: d })); };
  const strengthQuests = (gameState.quests || []).filter(q => q.type === 'strength' && q.goalMode !== 'free_mode');
  const availQuests = plan ? strengthQuests.filter(q => !plan.questIds.includes(q.id)) : [];
  const planDayInfo = plan ? coachDayInfo(plan.date, coach) : null;
  const todayInfo = coachDayInfo(today, coach);

  const lowRows = balance.rows.filter(r => r.status === 'low');
  const protein = Math.round((Number(pace.current) || Number(gameState.userWeightKg) || 80));
  const dayShort = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  const coachTabs = (
    <nav aria-label="Pages du Coach" className="coach-tabs flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4" role="tablist">
      {COACH_PAGES.map(([id, label, art]) => (
        <button key={id} type="button" role="tab" aria-selected={page === id} data-testid={`coach-page-${id}`} onClick={() => { setPage(id); try { window.scrollTo({ top: 0 }); } catch (e) { /* rien */ } }}
          className={`shrink-0 px-3 py-1.5 rounded-full border text-xs font-bold whitespace-nowrap ${page === id ? 'bg-pink-600 border-pink-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'}`}><Art name={art} size={15} className="mr-1" />{label}</button>
      ))}
    </nav>
  );
  return (
    <div className="space-y-3" data-testid="coach-panel">
      {/* PAGES DU COACH : un bouton = une page, rien d'autre à l'écran */}
      {isPhone && typeof document !== 'undefined' ? createPortal(coachTabs, document.body) : coachTabs}
      {page === 'seance' && (
      <div className="space-y-3 page-fade" key="seance">
      {/* séance prévue ces derniers jours et pas faite : une ligne, la faire maintenant en un geste */}
      {missedSession && sessionToStart && !guidedActive && (
        <section data-testid="missed-session" className="rounded-2xl border border-amber-400/60 bg-amber-500/10 px-3 py-1.5 flex items-center gap-2">
          <Art name="calendar" size={22} bare />
          <span className="flex-1 min-w-0 text-sm font-black text-white leading-tight">Séance de {formatDayFr(missedSession.iso)} pas faite</span>
          <button type="button" data-testid="missed-session-start" onClick={() => onStartGuided(sessionToStart)} className="shrink-0 px-3 py-1.5 rounded-xl bg-pink-600 text-white text-xs font-black">La faire</button>
          <button type="button" onClick={() => updateCoach({ missedDismissed: [...(coach.missedDismissed || []), missedSession.iso].slice(-10) })} aria-label="Ignorer" className="shrink-0 w-8 h-8 rounded-xl bg-slate-800 text-slate-300 text-sm font-black">✕</button>
        </section>
      )}
      {/* QUESTIONS À RÉPONDRE UNE FOIS : petites notifications en haut ; une fois répondues, elles disparaissent
          (on retrouve le réglage dans la page Réglages) */}
      <CardioInvite gameState={gameState} setGameState={setGameState} />
      {!hasGoal && (
        <section data-testid="notif-goal" className="rounded-2xl border border-pink-400/50 bg-slate-900/80 px-3 py-1.5 flex items-center gap-2">
          <Art name="target" size={22} bare />
          <span className="flex-1 min-w-0 text-sm font-black text-white leading-tight">Quel est ton objectif ?</span>
          <button type="button" onClick={() => setSheet('goal')} data-testid="goal-open" className="shrink-0 px-3 py-1.5 rounded-xl bg-pink-600 text-white text-xs font-black">Choisir</button>
        </section>
      )}
      {!coach.program && !coach.noCoach && (
        <section data-testid="notif-program" className="rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-1.5 flex items-center gap-2">
          <Art name="clipboard" size={22} bare />
          <span className="flex-1 min-w-0 text-sm font-black text-white leading-tight">Tu as déjà un coach ?</span>
          <button type="button" onClick={() => setSheet('program')} data-testid="program-open" className="shrink-0 px-3 py-1.5 rounded-xl bg-pink-600 text-white text-xs font-black">Oui</button>
          <button type="button" onClick={() => updateCoach({ noCoach: true })} data-testid="notif-program-no" className="shrink-0 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold">Non</button>
        </section>
      )}
      {coach.program && coach.program.askTakeOver && (
        <section data-testid="notif-takeover" className="rounded-2xl border border-amber-400/60 bg-amber-500/10 px-3 py-1.5 flex items-center gap-2">
          <Art name="clipboard" size={22} bare />
          <span className="flex-1 min-w-0 text-sm font-black text-white leading-tight">Après ton programme, l’appli prend le relais ?</span>
          <button type="button" onClick={() => setSheet('program')} data-testid="program-open" className="shrink-0 px-3 py-1.5 rounded-xl bg-pink-600 text-white text-xs font-black">Répondre</button>
        </section>
      )}
      {/* EN HAUT : deux petits encadrés côte à côte. Prochaine séance → fenêtre pour la voir et la modifier ;
          cardio → résumé de la séance (Lancer / Déjà faite). */}
      {(() => {
        const fc = shownSession ? sessionFocus(shownSession.exercises) : null;
        const ttl = !shownSession || !shownSession.exercises.length ? 'À préparer' : shownSession.program && !plan ? shownSession.templateId : fc ? fc.label : plan ? 'Séance perso' : shownSession.typeLabel || `Séance ${shownSession.templateId}`;
        const showCardio = cardioNext && !(cardioNext === cardioToday && !muscuToday);
        const tile = 'tap-free min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70 p-2.5 flex items-center gap-2 text-left';
        const dayTxt = iso => { if (iso === today) return 'auj.'; const d = new Date(`${iso}T00:00:00`); return `${['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'][d.getDay()]} ${d.getDate()}`; };
        return (
          <div className={showCardio ? 'grid grid-cols-2 gap-2' : ''}>
            <button type="button" onClick={ev => { setSheetTop(ev.currentTarget.getBoundingClientRect().bottom); setSheet('next'); }} data-testid="next-session-open" aria-label="Voir et modifier la prochaine séance" className={`${tile} w-full`}>
              <span className="w-9 h-9 rounded-xl bg-slate-950 flex items-center justify-center shrink-0"><Art name="dumbbell" size={22} bare /></span>
              <span className="flex-1 min-w-0 block">
                <span className="block text-xs font-bold text-slate-400 truncate">{coachOff ? 'Aperçu' : 'Séance'}{shownSession ? ` · ${dayTxt(shownDate)}` : ''}{plan ? ' · perso' : ''}</span>
                <span className="block text-sm font-black text-white leading-tight truncate">{ttl}</span>
                {shownSession && shownSession.exercises.length > 0 && <span className="block text-xs text-slate-400 truncate">{shownSession.exercises.length} exos · {shownSession.estMin} min</span>}
              </span>
              <span className="text-pink-300 font-black shrink-0" aria-hidden="true">›</span>
            </button>
            {showCardio && (
              <section className="min-w-0" data-testid="cardio-next">
                <button type="button" onClick={() => setCardioPeek(cardioNext)} data-testid="cardio-next-open" aria-label="Voir le détail du cardio" className={`${tile} w-full h-full`}>
                  <span className="w-9 h-9 rounded-xl bg-slate-950 flex items-center justify-center shrink-0"><Art name="heart" size={22} bare /></span>
                  <span className="flex-1 min-w-0 block">
                    <span className="block text-xs font-bold text-slate-400 truncate">Cardio · {cardioNext.iso === today ? 'après ta muscu' : dayTxt(cardioNext.iso)}</span>
                    <span className="block text-sm font-black text-white leading-tight truncate">{cardioNext.title.split(' · ')[0]}</span>
                    <span className="block text-xs text-slate-400 truncate">{cardioNext.minutes} min{cardioNext.distanceText ? ` · ${cardioNext.distanceText}` : ''}</span>
                  </span>
                  <span className="text-pink-300 font-black shrink-0" aria-hidden="true">›</span>
                </button>
              </section>
            )}
          </div>
        );
      })()}
      {/* GRANDE CARTE DE LA SÉANCE : tout en haut, la prochaine séance et le bouton pour la lancer */}
      {guidedActive && (
        <div className="hero-zone"><section data-hero data-testid="session-hero" className={`hero-round bg-pink-600 text-white shadow-xl ${heroPress ? 'hero-press' : ''}`}>
          <p className="text-xs font-black uppercase tracking-widest opacity-80">Séance en cours</p>
          <h2 className="text-4xl font-black leading-none">Reprends où<br />tu en étais</h2>
          <button type="button" onClick={() => heroGo(onResumeGuided)} data-testid="resume-guided" className="hero-cta mt-2 px-7 py-3 rounded-full bg-slate-950 text-pink-400 text-xl font-black inline-flex items-center justify-center gap-2">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M7 4.5v15l12-7.5Z" fill="currentColor" /></svg>Reprendre
          </button>
        </section></div>
      )}
      {cardioPeek && <CardioSummary session={cardioPeek} onClose={() => setCardioPeek(null)} onStart={() => { setCardioRun({ session: cardioPeek }); setCardioPeek(null); }} onDone={() => { setCardioRun({ session: cardioPeek, atEnd: true }); setCardioPeek(null); }} />}
      {cardioRun && <CardioSession session={cardioRun.session} startAtEnd={!!cardioRun.atEnd} gameState={gameState} onClose={() => setCardioRun(null)} onSave={res => saveCardio(cardioRun.session, res)} />}
      {cardioMsg && <p className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-200" data-testid="cardio-saved" onClick={() => setCardioMsg('')}><Art name="heart" />{cardioMsg}</p>}
      {!guidedActive && cardioToday && !muscuToday && (
        <div className="hero-zone"><section data-hero data-testid="cardio-hero" className={`hero-round bg-pink-600 text-white shadow-xl ${heroPress ? 'hero-press' : ''}`}>
          <p className="text-xs font-black uppercase tracking-widest opacity-80">Cardio du jour<br />{cardioToday.minutes} min{cardioToday.distanceText ? ` · ${cardioToday.distanceText}` : ''}</p>
          <h2 className="text-3xl font-black leading-none">{cardioToday.title.split(' · ')[0]}</h2>
          <div className="w-36 max-w-full"><MuscleBodyMap worked={cardioWorked(cardioToday)} /></div>
          <button type="button" onClick={() => heroGo(() => setCardioRun({ session: cardioToday }))} data-testid="cardio-start"
            className="hero-cta mt-1 px-7 py-3 rounded-full bg-slate-950 text-pink-400 text-xl font-black inline-flex items-center justify-center gap-2">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M7 4.5v15l12-7.5Z" fill="currentColor" /></svg>Lancer
          </button>
        </section></div>
      )}
      {!guidedActive && !coachOff && !(cardioToday && !muscuToday) && shownSession && shownSession.exercises.length > 0 && sessionToStart && sessionToStart.exercises.length > 0 && (() => {
        const isToday = shownDate === today;
        const fc = sessionFocus(shownSession.exercises);
        const title = shownSession.program && !plan ? shownSession.templateId : fc ? fc.label : plan ? 'Séance perso' : shownSession.type ? shownSession.typeLabel : `Séance ${shownSession.templateId}`;
        return (
          <div className="hero-zone"><section data-hero data-testid="session-hero" className={`hero-round bg-pink-600 text-white shadow-xl ${heroPress ? 'hero-press' : ''}`}>
            <p className="text-xs font-black uppercase tracking-widest opacity-80">{isToday ? 'Séance du jour' : <>Prochaine séance<br />{formatDayFr(shownDate)}</>}<br />{shownSession.estMin} min</p>
            <h2 className="text-4xl font-black leading-none">{title}</h2>
            {/* schéma du corps : les muscles travaillés pendant la séance (même dessin que la page Équilibre) */}
            <div className="w-36 max-w-full">
              <MuscleBodyMap worked={shownSession.exercises.flatMap(e => { const q = (gameState.quests || []).find(x => x.id === e.questId); return q ? [fineGroupOf(q), secondGroupOf(q)].filter(Boolean) : []; })} />
            </div>
            <button type="button" onClick={() => heroGo(() => onStartGuided(sessionToStart))} data-testid={isToday ? 'start-today' : 'start-early'}
              className="hero-cta mt-1 px-7 py-3 rounded-full bg-slate-950 text-pink-400 text-xl font-black inline-flex items-center justify-center gap-2">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M7 4.5v15l12-7.5Z" fill="currentColor" /></svg>
              {isToday ? 'Lancer' : 'Lancer en avance'}
            </button>
          </section></div>
        );
      })()}
      {/* sous le rond : « Parle à ton coach » */}
      <div className="pr-16 md:pr-0"><CoachChat slim gameState={gameState} setGameState={setGameState} overview={ov} /></div>
      <span data-testid="seance-end" className="block h-px" aria-hidden="true" />
      <div className={sheet === 'goal' ? 'fixed inset-0 !mt-0 z-[65] bg-slate-950/85 backdrop-blur-sm overflow-y-auto' : 'hidden'} onClick={() => setSheet(null)} data-testid="sheet-goal">
        <div className="min-h-full flex items-end justify-center px-2 pt-14 pb-2">
          <div className="relative w-full max-w-2xl" onClick={e => e.stopPropagation()} role="dialog" aria-label="Mon objectif">
            <button type="button" onClick={() => setSheet(null)} aria-label="Fermer" className="absolute -top-11 right-1 w-9 h-9 rounded-lg bg-slate-800 text-slate-300 font-black">✕</button>
            {!hasGoal && <CoachGoal gameState={gameState} setGameState={setGameState} />}
          </div>
        </div>
      </div>
      <div className={sheet === 'program' ? 'fixed inset-0 !mt-0 z-[65] bg-slate-950/85 backdrop-blur-sm overflow-y-auto' : 'hidden'} onClick={() => setSheet(null)} data-testid="sheet-program">
        <div className="min-h-full flex items-end justify-center px-2 pt-14 pb-2">
          <div className="relative w-full max-w-2xl" onClick={e => e.stopPropagation()} role="dialog" aria-label="Programme de mon coach">
            <button type="button" onClick={() => setSheet(null)} aria-label="Fermer" className="absolute -top-11 right-1 w-9 h-9 rounded-lg bg-slate-800 text-slate-300 font-black">✕</button>
            {((!coach.program && !coach.noCoach) || (coach.program && coach.program.askTakeOver)) && <CoachProgram gameState={gameState} setGameState={setGameState} />}
          </div>
        </div>
      </div>
      <div className={sheet === 'next' ? 'fixed inset-0 !mt-0 z-[65] bg-slate-950/85 backdrop-blur-sm overflow-y-auto' : 'hidden'} onClick={() => setSheet(null)} data-testid="sheet-next">
        {/* collée en bas (comme le cardio) et commençant sous l'encadré « Séance » : retoucher l'encadré la referme */}
        <div className="min-h-full flex items-end justify-center px-2 pt-14 pb-2" style={sheetTop ? { paddingTop: Math.round(sheetTop + 52) } : undefined}>
          <div className="relative w-full max-w-2xl" onClick={e => e.stopPropagation()} role="dialog" aria-label="Prochaine séance">
            <button type="button" onClick={() => setSheet(null)} aria-label="Fermer" className="absolute -top-11 right-1 w-9 h-9 rounded-lg bg-slate-800 text-slate-300 font-black">✕</button>
      <CoachNextSession
        preview={coachOff}
        onTakeOver={() => updateCoach({ program: { ...coach.program, takeOver: true, askTakeOver: false } })}
        addSel={addSel}
        adjustTarget={adjustTarget}
        setCustom={(e, rows) => {
          const custom = customFromSets(rows, { kind: e.kind, load: e.load, assist: e.assist });
          setGameState(prev => ({ ...prev, quests: prev.quests.map(q => (q.id === e.questId ? { ...q, coachMethod: 'custom', coachCustom: custom } : q)) }));
        }}
        setMethod={(questId, id) => setGameState(prev => ({ ...prev, quests: prev.quests.map(q => (q.id === questId ? { ...q, coachMethod: id === 'auto' ? undefined : id } : q)) }))}
        availQuests={availQuests}
        coach={coach}
        doSwap={doSwap}
        first={first}
        gameState={gameState}
        onAddExercise={onAddExercise}
        onGoTab={x => { setSheet(null); onGoTab(x); }}
        onOpenLevelUp={x => { setSheet(null); onOpenLevelUp(x); }}
        onStartGuided={x => { setSheet(null); onStartGuided(x); }}
        ov={ov}
        plan={plan}
        planAdd={planAdd}
        planDate={planDate}
        planDayInfo={planDayInfo}
        planMove={planMove}
        planRemove={planRemove}
        rating={rating}
        sessionToStart={sessionToStart}
        setAddSel={setAddSel}
        setShortMode={setShortMode}
        setSwapFor={setSwapFor}
        shortMode={shortMode}
        shownDate={shownDate}
        shownSession={shownSession}
        startCustom={startCustom}
        strengthQuests={strengthQuests}
        swapFor={swapFor}
        tiredToday={tiredToday}
        today={today}
        todayInfo={todayInfo}
        updateCoach={updateCoach}
      />
          </div>
        </div>
      </div>

      </div>
      )}

      {page === 'equilibre' && <div className="page-in space-y-4" key="equilibre"><CoachHeart heart={heart} gameState={gameState} setGameState={setGameState} /><CoachBalance balance={balance} heart={heart} gameState={gameState} lowRows={lowRows} onAddExercise={onAddExercise} /></div>}

      {page === 'semaine' && (
      <div className="space-y-4 page-in" key="semaine">
      {/* EN-TÊTE */}
      <CoachHeader
        coach={coach}
        guidedActive={guidedActive}
        onResumeGuided={onResumeGuided}
        trainingWeeks={trainingWeeks}
        updateCoach={updateCoach}
        w0={w0}
        weekStart0={weekStart0}
      />

      {(advice.length > 0 || missedMsgs.length > 0) && (
        <CoachAdvice advice={advice} missedMsgs={missedMsgs} />
      )}

      {/* les objectifs de la semaine sont devenus des trophées renouvelables (onglet Trophées, WeeklyTrophies) */}

      {/* SEMAINE */}
      <CoachWeek
        coach={coach}
        updateCoach={updateCoach}
        sport={sportInfo(coach.sport)}
        dayShort={dayShort}
        first={first}
        ov={ov}
        plan={plan}
        plannedMap={plannedMap}
        cardioWeeks={cardioWeeks}
        today={today}
      />

      </div>
      )}

      {page === 'objectifs' && <div className="page-in" key="objectifs"><CoachObjectives gameState={gameState} onAddExercise={onAddExercise} questRows={questRows} /></div>}

      {page === 'reglages' && (
      <div className="space-y-4 page-in" data-testid="coach-settings-page" key="reglages">
        <CoachGoal gameState={gameState} setGameState={setGameState} />
        <CoachProgram gameState={gameState} setGameState={setGameState} inSettings={!!coach.noCoach && !coach.program} />
        <CoachCardio gameState={gameState} setGameState={setGameState} />
        <CoachExperience gameState={gameState} setGameState={setGameState} onOpenMaxima={onGoTab ? () => onGoTab('quests') : null} />
        <CoachPast gameState={gameState} setGameState={setGameState} />
        {/* FORME DES SÉRIES : variée (pyramides, dégressives, supersets…) ou classique */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs" data-testid="method-style">
          <h3 className="text-sm font-black text-white"><Art name="sparkle" />Forme des séries</h3>
          <div className="flex flex-wrap gap-2">
            {[['evidence', 'Selon les études'], ['variety', 'Variée'], ['classic', 'Classique']].map(([id, lab]) => {
              const cur = ['variety', 'classic'].includes(coach.methodStyle) ? coach.methodStyle : 'evidence';
              return <button key={id} type="button" data-testid={`method-style-${id}`} onClick={() => updateCoach({ methodStyle: id })} aria-pressed={cur === id} className={`px-3 py-1.5 rounded-lg font-black border ${cur === id ? 'bg-pink-600 border-pink-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>{lab}</button>;
            })}
          </div>
        </div>

        {/* PROFIL DE TRAVAIL */}
        <CoachProfile coach={coach} state={gameState} today={today} updateCoach={updateCoach} w0={w0} />

        <CoachCycle updateCoach={updateCoach} w0={w0} weekStart0={weekStart0} />

        {/* CALENDRIER & RÉGLAGES */}
        <CoachSettings
          addMatches={addMatches}
          addSeries={addSeries}
          coach={coach}
          dayShort={dayShort}
          extraVolleyInput={extraVolleyInput}
          matchInput={matchInput}
          matchList={matchList}
          serie={serie}
          setExtraVolleyInput={setExtraVolleyInput}
          setMatchInput={setMatchInput}
          setSerie={setSerie}
          today={today}
          toggleGymSkip={toggleGymSkip}
          toggleMatch={toggleMatch}
          toggleVolleyDay={toggleVolleyDay}
          toggleVolleySkip={toggleVolleySkip}
          upcomingGym={upcomingGym}
          upcomingVolley={upcomingVolley}
          updateCoach={updateCoach}
        />

        {/* POIDS & SANTÉ */}
        <CoachWeightHealth
          activity={activity}
          coach={coach}
          gameState={gameState}
          nutrition={nutrition}
          onQuickCardio={onQuickCardio}
          pace={pace}
          protein={protein}
          setGameState={setGameState}
          strengthTrend={strengthTrend}
          updateCoach={updateCoach}
        />

        {/* VOLLEY */}
        {(coach.volleyDays || []).length > 0 && (
          <CoachVolley gameState={gameState} onAddExercise={onAddExercise} sport={sportInfo(coach.sport)} />
        )}

        {/* SOURCES */}
        <CoachSources setShowSources={setShowSources} showSources={showSources} />
      </div>
      )}
    </div>
  );
}
