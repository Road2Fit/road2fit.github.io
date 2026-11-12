import { useEffect, useRef, useState } from 'react';
import { coinsForLevel } from '../anim/shop';
import { playGameSound } from '../lib/sound';

/**
 * Célèbre chaque passage de niveau : message à chaque niveau, grande fenêtre quand on change de rang.
 * Rien au démarrage : on ne célèbre que les niveaux gagnés pendant l'utilisation.
 */
export function useLevelCelebration({ levelInfo, isLoaded, syncStatus, soundEnabled, triggerToast }) {
  const [celebration, setCelebration] = useState(null);
  const previous = useRef(null);

  useEffect(() => {
    if (!isLoaded.current) return;
    const before = previous.current;
    previous.current = { level: levelInfo.level, rank: levelInfo.rank.title };
    if (before === null || levelInfo.level <= before.level) return;
    playGameSound('boss', soundEnabled);
    if (levelInfo.rank.title !== before.rank) {
      setCelebration({ level: levelInfo.level, rank: levelInfo.rank, nextRank: levelInfo.nextRank });
    } else {
      triggerToast(
        `Niveau ${levelInfo.level} atteint !`,
        `+${coinsForLevel(levelInfo.level)} pièces pour la boutique de ton avatar. Encore ${levelInfo.nextLevelXp - levelInfo.currentLevelXp} EXP pour le niveau ${levelInfo.level + 1}.`,
        0,
        '🎉'
      );
    }
  }, [levelInfo.level, syncStatus]);

  return { celebration, closeCelebration: () => setCelebration(null) };
}
