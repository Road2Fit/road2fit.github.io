// Douleurs signalées (4.22 ; schéma des muscles et côté droit / gauche en 4.23). Carte des Réglages du Coach ; `PainPicker`
// sert aussi dans le menu de la séance guidée (« J'ai mal quelque part »). On touche un muscle du schéma (vert → rouge) ou
// une articulation (G / D) ; les exercices qui sollicitent la zone sont signalés (coach/pains.js).
import { Art } from '../Art';
import { card } from './ui';
import { PainBodyMap } from './MuscleBodyMap';
import { PAIN_JOINTS, hasPain, muscleZone, painLabel, painsOf, togglePain } from '../../coach/pains';
import { getCoachSettings } from '../../coach/settings';
import { getTodayISODate } from '../../lib/dates';

const sideBtn = on => `w-8 py-1 rounded-md text-xs font-black border ${on ? 'bg-rose-500 border-rose-300 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`;

/** `pains` = coach.pains ; `onToggle(zone, side)`. */
export function PainPicker({ pains, onToggle }) {
  const list = painsOf({ pains });
  const isOn = (zone, side) => hasPain(list, zone, side);
  return (
    <div className="space-y-3" data-testid="pain-picker">
      <p className="text-xs text-slate-300">Touche ce qui te fait mal : le muscle passe en <b className="text-rose-400">rouge</b>. Touche-le encore pour le retirer.</p>
      <PainBodyMap isOn={isOn} onToggle={onToggle} zoneOf={muscleZone} labelOf={(zone, side) => painLabel({ zone, side })} />
      <div className="space-y-1.5">
        <p className="text-xs font-bold uppercase text-slate-400">Articulations</p>
        <div className="flex flex-wrap gap-2">
          {PAIN_JOINTS.map(z => (
            <span key={z.id} className={`inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg border ${isOn(z.id, 'left') || isOn(z.id, 'right') || isOn(z.id, null) ? 'border-rose-400/60 bg-rose-500/10' : 'border-slate-700 bg-slate-950'}`}>
              <span className="text-xs font-bold text-slate-200 mr-0.5">{z.label}</span>
              {!z.sided && <button type="button" aria-pressed={isOn(z.id, null)} aria-label={z.label} data-testid={`pain-${z.id}-c`} onClick={() => onToggle(z.id, null)} className={sideBtn(isOn(z.id, null))}>{isOn(z.id, null) ? '✓' : '+'}</button>}
              {z.sided && ['left', 'right'].map(s => (
                <button key={s} type="button" aria-pressed={isOn(z.id, s)} aria-label={painLabel({ zone: z.id, side: s })} data-testid={`pain-${z.id}-${s}`} onClick={() => onToggle(z.id, s)} className={sideBtn(isOn(z.id, s))}>{s === 'left' ? 'G' : 'D'}</button>
              ))}
            </span>
          ))}
        </div>
      </div>
      {list.length > 0
        ? <p className="text-xs text-rose-300 font-bold" data-testid="pain-summary">À ménager : {list.map(p => painLabel(p).toLowerCase()).join(', ')}.</p>
        : <p className="text-xs text-slate-500" data-testid="pain-summary">Rien de signalé.</p>}
      <p className="text-xs text-slate-400">Les exercices concernés sont signalés et tu peux en changer d’un geste. Douleur vive ou qui dure : arrête et consulte.</p>
    </div>
  );
}

export function CoachPains({ gameState, setGameState }) {
  const pains = getCoachSettings(gameState).pains;
  const toggle = (zone, side) => setGameState(prev => { const c = getCoachSettings(prev); return { ...prev, coach: { ...c, pains: togglePain(c, zone, side, getTodayISODate()) } }; });
  return (
    <section className={card} data-testid="coach-pains">
      <h3 className="font-black text-white"><Art name="warn" />J’ai mal quelque part</h3>
      <PainPicker pains={pains} onToggle={toggle} />
    </section>
  );
}
