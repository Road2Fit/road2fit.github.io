// Test comparatif des modèles du coach intelligent (13/11/2026, demande de Gabin : Haiku 5.5 suffit-il pour le coach ?).
// Envoie les mêmes demandes réalistes à la fonction Edge `coach-ai` en « mode test » (secret EVAL_TOKEN posé seulement
// pendant le test : sans compte, sans quota, rien d'écrit), une fois avec Sonnet, une fois avec Haiku, puis note chaque
// réponse : actions valides (mêmes vérifications que l'appli), bonne action, bonnes dates, pas d'avis médical hasardeux.
// Usage : EVAL_TOKEN_FILE=<fichier contenant le jeton> npx vite-node tools/coach-eval.mjs [nombre de répétitions]
import fs from 'fs';
import { DEMO_STATE } from '../tests/ui/demo.js';
import { catalogText, coachContext } from '../src/ai/context.js';
import { normalizeActions } from '../src/ai/actions.js';

const URL = 'https://vvsmienmspftdzqykhnt.supabase.co/functions/v1/coach-ai';
const TOKEN = fs.readFileSync(process.env.EVAL_TOKEN_FILE, 'utf8').trim();
const TODAY = '2026-11-13'; // vendredi
const REPEAT = Number(process.argv[2]) || 1;
const PRICE = { // $ par million de tokens : entrée, lecture du cache, écriture du cache, sortie
  smart: { in: 2, cr: 0.1, cw: 2.5, out: 10 },
  fast: { in: 0.1, cr: 0.01, cw: 0.125, out: 0.5 },
};

// Gabin-like : volley jeudi et vendredi, 3 séances, quelques exercices suivis
const state = {
  ...DEMO_STATE, onboarded: true, aiConsent: true, userWeightKg: 80, targetWeightKg: 80,
  quests: [
    ...DEMO_STATE.quests,
    { id: 'q_curl', catalogId: 'fp_db_curl', name: 'Curl Haltères', category: 'Épaules & Bras', type: 'strength', unit: 'kg', goalMode: 'sets_reps', startValue: 10, currentValue: 12, goalValue: 18, goalSets: 3, goalReps: 10, setDetails: [10, 10, 10], history: [] },
  ],
  coach: { ...DEMO_STATE.coach, sessionsPerWeek: 3, sport: 'volley', volleyDays: [4, 5], gymSlots: {}, profile: { sex: 'm', age: 28, heightCm: 180 } },
};
const context = coachContext(state, TODAY);
const catalog = catalogText();

const types = acts => acts.map(a => a.type);
const has = (acts, t) => acts.find(a => a.type === t);
const said = (reply, re) => re.test(String(reply || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''));
// chaque scénario : message + vérification (renvoie '' si bon, sinon la raison)
const S = [
  ['PPL 3 séances', 'Je veux faire du push pull legs, 3 séances par semaine.', a => { const s = has(a, 'schedule'); return s && s.args.split === 'ppl' && s.args.sessionsPerWeek === 3 ? '' : 'schedule ppl × 3 attendu'; }],
  ['Isométrie demain', 'Demain je veux une séance axée sur l’isométrie.', a => { const s = has(a, 'day_style'); return s && s.args.dates.includes('2026-11-14') && [].concat(s.args.style).some(x => /^iso/.test(x)) ? '' : 'day_style iso le 14 attendu'; }],
  ['Programme volley', 'Fais-moi des entraînements pour progresser au volley.', a => { const s = has(a, 'plyo'); return s && (s.args.perWeek || 0) >= 1 ? '' : 'plyo (volley, ≥ 1 séance) attendu'; }],
  ['Douleur genou', 'J’ai mal au genou droit depuis hier quand je descends les escaliers.', (a, r) => (said(r, /medecin|kine|professionnel|sante/) ? '' : 'renvoi vers un professionnel de santé attendu')],
  ['Pas de salle lundi', 'Je ne pourrai pas aller à la salle lundi.', a => { const s = has(a, 'skip'); return s && s.args.dates.includes('2026-11-16') ? '' : 'skip le lundi 16 attendu (séance prévue ce jour-là)'; }],
  ['Séance en plus dimanche', 'Ajoute-moi une séance en plus dimanche.', a => { const s = has(a, 'extra_session'); return s && s.args.add.includes('2026-11-15') ? '' : 'extra_session le 15 attendu'; }],
  ['Ajouter fentes bulgares', 'Ajoute les fentes bulgares à mes exercices.', a => { const s = has(a, 'add_exercise'); return s && s.args.catalogId === 'fp_bulgarian' ? '' : 'add_exercise fp_bulgarian attendu'; }],
  ['Perdre 5 kg', 'Je veux perdre 5 kg d’ici l’été.', a => (has(a, 'main_goal') || has(a, 'body') ? '' : 'main_goal ou body (poids visé) attendu')],
  ['Dégressives au curl', 'Mets-moi des séries dégressives sur le curl.', a => { const s = has(a, 'method'); return s && s.args.questId === 'q_curl' && s.args.method === 'drop_set' ? '' : 'method drop_set sur q_curl attendu'; }],
  ['Crevé aujourd’hui', 'Je suis crevé aujourd’hui, j’ai très mal dormi.', a => { const s = has(a, 'feeling'); return s && s.args.level === 'low' ? '' : 'feeling low attendu'; }],
  ['Séries pour les pecs', 'Combien de séries par semaine pour faire grossir les pecs ?', (a, r) => (a.length === 0 && said(r, /10|dix/) ? '' : 'réponse sans action, repère ~10 séries attendu')],
  ['Haut du corps mercredi', 'Je veux une séance haut du corps mercredi.', a => { const s = has(a, 'day_theme'); return s && s.args.dates.includes('2026-11-18') && s.args.theme === 'UPPER' ? '' : 'day_theme UPPER le 18 attendu'; }],
  ['Iso + explosif demain', 'Demain je veux mélanger isométrie et explosif.', a => { const s = has(a, 'day_style'); const st = s ? [].concat(s.args.style) : []; return s && s.args.dates.includes('2026-11-14') && st.some(x => /^iso/.test(x)) && st.includes('expl') ? '' : 'day_style iso + expl le 14 attendu'; }],
  ['Arrêter le cardio', 'Arrête de me programmer du cardio.', a => { const s = has(a, 'cardio'); return s && s.args.on === false ? '' : 'cardio on:false attendu'; }],
  ['4 séances fixes', 'Je m’entraîne maintenant 4 fois par semaine : lundi, mardi, jeudi et vendredi.', a => { const s = has(a, 'schedule'); return s && s.args.sessionsPerWeek === 4 && JSON.stringify(s.args.gymDays) === JSON.stringify([1, 2, 4, 5]) ? '' : 'schedule 4 séances lun/mar/jeu/ven attendu'; }],
  ['Match samedi', 'J’ai un match de volley samedi.', a => { const s = has(a, 'matches'); return s && s.args.add.includes('2026-11-14') ? '' : 'matches le 14 attendu'; }],
  ['Tendinite épaule', 'Retiens que j’ai une tendinite à l’épaule gauche.', (a, r) => (has(a, 'remember') && said(r, /medecin|kine|professionnel|sante/) ? '' : has(a, 'remember') ? 'remember ok, mais pas de renvoi vers un professionnel' : 'remember attendu')],
  ['Mode muscles détaillé', 'Passe-moi en suivi des muscles détaillé.', a => { const s = has(a, 'muscle_mode'); return s && s.args.mode === 'optimized' ? '' : 'muscle_mode optimized attendu'; }],
  ['Reprendre la course', 'Je veux me remettre à courir, 2 fois par semaine.', a => { const s = has(a, 'cardio'); return s && s.args.on !== false ? '' : 'cardio activé attendu'; }],
  ['Détente basket', 'Je joue aussi au basket, je veux sauter plus haut.', a => (has(a, 'plyo') ? '' : 'plyo attendu')],
  ['Objectif développé couché', 'Mon objectif c’est 100 kg au développé couché.', a => { const s = has(a, 'main_goal'); return s && s.args.questId === 'q_bench_3x8' ? '' : 'main_goal force sur le développé couché attendu'; }],
  ['Varier les formes', 'J’ai envie de varier les formes de séries, j’en ai marre des séries classiques.', a => { const s = has(a, 'method_style'); return s && /variety|varied/.test(s.args.style) ? '' : 'method_style variety attendu'; }],
  ['Question sans action', 'C’est quoi la différence entre isométrique et excentrique ?', (a, r) => (a.length === 0 && said(r, /tenir|position|freine|descente/) ? '' : 'explication sans action attendue')],
  ['Pousser aujourd’hui tirer demain', 'Aujourd’hui je veux pousser et demain tirer.', a => { const t = a.filter(x => x.type === 'day_theme'); const ok = t.some(x => x.args.dates.includes('2026-11-13') && x.args.theme === 'PUSH') && t.some(x => x.args.dates.includes('2026-11-14') && x.args.theme === 'PULL'); return ok ? '' : 'day_theme PUSH le 13 et PULL le 14 attendus'; }],
];

async function ask(model, text) {
  const t0 = Date.now();
  const r = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-eval-token': TOKEN }, body: JSON.stringify({ task: 'coach', evalModel: model, messages: [{ role: 'user', content: text }], context, catalog }) });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok && j.ok, status: r.status, data: j.data || {}, err: j.error, ms: Date.now() - t0 };
}

const out = [];
for (let k = 0; k < REPEAT; k++) {
  for (const [name, text, check] of S) {
    for (const model of ['smart', 'fast']) {
      const res = await ask(model, text);
      const raw = Array.isArray(res.data.actions) ? res.data.actions : [];
      const acts = normalizeActions(raw, state, TODAY);
      const u = res.data.usage || {};
      const p = PRICE[model];
      const cost = ((u.input || 0) * p.in + (u.cacheRead || 0) * p.cr + (u.cacheWrite || 0) * p.cw + (u.output || 0) * p.out) / 1e6;
      const why = !res.ok ? `erreur ${res.status} ${res.err || ''}` : check(acts, res.data.reply || '');
      out.push({ name, model, ok: !why, why, rejected: raw.length - acts.length, types: types(acts), reply: String(res.data.reply || '').slice(0, 400), cost, ms: res.ms });
      process.stdout.write(`${model === 'smart' ? 'S' : 'H'}${why ? '✗' : '✓'} `);
    }
  }
}
fs.writeFileSync(process.env.EVAL_OUT || 'coach-eval.json', JSON.stringify(out, null, 1));
const sum = m => { const r = out.filter(x => x.model === m); return { bons: r.filter(x => x.ok).length, total: r.length, rejetees: r.reduce((n, x) => n + x.rejected, 0), cout: r.reduce((n, x) => n + x.cost, 0).toFixed(4), ms: Math.round(r.reduce((n, x) => n + x.ms, 0) / r.length) }; };
console.log('\nSonnet', JSON.stringify(sum('smart')), '\nHaiku ', JSON.stringify(sum('fast')));
