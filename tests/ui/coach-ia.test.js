// Coach intelligent (API Claude via la fonction Edge « coach-ai ») : accord, discussion qui règle l'appli, dictée souple, programme collé.
// Le faux serveur répond à la place de Claude (srv.ai).
import { afterEach, describe, expect, it } from 'vitest';
import { DEMO_STATE } from './demo';
import { SUPABASE_URL, advance, clickEl, fakeSupabase, launch, pageText, setInput } from './harness';

const open = [];
afterEach(() => { while (open.length) open.pop().close(); });
const TIMEOUT = 120000;
const byTest = (h, id) => h.doc.querySelector(`[data-testid="${id}"]`);
const saved = h => JSON.parse(h.w.localStorage.getItem('rondoudou_save_v1'));

async function logIn(srv, extra = {}) {
  const user = srv.addUser('a@x.fr');
  const h = await launch({
    openCoach: true,
    fetchImpl: srv.fetch,
    storage: {
      __classic: '1',
      'rondoufit:supabase': JSON.stringify({ url: SUPABASE_URL, anonKey: 'anon-public-key' }),
      'rondoufit:account': JSON.stringify({ session: user.session }),
      'rondoufit:lastUser': user.id,
      rondoudou_save_v1: JSON.stringify({ ...DEMO_STATE, onboarded: true, ...extra }),
    },
  });
  open.push(h);
  await advance(h, 600);
  // « Parle à ton coach » est un bouton qui ouvre la fenêtre de discussion
  const b = h.doc.querySelector('[data-testid="coach-chat-open"]');
  if (b) await clickEl(h, b);
  return h;
}
const waitFor = async (h, fn, tries = 40) => { for (let i = 0; i < tries && !fn(); i++) await advance(h, 100); return fn(); };

describe('coach intelligent', () => {
  it('sans compte : bouton « Me connecter » ; connecté : rien n’est envoyé avant l’accord', async () => {
    const srv = fakeSupabase();
    const h = await logIn(srv);
    expect(byTest(h, 'coach-chat')).toBeTruthy();
    expect(byTest(h, 'ai-consent')).toBeTruthy();
    expect(byTest(h, 'coach-chat-input')).toBeFalsy();
    expect(srv.aiCalls || []).toEqual([]);
    await clickEl(h, byTest(h, 'ai-consent'));
    expect(byTest(h, 'coach-chat-input')).toBeTruthy();
    expect(saved(h).aiConsent).toBe(true);
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('je dis mes contraintes en langage courant : il répond, propose, et règle l’appli quand j’accepte', async () => {
    const srv = fakeSupabase();
    srv.ai = async (task, body) => {
      expect(task).toBe('coach');
      expect(body.context).toContain('q_bench_3x8'); // il connaît mes exercices
      expect(body.catalog).toContain('pullups | Tractions Pronation');
      expect(body.messages.at(-1)).toEqual({ role: 'user', content: 'Je peux venir le lundi et le jeudi, 45 minutes. Mon épaule droite tire un peu.' });
      return {
        reply: 'Noté : deux séances, lundi et jeudi, 45 minutes. Pour ton épaule, on reste prudent au développé.',
        actions: [
          { type: 'schedule', label: 'Séances le lundi et le jeudi, 45 min', args: '{"gymDays":[1,4],"sessionMinutes":45,"sessionsPerWeek":2}' },
          { type: 'remember', label: 'Retenir : épaule droite sensible', args: '{"text":"Épaule droite sensible"}' },
          { type: 'adjust', label: 'Exercice inconnu', args: '{"questId":"inconnu","load":10}' }, // refusé par l'appli
        ],
      };
    };
    const h = await logIn(srv, { aiConsent: true });
    await setInput(h, byTest(h, 'coach-chat-input'), 'Je peux venir le lundi et le jeudi, 45 minutes. Mon épaule droite tire un peu.');
    await clickEl(h, byTest(h, 'coach-chat-send'));
    expect(await waitFor(h, () => byTest(h, 'coach-chat-actions'))).toBeTruthy();
    expect(byTest(h, 'coach-chat-log').textContent).toContain('deux séances, lundi et jeudi');
    const proposed = byTest(h, 'coach-chat-actions').textContent;
    expect(proposed).toContain('Séances le lundi et le jeudi, 45 min');
    expect(proposed).not.toContain('Exercice inconnu');
    expect(saved(h).coach.sessionMinutes).not.toBe(45); // rien avant l'accord
    await clickEl(h, byTest(h, 'coach-chat-apply'));
    await advance(h, 300);
    const c = saved(h).coach;
    expect(Object.keys(c.gymSlots).sort()).toEqual(['1', '4']);
    expect(c.sessionMinutes).toBe(45);
    expect(c.memory.map(m => m.text)).toEqual(['Épaule droite sensible']);
    expect(pageText(h)).toContain('C’est réglé.');
    expect(byTest(h, 'coach-chat-upcoming').textContent).toMatch(/Prochaines séances : (lundi|jeudi)/);
    // annuler d'un geste : tout revient comme avant
    await clickEl(h, byTest(h, 'coach-chat-undo'));
    await advance(h, 300);
    const back = saved(h).coach;
    expect(back.gymSlots || {}).toEqual(DEMO_STATE.coach.gymSlots || {});
    expect(back.memory || []).toEqual([]);
    expect(pageText(h)).toContain('Annulé : tout est revenu comme avant.');
    expect(byTest(h, 'coach-chat-undo')).toBeFalsy();
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('serveur pas encore branché : message clair, l’appli continue', async () => {
    const srv = fakeSupabase(); // srv.ai absent = clé de l'API manquante
    const h = await logIn(srv, { aiConsent: true });
    await setInput(h, byTest(h, 'coach-chat-input'), 'Salut');
    await clickEl(h, byTest(h, 'coach-chat-send'));
    await waitFor(h, () => /pas encore branché/.test(byTest(h, 'coach-chat-log')?.textContent || ''));
    expect(byTest(h, 'coach-chat-log').textContent).toContain('pas encore branché');
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('dictée : le coach lit une phrase libre (charges par série, ressenti) ; secours local si besoin', async () => {
    const srv = fakeSupabase();
    srv.ai = async task => {
      expect(task).toBe('dictation');
      return {
        unclear: '',
        items: [{ kind: 'strength', questId: 'q_bench_3x8', catalogId: '', customName: '', sets: [{ reps: 8, kg: 50, assistKg: 0, seconds: 0 }, { reps: 8, kg: 50, assistKg: 0, seconds: 0 }, { reps: 6, kg: 52.5, assistKg: 0, seconds: 0 }], durationMin: 0, distanceKm: 0, rpe: 9, note: '' }],
      };
    };
    const h = await logIn(srv, { aiConsent: true });
    h.w.dispatchEvent(new h.w.CustomEvent('rondoufit-voice'));
    await advance(h, 300);
    const ta = h.doc.querySelector('textarea[placeholder^="Dicte toute"]');
    await setInput(h, ta, 'le truc des pecs à la barre deux fois huit à cinquante puis une à cinquante-deux et demi, la dernière j’ai galéré');
    await clickEl(h, byTest(h, 'voice-ai-read'));
    expect(await waitFor(h, () => /Lu par le coach intelligent/.test(pageText(h)))).toBe(true);
    expect(pageText(h)).toContain('50/50/52.5 kg');
    await clickEl(h, [...h.doc.querySelectorAll('button')].find(b => b.textContent.includes('Valider toute la séance')));
    await advance(h, 300);
    const bench = saved(h).quests.find(q => q.id === 'q_bench_3x8');
    const last = bench.history.at(-1);
    expect(last.setDetails).toEqual([8, 8, 6]);
    expect(last.setLoads).toEqual([50, 50, 52.5]);
    expect(last.value).toBe(52.5);
    expect(last.rpe).toBe(9);
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('dictée : si le coach ne répond pas, la lecture simple reste affichée', async () => {
    const srv = fakeSupabase();
    srv.ai = async () => { throw { status: 429, error: 'quota' }; };
    const h = await logIn(srv, { aiConsent: true });
    h.w.dispatchEvent(new h.w.CustomEvent('rondoufit-voice'));
    await advance(h, 300);
    await setInput(h, h.doc.querySelector('textarea[placeholder^="Dicte toute"]'), 'développé couché 3x8 50 kg');
    await clickEl(h, byTest(h, 'voice-ai-read'));
    await waitFor(h, () => /réessaie demain/.test(pageText(h)));
    expect(pageText(h)).toContain('réessaie demain');
    expect(pageText(h)).toContain('Valider toute la séance');
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('programme collé tel quel : rangé en semaines et séances, prêt à enregistrer', async () => {
    const srv = fakeSupabase();
    srv.ai = async (task, body) => {
      expect(task).toBe('program');
      expect(body.text).toContain('Lundi');
      return { name: 'Programme de Max', notes: 'tempo 3-1-1 non repris', weeks: [
        { sessions: [{ name: 'Haut', dow: 1, lines: ['Développé Couché Barre 4x8 50kg', 'Tractions Pronation 3x6 aide 10kg'] }, { name: 'Bas', dow: 4, lines: ['Squat Barre 4x6 60kg'] }] },
        { sessions: [{ name: 'Haut', dow: 1, lines: ['Développé Couché Barre 4x8 52.5kg', 'Tractions Pronation 3x6 aide 7.5kg'] }, { name: 'Bas', dow: 4, lines: ['Squat Barre 4x6 62.5kg'] }] },
      ] };
    };
    const h = await logIn(srv, { aiConsent: true });
    await clickEl(h, byTest(h, 'program-add'));
    await setInput(h, byTest(h, 'program-paste'), 'Lundi : DC 4x8 à 50, tractions 3x6 élastique 10. Jeudi squat 4x6 à 60. +2,5 kg la semaine suivante. Tempo 3-1-1.');
    await clickEl(h, byTest(h, 'program-ai-read'));
    expect(await waitFor(h, () => byTest(h, 'program-ai-note'))).toBeTruthy();
    expect(byTest(h, 'program-ai-note').textContent).toContain('2 semaines');
    expect(byTest(h, 'program-ai-note').textContent).toContain('tempo');
    expect(h.doc.querySelectorAll('[data-testid="program-session"]')).toHaveLength(2);
    await clickEl(h, byTest(h, 'program-save'));
    await advance(h, 300);
    const p = saved(h).coach.program;
    expect(p.name).toBe('Programme de Max');
    expect(p.weeks).toHaveLength(2);
    expect(p.weeks[1].sessions[0].exercises[0]).toMatchObject({ questId: 'q_bench_3x8', load: 52.5 });
    expect(h.errors).toEqual([]);
  }, TIMEOUT);
});

describe('séance ratée', () => {
  it('une séance prévue hier et pas faite : bouton pour la faire maintenant', async () => {
    const quests = DEMO_STATE.quests.map(q => ({ ...q, history: (q.history || []).filter(e => e.date < '2026-10-16') }));
    const h = await launch({ openCoach: true, storage: { rondoudou_save_v1: JSON.stringify({ ...DEMO_STATE, quests, coach: { ...DEMO_STATE.coach, volleyDays: [], gymSlots: { 2: { start: '18:00', end: '19:30' } } } }) } });
    open.push(h);
    await advance(h, 300);
    const card = byTest(h, 'missed-session');
    expect(card).toBeTruthy();
    expect(card.textContent).toContain('mardi 20 octobre');
    await clickEl(h, byTest(h, 'missed-session-start'));
    await advance(h, 300);
    expect(pageText(h)).toMatch(/Série 1|Terminer la séance|Échauffement/);
    expect(h.errors).toEqual([]);
  }, TIMEOUT);
});

describe('raconte ton passé', () => {
  it('je raconte mon passé : le coach remplit niveau, records, exercices et limites après « Appliquer »', async () => {
    const srv = fakeSupabase();
    srv.ai = async (task, body) => {
      expect(task).toBe('history');
      expect(body.text).toContain('cinq ans');
      expect(body.context).toContain('q_bench_3x8');
      return {
        level: 'advanced', years: 5, breakMonths: 0, weeklySets: 0, methods: ['drop_set'], limits: 'épaule droite fragile',
        exercises: [
          { questId: 'q_bench_3x8', catalogId: '', customName: '', best: { kg: 100, reps: 3 }, bestDate: '2026-06-01', work: { sets: 0, reps: 0, kg: 0 } },
          { questId: '', catalogId: 'deadlift', customName: '', best: { kg: 160, reps: 1 }, bestDate: '', work: { sets: 3, reps: 5, kg: 130 } },
          { questId: '', catalogId: '', customName: 'Machine inventée', best: { kg: 0, reps: 0 }, bestDate: '', work: { sets: 0, reps: 0, kg: 0 } },
        ],
        summary: 'Tu t’entraînes depuis cinq ans.', unclear: '',
      };
    };
    const h = await logIn(srv, { aiConsent: true });
    const fold = h.doc.querySelector('[data-testid="coach-page-reglages"]');
    await clickEl(h, fold);
    expect(byTest(h, 'coach-past')).toBeTruthy();
    await setInput(h, byTest(h, 'past-text'), 'Je fais de la muscu depuis cinq ans, 100 kg pour 3 au développé couché, soulevé de terre 160.');
    await clickEl(h, byTest(h, 'past-send'));
    expect(await waitFor(h, () => byTest(h, 'past-preview'))).toBeTruthy();
    const t = byTest(h, 'past-preview').textContent;
    expect(t).toContain('Avancé');
    expect(t).toContain('pas reconnu');
    expect(saved(h).coach.experience || null).toBeNull(); // rien avant « Appliquer »
    await clickEl(h, byTest(h, 'past-apply'));
    await advance(h, 300);
    const s = saved(h);
    expect(s.coach.experience).toMatchObject({ level: 'advanced', years: 5, methods: ['drop_set'] });
    expect(s.coach.memory.some(m => m.text.includes('épaule droite'))).toBe(true);
    expect(s.quests.find(q => q.id === 'q_bench_3x8').known).toBe(true);
    expect(s.maxRecords.q_bench_3x8.kg).toBeGreaterThan(100); // 100 × 3 → max estimé
    const dl = s.quests.find(q => q.catalogId === 'deadlift');
    expect(dl.startValue).toBe(130); // séance type
    expect(dl.known).toBe(true);
    expect(byTest(h, 'past-done').textContent).toContain('1 exercice(s) ajouté(s)');
    expect(h.errors).toEqual([]);
  }, TIMEOUT);
});

describe('raconte ton passé dans l’assistant d’accueil', () => {
  it('avancé : sans compte, on peut le créer sur place ; connecté, le récit remplit la liste et la fiche', async () => {
    const srv = fakeSupabase();
    const sans = await launch({ empty: true, fetchImpl: srv.fetch, storage: { __classic: '1', 'rondoufit:supabase': JSON.stringify({ url: SUPABASE_URL, anonKey: 'anon-public-key' }) } });
    open.push(sans);
    await advance(sans, 300);
    await clickEl(sans, byTest(sans, 'level-advanced'));
    await clickEl(sans, byTest(sans, 'ob-next'));
    await setInput(sans, sans.doc.getElementById('ob-w'), '80');
    for (let i = 0; i < 3; i++) await clickEl(sans, byTest(sans, 'ob-next'));
    expect(byTest(sans, 'ob-past').textContent).toContain('il faut ton compte');
    expect(byTest(sans, 'ob-past-text')).toBeNull();

    srv.ai = async (task, body) => {
      expect(task).toBe('history');
      expect(body.text).toContain('six ans');
      return {
        level: 'expert', years: 6, breakMonths: 4, weeklySets: 0, methods: [], limits: 'genou gauche',
        exercises: [{ questId: '', catalogId: 'deadlift', customName: '', best: { kg: 170, reps: 2 }, bestDate: '', work: { sets: 4, reps: 5, kg: 140 } }],
        summary: 'Six ans de pratique.', unclear: '',
      };
    };
    const user = srv.addUser('b@x.fr');
    const h = await launch({
      empty: true, fetchImpl: srv.fetch,
      storage: { __classic: '1', 'rondoufit:supabase': JSON.stringify({ url: SUPABASE_URL, anonKey: 'anon-public-key' }), 'rondoufit:account': JSON.stringify({ session: user.session }), 'rondoufit:lastUser': user.id },
    });
    open.push(h);
    await advance(h, 600);
    await clickEl(h, byTest(h, 'level-expert'));
    await clickEl(h, byTest(h, 'ob-next'));
    await setInput(h, h.doc.getElementById('ob-w'), '80');
    for (let i = 0; i < 3; i++) await clickEl(h, byTest(h, 'ob-next'));
    await setInput(h, byTest(h, 'ob-past-text'), 'Je fais de la muscu depuis six ans, soulevé de terre 170 pour 2.');
    await clickEl(h, byTest(h, 'ob-past-send'));
    expect(await waitFor(h, () => byTest(h, 'ob-past-done'))).toBeTruthy();
    expect(byTest(h, 'ob-past-done').textContent).toContain('1 exercice(s)');
    expect(byTest(h, 'ex-deadlift').checked).toBe(true);
    expect(byTest(h, 'kg-deadlift').value).toBe('170');
    expect(byTest(h, 'wkg-deadlift').value).toBe('140');
    await clickEl(h, byTest(h, 'ob-next'));
    expect(byTest(h, 'xp-years').value).toBe('6');
    expect(byTest(h, 'break-6').getAttribute('aria-pressed')).toBe('true');
    for (let i = 0; i < 4 && !byTest(h, 'ob-finish'); i++) await clickEl(h, byTest(h, 'ob-next'));
    await clickEl(h, byTest(h, 'ob-finish'));
    await advance(h, 300);
    const s = saved(h);
    expect(s.aiConsent).toBe(true);
    expect(s.coach.experience).toMatchObject({ level: 'expert', years: 6, breakMonths: 6, limits: 'genou gauche' });
    const dl = s.quests.find(q => q.catalogId === 'deadlift');
    expect(dl.startValue).toBe(125); // séance type 140 kg, −10 % après 4 mois d'arrêt, arrondi à 2,5 kg
    expect(h.errors).toEqual([]);
  }, TIMEOUT);
});

describe('exercices créés par le coach (catalogue commun)', () => {
  it('« ajoute-moi des muscle-up » : le coach crée l’exercice, il rejoint le catalogue et mes exercices', async () => {
    const srv = fakeSupabase();
    srv.ai = async task => {
      if (task === 'coach') return { reply: 'Je t’ajoute le muscle-up.', actions: [{ type: 'create_exercise', label: 'Créer « Muscle-up »', args: '{"name":"Muscle-up","details":"barre fixe, technique"}' }] };
      if (task === 'exercise') return { existing: '', id: 'ai_muscle_up_test', exercise: { name: 'Muscle-up Test', category: 'Dos', muscle: 'Dos', muscle2: 'Triceps', unit: 'reps', timed: false, equip: 'Poids du corps', like: 'pullups', start: 2, goal: 6, sets: 4, reps: 3, icon: '🦍', how: 'Tirage explosif puis passage au-dessus de la barre.', caution: '' }, reply: 'Ajouté.' };
      throw { status: 400, error: 'bad_task' };
    };
    const h = await logIn(srv, { aiConsent: true });
    await setInput(h, byTest(h, 'coach-chat-input'), 'Ajoute-moi des muscle-up');
    await clickEl(h, byTest(h, 'coach-chat-send'));
    expect(await waitFor(h, () => byTest(h, 'coach-chat-apply'))).toBeTruthy();
    await clickEl(h, byTest(h, 'coach-chat-apply'));
    expect(await waitFor(h, () => byTest(h, 'coach-chat-note'))).toBeTruthy();
    expect(byTest(h, 'coach-chat-note').textContent).toContain('catalogue de tous les utilisateurs');
    await advance(h, 300);
    const q = saved(h).quests.find(x => x.catalogId === 'ai_muscle_up_test');
    expect(q).toBeTruthy();
    expect(q.unit).toBe('reps');
    expect(q.muscle).toBe('Dos');
    expect(srv.aiCalls.some(c => c.task === 'exercise')).toBe(true);
    expect(h.errors).toEqual([]);
  }, TIMEOUT);

  it('un exercice créé par quelqu’un d’autre arrive dans mon catalogue', async () => {
    const srv = fakeSupabase();
    srv.sharedEx = [{ id: 'ai_dragon_flag_test', data: { name: 'Dragon Flag Test', category: 'Abdominaux', muscle: 'Abdominaux', muscle2: '', unit: 'reps', timed: false, equip: 'Banc', like: 'hanging_leg_raises', start: 3, goal: 8, sets: 3, reps: 5, icon: '🐉', how: '', caution: '' } }];
    const h = await logIn(srv, { aiConsent: true });
    await advance(h, 800);
    const cache = JSON.parse(h.w.localStorage.getItem('rondoufit:sharedEx') || '[]');
    expect(cache.some(r => r.id === 'ai_dragon_flag_test' && r.data.name === 'Dragon Flag Test')).toBe(true);
    expect(h.errors).toEqual([]);
  }, TIMEOUT);
});

describe('programme d’un coach extérieur : exercices inconnus et lest', () => {
  it('muscle-up inconnu : créé par le coach à l’enregistrement ; dips lestés : lest gardé', async () => {
    const srv = fakeSupabase();
    srv.ai = async (task, body) => {
      if (task !== 'exercise') throw { status: 400, error: 'bad_task' };
      expect(body.text).toContain('Muscle-up');
      return { existing: '', id: 'ai_muscle_up_prog', exercise: { name: 'Muscle-up Prog', category: 'Dos', muscle: 'Dos', muscle2: 'Triceps', unit: 'reps', timed: false, equip: 'Poids du corps', like: 'pullups', start: 2, goal: 6, sets: 3, reps: 3, icon: '🦍', how: '', caution: '' }, reply: 'Ajouté.' };
    };
    const h = await logIn(srv, { aiConsent: true });
    await clickEl(h, byTest(h, 'program-add'));
    const area = h.doc.querySelector('[data-testid="program-text"]');
    await setInput(h, area, 'Muscle-up lesté top set 1x2 +17,5 kg RIR 2\nDips lestés 3x8-10 +52,5 kg, dernière série RIR 1');
    expect(h.doc.body.textContent).toContain('le coach le cherchera');
    expect(h.doc.body.textContent).toContain('lest +52,5 kg');
    await clickEl(h, byTest(h, 'program-save'));
    await waitFor(h, () => saved(h).coach && saved(h).coach.program);
    await advance(h, 300);
    const s = saved(h);
    const mu = s.quests.find(q => q.catalogId === 'ai_muscle_up_prog');
    expect(mu).toBeTruthy();
    const exs = s.coach.program.weeks[0].sessions[0].exercises;
    expect(exs.find(e => e.questId === mu.id)).toMatchObject({ sets: 1, reps: [2], assist: -17.5 });
    const dips = s.quests.find(q => q.catalogId === 'dips');
    expect(exs.find(e => e.questId === dips.id)).toMatchObject({ sets: 3, assist: -52.5 });
    expect(h.errors).toEqual([]);
  }, TIMEOUT);
});
