import { useEffect, useState } from 'react';
import { Figure } from '../anim/Figure';
import { movementFor } from '../anim/resolve';
import { poseAt, tempoU } from '../anim/skeleton';
import { AVATAR_DEFAULT, BODIES, BOTTOMS, CLOTH_COLORS, HAIRS, HAIR_COLORS, SKINS, TOPS, cleanAvatar } from '../anim/avatar';

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

export function AvatarEditor({ avatar, onChange, onClose }) {
  const a = cleanAvatar(avatar);
  const set = (k, v) => onChange({ ...a, [k]: v });
  const row = (title, children) => <div className="space-y-1.5"><p className="text-xs font-black text-slate-300 uppercase tracking-wide">{title}</p>{children}</div>;
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
          <Preview avatar={a} />
          {row('Peau', <Swatches k="skin" list={SKINS} value={a.skin} set={set} />)}
          {row('Silhouette', <Chips k="body" list={BODIES} value={a.body} set={set} />)}
          {row('Cheveux', <><Chips k="hair" list={HAIRS} value={a.hair} set={set} /><Swatches k="hairColor" list={HAIR_COLORS} value={a.hairColor} set={set} /></>)}
          {row('Haut', <><Chips k="top" list={TOPS} value={a.top} set={set} /><Swatches k="topColor" list={CLOTH_COLORS} value={a.topColor} set={set} /></>)}
          {row('Bas', <><Chips k="bottom" list={BOTTOMS} value={a.bottom} set={set} /><Swatches k="bottomColor" list={CLOTH_COLORS} value={a.bottomColor} set={set} /></>)}
          {row('Chaussures', <Swatches k="shoeColor" list={CLOTH_COLORS} value={a.shoeColor} set={set} />)}
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
