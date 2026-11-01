import { useMemo, useState } from 'react';
import { cleanText } from '../edition';
import { RPG_RANKS } from '../data/gamification';
import { FRIEND_CODE_LENGTH, normalizeFriendCode } from '../sync/supabase';

const card = 'bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3';
const chip = 'px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200';
const dateFr = iso => {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
};
const nameOf = f => cleanText((f.summary && f.summary.name) || '') || 'Ami sans prénom';
// Rang de l'ami lu avec les noms de MON édition (son profil ne contient que la position du rang)
const rankOf = f => {
  const r = f.summary && Number.isInteger(f.summary.rank) ? RPG_RANKS[f.summary.rank] : null;
  return r ? `${r.badge} ${r.title}` : '';
};

// Onglet « Amis » : mon code à 7 caractères, ajouter un ami avec le sien, consulter son profil (dernière séance, maxima, exercices).
export function FriendsTab({ friends, onOpenAccount }) {
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [copied, setCopied] = useState(false);
  const current = useMemo(() => friends.list.find(f => f.user_id === openId) || null, [friends.list, openId]);

  if (!friends.available) {
    return (
      <section className={card} data-testid="friends-offline">
        <h3 className="font-black text-white">👥 Amis</h3>
        <p className="text-sm text-slate-300">Pour ajouter des amis et partager ton profil, connecte-toi à ton compte : ton code d’ami est lié à ton compte.</p>
        <button type="button" onClick={onOpenAccount} className="px-4 py-2 rounded-xl bg-pink-600 text-white text-sm font-black">Ouvrir mon compte</button>
      </section>
    );
  }

  if (!friends.enabled) {
    return (
      <section className={card} data-testid="friends-intro">
        <h3 className="font-black text-white">👥 Amis</h3>
        <p className="text-sm text-slate-300">Reçois un code à 7 caractères à donner à tes amis. Celui qui le saisit peut voir ton profil : prénom ou pseudo, rang, niveau, dernière séance, maxima et liste d’exercices.</p>
        <p className="text-xs text-slate-400">Jamais ton poids, tes photos ni tes notes. Tu peux couper le partage ou changer de code quand tu veux. Rien n’est partagé tant que tu n’as pas activé.</p>
        <button type="button" data-testid="friends-enable" onClick={friends.enable} className="px-4 py-2 rounded-xl bg-pink-600 text-white text-sm font-black">Activer les amis</button>
      </section>
    );
  }

  const copy = async () => {
    try { await navigator.clipboard.writeText(friends.code); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setMsg({ ok: false, text: 'Copie impossible : recopie le code à la main.' }); }
  };
  const submit = async e => {
    e.preventDefault();
    const c = normalizeFriendCode(input);
    if (c.length !== FRIEND_CODE_LENGTH) { setMsg({ ok: false, text: `Le code fait ${FRIEND_CODE_LENGTH} caractères.` }); return; }
    setBusy(true);
    const r = await friends.addFriend(c);
    setBusy(false);
    if (r.ok) { setInput(''); setMsg({ ok: true, text: 'Ami ajouté !' }); } else setMsg({ ok: false, text: r.message });
  };

  if (current) return <FriendProfile friend={current} onBack={() => setOpenId(null)} onRemove={async () => { if (window.confirm('Retirer cet ami de ta liste ? (Tu pourras le rajouter avec son code.)')) { await friends.removeFriend(current.user_id); setOpenId(null); } }} />;

  return (
    <div className="space-y-4" data-testid="friends-tab">
      <section className={card}>
        <h3 className="font-black text-white">👥 Mon code d’ami</h3>
        <p className="text-xs text-slate-400">Donne ce code à quelqu’un : s’il le saisit, il pourra voir ton profil (prénom ou pseudo, rang, niveau, dernière séance, maxima, exercices). Jamais ton poids, tes photos ni tes notes.</p>
        <div className="flex items-center gap-3 flex-wrap">
          <span data-testid="my-code" className="font-mono text-3xl font-black tracking-[0.3em] text-pink-300 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2">{friends.code || '·······'}</span>
          <button type="button" onClick={copy} disabled={!friends.code} className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-600 text-sm font-bold text-white">{copied ? '✓ Copié' : '📋 Copier'}</button>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
          <input type="checkbox" data-testid="share-toggle" checked={friends.share} onChange={e => friends.setShare(e.target.checked)} className="w-4 h-4" />
          Partager mon profil avec ceux qui ont mon code
        </label>
        <button type="button" data-testid="regen-code" onClick={async () => { if (window.confirm('Changer ton code ? L’ancien ne marchera plus ET tous ceux qui t’avaient ajouté ne verront plus ton profil.')) { const ok = await friends.regenerateCode(); setMsg(ok ? { ok: true, text: 'Nouveau code créé.' } : { ok: false, text: 'Impossible de changer le code.' }); } }} className="text-xs underline text-slate-400">
          Changer mon code (retire aussi ceux qui l’avaient)
        </button>
      </section>

      <section className={card}>
        <h3 className="font-black text-white">➕ Ajouter un ami</h3>
        <form onSubmit={submit} className="flex gap-2">
          <input
            data-testid="friend-input"
            value={input}
            onChange={e => setInput(normalizeFriendCode(e.target.value).slice(0, FRIEND_CODE_LENGTH))}
            placeholder="Code à 7 caractères"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            aria-label="Code de ton ami"
            className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 font-mono text-lg tracking-[0.25em] text-white uppercase"
          />
          <button type="submit" disabled={busy || input.length !== FRIEND_CODE_LENGTH} data-testid="friend-add" className="px-4 py-2 rounded-xl bg-pink-600 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-black">Ajouter</button>
        </form>
        {msg && <p data-testid="friend-msg" className={`text-xs ${msg.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{msg.text}</p>}
        {friends.error && <p className="text-xs text-amber-300" data-testid="friends-error">{friends.error}</p>}
      </section>

      <section className={card}>
        <div className="flex items-center justify-between">
          <h3 className="font-black text-white">🤝 Mes amis ({friends.list.length})</h3>
          <button type="button" onClick={friends.refresh} className="text-xs underline text-slate-400">{friends.loading ? 'Mise à jour…' : 'Actualiser'}</button>
        </div>
        {friends.list.length === 0 && <p className="text-sm text-slate-400">Pas encore d’ami. Saisis le code d’un ami ci-dessus, ou donne-lui le tien.</p>}
        <div className="space-y-2">
          {friends.list.map(f => {
            const s = f.summary || {};
            return (
              <button key={f.user_id} type="button" onClick={() => setOpenId(f.user_id)} data-testid={`friend-${f.user_id}`} className="w-full text-left bg-slate-950 border border-slate-800 hover:border-slate-600 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-black text-white truncate">{nameOf(f)}{rankOf(f) && <span data-testid="friend-rank" className="ml-1.5 text-pink-300">{rankOf(f)}</span>}</div>
                  <div className="text-xs text-slate-400">{s.lastSession ? `Dernière séance : ${dateFr(s.lastSession.date)}` : 'Pas encore de séance'}</div>
                </div>
                <div className="flex gap-1.5 shrink-0"><span className={chip}>Niv. {s.level || 1}</span>{s.streak > 0 && <span className={chip}>🔥 {s.streak} j</span>}</div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function FriendProfile({ friend, onBack, onRemove }) {
  const s = friend.summary || {};
  const byMuscle = {};
  (s.exercises || []).forEach(x => { (byMuscle[x.muscle || 'Autre'] = byMuscle[x.muscle || 'Autre'] || []).push(x); });
  return (
    <div className="space-y-4" data-testid="friend-profile">
      <button type="button" onClick={onBack} className="text-sm font-bold text-slate-300">← Mes amis</button>
      <section className={card}>
        <h3 className="text-xl font-black text-white">{nameOf(friend)}{rankOf(friend) && <span data-testid="friend-profile-rank" className="ml-2 text-base text-pink-300">{rankOf(friend)}</span>}</h3>
        <div className="flex flex-wrap gap-1.5">
          <span className={chip}>Niveau {s.level || 1}</span>
          <span className={chip}>🔥 Série : {s.streak || 0} j</span>
          <span className={chip}>📅 {s.sessionDays || 0} jour(s) d’entraînement</span>
          <span className={chip}>Cette semaine : {s.weekDays || 0} jour(s)</span>
          {s.sport && <span className={chip}>🏅 {cleanText(s.sport)}</span>}
          <span className={chip}>{(s.exercises || []).length} exercice(s)</span>
        </div>
        <p className="text-xs text-slate-500">Profil mis à jour le {new Date(friend.updated_at).toLocaleDateString('fr-FR')}.</p>
      </section>

      <section className={card}>
        <h4 className="font-black text-white">🏋️ Dernière séance</h4>
        {s.lastSession ? (
          <>
            <p className="text-xs text-slate-400">{dateFr(s.lastSession.date)}</p>
            <ul className="space-y-1.5">
              {s.lastSession.items.map((it, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-sm bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
                  <span className="font-bold text-slate-100 truncate">{it.icon} {cleanText(it.name)}</span>
                  <span className="text-slate-400 text-xs text-right shrink-0">{it.text}</span>
                </li>
              ))}
            </ul>
          </>
        ) : <p className="text-sm text-slate-400">Pas encore de séance enregistrée.</p>}
      </section>

      <section className={card}>
        <h4 className="font-black text-white">💯 Maxima</h4>
        {(s.maxima || []).length ? (
          <ul className="space-y-1.5">
            {s.maxima.map((m, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-sm bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
                <span className="font-bold text-slate-100 truncate">{m.icon} {cleanText(m.name)}</span>
                <span className="text-amber-300 text-xs font-bold text-right shrink-0">{m.text}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-slate-400">Pas encore de maximum à montrer.</p>}
      </section>

      <section className={card}>
        <h4 className="font-black text-white">📋 Ses exercices</h4>
        {Object.keys(byMuscle).length === 0 && <p className="text-sm text-slate-400">Aucun exercice pour l’instant.</p>}
        {Object.entries(byMuscle).map(([muscle, list]) => (
          <div key={muscle} className="space-y-1">
            <p className="text-xs font-black uppercase tracking-wider text-pink-300">{cleanText(muscle)}</p>
            <div className="flex flex-wrap gap-1.5">{list.map((x, i) => <span key={i} className={chip}>{x.icon} {cleanText(x.name)} · niv. {x.level}</span>)}</div>
          </div>
        ))}
      </section>

      <button type="button" onClick={onRemove} data-testid="friend-remove" className="text-xs underline text-rose-300">Retirer cet ami de ma liste</button>
    </div>
  );
}
