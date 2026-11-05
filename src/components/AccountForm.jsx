import { useState } from 'react';
import * as supabase from '../sync/supabase';
import { SUPABASE } from '../config';

const field = 'w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-bold text-white placeholder:text-slate-600';
const label = 'block text-xs font-bold text-slate-400 mb-1';
const btn = 'px-4 py-2.5 rounded-xl text-sm font-black disabled:bg-slate-800 disabled:text-slate-400';

/**
 * Compte de l'application : créer un compte, se connecter, mot de passe oublié, se déconnecter.
 * `sync` = retour de useCloudSync (signUp, signIn, signOut, user, status…). `recovery` = jeton temporaire issu du lien « mot de passe oublié ».
 */
export function AccountForm({ sync, recovery = null, onDone }) {
  const [mode, setMode] = useState(recovery ? 'reset-new' : 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [invite, setInvite] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }
  const run = async fn => {
    setBusy(true);
    setMsg(null);
    try { await fn(); } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }); } finally { setBusy(false); }
  };

  if (sync.user) {
    const status = sync.status === 'synced' ? 'Sauvegarde automatique activée.' : sync.status === 'error' ? `${sync.error || 'Synchronisation impossible.'}` : 'Synchronisation en cours…';
    return (
      <div className="space-y-3" data-testid="account-connected">
        <p className="text-sm text-slate-300">Connecté : <strong className="text-white" data-testid="account-email">{sync.user.email}</strong></p>
        <p className={`text-sm font-bold ${sync.status === 'synced' ? 'text-emerald-300' : 'text-amber-300'}`} data-testid="account-status">{status}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => run(async () => { await sync.signOut(); setMsg({ ok: true, text: 'Déconnecté. Tes données restent sur ce téléphone.' }); })} className={`${btn} bg-slate-800 border border-slate-600 text-white`} data-testid="account-signout">Me déconnecter</button>
          {onDone && <button type="button" onClick={onDone} className={`${btn} bg-sky-600 text-white`}>OK</button>}
        </div>
        {msg && <p className={`text-sm font-bold ${msg.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{msg.text}</p>}
        <Versions sync={sync} />
      </div>
    );
  }

  const tooShort = password.length < 6;
  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());

  if (mode === 'reset-new') {
    const mismatch = password !== password2;
    return (
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); run(async () => { await supabase.updatePassword(SUPABASE, recovery, password); setMsg({ ok: true, text: 'Mot de passe changé. Connecte-toi avec le nouveau.' }); setPassword(''); setPassword2(''); setMode('signin'); }); }} data-testid="account-reset-new">
        <h3 className="text-base font-black text-white">Nouveau mot de passe</h3>
        <div><label className={label} htmlFor="acc-pw">Nouveau mot de passe</label><input id="acc-pw" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className={field} /></div>
        <div><label className={label} htmlFor="acc-pw2">Encore une fois</label><input id="acc-pw2" type="password" autoComplete="new-password" value={password2} onChange={e => setPassword2(e.target.value)} className={field} /></div>
        <button type="submit" disabled={busy || tooShort || mismatch} className={`${btn} bg-sky-600 text-white`}>Changer le mot de passe</button>
        {msg && <p className={`text-sm font-bold ${msg.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{msg.text}</p>}
      </form>
    );
  }

  if (mode === 'forgot') {
    return (
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); run(async () => { await supabase.requestPasswordReset(SUPABASE, email.trim(), window.location.origin + window.location.pathname); setMsg({ ok: true, text: 'Si un compte existe, un e-mail avec un lien vient de partir (vérifie les courriers indésirables).' }); }); }} data-testid="account-forgot">
        <h3 className="text-base font-black text-white">Mot de passe oublié</h3>
        <div><label className={label} htmlFor="acc-email">Ton e-mail</label><input id="acc-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={field} /></div>
        <div className="flex gap-2"><button type="submit" disabled={busy || !validEmail} className={`${btn} bg-sky-600 text-white`}>Envoyer le lien</button><button type="button" onClick={() => { setMode('signin'); setMsg(null); }} className={`${btn} bg-slate-800 text-white`}>Retour</button></div>
        {msg && <p className={`text-sm font-bold ${msg.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{msg.text}</p>}
      </form>
    );
  }

  const signup = mode === 'signup';
  const submit = e => {
    e.preventDefault();
    run(async () => {
      if (signup) {
        const r = await sync.signUp(email, password, invite);
        if (r.needsConfirmation) setMsg({ ok: true, text: 'Compte créé. Ouvre l’e-mail de confirmation reçu, puis reviens te connecter ici.' }), setMode('signin');
      } else {
        await sync.signIn(email, password);
      }
    });
  };
  return (
    <form className="space-y-3" onSubmit={submit} data-testid={signup ? 'account-signup' : 'account-signin'}>
      <div className="flex gap-2">
        <button type="button" onClick={() => { setMode('signup'); setMsg(null); }} aria-pressed={signup} data-testid="tab-signup" className={`flex-1 px-3 py-2 rounded-xl border text-sm font-bold ${signup ? 'bg-sky-600 border-sky-400 text-white' : 'bg-slate-950 border-slate-700 text-slate-300'}`}>Créer un compte</button>
        <button type="button" onClick={() => { setMode('signin'); setMsg(null); }} aria-pressed={!signup} data-testid="tab-signin" className={`flex-1 px-3 py-2 rounded-xl border text-sm font-bold ${!signup ? 'bg-sky-600 border-sky-400 text-white' : 'bg-slate-950 border-slate-700 text-slate-300'}`}>J’ai déjà un compte</button>
      </div>
      <div><label className={label} htmlFor="acc-email">E-mail</label><input id="acc-email" type="email" autoComplete="email" autoCapitalize="none" value={email} onChange={e => setEmail(e.target.value)} className={field} placeholder="toi@exemple.fr" data-testid="acc-email" /></div>
      <div><label className={label} htmlFor="acc-pw">Mot de passe {signup && <span className="font-normal text-slate-500">(6 caractères minimum, mieux : une phrase)</span>}</label><input id="acc-pw" type="password" autoComplete={signup ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} className={field} data-testid="acc-password" /></div>
      {signup && <div><label className={label} htmlFor="acc-invite">Code d’invitation (donné par Gabin)</label><input id="acc-invite" value={invite} onChange={e => setInvite(e.target.value)} autoCapitalize="none" autoCorrect="off" className={field} data-testid="acc-invite" /></div>}
      <button type="submit" disabled={busy || !validEmail || tooShort || (signup && !invite.trim())} data-testid="acc-submit" className={`${btn} bg-sky-600 text-white w-full`}>{busy ? '…' : signup ? 'Créer mon compte' : 'Me connecter'}</button>
      {!signup && <button type="button" onClick={() => { setMode('forgot'); setMsg(null); }} className="text-xs font-bold text-sky-300 underline">Mot de passe oublié ?</button>}
      {msg && <p className={`text-sm font-bold ${msg.ok ? 'text-emerald-300' : 'text-rose-300'}`} data-testid="acc-msg">{msg.text}</p>}
      {sync.needsLogin && <p className="text-sm font-bold text-amber-300">Ta session a expiré : reconnecte-toi.</p>}
    </form>
  );
}

/** Lien « mot de passe oublié » : l'adresse contient un jeton temporaire (#access_token=…&type=recovery). */
export function readRecoveryToken() {
  try {
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (h.get('type') === 'recovery' && h.get('access_token')) return h.get('access_token');
  } catch { /* rien */ }
  return null;
}

const fmt = iso => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

/** Versions précédentes de la sauvegarde (copies automatiques du serveur, protégées contre la suppression). */
function Versions({ sync }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    setBusy(true);
    setMsg(null);
    try { setList(await sync.listVersions()); } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }); } finally { setBusy(false); }
  };
  return (
    <div className="border-t border-slate-800 pt-3 space-y-2" data-testid="versions">
      <button type="button" onClick={() => { const o = !open; setOpen(o); if (o && !list) load(); }} className="text-xs font-bold text-sky-300 underline" data-testid="versions-toggle">{open ? 'Masquer les versions précédentes' : 'Versions précédentes de ma sauvegarde'}</button>
      {open && (
        <div className="space-y-1.5">
          {busy && <p className="text-xs text-slate-400">Chargement…</p>}
          {list && list.length === 0 && <p className="text-xs text-slate-400">Aucune version précédente pour l’instant (la première apparaît après ta prochaine modification).</p>}
          {(list || []).map(v => (
            <div key={v.id} className="flex items-center justify-between gap-2 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs">
              <span className="text-slate-200">{fmt(v.saved_at)}</span>
              <button type="button" disabled={busy} onClick={async () => { if (!window.confirm('Remplacer tes données actuelles par cette version ?')) return; setBusy(true); try { await sync.restoreVersion(v.id); setMsg({ ok: true, text: 'Version restaurée. Elle est maintenant sauvegardée.' }); } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }); } finally { setBusy(false); } }} className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-600 text-white font-bold disabled:opacity-50" data-testid={`restore-${v.id}`}>Restaurer</button>
            </div>
          ))}
          {msg && <p className={`text-xs font-bold ${msg.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{msg.text}</p>}
        </div>
      )}
    </div>
  );
}
