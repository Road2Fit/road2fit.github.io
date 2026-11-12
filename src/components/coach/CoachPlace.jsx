// Lieu d'entraînement et matériel (4.22) : réglage (Réglages du Coach, assistant d'accueil) et notification de la page Séance
// quand des exercices suivis ne sont pas faisables chez soi.
import { Art } from '../Art';
import { card } from './ui';
import { HOME_EQUIPMENT, PLACES, equipmentOf, missingText, placeOf, undoableQuests } from '../../coach/equipment';
import { getCoachSettings } from '../../coach/settings';
import { applyHomeSwap, homeSwapPlan } from '../../lib/homeSwap';
import { getTodayISODate } from '../../lib/dates';

const chip = on => `px-3 py-1.5 rounded-lg text-xs font-black border ${on ? 'bg-pink-600 border-pink-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300'}`;

/** Choix du lieu, puis du matériel possédé (seulement si on s'entraîne aussi chez soi). */
export function PlacePicker({ place, equipment, onChange, chipClass = chip }) {
  const toggle = id => onChange({ equipment: equipment.includes(id) ? equipment.filter(x => x !== id) : [...equipment, id] });
  return (
    <div className="space-y-2" data-testid="place-picker">
      <div className="flex flex-wrap gap-2">
        {PLACES.map(p => <button key={p.id} type="button" aria-pressed={place === p.id} data-testid={`place-${p.id}`} onClick={() => onChange({ place: p.id })} className={chipClass(place === p.id)}>{p.label}</button>)}
      </div>
      {place !== 'gym' && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold text-slate-400">Ton matériel à la maison (le poids du corps suffit pour commencer)</p>
          <div className="flex flex-wrap gap-2" data-testid="equip-list">
            {HOME_EQUIPMENT.map(e => <button key={e.id} type="button" aria-pressed={equipment.includes(e.id)} data-testid={`equip-${e.id}`} onClick={() => toggle(e.id)} className={chipClass(equipment.includes(e.id))}>{e.label}</button>)}
          </div>
        </div>
      )}
    </div>
  );
}

function useSwap(gameState, setGameState, triggerToast) {
  const plan = homeSwapPlan(gameState);
  const run = () => {
    let names = [];
    setGameState(prev => { const r = applyHomeSwap(prev, getTodayISODate()); names = r.added; return r.state; });
    if (triggerToast) triggerToast(names.length ? 'Séances adaptées à la maison' : 'Rien à ajouter', names.length ? `Ajouté : ${names.join(', ')}` : 'Tes exercices faisables couvrent déjà ces muscles.');
  };
  return { plan, run, toAdd: plan.filter(p => p.alt) };
}

/** Carte des Réglages : « Où tu t'entraînes ». */
export function CoachPlace({ gameState, setGameState, triggerToast }) {
  const coach = getCoachSettings(gameState);
  const place = placeOf(coach), equipment = equipmentOf(coach);
  const set = p => setGameState(prev => ({ ...prev, coach: { ...getCoachSettings(prev), ...p } }));
  const { plan, run, toAdd } = useSwap(gameState, setGameState, triggerToast);
  return (
    <section className={card} data-testid="coach-place">
      <h3 className="font-black text-white"><Art name="lifter" />Où tu t’entraînes</h3>
      <PlacePicker place={place} equipment={equipment} onChange={set} />
      {place === 'home' && plan.length > 0 && (
        <div className="space-y-1.5 rounded-xl border border-amber-500/40 bg-slate-950 p-3 text-xs" data-testid="place-undoable">
          <p className="font-bold text-amber-100">Pas faisables chez toi : le coach ne les programme plus (leur historique est gardé).</p>
          <ul className="space-y-0.5 text-slate-300">
            {plan.map(({ quest, alt, covered }) => (
              <li key={quest.id}>{quest.name} <span className="text-slate-500">({missingText(quest, coach)})</span>{alt ? <span className="text-emerald-300"> → {alt.name}</span> : covered ? <span className="text-slate-500"> · muscle déjà couvert</span> : null}</li>
            ))}
          </ul>
          {toAdd.length > 0 && <button type="button" onClick={run} data-testid="place-swap" className="w-full py-2 rounded-xl bg-pink-600 text-white font-black">Ajouter {toAdd.length > 1 ? `ces ${toAdd.length} exercices` : 'cet exercice'} à la place</button>}
        </div>
      )}
    </section>
  );
}

/** Notification de la page Séance : exercices à remplacer pour s'entraîner chez soi (disparaît une fois réglé). */
export function EquipNotice({ gameState, setGameState, triggerToast }) {
  const { run, toAdd } = useSwap(gameState, setGameState, triggerToast);
  if (!undoableQuests(gameState).length || !toAdd.length) return null;
  return (
    <section data-testid="notif-equip" className="rounded-2xl border border-amber-500/50 bg-slate-900/80 px-3 py-1.5 flex items-center gap-2">
      <Art name="lifter" size={22} bare />
      <span className="flex-1 min-w-0 text-sm font-black text-white leading-tight">{toAdd.length} exercice{toAdd.length > 1 ? 's' : ''} à remplacer pour la maison</span>
      <button type="button" onClick={run} data-testid="equip-swap" className="shrink-0 px-3 py-1.5 rounded-xl bg-pink-600 text-white text-xs font-black">Remplacer</button>
    </section>
  );
}
