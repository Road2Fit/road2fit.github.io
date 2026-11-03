import { Art } from '../Art';
import { useMemo, useState } from 'react';
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
import { Fold } from './Fold';
import { CoachProfile } from './CoachProfile';
import { CoachHeader } from './CoachHeader';
import { CoachNextSession } from './CoachNextSession';
import { CoachProgram } from './CoachProgram';
import { VoiceCallout } from '../VoiceCallout';
import { CoachChat } from './CoachChat';
import { CoachGoal } from './CoachGoal';
import { customFromSets } from '../../coach/methods';
import { CoachExperience } from './CoachExperience';
import { CoachPast } from './CoachPast';
import { programSession } from '../../coach/program';
import { CoachObjectives } from './CoachObjectives';
import { CoachSettings } from './CoachSettings';
import { CoachSources } from './CoachSources';
import { CoachVolley } from './CoachVolley';
import { CoachWeek } from './CoachWeek';
import { CoachWeightHealth } from './CoachWeightHealth';
import { sportInfo } from '../../data/sports';
import { arenaOf } from '../../data/muscles';

export function CoachPanel({
  gameState, setGameState, onStartGuided, onOpenLevelUp, onAddExercise, onQuickCardio, onGoTab,
  guidedActive, onResumeGuided, onClaimWeekly,
}) {
  const today = getTodayISODate();
  const coach = getCoachSettings(gameState);
  const hasGoal = !!(coach.mainGoal && coach.mainGoal.kind);
  const [showSources, setShowSources] = useState(false);
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
  const sessionToStart = (() => {
    if (plan) {
      if (!plan.questIds.length) return null;
      return coachBuildCustomSession(gameState, plan.questIds, today, { deload: w0.deload, matchWeek: w0.matchInWeek, sets: plan.sets, tired: tiredToday });
    }
    if (!first || !ov.hasExercises) return null;
    if (first.iso === today) return ov.session;
    if (ov.program) return programSession(gameState, { ...ov.program, date: today }); // séance du programme faite en avance
    return coachBuildPlanned(gameState, first, coachDayInfo(today, coach), { deload: w0.deload, matchWeek: w0.matchInWeek, tired: tiredToday, minutes: shortMode ? 40 : undefined });
  })();
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
      {/* SOMMAIRE : la page est longue, on saute directement à une partie */}
      <nav aria-label="Sommaire du Coach" className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4">
        {[['coach-seance', 'Séance', 'dumbbell'], ['coach-semaine', 'Semaine', 'calendar'], ['coach-objectifs', 'Objectifs', 'target'], ['coach-equilibre', 'Équilibre', 'scale'], ['coach-reglages', 'Réglages', 'gear']].map(([id, label, art]) => (
          <button key={id} type="button" onClick={() => { const el = document.getElementById(id); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className="shrink-0 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white whitespace-nowrap"><Art name={art} size={15} className="mr-1" />{label}</button>
        ))}
      </nav>
      <div className="lg:grid lg:grid-cols-2 lg:gap-5 lg:items-start space-y-4 lg:space-y-0">
      <div id="coach-seance" className="scroll-mt-3 space-y-4">
      {/* séance prévue ces derniers jours et pas faite : la faire maintenant en un geste */}
      {missedSession && sessionToStart && !guidedActive && (
        <section data-testid="missed-session" className="rounded-2xl border border-amber-400/60 bg-amber-500/10 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center shrink-0"><Art name="calendar" size={26} bare /></span>
            <div className="min-w-0">
              <h3 className="font-black text-white">Séance de {formatDayFr(missedSession.iso)} pas faite</h3>
              <p className="text-xs text-slate-300">Pas grave : fais-la aujourd’hui, le coach décale la suite de ton planning.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" data-testid="missed-session-start" onClick={() => onStartGuided(sessionToStart)} className="flex-1 py-3 rounded-xl bg-pink-600 text-white text-sm font-black">Faire cette séance maintenant</button>
            <button type="button" onClick={() => updateCoach({ missedDismissed: [...(coach.missedDismissed || []), missedSession.iso].slice(-10) })} className="px-4 py-3 rounded-xl bg-slate-800 text-slate-300 text-sm font-bold">Ignorer</button>
          </div>
        </section>
      )}
      <CoachChat gameState={gameState} setGameState={setGameState} overview={ov} />
      {/* « Mon objectif » : en haut tant qu'il n'est pas rempli, puis dans les réglages pour libérer le haut de la page */}
      {!hasGoal && <CoachGoal gameState={gameState} setGameState={setGameState} />}
      <VoiceCallout compact testId="voice-callout-coach" />
      {/* « Tu as déjà un coach ? » : rangé dans les réglages si la personne a répondu non (et sans programme) */}
      {!(coach.noCoach && !coach.program) && <CoachProgram gameState={gameState} setGameState={setGameState} />}
      {/* PROCHAINE SÉANCE */}
      <CoachNextSession
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

      {/* ÉQUILIBRE : juste sous la prochaine séance (ordinateur et téléphone), grande silhouette et explications */}
      <div id="coach-equilibre" className="scroll-mt-3">
      <CoachBalance balance={balance} gameState={gameState} lowRows={lowRows} onAddExercise={onAddExercise} />
      </div>

      </div>
      <div className="space-y-4">
      <div id="coach-semaine" className="scroll-mt-3 space-y-4">
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
        sport={sportInfo(coach.sport)}
        dayShort={dayShort}
        first={first}
        ov={ov}
        plan={plan}
        plannedMap={plannedMap}
        today={today}
      />

      </div>
      <div id="coach-objectifs" className="scroll-mt-3">
      {/* OBJECTIFS */}
      <CoachObjectives gameState={gameState} onAddExercise={onAddExercise} questRows={questRows} />

      </div>
      </div>
      </div>
      <div id="coach-reglages" className="scroll-mt-3">
      {/* RÉGLAGES ET DÉTAILS (repliés par défaut) */}
      <Fold title="⚙️ Réglages et détails du coach" subtitle={`Niveau, profil de travail, cycle, matchs, poids, ${sportInfo(coach.sport).label}, sources`}>
        {hasGoal && <CoachGoal gameState={gameState} setGameState={setGameState} />}
        {coach.noCoach && !coach.program && <CoachProgram gameState={gameState} setGameState={setGameState} inSettings />}
        <CoachExperience gameState={gameState} setGameState={setGameState} onOpenMaxima={onGoTab ? () => onGoTab('maxima') : null} />
        <CoachPast gameState={gameState} setGameState={setGameState} />
        {/* FORME DES SÉRIES : variée (pyramides, dégressives, supersets…) ou classique */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs" data-testid="method-style">
          <h3 className="text-sm font-black text-white"><Art name="sparkle" />Forme des séries</h3>
          <p className="text-slate-400">Selon les études (conseillé) : séries classiques, car à volume égal aucune autre forme ne fait plus de muscle. Le coach n’en change que lorsqu’une étude montre un intérêt pour toi : séance courte (séries dégressives et supersets, même résultat en moins de temps) ou objectif de répétitions (repos-pause).</p>
          <p className="text-slate-400">Variée (à ta demande) : le coach alterne pyramides, série lourde + séries allégées, dégressives, repos-pause, myo-reps, séries fractionnées, supersets, pour le plaisir de varier (pas plus efficace). Classique : toujours des séries fixes. Tu peux aussi simplement le demander au coach intelligent.</p>
          <div className="flex flex-wrap gap-2">
            {[['evidence', 'Selon les études'], ['variety', 'Variée'], ['classic', 'Classique']].map(([id, lab]) => {
              const cur = ['variety', 'classic'].includes(coach.methodStyle) ? coach.methodStyle : 'evidence';
              return <button key={id} type="button" data-testid={`method-style-${id}`} onClick={() => updateCoach({ methodStyle: id })} aria-pressed={cur === id} className={`px-3 py-1.5 rounded-lg font-black border ${cur === id ? 'bg-pink-600 border-pink-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>{lab}</button>;
            })}
          </div>
          <p className="text-slate-500">Une forme précise pour un exercice : « Pourquoi ? / Ajuster » sous l’exercice, dans la prochaine séance.</p>
        </div>

        {/* PROFIL DE TRAVAIL */}
        <CoachProfile coach={coach} today={today} updateCoach={updateCoach} w0={w0} />

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
      </Fold>
      </div>
    </div>
  );
}
