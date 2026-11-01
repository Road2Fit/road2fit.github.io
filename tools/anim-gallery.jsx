// Outil de développement : affiche, pour chaque scène, les images de départ et de fin (npm run dev → /tools/anim-gallery.html?q=texte&from=0&n=24).
import { createRoot } from 'react-dom/client';
import { Figure } from '../src/anim/Figure';
import { poseAt } from '../src/anim/skeleton';
import { ALL_SCENES } from '../src/anim/registry';
import { movementFor } from '../src/anim/resolve';
import { Art, ART_NAMES } from '../src/components/Art';
import '../src/styles.css';

const params = new URLSearchParams(location.search);
const q = (params.get('q') || '').toLowerCase();
const from = Number(params.get('from') || 0);
const n = Number(params.get('n') || 12);
const flat = ALL_SCENES.flatMap(s => [s, ...(s.alts || []).map(a => ({ id: s.id + '#' + a.key, name: s.name + ' — ' + a.label, scene: a.scene }))]);
const list = flat.filter(s => !q || (s.id + ' ' + s.name).toLowerCase().includes(q)).slice(from, from + n);

function App() {
  return (
    <div style={{ padding: 4, display: "grid", gap: 4, gridTemplateColumns: `repeat(${params.get("cols") || 3}, 1fr)` }} className="text-slate-200">
      {list.map(s => (
        <div key={s.id} className="border border-slate-700 rounded p-1">
          <p className="text-[9px] font-bold truncate">{s.id} · {s.name}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2 }}>
            <Figure scene={s.scene} pose={poseAt(s.scene.keys, 0)} muscleText={(movementFor(s.id.split('#')[0]) || {info: {}}).info?.m || ''} />
            <Figure scene={s.scene} pose={poseAt(s.scene.keys, 0.5)} muscleText={(movementFor(s.id.split('#')[0]) || {info: {}}).info?.m || ''} />
            <Figure scene={s.scene} pose={poseAt(s.scene.keys, 1)} muscleText={(movementFor(s.id.split('#')[0]) || {info: {}}).info?.m || ''} />
          </div>
        </div>
      ))}
    </div>
  );
}
// ?art=1 : planche de toutes les icônes de l'appli
const ArtSheet = () => (
  <div style={{ padding: 8, display: 'grid', gap: 6, gridTemplateColumns: 'repeat(10, 1fr)' }} className="text-slate-300 text-xs text-center">
    {ART_NAMES.map(n => <div key={n}><Art name={n} size={60} bare /><div>{n}</div><Art name={n} size={18} bare /></div>)}
  </div>
);
createRoot(document.getElementById('root')).render(params.get('art') ? <ArtSheet /> : <App />);
