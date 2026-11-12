import { useEffect, useMemo, useRef, useState } from 'react';
import { CoachPanel } from './components/coach/CoachPanel';
import { aiStatus, callAi } from './ai/client';
import { togglePain } from './coach/pains';
import { getCoachSettings } from './coach/settings';
import { formContext, normalizeFormAi } from './ai/form';
import { PhotoReminder } from './components/photos/PhotoReminder';
import { RestTimer } from './components/RestTimer';
import { CoachBanner } from './components/CoachBanner';

import { getTodayISODate } from './lib/dates';
import { DailySummary } from './components/DailySummary';
import { BottomNav, SubTabs, TabBar } from './components/TabBar';
import { useFriendPhotos } from './hooks/useFriendPhotos';
import { useFriends } from './hooks/useFriends';
import { QuickAddMenu } from './components/QuickAddMenu';
import { UpdateBanner } from './components/UpdateBanner';
import { PatchNotes } from './components/PatchNotes';
import { MovementHost } from './components/MovementHost';
import { playGameSound } from './lib/sound';
import { ToastBanner } from './components/ToastBanner';
import { UndoBar } from './components/UndoBar';
import { AppHeader } from './components/header/AppHeader';
import { useDataTransfer } from './hooks/useDataTransfer';
import { useDerivedStats } from './hooks/useDerivedStats';
import { useLevelCelebration } from './hooks/useLevelCelebration';
import { useRankTrial } from './hooks/useRankTrial';
import { useGameState } from './hooks/useGameState';
import { useGuidedSession } from './hooks/useGuidedSession';
import { useLevelUp } from './hooks/useLevelUp';
import { useLogSession } from './hooks/useLogSession';
import { useQuestActions } from './hooks/useQuestActions';
import { useQuestForm } from './hooks/useQuestForm';
import { useQuickCardio } from './hooks/useQuickCardio';
import { useRewards } from './hooks/useRewards';
import { useToast } from './hooks/useToast';
import { useWeightLog } from './hooks/useWeightLog';
import './data/sharedExercises'; // catalogue commun (exercices créés par le coach) : copie locale chargée tout de suite
import { useSharedExercises } from './hooks/useSharedExercises';
import { needsOnboarding } from './lib/onboarding';
import { NEUTRAL } from './edition';
import { readRecoveryToken } from './components/AccountForm';
import { hasArena } from './data/muscles';

// Écrans chargés à la demande (4.22) : l'appli s'ouvre plus vite, chaque onglet ou fenêtre arrive quand on l'ouvre.
// Tous les écrans sont ensuite préchargés en arrière-plan, quelques secondes après l'ouverture : l'appli reste
// utilisable hors connexion (le service worker garde chaque fichier dès qu'il a été chargé une fois).
const LOADERS = [];
if (typeof window !== 'undefined') {
  const warm = () => LOADERS.reduce((p, l) => p.then(l).catch(() => {}), Promise.resolve());
  window.addEventListener('load', () => setTimeout(warm, 4000), { once: true });
  window.__r2fWarm = warm; // tests : tout précharger d'un coup
}
function lz(loader, name) {
  // pas de React.lazy / Suspense : un écran déjà chargé s'affiche tout de suite (aucune attente), sinon dès son arrivée
  let Comp = null, pending = null;
  const load = () => pending || (pending = loader().then(m => { Comp = m[name]; }, e => { pending = null; throw e; }));
  LOADERS.push(load);
  return function Lazy(props) {
    const [, force] = useState(0);
    useEffect(() => {
      if (Comp) return undefined;
      let on = true;
      load().then(() => { if (on) force(n => n + 1); }).catch(() => {});
      return () => { on = false; };
    }, []);
    return Comp ? <Comp {...props} /> : null;
  };
}
const GuidedSession = lz(() => import('./components/GuidedSession'), 'GuidedSession');
const PhotoCalendar = lz(() => import('./components/photos/PhotoCalendar'), 'PhotoCalendar');
const SessionRecap = lz(() => import('./components/SessionRecap'), 'SessionRecap');
const BilanTab = lz(() => import('./tabs/BilanTab'), 'BilanTab');
const JournalTab = lz(() => import('./tabs/JournalTab'), 'JournalTab');
const LevelUpModal = lz(() => import('./modals/LevelUpModal'), 'LevelUpModal');
const LogSessionModal = lz(() => import('./modals/LogSessionModal'), 'LogSessionModal');
const QuestFormModal = lz(() => import('./modals/QuestFormModal'), 'QuestFormModal');
const QuestsTab = lz(() => import('./tabs/QuestsTab'), 'QuestsTab');
const QuickCardioModal = lz(() => import('./modals/QuickCardioModal'), 'QuickCardioModal');
const ResetModal = lz(() => import('./modals/ResetModal'), 'ResetModal');
const MoreSheet = lz(() => import('./modals/MoreSheet'), 'MoreSheet');
const FriendsTab = lz(() => import('./tabs/FriendsTab'), 'FriendsTab');
const VoiceWorkoutAssistant = lz(() => import('./components/VoiceWorkoutAssistant'), 'VoiceWorkoutAssistant');
const TrophiesTab = lz(() => import('./tabs/TrophiesTab'), 'TrophiesTab');
const WeightTab = lz(() => import('./tabs/WeightTab'), 'WeightTab');
const RankTrialModal = lz(() => import('./modals/RankTrialModal'), 'RankTrialModal');
const RewardsModal = lz(() => import('./modals/RewardsModal'), 'RewardsModal');
const RankUpModal = lz(() => import('./modals/RankUpModal'), 'RankUpModal');
const OnboardingModal = lz(() => import('./modals/OnboardingModal'), 'OnboardingModal');
const LexiconModal = lz(() => import('./modals/LexiconModal'), 'LexiconModal');
const ImportCsvModal = lz(() => import('./modals/ImportCsvModal'), 'ImportCsvModal');
const AccountModal = lz(() => import('./modals/AccountModal'), 'AccountModal');

export function App() {
  const { gameState, setGameState, setGameStateAuto, sync, isLoaded } = useGameState();
  const [accountOpen, setAccountOpen] = useState(false);
  const [recovery, setRecovery] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);
  // Navigation et filtres
  const [activeTab, setActiveTab] = useState('coach'); // l'appli s'ouvre sur le Coach : c'est lui qui dit quoi faire aujourd'hui
  useSharedExercises(sync.user);
  const friends = useFriends({ gameState, setGameState, isLoaded: sync.isLoaded, user: sync.user, active: activeTab === 'friends' });
  // photos entre amis : ma dernière photo (si activé), photos où l'on m'a tagué (pastille sur Souvenirs)
  const fphotos = useFriendPhotos({ gameState, setGameState, user: sync.user, enabled: friends.enabled, activeTab });
  const tabBadges = { photos: fphotos.unseen };
  // Ouvre un onglet depuis un bouton du haut de la page (gros bouton Coach, en-tête…) et fait défiler jusqu'à lui,
  // pour ne pas avoir à descendre à la main.
  const tabsRef = useRef(null);
  const goToTab = tab => {
    setActiveTab(tab);
    const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // court délai : le temps que le nouvel onglet soit affiché avant de défiler
    setTimeout(() => {
      if (tabsRef.current) tabsRef.current.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    }, 60);
  };
  const [questFilter, setQuestFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(getTodayISODate());
  const [selectedJournalDay, setSelectedJournalDay] = useState(getTodayISODate());
  const [selectedChartQuestId, setSelectedChartQuestId] = useState(
    () => gameState.quests[0]?.id || ''
  );

  const { toast, triggerToast, dismissToast } = useToast();
  // stockage du téléphone plein ou presque : on le dit (sinon les dernières séances pourraient ne pas être gardées)
  useEffect(() => {
    const on = e => (e.detail && e.detail.full
      ? triggerToast('Sauvegarde impossible sur cet appareil', 'Le stockage du navigateur est plein. Connecte ton compte (Plus → Mon compte) ou exporte tes données.', 0, '⚠️')
      : triggerToast('Stockage presque plein', 'Pense à connecter ton compte ou à exporter tes données (menu Plus).', 0, '⚠️'));
    window.addEventListener('rondoufit-storage', on);
    return () => window.removeEventListener('rondoufit-storage', on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [obOpen, setObOpen] = useState(false);
  const [lexOpen, setLexOpen] = useState(false);
  // ouvrir le lexique depuis ailleurs (séance guidée : « Les mots de la séance ») : événement rondoufit-lexicon, detail 'basics'
  useEffect(() => {
    const on = e => setLexOpen(e.detail === 'basics' ? 'basics' : true);
    window.addEventListener('rondoufit-lexicon', on);
    return () => window.removeEventListener('rondoufit-lexicon', on);
  }, []);
  const [csvOpen, setCsvOpen] = useState(false);
  useEffect(() => { setQuestFilter('all'); }, [gameState.muscleMode]); // les groupes changent avec le mode : on repart de « tous »
  const openSync = () => setAccountOpen(true); // la sauvegarde est le compte de l'application
  useEffect(() => { // « Me connecter » depuis le coach intelligent
    const h = () => setAccountOpen(true);
    window.addEventListener('rondoufit-account', h);
    return () => window.removeEventListener('rondoufit-account', h);
  }, []);
  // lien « mot de passe oublié » reçu par e-mail : l'adresse contient un jeton temporaire
  useEffect(() => {
    const t = readRecoveryToken();
    if (t) { setRecovery(t); setAccountOpen(true); try { window.history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) { /* rien */ } }
  }, []);

  // « 🚩 Cette animation est fausse » (fenêtre Voir le mouvement) : on garde la liste dans la sauvegarde pour la corriger ensuite
  useEffect(() => {
    const h = e => {
      const d = e.detail || {};
      const at = new Date().toISOString();
      setGameState(prev => ({ ...prev, animFlags: [...(prev.animFlags || []), { id: 'af_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), animId: d.animId || '', view: d.view || 'side', name: d.name || '', at }] }));
      triggerToast('Noté, merci ! L’animation sera revérifiée.');
    };
    window.addEventListener('rondoufit-animflag', h);
    return () => window.removeEventListener('rondoufit-animflag', h);
  }, [setGameState, triggerToast]);

  // Record du jeu du repos (4.28) : gardé dans la sauvegarde (synchronisée, publiée pour les amis) ET sur l'appareil
  // (rondoufit:gameBest, lu par le jeu). Les deux se recopient le plus haut.
  useEffect(() => {
    const h = e => {
      const v = Number(e.detail) || 0;
      setGameState(prev => (v > (Number(prev.gameBest) || 0) ? { ...prev, gameBest: v } : prev));
    };
    window.addEventListener('rondoufit-gamebest', h);
    return () => window.removeEventListener('rondoufit-gamebest', h);
  }, [setGameState]);
  useEffect(() => {
    let local = 0;
    try { local = Number(localStorage.getItem('rondoufit:gameBest')) || 0; } catch (e) { /* rien */ }
    const saved = Number(gameState.gameBest) || 0;
    if (local > saved) setGameState(prev => (local > (Number(prev.gameBest) || 0) ? { ...prev, gameBest: local } : prev));
    else if (saved > local) { try { localStorage.setItem('rondoufit:gameBest', String(saved)); } catch (e) { /* rien */ } }
  }, [gameState.gameBest, setGameState]);

  const {
    paidAchievementsRef, skipPRRef, undoInfo, registerUndo, handleUndo, weekData, records, achStats,
  } = useRewards({
    syncStatus: sync.status, gameState, isLoaded, setGameState, setGameStateAuto, triggerToast,
  });

  // Un objet par sujet (levelUp, form, quick, log, weight) : il est donné tel quel à la fenêtre correspondante.
  const levelUp = useLevelUp({ gameState, setGameState, triggerToast });
  const form = useQuestForm({ gameState, setGameState, setSelectedChartQuestId, triggerToast });

  const quick = useQuickCardio({ gameState, setGameState, setSelectedDate, setSelectedJournalDay, triggerToast });
  const weight = useWeightLog({ gameState, registerUndo, setGameState, triggerToast });

  const {
    confirmResetOpen, setConfirmResetOpen, importInputRef, handleExportJSON, handleImportJSON,
    handleResetAll, handleRestoreSafetyCopy,
  } = useDataTransfer({
    gameState, paidAchievementsRef, setGameState, skipPRRef, triggerToast,
  });

  const {
    levelInfo, currentStreak, arenaLevels, dailySummary, dailyJournalList, lifetimeStats, xpBonusPct,
  } = useDerivedStats({
    gameState, selectedDate,
  });

  const { trialOpen, setTrialOpen, trialRank, trialEval, validateTrial } = useRankTrial({
    gameState, setGameState, triggerToast,
  });
  const [rewardsOpen, setRewardsOpen] = useState(false);

  const { celebration, closeCelebration } = useLevelCelebration({
    levelInfo, isLoaded, syncStatus: sync.status, soundEnabled: gameState.soundEnabled, triggerToast,
  });

  const log = useLogSession({
    gameState, openLevelUpModal: levelUp.openLevelUpModal, selectedDate, setGameState, setSelectedDate, setSelectedJournalDay, triggerToast,
  });

  const {
    guided, setGuided, guidedOpen, setGuidedOpen, startGuided, handleFinishGuided, recap, setRecap, swapChoices, swapExercise, undoSwap,
  } = useGuidedSession({
    gameState, openLevelUpModal: levelUp.openLevelUpModal, setGameState, setSelectedDate, setSelectedJournalDay, triggerToast, isLoaded: sync.isLoaded,
  });

  const {
    handleClaimWeekly, addQuestFromCatalog, handleDeleteSessionEntry, handleEditSessionEntry, handleDeleteQuest,
  } = useQuestActions({
    gameState, registerUndo, setGameState, triggerToast,
  });
  const filteredQuests = useMemo(() => {
    if (questFilter === 'all') return gameState.quests;
    return gameState.quests.filter(
      q => hasArena(q, questFilter)
    );
  }, [gameState.quests, questFilter]);

  const activeChartQuest = useMemo(() => {
    return (
      gameState.quests.find(q => q.id === selectedChartQuestId) ||
      gameState.quests[0] ||
      null
    );
  }, [gameState.quests, selectedChartQuestId]);

  const activeJournalDayObj = useMemo(() => {
    return (
      dailyJournalList.find(d => d.date === selectedJournalDay) ||
      dailyJournalList[0] ||
      null
    );
  }, [dailyJournalList, selectedJournalDay]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-pink-500 selection:text-white pb-24 md:pb-16">
      {/* TOAST NOTIFICATION POKÉMON RONDOUDOU */}
      {toast && (
        <ToastBanner dismissToast={dismissToast} toast={toast} />
      )}

      {undoInfo && (
        <UndoBar handleUndo={handleUndo} undoInfo={undoInfo} />
      )}

      {/* EN-TÊTE : AVATAR RONDOUDOU NATUREL EN HAUT À GAUCHE */}
      <AppHeader
        currentStreak={currentStreak}
        gameState={gameState}
        levelInfo={levelInfo}
        lifetimeStats={lifetimeStats}
        onOpenMore={() => setMoreOpen(true)}
        onOpenRewards={() => setRewardsOpen(true)}
        onOpenSync={openSync}
        onOpenTrial={() => setTrialOpen(true)}
        onRetrySync={sync.syncNow}
        setActiveTab={goToTab}
        streakBonusPct={xpBonusPct}
        syncStatus={sync.status}
        trialRank={trialRank}
        renderWeight={() => <WeightTab gameState={gameState} setGameState={setGameState} {...weight} />}
      />

      {/* CONTENU PRINCIPAL */}
      <main className="max-w-6xl mx-auto px-4 pt-4 sm:pt-6 space-y-4 sm:space-y-6 pb-8">
{/* La carte du jour est dans le Coach ; ailleurs, seulement pour reprendre une séance en cours */}
{(activeTab === 'coach' || guided) && (
<CoachBanner
  gameState={gameState}
  guidedActive={!!guided}
  onCoachTab={activeTab === 'coach'}
  onOpenCoach={() => goToTab('coach')}
  onResumeGuided={() => setGuidedOpen(true)}
  onStartGuided={startGuided}
/>
)}
{recap && <SessionRecap recap={recap} onClose={() => setRecap(null)} />}
{guided && guidedOpen && (
<GuidedSession
g={guided}
setG={setGuided}
onFinish={handleFinishGuided}
onMinimize={() => setGuidedOpen(false)}
onCancel={() => { setGuided(null); setGuidedOpen(false); }}
 soundEnabled={gameState.soundEnabled !== false}
 pains={(gameState.coach && gameState.coach.pains) || []}
 onTogglePain={(zone, side) => setGameState(prev => { const c = getCoachSettings(prev); return { ...prev, coach: { ...c, pains: togglePain(c, zone, side, getTodayISODate()) } }; })}
 aiForm={aiStatus(gameState) === 'ok' ? args => callAi('form', { context: formContext(gameState, args) }, { timeoutMs: 60000 }).then(normalizeFormAi) : null}
swapChoices={swapChoices}
onSwap={swapExercise}
onUndoSwap={undoSwap}/>
)}
<RestTimer guidedOpen={!!(guided && guidedOpen)} soundEnabled={gameState.soundEnabled} />
        {/* BARRE D'ONGLETS PRINCIPALE */}
        <div ref={tabsRef} className="scroll-mt-3 space-y-3">
          <TabBar activeTab={activeTab} gameState={gameState} setActiveTab={setActiveTab} badges={tabBadges} />
          <SubTabs activeTab={activeTab} setActiveTab={setActiveTab} badges={tabBadges} />
        </div>

        <div key={activeTab} className="tab-in space-y-4 sm:space-y-6">
        {activeTab === 'coach' && (
          <CoachPanel
            gameState={gameState}
            setGameState={setGameState}
            onStartGuided={startGuided}
            onOpenLevelUp={levelUp.openLevelUpModal}
            onAddExercise={addQuestFromCatalog}
            onQuickCardio={() => { quick.setQuickCardioDate(getTodayISODate()); quick.setQuickCardioModalOpen(true); }}
            onGoTab={goToTab}
            guidedActive={!!guided}
            onResumeGuided={() => setGuidedOpen(true)}
            onClaimWeekly={handleClaimWeekly}
          />
        )}

        {/* ONGLET 1 : CARTES DES QUÊTES & OBJECTIFS */}
        {activeTab === 'quests' && (
          <QuestsTab
setGameState={setGameState}
            arenaLevels={arenaLevels}
            filteredQuests={filteredQuests}
            gameState={gameState}
            handleDeleteQuest={handleDeleteQuest}
            openCreateQuestModal={form.openCreateQuestModal}
            openEditQuestModal={form.openEditQuestModal}
            openLevelUpModal={levelUp.openLevelUpModal}
            openLogModal={log.openLogModal}
            questFilter={questFilter}
            setActiveTab={setActiveTab}
            setQuestFilter={setQuestFilter}
            setSelectedChartQuestId={setSelectedChartQuestId}
          />
        )}

        {/* ONGLET 2 : 📅 JOURNAL DES SÉANCES */}
        {activeTab === 'journal' && (
          <DailySummary dailySummary={dailySummary} handleDeleteSessionEntry={handleDeleteSessionEntry} selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
        )}
        {activeTab === 'journal' && (
          <JournalTab activeJournalDayObj={activeJournalDayObj} dailyJournalList={dailyJournalList} handleDeleteSessionEntry={handleDeleteSessionEntry} handleEditSessionEntry={handleEditSessionEntry} setSelectedJournalDay={setSelectedJournalDay} />
        )}


        {/* ONGLET : 💯 MES MAXIMA */}

        {/* ONGLET 4 : ⚖️ SUIVI DU POIDS */}

        {/* ONGLET : BILAN (défis, semaine, records) */}
        {activeTab !== 'photos' && <PhotoReminder gameState={gameState} onGo={() => goToTab('photos')} />}
        {activeTab === 'photos' && <PhotoCalendar gameState={gameState} fphotos={fphotos} friendsList={friends.list} />}

        {activeTab === 'bilan' && (
          <BilanTab gameState={gameState} levelInfo={levelInfo} records={records} weekData={weekData} />
        )}

        {activeTab === 'friends' && <FriendsTab friends={friends} onOpenAccount={openSync} fphotos={fphotos} photoShare={!!gameState.friendsPhotoShare} setPhotoShare={v => setGameState(prev => ({ ...prev, friendsPhotoShare: !!v }))} />}

        {/* ONGLET 5 : TROPHÉES */}
        {activeTab === 'trophies' && (
          <TrophiesTab achStats={achStats} gameState={gameState} onClaimWeekly={handleClaimWeekly} />
        )}
        </div>
      </main>

      {/* MODALE 1 : NOTER UNE SÉANCE */}
      {log.logModalQuest && <LogSessionModal {...log} />}

      {levelUp.levelUpModalQuest && <LevelUpModal {...levelUp} />}

      {form.questModalOpen && <QuestFormModal {...form} />}

      {/* MODALE 4 : AJOUT RAPIDE "+ COURSE / MARCHE DU JOUR" */}
      {quick.quickCardioModalOpen && <QuickCardioModal {...quick} />}

      {/* MODALE 5 : AVERTISSEMENT DE RÉINITIALISATION SÉCURISÉ */}
      {confirmResetOpen && (
        <ResetModal handleResetAll={handleResetAll} setConfirmResetOpen={setConfirmResetOpen} />
      )}


      {/* MODALE 7 : RÉCOMPENSES DE NIVEAU */}
      {rewardsOpen && (
        <RewardsModal gameState={gameState} levelInfo={levelInfo} onClose={() => setRewardsOpen(false)} setGameState={setGameState} />
      )}

      {/* MODALE 8 : ÉPREUVE DE RANG */}
      {trialOpen && trialRank && (
        <RankTrialModal levelInfo={levelInfo} onClose={() => setTrialOpen(false)} onValidate={validateTrial} trialEval={trialEval} trialRank={trialRank} />
      )}

      {/* DICTÉE VOCALE (ouverte depuis le bouton « + ») */}
      <VoiceWorkoutAssistant gameState={gameState} setGameState={setGameState} selectedDate={selectedDate} triggerToast={triggerToast} playGameSound={playGameSound} />
      <input ref={importInputRef} type="file" accept="application/json,.json" onChange={handleImportJSON} className="hidden" />

      {moreOpen && (
        <MoreSheet
          badges={tabBadges}
          activeTab={activeTab}
          gameState={gameState}
          importInputRef={importInputRef}
          levelInfo={levelInfo}
          onOpenRewards={() => setRewardsOpen(true)}
          onOpenTrial={() => setTrialOpen(true)}
          trialRank={trialRank}
          onClose={() => setMoreOpen(false)}
          onExport={handleExportJSON}
          onGoTab={goToTab}
          onOpenOnboarding={() => setObOpen(true)}
          onOpenLexicon={() => setLexOpen(true)}
          onOpenCsvImport={() => setCsvOpen(true)}
          onOpenSync={openSync}
          onReset={() => setConfirmResetOpen(true)}
          onRestore={handleRestoreSafetyCopy}
          setGameState={setGameState}
          syncStatus={sync.status}
        />
      )}

      {!(guided && guidedOpen) && (
        <QuickAddMenu
          onCourse={() => { quick.setQuickCardioDate(selectedDate); quick.setQuickCardioModalOpen(true); }}
          onExercise={form.openCreateQuestModal}
          onTimer={() => window.dispatchEvent(new CustomEvent('rondoufit-rest-open'))}
          onVoice={() => window.dispatchEvent(new CustomEvent('rondoufit-voice'))}
          voiceBadge={!gameState.voiceNextSeen}
        />
      )}
      <BottomNav activeTab={activeTab} moreOpen={moreOpen} onOpenMore={() => setMoreOpen(true)} setActiveTab={goToTab} badges={tabBadges} />
      {accountOpen && <AccountModal sync={sync} recovery={recovery} heroName={gameState.heroName} onRenameHero={name => setGameState(prev => ({ ...prev, heroName: name }))} onClose={() => { setAccountOpen(false); setRecovery(null); }} />}
      <MovementHost />
      {lexOpen && <LexiconModal start={lexOpen === 'basics' ? 'basics' : ''} onClose={() => setLexOpen(false)} />}
      {csvOpen && <ImportCsvModal gameState={gameState} setGameState={setGameState} triggerToast={triggerToast} onClose={() => setCsvOpen(false)} />}
      {(obOpen || (NEUTRAL && isLoaded && needsOnboarding(gameState))) && (
        <OnboardingModal sync={sync} setGameState={setGameState} triggerToast={triggerToast} onDone={() => setObOpen(false)} />
      )}
      <UpdateBanner />
      <PatchNotes />

      {/* CÉLÉBRATION : NOUVEAU RANG */}
      {celebration && <RankUpModal celebration={celebration} onClose={closeCelebration} />}
    </div>
  );
}
