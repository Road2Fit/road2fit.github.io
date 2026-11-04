import { useMemo, useState } from 'react';
import { Art } from '../Art';
import { X } from '../../icons';
import { card } from './ui';
import { DAY_SHORT, analyzeProgram, catalogById, parseProgramLine, programDefaultStart, programLine, programLineName, programNext, programWeek, sessionKey } from '../../coach/program';
import { createExerciseWithAi } from '../../ai/exercise';
import { assistText } from '../../lib/assist';
import { makeQuestFromCatalog } from '../../lib/questFactory';
import { getTodayISODate } from '../../lib/dates';
import { aiStatus, callAi } from '../../ai/client';
import { useSpeech } from '../../ai/useSpeech';
import { catalogText, exercisesText } from '../../ai/context';

const field = 'w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white';
const btn = 'px-3 py-2 rounded-xl text-sm font-bold';
let uid = 0;
const newSession = (n, dow = null) => ({ id: `s${Date.now()}${uid++}`, name: `Séance ${String.fromCharCode(65 + n)}`, dow, text: '' });

/**
 * « J'ai déjà un coach » : la personne saisit le programme de son coach (semaine par semaine) ; le coach de l'appli
 * le suit dans l'ordre, puis en propose la suite (voir coach/program.js).
 */
export function CoachProgram({ gameState, setGameState, inSettings = false }) {
  const program = gameState.coach && gameState.coach.program;
  const [editing, setEditing] = useState(false);
  const today = getTodayISODate();
  const next = useMemo(() => (program ? programNext(gameState, today) : null), [gameState.quests, gameState.coach, today]);
  const analysis = useMemo(() => (program && program.weeks && program.weeks.length ? analyzeProgram(program, gameState) : null), [gameState.quests, program]);
  const setProgram = fn => setGameState(prev => ({ ...prev, coach: { ...(prev.coach || {}), program: fn((prev.coach || {}).program) } }));

  if (!program) {
    return (
      <section className={card} data-testid="program-intro">
        <h3 className="font-black text-white"><Art name="clipboard" />Tu as déjà un coach ?</h3>
        <p className="text-sm text-slate-300">Saisis le programme qu’il t’a donné (ou dicte-le) : je le suis séance après séance, puis je te propose la suite dans la même logique.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setEditing(true)} data-testid="program-add" className={`${btn} bg-pink-600 text-white`}>Ajouter le programme de mon coach</button>
          {/* « Non » : l'encadré quitte le haut du Coach et se range dans les réglages */}
          {!inSettings && <button type="button" onClick={() => setGameState(prev => ({ ...prev, coach: { ...(prev.coach || {}), noCoach: true } }))} data-testid="program-no" className={`${btn} bg-slate-800 border border-slate-600 text-slate-100`}>Non, je n’ai pas de coach</button>}
          {inSettings && <button type="button" onClick={() => setGameState(prev => ({ ...prev, coach: { ...(prev.coach || {}), noCoach: false } }))} className="text-xs font-bold text-slate-400 underline">Remettre cet encadré en haut du Coach</button>}
        </div>
        {editing && <ProgramEditor gameState={gameState} setGameState={setGameState} onClose={() => setEditing(false)} />}
      </section>
    );
  }

  const total = program.weeks.length;
  const doneCount = Object.keys(program.log || {}).length;
  const thisWeek = next ? programWeek(program, gameState, next.weekIdx) : null;
  return (
    <section className={card} data-testid="program-card">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-black text-white"><Art name="clipboard" />{program.name || 'Programme de mon coach'}</h3>
          <p className="text-xs text-slate-400">
            {program.paused ? 'En pause : le coach de l’appli reprend la main.'
              : next ? (next.suite ? `Programme terminé (${total} semaine${total > 1 ? 's' : ''}) : suite proposée, semaine ${next.weekIdx + 1}${next.deload ? ' (allégée)' : ''}.` : `Semaine ${next.weekIdx + 1} sur ${total} · ${doneCount} séance${doneCount > 1 ? 's' : ''} faite${doneCount > 1 ? 's' : ''}.`)
                : 'Aucune séance à venir.'}
          </p>
        </div>
        {next && next.suite && <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-bold bg-violet-500/20 text-violet-200 border border-violet-500/40">Suite proposée</span>}
      </div>

      {thisWeek && !program.paused && (
        <div className="space-y-1.5">
          {thisWeek.sessions.map((s, si) => {
            const key = sessionKey(next.weekIdx, si);
            const done = !!(program.log || {})[key];
            const isNext = key === next.key;
            return (
              <div key={key} className={`rounded-xl border px-3 py-2 text-sm ${isNext ? 'border-pink-400/70 bg-slate-950' : 'border-slate-800 bg-slate-950/50'} ${done ? 'opacity-60' : ''}`}>
                <p className="font-bold text-white">{done ? '✓ ' : ''}{s.name}{s.dow ? <span className="text-slate-400 font-normal"> · {DAY_SHORT[s.dow]}</span> : null}{isNext ? <span className="text-pink-300 font-normal"> · prochaine</span> : null}</p>
                <p className="text-xs text-slate-400">{s.exercises.map(e => { const q = gameState.quests.find(x => x.id === e.questId); return q ? `${q.name} ${e.reps.every(r => r === e.reps[0]) ? `${e.reps.length}×${e.reps[0]}` : e.reps.join('-')}${e.load ? ` ${String(e.load).replace('.', ',')} kg` : ''}` : null; }).filter(Boolean).join(' · ')}</p>
              </div>
            );
          })}
        </div>
      )}

      {analysis && (
        <details className="text-sm text-slate-300" data-testid="program-analysis">
          <summary className="text-xs font-bold text-slate-400">Ce que j’ai compris du programme</summary>
          <ul className="mt-2 list-disc pl-5 space-y-1">{analysis.summary.map((t, i) => <li key={i}>{t}</li>)}</ul>
          <p className="mt-2 text-xs text-slate-500">Après la dernière semaine, je continue dans la même logique, sans dépasser de plus de deux marches ta dernière charge réussie. Ce sont des repères, pas un avis médical : ton coach a le dernier mot.</p>
        </details>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setEditing(true)} className={`${btn} bg-slate-800 text-slate-100`} data-testid="program-edit"><Art name="pencil" />Modifier</button>
        {next && !program.paused && <button type="button" onClick={() => setProgram(p => ({ ...p, log: { ...(p.log || {}), [next.key]: 'passée' } }))} className={`${btn} bg-slate-800 text-slate-100`}>Passer cette séance</button>}
        <button type="button" onClick={() => setProgram(p => ({ ...p, paused: !p.paused }))} className={`${btn} bg-slate-800 text-slate-100`}>{program.paused ? 'Reprendre le programme' : 'Mettre en pause'}</button>
        <button type="button" onClick={() => { if (window.confirm('Retirer le programme de ton coach ? Tes séances déjà notées restent dans le journal.')) setProgram(() => undefined); }} className={`${btn} text-rose-300`}>Retirer</button>
      </div>
      {editing && <ProgramEditor gameState={gameState} setGameState={setGameState} onClose={() => setEditing(false)} />}
    </section>
  );
}

/** Saisie du programme : semaines, séances (jour + une ligne par exercice), aperçu de ce qui est reconnu. */
function ProgramEditor({ gameState, setGameState, onClose }) {
  const today = getTodayISODate();
  const old = gameState.coach && gameState.coach.program;
  const byId = Object.fromEntries(gameState.quests.map(q => [q.id, q]));
  const [name, setName] = useState(old ? old.name : '');
  const [startDate, setStartDate] = useState(old ? old.startDate : programDefaultStart(today));
  const [weeks, setWeeks] = useState(() => (old ? old.weeks.map(w => ({ sessions: w.sessions.map(s => ({ id: s.id, name: s.name, dow: s.dow, text: s.exercises.map(e => programLine(e, byId[e.questId])).join('\n') })) })) : [{ sessions: [newSession(0, 1), newSession(1, 4)] }]));
  const [wi, setWi] = useState(0);
  const [err, setErr] = useState('');
  const week = weeks[wi];
  // coach intelligent : le programme collé tel quel (message, tableau…) est converti en lignes que la saisie sait lire
  const aiOn = aiStatus(gameState) === 'ok';
  const [paste, setPaste] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState('');
  const speech = useSpeech(t => setPaste(prev => (prev ? `${prev} ${t}` : t)));
  const readWithAi = async () => {
    if (speech.listening) speech.toggle();
    if (!paste.trim() || aiBusy) return;
    setAiBusy(true);
    setAiNote('');
    setErr('');
    try {
      const data = await callAi('program', { text: paste, context: `Exercices de l'utilisateur (identifiant | nom | muscle | mesure) :\n${exercisesText(gameState, { history: 0 })}`, catalog: catalogText() });
      const ws = (Array.isArray(data && data.weeks) ? data.weeks : []).slice(0, 12)
        .map(w => ({ sessions: (Array.isArray(w.sessions) ? w.sessions : []).slice(0, 7).map((s, i) => ({ ...newSession(i, Number(s.dow) >= 1 && Number(s.dow) <= 7 ? Number(s.dow) : null), name: String(s.name || '').slice(0, 40) || `Séance ${String.fromCharCode(65 + i)}`, text: (Array.isArray(s.lines) ? s.lines : []).map(l => String(l).trim()).filter(Boolean).join('\n') })).filter(s => s.text) }))
        .filter(w => w.sessions.length);
      if (!ws.length) throw new Error('Je n’ai trouvé aucune séance dans ce texte.');
      setWeeks(ws);
      setWi(0);
      if (!name.trim() && data.name) setName(String(data.name).slice(0, 40));
      setAiNote(`C’est lu : ${ws.length} semaine${ws.length > 1 ? 's' : ''}. Vérifie ci-dessous puis enregistre.${data.notes ? ` Non repris : ${data.notes}` : ''}`);
    } catch (e) {
      setAiNote(e.message || 'Le coach intelligent ne répond pas.');
    } finally {
      setAiBusy(false);
    }
  };
  const patchSession = (si, p) => setWeeks(ws => ws.map((w, i) => (i !== wi ? w : { sessions: w.sessions.map((s, j) => (j === si ? { ...s, ...p } : s)) })));
  const copyWeek = () => setWeeks(ws => { const copy = { sessions: ws[ws.length - 1].sessions.map(s => ({ ...s, id: `${s.id}c${uid++}` })) }; setWi(ws.length); return [...ws, copy]; });

  const [saving, setSaving] = useState('');
  // lignes inconnues (« Muscle-up technique ») ou incertaines (« Rowing appui poitrine ») : le coach intelligent trouve l'exercice
  // du catalogue qui correspond, ou le crée (catalogue commun), avant l'enregistrement
  const resolveWithAi = async () => {
    const picks = {};
    const todo = new Map();
    weeks.forEach(w => w.sessions.forEach(sx => sx.text.split('\n').map(l => l.trim()).filter(Boolean).forEach(l => {
      const p = parseProgramLine(l, gameState.quests);
      if (p && (!p.ok || p.uncertain)) { const n = programLineName(l) || l; if (!todo.has(n)) todo.set(n, []); todo.get(n).push(l); }
    })));
    let i = 0;
    for (const [n, ls] of todo) {
      i++;
      setSaving(`Le coach cherche « ${n} » (${i}/${todo.size})…`);
      try {
        const r = await createExerciseWithAi(gameState, `${n} (ligne d'un programme : « ${ls[0]} »)`);
        ls.forEach(l => { picks[l] = r.entry.id; });
      } catch { /* la ligne restera signalée */ }
    }
    setSaving('');
    return picks;
  };
  const save = async () => {
    const picks = aiOn ? await resolveWithAi() : {};
    // chaque ligne : exercice existant, ou exercice du catalogue créé pour l'occasion
    const created = {};
    const newQuests = [];
    const bad = [];
    const parsedWeeks = weeks.map((w, wk) => ({
      sessions: w.sessions.map((s, si) => ({
        id: s.id, name: (s.name || '').trim() || `Séance ${si + 1}`, dow: s.dow ? Number(s.dow) : null,
        exercises: s.text.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
          const p = parseProgramLine(l, [...gameState.quests, ...newQuests], picks[l] ? { pick: picks[l] } : {});
          if (!p || !p.ok) { bad.push(`Semaine ${wk + 1}, ${s.name || `séance ${si + 1}`} : « ${l} »`); return null; }
          let questId = p.questId;
          if (!questId && p.catalogId) {
            if (!created[p.catalogId]) {
              const c = catalogById(p.catalogId);
              if (!c) { bad.push(`« ${l} »`); return null; }
              const { quest } = makeQuestFromCatalog(c, gameState, today, 'ajouté depuis le programme de ton coach');
              created[p.catalogId] = quest.id;
              newQuests.push(quest);
            }
            questId = created[p.catalogId];
          }
          return { questId, sets: p.sets, reps: p.reps, load: p.load, assist: p.assist, rest: null };
        }).filter(Boolean),
      })).filter(s => s.exercises.length),
    })).filter(w => w.sessions.length);
    if (bad.length) { setErr(`Je n’ai pas reconnu : ${bad.slice(0, 4).join(' · ')}${bad.length > 4 ? '…' : ''}. Écris le nom de l’exercice comme dans la liste (ex. « Développé couché 4x8 60kg »).`); return; }
    if (!parsedWeeks.length) { setErr('Ajoute au moins une séance avec un exercice.'); return; }
    setGameState(prev => ({
      ...prev,
      quests: [...newQuests, ...prev.quests],
      coach: { ...(prev.coach || {}), program: { name: name.trim(), startDate, weeks: parsedWeeks, log: old ? old.log || {} : {}, paused: false, createdAt: (old && old.createdAt) || today } },
    }));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex px-4 pt-14 sm:py-4 overflow-y-auto" role="dialog" aria-label="Programme de mon coach">
      <div className="m-auto bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-5 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-white"><Art name="clipboard" size={22} />Programme de mon coach</h3>
            <p className="text-xs text-slate-400">Une ligne par exercice : nom, séries × répétitions, charge. Ex. « Squat 4x8 60kg », « Tractions 3x6 aide 10kg », « Planche 3x45s », « Curl 12 10 8 ».</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="p-2 rounded-lg bg-slate-800 text-slate-400 shrink-0"><X className="w-4 h-4" /></button>
        </div>
        {aiOn && (
          <div className="bg-slate-950 border border-pink-500/40 rounded-xl p-3 space-y-2" data-testid="program-ai">
            <p className="text-sm font-black text-white"><Art name="sparkle" size={18} />Le plus simple : colle ou dicte le programme tel quel</p>
            <p className="text-xs text-slate-400">Message de ton coach, tableau copié, notes, ou dis-le à l’oral (« lundi, squat 4 séries de 8 à 60 kilos… »). Le coach intelligent le range en semaines et en séances.</p>
            <textarea value={paste} onChange={e => setPaste(e.target.value)} rows={4} placeholder={'Lundi : squat 4x8 à 60, développé couché 4x8 à 50…\nJeudi : soulevé de terre 3x5…\n+2,5 kg chaque semaine pendant 4 semaines'} className={field} aria-label="Programme collé tel quel" data-testid="program-paste" />
            <div className="flex gap-2">
              <button type="button" onClick={speech.toggle} data-testid="program-mic" className={`px-4 h-11 rounded-xl flex items-center justify-center gap-1.5 shrink-0 text-sm font-bold text-white ${speech.listening ? 'bg-rose-600 animate-pulse' : 'bg-slate-800'}`}><Art name="mic" size={20} bare />{speech.listening ? 'Stop' : 'Dicter'}</button>
              <button type="button" onClick={readWithAi} disabled={!paste.trim() || aiBusy} data-testid="program-ai-read" className="flex-1 h-11 rounded-xl text-sm font-black bg-pink-600 disabled:bg-slate-800 disabled:text-slate-500 text-white">{aiBusy ? 'Lecture en cours…' : 'Lire le programme'}</button>
            </div>
            {speech.error && <p className="text-xs text-amber-300" role="alert" data-testid="mic-error">{speech.error}</p>}
            {aiNote && <p className="text-xs text-slate-300" data-testid="program-ai-note">{aiNote}</p>}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-bold text-slate-400">Nom (facultatif)<input value={name} onChange={e => setName(e.target.value)} placeholder="Programme de Max" className={field} data-testid="program-name" /></label>
          <label className="text-xs font-bold text-slate-400">Début (lundi)<input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={field} /></label>
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Semaines">
          {weeks.map((_, i) => <button key={i} type="button" onClick={() => setWi(i)} aria-pressed={i === wi} className={`px-3 py-1.5 rounded-full text-xs font-bold ${i === wi ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-300'}`}>Semaine {i + 1}</button>)}
          <button type="button" onClick={copyWeek} data-testid="program-copy-week" className="px-3 py-1.5 rounded-full text-xs font-bold bg-slate-800 text-emerald-300">+ Semaine (copie de la dernière)</button>
          {weeks.length > 1 && <button type="button" onClick={() => { setWeeks(ws => ws.filter((_, i) => i !== wi)); setWi(Math.max(0, wi - 1)); }} className="px-3 py-1.5 rounded-full text-xs font-bold text-rose-300">Supprimer la semaine {wi + 1}</button>}
        </div>
        <p className="text-xs text-slate-500">Saisis seulement ce que ton coach t’a donné : s’il a prévu une progression (charges qui montent, répétitions en plus, semaine allégée), copie la semaine et change les chiffres. Je m’en servirai pour la suite.</p>
        {week.sessions.map((s, si) => {
          const lines = s.text.split('\n').map(l => l.trim()).filter(Boolean);
          const parsed = lines.map(l => parseProgramLine(l, gameState.quests));
          return (
            <div key={s.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2" data-testid="program-session">
              <div className="flex gap-2">
                <input value={s.name} onChange={e => patchSession(si, { name: e.target.value })} className={`${field.replace("w-full ", "")} flex-1 min-w-0`} aria-label="Nom de la séance" />
                <select value={s.dow || ''} onChange={e => patchSession(si, { dow: e.target.value ? Number(e.target.value) : null })} className={`${field.replace("w-full ", "")} w-32 shrink-0`} aria-label="Jour">
                  <option value="">Jour libre</option>
                  {DAY_SHORT.slice(1).map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
                </select>
              </div>
              <textarea value={s.text} onChange={e => patchSession(si, { text: e.target.value })} rows={Math.max(4, lines.length + 1)} placeholder={'Développé couché 4x8 60kg\nTractions 3x6 aide 10kg\nGainage planche 3x45s'} className={`${field} font-mono`} aria-label="Exercices de la séance" data-testid="program-text" />
              {parsed.length > 0 && (
                <ul className="text-xs space-y-0.5">
                  {parsed.map((p, i) => <li key={i} className={p && p.ok && !(p.uncertain && aiOn) ? 'text-emerald-300' : p && !p.ok && !aiOn ? 'text-rose-300' : 'text-amber-300'}>{p && p.ok ? `✓ ${p.name} : ${p.reps.every(r => r === p.reps[0]) ? `${p.sets} × ${p.reps[0]}` : p.reps.join(' - ')}${p.timed ? ' s' : ''}${p.load ? ` à ${p.load} kg` : ''}${p.assist ? `, ${assistText(p.assist)}` : ''}${p.questId ? '' : ' (sera ajouté à tes exercices)'}${p.uncertain && aiOn ? ' — à confirmer par le coach à l’enregistrement' : ''}` : aiOn ? `? « ${p ? p.name || lines[i] : lines[i]} » : le coach le cherchera (ou le créera) à l’enregistrement` : `✗ non reconnu : « ${lines[i]} »`}</li>)}
                </ul>
              )}
              {week.sessions.length > 1 && <button type="button" onClick={() => setWeeks(ws => ws.map((w, i) => (i !== wi ? w : { sessions: w.sessions.filter((_, j) => j !== si) })))} className="text-xs text-rose-300">Supprimer cette séance</button>}
            </div>
          );
        })}
        <button type="button" onClick={() => setWeeks(ws => ws.map((w, i) => (i !== wi ? w : { sessions: [...w.sessions, newSession(w.sessions.length)] })))} className={`${btn} bg-slate-800 text-slate-100 w-full`}>+ Séance</button>
        {err && <p className="text-sm text-rose-300" data-testid="program-error">{err}</p>}
        <div className="sticky bottom-0 -mx-5 -mb-5 px-5 py-3 bg-slate-900 border-t border-slate-800 rounded-b-2xl flex gap-2">
          <button type="button" onClick={onClose} className="px-4 py-3 rounded-xl text-sm font-bold bg-slate-800 text-slate-300">Annuler</button>
          <button type="button" onClick={save} disabled={!!saving} data-testid="program-save" className="flex-1 py-3 rounded-xl text-sm font-black bg-pink-600 disabled:bg-slate-700 text-white">{saving || 'Enregistrer le programme'}</button>
        </div>
      </div>
    </div>
  );
}
