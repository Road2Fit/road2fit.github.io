import { useState } from 'react';
import { Art } from '../Art';
import { aiStatus } from '../../ai/client';
import { aiHistory, applyHistory, historyRowText, normalizeHistory } from '../../ai/history';
import { useSpeech } from '../../ai/useSpeech';
import { LEVELS } from '../../coach/experience';
import { METHODS } from '../../coach/methods';
import { getTodayISODate } from '../../lib/dates';

/**
 * « Raconte ton passé » : la personne raconte à l'oral (ou écrit) ce qu'elle a fait en musculation ; le coach intelligent
 * en tire niveau, ancienneté, arrêt, blessures, exercices et records ; rien ne change avant « Appliquer ».
 */
export function CoachPast({ gameState, setGameState }) {
  const status = aiStatus(gameState);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [preview, setPreview] = useState(null);
  const [done, setDone] = useState('');
  const speech = useSpeech(t => setText(prev => (prev ? `${prev} ${t}` : t)));

  const send = async () => {
    if (speech.listening) speech.toggle();
    if (text.trim().length < 10) { setErr('Raconte un peu plus : depuis quand tu t’entraînes, tes exercices, tes charges…'); return; }
    setBusy(true); setErr(''); setDone('');
    const today = getTodayISODate();
    try {
      setPreview(normalizeHistory(await aiHistory(gameState, text, today), gameState, today));
    } catch (e) {
      setErr(e.message || 'Le coach intelligent ne répond pas pour le moment.');
    }
    setBusy(false);
  };
  const apply = () => {
    const today = getTodayISODate();
    const h = preview;
    setGameState(prev => applyHistory(prev, h, today));
    const nNew = h.rows.filter(r => r.status === 'new').length;
    const nOld = h.rows.filter(r => r.status === 'existing').length;
    setDone(`C’est noté${h.level ? ` (niveau ${(LEVELS.find(l => l.id === h.level) || {}).label.toLowerCase()})` : ''} : ${nNew} exercice(s) ajouté(s), ${nOld} exercice(s) mis à jour. Tout reste modifiable.`);
    setPreview(null); setText('');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs" data-testid="coach-past">
      <h3 className="text-sm font-black text-white"><Art name="mic" />Raconte ton passé</h3>
      <p className="text-slate-400">Dis au coach, avec tes mots, ce que tu as fait en musculation : depuis quand, tes exercices, tes meilleures charges, ta séance habituelle, une pause, une blessure… Il remplit ton niveau, tes exercices et tes records.</p>
      {status === 'no_account' || status === 'no_service' ? (
        <p className="text-slate-400">Il faut un compte connecté pour utiliser le coach intelligent.{status === 'no_account' && <> <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('rondoufit-account'))} className="underline font-bold text-sky-300">Me connecter</button></>}</p>
      ) : status === 'no_consent' ? (
        <p className="text-slate-400">Active d’abord le coach intelligent, en haut de l’onglet Coach.</p>
      ) : status === 'offline' ? (
        <p className="text-slate-400">Pas de connexion internet pour le moment.</p>
      ) : preview ? (
        <div className="space-y-2" data-testid="past-preview">
          {preview.summary && <p className="text-slate-200">{preview.summary}</p>}
          <ul className="space-y-1 text-slate-300">
            {preview.level && <li>Niveau : <strong>{(LEVELS.find(l => l.id === preview.level) || {}).label}</strong>{preview.years ? `, ${preview.years} an(s) de pratique` : ''}{preview.breakMonths ? `, arrêt d’environ ${preview.breakMonths} mois` : ''}</li>}
            {preview.weeklySets > 0 && <li>{preview.weeklySets} séries par muscle et par semaine</li>}
            {preview.methods.length > 0 && <li>Formes connues : {preview.methods.map(m => METHODS[m].label).join(', ')}</li>}
            {preview.limits && <li>À ménager : {preview.limits}</li>}
            {preview.rows.map((r, i) => (
              <li key={i} data-testid="past-row">
                <strong>{r.name}</strong> {r.status === 'new' ? '(nouvel exercice)' : r.status === 'existing' ? '(déjà suivi)' : '(pas reconnu, ignoré)'}{historyRowText(r) ? ` : ${historyRowText(r)}` : ''}
              </li>
            ))}
          </ul>
          {preview.unclear && <p className="text-amber-300">Pas compris : {preview.unclear}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={apply} className="flex-1 px-3 py-2 rounded-lg bg-pink-600 text-white font-black" data-testid="past-apply">Appliquer</button>
            <button type="button" onClick={() => setPreview(null)} className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white font-bold">Corriger</button>
          </div>
        </div>
      ) : (
        <>
          <textarea rows={4} value={text} onChange={e => setText(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600" placeholder="Ex : je fais de la muscu depuis 5 ans, 4 fois par semaine. Au développé couché je monte à 100 kg pour 3, au squat 4 séries de 6 à 120. J’ai arrêté 2 mois cet été, et j’ai une épaule fragile." data-testid="past-text" />
          <div className="flex gap-2">
            {speech.supported && (
              <button type="button" onClick={speech.toggle} data-testid="past-mic" className={`px-4 h-11 rounded-xl flex items-center justify-center gap-1.5 shrink-0 text-sm font-bold text-white ${speech.listening ? 'bg-rose-600 animate-pulse' : 'bg-slate-800'}`}><Art name="mic" size={20} bare />{speech.listening ? 'Stop' : 'Parler'}</button>
            )}
            <button type="button" onClick={send} disabled={busy} className="flex-1 h-11 rounded-xl bg-pink-600 disabled:bg-slate-800 text-white text-sm font-black" data-testid="past-send">{busy ? 'Le coach lit…' : 'Envoyer au coach'}</button>
          </div>
          {speech.error && <p className="text-xs text-amber-300" role="alert" data-testid="mic-error">{speech.error}</p>}
        </>
      )}
      {err && <p className="text-rose-300">{err}</p>}
      {done && <p className="text-emerald-300" data-testid="past-done">{done}</p>}
    </div>
  );
}
