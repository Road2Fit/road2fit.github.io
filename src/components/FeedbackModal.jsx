import { useState } from 'react';
import { SUPABASE } from '../config';
import { feedback } from '../sync/supabase';
import { APP_VERSION } from '../lib/updateCheck';
import { deviceLabel } from '../lib/errorReport';

// « Signaler un problème / une idée » (4.47, phase « 10 testeurs ») : ligne dans la table Supabase `feedback`
// (docs/supabase-phase1.sql), lue par le créateur de l'appli. Il faut un compte connecté (évite le spam anonyme).
const KINDS = [['bug', 'Un problème'], ['idee', 'Une idée'], ['autre', 'Autre']];

export function FeedbackModal({ onClose, loggedIn, screen = '' }) {
  const [kind, setKind] = useState('bug');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const send = async () => {
    setBusy(true); setMsg(null);
    try {
      await feedback.send(SUPABASE, { kind, message: text.trim(), appVersion: APP_VERSION, device: deviceLabel(), screen });
      setMsg({ ok: true, text: 'Merci ! C’est bien reçu.' });
      setText('');
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[85] bg-black/70 overflow-y-auto" onClick={onClose} style={{ margin: 0 }}>
      <div className="min-h-full flex items-end sm:items-center justify-center p-3">
        <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-4 space-y-3" onClick={e => e.stopPropagation()} role="dialog" aria-label="Signaler un problème ou une idée" data-testid="feedback-modal">
          <div className="flex items-center gap-2">
            <h2 className="flex-1 text-lg font-black text-white">Signaler un problème / une idée</h2>
            <button type="button" onClick={onClose} aria-label="Fermer" data-testid="feedback-close" className="nav-btn">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
            </button>
          </div>
          {!loggedIn ? (
            <p className="text-sm text-slate-300" data-testid="feedback-need-account">Pour envoyer un message, connecte-toi à ton compte (Réglages → Mon compte et ma sauvegarde).</p>
          ) : (<>
            <div className="flex gap-1.5">
              {KINDS.map(([id, label]) => (
                <button key={id} type="button" onClick={() => setKind(id)} aria-pressed={kind === id} data-testid={`feedback-kind-${id}`}
                  className={`flex-1 px-2 py-2 rounded-xl text-xs font-black border ${kind === id ? 'bg-pink-600 border-pink-400 text-white' : 'bg-slate-950 border-slate-700 text-slate-300'}`}>{label}</button>
              ))}
            </div>
            <textarea value={text} onChange={e => setText(e.target.value)} maxLength={2000} rows={6} data-testid="feedback-text"
              placeholder={kind === 'bug' ? 'Ce qui s’est passé, sur quel écran, ce que tu attendais…' : 'Ton idée, ce qui te manque, ce qui te gêne…'}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white" />
            <p className="text-[11px] text-slate-500">La version de l’appli et le type de téléphone sont joints pour aider à corriger. N’écris pas d’informations personnelles inutiles.</p>
            <button type="button" disabled={busy || text.trim().length < 3} onClick={send} data-testid="feedback-send" className="w-full py-2.5 rounded-xl bg-pink-600 text-white text-sm font-black disabled:opacity-40">{busy ? '…' : 'Envoyer'}</button>
          </>)}
          {msg && <p className={`text-sm font-bold ${msg.ok ? 'text-emerald-300' : 'text-rose-300'}`} data-testid="feedback-msg">{msg.text}</p>}
        </div>
      </div>
    </div>
  );
}
