// Coach cardio : réglages (Réglages du Coach), invitation (page Séance) et carte « Cœur » (page Équilibre).
import { useState } from 'react';
import { Art } from '../Art';
import { card } from './ui';
import { CARDIO_GOALS, CARDIO_KINDS, RUN_PACES, cardioGoalFromMain, getCardioSettings, hrMax, paceText, runRef, speedAt, vdotFrom } from '../../coach/cardio';
import { CARDIO_SOURCES } from '../../data/cardioSources';
import { getCoachSettings } from '../../coach/settings';
import { formatDayFr, getTodayISODate } from '../../lib/dates';

const chip = on => `px-3 py-1.5 rounded-lg text-xs font-black border ${on ? 'bg-pink-600 border-pink-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`;

// « 28:30 » → 28,5 min ; « 1:52:00 » → 112 ; « 30 » → 30
export function parseTime(txt) {
  const parts = String(txt || '').trim().split(/[:'h ]+/).filter(Boolean).map(Number);
  if (!parts.length || parts.some(n => !Number.isFinite(n) || n < 0)) return 0;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] + parts[1] / 60;
  return parts[0] * 60 + parts[1] + parts[2] / 60;
}
const fmtTime = min => { const s = Math.round(min * 60); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const r = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`; };
const kmh = v => String(v).replace('.', ',');

/** Temps de référence en course → vitesses d'entraînement (Daniels). */
function RunReference({ gameState, c, set }) {
  const [km, setKm] = useState(c.ref ? Number(c.ref.km) : 5);
  const [time, setTime] = useState(c.ref ? fmtTime(c.ref.min) : '');
  const ref = runRef(gameState, getTodayISODate());
  const min = parseTime(time);
  const ok = !!vdotFrom(km, min);
  const zone = p => `${kmh(speedAt(ref.vdot, p[0]))}-${kmh(speedAt(ref.vdot, p[1]))} km/h (${paceText(speedAt(ref.vdot, p[1]))} à ${paceText(speedAt(ref.vdot, p[0]))})`;
  return (
    <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950 p-3" data-testid="run-ref">
      <p className="text-slate-300 font-bold">Ton temps de référence en course</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {[1, 3, 5, 10, 21.1].map(d => <button key={d} type="button" data-testid={`ref-km-${d}`} aria-pressed={km === d} onClick={() => setKm(d)} className={chip(km === d)}>{kmh(d)} km</button>)}
        <input type="text" inputMode="numeric" placeholder="28:30" value={time} onChange={e => setTime(e.target.value)} data-testid="ref-time" aria-label="Temps (minutes:secondes)" className="w-24 rounded-lg bg-slate-900 border border-slate-700 px-2 py-1.5 text-white font-bold" />
        <button type="button" data-testid="ref-save" disabled={!ok} onClick={() => set({ ref: { km, min: Math.round(min * 100) / 100 } })} className={`${chip(ok)} disabled:opacity-40`}>OK</button>
        {c.ref && <button type="button" onClick={() => { set({ ref: null }); setTime(''); }} className="text-slate-500 underline">effacer</button>}
      </div>
      {ref ? (
        <div className="text-slate-300 space-y-0.5" data-testid="run-paces">
          <p className="text-slate-500">{ref.source === 'history' ? `D’après ta course du ${formatDayFr(ref.date)} : ${kmh(ref.km)} km en ${fmtTime(ref.min)}.` : `${kmh(ref.km)} km en ${fmtTime(ref.min)}.`}</p>
          <p>Facile : <b className="text-white">{zone(RUN_PACES.easy)}</b></p>
          <p>Fractionné : <b className="text-white">{zone(RUN_PACES.hard)}</b></p>
        </div>
      ) : (
        <p className="text-slate-500">Une course récente (même un footing chronométré) donne tes vitesses. Sans elle, le coach te guide au souffle.</p>
      )}
    </div>
  );
}

export const setCardio = (setGameState, patch) =>
  setGameState(prev => {
    const coach = getCoachSettings(prev);
    return { ...prev, coach: { ...coach, cardio: { ...getCardioSettings(prev), ...patch } } };
  });

export function CardioSourcesList() {
  const [open, setOpen] = useState(false);
  return (
    <div className="text-xs text-slate-500">
      <button type="button" onClick={() => setOpen(v => !v)} className="underline text-slate-400" data-testid="cardio-sources-toggle">{open ? 'Masquer' : 'Voir'} les études</button>
      {open && (
        <ul className="mt-1 space-y-1" data-testid="cardio-sources">
          {CARDIO_SOURCES.map(s => <li key={s.ref}><b className="text-slate-300">{s.mark} {s.ref}</b> : {s.finding}</li>)}
          <li>Ce n’est pas un avis médical : en cas de problème de cœur, de tension ou de reprise après longtemps, demande d’abord l’avis d’un médecin.</li>
        </ul>
      )}
    </div>
  );
}

/** Réglages du cardio : le coach propose (ou non) des séances, selon l'objectif, les activités, le nombre et la durée. */
export function CoachCardio({ gameState, setGameState }) {
  const c = getCardioSettings(gameState);
  const set = patch => setCardio(setGameState, { asked: true, ...patch });
  const age = Number((getCoachSettings(gameState).profile || {}).age) || 0;
  const toggleKind = id => {
    const has = c.kinds.includes(id);
    const kinds = has ? c.kinds.filter(k => k !== id) : [...c.kinds, id];
    if (kinds.length) set({ kinds });
  };
  return (
    <section className={card} data-testid="coach-cardio">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-black text-white"><Art name="heart" />Cardio</h3>
        <div className="flex gap-1.5">
          <button type="button" data-testid="cardio-on" aria-pressed={c.on} onClick={() => set({ on: true, goal: c.on ? c.goal : cardioGoalFromMain(gameState) })} className={chip(c.on)}>Oui</button>
          <button type="button" data-testid="cardio-off" aria-pressed={!c.on} onClick={() => set({ on: false })} className={chip(!c.on)}>Non</button>
        </div>
      </div>
      {c.on && (
        <div className="space-y-3 text-xs">
          <div className="flex flex-wrap gap-1.5">
            {CARDIO_GOALS.map(g => <button key={g.id} type="button" data-testid={`cardio-goal-${g.id}`} aria-pressed={c.goal === g.id} onClick={() => set({ goal: g.id })} className={chip(c.goal === g.id)}><Art name={g.id === 'weight' ? 'flame' : g.id === 'endurance' ? 'runner' : 'heart'} />{g.label}</button>)}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CARDIO_KINDS.map(k => <button key={k.id} type="button" data-testid={`cardio-kind-${k.id}`} aria-pressed={c.kinds.includes(k.id)} onClick={() => toggleKind(k.id)} className={chip(c.kinds.includes(k.id))}>{k.icon} {k.label}</button>)}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-bold w-20">Par semaine</span>
            {[1, 2, 3, 4, 5].map(n => <button key={n} type="button" data-testid={`cardio-per-${n}`} aria-pressed={c.perWeek === n} onClick={() => set({ perWeek: n })} className={`${chip(c.perWeek === n)} w-9 px-0`}>{n}</button>)}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-bold w-20">Durée</span>
            {[20, 30, 45, 60].map(n => <button key={n} type="button" data-testid={`cardio-min-${n}`} aria-pressed={c.minutes === n} onClick={() => set({ minutes: n })} className={chip(c.minutes === n)}>{n} min</button>)}
          </div>
          {c.kinds.includes('run') && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-300 font-bold">Tu cours déjà 20 min sans t’arrêter ?</span>
              <button type="button" data-testid="cardio-runner-yes" aria-pressed={c.runner} onClick={() => set({ runner: true })} className={chip(c.runner)}>Oui</button>
              <button type="button" data-testid="cardio-runner-no" aria-pressed={!c.runner} onClick={() => set({ runner: false })} className={chip(!c.runner)}>Pas encore</button>
            </div>
          )}
          {c.kinds.includes('run') && <RunReference gameState={gameState} c={c} set={set} />}
          {hrMax(age) && <p className="text-slate-400">Fréquence cardiaque max estimée : <b className="text-slate-200">{hrMax(age)}</b> battements/min (Tanaka 2001).</p>}
          <CardioSourcesList />
        </div>
      )}
    </section>
  );
}

/** Invitation discrète sur la page Séance, une seule fois (Oui / Non merci), plus marquée si l'objectif est de perdre du poids. */
export function CardioInvite({ gameState, setGameState }) {
  const c = getCardioSettings(gameState);
  if (c.on || c.asked) return null;
  const weight = cardioGoalFromMain(gameState) === 'weight';
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 flex items-center gap-3" data-testid="cardio-invite">
      <Art name="heart" size={28} bare />
      <p className="flex-1 text-sm font-bold text-slate-100">{weight ? 'Ajouter du cardio pour perdre du poids ?' : 'Entraîner aussi ton cœur ?'}</p>
      <button type="button" data-testid="cardio-invite-yes" onClick={() => setCardio(setGameState, { on: true, asked: true, goal: cardioGoalFromMain(gameState), perWeek: 2, minutes: 30 })} className="px-3 py-2 rounded-lg bg-pink-600 text-white text-xs font-black">Oui</button>
      <button type="button" data-testid="cardio-invite-no" onClick={() => setCardio(setGameState, { asked: true })} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold">Non merci</button>
    </section>
  );
}

const BAR = { none: 'bg-slate-600', low: 'bg-rose-500', mid: 'bg-amber-400', good: 'bg-emerald-500' };

/** Le cœur sur la page Équilibre : minutes « cœur » de la semaine (1 min intense = 2) contre le repère. */
export function CoachHeart({ heart, gameState, setGameState }) {
  const c = getCardioSettings(gameState);
  const pct = Math.min(100, (heart.week.points / heart.band.good) * 100);
  return (
    <section className={card} data-testid="coach-heart">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-black text-white"><Art name="heart" />Cœur</h3>
        <span className="text-xs text-slate-400"><b className="text-white text-base" data-testid="heart-week">{heart.week.points}</b> / {heart.band.good} min cette semaine</span>
      </div>
      <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden"><div className={`h-full ${BAR[heart.status]}`} style={{ width: `${pct}%` }} /></div>
      <p className="text-xs text-slate-400">
        {heart.week.moderate} min modérées + {heart.week.vigorous} min intenses (comptées double) · moyenne {heart.avg} min/sem. · repère : {heart.band.why}.
      </p>
      {!c.on && (
        <button type="button" data-testid="heart-enable" onClick={() => setCardio(setGameState, { on: true, asked: true, goal: cardioGoalFromMain(gameState) })} className="w-full py-2.5 rounded-xl bg-pink-600 text-white text-sm font-black"><Art name="heart" />Le coach entraîne mon cœur</button>
      )}
    </section>
  );
}
