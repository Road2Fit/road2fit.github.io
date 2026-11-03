// Dictée lue par le coach intelligent : sa réponse (séries par exercice) est convertie dans le même format que l'analyse locale
// (voice/parser.js), pour réutiliser l'aperçu et l'enregistrement de VoiceWorkoutAssistant.
import { calculateCardioCalories, calculateStrengthCalories } from '../lib/calories';
import { assistText } from '../lib/assist';
import { EXERCISE_CATALOG } from '../data/catalog';
import { isTimedCatalog, isTimedQuest } from '../lib/quests';
import { METHODS, methodLabel } from '../coach/methods';

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const r1 = v => Math.round(v * 10) / 10;

export function aiDictationItems(data, state) {
  const items = Array.isArray(data && data.items) ? data.items : [];
  const userWeightKg = Number(state.userWeightKg) || 80;
  const out = [];
  items.forEach((it, idx) => {
    if (!it || typeof it !== 'object') return;
    const quest = (state.quests || []).find(q => q.id === it.questId) || null;
    const cat = quest ? EXERCISE_CATALOG.find(c => c.id === quest.catalogId) || null : EXERCISE_CATALOG.find(c => c.id === it.catalogId) || null;
    const ref = quest || cat;
    const name = ref ? ref.name : String(it.customName || '').trim().slice(0, 60);
    if (!name) return;
    const cardio = ref ? ref.type === 'cardio' : it.kind === 'cardio';
    const rpe = n(it.rpe) >= 1 && n(it.rpe) <= 10 ? Math.round(n(it.rpe)) : 0;
    const note = String(it.note || '').trim().slice(0, 140);
    const base = { id: `ai_${idx}_${Date.now()}`, questId: quest ? quest.id : null, catalogRef: quest ? undefined : cat || undefined, name, icon: (ref && ref.icon) || (cardio ? '🏃' : '🏋️'), rpe, aiNote: note, fromAi: true };

    if (cardio) {
      const unit = (ref && ref.unit) || (n(it.distanceKm) > 0 ? 'km' : 'min');
      const dist = r1(Math.max(0, n(it.distanceKm)));
      const dur = Math.round(Math.max(0, n(it.durationMin)) || (dist ? dist * 6 : 30));
      if (unit === 'km' && !dist && !n(it.durationMin)) return;
      out.push({
        ...base, category: (ref && ref.category) || 'Course & Cardio', type: 'cardio', unit,
        distanceKm: dist, durationMin: dur,
        calories: calculateCardioCalories({ cardioMode: (ref && ref.cardioMode) || 'run', distanceKm: dist, durationMin: dur, elevationM: 0, rpe: rpe || 7, userWeightKg }),
        summary: unit === 'min' || !dist ? `${dur} min` : `${dist} km en ${dur} min`,
      });
      return;
    }

    // les séries d'échauffement ne sont jamais enregistrées ; les autres gardent leur type (série lourde, dégressive, mini-série…)
    const sets = (Array.isArray(it.sets) ? it.sets : []).filter(s => s && s.kind !== 'warmup' && (n(s.reps) > 0 || n(s.seconds) > 0)).slice(0, 15);
    if (!sets.length) return;
    const timed = quest ? isTimedQuest(quest) : cat ? isTimedCatalog(cat) : sets.every(s => n(s.seconds) > 0 && !n(s.reps));
    const anyKg = sets.some(s => n(s.kg) > 0);
    const unit = (ref && ref.unit) || (anyKg ? 'kg' : 'reps');
    const setDetails = sets.map(s => Math.round(timed ? n(s.seconds) || n(s.reps) : n(s.reps) || n(s.seconds)));
    const loads = sets.map(s => r1(n(s.kg)));
    // exercice au poids du corps : des kilos dits = du lest (aide négative, lib/assist.js)
    const assists = sets.map(s => (unit === 'reps' && n(s.kg) > 0 ? -r1(n(s.kg)) : r1(Math.max(0, n(s.assistKg)))));
    const weightKg = unit === 'kg' ? (anyKg ? Math.max(...loads) : n(quest && quest.currentValue)) : Math.max(...setDetails);
    const assistanceKg = unit === 'reps' ? Math.min(...assists) : 0;
    const differs = arr => arr.some(v => v !== arr[0]);
    const kinds = sets.map(s => (['top', 'backoff', 'drop', 'mini', 'amrap', 'cluster'].includes(s.kind) ? s.kind : 'work'));
    const method = METHODS[it.method] && it.method !== 'straight' ? it.method : null;
    out.push({
      ...base, category: (ref && ref.category) || 'Pectoraux', type: 'strength', unit, timed,
      weightKg, assistanceKg, setDetails,
      setLoads: unit === 'kg' && anyKg && differs(loads) ? loads : undefined,
      setAssists: unit === 'reps' && differs(assists) ? assists : undefined,
      setKinds: kinds.some(k => k !== 'work') ? kinds : undefined,
      method: method || undefined,
      calories: calculateStrengthCalories({ unit, timed, weightKg: unit === 'kg' ? weightKg : 0, assistanceKg, setDetails, rpe: rpe || 7, userWeightKg }),
      summary: `${unit === 'kg' ? (differs(loads) && anyKg ? `${loads.join('/')} kg • ` : `${weightKg} kg • `) : ''}[${setDetails.join(' - ')} ${timed ? 's' : 'reps'}]${unit === 'reps' && !timed && assistanceKg ? ` (${assistText(assistanceKg)})` : ''}${rpe ? ` • ressenti ${rpe}/10` : ''}${method ? ` • ${methodLabel(method)}` : ''}`,
    });
  });
  return out;
}
