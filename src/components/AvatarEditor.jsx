import { useEffect, useState } from 'react';
import { Figure } from '../anim/Figure';
import { movementFor } from '../anim/resolve';
import { poseAt, tempoU } from '../anim/skeleton';
import { AVATAR_DEFAULT, BODIES, BOTTOMS, CLOTH_COLORS, HAIRS, HAIR_COLORS, SKINS, TOPS, cleanAvatar, cleanNumber } from '../anim/avatar';
import { ITEMS, SLOTS, canBuy, coinsForLevel, coinsLeft } from '../anim/shop';

// « Mon avatar » (4.39) : le personnage des animations d'exercices, habillé à son goût. Ouvert depuis le profil.
// Chaque choix est enregistré tout de suite (gameState.avatar, synchronisé). Aperçu : un squat de profil et de face.
const CYCLE_MS = 3600;
const reduced = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// aperçu : squat au poids du corps de profil, curl haltères de face (peu de matériel : le personnage est en grand)
function previewScenes() {
  const side = movementFor('home_squat');
  const curl = movementFor('fp_db_curl');
  const front = curl && (curl.alts || []).map(a => a.scene).find(sc => sc && sc.view === 'front');
  return [side && side.scene, front].filter(Boolean);
}

function Preview({ avatar }) {
  const [phase, setPhase] = useState(0.35);
  useEffect(() => {
    if (reduced() || typeof requestAnimationFrame !== 'function') return undefined;
    let raf; let last = 0;
    const tick = t => { if (last) setPhase(p => (p + (t - last) / CYCLE_MS) % 1); last = t; raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const views = previewScenes();
  if (!views.length) return null;
  return (
    <div className="grid grid-cols-2 gap-2" data-testid="avatar-preview">
      {views.map((sc, i) => (
        <div key={i} className="rounded-xl overflow-hidden border border-slate-700">
          <Figure scene={sc} pose={poseAt(sc.keys, tempoU(phase, sc.loop, 1))} avatar={avatar} showMuscles={false} />
        </div>
      ))}
    </div>
  );
}

const Swatches = ({ k, list, value, set }) => (
  <div className="flex flex-wrap gap-2">
    {list.map(o => (
      <button key={o.id} type="button" onClick={() => set(k, o.id)} aria-label={o.label || o.id} aria-pressed={value === o.id} data-testid={`avatar-${k}-${o.id}`}
        className={`tap-free w-9 h-9 rounded-full border-2 ${value === o.id ? 'border-white ring-2 ring-pink-400' : 'border-slate-700'}`} style={{ background: o.c }} />
    ))}
  </div>
);
const Chips = ({ k, list, value, set }) => (
  <div className="flex flex-wrap gap-1.5">
    {list.map(o => (
      <button key={o.id} type="button" onClick={() => set(k, o.id)} aria-pressed={value === o.id} data-testid={`avatar-${k}-${o.id}`}
        className={`tap-free px-3 py-1.5 rounded-lg text-xs font-bold border ${value === o.id ? 'bg-pink-600 border-pink-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>{o.label}</button>
    ))}
  </div>
);

// numéro du maillot : modifiable librement (champ vide permis pendant la saisie), enregistré dès qu'il n'est pas vide
function NumberField({ value, onNumber }) {
  const [txt, setTxt] = useState(value);
  return (
    <input type="text" maxLength={3} value={txt} aria-label="Numéro du maillot" data-testid="shop-number-input"
      onChange={e => { const v = cleanNumber(e.target.value); setTxt(v); if (v) onNumber(v); }}
      onBlur={() => { if (!txt) setTxt(value); }} onFocus={e => e.target.select()}
      className="w-14 px-2 py-1 rounded-lg bg-slate-900 border border-pink-400 text-white text-sm font-black text-center" />
  );
}

// Boutique (4.40) : pièces gagnées à chaque niveau, objets à essayer (aperçu), acheter, porter ou retirer
function Shop({ a, level, owned, tryOn, setTryOn, onBuy, onWear, onNumber }) {
  const [slot, setSlot] = useState('head');
  const left = coinsLeft(level, owned);
  const list = ITEMS.filter(it => it.slot === slot);
  const worn = (a.items || {})[slot];
  return (
    <div className="space-y-3" data-testid="avatar-shop">
      <div className="flex items-center gap-2 bg-slate-950 rounded-xl px-3 py-2">
        <span className="w-7 h-7 rounded-full bg-yellow-400 border-2 border-yellow-200 flex items-center justify-center text-xs font-black text-yellow-900" aria-hidden="true">P</span>
        <div className="flex-1">
          <p className="text-base font-black text-white" data-testid="shop-coins">{left} pièces</p>
          <p className="text-[11px] text-slate-400">Chaque niveau en rapporte, de plus en plus : +{coinsForLevel(level + 1)} au niveau {level + 1}.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SLOTS.map(sl => (
          <button key={sl.id} type="button" onClick={() => setSlot(sl.id)} aria-pressed={slot === sl.id} data-testid={`shop-slot-${sl.id}`}
            className={`tap-free px-2.5 py-1.5 rounded-lg text-xs font-bold border ${slot === sl.id ? 'bg-pink-600 border-pink-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>{sl.label}</button>
        ))}
      </div>
      <ul className="space-y-1.5">
        {list.map(it => {
          const mine = owned.includes(it.id);
          const on = worn === it.id;
          const trying = tryOn[slot] === it.id;
          const ok = canBuy(it, level, owned);
          return (
            <li key={it.id} className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 ${trying ? 'border-pink-400 bg-pink-950/30' : 'border-slate-800 bg-slate-950'}`} data-testid={`shop-item-${it.id}`}>
              <span className="shrink-0 w-6 h-6 rounded-full border border-slate-600" style={{ background: it.c ? (it.c2 ? `linear-gradient(135deg, ${it.c} 55%, ${it.c2} 55%)` : it.c) : 'linear-gradient(135deg, #64748b, #e2e8f0)' }} aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{it.name}</p>
                <p className="text-[11px] text-slate-400">{mine ? (on ? 'Porté' : 'À toi') : `${it.price} pièces`}</p>
                {it.kind === 'number' && mine && (
                  <label className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-300">Numéro
                    <NumberField value={a.number || '23'} onNumber={onNumber} />
                  </label>
                )}
              </div>
              {mine ? (
                <button type="button" onClick={() => onWear(slot, on ? null : it.id)} data-testid={`shop-wear-${it.id}`} className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-black ${on ? 'bg-slate-800 text-slate-200' : 'bg-pink-600 text-white'}`}>{on ? 'Retirer' : 'Porter'}</button>
              ) : (<>
                <button type="button" onClick={() => setTryOn(t => ({ ...t, [slot]: trying ? undefined : it.id }))} aria-pressed={trying} data-testid={`shop-try-${it.id}`} className="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-100">{trying ? 'Enlever' : 'Essayer'}</button>
                <button type="button" onClick={() => onBuy(it)} disabled={!ok} data-testid={`shop-buy-${it.id}`} className="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-black bg-pink-600 text-white disabled:opacity-35">Acheter</button>
              </>)}
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-slate-500">Juste pour le style : aucun effet sur ton entraînement.</p>
    </div>
  );
}

export function AvatarEditor({ avatar, onChange, onClose, level = 1, owned = [], onBuy = null }) {
  const a = cleanAvatar(avatar);
  const [tab, setTab] = useState('look');
  const [tryOn, setTryOn] = useState({});
  const set = (k, v) => onChange({ ...a, [k]: v });
  const wear = (slot, id) => { const items = { ...(a.items || {}) }; if (id) items[slot] = id; else delete items[slot]; onChange({ ...a, items }); };
  const buy = it => { if (!onBuy || !canBuy(it, level, owned)) return; onBuy(it); setTryOn(t => ({ ...t, [it.slot]: undefined })); };
  const shown = { ...a, items: { ...(a.items || {}), ...Object.fromEntries(Object.entries(tryOn).filter(([, v]) => v)) } };
  const row = (title, children) => <div className="space-y-1.5"><p className="text-xs font-black text-slate-300 uppercase tracking-wide">{title}</p>{children}</div>;
  const tabBtn = (id, label) => (
    <button type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} data-testid={`avatar-tab-${id}`}
      className={`flex-1 py-2 rounded-lg text-sm font-black ${tab === id ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>{label}</button>
  );
  return (
    <div className="fixed inset-0 z-[80] bg-black/70 overflow-y-auto" onClick={onClose} style={{ margin: 0 }}>
      <div className="min-h-full flex items-end sm:items-center justify-center p-3">
        <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-4 space-y-4" onClick={e => e.stopPropagation()} role="dialog" aria-label="Mon avatar" data-testid="avatar-editor">
          <div className="flex items-center gap-2">
            <h2 className="flex-1 text-lg font-black text-white">Mon avatar</h2>
            <button type="button" onClick={onClose} aria-label="Fermer" data-testid="avatar-close" className="nav-btn">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
            </button>
          </div>
          <p className="text-xs text-slate-400">C’est le personnage des animations d’exercices.</p>
          <div className="sticky top-0 z-10 bg-slate-900 -mx-1 px-1 pb-1"><Preview avatar={shown} /></div>
          {onBuy && <div className="flex gap-1 bg-slate-950 rounded-xl p-1" role="tablist">{tabBtn('look', 'Apparence')}{tabBtn('shop', 'Boutique')}</div>}
          {tab === 'shop' && onBuy ? (
            <Shop a={a} level={level} owned={owned} tryOn={tryOn} setTryOn={setTryOn} onBuy={buy} onWear={wear} onNumber={v => onChange({ ...a, number: v })} />
          ) : (<>
            {row('Peau', <Swatches k="skin" list={SKINS} value={a.skin} set={set} />)}
            {row('Silhouette', <Chips k="body" list={BODIES} value={a.body} set={set} />)}
            {row('Cheveux', <><Chips k="hair" list={HAIRS} value={a.hair} set={set} /><Swatches k="hairColor" list={HAIR_COLORS} value={a.hairColor} set={set} /></>)}
            {row('Haut', <><Chips k="top" list={TOPS} value={a.top} set={set} /><Swatches k="topColor" list={CLOTH_COLORS} value={a.topColor} set={set} /></>)}
            {row('Bas', <><Chips k="bottom" list={BOTTOMS} value={a.bottom} set={set} /><Swatches k="bottomColor" list={CLOTH_COLORS} value={a.bottomColor} set={set} /></>)}
            {row('Chaussures', <Swatches k="shoeColor" list={CLOTH_COLORS} value={a.shoeColor} set={set} />)}
          </>)}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => onChange(null)} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-100 text-sm font-bold" data-testid="avatar-reset">Personnage par défaut</button>
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-pink-600 text-white text-sm font-black">Terminé</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { AVATAR_DEFAULT };
