import { useEffect, useRef, useState } from 'react';
import { Art } from '../Art';
import { aiStatus, callAi } from '../../ai/client';
import { applyActions, applyUndo, normalizeActions, undoSnapshot } from '../../ai/actions';
import { createExerciseWithAi } from '../../ai/exercise';
import { catalogText, coachContext, upcomingSessions } from '../../ai/context';
import { formatDayFr } from '../../lib/dates';
import { useSpeech } from '../../ai/useSpeech';
import { getCoachSettings } from '../../coach/settings';
import { getTodayISODate } from '../../lib/dates';
import { cleanText } from '../../edition';

const CHAT_KEY = 'rondoufit:aiChat';
const readChat = () => { try { const a = JSON.parse(localStorage.getItem(CHAT_KEY) || '[]'); return Array.isArray(a) ? a.slice(-30) : []; } catch { return []; } };
const writeChat = a => { try { localStorage.setItem(CHAT_KEY, JSON.stringify(a.slice(-30))); } catch { /* rien */ } };

const CHIPS = [
  ['Règle l’appli pour moi', 'Pose-moi les questions utiles (jours, durée, objectif, sport, matériel, blessures) pour régler l’application à ma place, une question à la fois.'],
  ['Je suis fatigué aujourd’hui', 'Je suis fatigué aujourd’hui, adapte ma séance.'],
  ['Pourquoi cette séance ?', 'Explique-moi simplement ma prochaine séance : pourquoi ces exercices et ces charges ?'],
  ['Bilan de ma semaine', 'Fais-moi le bilan de mes deux dernières semaines et dis-moi quoi changer.'],
  ['Je n’ai que 40 min', 'Je n’ai que 40 minutes pour ma prochaine séance.'],
];

/** Historique envoyé au coach : on lui dit aussi ce que la personne a fait de ses propositions. */
const historyForAi = msgs => msgs.filter(m => !m.error).map(m => ({
  role: m.role,
  content: m.content + (m.actions && m.actions.length ? `\n[Propositions : ${m.actions.map(a => a.label).join(' ; ')} → ${m.status === 'applied' ? 'appliquées' : m.status === 'undone' ? 'appliquées puis annulées' : m.status === 'declined' ? 'refusées' : 'sans réponse'}]` : ''),
}));

/** « Parle à ton coach » : discussion en langage courant avec le coach intelligent, qui peut régler l'appli après accord. */
function CoachChatBody({ gameState, setGameState, overview }) {
  const status = aiStatus(gameState);
  const [msgs, setMsgs] = useState(readChat);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMem, setShowMem] = useState(false);
  const endRef = useRef(null);
  const speech = useSpeech(t => setText(prev => (prev ? `${prev} ${t}` : t)));
  useEffect(() => { writeChat(msgs); }, [msgs]);
  useEffect(() => { if (endRef.current && endRef.current.scrollIntoView && msgs.length) endRef.current.scrollIntoView({ block: 'nearest' }); }, [msgs.length, loading]);

  if (status === 'no_service') return null;
  const today = getTodayISODate();
  const memory = getCoachSettings(gameState).memory || [];

  const card = children => (
    <section data-testid="coach-chat" className="rounded-2xl border border-pink-400/50 bg-gradient-to-br from-pink-500/15 to-violet-500/15 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center shrink-0"><Art name="coach" size={28} bare /></span>
        <div className="min-w-0 flex-1">
          <h3 className="font-black text-white">Parle à ton coach</h3>
        </div>
      </div>
      {children}
    </section>
  );

  if (status === 'no_account') {
    return card(
      <div className="space-y-2">
        <p className="text-xs text-slate-300">Le coach intelligent fonctionne avec ton compte (sauvegarde en ligne).</p>
        <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('rondoufit-account'))} className="w-full py-3 rounded-xl bg-pink-600 text-white text-sm font-black">Me connecter</button>
      </div>
    );
  }
  if (status === 'no_consent') {
    return card(
      <div className="space-y-2">
        <p className="text-xs text-slate-300">Pour te répondre, le coach IA reçoit tes exercices, tes séances récentes et les réglages du coach. Jamais tes photos, ton e-mail, ton mot de passe ni tes notes de pesée. Tu peux le couper quand tu veux.</p>
        <button type="button" data-testid="ai-consent" onClick={() => setGameState(prev => ({ ...prev, aiConsent: true }))} className="w-full py-3 rounded-xl bg-pink-600 text-white text-sm font-black"><Art name="sparkle" size={18} />Activer le coach intelligent</button>
      </div>
    );
  }
  if (status === 'offline') return card(<p className="text-xs text-amber-200">Hors ligne : le coach intelligent revient dès que tu as internet. Le reste de l’appli marche normalement.</p>);

  const send = async raw => {
    const t = String(raw || '').trim();
    if (!t || loading) return;
    if (speech.listening) speech.toggle();
    const next = [...msgs, { role: 'user', content: t }];
    setMsgs(next);
    setText('');
    setLoading(true);
    try {
      const data = await callAi('coach', { messages: historyForAi(next), context: coachContext(gameState, today, { overview }), catalog: catalogText() });
      const actions = normalizeActions(data && data.actions, gameState, today);
      setMsgs(m => [...m, { role: 'assistant', content: String((data && data.reply) || '').trim() || 'D’accord.', actions, status: actions.length ? 'pending' : undefined }]);
    } catch (e) {
      setMsgs(m => [...m, { role: 'assistant', content: e.message || 'Le coach intelligent ne répond pas, réessaie.', error: true }]);
    } finally {
      setLoading(false);
    }
  };
  const decide = async (i, ok) => {
    const m = msgs[i];
    if (!m || m.status !== 'pending') return;
    let actions = m.actions;
    const notes = [];
    // exercice nouveau : le coach le décrit, il rejoint le catalogue commun, puis il est ajouté comme un exercice du catalogue
    if (ok && actions.some(a => a.type === 'create_exercise')) {
      setMsgs(list => list.map((x, j) => (j === i ? { ...x, status: 'working' } : x)));
      const out = [];
      for (const a of actions) {
        if (a.type !== 'create_exercise') { out.push(a); continue; }
        try {
          const r = await createExerciseWithAi(gameState, `${a.args.name}${a.args.details ? ` (${a.args.details})` : ''}`);
          notes.push(r.created ? `« ${r.entry.name} » ajouté au catalogue de tous les utilisateurs.` : `« ${r.entry.name} » existait déjà dans le catalogue.`);
          if (!(gameState.quests || []).some(q => q.catalogId === r.entry.id)) out.push({ type: 'add_exercise', label: `Ajouter « ${r.entry.name} »`, args: { catalogId: r.entry.id } });
        } catch (e) { notes.push(`« ${a.args.name} » : ${e.message || 'pas pu être créé.'}`); }
      }
      actions = out;
    }
    // anciennes valeurs gardées avec le message : « Annuler » les remet
    const undo = ok ? undoSnapshot(gameState, actions) : null;
    if (ok) setGameState(prev => applyActions(prev, actions, getTodayISODate()));
    setMsgs(list => list.map((x, j) => (j === i ? { ...x, actions, status: ok ? 'applied' : 'declined', undo, notes: notes.length ? notes : x.notes } : x)));
  };
  const undoAt = i => {
    const m = msgs[i];
    if (!m || m.status !== 'applied' || !m.undo) return;
    setGameState(prev => applyUndo(prev, m.undo));
    setMsgs(list => list.map((x, j) => (j === i ? { ...x, status: 'undone' } : x)));
  };
  const lastApplied = msgs.reduce((k, m, j) => (m.status === 'applied' && m.undo ? j : k), -1);
  const upcoming = (() => { try { return upcomingSessions(gameState, today, overview, 3); } catch { return []; } })();
  const forget = id => setGameState(prev => ({ ...prev, coach: { ...getCoachSettings(prev), memory: (getCoachSettings(prev).memory || []).filter(x => x.id !== id) } }));
  const shown = msgs.slice(-8);
  const offset = msgs.length - shown.length;

  return card(
    <div className="space-y-3">
      {shown.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1" data-testid="coach-chat-log">
          {shown.map((m, k) => {
            const i = offset + k;
            return (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-pink-600 text-white' : m.error ? 'bg-slate-900 border border-amber-500/40 text-amber-200' : 'bg-slate-900 border border-slate-700 text-slate-100'}`} data-testid={m.role === 'assistant' ? 'coach-chat-reply' : undefined}>
                  {cleanText(m.content)}
                  {m.actions && m.actions.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-700 space-y-1.5" data-testid="coach-chat-actions">
                      <p className="text-xs font-black text-slate-300 uppercase tracking-wide">Je te propose :</p>
                      <ul className="text-xs space-y-1">
                        {m.actions.map((a, j) => <li key={j} className="flex gap-1.5"><Art name={m.status === 'applied' ? 'check' : 'pencil'} size={14} />{cleanText(a.label)}</li>)}
                      </ul>
                      {m.status === 'pending' ? (
                        <div className="flex gap-2 pt-1">
                          <button type="button" data-testid="coach-chat-apply" onClick={() => decide(i, true)} className="flex-1 py-2 rounded-xl bg-pink-600 text-white text-xs font-black">Appliquer</button>
                          <button type="button" onClick={() => decide(i, false)} className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold">Non merci</button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <p className={`text-xs font-bold ${m.status === 'applied' ? 'text-emerald-300' : 'text-slate-500'}`}>{m.status === 'working' ? 'Je crée l’exercice…' : m.status === 'applied' ? 'C’est réglé.' : m.status === 'undone' ? 'Annulé : tout est revenu comme avant.' : 'Rien n’a été changé.'}</p>
                          {(m.notes || []).map((t, k) => <p key={k} className="text-xs text-sky-200" data-testid="coach-chat-note">{t}</p>)}
                          {i === lastApplied && (
                            <>
                              {upcoming.length > 0 && <p className="text-xs text-slate-300" data-testid="coach-chat-upcoming">Prochaines séances : {upcoming.map(d => formatDayFr(d)).join(', ')}</p>}
                              <button type="button" data-testid="coach-chat-undo" onClick={() => undoAt(i)} className="w-full py-2 rounded-xl bg-slate-800 text-slate-100 text-xs font-black"><Art name="undo" size={14} />Annuler ce changement</button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {loading && <p className="text-xs text-sky-300 font-bold animate-pulse"><Art name="sparkle" size={16} />Ton coach réfléchit…</p>}
          <div ref={endRef} />
        </div>
      )}
      {!loading && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
          {CHIPS.map(([label, prompt]) => (
            <button key={label} type="button" onClick={() => send(prompt)} className="shrink-0 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 whitespace-nowrap">{label}</button>
          ))}
        </div>
      )}
      {loading && !shown.length && <p className="text-xs text-sky-300 font-bold animate-pulse"><Art name="sparkle" size={16} />Ton coach réfléchit…</p>}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(text); } }}
        rows={2}
        placeholder="Ex. : je peux venir lundi et jeudi, 45 min ; mon épaule droite tire un peu"
        aria-label="Message à ton coach"
        data-testid="coach-chat-input"
        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-400"
      />
      <div className="flex gap-2">
        {speech.supported && (
          <button type="button" onClick={speech.toggle} data-testid="coach-chat-mic" className={`px-4 h-11 rounded-xl flex items-center justify-center gap-1.5 shrink-0 text-sm font-bold text-white ${speech.listening ? 'bg-rose-600 animate-pulse' : 'bg-slate-800'}`}><Art name="mic" size={20} bare />{speech.listening ? 'Stop' : 'Parler'}</button>
        )}
        <button type="button" onClick={() => send(text)} disabled={!text.trim() || loading} data-testid="coach-chat-send" className="flex-1 h-11 rounded-xl bg-pink-600 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-black">Envoyer</button>
      </div>
      {speech.error && <p className="text-xs text-amber-300" role="alert" data-testid="mic-error">{speech.error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <button type="button" onClick={() => setShowMem(v => !v)} className="text-slate-400 font-bold underline-offset-2 hover:underline">Ce que je retiens de toi ({memory.length})</button>
        <div className="flex gap-3">
          {msgs.length > 0 && <button type="button" onClick={() => setMsgs([])} className="text-slate-500 hover:text-slate-300">Effacer la discussion</button>}
          <button type="button" onClick={() => { if (window.confirm('Couper le coach intelligent ? Plus rien ne lui sera envoyé.')) setGameState(prev => ({ ...prev, aiConsent: false })); }} className="text-slate-500 hover:text-slate-300">Couper</button>
        </div>
      </div>
      {showMem && (
        <ul className="text-xs space-y-1 bg-slate-950 border border-slate-800 rounded-xl p-3" data-testid="coach-memory">
          {memory.length === 0 && <li className="text-slate-500">Rien pour l’instant : parle-lui de tes contraintes (blessure, matériel, horaires), il s’en souviendra.</li>}
          {memory.map(m => (
            <li key={m.id} className="flex items-start justify-between gap-2 text-slate-200">
              <span>{cleanText(m.text)}</span>
              <button type="button" onClick={() => forget(m.id)} aria-label="Oublier" className="text-slate-500 hover:text-rose-300 font-bold tap-free px-1">✕</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// « Parle à ton coach » : un simple bouton ; la discussion s'ouvre dans une fenêtre (gardée sur l'appareil entre deux ouvertures).
export function CoachChat(props) {
  const [open, setOpen] = useState(false);
  if (aiStatus(props.gameState) === 'no_service') return null;
  return (
    <>
      {props.compact ? (
        <button type="button" onClick={() => setOpen(true)} data-testid="coach-chat-open" aria-label="Parle à ton coach"
          className="tap-free flex-1 min-w-0 py-2.5 px-3 rounded-xl border border-pink-400/50 bg-slate-900 text-xs font-black text-white truncate">
          <Art name="coach" size={16} />Discuter
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} data-testid="coach-chat-open"
          className={`w-full flex items-center gap-3 rounded-2xl border border-pink-400/50 bg-slate-900 px-4 text-left ${props.slim ? 'py-1.5' : 'py-3'}`}>
          <span className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0"><Art name="coach" size={26} bare /></span>
          <span className="flex-1 font-black text-white">Parle à ton coach</span>
          <span className="text-slate-400 font-black">›</span>
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-[60] bg-slate-950/85 backdrop-blur-sm flex items-start justify-center px-3 pt-14 pb-4 overflow-y-auto" onClick={() => setOpen(false)}>
          <div className="relative w-full max-w-xl" onClick={e => e.stopPropagation()} role="dialog" aria-label="Parle à ton coach">
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="absolute -top-11 right-0 w-9 h-9 rounded-lg bg-slate-800 text-slate-300 font-black">✕</button>
            <CoachChatBody {...props} />
          </div>
        </div>
      )}
    </>
  );
}
