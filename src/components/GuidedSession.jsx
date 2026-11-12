import { Art } from './Art';
import { assistText } from '../lib/assist';
import { Suspense, useEffect, useRef, useState } from 'react';
import { safeLazy } from '../lib/safeLazy';
import { beepOn, unlockBeep } from '../form/repBeep';
import { playGameSound } from '../lib/sound';
import { isBarbell, platesText } from '../lib/plates';
import { PlatesDiagram } from './PlatesDiagram';
import { coachFmt } from '../coach/labels';
import { warmupSets } from '../coach/warmup';
import { restText } from '../coach/rest';
import { openMovement } from '../lib/movement';
import { assistsOf, fmtLoads, loadsOf } from '../lib/setLoads';
import { METHODS } from '../coach/methods';
import { RestGame, restGameWasOpen } from './RestGame';
import { FormReport } from './FormReport';
import { painAdvice, painFor } from '../coach/pains';
import { PainPicker } from './coach/CoachPains';
import { clearClip } from '../form/clip';
import { applyChinCal, chinCalToPassAll } from '../form/analyze';
import { setChinCal } from '../form/calibration';

const MiniMovement = safeLazy(() => import('./MiniMovement'));
// analyse vidéo d'une série (4.19) : chargée à la demande (préchargée dès l'ouverture de la séance, 4.34). Si elle ne
// peut pas se charger (pas de réseau, nouvelle version publiée), message à la place de l'écran « Oups ».
function CamUnavailable({ onClose }) {
  return (
    <div className="fixed inset-0 z-[90] bg-black/90 flex items-center justify-center p-6" role="dialog" aria-label="Caméra indisponible" data-testid="form-cam-unavailable" style={{ margin: 0 }}>
      <div className="max-w-sm w-full bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-3 text-center">
        <p className="text-base font-black text-white">La caméra n’a pas pu se charger</p>
        <p className="text-sm text-slate-300">Pas de réseau, ou une nouvelle version de l’appli vient d’être publiée. Recharge l’appli : ta séance reprendra où tu en étais.</p>
        <button type="button" onClick={() => window.location.reload()} className="w-full py-3 rounded-xl bg-pink-600 text-white font-black">Recharger</button>
        <button type="button" onClick={onClose} className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-100 font-bold">Continuer sans filmer</button>
      </div>
    </div>
  );
}
const FormCam = safeLazy(() => import('./FormCam'), CamUnavailable);

const fmtKg = x => String(Math.round(x * 100) / 100).replace('.', ',');
/**
 * Série faite avec 2 répétitions de moins (ou plus) que prévu, ou 3 de plus : proposition pour les séries suivantes.
 * Environ 2,5 % de charge par répétition d'écart (tableau % du max ↔ répétitions, NSCA), au plus 10 % d'un coup ;
 * aide (ou lest) : 2,5 kg. Une répétition d'écart est la fatigue normale d'une série à l'autre : on ne change rien.
 */
export function adaptAfterSet(it, d, done, target, step = 2.5) {
  if (!target || !it) return null;
  const diff = done - target;
  if (diff > -2 && diff < 3) return null;
  const hard = diff <= -2;
  const n = hard ? -diff : diff;
  const why = hard ? `${n} rep${n > 1 ? "s" : ""} de moins que prévu` : `${n} rep${n > 1 ? "s" : ""} de plus que prévu`;
  if (it.kind === 'load') {
    const base = Number(d.load) || 0;
    if (!(base > 0)) return null;
    const pct = Math.min(0.1, 0.025 * n);
    const raw = base * (hard ? 1 - pct : 1 + pct);
    let load = Math.round(raw / step) * step;
    if (load === base) load = hard ? base - step : base + step;
    if (load <= 0) return null;
    return { load, text: `${why} : la suite à ${fmtKg(load)} kg ?`, button: hard ? `Baisser à ${fmtKg(load)} kg` : `Monter à ${fmtKg(load)} kg` };
  }
  if (it.kind === 'assisted') {
    const assist = (Number(d.assist) || 0) + (hard ? 2.5 : -2.5);
    const label = assist > 0 ? `aide ${fmtKg(assist)} kg` : assist < 0 ? `lest +${fmtKg(-assist)} kg` : 'poids du corps';
    return { assist, label, text: `${why} : la suite avec ${label} ?`, button: hard ? 'Plus facile' : 'Plus difficile' };
  }
  return null;
}

// Séance guidée en plein écran : un écran = une série (ou une série d'échauffement), puis un écran de repos.
// Un seul grand bouton pour avancer ; charge et répétitions se règlent avec − / + sur l'écran de la série ;
// le reste (séries en plus, passer un exercice, abandonner) est dans le menu « ⋯ ». Flèche en haut à gauche : réduire.
// Pas de défilement : tout tient dans la hauteur de l'écran (100dvh).
// flèche commune des boutons du haut : la même, tournée (180° = précédent, 90° = réduire)
const chevron = deg => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" style={{ transform: `rotate(${deg}deg)` }}>
    <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function GuidedSession({ g, setG, onFinish, onMinimize, onCancel, soundEnabled = true, aiForm = null, pains = [], onTogglePain = null, swapChoices = () => [], onSwap = () => {}, onUndoSwap = () => {} }) {
  const [now, setNow] = useState(Date.now());
  const [menu, setMenu] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [sw, setSw] = useState(null); // chrono d'une tenue : { start }
  const [swapOpen, setSwapOpen] = useState(false); // liste « machine prise »
  // petit jeu pendant le repos : rouvert (en pause) au repos suivant s'il était ouvert
  const [gameOpen, setGameOpen] = useState(restGameWasOpen);
  // caméra ouverte pour filmer la série en cours (rouverte toute seule à la série suivante du même exercice : g.formAuto)
  const [camOpen, setCamOpen] = useState(false);
  // 4.34 : caméra et mini-animation préchargées (une coupure de réseau à la salle ne les bloque plus) ;
  // une analyse IA restée « en cours » (appli rechargée pendant l'attente) redevient lançable
  useEffect(() => {
    FormCam.preload(); MiniMovement.preload();
    setG(prev => (prev.formLast && prev.formLast.ai && prev.formLast.ai.pending ? { ...prev, formLast: { ...prev.formLast, ai: { idle: true } } } : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    let lock = null;
    const req = async () => { try { if (navigator.wakeLock) lock = await navigator.wakeLock.request('screen'); } catch (e) {} };
    req();
    const onVis = () => { if (document.visibilityState === 'visible') req(); };
    document.addEventListener('visibilitychange', onVis);
    // la page derrière ne défile plus : géré pour toute l'appli par lib/scrollLock.js
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      try { lock && lock.release(); } catch (e) {}
    };
  }, []);

  const elapsed = Math.max(0, Math.floor((now - g.startedAt) / 1000));
  const fmtT = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const items = g.items;
  const it = items[g.idx];
  const d = it ? g.data[it.questId] : null;
  const patch = (qid, p) => setG(prev => ({ ...prev, data: { ...prev.data, [qid]: { ...prev.data[qid], ...p } } }));
  // le minuteur global (RestTimer) sonne et vibre à la fin du repos ; ici on affiche l'écran de repos
  const stopRestEvent = () => { try { window.dispatchEvent(new CustomEvent('rondoufit-rest-stop')); } catch (e) {} };
  const restEvent = (sec, next = '') => { try { window.dispatchEvent(new CustomEvent('rondoufit-rest', { detail: { sec, next } })); } catch (e) {} };

  const plan = it && Array.isArray(it.plan) ? it.plan : null;
  const scaled = (x, v) => { const base = Number(d.load) || 0; if (!plan || !(base > 0)) return v; return Math.round(((Number(x) || 0) * v / base) * 4) / 4; };
  const setLoad = v => patch(it.questId, { load: v, loads: loadsOf(d).map((x, i) => (d.done[i] ? x : scaled(x, v))) });
  const setAssist = v => patch(it.questId, { assist: v, assists: assistsOf(d).map((x, i) => (d.done[i] ? x : plan ? (Number(x) || 0) + (v - (Number(d.assist) || 0)) : v)) });
  const setLabel = i => (plan && plan[i] ? plan[i].label : `Série ${i + 1}`);
  const restAfter = i => (plan && plan[i] && plan[i].rest !== undefined ? plan[i].rest : it.restSec);
  const partnerIdx = it && it.superset ? items.findIndex(x => x.questId === it.superset.partner) : -1;
  const remainingOf = x => ((g.data[x.questId] || {}).done || []).some(v => !v);
  const setText = (x, dd, j) => `${dd.reps[j]} ${x.timed ? 's' : 'reps'}${x.kind === 'load' ? ` à ${coachFmt(loadsOf(dd)[j])} kg` : x.kind === 'assisted' ? ` · ${assistText(assistsOf(dd)[j])}` : ''}`;

  const warmRows = it && d ? warmupSets(it, items.slice(0, g.idx), d.load, d.assist) : [];
  const anyWorkDone = d ? d.done.some(Boolean) : false;
  const warmIdx = warmRows.findIndex((_, k) => !(d.wdone && d.wdone[k]));
  const inWarm = !!(d && warmRows.length && warmIdx >= 0 && !d.wskip && !anyWorkDone);
  const j = d ? d.done.findIndex(x => !x) : -1; // série en cours
  const rest = g.rest && g.rest.endAt > now ? g.rest : null;
  const restLeft = rest ? Math.max(0, Math.ceil((rest.endAt - now) / 1000)) : 0;

  const startRest = (sec, next, extra = {}) => {
    restEvent(sec, next);
    setG(prev => ({ ...prev, rest: { endAt: Date.now() + sec * 1000, total: sec, next }, pr: null, ...extra }));
  };
  const skipRest = () => { stopRestEvent(); setG(prev => ({ ...prev, rest: null, adapt: null, pr: null })); };
  const adapt = g.adapt && it && g.adapt.questId === it.questId ? g.adapt : null;
  const applyAdapt = () => {
    if (!adapt) return;
    if (adapt.load !== undefined) setLoad(adapt.load);
    if (adapt.assist !== undefined) setAssist(adapt.assist);
    // le rappel de la série suivante suit la nouvelle charge
    const fix = t => (adapt.load !== undefined
      ? String(t || '').replace(/à [\d,]+ kg/, `à ${fmtKg(adapt.load)} kg`)
      : String(t || '').replace(/ · (aide [\d,]+ kg|lest \+[\d,]+ kg|poids du corps)$/, ` · ${adapt.label}`));
    setG(prev => ({ ...prev, adapt: null, rest: prev.rest ? { ...prev.rest, next: fix(prev.rest.next) } : prev.rest }));
  };
  const keepAdapt = () => setG(prev => ({ ...prev, adapt: null }));
  const addRest = () => {
    const left = rest ? Math.ceil((rest.endAt - Date.now()) / 1000) + 30 : 30;
    restEvent(left, rest ? rest.next : '');
    setG(prev => ({ ...prev, rest: { ...(prev.rest || {}), endAt: Date.now() + left * 1000, total: ((prev.rest && prev.rest.total) || 0) + 30 } }));
  };
  // prochain exercice qui a encore des séries (après celui-ci, puis en reprenant au début)
  const nextExerciseIdx = (from, data) => {
    for (let k = 1; k <= items.length; k++) {
      const n = (from + k) % items.length;
      if (((data[items[n].questId] || {}).done || []).some(v => !v)) return n;
    }
    return -1;
  };

  const doneSet = (repsOverride, form = null, aiCtx = null) => {
    if (!it || j < 0) return;
    const reps = repsOverride !== undefined ? d.reps.map((r, k) => (k === j ? repsOverride : r)) : d.reps;
    // analyse vidéo de CETTE série (affichée pendant le repos) ; série faite sans caméra : l'ancienne analyse disparaît
    const fx = form ? { formLast: { result: form, questId: it.questId, j, noted: Number(reps[j]) || 0, at: Date.now(), ai: aiForm && form.ok ? { idle: true } : null, aiCtx }, formAuto: it.questId } : { formLast: null };
    if (!form) clearClip(); // vidéo de la série précédente non gardée : effacée
    // 4.33 : la série qui vient d'être faite, pour corriger son nombre de reps pendant le repos
    fx.lastSet = { questId: it.questId, j };
    const done = d.done.map((x, k) => (k === j ? true : x));
    // record battu sur cette série ? (seulement s'il y a déjà un historique) : fêté sur l'écran de repos
    let pr = null;
    const b = d.best;
    const nr = Number(reps[j]) || 0;
    let best = b;
    if (b && nr > 0) {
      if (it.kind === 'load') { const l = Number(loadsOf(d)[j]) || 0; const e = l * (1 + nr / 30); if (b.e1rm > 0 && e > b.e1rm + 0.05) { pr = `${coachFmt(l)} kg × ${nr}`; best = { ...b, e1rm: e }; } }
      else if (it.timed) { if (b.sec > 0 && nr > b.sec) { pr = `${nr} s`; best = { ...b, sec: nr }; } }
      else if ((Number(assistsOf(d)[j]) || 0) === 0 && b.reps > 0 && nr > b.reps) { pr = `${nr} reps`; best = { ...b, reps: nr }; }
    }
    if (pr) { playGameSound('xp', soundEnabled); try { navigator.vibrate && navigator.vibrate([60, 40, 60]); } catch (e) {} }
    const prX = pr ? { pr: { questId: it.questId, text: pr } } : {};
    const data = { ...g.data, [it.questId]: { ...d, reps, done, best } };
    setSw(null);
    // séance finie : résumé
    if (items.every(x => (data[x.questId].done || []).every(Boolean))) {
      stopRestEvent();
      setG(prev => ({ ...prev, data, rest: null, phase: 'summary', rpeFor: it.questId, ...prX, ...fx }));
      return;
    }
    // superset : on passe à l'autre exercice de la paire
    if (partnerIdx >= 0 && (data[items[partnerIdx].questId].done || []).some(v => !v)) {
      const px = items[partnerIdx];
      const pd = data[px.questId];
      const pj = pd.done.findIndex(v => !v);
      setG(prev => ({ ...prev, data }));
      startRest(it.superset.first ? 15 : it.restSec, `Superset : ${px.name} · ${setText(px, pd, pj)}`, { idx: partnerIdx, ...prX, ...fx });
      return;
    }
    const nj = done.findIndex(v => !v);
    if (nj >= 0) {
      setG(prev => ({ ...prev, data }));
      // série trop dure ou trop facile : le coach propose d'ajuster la suite (un geste sur l'écran de repos)
      const adapt = plan ? null : adaptAfterSet(it, d, Number(reps[j]) || 0, Number(it.targetReps && it.targetReps[j] !== undefined ? it.targetReps[j] : it.goalReps) || 0, step);
      startRest(restAfter(j), `${plan ? setLabel(nj) : `Série ${nj + 1}/${done.length}`} · ${setText(it, data[it.questId], nj)}`, { adapt: adapt ? { ...adapt, questId: it.questId } : null, ...prX, ...fx });
      return;
    }
    // exercice fini : repos, puis exercice suivant ; le ressenti se donne pendant le repos
    const n = nextExerciseIdx(g.idx, data);
    setG(prev => ({ ...prev, data }));
    startRest(it.restSec, `Ensuite : ${items[n].name}`, { idx: n, rpeFor: it.questId, rpeAsk: it.questId, ...prX, ...fx });
  };
  const doneWarm = () => {
    const w = warmRows[warmIdx];
    const wdone = warmRows.map((_, k) => (k === warmIdx ? true : !!(d.wdone && d.wdone[k])));
    patch(it.questId, { wdone });
    const left = wdone.findIndex(v => !v);
    // 4.27 : l'analyse vidéo d'un exercice précédent ne reste pas affichée pendant les repos de l'échauffement
    clearClip();
    startRest(w.restSec, left >= 0 ? `Échauffement ${left + 1} · ${warmRows[left].label}` : `${setLabel(0)} · ${setText(it, d, 0)}`, { formLast: null, lastSet: null });
  };
  const setReps = (i, v) => patch(it.questId, { reps: d.reps.map((r, k) => (k === i ? Math.max(0, v) : r)) });
  // 4.33 : corriger le nombre de reps (ou de secondes) de la série qui vient d'être faite, avec ou sans vidéo
  const fixLastReps = n => setG(prev => {
    const ls = prev.lastSet;
    const dd = ls && prev.data[ls.questId];
    if (!dd) return prev;
    const v = Math.max(0, n);
    const fl = prev.formLast && prev.formLast.questId === ls.questId && prev.formLast.j === ls.j ? { ...prev.formLast, noted: v } : prev.formLast;
    return { ...prev, formLast: fl, data: { ...prev.data, [ls.questId]: { ...dd, reps: dd.reps.map((x, k) => (k === ls.j ? v : x)) } } };
  });
  const fixFormReps = n => setG(prev => {
    const fl = prev.formLast;
    const dd = fl && prev.data[fl.questId];
    if (!dd) return prev;
    return { ...prev, formLast: { ...fl, noted: n }, data: { ...prev.data, [fl.questId]: { ...dd, reps: dd.reps.map((r, k) => (k === fl.j ? n : r)) } } };
  });
  // calibration du menton (4.25) : « mon menton passait la barre » / remise à zéro ; l'analyse affichée est recalculée
  const onChinCal = kind => setG(prev => {
    const fl = prev.formLast;
    if (!fl || !fl.result || !fl.result.chin) return prev;
    const cal = kind === 'pass' ? chinCalToPassAll(fl.result) : 0;
    if (cal == null) return prev;
    setChinCal(cal);
    return { ...prev, formLast: { ...fl, result: applyChinCal(fl.result, cal), ai: fl.ai && !fl.ai.pending ? { idle: true } : fl.ai } };
  });
  const stopFormAuto = () => { setCamOpen(false); setG(prev => ({ ...prev, formAuto: null })); };
  const addSet = () => patch(it.questId, { reps: [...d.reps, d.reps[d.reps.length - 1] || it.goalReps], done: [...d.done, false], loads: [...loadsOf(d), d.load], assists: [...assistsOf(d), d.assist], ...(Array.isArray(d.kinds) ? { kinds: [...d.kinds, 'work'] } : {}) });
  const removeSet = () => { if (d.reps.length > 1 && !d.done[d.done.length - 1]) patch(it.questId, { reps: d.reps.slice(0, -1), done: d.done.slice(0, -1), loads: loadsOf(d).slice(0, -1), assists: assistsOf(d).slice(0, -1), ...(Array.isArray(d.kinds) ? { kinds: d.kinds.slice(0, -1) } : {}) }); };
  const goto = idx => { setSw(null); setMenu(false); stopRestEvent(); setG(prev => ({ ...prev, idx: Math.max(0, Math.min(items.length - 1, idx)), phase: 'run', rest: null })); };
  const skipExercise = () => {
    const n = nextExerciseIdx(g.idx, g.data);
    if (n < 0 || n === g.idx) { setMenu(false); setG(prev => ({ ...prev, phase: 'summary', rest: null })); return; }
    goto(n);
  };
  const step = it && it.kind === 'load' ? (it.equip === 'Haltères' ? (d.load < 10 ? 1 : 2) : d.load < 10 ? 1 : 2.5) : 2.5;
  const rpeQ = g.rpeFor ? items.find(x => x.questId === g.rpeFor) : null;
  const rpeD = rpeQ ? g.data[rpeQ.questId] : null;
  const setRpe = n => { if (rpeQ) patch(rpeQ.questId, { rpe: rpeD && rpeD.rpe === n ? undefined : n }); };
  // écran dédié au ressenti, juste après la fin d'un exercice : une note et on n'en parle plus
  const askQ = g.rpeAsk ? items.find(x => x.questId === g.rpeAsk) : null;
  const answerRpe = n => { if (askQ) setG(prev => ({ ...prev, rpeAsk: null, data: { ...prev.data, [askQ.questId]: { ...prev.data[askQ.questId], rpe: n } } })); };
  const skipRpe = () => setG(prev => ({ ...prev, rpeAsk: null }));
  // retirer complètement un exercice de CETTE séance (rien n'est enregistré pour lui)
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [painOpen, setPainOpen] = useState(false); // « J'ai mal quelque part » déplié dans le menu
  const painZone = it ? painFor(it, { pains }) : null;
  const removeExercise = () => {
    if (!it) return;
    const qid = it.questId;
    setConfirmRemove(false);
    setMenu(false);
    setSwapOpen(false);
    setSw(null);
    stopRestEvent();
    setG(prev => {
      const left = prev.items.filter(x => x.questId !== qid);
      const data = { ...prev.data };
      delete data[qid];
      const clean = { ...prev, items: left, data, rest: null, adapt: null, pr: null,
        rpeAsk: prev.rpeAsk === qid ? null : prev.rpeAsk, rpeFor: prev.rpeFor === qid ? null : prev.rpeFor };
      if (!left.length) return { ...clean, idx: 0, phase: 'summary' };
      // exercice suivant qui a encore des séries (à partir de la même place), sinon le résumé
      const from = Math.min(prev.idx, left.length - 1);
      for (let k = 0; k < left.length; k++) {
        const n = (from + k) % left.length;
        if (((data[left[n].questId] || {}).done || []).some(v => !v)) return { ...clean, idx: n, phase: 'run' };
      }
      return { ...clean, idx: from, phase: 'summary' };
    });
  };

  const RPE_LABELS = { 6: 'Facile', 7: 'Modéré', 8: 'Dur', 9: 'Très dur', 10: 'Max' };
  const big = 'w-full py-4 rounded-2xl text-lg font-black text-white bg-pink-600 active:bg-pink-500';
  const pm = 'w-14 h-14 rounded-2xl bg-slate-800 text-white text-2xl font-black active:bg-slate-700';

  // ressenti (1 à 10) de l'exercice qui vient de se terminer : une rangée de boutons, sans explication
  const rpeRow = () => (rpeQ && rpeD ? (
    <div className="space-y-1.5" data-testid="guided-rpe">
      <p className="text-sm font-bold text-slate-300 text-center">Ressenti sur {rpeQ.name} ?</p>
      <div className="grid grid-cols-10 gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
          <button key={n} type="button" onClick={() => setRpe(n)} aria-label={`Ressenti ${n} sur 10`}
            className={`tap-free h-10 rounded-lg text-sm font-black border ${rpeD.rpe === n ? 'bg-violet-600 border-violet-300 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>{n}</button>
        ))}
      </div>
    </div>
  ) : null);

  // valeur réglable en grand : − valeur +
  const tune = ({ label, value, unit, onMinus, onPlus, testId }) => (
    <div className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-2">
      <button type="button" onClick={onMinus} aria-label={`${label} moins`} className={pm}>−</button>
      <div className="text-center min-w-0">
        <p className="text-4xl font-black text-white leading-none" data-testid={testId}><span key={value} className="num-pop">{value}</span></p>
        <p className="text-xs font-bold text-slate-400 mt-1">{unit}</p>
      </div>
      <button type="button" onClick={onPlus} aria-label={`${label} plus`} className={pm}>+</button>
    </div>
  );

  // animation de l'exercice en cours, en boucle pendant la série (touchée : grande fenêtre) ; exercice sans animation : rien
  const animEl = (it ? (
    <div className="shrink min-h-0 h-[28dvh] flex justify-center [&_button]:h-full [&_button]:w-auto [&_button]:border-0 [&_svg]:h-full [&_svg]:w-auto" data-testid="guided-anim">
      <Suspense fallback={null}><MiniMovement catalogId={it.catalogId} name={it.name} /></Suspense>
    </div>
  ) : null);

  const chooseFeel = level => {
    setG(prev => {
      if (level !== 'low') return { ...prev, feel: level };
      const data = { ...prev.data };
      prev.items.forEach(x => {
        const dd = data[x.questId];
        if (!dd || dd.done.some(Boolean)) return;
        const st = x.kind === 'load' ? (x.equip === 'Haltères' ? (dd.load < 10 ? 1 : 2) : dd.load < 10 ? 1 : 2.5) : 2.5;
        const lighter = v => Math.max(0, Math.round((Number(v) || 0) * 0.9 / st) * st);
        const cut = dd.reps.length > 2 ? 1 : 0; // une série de moins (jamais moins de 2)
        const keep = arr => (Array.isArray(arr) ? arr.slice(0, arr.length - cut) : arr);
        data[x.questId] = {
          ...dd,
          reps: keep(dd.reps), done: keep(dd.done), kinds: keep(dd.kinds),
          ...(x.kind === 'load' ? { load: lighter(dd.load), loads: keep(loadsOf(dd)).map(lighter) } : {}),
          ...(x.kind === 'assisted' ? { assist: (Number(dd.assist) || 0) + 5, assists: keep(assistsOf(dd)).map(a => (Number(a) || 0) + 5) } : {}),
          ...(x.kind !== 'load' && x.kind !== 'assisted' ? { loads: keep(dd.loads), assists: keep(dd.assists) } : {}),
        };
      });
      return { ...prev, feel: level, data };
    });
  };

  let screen = 'set';
  if (!g.feel && !Object.values(g.data).some(dd => (dd.done || []).some(Boolean))) screen = 'feel';
  else if (g.phase === 'summary') screen = 'summary';
  else if (askQ && !(g.data[askQ.questId] || {}).rpe) screen = 'rpe';
  else if (rest) screen = 'rest';
  else if (inWarm) screen = 'warm';

  // « Précédent » : chaque changement d'écran garde l'état d'avant ; revenir le restaure (une « Série faite » touchée par
  // erreur est annulée, un repos reprend là où il en était)
  const screenKey = `${screen}:${g.idx}:${j}:${warmIdx}`;
  const hist = useRef({ key: null, snap: null, stack: [], back: false });
  if (hist.current.key !== screenKey) {
    const sn = hist.current.snap;
    const restOver = sn && sn.g.rest && sn.g.rest.endAt && sn.restLeft <= 1; // repos fini tout seul : rien à y revenir
    if (sn && !hist.current.back && !restOver) hist.current.stack = [...hist.current.stack, sn].slice(-30);
    hist.current.back = false;
    hist.current.key = screenKey;
  }
  hist.current.snap = { g, restLeft };
  useEffect(() => {
    setCamOpen(screen === 'set' && !!it && j >= 0 && g.formAuto === it.questId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenKey]);
  const formNow = g.formLast && (screen === 'rest' || screen === 'summary') ? g.formLast : null;
  // 4.27 : pendant le repos, schéma des disques de la PROCHAINE série (échauffement ou travail) pour préparer la barre
  const restLoad = screen === 'rest' && it && d && it.kind === 'load' && isBarbell(it.name) ? (inWarm ? warmRows[warmIdx].load : j >= 0 ? loadsOf(d)[j] : null) : null;
  const restPlates = restLoad && platesText(restLoad) ? restLoad : null;
  // 4.33 : série qui vient d'être faite (corrigeable pendant le repos)
  const lastIt = g.lastSet ? items.find(x => x.questId === g.lastSet.questId) : null;
  const lastData = lastIt ? g.data[lastIt.questId] : null;
  const lastVal = lastData && lastData.done && lastData.done[g.lastSet.j] ? Number(lastData.reps[g.lastSet.j]) || 0 : null;
  const lastStep = lastIt && lastIt.timed ? 5 : 1;
  const canBack = hist.current.stack.length > 0;
  const goBack = () => {
    const st = hist.current.stack;
    if (!st.length) return;
    const prev = st[st.length - 1];
    hist.current.stack = st.slice(0, -1);
    hist.current.back = true;
    setSw(null);
    setMenu(false);
    if (prev.g.rest && prev.restLeft > 0) {
      const sec = Math.max(5, prev.restLeft);
      restEvent(sec, prev.g.rest.next || '');
      setG({ ...prev.g, rest: { ...prev.g.rest, endAt: Date.now() + sec * 1000 } });
    } else {
      stopRestEvent();
      setG({ ...prev.g, rest: null });
    }
  };

  // tenue chronométrée (gainage…) : le chrono s'arrête tout seul au temps prévu de la série, avec un son et une vibration
  const holdTarget = it && it.timed && j >= 0 ? Number(d.reps[j]) || 0 : 0;
  useEffect(() => {
    if (!sw || !(holdTarget > 0)) return;
    if (now - sw.start >= holdTarget * 1000) {
      playGameSound('done', soundEnabled);
      try { navigator.vibrate && navigator.vibrate([150, 80, 150, 80, 300]); } catch (e) {}
      doneSet(holdTarget);
    }
  });

  const onFormDone = (res, extra = {}) => {
    setCamOpen(false);
    // tenue : le temps prévu s'il est atteint, sinon le temps mesuré ; reps : le nombre prévu (la caméra propose de corriger)
    const secs = it && it.timed ? (extra.reachedTarget && holdTarget ? holdTarget : res.ok && res.holdSec ? res.holdSec : extra.sec) : undefined;
    const earlier = (g.formHist && g.formHist[it.questId]) || [];
    doneSet(secs, res, { setLabel: setLabel(j), setText: setText(it, d, j), earlier });
    if (res.ok) {
      const line = `${setLabel(j)} : ${res.summary}, verdict ${res.verdict}`;
      setG(prev => ({ ...prev, formHist: { ...(prev.formHist || {}), [it.questId]: [...earlier, line].slice(-4) } }));
    }
    // coach IA activé : son analyse ne part QUE si la personne la demande (bouton de l'onglet « Coach IA »)
  };
  // envoie les mesures (jamais l'image) au coach IA ; sa réponse s'affiche dans l'onglet « Coach IA »
  // 4.34 : tout est lu dans g.formLast (avant, une copie à part se perdait : après « Mon menton passait la barre »,
  // la séance réduite puis rouverte ou l'appli rechargée, le bouton ne faisait plus rien)
  const runFormAi = () => {
    const fl = g.formLast;
    if (!aiForm || !fl || !fl.result || !fl.result.ok || (fl.ai && fl.ai.pending)) return;
    const item = (g.items || []).find(x => x.questId === fl.questId);
    if (!item) return;
    const dd = g.data[fl.questId];
    const ctx = fl.aiCtx || { setLabel: setLabel(fl.j), setText: dd ? setText(item, dd, fl.j) : '', earlier: [] };
    const args = { item, ...ctx, result: fl.result };
    const put = ai => setG(prev => (prev.formLast && prev.formLast.at === fl.at ? { ...prev, formLast: { ...prev.formLast, ai } } : prev));
    put({ pending: true });
    aiForm(args).then(ai => put(ai || { error: 'Réponse du coach IA illisible.' }), e => put({ error: (e && e.message) || 'Le coach IA ne répond pas.', retry: true }));
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950 flex flex-col h-[100dvh] overflow-hidden" role="dialog" aria-label="Séance guidée" data-testid="guided" style={{ margin: 0 }}>
      {/* barre du haut : réduire, temps, menu */}
      <div className="shrink-0 flex items-center gap-2 px-3 pt-3 pb-2">
        <button type="button" onClick={goBack} disabled={!canBack} aria-label="Précédent" data-testid="guided-back" className="nav-btn disabled:opacity-30">{chevron(180)}</button>
        <button type="button" onClick={onMinimize} aria-label="Réduire la séance" data-testid="guided-minimize" className="nav-btn">{chevron(90)}</button>
        <div className="flex-1 min-w-0 text-center">
          <p className="text-xs font-black text-pink-300 uppercase tracking-wider truncate">{screen === 'summary' ? 'Résumé' : `Exercice ${g.idx + 1}/${items.length}`}</p>
          <p className="text-xs text-slate-400">{fmtT(elapsed)}</p>
        </div>
        <button type="button" onClick={() => setMenu(true)} aria-label="Plus d’options" data-testid="guided-menu" className="nav-btn"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor"><circle cx="5.5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="18.5" cy="12" r="2" /></svg></button>
      </div>
      {/* exercice changé (machine prise) : on peut revenir en arrière tant qu'aucune série n'est faite */}
      {it && d && g.swap && g.swap.newId === it.questId && !d.done.some(Boolean) && screen !== 'summary' && (
        <button type="button" onClick={onUndoSwap} className="tap-free shrink-0 mx-auto -mt-1 mb-1 text-xs text-slate-500 underline underline-offset-2" data-testid="swap-undo">↺ Revenir à {g.swap.item.name}</button>
      )}
      <div className="shrink-0 flex gap-1 px-3">
        {items.map((x, i) => {
          const dd = g.data[x.questId];
          const all = dd.done.every(Boolean);
          return <button key={x.questId} type="button" onClick={() => goto(i)} aria-label={x.name} className={`tap-free flex-1 h-1.5 rounded-full ${i === g.idx && screen !== 'summary' ? 'bg-pink-500' : all ? 'bg-emerald-500' : dd.done.some(Boolean) ? 'bg-emerald-800' : 'bg-slate-700'}`} />;
        })}
      </div>

      <div key={screenKey} className="screen-in flex-1 min-h-0 flex flex-col px-4 pt-3 pb-4 max-w-md w-full mx-auto">
        {/* COMMENT TE SENS-TU ? (1re page) */}
        {screen === 'feel' && (
          <div className="flex-1 flex flex-col justify-center gap-4" data-testid="guided-feel">
            <h2 className="text-2xl font-black text-white text-center">Comment te sens-tu aujourd’hui ?</h2>
            {[['low', 'Cuit', 'tired', 'Séance allégée'], ['ok', 'Normal', 'smile', ''], ['high', 'En forme', 'muscle', '']].map(([lv, lab, art, sub]) => (
              <button key={lv} type="button" onClick={() => chooseFeel(lv)} data-testid={`feel-${lv}`}
                className={`w-full py-5 rounded-2xl border-2 flex items-center justify-center gap-3 text-xl font-black bg-slate-900 border-slate-700 text-slate-100`}>
                <Art name={art} size={30} bare />
                <span>{lab}</span>
                {sub && <span className="text-xs font-bold text-slate-400">{sub}</span>}
              </button>
            ))}
          </div>
        )}

        {/* RESSENTI de l'exercice qui vient de se terminer : écran à lui, demandé une seule fois */}
        {screen === 'rpe' && askQ && (
          <div className="flex-1 flex flex-col" data-testid="guided-rpe-screen">
            <p className="text-center text-sm font-bold text-slate-400" data-testid="rpe-rest-left">{rest ? <>Repos · <span className="text-white font-black">{fmtT(restLeft)}</span></> : 'Repos terminé'}</p>
            {g.pr && <div className="num-pop text-center mt-2" data-testid="guided-pr"><p className="text-lg font-black text-amber-300"><Art name="trophy" size={22} />Nouveau record !</p><p className="text-xs text-slate-400">{(items.find(x => x.questId === g.pr.questId) || {}).name} · {g.pr.text}</p></div>}
            <div className="flex-1 flex flex-col justify-center gap-4" data-testid="guided-rpe">
              <div className="text-center">
                <p className="text-sm font-black text-pink-300 uppercase tracking-wider">Exercice terminé</p>
                <h2 className="text-2xl font-black text-white mt-1">Ressenti sur {askQ.name} ?</h2>
                <p className="text-xs text-slate-400 mt-1">1 = très facile · 10 = impossible d’en faire une de plus</p>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <button key={n} type="button" onClick={() => answerRpe(n)} aria-label={`Ressenti ${n} sur 10`} data-testid={`rpe-${n}`}
                    className="h-16 rounded-2xl text-2xl font-black border bg-slate-900 border-slate-700 text-slate-100 active:bg-slate-700">{n}</button>
                ))}
              </div>
            </div>
            <button type="button" onClick={skipRpe} className="w-full py-3 text-sm font-bold text-slate-400" data-testid="rpe-skip">Passer</button>
          </div>
        )}

        {/* REPOS */}
        {screen === 'rest' && (
          <div className="flex-1 flex flex-col" data-testid="guided-rest">
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              {g.pr && <div className="num-pop text-center" data-testid="guided-pr"><p className="text-lg font-black text-amber-300"><Art name="trophy" size={22} />Nouveau record !</p><p className="text-xs text-slate-400">{(items.find(x => x.questId === g.pr.questId) || {}).name} · {g.pr.text}</p></div>}
              {gameOpen ? (
                <>
                  <p className="text-sm font-black text-emerald-300 uppercase tracking-wider" data-testid="rest-left-small">Repos · <span className="text-white" data-testid="rest-left">{fmtT(restLeft)}</span></p>
                  <RestGame onClose={() => setGameOpen(false)} />
                </>
              ) : formNow ? (
                <>
                  <div className="w-full flex items-center justify-between">
                    <span className="w-11" />
                    <p className="text-sm font-black text-emerald-300 uppercase tracking-wider" data-testid="rest-left-small">Repos · <span className="text-white text-2xl align-middle" data-testid="rest-left">{fmtT(restLeft)}</span></p>
                    <button type="button" onClick={() => setGameOpen(true)} aria-label="Jouer pendant le repos" title="Jouer pendant le repos" data-testid="rest-game-open" className="nav-btn"><Art name="gamepad" size={22} bare /></button>
                  </div>
                  <FormReport form={formNow} onFixReps={fixFormReps} onAskAi={runFormAi} onChinCal={onChinCal} />
                </>
              ) : (<>
              <div className="w-full flex items-center justify-between">
                <span className="w-11" />
                <p className="text-sm font-black text-emerald-300 uppercase tracking-wider">Repos</p>
                <button type="button" onClick={() => setGameOpen(true)} aria-label="Jouer pendant le repos" title="Jouer pendant le repos" data-testid="rest-game-open" className="nav-btn"><Art name="gamepad" size={22} bare /></button>
              </div>
              <div className="relative w-64 h-64 max-w-[70vw] max-h-[70vw]">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="6" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#10b981" strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 45} strokeDashoffset={2 * Math.PI * 45 * (1 - restLeft / Math.max(1, rest.total))} />
                </svg>
                <p className="absolute inset-0 flex items-center justify-center text-7xl font-black text-white" data-testid="rest-left">{fmtT(restLeft)}</p>
              </div>
              </>)}
              {lastVal !== null && (
                <div className="flex items-center justify-center gap-2" data-testid="last-set-fix">
                  <span className="text-xs font-bold text-slate-400">{g.lastSet.questId !== (it && it.questId) ? `${lastIt.name} · ` : ''}Série faite :</span>
                  <button type="button" onClick={() => fixLastReps(lastVal - lastStep)} disabled={lastVal <= 0} aria-label={lastIt.timed ? 'Cinq secondes de moins' : 'Une rep de moins'} data-testid="last-set-minus" className="tap-free w-8 h-8 rounded-lg bg-slate-800 text-white text-lg font-black disabled:opacity-30">−</button>
                  <span className="min-w-[4.5rem] text-center text-sm font-black text-white" data-testid="last-set-reps">{lastVal} {lastIt.timed ? 's' : lastVal > 1 ? 'reps' : 'rep'}</span>
                  <button type="button" onClick={() => fixLastReps(lastVal + lastStep)} aria-label={lastIt.timed ? 'Cinq secondes de plus' : 'Une rep de plus'} data-testid="last-set-plus" className="tap-free w-8 h-8 rounded-lg bg-slate-800 text-white text-lg font-black">+</button>
                </div>
              )}
              {rest.next && <p className="text-base font-bold text-slate-200 text-center" data-testid="rest-next">{rest.next}</p>}
              {restPlates && <PlatesDiagram total={restPlates} testId="rest-plates" className="w-full" />}
              {adapt && (
                <div className="w-full bg-slate-900 border border-amber-500/50 rounded-2xl p-3 space-y-2" data-testid="guided-adapt">
                  <p className="text-sm font-bold text-amber-100 text-center">{adapt.text}</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={keepAdapt} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-bold text-sm">Garder</button>
                    <button type="button" onClick={applyAdapt} className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white font-black text-sm" data-testid="adapt-apply">{adapt.button}</button>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <button type="button" onClick={addRest} className="px-5 py-4 rounded-2xl bg-slate-800 text-slate-100 font-black">+30 s</button>
                <button type="button" onClick={skipRest} className={`${big} flex-1`} data-key data-testid="guided-next">{/^Ensuite/.test(rest.next || '') ? 'Exercice suivant' : 'Série suivante'}</button>
              </div>
            </div>
          </div>
        )}

        {/* ÉCHAUFFEMENT */}
        {screen === 'warm' && it && (
          <div className="flex-1 flex flex-col" data-testid="warmup">
            {animEl}
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
              <h2 className="text-2xl font-black text-white">{it.name}</h2>
              <p className="text-sm font-black text-amber-300 uppercase tracking-wider"><Art name="flame" />Échauffement {warmRows.length > 1 ? `${warmIdx + 1}/${warmRows.length}` : ''}</p>
              <p className="text-4xl font-black text-amber-100">{warmRows[warmIdx].label}</p>
              {it.kind === 'load' && isBarbell(it.name) && platesText(warmRows[warmIdx].load) && (
                <PlatesDiagram total={warmRows[warmIdx].load} testId="warm-plates" className="w-full" />
              )}
            </div>
            <div className="space-y-2">
              <button type="button" onClick={doneWarm} data-hero className={big.replace('bg-pink-600 active:bg-pink-500', 'bg-amber-600 active:bg-amber-500')} data-testid="warm-done">Échauffement fait</button>
              <button type="button" onClick={() => patch(it.questId, { wskip: true })} className="w-full py-2 text-sm font-bold text-slate-400">Passer l’échauffement</button>
            </div>
          </div>
        )}

        {/* SÉRIE */}
        {screen === 'set' && it && d && j >= 0 && (
          <div className="flex-1 min-h-0 flex flex-col gap-3" data-testid="guided-set">
            {animEl}
            <div className="text-center">
              <h2 className="text-2xl font-black text-white leading-tight">{it.name}</h2>
              <p className="text-base font-black text-pink-300 mt-1" data-testid="set-label">{setLabel(j)} · {j + 1}/{d.reps.length}</p>
              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1.5">
                {plan && <span className="px-2 py-0.5 rounded-full bg-violet-900/60 border border-violet-500/50 text-xs font-bold text-violet-200" data-testid="guided-method">{(METHODS[it.method] || {}).label}</span>}
                {it.superset && <span className="px-2 py-0.5 rounded-full bg-sky-900/60 border border-sky-500/50 text-xs font-bold text-sky-200">Superset avec {(items[partnerIdx] || {}).name}</span>}
                <span className="text-xs text-slate-500">repos {restText(restAfter(j))}</span>
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-center gap-3">
              {it.timed && sw ? (
                <p className="text-center text-7xl font-black text-white" data-testid="timed-chrono">{Math.min(holdTarget || Infinity, Math.max(0, Math.floor((now - sw.start) / 1000)))} s{holdTarget > 0 && <span className="block text-xl text-slate-400 mt-1">sur {holdTarget} s</span>}</p>
              ) : (
                tune({ label: 'Répétitions', testId: 'set-reps', value: d.reps[j], unit: it.timed ? 'secondes' : 'répétitions',
                  onMinus: () => setReps(j, (Number(d.reps[j]) || 0) - (it.timed ? 5 : 1)), onPlus: () => setReps(j, (Number(d.reps[j]) || 0) + (it.timed ? 5 : 1)) })
              )}
              {it.kind === 'load' && !sw && tune({ label: 'Charge', testId: 'set-load', value: coachFmt(loadsOf(d)[j]), unit: 'kg',
                onMinus: () => setLoad(Math.max(0, Math.round((d.load - step) * 100) / 100)), onPlus: () => setLoad(Math.round((d.load + step) * 100) / 100) })}
              {it.kind === 'assisted' && !sw && tune({ label: 'Lest', testId: 'guided-assist', value: assistsOf(d)[j] === 0 ? '0' : coachFmt(-assistsOf(d)[j]), unit: assistsOf(d)[j] > 0 ? 'kg · aide élastique' : assistsOf(d)[j] < 0 ? 'kg · lest' : 'poids du corps',
                onMinus: () => setAssist(d.assist + 2.5), onPlus: () => setAssist(d.assist - 2.5) })}
              {it.kind === 'load' && !sw && isBarbell(it.name) && platesText(loadsOf(d)[j]) && (
                <PlatesDiagram total={loadsOf(d)[j]} testId="set-plates" className="-mt-1" />
              )}
              {painZone && !sw && <p className="text-center text-xs font-bold text-amber-300" data-testid="set-pain">{painAdvice(painZone)}</p>}
              {!d.prev && !sw && !it.timed && !d.done.some(Boolean) && (
                <p className="text-center text-xs text-slate-400" data-testid="set-first">{it.kind === 'load'
                  ? `Première fois : prends une charge avec laquelle tu pourrais faire ${(Number(d.reps[j]) || 0) + 2} reps. Règle-la avec − et +.`
                  : 'Première fois : arrête-toi quand il te reste 2 reps en réserve, et note ce que tu as fait.'}</p>
              )}
              {d.prev && !sw && (() => {
                const k = Math.min(j, d.prev.reps.length - 1);
                const r = d.prev.reps[k];
                const extra = it.kind === 'load' ? ` à ${coachFmt(d.prev.loads[k])} kg` : it.kind === 'assisted' && Number(d.prev.assists[k]) ? ` · ${assistText(d.prev.assists[k])}` : '';
                return <p className="text-center text-xs text-slate-500" data-testid="set-prev">La dernière fois : {r} {it.timed ? 's' : 'reps'}{extra}</p>;
              })()}
            </div>
            {!sw && (
              <button type="button" onClick={() => { if (beepOn()) unlockBeep(); setCamOpen(true); }} className="tap-free w-full py-1.5 text-sm font-bold text-slate-300 flex items-center justify-center gap-1" data-testid="form-cam-open">
                <Art name="camera" />Me filmer : le coach analyse ma série
              </button>
            )}
            {it.timed ? (
              sw ? (
                <button type="button" onClick={() => doneSet(Math.max(1, Math.round((Date.now() - sw.start) / 1000)))} data-hero className={big.replace('bg-pink-600 active:bg-pink-500', 'bg-rose-600')} data-testid="set-done">■ Stop</button>
              ) : (
                <div className="flex gap-2">
                  <button type="button" onClick={() => doneSet()} className="px-5 py-4 rounded-2xl bg-slate-800 text-slate-100 font-black" data-testid="set-done">Fait</button>
                  <button type="button" onClick={() => setSw({ start: Date.now() })} className={`${big} flex-1`}>▶ Chrono</button>
                </div>
              )
            ) : (
              <button type="button" onClick={() => doneSet()} className={big} data-hero data-key data-testid="set-done">Série faite</button>
            )}
          </div>
        )}

        {screen === 'set' && it && d && j < 0 && (
          <div className="flex-1 min-h-0 flex flex-col gap-3" data-testid="exercise-recap">
            <div className="text-center">
              <h2 className="text-2xl font-black text-white">{it.name}</h2>
              <p className="text-base font-black text-emerald-300 mt-1">✓ Terminé</p>
            </div>
            {/* résumé de ce qui a été fait : chaque série, l'échauffement, le volume et le ressenti */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5">
              {d.reps.map((r, i) => (
                <div key={i} className="flex items-center justify-between gap-2 bg-slate-900 border border-emerald-500/30 rounded-xl px-3 py-2.5">
                  <span className="text-sm font-bold text-slate-300">{setLabel(i)}</span>
                  <span className="text-base font-black text-white">{setText(it, d, i)}</span>
                </div>
              ))}
              {(() => {
                const warm = warmRows.filter((_, k) => d.wdone && d.wdone[k]).length;
                const vol = it.kind === 'load' ? d.reps.reduce((s, r, i) => s + (Number(r) || 0) * (Number(loadsOf(d)[i]) || 0), 0) : 0;
                const repsTot = d.reps.reduce((s, r) => s + (Number(r) || 0), 0);
                return (
                  <div className="grid grid-cols-3 gap-1.5 pt-1 text-center">
                    <div className="bg-slate-900 rounded-xl py-2"><p className="text-lg font-black text-white">{repsTot}</p><p className="text-xs text-slate-400">{it.timed ? 'secondes' : 'reps'}</p></div>
                    <div className="bg-slate-900 rounded-xl py-2"><p className="text-lg font-black text-white">{vol ? coachFmt(Math.round(vol)) : warm}</p><p className="text-xs text-slate-400">{vol ? 'kg soulevés' : 'échauffement'}</p></div>
                    <div className="bg-slate-900 rounded-xl py-2"><p className="text-lg font-black text-white">{d.rpe ? `${d.rpe}/10` : '—'}</p><p className="text-xs text-slate-400">ressenti</p></div>
                  </div>
                );
              })()}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={addSet} className="px-5 py-4 rounded-2xl bg-slate-800 text-slate-100 font-black">+ Série</button>
              <button type="button" onClick={skipExercise} className={`${big} flex-1`} data-key data-testid="guided-next">Exercice suivant</button>
            </div>
          </div>
        )}

        {/* RÉSUMÉ */}
        {screen === 'summary' && (
          <div className="flex-1 min-h-0 flex flex-col gap-3" data-testid="guided-summary">
            <h2 className="shrink-0 text-xl font-black text-white text-center">Résumé de la séance</h2>
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5">
              {formNow && <FormReport form={formNow} onFixReps={fixFormReps} onAskAi={runFormAi} onChinCal={onChinCal} />}
              {items.map(x => {
                const dd = g.data[x.questId];
                const reps = dd.reps.filter((r, i) => dd.done[i]);
                return (
                  <div key={x.questId} className="text-sm bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
                    <p className="font-bold text-white">{x.name}{dd.rpe ? <span className="ml-2 text-xs font-bold text-slate-400 whitespace-nowrap">ressenti {dd.rpe}/10</span> : null}</p>
                    <p className={reps.length ? 'text-emerald-300 font-bold' : 'text-slate-500'}>
                      {reps.length ? `${reps.join(' - ')} ${x.timed ? 's' : 'reps'}${x.kind === 'load' ? ` · ${fmtLoads(loadsOf(dd).filter((_, i) => dd.done[i]))}` : x.kind === 'assisted' ? ` · aide ${fmtLoads(assistsOf(dd).filter((_, i) => dd.done[i]))}` : ''}` : 'passé'}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="shrink-0 space-y-3">
              {rpeD && !rpeD.rpe && rpeRow()}
              <div>
                <p className="text-sm font-bold text-slate-300 text-center mb-1.5">Ta séance, globalement ?</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {[6, 7, 8, 9, 10].map(n => (
                    <button key={n} type="button" onClick={() => setG(prev => ({ ...prev, rpe: n }))}
                      className={`py-2 rounded-lg text-xs font-black border ${g.rpe === n ? 'bg-pink-600 border-pink-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>
                      {n}<span className="block text-[9px] font-semibold">{RPE_LABELS[n]}</span>
                    </button>
                  ))}
                </div>
              </div>
              <button type="button" onClick={() => onFinish(g)} data-hero data-key className={big.replace('bg-pink-600 active:bg-pink-500', 'bg-emerald-600 active:bg-emerald-500')}>Enregistrer la séance</button>
            </div>
          </div>
        )}
      </div>

      {camOpen && it && d && j >= 0 && (
        <Suspense fallback={null}>
          <FormCam item={it} soundEnabled={soundEnabled}
            info={`${setLabel(j)} · ${setText(it, d, j)}`}
            targetReps={it.timed ? 0 : Number(d.reps[j]) || 0} holdTarget={it.timed ? Number(d.reps[j]) || 0 : 0}
            onDone={onFormDone} onClose={() => setCamOpen(false)} onStopAuto={g.formAuto === it.questId ? stopFormAuto : null} />
        </Suspense>
      )}

      {/* MENU « ⋯ » : tout ce qui sert rarement */}
      {menu && (
        <div className="absolute inset-0 z-10 bg-slate-950/80 flex items-end" onClick={() => { setMenu(false); setConfirmCancel(false); setConfirmRemove(false); }}>
          <div className="w-full max-w-md mx-auto bg-slate-900 border-t border-slate-700 rounded-t-3xl p-4 space-y-2" onClick={e => e.stopPropagation()} data-testid="guided-menu-sheet">
            {it && screen !== 'summary' && (
              <>
                <p className="text-sm font-black text-white text-center">{it.name}</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={addSet} className="py-3 rounded-xl bg-slate-800 text-slate-100 font-bold text-sm">+ Série</button>
                  <button type="button" onClick={removeSet} className="py-3 rounded-xl bg-slate-800 text-slate-100 font-bold text-sm">− Série</button>
                  <button type="button" onClick={() => goto(g.idx - 1)} disabled={g.idx === 0} className="py-3 rounded-xl bg-slate-800 text-slate-100 font-bold text-sm disabled:opacity-40">◀ Exercice précédent</button>
                  <button type="button" onClick={skipExercise} className="py-3 rounded-xl bg-slate-800 text-slate-100 font-bold text-sm">Passer l’exercice ▶</button>
                </div>
                <button type="button" onClick={() => { setMenu(false); openMovement({ catalogId: it.catalogId, name: it.name }); }} className="w-full py-3 rounded-xl bg-slate-800 text-sky-200 font-bold text-sm"><Art name="film" />Voir le mouvement</button>
                <button type="button" onClick={() => { setMenu(false); window.dispatchEvent(new CustomEvent('rondoufit-lexicon', { detail: 'basics' })); }} className="w-full py-3 rounded-xl bg-slate-800 text-slate-100 font-bold text-sm" data-testid="guided-lexicon"><Art name="info" />Les mots de la séance (série, ressenti…)</button>
                {!d.done.some(Boolean) && <button type="button" onClick={() => setSwapOpen(v => !v)} aria-expanded={swapOpen} className="w-full py-3 rounded-xl bg-slate-800 text-slate-100 font-bold text-sm" data-testid="swap-open"><Art name="repeat" />Machine prise ou pas le matériel ? Changer d’exercice</button>}
                {swapOpen && !d.done.some(Boolean) && (() => {
                  const list = swapChoices(it.questId);
                  return (
                    <div className="space-y-1.5" data-testid="swap-list">
                      {list.length === 0 && <p className="text-xs text-slate-400 text-center">Aucun exercice équivalent pour ce muscle.</p>}
                      {list.map(c => (
                        <button key={c.questId || c.catalogId} type="button" onClick={() => { setSwapOpen(false); setMenu(false); onSwap(it.questId, c); }}
                          className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-700 text-left text-sm font-bold text-slate-100" data-testid="swap-choice">
                          {c.name}{c.isNew && <span className="text-xs text-slate-500"> · nouveau</span>}
                        </button>
                      ))}
                    </div>
                  );
                })()}
                {onTogglePain && <button type="button" onClick={() => setPainOpen(v => !v)} aria-expanded={painOpen} className="w-full py-3 rounded-xl bg-slate-800 text-amber-200 font-bold text-sm" data-testid="pain-open"><Art name="warn" />J’ai mal quelque part</button>}
                {onTogglePain && painOpen && <PainPicker pains={pains} onToggle={onTogglePain} />}
                {!confirmRemove
                  ? <button type="button" onClick={() => setConfirmRemove(true)} className="w-full py-3 rounded-xl bg-slate-800 text-rose-300 font-bold text-sm" data-testid="remove-exercise">Supprimer l’exercice de la séance</button>
                  : <button type="button" onClick={removeExercise} className="w-full py-3 rounded-xl bg-rose-600 text-white font-black text-sm" data-testid="remove-exercise-confirm">Oui, retirer {it.name}{d.done.some(Boolean) ? ' (ses séries faites ne seront pas enregistrées)' : ''}</button>}
                {it.reason && <details className="text-xs text-slate-400"><summary className="font-bold text-slate-300 py-1">Pourquoi cet objectif ?</summary><p className="mt-1">{it.reason}</p>{plan && <p className="mt-1">{(METHODS[it.method] || {}).how}</p>}</details>}
              </>
            )}
            {screen !== 'summary' && <button type="button" onClick={() => { setMenu(false); setG(prev => ({ ...prev, phase: 'summary', rest: null })); stopRestEvent(); }} className="w-full py-3 rounded-xl bg-slate-800 text-slate-100 font-bold text-sm">Terminer la séance</button>}
            {screen === 'summary' && <button type="button" onClick={() => goto(g.idx)} className="w-full py-3 rounded-xl bg-slate-800 text-slate-100 font-bold text-sm">Retour à la séance</button>}
            {!confirmCancel
              ? <button type="button" onClick={() => setConfirmCancel(true)} className="w-full py-3 rounded-xl text-rose-300 font-bold text-sm">Abandonner</button>
              : <button type="button" onClick={onCancel} className="w-full py-3 rounded-xl bg-rose-600 text-white font-black text-sm">Oui, abandonner (rien n’est enregistré)</button>}
          </div>
        </div>
      )}
    </div>
  );
}
