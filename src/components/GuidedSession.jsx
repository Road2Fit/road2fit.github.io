import { Art } from './Art';
import { lazy, Suspense, useEffect, useState } from 'react';
import { COACH_CHANGE_BADGES, coachFmt } from '../coach/labels';
import { warmupSets } from '../coach/warmup';
import { openMovement } from '../lib/movement';
import { assistsOf, fmtLoads, loadsOf } from '../lib/setLoads';

const MiniMovement = lazy(() => import('./MiniMovement'));
const MINI_KEY = 'rondoufit:miniAnim';
const miniOn = () => { try { return localStorage.getItem(MINI_KEY) !== 'off'; } catch (e) { return true; } };
// Séance guidée : exercice par exercice, avec repos automatique
export function GuidedSession({ g, setG, onFinish, onMinimize, onCancel }) {
  const [now, setNow] = useState(Date.now());
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [mini, setMini] = useState(miniOn);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    let lock = null;
    const req = async () => { try { if (navigator.wakeLock) lock = await navigator.wakeLock.request('screen'); } catch (e) {} };
    req();
    const onVis = () => { if (document.visibilityState === 'visible') req(); };
    document.addEventListener('visibilitychange', onVis);
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
  // détail = durée du repos + rappel de ce qui vient ensuite (affiché sur le minuteur)
  const startRest = (sec, next = '') => { try { window.dispatchEvent(new CustomEvent('rondoufit-rest', { detail: { sec, next } })); } catch (e) {} };

  // La charge (ou l'aide) se règle entre deux séries : elle s'applique aux séries pas encore faites.
  const setLoad = v => patch(it.questId, { load: v, loads: loadsOf(d).map((x, i) => (d.done[i] ? x : v)) });
  const setAssist = v => patch(it.questId, { assist: v, assists: assistsOf(d).map((x, i) => (d.done[i] ? x : v)) });

  const toggleSet = i => {
    const wasDone = d.done[i];
    const done = d.done.map((x, k) => (k === i ? !x : x));
    patch(it.questId, { done });
    if (!wasDone) {
      const isLastSet = i === d.done.length - 1;
      const isLastEx = g.idx === items.length - 1;
      if (!(isLastSet && isLastEx)) {
        const j = d.done.findIndex((x, k) => k > i && !x);
        const nx = items[g.idx + 1];
        const next = j >= 0
          ? `Série ${j + 1}/${d.done.length}${it.kind === 'load' ? ` · ${coachFmt(loadsOf(d)[j])} kg` : it.kind === 'assisted' ? ` · aide ${coachFmt(assistsOf(d)[j])} kg` : ''} · ${d.reps[j]} ${it.timed ? 's' : 'reps'}`
          : nx ? `Ensuite : ${nx.name}` : '';
        startRest(it.restSec, next);
      }
    }
  };
  // Échauffement : calculé d'après la charge de travail du moment et les exercices déjà faits dans la séance
  const warmRows = it && d ? warmupSets(it, items.slice(0, g.idx), d.load, d.assist) : [];
  const toggleWarm = (i, w) => {
    const wdone = warmRows.map((_, k) => (k === i ? !(d.wdone && d.wdone[k]) : !!(d.wdone && d.wdone[k])));
    patch(it.questId, { wdone });
    if (wdone[i]) startRest(w.restSec);
  };
  const [sw, setSw] = useState(null);
  const toggleSw = i => {
    if (sw && sw.i === i) {
      const sec = Math.max(1, Math.round((Date.now() - sw.start) / 1000));
      patch(it.questId, { reps: d.reps.map((r, k) => (k === i ? sec : r)) });
      setSw(null);
    } else setSw({ i, start: Date.now() });
  };
  const setReps = (i, v) => patch(it.questId, { reps: d.reps.map((r, k) => (k === i ? Math.max(0, v) : r)) });
  const addSet = () => patch(it.questId, { reps: [...d.reps, d.reps[d.reps.length - 1] || it.goalReps], done: [...d.done, false], loads: [...loadsOf(d), d.load], assists: [...assistsOf(d), d.assist] });
  const removeSet = () => { if (d.reps.length > 1) patch(it.questId, { reps: d.reps.slice(0, -1), done: d.done.slice(0, -1), loads: loadsOf(d).slice(0, -1), assists: assistsOf(d).slice(0, -1) }); };
  const goto = idx => { setSw(null); setG(prev => ({ ...prev, idx: Math.max(0, Math.min(items.length - 1, idx)), phase: 'run' })); };
  const doneCount = it ? d.done.filter(Boolean).length : 0;
  const step = it && it.kind === 'load' ? (it.equip === 'Haltères' ? (d.load < 10 ? 1 : 2) : d.load < 10 ? 1 : 2.5) : 2.5;

  const RPE_LABELS = { 6: 'Facile', 7: 'Modéré', 8: 'Dur', 9: 'Très dur', 10: 'Maximum' };
  // Échelle de ressenti d'un exercice (1 à 10), avec le nombre de répétitions qu'il restait « en réserve »
  const FELT = {
    1: 'Aucun effort', 2: 'Très facile', 3: 'Facile', 4: 'Assez facile', 5: 'Modéré',
    6: 'Soutenu (encore 4 reps possibles)', 7: 'Dur (encore 3 reps possibles)', 8: 'Très dur (encore 2 reps possibles)',
    9: 'Presque au maximum (encore 1 rep possible)', 10: 'Maximum (aucune rep de plus)',
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-4 pb-44 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs text-pink-300 font-black uppercase tracking-wider">Séance guidée {g.templateId ? `· ${g.templateId}` : ''}</p>
            <p className="text-xs text-slate-400">{fmtT(elapsed)} · {g.phase === 'summary' ? 'Résumé' : `Exercice ${g.idx + 1}/${items.length}`}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onMinimize} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold">Réduire</button>
            <button onClick={() => setConfirmCancel(true)} className="px-3 py-2 rounded-lg bg-rose-900/60 text-rose-200 text-xs font-bold">Abandonner</button>
          </div>
        </div>

        <div className="flex gap-1">
          {items.map((x, i) => {
            const dn = g.data[x.questId].done.filter(Boolean).length;
            return (
              <button key={x.questId} onClick={() => goto(i)} title={x.name} aria-label={x.name}
                className={`tap-free flex-1 h-2 rounded-full ${g.phase === 'run' && i === g.idx ? 'bg-pink-500' : dn > 0 ? 'bg-emerald-500' : 'bg-slate-700'}`} />
            );
          })}
        </div>

        {confirmCancel && (
          <div className="bg-rose-950/40 border border-rose-500/50 rounded-xl p-3 text-sm text-rose-100 space-y-2">
            <p>Abandonner la séance ? Rien ne sera enregistré.</p>
            <div className="flex gap-2">
              <button onClick={onCancel} className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs">Oui, abandonner</button>
              <button onClick={() => setConfirmCancel(false)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 font-bold text-xs">Continuer</button>
            </div>
          </div>
        )}

        {g.phase === 'run' && it && d && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-xl font-black text-white">{it.icon} {it.name}</h2>
                <button type="button" onClick={() => openMovement({ catalogId: (g.items[g.idx] || {}).catalogId, name: it.name })} title="Voir le mouvement (animation)" aria-label="Voir le mouvement" className="mb-1 px-2.5 py-1 rounded-lg bg-sky-900/50 border border-sky-500/40 text-xs font-bold text-sky-200"><Art name="film" />Mouvement</button>
                                <p className="text-xs text-slate-400">{it.arena} · repos {Math.floor(it.restSec / 60)} min{it.restSec % 60 ? ` ${it.restSec % 60}` : ''}</p>
              </div>
              {(() => { const b = COACH_CHANGE_BADGES[it.change] || COACH_CHANGE_BADGES.new; return <span className={`shrink-0 px-2 py-0.5 rounded-full border text-xs font-bold ${b[2]}`}>{b[0]} {b[1]}</span>; })()}
            </div>
            <details className="text-xs text-slate-400">
              <summary className="font-bold text-slate-300"><Art name="film" />Aperçu animé et conseil du coach</summary>
              <div className="mt-2 space-y-2">
                <button type="button" onClick={() => { const v = !mini; setMini(v); try { localStorage.setItem(MINI_KEY, v ? 'on' : 'off'); } catch (e) { /* rien */ } }} aria-pressed={mini} className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-600 text-xs font-bold text-slate-300">{mini ? 'Masquer l’aperçu' : 'Aperçu animé'}</button>
                {mini && <Suspense fallback={null}><MiniMovement catalogId={(g.items[g.idx] || {}).catalogId} name={it.name} /></Suspense>}
                <p>{it.reason}</p>
              </div>
            </details>
            
            {it.kind === 'load' && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-300 mr-auto">Charge</span>
                  <button onClick={() => setLoad(Math.max(0, Math.round((d.load - step) * 100) / 100))} className="w-10 h-10 rounded-lg bg-slate-800 text-white text-xl font-black">−</button>
                  <input type="number" step="0.5" value={d.load} onChange={e => setLoad(Number(e.target.value) || 0)} className="w-20 text-center bg-slate-950 border border-slate-700 rounded-lg py-2 text-xl font-black text-pink-300" />
                  <button onClick={() => setLoad(Math.round((d.load + step) * 100) / 100)} className="w-10 h-10 rounded-lg bg-slate-800 text-white text-xl font-black">+</button>
                  <span className="text-sm text-slate-400">kg</span>
                </div>
                <p className="text-xs text-slate-500">Changée entre deux séries, elle vaut pour les séries restantes.</p>
              </div>
            )}
            {it.kind === 'assisted' && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-300 mr-auto">Aide élastique</span>
                  <button onClick={() => setAssist(Math.max(0, d.assist - 2.5))} className="w-10 h-10 rounded-lg bg-slate-800 text-white text-xl font-black">−</button>
                  <input type="number" step="2.5" value={d.assist} onChange={e => setAssist(Math.max(0, Number(e.target.value) || 0))} className="w-24 text-center bg-slate-950 border border-slate-700 rounded-lg py-2 text-xl font-black text-pink-300" />
                  <button onClick={() => setAssist(d.assist + 2.5)} className="w-10 h-10 rounded-lg bg-slate-800 text-white text-xl font-black">+</button>
                  <span className="text-sm text-slate-400">kg</span>
                </div>
                <p className="text-xs text-slate-500">Changée entre deux séries, elle vaut pour les séries restantes.</p>
              </div>
            )}

            {warmRows.length > 0 && (
              <details className="space-y-2" data-testid="warmup">
                <summary className="text-sm font-bold text-amber-300"><Art name="flame" />Échauffement · {warmRows.length === 1 ? '1 série' : `${warmRows.length} séries`} avant les séries de travail ({warmRows.filter((_, k) => d.wdone && d.wdone[k]).length}/{warmRows.length})</summary>
                {warmRows.map((w, i) => {
                  const wd = !!(d.wdone && d.wdone[i]);
                  return (
                    <div key={i} className={`flex items-center justify-between gap-2 rounded-xl border p-2.5 ${wd ? 'bg-amber-950/30 border-amber-500/50' : 'bg-slate-950 border-amber-500/20'}`}>
                      <div>
                        <p className="text-sm font-black text-amber-100">Échauffement {warmRows.length > 1 ? i + 1 : ''}</p>
                        <p className="text-xs text-amber-200/80">{w.label}{it.timed ? ' s' : ''} · pas compté dans la séance</p>
                      </div>
                      <button onClick={() => toggleWarm(i, w)} className={`px-3 py-2 rounded-lg text-sm font-black ${wd ? 'bg-amber-600 text-white' : 'bg-slate-800 text-amber-200'}`}>
                        {wd ? '✓ Fait' : 'Fait'}
                      </button>
                    </div>
                  );
                })}
              </details>
            )}

            <div className="space-y-2">
              {d.reps.map((r, i) => (
                <div key={i} className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-2.5 ${d.done[i] ? 'bg-emerald-950/30 border-emerald-500/50' : i === d.done.findIndex(x => !x) ? 'bg-slate-950 border-pink-400/70' : 'bg-slate-950 border-slate-800'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white">Série {i + 1}</p>
                    <p className="text-xs text-slate-500">objectif {it.targetReps[i] !== undefined ? it.targetReps[i] : it.goalReps} {it.timed ? 's' : 'reps'}</p>
                    {it.kind === 'load' && <p className="text-xs font-bold text-amber-300">{coachFmt(loadsOf(d)[i])} kg</p>}
                    {it.kind === 'assisted' && <p className="text-xs font-bold text-violet-300">aide {coachFmt(assistsOf(d)[i])} kg</p>}
                  </div>
                  <div className="order-last w-full flex items-center gap-1.5">
                    {i > 0 && !d.done[i] && (
                      <button onClick={() => setReps(i, d.reps[i - 1])} title="Mêmes répétitions que la série précédente" aria-label="Comme la série précédente" className="shrink-0 w-11 h-11 rounded-lg bg-slate-800 text-sky-300 text-base font-black">=</button>
                    )}
                    <button onClick={() => setReps(i, (Number(r) || 0) - (it.timed ? 5 : 1))} className="shrink-0 w-11 h-11 rounded-lg bg-slate-800 text-white text-xl font-black">−</button>
                    <input type="number" value={r} onChange={e => setReps(i, Number(e.target.value) || 0)} className="flex-1 min-w-0 w-full text-center bg-slate-950 border border-slate-700 rounded-lg py-1.5 text-lg font-black text-white" />
                    <button onClick={() => setReps(i, (Number(r) || 0) + (it.timed ? 5 : 1))} className="shrink-0 w-11 h-11 rounded-lg bg-slate-800 text-white text-xl font-black">+</button>
                    {it.timed && (
                      <button onClick={() => toggleSw(i)} className={`px-2 h-9 rounded-lg text-xs font-black ${sw && sw.i === i ? 'bg-rose-600 text-white' : 'bg-cyan-700 text-white'}`}>
                        {sw && sw.i === i ? `■ ${Math.max(0, Math.round((now - sw.start) / 1000))} s` : 'Chrono'}
                      </button>
                    )}
                  </div>
                  <button onClick={() => toggleSet(i)} className={`px-5 py-2.5 rounded-xl text-sm font-black ${d.done[i] ? 'bg-emerald-600 text-white' : 'bg-pink-600 text-white'}`}>
                    {d.done[i] ? '✓ Faite' : 'Faite'}
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <button onClick={addSet} className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold">+ Série</button>
                <button onClick={removeSet} className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold">− Série</button>
              </div>
              <p className="text-xs text-slate-500">« Faite » lance le repos automatiquement.</p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
              <p className="text-xs font-bold text-slate-300">
                Ressenti sur cet exercice : à quel point c’était dur ? <span className="text-slate-500 font-semibold">(1 = très facile, 10 = maximum)</span>
              </p>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => patch(it.questId, { rpe: d.rpe === n ? undefined : n })}
                    className={`py-2 rounded-lg text-sm font-black border ${d.rpe === n ? 'bg-violet-600 border-violet-300 text-white' : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                {d.rpe ? `${d.rpe}/10 : ${FELT[d.rpe]}. Le coach s’en servira pour adapter la prochaine séance.` : 'Pas noté : le ressenti global de la séance sera utilisé. Plus tu notes, plus le coach est précis.'}
              </p>
            </div>
          </div>
        )}

        {g.phase === 'summary' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h2 className="text-lg font-black text-white"><Art name="clipboard" />Résumé de la séance</h2>
            {items.map(x => {
              const dd = g.data[x.questId];
              const reps = dd.reps.filter((r, i) => dd.done[i]);
              return (
                <div key={x.questId} className="text-sm bg-slate-950 border border-slate-800 rounded-xl p-2.5 space-y-0.5">
                  <p className="font-bold text-white">
                    {x.icon} {x.name}
                    {dd.rpe ? <span className="ml-2 text-xs font-bold text-slate-400 whitespace-nowrap">ressenti {dd.rpe}/10</span> : null}
                  </p>
                  <p className={reps.length ? 'text-emerald-300 font-bold' : 'text-slate-500'}>
                    {reps.length ? `${reps.join(' - ')} ${x.timed ? 's' : 'reps'}${x.kind === 'load' ? ` · ${fmtLoads(loadsOf(dd).filter((_, i) => dd.done[i]))}` : x.kind === 'assisted' ? ` · aide ${fmtLoads(assistsOf(dd).filter((_, i) => dd.done[i]))}` : ''}` : 'passé'}
                  </p>
                </div>
              );
            })}
            <div>
              <p className="text-xs font-bold text-slate-300 mb-1.5">Ressenti global de la séance (utilisé pour les exercices sans note de ressenti)</p>
              <div className="grid grid-cols-5 gap-1.5">
                {[6, 7, 8, 9, 10].map(n => (
                  <button key={n} onClick={() => setG(prev => ({ ...prev, rpe: n }))}
                    className={`py-2 rounded-lg text-xs font-black border ${g.rpe === n ? 'bg-pink-600 border-pink-400 text-white' : 'bg-slate-950 border-slate-700 text-slate-300'}`}>
                    {n}<span className="block text-[9px] font-semibold">{RPE_LABELS[n]}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-1">Le coach s’en sert, exercice par exercice : si c’était très dur il consolide au lieu d’augmenter, si c’était facile il augmente davantage.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => goto(items.length - 1)} className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-200 font-bold text-sm">Retour</button>
              <button onClick={() => onFinish(g)} className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-sm">Enregistrer la séance</button>
            </div>
          </div>
        )}
      </div>

      {g.phase === 'run' && it && (
        <div className="fixed bottom-0 inset-x-0 z-[61] bg-slate-950/95 border-t border-slate-800 px-4 py-3">
          <div className="max-w-2xl mx-auto flex gap-2">
            <button onClick={() => goto(g.idx - 1)} disabled={g.idx === 0} className="px-4 py-3 rounded-xl bg-slate-800 text-slate-200 font-bold text-sm disabled:opacity-40">◀</button>
            <button onClick={() => goto(g.idx + 1)} className="px-4 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs">Passer</button>
            <button
              onClick={() => (g.idx === items.length - 1 ? setG(prev => ({ ...prev, phase: 'summary' })) : goto(g.idx + 1))}
              className={`flex-1 py-3 rounded-xl font-black text-sm text-white ${doneCount >= d.reps.length ? 'bg-pink-600 hover:bg-pink-500' : 'bg-slate-700'}`}
            >
              {g.idx === items.length - 1 ? 'Terminer ▶ Résumé' : `Exercice suivant (${doneCount}/${d.reps.length})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
