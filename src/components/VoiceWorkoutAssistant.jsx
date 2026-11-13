import { useEffect, useRef, useState } from 'react';
import { PROFILES, profileOpts } from '../coach/profiles';
import { coachIsCompound } from '../coach/settings';

import { isTimedCatalog } from '../lib/quests';
import { stripAccents } from '../lib/text';
import { parseSpokenWorkout } from '../voice/parser';
import { computeXp, xpNote } from '../lib/xp';
import { addDaysISO, formatDayFr, getTodayISODate, getWeekStart } from '../lib/dates';
import { nextSpokenDate, spokenDate } from '../voice/spokenDate';
import { coachOverview } from '../coach/advice';
import { cardioPlanWeek } from '../coach/cardio';
import { pick } from '../edition';
import { arenaOf } from '../data/muscles';
import { aiStatus, callAi } from '../ai/client';
import { aiDictationItems } from '../ai/dictation';
import { catalogText, dictationContext } from '../ai/context';
import { createExerciseWithAi } from '../ai/exercise';
import { EXERCISE_CATALOG } from '../data/catalog';
import { Art } from './Art';
import { startListening } from '../voice/mic';

// « sans élastique », « sans aide », « sans lest », « au poids du corps » dit pour CET exercice (dans sa partie de phrase)
const normTxt = t => stripAccents(String(t || '').toLowerCase()).replace(/[’']/g, ' ');
export function saidNoAid(text, item) {
  const t = normTxt(text);
  const words = normTxt(item && item.name).split(/[^a-z]+/).filter(w => w.length >= 4);
  for (const w of words) {
    const i = t.indexOf(w.slice(0, 5));
    if (i < 0) continue;
    const rest = t.slice(i);
    const end = rest.search(/,|;|\bpuis\b|\bet (?:du|de la|des|un|une|le|la|les)\b/);
    const part = end > 0 ? rest.slice(0, end) : rest;
    if (/sans (elastique|aide|lest|assistance)|au poids du corps|poids du corps/.test(part)) return true;
  }
  return false;
}

// Nouvel exercice créé d'après un exercice dicté (séance faite ou prochaine séance)
function newQuestFromItem(item, prev, history) {
  // profil du moment (sauf cardio et exercices chronométrés)
  const profileId = profileOpts(prev, getTodayISODate()).profile;
  const voiceProfile = profileId && item.type === 'strength' && !item.timed && !(item.catalogRef && isTimedCatalog(item.catalogRef)) ? PROFILES[profileId] : null;
  return {
    id: `q_voice_${Date.now()}_${Math.random()}`,
    catalogId: item.catalogRef?.id || 'custom',
    name: item.name,
    category: item.category,
    type: item.type,
    unit: item.unit,
    timed: item.timed ? true : undefined,
    goalMode: 'sets_reps',
    cardioMode: item.type === 'cardio' ? (item.catalogRef?.cardioMode || 'run') : undefined,
    durationMin: item.type === 'cardio' ? item.durationMin : undefined,
    elevationM: item.type === 'cardio' ? 0 : undefined,
    level: 1,
    icon: item.icon,
    ...(item.catalogRef && item.catalogRef.muscle ? { muscle: item.catalogRef.muscle, ...(item.catalogRef.muscle2 ? { muscle2: item.catalogRef.muscle2 } : {}) } : {}),
    startValue: item.type === 'cardio' ? (item.unit === 'min' ? item.durationMin : item.distanceKm) : item.weightKg,
    currentValue: item.type === 'cardio' ? (item.unit === 'min' ? item.durationMin : item.distanceKm) : item.weightKg,
    // la charge de départ est celle que tu viens de dicter ; séries et répétitions visées suivent ton profil du moment
    goalValue: item.unit === 'kg'
      ? Math.max(item.catalogRef?.defaultGoal || 0, Math.round(item.weightKg * 1.2), item.weightKg + 5)
      : item.catalogRef?.defaultGoal || 10,
    goalSets: voiceProfile ? (coachIsCompound(item.name) ? voiceProfile.sets : voiceProfile.setsAccessory) : item.catalogRef?.defaultGoalSets || item.setDetails?.length || 3,
    goalReps: voiceProfile ? voiceProfile.hi : item.catalogRef?.defaultGoalReps || item.setDetails?.[0] || 8,
    setDetails: item.setDetails || [8, 8, 8],
    startAssistanceKg: item.assistanceKg || 0,
    currentAssistanceKg: item.assistanceKg || 0,
    goalAssistanceKg: 0,
    history
  };
}

export function VoiceWorkoutAssistant({ gameState, setGameState, selectedDate, triggerToast, playGameSound }) {
  const [isOpen, setIsOpen] = useState(false);
  // ouverture depuis le bouton « + » (QuickAddMenu)
  useEffect(() => {
    const h = () => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 100); };
    window.addEventListener('rondoufit-voice', h);
    return () => window.removeEventListener('rondoufit-voice', h);
  }, []);
  const [spokenText, setSpokenText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [micStatusMsg, setMicStatusMsg] = useState('');
  const [editableItems, setEditableItems] = useState([]);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);
  // coach intelligent : il relit la phrase entière (formulations libres, corrections, ressenti) ; l'analyse locale reste en secours
  const [aiState, setAiState] = useState('idle'); // idle | loading | done | error
  const [aiMsg, setAiMsg] = useState('');
  const aiTextRef = useRef('');
  const aiOn = aiStatus(gameState) === 'ok';

  const combinedText = (spokenText + (interimText ? ' ' + interimText : '')).trim();
  // date de la séance : dite dans la phrase (« hier », « avant-hier », « lundi », « le 5 novembre »), sinon le jour choisi ;
  // la personne peut la changer avant de valider
  const [dateOverride, setDateOverride] = useState('');
  const today = getTodayISODate();
  const spoken = spokenDate(combinedText, today);
  const entryDate = dateOverride || (spoken && spoken.date) || selectedDate || today;
  const textRef = useRef('');
  textRef.current = spokenText.trim();
  // deux onglets : la séance FAITE (enregistrée dans l'historique) ou la PROCHAINE séance (elle remplace la proposition du coach)
  const [mode, setMode] = useState('done');
  const isNext = mode === 'next';
  const chooseMode = m => {
    setMode(m);
    if (m === 'next') setGameState(prev => (prev.voiceNextSeen ? prev : { ...prev, voiceNextSeen: true })); // la pastille du micro disparaît
  };
  const [nextOverride, setNextOverride] = useState('');
  const nextSpoken = isNext ? nextSpokenDate(combinedText, today) : null;
  const coachNextIso = (() => {
    if (!isOpen || !isNext) return today;
    try { const ov = coachOverview(gameState, today); return (ov.first && ov.first.iso) || today; } catch (e) { return today; }
  })();
  const nextDate = nextOverride || (nextSpoken && nextSpoken.date) || coachNextIso;
  const strengthItems = editableItems.filter(it => it.type === 'strength');
  const cardioItems = editableItems.filter(it => it.type === 'cardio');
  const kmSaid = /\d\s*(km|kilom)/.test(normTxt(combinedText)); // distance reprise seulement si elle est dite
  const cardioText = item => `${Math.round(Number(item.durationMin) || 30)} min${kmSaid && Number(item.distanceKm) ? ` · ${String(item.distanceKm).replace('.', ',')} km` : ''}`;
  const dateSaid = !!(nextOverride || nextSpoken);
  // cardio sans jour dit : à la place de la prochaine séance de cardio prévue par le coach (sinon le jour de la séance)
  const cardioDate = (() => {
    if (!isOpen || !isNext || !cardioItems.length || dateSaid) return nextDate;
    try {
      const w0 = getWeekStart(today);
      const s = [...cardioPlanWeek(gameState, w0, today).sessions, ...cardioPlanWeek(gameState, addDaysISO(w0, 7), today).sessions].find(x => x.iso >= today);
      return (s && s.iso) || nextDate;
    } catch (e) { return nextDate; }
  })();

  // Met à jour la liste des exercices détectés dès que le texte dicté évolue (sauf s'il vient d'être lu par le coach intelligent)
  useEffect(() => {
    if (combinedText && combinedText === aiTextRef.current) return;
    if (aiTextRef.current) { aiTextRef.current = ''; setAiState('idle'); setAiMsg(''); }
    const parsed = parseSpokenWorkout(combinedText, gameState.quests, gameState.userWeightKg);
    setEditableItems(parsed);
  }, [combinedText, gameState.quests, gameState.userWeightKg]);

  const analyzeWithAi = async text => {
    const t = String(text || '').trim();
    if (!aiOn || t.length < 4) return;
    setAiState('loading');
    setAiMsg('');
    try {
      const data = await callAi('dictation', { text: t, context: dictationContext(gameState, getTodayISODate()), catalog: catalogText() });
      // exercice de musculation inconnu du catalogue : le coach le crée (catalogue commun de tous les utilisateurs),
      // puis la séance est relue avec lui (sa mesure : charge ou poids du corps, lest compris)
      const created = [];
      const known = it => (gameState.quests || []).some(q => q.id === it.questId) || EXERCISE_CATALOG.some(c => c.id === it.catalogId);
      const raw = Array.isArray(data && data.items) ? data.items : [];
      const fixed = await Promise.all(raw.map(async it => {
        if (!it || it.kind !== 'strength' || known(it) || !String(it.customName || '').trim()) return it;
        try {
          const r = await createExerciseWithAi(gameState, it.customName);
          created.push(r.entry.name);
          return { ...it, catalogId: r.entry.id, customName: '' };
        } catch { return it; }
      }));
      const items = aiDictationItems({ ...data, items: fixed }, gameState);
      if (!items.length) throw Object.assign(new Error('Je n’ai reconnu aucun exercice dans cette phrase.'), { soft: true });
      aiTextRef.current = t;
      setEditableItems(items);
      setAiState('done');
      setAiMsg([created.length ? `Nouveau dans le catalogue : ${created.join(', ')}.` : '', data && data.unclear ? `Pas compris : ${data.unclear}` : ''].filter(Boolean).join(' '));
    } catch (e) {
      setAiState('error');
      setAiMsg(`${e.message || 'Le coach intelligent ne répond pas.'} J’affiche la lecture simple.`);
    }
  };
  const analyzeRef = useRef(analyzeWithAi);
  analyzeRef.current = analyzeWithAi;

  const toggleBrowserDictation = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsListening(false);
      setInterimText('');
      setMicStatusMsg(aiOn ? '' : 'Écoute terminée. Vérifie l’aperçu ci-dessous puis valide en 1 clic.');
      setTimeout(() => analyzeRef.current(textRef.current), 300);
      return;
    }
    // micro commun (voice/mic.js) : demande d'autorisation, relance après un silence, message clair en cas d'échec
    setIsListening(true);
    setMicStatusMsg('Démarrage du micro…');
    let failed = false;
    const ctl = startListening({
      interim: true,
      onStart: () => setMicStatusMsg('Micro actif : dicte toute ta séance d’une traite (plusieurs exercices)...'),
      onFinal: t => setSpokenText(prev => (prev ? `${prev.trim()} ${t}` : t)),
      onInterim: t => setInterimText(t),
      onError: msg => {
        failed = true;
        setMicStatusMsg(msg);
        inputRef.current?.focus();
      },
      onEnd: () => {
        setIsListening(false);
        setInterimText('');
        if (recognitionRef.current && recognitionRef.current === ctl) recognitionRef.current = null;
        if (!failed) setTimeout(() => { if (textRef.current !== aiTextRef.current) analyzeRef.current(textRef.current); }, 300);
      },
    });
    if (!failed) recognitionRef.current = ctl;
  };

  const handleRemovePreviewItem = (id) => {
    setEditableItems(prev => prev.filter(item => item.id !== id));
  };

  const handleConfirmAllVoiceSessions = () => {
    if (editableItems.length === 0) return;
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsListening(false);
    }

    const knownArenas = new Set(gameState.quests.map(q => arenaOf(q)));
    const createdNames = [];
    const newArenas = [];
    editableItems.forEach(item => {
      const exists = gameState.quests.some(
        q =>
          q.id === item.questId ||
          stripAccents(q.name) === stripAccents(item.name) ||
          (item.catalogRef && q.catalogId === item.catalogRef.id)
      );
      if (exists) return;
      createdNames.push(item.name);
      const arena = arenaOf(item);
      if (!knownArenas.has(arena)) {
        knownArenas.add(arena);
        newArenas.push(arena);
      }
    });

    let totalXpGain = 0;
    let totalKcalGain = 0;
    const makeQuest = (item, prev, history) => newQuestFromItem(item, prev, history);
    let award = { gained: 0, bonusPct: 0, reduced: false };

    setGameState(prev => {
      let updatedQuests = [...prev.quests];

      editableItems.forEach(item => {
        totalKcalGain += item.calories;
        totalXpGain += 80 + Math.round(item.calories * 0.15);

        const newHistoryEntry = item.type === 'cardio'
          ? {
              id: `h_voice_${Date.now()}_${Math.random()}`,
              date: entryDate,
              value: item.unit === 'min' ? item.durationMin : item.distanceKm,
              durationMin: item.durationMin,
              elevationM: 0,
              rpe: item.rpe || 7,
              rpeSet: !!item.rpe,
              calories: item.calories,
              goalBeaten: false,
              note: `Dictée : ${item.summary}${item.aiNote ? ` • ${item.aiNote}` : ''}`
            }
          : {
              id: `h_voice_${Date.now()}_${Math.random()}`,
              date: entryDate,
              value: item.weightKg,
              sets: item.setDetails.length,
              reps: Math.max(...item.setDetails),
              setDetails: item.setDetails,
              assistanceKg: item.assistanceKg,
              ...(item.setLoads ? { setLoads: item.setLoads } : {}),
              ...(item.setAssists ? { setAssists: item.setAssists } : {}),
              ...(item.setKinds ? { setKinds: item.setKinds } : {}),
              ...(item.method ? { method: item.method } : {}),
              rpe: item.rpe || 7,
              rpeSet: !!item.rpe,
              calories: item.calories,
              goalBeaten: false,
              note: `Dictée : ${item.summary}${item.aiNote ? ` • ${item.aiNote}` : ''}`
            };

        const existingIdx = updatedQuests.findIndex(
          q =>
            q.id === item.questId ||
            stripAccents(q.name) === stripAccents(item.name) ||
            (item.catalogRef && q.catalogId === item.catalogRef.id)
        );

        if (existingIdx !== -1) {
          const q = updatedQuests[existingIdx];
          updatedQuests[existingIdx] = {
            ...q,
            currentValue: item.type === 'cardio' ? Math.max(Number(q.currentValue) || 0, item.unit === 'min' ? item.durationMin : item.distanceKm) : item.weightKg,
            currentAssistanceKg: item.unit === 'reps' ? item.assistanceKg : 0,
            setDetails: item.type === 'strength' ? item.setDetails : q.setDetails,
            history: [...(q.history || []), newHistoryEntry]
          };
        } else {
          updatedQuests.unshift(makeQuest(item, prev, [newHistoryEntry]));
        }
      });

      award = computeXp(prev, totalXpGain, getTodayISODate(), 'session');
      return {
        ...prev,
        ...award.patch,
        quests: updatedQuests
      };
    });

    playGameSound('boss', gameState.soundEnabled);
    triggerToast(
      `${editableItems.length} exercice(s) validé(s) d'un coup !`,
      `+${totalKcalGain} kcal ajoutées au bilan du ${formatDayFr(entryDate)}` +
        (createdNames.length ? ` • ${createdNames.length} nouvel(s) objectif(s) ajouté(s)` : '') +
        (newArenas.length ? ` • ${pick('Arène débloquée', 'Groupe musculaire ajouté')} : ${newArenas.join(', ')}` : '') +
        xpNote(award),
      award.gained,
      '🎤'
    );
    setSpokenText('');
    setInterimText('');
    setDateOverride('');
    setEditableItems([]);
    setMicStatusMsg('');
    aiTextRef.current = '';
    setAiState('idle');
    setAiMsg('');
    setIsOpen(false);
  };

  // « Prochaine séance » : les exercices dictés deviennent la séance perso du jour choisi, avec leurs charges, séries et
  // répétitions (plan.targets) ; l'ancienne séance perso est gardée pour « Revenir à ma séance perso »
  const handleSaveNextSession = () => {
    if (!strengthItems.length && !cardioItems.length) return;
    if (isListening && recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; setIsListening(false); }
    const date = nextDate;
    setGameState(prev => {
      const quests = [...prev.quests];
      const ids = [];
      const targets = {};
      strengthItems.forEach(item => {
        let idx = quests.findIndex(q => q.id === item.questId || stripAccents(q.name) === stripAccents(item.name) || (item.catalogRef && q.catalogId === item.catalogRef.id));
        if (idx === -1) { quests.unshift(newQuestFromItem(item, prev, [])); idx = 0; }
        const q = quests[idx];
        if (ids.includes(q.id)) return;
        ids.push(q.id);
        const reps = (item.setDetails || []).map(Number).filter(n => n > 0);
        targets[q.id] = {
          sets: reps.length || 3,
          reps: reps.length ? reps : [8, 8, 8],
          ...(item.unit === 'kg' && Number(item.weightKg) > 0 ? { load: Number(item.weightKg) } : {}),
          // aide ou lest seulement s'ils sont dits ; « sans élastique / sans aide / poids du corps » = aucune aide
          ...(item.unit === 'reps' && Number(item.assistanceKg) ? { assist: Number(item.assistanceKg) } : item.unit === 'reps' && saidNoAid(combinedText, item) ? { assist: 0 } : {}),
        };
      });
      const coach = prev.coach || {};
      // cardio dicté : une séance de cardio exactement comme demandé (elle remplace celle prévue par le coach ce jour-là)
      const customs = cardioItems.map((item, k) => ({
        id: `cc_${Date.now()}_${k}`, iso: cardioDate, name: item.name, icon: item.icon,
        catalogId: (item.catalogRef && item.catalogRef.id) || (quests.find(q => q.id === item.questId) || {}).catalogId || 'running_endurance',
        cardioMode: (item.catalogRef && item.catalogRef.cardioMode) || (quests.find(q => q.id === item.questId) || {}).cardioMode || 'run',
        minutes: Number(item.durationMin) || 30, distanceKm: kmSaid ? Number(item.distanceKm) || 0 : 0,
      }));
      const keep = (coach.cardioCustom || []).filter(x => x.iso >= today && !(customs.length && x.iso === cardioDate));
      return {
        ...prev, quests,
        coach: {
          ...coach,
          ...(ids.length ? { planBackup: coach.plan || coach.planBackup || null, plan: { date, questIds: ids, sets: {}, targets, dictated: true } } : {}),
          ...(customs.length ? { cardioCustom: [...keep, ...customs] } : {}),
        },
      };
    });
    playGameSound('click', gameState.soundEnabled);
    const dayTxt = d => (d === today ? 'aujourd’hui' : formatDayFr(d));
    triggerToast('Prochaine séance enregistrée', [strengthItems.length ? `Musculation ${dayTxt(date)} : ${strengthItems.length} exercice(s)` : '', cardioItems.length ? `Cardio ${dayTxt(cardioDate)} : ${cardioItems.map(i => i.name).join(', ')}` : ''].filter(Boolean).join(' · ') + '. Le coach la propose à la place de la sienne (Coach → Séance).', 0, '🎤');
    setSpokenText('');
    setInterimText('');
    setNextOverride('');
    setEditableItems([]);
    setMicStatusMsg('');
    aiTextRef.current = '';
    setAiState('idle');
    setAiMsg('');
    setIsOpen(false);
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex px-4 pt-14 sm:py-4 overflow-y-auto">
          <div className="m-auto bg-slate-900 border border-pink-500/40 rounded-2xl max-w-2xl w-full p-4 sm:p-5 shadow-2xl space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎤</span>
                <div>
                  <h3 className="text-sm font-black text-white">{pick('Micro Magique de Rondoudou', 'Dictée vocale')}</h3>
                  <p className="text-xs text-slate-300">
                    Dicte toute ta séance en une seule phrase.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Fermer la dictée"
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white shrink-0 font-bold"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800" role="tablist" aria-label="Que veux-tu dicter ?">
              {[['done', 'Séance faite', 'check'], ['next', 'Prochaine séance', 'calendar']].map(([id, label, art]) => (
                <button key={id} type="button" role="tab" aria-selected={mode === id} onClick={() => chooseMode(id)} data-testid={`voice-mode-${id}`}
                  className={`relative py-2 rounded-lg text-xs font-black ${mode === id ? 'bg-pink-600 text-white' : 'text-slate-300'}`}>
                  <Art name={art} size={15} />{label}
                  {id === 'next' && !gameState.voiceNextSeen && <span className="absolute top-1 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />}
                </button>
              ))}
            </div>
            {isNext && <p className="text-xs text-slate-300" data-testid="voice-next-help">Dicte ou colle la séance que tu veux faire : le coach la proposera à la place de la sienne. Tu pourras toujours l’ajuster ou revenir à sa proposition.</p>}
            <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <textarea
              ref={inputRef}
              rows={2}
              value={combinedText}
              onChange={e => {
                setInterimText('');
                setSpokenText(e.target.value);
              }}
              placeholder={isNext ? 'Dicte ou colle ta prochaine séance (ex : jeudi, développé couché 4×8 à 60 kg, tractions 3×6, squat 5×5 à 80 kg)…' : 'Dicte toute ta séance ici…'}
              className="flex-1 bg-slate-950 border border-pink-500/50 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-semibold focus:outline-none focus:border-pink-400"
            />
            <div className="flex sm:flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleBrowserDictation}
                className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black text-white transition ${
                  isListening ? 'bg-rose-600 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-500'
                }`}
              >
                {isListening ? 'Stop Micro' : 'Micro Direct'}
              </button>
              {combinedText && (
                <button
                  type="button"
                  onClick={() => { setSpokenText(''); setInterimText(''); setEditableItems([]); }}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Effacer
                </button>
              )}
            </div>
          </div>

          {/* Bouton de test avec fautes de frappe volontaires + 4 exercices en une seule phrase */}
          {aiOn ? (
            <div className="flex flex-wrap items-center gap-2 text-xs" data-testid="voice-ai">
              {aiState === 'loading' && <span className="text-sky-300 font-bold animate-pulse"><Art name="sparkle" size={16} />Le coach lit ta séance…</span>}
              {aiState === 'done' && aiTextRef.current === combinedText && <span className="text-emerald-300 font-bold"><Art name="sparkle" size={16} />Lu par le coach intelligent</span>}
              {combinedText && aiState !== 'loading' && aiTextRef.current !== combinedText && !isListening && (
                <button type="button" onClick={() => analyzeWithAi(combinedText)} data-testid="voice-ai-read" className="px-3 py-2 rounded-xl bg-pink-600 text-white font-black"><Art name="sparkle" size={16} />Lire avec le coach intelligent</button>
              )}
              {aiMsg && <span className={aiState === 'error' ? 'text-amber-200' : 'text-slate-300'}>{aiMsg}</span>}
            </div>
          ) : null}

          {micStatusMsg && (
            <div className="text-xs bg-slate-950/90 border border-amber-500/40 text-amber-200 px-3 py-2 rounded-xl">
              {micStatusMsg}
            </div>
          )}

          {isNext && editableItems.length > 0 && (
            <div className="bg-slate-950/95 border border-violet-500/40 rounded-xl p-3.5 space-y-3" data-testid="voice-next-preview">
              <p className="text-xs font-black uppercase tracking-wider text-violet-300">Ta prochaine séance ({strengthItems.length + cardioItems.length} exercice(s))</p>
              <label className="flex flex-wrap items-center gap-2 text-sm text-slate-200" data-testid="voice-next-date">
                <Art name="calendar" size={16} />
                <span className="font-bold">{nextDate === today ? 'Aujourd’hui' : formatDayFr(nextDate)}</span>
                {nextSpoken && !nextOverride && <span className="text-xs text-violet-300">(« {nextSpoken.phrase} »)</span>}
                <input type="date" value={nextDate} min={today} onChange={e => setNextOverride(e.target.value && e.target.value >= today ? e.target.value : '')} data-testid="voice-next-date-input" aria-label="Jour de la séance" className="ml-auto rounded-lg bg-slate-900 border border-slate-700 px-2 py-1 text-xs text-white" />
              </label>
              <div className="space-y-2">
                {editableItems.map(item => (
                  <div key={item.id} className="flex items-start gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                      <span className="text-base">{item.icon}</span>
                      <strong className="text-white">{item.name}</strong>
                      {item.type === 'strength'
                        ? <span className="w-full text-violet-200 font-bold">{item.summary}{item.unit === 'reps' && !Number(item.assistanceKg) && saidNoAid(combinedText, item) ? ' · sans aide' : ''}</span>
                        : <span className="w-full text-sky-200 font-bold" data-testid="voice-next-cardio">Cardio {cardioDate === today ? 'aujourd’hui' : formatDayFr(cardioDate)} : {cardioText(item)}</span>}
                    </div>
                    <button type="button" onClick={() => handleRemovePreviewItem(item.id)} title="Retirer cet exercice de la liste" className="text-slate-400 hover:text-rose-400 px-1.5 font-bold shrink-0">✕</button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={handleSaveNextSession} disabled={!strengthItems.length && !cardioItems.length} data-testid="voice-next-save" data-key
                className="w-full py-2.5 rounded-xl text-xs sm:text-sm font-black bg-pink-600 text-white disabled:opacity-40">
                Mettre à la place de la séance du coach ({strengthItems.length + cardioItems.length} exercice(s))
              </button>
            </div>
          )}

          {!isNext && editableItems.length > 0 && (
            <div className="bg-slate-950/95 border border-emerald-500/40 rounded-xl p-3.5 space-y-3">
              <p className="text-xs font-black uppercase tracking-wider text-emerald-300">
                Synthèse de ta séance ({editableItems.length} exercice(s) détecté(s)) :
              </p>
              <label className="flex flex-wrap items-center gap-2 text-sm text-slate-200" data-testid="voice-date">
                <Art name="calendar" size={16} />
                <span className="font-bold">{entryDate === today ? 'Aujourd’hui' : formatDayFr(entryDate)}</span>
                {spoken && !dateOverride && entryDate !== today && <span className="text-xs text-emerald-300">(« {spoken.phrase} »)</span>}
                <input type="date" value={entryDate} max={today} onChange={e => setDateOverride(e.target.value && e.target.value <= today ? e.target.value : '')} data-testid="voice-date-input" aria-label="Date de la séance" className="ml-auto rounded-lg bg-slate-900 border border-slate-700 px-2 py-1 text-xs text-white" />
              </label>
              <div className="space-y-2">
                {editableItems.map(item => (
                  <div
                    key={item.id}
                    className="flex items-start gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs"
                  >
                    <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                      <span className="text-base">{item.icon}</span>
                      <strong className="text-white">{item.name}</strong>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-xs text-slate-300 font-bold">
                        {item.category}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 font-bold">
                        🔥 ~{item.calories} kcal
                      </span>
                      <span className="w-full text-pink-300 font-bold">{item.summary}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRemovePreviewItem(item.id)}
                        title="Retirer cet exercice de la liste"
                        className="text-slate-400 hover:text-rose-400 px-1.5 font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleConfirmAllVoiceSessions}
                className="w-full py-2.5 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-lg transition"
              >
                Valider toute la séance en 1 clic ({editableItems.length} exercice(s))
              </button>
            </div>
          )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
