import { calculateCardioCalories, calculateStrengthCalories } from '../lib/calories';
import { normalizeSlang } from '../data/slang';
import { assistText } from '../lib/assist';
import { isTimedCatalog, isTimedQuest } from '../lib/quests';
import { stripAccents } from '../lib/text';
import { VOICE_DICTIONARY } from './dictionary';

// Distance de Levenshtein pour tolérer les fautes de frappe ou d'écoute ("tracon" vs "traction" = 1)
function levenshteinDistance(a = '', b = '') {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

// Convertit les nombres écrits en toutes lettres par la dictée vocale
function normalizeSpokenNumbers(text = '') {
  return text
    .replace(/,/g, '.')
    .replace(/\b(une|un)\b/gi, '1')
    .replace(/\bdeux\b/gi, '2')
    .replace(/\btrois\b/gi, '3')
    .replace(/\bquatre\b/gi, '4')
    .replace(/\bcinq\b/gi, '5')
    .replace(/\bsix\b/gi, '6')
    .replace(/\bsept\b/gi, '7')
    .replace(/\bhuit\b/gi, '8')
    .replace(/\bneuf\b/gi, '9')
    .replace(/\bdix\b/gi, '10')
    .replace(/\bonze\b/gi, '11')
    .replace(/\bdouze\b/gi, '12')
    .replace(/\btreize\b/gi, '13')
    .replace(/\bquatorze\b/gi, '14')
    .replace(/\bquinze\b/gi, '15')
    .replace(/\bseize\b/gi, '16')
    .replace(/\bvingt\b/gi, '20')
    .replace(/\btrente\b/gi, '30')
    .replace(/\bquarante\b/gi, '40')
    .replace(/\bcinquante\b/gi, '50')
    .replace(/\bsoixante\b/gi, '60')
    .replace(/\bquatre-vingts?\b/gi, '80')
    .replace(/\bcent\b/gi, '100');
}

// Mots courants du langage de salle : ils ne peuvent déclencher un exercice que s'ils sont dits exactement
const VOICE_COMMON_WORDS = new Set([
  'des', 'dos', 'les', 'une', 'avec', 'sans', 'pour', 'dans', 'puis', 'ensuite', 'apres', 'avant',
  'fait', 'faire', 'fais', 'passe', 'passes', 'sport', 'sports', 'salle', 'machine', 'machines',
  'elastique', 'elastiques', 'series', 'serie', 'repetitions', 'repetition', 'kilos', 'kilo',
  'fois', 'minutes', 'minute', 'heure', 'heures', 'kilometres', 'kilometre', 'aide', 'seance',
  'matin', 'soir', 'fini', 'fin', 'derniere', 'premier'
]);

// Repère TOUS les exercices présents dans une même phrase et découpe automatiquement
export function parseSpokenWorkout(rawText, existingQuests = [], userWeightKg = 82) {
  if (!rawText || !rawText.trim()) return [];

  // argot de salle traduit d'abord (« dc » → développé couché, « 2 plaques de chaque côté » → 100 kg, « @8 » → RPE 8)
  const textWithDigits = normalizeSpokenNumbers(normalizeSlang(normalizeSpokenNumbers(rawText)));
  const normText = stripAccents(textWithDigits);

  // Construction de la liste complète de cibles (Quêtes perso + Dictionnaire vocal)
  const candidates = [];

  existingQuests.forEach(q => {
    const cleanQName = stripAccents(q.name);
    candidates.push({
      phrase: cleanQName,
      quest: q,
      catalog: VOICE_DICTIONARY.find(d => d.id === q.catalogId) || null
    });
  });

  VOICE_DICTIONARY.forEach(dictItem => {
    const linkedQuest = existingQuests.find(
      q => q.catalogId === dictItem.id || stripAccents(q.name) === stripAccents(dictItem.name)
    );
    dictItem.aliases.forEach(alias => {
      candidates.push({
        phrase: stripAccents(alias),
        quest: linkedQuest || null,
        catalog: dictItem,
        strict: !!dictItem.strict
      });
    });
  });

  // Tri par longueur décroissante pour privilégier "tractions supination" avant "tractions"
  candidates.sort((a, b) => b.phrase.length - a.phrase.length);

  // Découpage en mots avec leur position exacte dans la phrase
  const wordTokens = [];
  const wordRegex = /[a-z0-9]+/g;
  let match;
  while ((match = wordRegex.exec(normText)) !== null) {
    wordTokens.push({
      word: match[0],
      start: match.index,
      end: match.index + match[0].length
    });
  }

  const anchors = [];
  const usedTokenIndices = new Set();

  // Analyse glissante sur 1, 2 et 3 mots avec tolérance aux fautes (Levenshtein)
  for (let i = 0; i < wordTokens.length; i++) {
    if (usedTokenIndices.has(i)) continue;
    // Ignore les petits mots de liaison ou chiffres purs comme point de départ
    if (/^\d+$/.test(wordTokens[i].word) || wordTokens[i].word.length <= 2) continue;

    let bestMatch = null;

    for (let len = 3; len >= 1; len--) {
      if (i + len > wordTokens.length) continue;
      const sliceTokens = wordTokens.slice(i, i + len);
      const spokenPhrase = sliceTokens.map(t => t.word).join(' ');
      const startsWithCommon = VOICE_COMMON_WORDS.has(sliceTokens[0].word);

      for (const cand of candidates) {
        const target = cand.phrase;
        const targetWordsCount = target.split(' ').length;
        if (Math.abs(targetWordsCount - len) > 1) continue;

        const dist = levenshteinDistance(spokenPhrase, target);
        if (dist > 0 && startsWithCommon) continue;
        let maxAllowedDist = target.length >= 10 ? 3 : target.length >= 5 ? 2 : 0;
        if (cand.strict) {
          // Exercices du catalogue étendu : tolérance réduite, même première lettre
          maxAllowedDist = target.length >= 12 ? 2 : target.length >= 6 ? 1 : 0;
          if (dist > 0 && spokenPhrase[0] !== target[0]) continue;
        }

        if (dist <= maxAllowedDist) {
          if (!bestMatch || dist < bestMatch.dist || (dist === bestMatch.dist && target.length > bestMatch.targetLen)) {
            bestMatch = {
              cand,
              dist,
              targetLen: target.length,
              startChar: sliceTokens[0].start,
              tokenStart: i,
              tokenEnd: i + len - 1
            };
          }
        }
      }
      if (bestMatch && bestMatch.dist === 0) break;
    }

    if (bestMatch) {
      for (let k = bestMatch.tokenStart; k <= bestMatch.tokenEnd; k++) {
        usedTokenIndices.add(k);
      }
      anchors.push({
        startChar: bestMatch.startChar,
        quest: bestMatch.cand.quest,
        catalog: bestMatch.cand.catalog
      });
    }
  }

  if (anchors.length === 0) return [];

  // Si deux ancres consécutives désignent exactement le même exercice sans chiffre entre elles, on les fusionne
  const cleanedAnchors = [];
  anchors.forEach(a => {
    const prev = cleanedAnchors[cleanedAnchors.length - 1];
    const sameId =
      prev &&
      ((a.quest && prev.quest && a.quest.id === prev.quest.id) ||
        (a.catalog && prev.catalog && a.catalog.id === prev.catalog.id));
    const betweenText = prev ? normText.slice(prev.startChar, a.startChar) : '';
    if (sameId && !/\d/.test(betweenText)) {
      return;
    }
    cleanedAnchors.push(a);
  });

  // Extraction des paramètres (kg, élastique, séries, reps, km) pour chaque segment d'exercice
  return cleanedAnchors.map((anchor, idx) => {
    const segEnd = idx + 1 < cleanedAnchors.length ? cleanedAnchors[idx + 1].startChar : normText.length;
    // Les chiffres suivent en général le nom de l'exercice : on part du nom s'il y a des chiffres après,
    // sinon on garde l'ancien découpage au milieu des deux exercices.
    const ownText = normText.slice(anchor.startChar, segEnd);
    const segStart =
      idx === 0
        ? 0
        : /\d/.test(ownText)
          ? anchor.startChar
          : Math.floor((cleanedAnchors[idx - 1].startChar + anchor.startChar) / 2);
    const seg = normText.slice(segStart, segEnd);

    const ref = anchor.quest || anchor.catalog;
    const isCardio = ref.type === 'cardio';

    if (isCardio) {
      const isTimeOnly = ref.unit === 'min';
      const kmMatch = seg.match(/(\d+(?:\.\d+)?)\s*(?:km|kilom[eè]tre|kilom[eè]tres|borne|bornes)/i);
      const minMatch = seg.match(/(\d+(?:\.\d+)?)\s*(?:min|minute|minutes)/i);
      const hourMatch = seg.match(/(\d+(?:\.\d+)?)\s*(?:heure|heures|h\b)/i);
      
      let parsedMin = 0;
      if (hourMatch) parsedMin += Number(hourMatch[1]) * 60;
      if (minMatch) parsedMin += Number(minMatch[1]);
      
      const dist = kmMatch ? Number(kmMatch[1]) : (isTimeOnly ? 0 : (Number(anchor.quest?.currentValue) || 5));
      const dur = parsedMin > 0 ? parsedMin : (isTimeOnly ? (Number(anchor.quest?.currentValue) || 60) : Math.round(dist * 6));
      
      const kcal = calculateCardioCalories({
        cardioMode: ref.cardioMode || 'run',
        distanceKm: dist,
        durationMin: dur,
        elevationM: 0,
        rpe: 7,
        userWeightKg
      });
      return {
        id: `vp_${idx}_${Date.now()}`,
        questId: anchor.quest?.id || null,
        catalogRef: anchor.catalog,
        name: ref.name,
        category: ref.category || 'Course & Cardio',
        type: 'cardio',
        unit: ref.unit || 'km',
        icon: ref.icon || '🏃',
        distanceKm: dist,
        durationMin: dur,
        calories: kcal,
        summary: isTimeOnly ? `${dur} min` : `${dist} km en ${dur} min`
      };
    }

    // 1. Aide élastique éventuelle (ex: "élastique 10 kg", "aide de 15 kilos", "assisté à 10 kg")
    const assistMatch = seg.match(/(?:elastique|elas|aide|assiste|delestage)\s*(?:de|a)?\s*(\d+(?:\.\d+)?)\s*(?:kg|kilo|kilos)?/);
    const assistanceKg = assistMatch ? Number(assistMatch[1]) : 0;

    // 2. Charge en kg (hors élastique)
    let segWithoutAssist = assistMatch ? seg.replace(assistMatch[0], ' ') : seg;
    const kgMatch = segWithoutAssist.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilo|kilos)/);
    const weightKg = kgMatch ? Number(kgMatch[1]) : (Number(anchor.quest?.currentValue) || 40);
    if (kgMatch) {
      segWithoutAssist = segWithoutAssist.replace(kgMatch[0], ' ');
    }

    // 2bis. Exercice chronométré : « 45 secondes », « 1 minute », « 1 minute 30 »
    const timedEx = anchor.quest ? isTimedQuest(anchor.quest) : isTimedCatalog(anchor.catalog || ref);
    if (timedEx) {
      segWithoutAssist = segWithoutAssist
        .replace(/(\d+)\s*minutes?\s*(?:et\s*)?(\d+)\s*(?:secondes?|sec)\b/g, (m, a, b) => String(Number(a) * 60 + Number(b)))
        .replace(/(\d+)\s*minutes?\b/g, (m, a) => String(Number(a) * 60))
        .replace(/(\d+)\s*(?:secondes?|sec)\b/g, '$1');
    }

    // 3. Extraction intelligente des séries et répétitions
    let setDetails = [];
    // Format uniforme : "3 séries de 10", "3 x 10", "3 fois 10", "4 par 8"
    const uniformMatch = segWithoutAssist.match(/(\d+)\s*(?:series?\s*(?:de|a)|fois|x|×|par)\s*(\d+)/);
    // Format inversé : "10 répétitions sur 3 séries"
    const reverseUniformMatch = segWithoutAssist.match(/(\d+)\s*(?:repetitions?|reps?)\s*(?:sur|en|x)\s*(\d+)\s*series?/);

    if (uniformMatch) {
      const sCount = Math.min(12, Math.max(1, Number(uniformMatch[1])));
      const rCount = Math.max(1, Number(uniformMatch[2]));
      setDetails = Array(sCount).fill(rCount);
    } else if (reverseUniformMatch) {
      const rCount = Math.max(1, Number(reverseUniformMatch[1]));
      const sCount = Math.min(12, Math.max(1, Number(reverseUniformMatch[2])));
      setDetails = Array(sCount).fill(rCount);
    } else {
      // Format détaillé : "6, 6 et 4 reps" ou "3 séries : 8 8 6"
      const cleanedForReps = segWithoutAssist.replace(/(\d+)\s*series?(?!\s*(?:de|a|\d))/g, ' ');
      const allNums = (cleanedForReps.match(/\d+/g) || [])
        .map(Number)
        .filter(n => n > 0 && n <= (timedEx ? 600 : 100));

      if (allNums.length >= 2) {
        setDetails = allNums.slice(0, 8);
      } else if (allNums.length === 1) {
        const defSets = Number(anchor.quest?.goalSets || anchor.catalog?.defaultGoalSets || 3);
        setDetails = Array(defSets).fill(allNums[0]);
      } else {
        const defSets = Number(anchor.quest?.goalSets || anchor.catalog?.defaultGoalSets || 3);
        const defReps = Number(anchor.quest?.goalReps || anchor.catalog?.defaultGoalReps || 8);
        setDetails = Array(defSets).fill(defReps);
      }
    }

    const unit = anchor.quest?.unit || ref.unit || (kgMatch ? 'kg' : 'reps');
    // exercice au poids du corps : « lesté de 10 kg », « dips 3x8 à 10 kilos » = du lest (aide négative, lib/assist.js)
    const assistOrLest = unit === 'reps' && kgMatch && !assistMatch ? -Number(kgMatch[1]) : assistanceKg;
    // ressenti : « RIR 2 » / « 2 reps en réserve » → RPE 8 ; « RPE 8 » tel quel
    const rirMatch = seg.match(/\brir\s*(?:de|a)?\s*(\d)\b/) || seg.match(/(\d)\s*(?:reps?|repetitions?)?\s*en\s*reserve/);
    const rpeMatch = seg.match(/\brpe\s*(?:de|a)?\s*(\d+)\b/);
    const rpe = rirMatch ? Math.max(1, 10 - Number(rirMatch[1])) : rpeMatch ? Math.min(10, Math.max(1, Number(rpeMatch[1]))) : 0;
    const kcal = calculateStrengthCalories({
      unit,
      timed: timedEx,
      weightKg: unit === 'kg' ? weightKg : 0,
      assistanceKg: unit === 'reps' ? assistOrLest : 0,
      setDetails,
      rpe: rpe || 7,
      userWeightKg
    });

    return {
      id: `vp_${idx}_${Date.now()}`,
      questId: anchor.quest?.id || null,
      catalogRef: anchor.catalog,
      name: ref.name,
      category: ref.category || 'Pectoraux',
      type: 'strength',
      unit,
      icon: ref.icon || '🏋️',
      weightKg: unit === 'kg' ? weightKg : Math.max(...setDetails),
      assistanceKg: unit === 'reps' ? assistOrLest : 0,
      setDetails,
      ...(rpe ? { rpe } : {}),
      calories: kcal,
      timed: timedEx,
      summary: `${unit === 'kg' ? `${weightKg} kg • ` : ''}[${setDetails.join(' - ')} ${timedEx ? 's' : 'reps'}]${
        unit === 'reps' && !timedEx && assistOrLest ? ` (${assistText(assistOrLest)})` : ''
      }${rpe ? ` • ressenti ${rpe}/10` : ''}`
    };
  });
}
