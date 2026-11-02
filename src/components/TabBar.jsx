import { Art } from './Art';
import { ACHIEVEMENTS_LIST } from '../data/gamification';

// Onglets de l'application. `group` : « suivi » (poids, maxima, courbes) et « plus » (souvenirs, bilan, trophées)
// sont regroupés dans la barre du bas sur téléphone.
export const TABS = [
  { id: 'coach', icon: '🧠', art: 'coach', label: 'Coach' },
  { id: 'quests', icon: '🏋️', art: 'dumbbell', label: 'Exercices' },
  { id: 'journal', icon: '📅', art: 'calendar', label: 'Journal' },
  { id: 'charts', icon: '📈', art: 'chart', label: 'Courbes', group: 'suivi' },
  { id: 'maxima', icon: '💯', art: 'gauge', label: 'Mes maxima', group: 'suivi' },
  { id: 'weight', icon: '⚖️', art: 'scale', label: 'Poids', group: 'suivi' },
  { id: 'photos', icon: '📸', art: 'camera', label: 'Souvenirs', group: 'plus' },
  { id: 'bilan', icon: '📊', art: 'clipboard', label: 'Bilan', group: 'plus' },
  { id: 'trophies', icon: '🏆', art: 'trophy', label: 'Trophées', group: 'plus' },
  { id: 'friends', icon: '👥', art: 'friends', label: 'Amis', group: 'plus' },
];
export const SUIVI_TABS = TABS.filter(t => t.group === 'suivi');
export const PLUS_TABS = TABS.filter(t => t.group === 'plus');

const tabText = (t, gameState) =>
  t.id === 'quests' ? `${t.label} (${gameState.quests.length})`
    : t.id === 'trophies' ? `${t.label} (${gameState.unlockedAchievements.length}/${ACHIEVEMENTS_LIST.length})`
      : t.label;

// Grande barre d'onglets (ordinateur et tablette)
export function TabBar({ activeTab, gameState, setActiveTab }) {
  return (
    <nav className="hidden md:flex flex-wrap items-center gap-1.5 border-b border-slate-800 pb-3" aria-label="Onglets">
      {TABS.map(t => (
        <button
          key={t.id}
          onClick={() => setActiveTab(t.id)}
          data-tab={t.id}
          aria-current={activeTab === t.id ? 'page' : undefined}
          className={`shrink-0 whitespace-nowrap rounded-xl font-bold px-3 py-2 text-sm transition ${activeTab === t.id ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
        >
          <Art name={t.art} size={16} />{tabText(t, gameState)}
        </button>
      ))}
    </nav>
  );
}

// Téléphone : petites pastilles pour passer de Poids / Maxima / Courbes (ou Souvenirs / Bilan / Trophées)
export function SubTabs({ activeTab, setActiveTab }) {
  const group = SUIVI_TABS.some(t => t.id === activeTab) ? SUIVI_TABS : PLUS_TABS.some(t => t.id === activeTab) ? PLUS_TABS : null;
  if (!group) return null;
  return (
    <div className="md:hidden flex gap-1.5" role="group" aria-label="Sous-onglets">
      {group.map(t => (
        <button
          key={t.id}
          onClick={() => setActiveTab(t.id)}
          className={`flex-1 px-2 py-2 rounded-xl text-xs font-bold border ${activeTab === t.id ? 'bg-pink-600 border-pink-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-300'}`}
        >
          <Art name={t.art} size={15} className="mr-1" />{t.label}
        </button>
      ))}
    </div>
  );
}

// Téléphone : barre fixe en bas de l'écran
export function BottomNav({ activeTab, moreOpen, onOpenMore, setActiveTab }) {
  const inSuivi = SUIVI_TABS.some(t => t.id === activeTab);
  const inPlus = PLUS_TABS.some(t => t.id === activeTab);
  const items = [
    { key: 'coach', art: 'coach', label: 'Coach', on: activeTab === 'coach', go: () => setActiveTab('coach') },
    { key: 'quests', art: 'dumbbell', label: 'Exercices', on: activeTab === 'quests', go: () => setActiveTab('quests') },
    { key: 'journal', art: 'calendar', label: 'Journal', on: activeTab === 'journal', go: () => setActiveTab('journal') },
    { key: 'suivi', art: 'chart', label: 'Suivi', on: inSuivi, go: () => setActiveTab(inSuivi ? activeTab : 'weight') },
    { key: 'plus', art: 'more', label: 'Plus', on: inPlus || moreOpen, go: onOpenMore },
  ];
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 backdrop-blur border-t border-slate-800 grid grid-cols-5 pb-[env(safe-area-inset-bottom)]" aria-label="Navigation">
      {items.map(i => (
        <button key={i.key} onClick={i.go} className={`flex flex-col items-center justify-center gap-0.5 py-2 ${i.on ? 'text-pink-300' : 'text-slate-400'}`}>
          <Art name={i.art} size={26} bare className={i.on ? '' : 'opacity-75'} />
          <span className={`text-xs ${i.on ? 'font-black' : 'font-bold'}`}>{i.label}</span>
        </button>
      ))}
    </nav>
  );
}
