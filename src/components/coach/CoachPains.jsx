// Douleurs signalées (4.22) : choix des zones sensibles. Carte des Réglages du Coach ; `PainPicker` sert aussi dans le menu
// de la séance guidée (« J'ai mal quelque part »). Les exercices qui sollicitent une zone sont signalés (coach/pains.js).
import { Art } from '../Art';
import { card } from './ui';
import { PAIN_ZONES, painsOf, togglePain } from '../../coach/pains';
import { getCoachSettings } from '../../coach/settings';
import { getTodayISODate } from '../../lib/dates';

const chip = on => `px-3 py-1.5 rounded-lg text-xs font-black border ${on ? 'bg-amber-500 border-amber-300 text-slate-950' : 'bg-slate-900 border-slate-700 text-slate-300'}`;

export function PainPicker({ pains, onToggle }) {
  const on = new Set((pains || []).map(p => p.zone));
  return (
    <div className="space-y-1.5" data-testid="pain-picker">
      <div className="flex flex-wrap gap-2">
        {PAIN_ZONES.map(z => <button key={z.id} type="button" aria-pressed={on.has(z.id)} data-testid={`pain-${z.id}`} onClick={() => onToggle(z.id)} className={chip(on.has(z.id))}>{z.label}</button>)}
      </div>
      <p className="text-xs text-slate-400">Les exercices concernés sont signalés et tu peux en changer d’un geste. Douleur vive ou qui dure : arrête et consulte.</p>
    </div>
  );
}

export function CoachPains({ gameState, setGameState }) {
  const pains = painsOf(getCoachSettings(gameState));
  const toggle = zone => setGameState(prev => { const c = getCoachSettings(prev); return { ...prev, coach: { ...c, pains: togglePain(c, zone, getTodayISODate()) } }; });
  return (
    <section className={card} data-testid="coach-pains">
      <h3 className="font-black text-white"><Art name="warn" />J’ai mal quelque part</h3>
      <PainPicker pains={pains} onToggle={toggle} />
    </section>
  );
}
