import { estimateQuestMax, formatDuration } from '../lib/maxima';
import { getTodayISODate } from '../lib/dates';
import { ARENA_GROUPS } from '../data/arenas';
import { hasArena } from '../data/muscles';
import { fmtCm, perfBest, perfOf } from '../data/perfMeasure';

// 4.51.4 (choix de Gabin, option A) : « Mes maxima » en haut de l'onglet Exercices : tous les maxima d'un coup d'œil
// (max estimé, record réel noté et sa date) ; toucher une ligne ouvre la fiche de l'exercice sur son maximum
// (MaxCard : détail du calcul, noter un record). Même calcul que la fiche et que le coach (lib/maxima.js).
const fmt = x => String(Math.round(Number(x) * 10) / 10).replace('.', ',');
const half = x => Math.round(Number(x) * 2) / 2;
const fmtDate = iso => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '');

/** Max estimé en une ligne courte, selon le type d'exercice. */
export function maxLine(r) {
  if (!r || r.empty) return null;
  if (r.kind === 'load') return `≈ ${fmt(half(r.estimate))} kg`;
  if (r.kind === 'assisted') return r.extraFor1 > 0 ? `≈ +${fmt(half(r.extraFor1))} kg de lest` : r.assistFor1 > 0 ? `≈ ${fmt(half(r.assistFor1))} kg d’aide` : 'sans aide';
  if (r.kind === 'bodyweight') return r.extraFor1 > 0 ? `≈ +${fmt(half(r.extraFor1))} kg de lest` : 'poids du corps';
  if (r.kind === 'timed') return r.best ? `${r.best.seconds} s` : null;
  if (r.kind === 'cardio') { const p = (r.predictions || []).find(x => x.km === 5) || (r.predictions || [])[0]; return p ? `${fmt(p.km)} km ≈ ${formatDuration(p.min)}` : null; }
  return null;
}
/** Record réel noté (« Mon max réel »), en une ligne. */
export function recordLine(m, kind) {
  if (!m) return null;
  if (kind === 'load') return `${fmt(m.kg)} kg`;
  if (kind === 'assisted') return Number(m.extraKg) > 0 ? `+${fmt(m.extraKg)} kg` : `${fmt(m.assistKg)} kg d’aide`;
  if (kind === 'bodyweight') return `+${fmt(m.extraKg)} kg`;
  if (kind === 'timed') return `${m.seconds} s`;
  if (kind === 'cardio') return `${fmt(m.distanceKm)} km en ${fmt(m.minutes)} min`;
  return null;
}

export function MaximaTable({ gameState, questFilter = 'all', onOpen, onClose }) {
  const today = getTodayISODate();
  const quests = (gameState.quests || []).filter(q => q.goalMode !== 'free_mode' && (questFilter === 'all' || hasArena(q, questFilter)));
  const rank = q => { const i = ARENA_GROUPS.findIndex(g => hasArena(q, g.id)); return i < 0 ? 99 : i; };
  const rows = quests
    .map(q => {
      // sauts mesurés (4.52) : la hauteur (caisse) ou la distance record, pas un lest
      const pf = perfOf(q);
      if (pf) { const b = perfBest(q); return { q, r: {}, est: b ? `${pf.kind === 'setting' ? `${pf.short} ` : ''}${fmtCm(b.cm)}` : null, rec: null }; }
      const r = estimateQuestMax(q, gameState, { useRpe: true, today }); return { q, r, est: maxLine(r), rec: recordLine(r && r.manual, r && r.kind) };
    })
    .sort((a, b) => (a.est || a.rec ? 0 : 1) - (b.est || b.rec ? 0 : 1) || rank(a.q) - rank(b.q) || a.q.name.localeCompare(b.q.name));
  return (
    <div className="fixed inset-0 z-[55] bg-slate-950/80 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="min-h-full flex items-end sm:items-center justify-center px-3 pt-14 pb-3">
        <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3" onClick={e => e.stopPropagation()} role="dialog" aria-label="Mes maxima" data-testid="maxima-table">
          <button type="button" onClick={onClose} aria-label="Fermer" className="absolute -top-11 right-0 w-9 h-9 rounded-lg bg-slate-800 text-slate-300 font-black">✕</button>
          <div>
            <h3 className="text-lg font-black text-white">🏆 Mes maxima</h3>
            <p className="text-xs text-slate-400">Ce que tu pourrais faire en une répétition (ou ta meilleure performance), calculé d’après tes séances et ton ressenti. Le coach s’en sert pour tes charges et tes tests de max. Touche un exercice pour le détail ou pour noter un record réel.</p>
          </div>
          <div className="divide-y divide-slate-800">
            {rows.map(({ q, est, rec, r }) => (
              <button key={q.id} type="button" onClick={() => onOpen(q.id)} data-testid={`maxima-row-${q.id}`} className="tap-free w-full flex items-center gap-3 py-2.5 text-left">
                <span className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">{q.icon}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-white truncate">{q.name}</span>
                  {rec ? <span className="block text-[11px] text-emerald-300 font-bold">Record réel : {rec}{r.manual && r.manual.date ? ` (le ${fmtDate(r.manual.date)})` : ''}</span> : !est && <span className="block text-[11px] text-slate-500">Pas encore assez de séances</span>}
                </span>
                {est && <span className="shrink-0 text-sm font-black text-pink-300" data-testid="maxima-est">{est}</span>}
                <span className="shrink-0 text-slate-500">›</span>
              </button>
            ))}
            {!rows.length && <p className="py-3 text-sm text-slate-400">Aucun exercice pour l’instant.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
