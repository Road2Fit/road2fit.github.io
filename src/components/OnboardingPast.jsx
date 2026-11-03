import { useState } from 'react';
import { Art } from './Art';
import { AccountForm } from './AccountForm';
import { aiHistory, normalizeHistory } from '../ai/history';
import { useSpeech } from '../ai/useSpeech';
import { isAccountConnected } from '../sync/storage';
import { getTodayISODate } from '../lib/dates';

/**
 * Assistant d'accueil (niveau avancé ou expert) : « Raconte ton passé », en complément ou à la place de la liste.
 * Le récit (dit à l'oral ou écrit) est lu par le coach intelligent, qui REMPLIT les réponses de l'assistant
 * (exercices, meilleures séries, séance type, ancienneté, arrêt, blessures) : la personne vérifie ensuite.
 * Le coach intelligent demande un compte : il peut être créé ici même.
 */
export function OnboardingPast({ sync, weightKg, onConsent, onResult }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');
  const speech = useSpeech(t => setText(prev => (prev ? `${prev} ${t}` : t)));
  const connected = isAccountConnected() && sync.configured;

  const send = async () => {
    if (speech.listening) speech.toggle();
    if (text.trim().length < 10) { setErr('Raconte un peu plus : depuis quand tu t’entraînes, tes exercices, tes charges…'); return; }
    setBusy(true); setErr(''); setDone('');
    onConsent(); // envoyer son récit au coach intelligent = l'activer
    const today = getTodayISODate();
    const st = { quests: [], weightHistory: [], userWeightKg: Number(weightKg) || 0, aiConsent: true };
    try {
      const h = normalizeHistory(await aiHistory(st, text, today), st, today);
      const n = onResult(h);
      setDone(`${h.summary ? `${h.summary} ` : ''}J’ai rempli ${n} exercice(s) ci-dessous${h.years || h.limits ? ' et ta fiche' : ''} : vérifie et corrige si besoin.${h.rows.some(r => r.status === 'unknown') ? ` Pas reconnu : ${h.rows.filter(r => r.status === 'unknown').map(r => r.name).join(', ')}.` : ''}${h.unclear ? ` Pas compris : ${h.unclear}` : ''}`);
      setText('');
    } catch (e) {
      setErr(e.message || 'Le coach intelligent ne répond pas pour le moment. Remplis la liste ci-dessous.');
    }
    setBusy(false);
  };

  return (
    <div className="rounded-xl border border-sky-500/50 bg-sky-950/20 p-3 space-y-2" data-testid="ob-past">
      <h3 className="text-sm font-black text-white"><Art name="mic" />Raconte ton passé (le plus simple)</h3>
      <p className="text-xs text-slate-300">Dis avec tes mots ce que tu as fait en musculation : depuis quand, tes exercices, tes meilleures charges, ta séance habituelle, une pause, une blessure. Le coach remplit la liste à ta place ; tu peux aussi la remplir toi-même, ou les deux.</p>
      {!connected ? (
        <div className="space-y-2">
          <p className="text-xs text-slate-400">Pour que le coach lise ton récit, il faut ton compte (il sert aussi à sauvegarder tes données) :</p>
          <AccountForm sync={sync} />
        </div>
      ) : (
        <>
          <textarea rows={4} value={text} onChange={e => setText(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600" placeholder="Ex : muscu depuis 5 ans, 4 fois par semaine. Développé couché : 100 kg pour 3. Squat : 4 séries de 6 à 120. Arrêt de 2 mois cet été, épaule fragile." data-testid="ob-past-text" />
          <div className="flex gap-2">
            {speech.supported && (
              <button type="button" onClick={speech.toggle} className={`px-4 h-11 rounded-xl flex items-center justify-center gap-1.5 shrink-0 text-sm font-bold text-white ${speech.listening ? 'bg-rose-600 animate-pulse' : 'bg-slate-800'}`}><Art name="mic" size={20} bare />{speech.listening ? 'Stop' : 'Parler'}</button>
            )}
            <button type="button" onClick={send} disabled={busy} className="flex-1 h-11 rounded-xl bg-sky-600 disabled:bg-slate-800 text-white text-sm font-black" data-testid="ob-past-send">{busy ? 'Le coach lit…' : 'Envoyer au coach'}</button>
          </div>
          {speech.error && <p className="text-xs text-amber-300" role="alert" data-testid="mic-error">{speech.error}</p>}
          <p className="text-[11px] text-slate-500">Ton récit est lu par le coach intelligent (le modèle Claude, d’Anthropic). Jamais tes photos, ton e-mail ni ton mot de passe.</p>
        </>
      )}
      {err && <p className="text-xs text-rose-300">{err}</p>}
      {done && <p className="text-xs text-emerald-300" data-testid="ob-past-done">{done}</p>}
    </div>
  );
}
