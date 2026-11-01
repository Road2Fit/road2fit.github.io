// Outil de développement : affiche, pour chaque scène, les images de départ et de fin (npm run dev → /tools/anim-gallery.html?q=texte&from=0&n=24).
import { createRoot } from 'react-dom/client';
import { Figure } from '../src/anim/Figure';
import { poseAt } from '../src/anim/skeleton';
import { ALL_SCENES } from '../src/anim/registry';
import { movementFor } from '../src/anim/resolve';
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
          <div className="grid grid-cols-2 gap-1">
            <Figure scene={s.scene} pose={poseAt(s.scene.keys, 0)} muscleText={(movementFor(s.id.split('#')[0]) || {info: {}}).info?.m || ''} />
            <Figure scene={s.scene} pose={poseAt(s.scene.keys, 1)} muscleText={(movementFor(s.id.split('#')[0]) || {info: {}}).info?.m || ''} />
          </div>
        </div>
      ))}
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);
