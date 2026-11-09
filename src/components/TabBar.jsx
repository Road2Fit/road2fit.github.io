import { useRef } from 'react';
import { Art } from './Art';
import { ACHIEVEMENTS_LIST } from '../data/gamification';

// Onglets de l'application. `group` : « plus » = Communauté (Souvenirs, Amis), regroupés dans la barre du bas sur téléphone ;
// « profil » = Bilan et Trophées, ouverts seulement depuis le profil (en haut à gauche), jamais dans les barres d'onglets.
export const TABS = [
  { id: 'coach', icon: '🧠', art: 'coach', label: 'Coach' },
  { id: 'quests', icon: '🏋️', art: 'dumbbell', label: 'Exercices' },
  { id: 'journal', icon: '📅', art: 'calendar', label: 'Journal' },
  { id: 'photos', icon: '📸', art: 'camera', label: 'Souvenirs', group: 'plus' },
  { id: 'bilan', icon: '📊', art: 'clipboard', label: 'Bilan', group: 'profil' },
  { id: 'trophies', icon: '🏆', art: 'trophy', label: 'Trophées', group: 'profil' },
  { id: 'friends', icon: '👥', art: 'friends', label: 'Amis', group: 'plus' },
];
export const SUIVI_TABS = TABS.filter(t => t.group === 'suivi');
export const PLUS_TABS = TABS.filter(t => t.group === 'plus');
export const BAR_TABS = TABS.filter(t => t.group !== 'profil');

const tabText = (t, gameState) =>
  t.id === 'quests' ? `${t.label} (${gameState.quests.length})`
    : t.id === 'trophies' ? `${t.label} (${gameState.unlockedAchievements.length}/${ACHIEVEMENTS_LIST.length})`
      : t.label;

// Grande barre d'onglets (ordinateur et tablette)
export function TabBar({ activeTab, gameState, setActiveTab, badges = null }) {
  return (
    <nav className="hidden md:flex flex-wrap items-center gap-1.5 border-b border-slate-800 pb-3" aria-label="Onglets">
      {BAR_TABS.map(t => (
        <button
          key={t.id}
          onClick={() => setActiveTab(t.id)}
          data-tab={t.id}
          aria-current={activeTab === t.id ? 'page' : undefined}
          className={`relative shrink-0 whitespace-nowrap rounded-xl font-bold px-3 py-2 text-sm transition ${activeTab === t.id ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
        >
          <Art name={t.art} size={16} />{tabText(t, gameState)}
          {badges && badges[t.id] > 0 && <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-rose-500 text-[10px] leading-[1.1rem] font-black text-white text-center" data-testid={`badge-${t.id}`}>{badges[t.id]}</span>}
        </button>
      ))}
    </nav>
  );
}

// Téléphone : petites pastilles pour passer de Poids / Maxima / Courbes (ou Souvenirs / Bilan / Trophées)
export function SubTabs({ activeTab, setActiveTab, badges = null }) {
  const group = SUIVI_TABS.some(t => t.id === activeTab) ? SUIVI_TABS : PLUS_TABS.some(t => t.id === activeTab) ? PLUS_TABS : null;
  if (!group) return null;
  return (
    <div className="md:hidden flex gap-1.5" role="group" aria-label="Sous-onglets">
      {group.map(t => (
        <button
          key={t.id}
          onClick={() => setActiveTab(t.id)}
          className={`relative flex-1 px-2 py-2 rounded-xl text-xs font-bold border ${activeTab === t.id ? 'bg-pink-600 border-pink-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-300'}`}
        >
          <Art name={t.art} size={15} className="mr-1" />{t.label}
          {badges && badges[t.id] > 0 && <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-rose-500 text-[10px] leading-[1.1rem] font-black text-white text-center" data-testid={`badge-${t.id}`}>{badges[t.id]}</span>}
        </button>
      ))}
    </div>
  );
}

// Téléphone : barre fixe en bas de l'écran
export function BottomNav({ activeTab, moreOpen, onOpenMore, setActiveTab, badges = null }) {
  // « Communauté » rouvre la dernière page choisie (Souvenirs ou Amis)
  const lastCommunity = useRef('photos');
  if (PLUS_TABS.some(t => t.id === activeTab)) lastCommunity.current = activeTab;
  const plusBadge = badges ? PLUS_TABS.reduce((n, t) => n + (Number(badges[t.id]) || 0), 0) : 0;
  const inPlus = PLUS_TABS.some(t => t.id === activeTab);
  const items = [
    { key: 'coach', art: 'coach', label: 'Coach', on: activeTab === 'coach', go: () => setActiveTab('coach') },
    { key: 'quests', art: 'dumbbell', label: 'Exercices', on: activeTab === 'quests', go: () => setActiveTab('quests') },
    { key: 'journal', art: 'calendar', label: 'Journal', on: activeTab === 'journal', go: () => setActiveTab('journal') },
    { key: 'plus', art: 'friends', label: 'Communauté', on: inPlus, go: () => setActiveTab(inPlus ? activeTab : (lastCommunity.current || 'photos')) },
  ];
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 backdrop-blur border-t border-slate-800 grid grid-cols-4 pb-[env(safe-area-inset-bottom)]" aria-label="Navigation">
      {items.map(i => (
        <button key={i.key} onClick={i.go} className={`relative flex flex-col items-center justify-center gap-0.5 py-2 ${i.on ? 'text-pink-300' : 'text-slate-400'}`}>
          {i.key === 'plus' && plusBadge > 0 && <span className="absolute top-1 right-[calc(50%-1.4rem)] w-2.5 h-2.5 rounded-full bg-rose-500" data-testid="badge-plus" />}
          <Art name={i.art} size={26} bare className={i.on ? '' : 'opacity-75'} />
          <span className={`text-xs ${i.on ? 'font-black' : 'font-bold'}`}>{i.label}</span>
        </button>
      ))}
    </nav>
  );
}
