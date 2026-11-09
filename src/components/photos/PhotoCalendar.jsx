import { useMemo, useState } from 'react';
import { PhotoAddButton } from './PhotoAddButton';
import { getTodayISODate } from '../../lib/dates';
import { PhotoDB, usePhotos } from '../../lib/photos';
import { isStartEntry } from '../../lib/quests';
import { Art } from '../Art';

// Onglet « Souvenirs » : calendrier mensuel de photos
const friendName = (list, id) => {
  const f = (list || []).find(x => x.user_id === id);
  return (f && f.summary && f.summary.name) || 'Ami sans prénom';
};

export function PhotoCalendar({ gameState, fphotos = null, friendsList = [] }) {
  const own = usePhotos();
  // photos où un ami m'a tagué : dans mon calendrier aussi (lecture seule)
  const taggedPhotos = useMemo(() => ((fphotos && fphotos.tagged) || []).filter(t => t.date && t.data).map(t => ({
    id: `t_${t.id}`, date: String(t.date).slice(0, 10), img: t.data, note: t.note || '', from: t.owner_name || 'Un ami', fromFriend: true, createdAt: Date.parse(t.created_at) || 0,
  })), [fphotos && fphotos.tagged]);
  const photos = useMemo(() => [...own, ...taggedPhotos], [own, taggedPhotos]);
  const [tagFor, setTagFor] = useState(null); // photo dont on choisit les amis à taguer
  const [tagSel, setTagSel] = useState([]);
  const [tagMsg, setTagMsg] = useState('');
  const today = getTodayISODate();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [openDay, setOpenDay] = useState(null);
  const byDay = useMemo(() => {
    const m = {};
    photos.forEach(p => { (m[p.date] = m[p.date] || []).push(p); });
    Object.values(m).forEach(a => a.sort((x, y) => (x.createdAt || 0) - (y.createdAt || 0)));
    return m;
  }, [photos]);
  const sessionDays = useMemo(() => {
    const set = new Set();
    (gameState.quests || []).forEach(q => (q.history || []).forEach(h => { if (!isStartEntry(h)) set.add(h.date); }));
    return set;
  }, [gameState.quests]);
  const [y, mo] = month.split('-').map(Number);
  const first = new Date(y, mo - 1, 1);
  const lead = (first.getDay() + 6) % 7;
  const nDays = new Date(y, mo, 0).getDate();
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= nDays; d++) cells.push(`${month}-${String(d).padStart(2, '0')}`);
  const shift = n => { const d = new Date(y, mo - 1 + n, 1); setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); };
  const monthName = first.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const monthPhotos = Object.keys(byDay).filter(k => k.startsWith(month)).length;
  const monthSessions = [...sessionDays].filter(k => k.startsWith(month)).length;
  const total = own.length;
  const recentTagged = taggedPhotos.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);

  const exportPng = async () => {
    const W = 1080, pad = 40, head = 150, cw = (W - pad * 2) / 7, ch = cw * 1.15;
    const rows = Math.ceil(cells.length / 7), H = head + rows * ch + pad;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#0f172a'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#f9a8d4'; g.font = '800 54px sans-serif'; g.textAlign = 'center';
    g.fillText(monthName.charAt(0).toUpperCase() + monthName.slice(1), W / 2, 75);
    g.fillStyle = '#94a3b8'; g.font = '600 24px sans-serif';
    g.fillText(`${monthSessions} séance(s) · ${monthPhotos} souvenir(s) · Rondoufit`, W / 2, 112);
    const loadImg = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
    for (let i = 0; i < cells.length; i++) {
      const date = cells[i]; if (!date) continue;
      const x = pad + (i % 7) * cw, yy = head + Math.floor(i / 7) * ch, w = cw - 6, h = ch - 6;
      g.fillStyle = '#1e293b'; g.fillRect(x, yy, w, h);
      const ph = (byDay[date] || [])[0];
      if (ph) {
        const im = await loadImg(ph.img);
        if (im) {
          const k = Math.max(w / im.width, h / im.height), sw = w / k, sh = h / k;
          g.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, x, yy, w, h);
        }
      } else if (sessionDays.has(date)) { g.fillStyle = '#ec4899'; g.beginPath(); g.arc(x + w / 2, yy + h / 2, 10, 0, 7); g.fill(); }
      g.fillStyle = ph ? 'rgba(0,0,0,.55)' : 'transparent'; if (ph) g.fillRect(x, yy, 34, 26);
      g.fillStyle = '#e2e8f0'; g.font = '700 20px sans-serif'; g.textAlign = 'left';
      g.fillText(String(Number(date.slice(8))), x + 6, yy + 21);
    }
    const url = c.toDataURL('image/png');
    const a = document.createElement('a'); a.href = url; a.download = `rondoufit-souvenirs-${month}.png`;
    document.body.appendChild(a); a.click(); a.remove();
  };
  const exportJson = async () => {
    const all = await PhotoDB.all();
    const blob = new Blob([JSON.stringify({ rondoufitPhotos: 1, photos: all })], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `rondoufit-photos-${today}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importJson = e => {
    const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
    const r = new FileReader();
    r.onload = async () => {
      try {
        const d = JSON.parse(r.result);
        if (!d || !Array.isArray(d.photos)) throw new Error('x');
        for (const p of d.photos) if (p && p.id && p.img && p.date) await PhotoDB.put(p);
      } catch (err) { window.alert('Fichier de photos invalide.'); }
    };
    r.readAsText(f);
  };
  const dayList = openDay ? byDay[openDay] || [] : [];
  const fmtDay = d => new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-4">
      {recentTagged.length > 0 && (
        <div className="bg-slate-900 border border-violet-500/40 rounded-2xl p-3 space-y-1.5" data-testid="tagged-photos">
          <p className="text-xs font-black uppercase tracking-wider text-violet-300">Photos avec tes amis</p>
          {recentTagged.map(t => (
            <button key={t.id} type="button" onClick={() => { setMonth(t.date.slice(0, 7)); setOpenDay(t.date); }} className="w-full flex items-center gap-2 text-left text-sm text-slate-200">
              <img src={t.img} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-700" />
              <span className="min-w-0"><strong className="text-white">{t.from}</strong> t’a tagué · {fmtDay(t.date)}</span>
            </button>
          ))}
        </div>
      )}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <button onClick={() => shift(-1)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-white font-black">‹</button>
          <div className="text-center">
            <p className="text-base font-black text-white capitalize">{monthName}</p>
            <p className="text-xs text-slate-400">{monthSessions} séance(s) · {monthPhotos} souvenir(s) ce mois · {total} au total</p>
          </div>
          <button onClick={() => shift(1)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-white font-black">›</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-500">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <div key={i}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1" data-testid="photo-grid">
          {cells.map((date, i) => {
            if (!date) return <div key={i} />;
            const ph = (byDay[date] || [])[0];
            const n = (byDay[date] || []).length;
            const sess = sessionDays.has(date);
            return (
              <button key={i} onClick={() => setOpenDay(date)} data-day={date}
                className={`relative aspect-square rounded-lg overflow-hidden border text-left ${date === today ? 'border-pink-500' : sess ? 'border-pink-500/40' : 'border-slate-800'} bg-slate-950`}>
                {ph && <img src={ph.img} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                <span className={`absolute top-0.5 left-1 text-xs font-black ${ph ? 'text-white drop-shadow' : 'text-slate-400'}`}>{Number(date.slice(8))}</span>
                {!ph && sess && <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-pink-500" />}
                {n > 1 && <span className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/70 text-[9px] font-bold text-white">{n}</span>}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500">🔴 = séance sans photo</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportPng} className="px-3 py-2 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold">🖼️ Télécharger le calendrier du mois</button>
          <button onClick={exportJson} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold">💾 Sauvegarder les photos</button>
          <label className="px-3 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold cursor-pointer">📥 Restaurer<input type="file" accept="application/json,.json" onChange={importJson} className="hidden" /></label>
        </div>
      </div>

      {openDay && (
        <div className="fixed inset-0 z-[95] bg-black/85 overflow-y-auto" onClick={() => setOpenDay(null)}>
          <div className="max-w-md mx-auto px-4 py-6" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-900 border border-pink-500/40 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-black text-white capitalize text-sm">{fmtDay(openDay)}</p>
                <button onClick={() => setOpenDay(null)} className="text-slate-400 hover:text-white">✕</button>
              </div>
              {sessionDays.has(openDay) && <p className="text-xs text-pink-300 font-bold">💪 Séance enregistrée ce jour-là</p>}
              {dayList.length === 0 && <p className="text-xs text-slate-400">Aucun souvenir ce jour-là.</p>}
              {dayList.map(p => p.fromFriend ? (
                <div key={p.id} className="space-y-1.5" data-testid="tagged-photo">
                  <img src={p.img} alt="" className="w-full rounded-xl border border-violet-500/50" />
                  <p className="text-xs text-violet-200 font-bold"><Art name="friends" size={14} />Photo de {p.from}, tu es tagué{p.note ? ` · « ${p.note} »` : ''}</p>
                </div>
              ) : (
                <div key={p.id} className="space-y-1.5">
                  <img src={p.img} alt="" className="w-full rounded-xl border border-slate-700" />
                  <input defaultValue={p.note || ''} placeholder="Une petite note…" onBlur={e => { if (e.target.value !== (p.note || '')) PhotoDB.put({ ...p, note: e.target.value }); }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white" />
                  {fphotos && fphotos.on && (fphotos.myTags[p.id] || []).length > 0 && (
                    <p className="text-xs text-violet-200" data-testid="photo-tags">Avec : {(fphotos.myTags[p.id] || []).map(id => friendName(friendsList, id)).join(', ')}</p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    {fphotos && fphotos.on && <button type="button" onClick={() => { setTagFor(tagFor === p.id ? null : p.id); setTagSel(fphotos.myTags[p.id] || []); setTagMsg(''); }} className="text-xs font-bold text-violet-200" data-testid={`photo-tag-${p.id}`}><Art name="friends" size={14} />Taguer un ami</button>}
                    <button onClick={() => { if (window.confirm('Supprimer cette photo ?')) PhotoDB.del(p.id); }} className="text-xs font-bold text-rose-300">🗑 Supprimer</button>
                  </div>
                  {tagFor === p.id && (
                    <div className="bg-slate-950 border border-violet-500/40 rounded-xl p-3 space-y-2" data-testid="tag-picker">
                      {fphotos.mutual.length === 0
                        ? <p className="text-xs text-slate-400">Tu peux taguer un ami quand vous vous êtes ajoutés tous les deux (onglet Amis).</p>
                        : fphotos.mutual.map(id => (
                          <label key={id} className="flex items-center gap-2 text-sm text-slate-100">
                            <input type="checkbox" checked={tagSel.includes(id)} onChange={e => setTagSel(sel => (e.target.checked ? [...sel, id] : sel.filter(x => x !== id)))} data-testid={`tag-friend-${id}`} className="w-4 h-4" />
                            {friendName(friendsList, id)}
                          </label>
                        ))}
                      {fphotos.mutual.length > 0 && <button type="button" data-testid="tag-save" onClick={async () => { try { await fphotos.setTags(p, tagSel); setTagMsg(tagSel.length ? 'Photo envoyée : elle apparaît dans ses Souvenirs.' : 'Tag retiré.'); setTagFor(null); } catch (e) { setTagMsg('Impossible d’envoyer la photo (connexion ?).'); } }} className="w-full py-2 rounded-xl bg-pink-600 text-white text-xs font-black">Enregistrer</button>}
                    </div>
                  )}
                  {tagMsg && tagFor === null && <p className="text-xs text-emerald-300" data-testid="tag-msg">{tagMsg}</p>}
                </div>
              ))}
              <PhotoAddButton capture="environment" date={openDay} className="w-full py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-black">📷 Prendre une photo</PhotoAddButton>
              <div className="grid grid-cols-2 gap-2">
                <PhotoAddButton capture="user" date={openDay} className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold">🤳 Selfie</PhotoAddButton>
                <PhotoAddButton date={openDay} className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold">🖼️ Choisir une photo</PhotoAddButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
