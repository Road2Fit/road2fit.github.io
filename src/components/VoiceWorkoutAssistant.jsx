import { useEffect, useRef, useState } from 'react';
import { PROFILES, profileOpts } from '../coach/profiles';
import { coachIsCompound } from '../coach/settings';

import { isTimedCatalog } from '../lib/quests';
import { stripAccents } from '../lib/text';
import { parseSpokenWorkout } from '../voice/parser';
import { computeXp, xpNote } from '../lib/xp';
import { getTodayISODate } from '../lib/dates';
import { pick } from '../edition';
import { arenaOf } from '../data/muscles';
import { aiStatus, callAi } from '../ai/client';
import { aiDictationItems } from '../ai/dictation';
import { catalogText, dictationContext } from '../ai/context';
import { Art } from './Art';

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
  const textRef = useRef('');
  textRef.current = spokenText.trim();

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
      const items = aiDictationItems(data, gameState);
      if (!items.length) throw Object.assign(new Error('Je n’ai reconnu aucun exercice dans cette phrase.'), { soft: true });
      aiTextRef.current = t;
      setEditableItems(items);
      setAiState('done');
      setAiMsg(data && data.unclear ? `Pas compris : ${data.unclear}` : '');
    } catch (e) {
      setAiState('error');
      setAiMsg(`${e.message || 'Le coach intelligent ne répond pas.'} J’affiche la lecture simple.`);
    }
  };
  const analyzeRef = useRef(analyzeWithAi);
  analyzeRef.current = analyzeWithAi;

  const toggleBrowserDictation = () => {
    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      setIsListening(false);
      setInterimText('');
      setMicStatusMsg(aiOn ? '' : 'Écoute terminée. Vérifie l’aperçu ci-dessous puis valide en 1 clic.');
      setTimeout(() => analyzeRef.current(textRef.current), 300);
      return;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setMicStatusMsg("💡 Astuce : touche la zone de texte et utilise le bouton Micro 🎤 de votre clavier (ou Windows + H sur PC) !");
      inputRef.current?.focus();
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }

      const rec = new SpeechRec();
      recognitionRef.current = rec;
      rec.lang = 'fr-FR';
      rec.continuous = true;
      rec.interimResults = true;

      rec.onstart = () => {
        setIsListening(true);
        setMicStatusMsg('Micro actif : dicte toute ta séance d’une traite (plusieurs exercices)...');
      };

      rec.onresult = (event) => {
        let finalChunk = '';
        let interimChunk = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalChunk += transcript + ' ';
          } else {
            interimChunk += transcript;
          }
        }
        if (finalChunk) {
          setSpokenText(prev => (prev ? `${prev.trim()} ${finalChunk.trim()}` : finalChunk.trim()));
        }
        setInterimText(interimChunk);
      };

      rec.onerror = () => {
        setIsListening(false);
        setInterimText('');
        setMicStatusMsg("💡 Google Sites bloque le micro direct sur ce navigateur : cliquez dans le champ texte et utilisez le micro 🎤 de votre clavier de téléphone (ou Touche Windows + H sur PC) !");
        inputRef.current?.focus();
      };

      rec.onend = () => {
        setIsListening(false);
        setInterimText('');
        setTimeout(() => { if (textRef.current !== aiTextRef.current) analyzeRef.current(textRef.current); }, 300);
      };

      rec.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  const handleRemovePreviewItem = (id) => {
    setEditableItems(prev => prev.filter(item => item.id !== id));
  };

  const handleConfirmAllVoiceSessions = () => {
    if (editableItems.length === 0) return;
    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
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
    let award = { gained: 0, bonusPct: 0, reduced: false };

    setGameState(prev => {
      let updatedQuests = [...prev.quests];

      editableItems.forEach(item => {
        totalKcalGain += item.calories;
        totalXpGain += 80 + Math.round(item.calories * 0.15);

        const newHistoryEntry = item.type === 'cardio'
          ? {
              id: `h_voice_${Date.now()}_${Math.random()}`,
              date: selectedDate,
              value: item.unit === 'min' ? item.durationMin : item.distanceKm,
              durationMin: item.durationMin,
              elevationM: 0,
              rpe: item.rpe || 7,
              calories: item.calories,
              goalBeaten: false,
              note: `Dictée : ${item.summary}${item.aiNote ? ` • ${item.aiNote}` : ''}`
            }
          : {
              id: `h_voice_${Date.now()}_${Math.random()}`,
              date: selectedDate,
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
          // profil du moment (sauf cardio et exercices chronométrés)
          const profileId = profileOpts(prev, getTodayISODate()).profile;
          const voiceProfile = profileId && item.type === 'strength' && !item.timed && !(item.catalogRef && isTimedCatalog(item.catalogRef)) ? PROFILES[profileId] : null;
          updatedQuests.unshift({
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
            history: [newHistoryEntry]
          });
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
      `+${totalKcalGain} kcal ajoutées au bilan du ${selectedDate}` +
        (createdNames.length ? ` • ${createdNames.length} nouvel(s) objectif(s) ajouté(s)` : '') +
        (newArenas.length ? ` • ${pick('Arène débloquée', 'Groupe musculaire ajouté')} : ${newArenas.join(', ')}` : '') +
        xpNote(award),
      award.gained,
      '🎤'
    );
    setSpokenText('');
    setInterimText('');
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
                    Dicte toute ta séance en une seule phrase, même avec des fautes de retranscription (ex: <em>« tracon »</em>, <em>« ip trust »</em>, <em>« skouat »</em>).
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
              placeholder="Dicte toute ta séance ici (ex: J'ai fait du développer coucher 50 kg 3x8, des tracons élastique 10 kg 6 6 4, un ip trust 80 kg 4x10 et 4 km de course en 24 min)..."
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
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-bold">Tester une phrase complète avec fautes :</span>
            <button
              type="button"
              onClick={() =>
                setSpokenText(
                  "Aujourd'hui j'ai fait du développer coucher à 50 kilos 3 séries de 8 des tracons avec élastique 10 kilos 6 6 et 4 répétitions un ip trust à 80 kilos 4 fois 10 et 4,5 km de footing en 26 minutes"
                )
              }
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-pink-500/40 text-pink-300 font-semibold"
            >
              Tester : « développer coucher 50kg 3×8 + tracons élastique 10kg 6-6-4 + ip trust 80kg 4×10 + footing 4,5km »
            </button>
          </div>

          {aiOn ? (
            <div className="flex flex-wrap items-center gap-2 text-xs" data-testid="voice-ai">
              {aiState === 'loading' && <span className="text-sky-300 font-bold animate-pulse"><Art name="sparkle" size={16} />Le coach lit ta séance…</span>}
              {aiState === 'done' && aiTextRef.current === combinedText && <span className="text-emerald-300 font-bold"><Art name="sparkle" size={16} />Lu par le coach intelligent</span>}
              {combinedText && aiState !== 'loading' && aiTextRef.current !== combinedText && !isListening && (
                <button type="button" onClick={() => analyzeWithAi(combinedText)} data-testid="voice-ai-read" className="px-3 py-2 rounded-xl bg-pink-600 text-white font-black"><Art name="sparkle" size={16} />Lire avec le coach intelligent</button>
              )}
              {aiMsg && <span className={aiState === 'error' ? 'text-amber-200' : 'text-slate-300'}>{aiMsg}</span>}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Astuce : active le coach intelligent (onglet Coach) pour une dictée qui comprend toutes les formulations.</p>
          )}

          {micStatusMsg && (
            <div className="text-xs bg-slate-950/90 border border-amber-500/40 text-amber-200 px-3 py-2 rounded-xl">
              {micStatusMsg}
            </div>
          )}

          {editableItems.length > 0 && (
            <div className="bg-slate-950/95 border border-emerald-500/40 rounded-xl p-3.5 space-y-3">
              <p className="text-xs font-black uppercase tracking-wider text-emerald-300">
                Synthèse de ta séance ({editableItems.length} exercice(s) détecté(s)) :
              </p>
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
