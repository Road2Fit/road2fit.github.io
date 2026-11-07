import { Art } from '../Art';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { coachBalance, coachDayAdvice, coachEta, coachMissed, coachMissedSession, coachNutrition, coachOverview, coachPlateau, coachStrengthTrend, coachTrainingWeeks, coachWeekActivity, coachWeightPace } from '../../coach/advice';
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
import { CardioSession, savedCardioRun } from './CardioSession';
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
      const t = document.querySelector('[data-testid="next-session-title"]');
      if (!z) return;
      if (!touch || window.__r2fVhW !== window.innerWidth) { window.__r2fVhW = window.innerWidth; window.__r2fVh = window.innerHeight; }
      const vh = window.__r2fVh;
      const nav = document.querySelector('nav[aria-label="Navigation"]');
      const navH = nav && getComputedStyle(nav).position === 'fixed' ? nav.getBoundingClientRect().height : 0;
      const prev = z.style.minHeight;
      z.style.minHeight = '';
      if (!t) return;
      const titleBottom = t.getBoundingClientRect().bottom - document.body.getBoundingClientRect().top;
      const extra = Math.min(vh * 0.6, vh - navH - 14 - titleBottom);
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
    updateCoach({ plan: { date: first ? first.iso : today, questIds: ids, sets } });
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
          const { coachOverride, ...rest } = q;
          return rest;
        }
        const n = coachRealEntries(q).length;
        const cur = q.coachOverride && q.coachOverride.entries === n ? q.coachOverride : {};
        const dir = action === 'harder' ? 1 : -1;
        const next = { ...cur, entries: n };
        if (e.kind === 'load') {
          const st = coachStep(q, e.load);
          next.load = Math.max(0, coachRound(e.load + dir * st, st));
        } else if (e.kind === 'assisted') {
          next.assist = Math.max(0, e.assist - dir * 2.5);
        } else {
          next.repsDelta = (cur.repsDelta || 0) + dir;
        }
        return { ...q, coachOverride: next };
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

  return (
    <div className="space-y-4" data-testid="coach-panel">
      {/* PAGES DU COACH : un bouton = une page, rien d'autre à l'écran */}
      <nav aria-label="Pages du Coach" className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4" role="tablist">
        {COACH_PAGES.map(([id, label, art]) => (
          <button key={id} type="button" role="tab" aria-selected={page === id} data-testid={`coach-page-${id}`} onClick={() => { setPage(id); try { window.scrollTo({ top: 0 }); } catch (e) { /* rien */ } }}
            className={`shrink-0 px-3 py-1.5 rounded-full border text-xs font-bold whitespace-nowrap ${page === id ? 'bg-pink-600 border-pink-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'}`}><Art name={art} size={15} className="mr-1" />{label}</button>
        ))}
      </nav>
      {page === 'seance' && (
      <div className="space-y-4 page-in" key="seance">
      {/* séance prévue ces derniers jours et pas faite : la faire maintenant en un geste */}
      {missedSession && sessionToStart && !guidedActive && (
        <section data-testid="missed-session" className="rounded-2xl border border-amber-400/60 bg-amber-500/10 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center shrink-0"><Art name="calendar" size={26} bare /></span>
            <div className="min-w-0">
              <h3 className="font-black text-white">Séance de {formatDayFr(missedSession.iso)} pas faite</h3>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" data-testid="missed-session-start" onClick={() => onStartGuided(sessionToStart)} className="flex-1 py-3 rounded-xl bg-pink-600 text-white text-sm font-black">Faire cette séance maintenant</button>
            <button type="button" onClick={() => updateCoach({ missedDismissed: [...(coach.missedDismissed || []), missedSession.iso].slice(-10) })} className="px-4 py-3 rounded-xl bg-slate-800 text-slate-300 text-sm font-bold">Ignorer</button>
          </div>
        </section>
      )}
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
        const title = plan ? 'Séance perso' : shownSession.type ? shownSession.typeLabel : shownSession.program ? shownSession.templateId : `Séance ${shownSession.templateId}`;
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
      {/* cardio : prochaine séance (ou celle du jour, après la muscu), puis l'invitation tant que la personne n'a pas répondu */}
      {cardioNext && !(cardioNext === cardioToday && !muscuToday) && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 flex items-center gap-3" data-testid="cardio-next">
          <span className="w-11 h-11 rounded-xl bg-slate-950 flex items-center justify-center shrink-0"><Art name="heart" size={26} bare /></span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-400">{cardioNext.iso === today ? 'Cardio après ta muscu' : `Cardio · ${formatDayFr(cardioNext.iso)}`} · {cardioNext.minutes} min{cardioNext.distanceText ? ` · ${cardioNext.distanceText}` : ''}</p>
            <p className="text-sm font-black text-white leading-tight">{cardioNext.title}</p>
          </div>
          <button type="button" data-testid="cardio-next-start" onClick={() => setCardioRun({ session: cardioNext })} aria-label="Lancer le cardio" className="w-10 h-10 rounded-full bg-pink-600 text-white inline-flex items-center justify-center shrink-0"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M7 4.5v15l12-7.5Z" fill="currentColor" /></svg></button>
          <button type="button" data-testid="cardio-next-done" onClick={() => setCardioRun({ session: cardioNext, atEnd: true })} aria-label="Déjà faite" className="w-10 h-10 rounded-full bg-slate-800 text-emerald-300 inline-flex items-center justify-center shrink-0"><Art name="check" size={18} bare /></button>
        </section>
      )}
      <CardioInvite gameState={gameState} setGameState={setGameState} />
      <CoachChat gameState={gameState} setGameState={setGameState} overview={ov} />
      {/* « Mon objectif » : en haut tant qu'il n'est pas rempli, puis dans les réglages pour libérer le haut de la page */}
      {!hasGoal && <CoachGoal gameState={gameState} setGameState={setGameState} />}
      {/* « Tu as déjà un coach ? » : rangé dans les réglages si la personne a répondu non (et sans programme) */}
      {!(coach.noCoach && !coach.program) && <CoachProgram gameState={gameState} setGameState={setGameState} />}
      {/* PROCHAINE SÉANCE */}
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
        onGoTab={onGoTab}
        onOpenLevelUp={onOpenLevelUp}
        onStartGuided={onStartGuided}
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
        {hasGoal && <CoachGoal gameState={gameState} setGameState={setGameState} />}
        {coach.noCoach && !coach.program && <CoachProgram gameState={gameState} setGameState={setGameState} inSettings />}
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
