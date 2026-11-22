import { useState } from 'react';
import { DUO_THEMES, duoThemeLabel } from '../coach/duo';
import { addDaysISO, formatDayFr, getTodayISODate } from '../lib/dates';
import { cleanText } from '../edition';

// Séance à deux (4.51) : invitations reçues (Accepter / Refuser), envoyées et acceptées (Annuler).
// Affiché en haut du Coach (page Séance) et de l'onglet Amis.
const nameOf = r => cleanText(r.other_name || '') || 'Ton ami';

export function DuoCards({ duo, compact = false }) {
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  if (!duo || !duo.available) return null;
  const rows = [...duo.incoming, ...(compact ? [] : duo.outgoing), ...(compact ? [] : duo.accepted)];
  if (!rows.length && !msg) return null;
  const act = async (fn, row, ok) => {
    setBusy(row.id); setMsg(null);
    const r = await fn(row);
    setBusy('');
    setMsg(r.ok ? { ok: true, text: ok } : { ok: false, text: r.message });
  };
  return (
    <div className="space-y-2" data-testid="duo-cards">
      {rows.map(r => {
        const who = nameOf(r);
        const when = formatDayFr(r.date);
        const head = r.status === 'accepted' ? `Séance à deux avec ${who}, ${when}` : r.mine ? `Invitation envoyée à ${who} pour ${when}` : `${who} t’invite à une séance à deux, ${when}`;
        return (
          <section key={r.id} data-testid={`duo-${r.status === 'accepted' ? 'accepted' : r.mine ? 'out' : 'in'}`} className="rounded-2xl border border-sky-400/60 bg-sky-500/10 px-3 py-2 space-y-1.5">
            <p className="text-sm font-black text-white leading-tight">🤝 {head}</p>
            <p className="text-[11px] text-slate-300">{duoThemeLabel(r.theme)}{r.status === 'accepted' ? ` · ${(r.plan && r.plan.ex ? r.plan.ex.length : 0)} exercices en commun, mêmes séries et répétitions, chacun ses charges` : r.mine ? ' · en attente de sa réponse' : ' · mêmes exercices, séries et répétitions pour vous deux, chacun ses charges'}</p>
            <div className="flex gap-2">
              {!r.mine && r.status === 'pending' && (
                <>
                  <button type="button" disabled={!!busy} onClick={() => act(duo.accept, r, 'Accepté : la séance à deux est dans ton Coach ce jour-là.')} data-testid="duo-accept" className="flex-1 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-black disabled:opacity-40">{busy === r.id ? '…' : 'Accepter'}</button>
                  <button type="button" disabled={!!busy} onClick={() => act(duo.decline, r, 'Invitation refusée.')} data-testid="duo-decline" className="flex-1 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold disabled:opacity-40">Refuser</button>
                </>
              )}
              {(r.mine || r.status === 'accepted') && (
                <button type="button" disabled={!!busy} onClick={() => act(duo.cancel, r, 'Séance à deux annulée.')} data-testid="duo-cancel" className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold disabled:opacity-40">Annuler</button>
              )}
            </div>
          </section>
        );
      })}
      {msg && <p className={`text-xs font-bold ${msg.ok ? 'text-emerald-300' : 'text-rose-300'}`} data-testid="duo-msg">{msg.text}</p>}
    </div>
  );
}

/** Inviter un ami : jour (aujourd'hui + 13 jours) et thème. */
export function DuoInvite({ duo, friend }) {
  const today = getTodayISODate();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(addDaysISO(today, 1));
  const [theme, setTheme] = useState('auto');
  const [state, setState] = useState(null);
  if (!duo || !duo.available || !friend) return null;
  if (!open) {
    return (
      <div className="space-y-1">
        <button type="button" onClick={() => { setOpen(true); setState(null); }} data-testid="duo-open" className="w-full py-2 rounded-xl bg-sky-600 text-white text-sm font-black">🤝 Séance à deux</button>
        {state && state.ok && <p className="text-xs font-bold text-emerald-300" data-testid="duo-invite-msg">{state.text}</p>}
      </div>
    );
  }
  const days = Array.from({ length: 14 }, (_, i) => addDaysISO(today, i));
  const send = async () => {
    setState({ busy: true });
    const r = await duo.invite(friend.user_id, date, theme);
    setState(r.ok ? { ok: true, text: 'Invitation envoyée : la séance s’ajoutera chez vous deux dès qu’il aura accepté.' } : { ok: false, text: r.message });
    if (r.ok) setOpen(false);
  };
  return (
    <div className="rounded-xl border border-sky-400/50 bg-slate-950 p-3 space-y-2" data-testid="duo-invite">
      <p className="text-sm font-black text-white">Séance à deux</p>
      <p className="text-[11px] text-slate-400">Vos deux coachs trouvent des exercices que vous pouvez faire tous les deux et un entre-deux de vos objectifs : mêmes séries et répétitions, chacun ses charges. Partagé avec ton ami : la liste de tes exercices possibles, ceux à éviter à cause d’une douleur signalée, ton type d’objectif, ton niveau, salle ou maison et ton matériel. Jamais tes charges, ton historique ni ton poids.</p>
      <label className="block text-xs text-slate-300">Jour
        <select value={date} onChange={e => setDate(e.target.value)} data-testid="duo-date" className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white">
          {days.map(d => <option key={d} value={d}>{d === today ? 'Aujourd’hui' : formatDayFr(d)}</option>)}
        </select>
      </label>
      <div className="flex flex-wrap gap-1.5">
        {DUO_THEMES.map(t => (
          <button key={t.id} type="button" onClick={() => setTheme(t.id)} aria-pressed={theme === t.id} data-testid={`duo-theme-${t.id}`}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${theme === t.id ? 'bg-sky-600 border-sky-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>{t.label}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2 rounded-lg bg-slate-800 text-xs font-bold text-slate-200">Fermer</button>
        <button type="button" onClick={send} disabled={state && state.busy} data-testid="duo-send" className="flex-1 py-2 rounded-lg bg-sky-600 text-xs font-black text-white disabled:opacity-40">{state && state.busy ? 'Envoi…' : 'Inviter'}</button>
      </div>
      {state && state.text && <p className={`text-xs font-bold ${state.ok ? 'text-emerald-300' : 'text-rose-300'}`} data-testid="duo-invite-msg">{state.text}</p>}
    </div>
  );
}
