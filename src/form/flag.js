// Signaler une analyse vidéo fausse (4.38, demande de Gabin : « comme pour les animations », pour que Claude les analyse
// quand il le demande). Ce qui part dans la table Supabase `form_flags` : le squelette de la série (positions des points
// du corps, en chiffres, allégé), l'exercice, ce que l'algorithme a trouvé et ce que la personne dit être juste.
// JAMAIS l'image ni la vidéo. Chaque compte ne lit que ses signalements (docs/supabase-signalements-video.sql).

// Dernière série filmée : ses images (repères) gardées en mémoire jusqu'à la suivante, avec ou sans vidéo enregistrée.
let last = null;
export function keepSeries(s) { last = s || null; }
export const getSeries = id => (last && id && last.id === id ? last : null);

export const FLAG_PROBLEMS = [
  { id: 'count', label: 'Mauvais nombre de reps' },
  { id: 'chin', label: 'Menton mal jugé', chinOnly: true },
  { id: 'person', label: 'Mauvaise personne suivie' },
  { id: 'advice', label: 'Conseils faux' },
  { id: 'other', label: 'Autre' },
];

const r3 = x => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 : null);
const pts = lm => (Array.isArray(lm) ? lm.map(p => (p ? [r3(p.x), r3(p.y), r3(p.z), r3(p.visibility)] : null)) : null);

/** Images allégées : au plus `fps` images par seconde, 3 décimales ; t en ms depuis le début. */
export function compactFrames(frames, fps = 15) {
  const list = Array.isArray(frames) ? frames : [];
  if (!list.length) return [];
  const t0 = list[0].t;
  const step = 1000 / fps;
  const out = [];
  let next = -Infinity;
  list.forEach(f => {
    if (f.t < next) return;
    next = f.t + step - 1;
    out.push({ t: Math.round(f.t - t0), lm: pts(f.lm), wl: pts(f.wl) });
  });
  return out;
}

const MAX_CHARS = 2_500_000;

/** Contenu du signalement envoyé. */
export function buildFlag({ series, result, item, problems = [], trueReps = null, note = '', noted = null, appVersion = '' }) {
  const r = result || {};
  const base = {
    v: 1,
    at: new Date().toISOString(),
    appVersion,
    exercise: { catalogId: (item && item.catalogId) || '', name: String((item && item.name) || '').slice(0, 80), timed: !!(item && item.timed) },
    pattern: (series && series.pattern) || r.pattern || '',
    problems: problems.filter(p => FLAG_PROBLEMS.some(x => x.id === p)),
    trueReps: Number.isFinite(trueReps) ? trueReps : null,
    noted: Number.isFinite(noted) ? noted : null,
    note: String(note || '').replace(/\s+/g, ' ').trim().slice(0, 500),
    result: {
      ok: !!r.ok, repCount: r.repCount ?? null, verdict: r.verdict || '', summary: String(r.summary || r.message || '').slice(0, 300),
      findings: (r.findings || []).map(f => ({ id: f.id, level: f.level, title: f.title, reps: f.reps || null })),
      reps: (r.reps || []).map(x => ({ t0: x.t0, t1: x.t1 })),
      holdSec: r.holdSec ?? null, view: r.view || '', chin: r.chin ? { raw: r.chin.raw, cal: r.chin.cal } : null,
    },
    camera: series ? { aspect: series.aspect, mirror: !!series.mirror, targetReps: series.targetReps || 0, chinCal: series.chinCal ?? null } : null,
  };
  let fps = 15;
  let frames = compactFrames(series && series.frames, fps);
  let data = { ...base, frames };
  while (JSON.stringify(data).length > MAX_CHARS && fps > 2) {
    fps = Math.floor(fps / 2);
    frames = compactFrames(series && series.frames, fps);
    data = { ...base, frames, fps };
  }
  return { ...data, fps };
}
