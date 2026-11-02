import { useEffect, useMemo, useRef, useState } from 'react';
import { CoachPanel } from './components/coach/CoachPanel';
import { GuidedSession } from './components/GuidedSession';
import { PhotoCalendar } from './components/photos/PhotoCalendar';
import { PhotoReminder } from './components/photos/PhotoReminder';
import { RestTimer } from './components/RestTimer';
import { SessionRecap } from './components/SessionRecap';
import { CoachBanner } from './components/CoachBanner';

import { getTodayISODate } from './lib/dates';
import { BilanTab } from './tabs/BilanTab';
import { ChartsTab } from './tabs/ChartsTab';
import { DailySummary } from './components/DailySummary';
import { JournalTab } from './tabs/JournalTab';
import { MaximaTab } from './tabs/MaximaTab';
import { LevelUpModal } from './modals/LevelUpModal';
import { LogSessionModal } from './modals/LogSessionModal';
import { QuestFormModal } from './modals/QuestFormModal';
import { QuestsTab } from './tabs/QuestsTab';
import { QuickCardioModal } from './modals/QuickCardioModal';
import { ResetModal } from './modals/ResetModal';
import { BottomNav, SubTabs, TabBar } from './components/TabBar';
import { MoreSheet } from './modals/MoreSheet';
import { FriendsTab } from './tabs/FriendsTab';
import { useFriends } from './hooks/useFriends';
import { QuickAddMenu } from './components/QuickAddMenu';
import { UpdateBanner } from './components/UpdateBanner';
import { PatchNotes } from './components/PatchNotes';
import { MovementHost } from './components/MovementHost';
import { VoiceWorkoutAssistant } from './components/VoiceWorkoutAssistant';
import { playGameSound } from './lib/sound';
import { ToastBanner } from './components/ToastBanner';
import { TrophiesTab } from './tabs/TrophiesTab';
import { UndoBar } from './components/UndoBar';
import { WeightTab } from './tabs/WeightTab';
import { AppHeader } from './components/header/AppHeader';
import { useDataTransfer } from './hooks/useDataTransfer';
import { useDerivedStats } from './hooks/useDerivedStats';
import { useLevelCelebration } from './hooks/useLevelCelebration';
import { useRankTrial } from './hooks/useRankTrial';
import { RankTrialModal } from './modals/RankTrialModal';
import { RewardsModal } from './modals/RewardsModal';
import { RankUpModal } from './modals/RankUpModal';
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
import { OnboardingModal } from './modals/OnboardingModal';
import { needsOnboarding } from './lib/onboarding';
import { NEUTRAL } from './edition';
import { AccountModal } from './modals/AccountModal';
import { readRecoveryToken } from './components/AccountForm';
import { hasArena } from './data/muscles';

export function App() {
  const { gameState, setGameState, setGameStateAuto, sync, isLoaded } = useGameState();
  const [accountOpen, setAccountOpen] = useState(false);
  const [recovery, setRecovery] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);
  // Navigation et filtres
  const [activeTab, setActiveTab] = useState('coach'); // l'appli s'ouvre sur le Coach : c'est lui qui dit quoi faire aujourd'hui
  const friends = useFriends({ gameState, user: sync.user, active: activeTab === 'friends' });
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
  const [obOpen, setObOpen] = useState(false);
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
    guided, setGuided, guidedOpen, setGuidedOpen, startGuided, handleFinishGuided, recap, setRecap,
  } = useGuidedSession({
    gameState, openLevelUpModal: levelUp.openLevelUpModal, setGameState, setSelectedDate, setSelectedJournalDay, triggerToast,
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
/>
)}
<RestTimer guidedOpen={!!(guided && guidedOpen)} soundEnabled={gameState.soundEnabled} />
        {/* BARRE D'ONGLETS PRINCIPALE */}
        <div ref={tabsRef} className="scroll-mt-3 space-y-3">
          <TabBar activeTab={activeTab} gameState={gameState} setActiveTab={setActiveTab} />
          <SubTabs activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

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

        {/* ONGLET 3 : COURBES DE PROGRESSION */}
        {activeTab === 'charts' && (
          <ChartsTab activeChartQuest={activeChartQuest} gameState={gameState} openLogModal={log.openLogModal} setSelectedChartQuestId={setSelectedChartQuestId} />
        )}

        {/* ONGLET : 💯 MES MAXIMA */}
        {activeTab === 'maxima' && <MaximaTab gameState={gameState} setGameState={setGameState} />}

        {/* ONGLET 4 : ⚖️ SUIVI DU POIDS */}
        {activeTab === 'weight' && (
          <WeightTab gameState={gameState} setGameState={setGameState} {...weight} />
        )}

        {/* ONGLET : BILAN (défis, semaine, records) */}
        {activeTab !== 'photos' && <PhotoReminder gameState={gameState} onGo={() => goToTab('photos')} />}
        {activeTab === 'photos' && <PhotoCalendar gameState={gameState} />}

        {activeTab === 'bilan' && (
          <BilanTab gameState={gameState} levelInfo={levelInfo} records={records} weekData={weekData} />
        )}

        {activeTab === 'friends' && <FriendsTab friends={friends} onOpenAccount={openSync} />}

        {/* ONGLET 5 : TROPHÉES */}
        {activeTab === 'trophies' && (
          <TrophiesTab achStats={achStats} gameState={gameState} />
        )}
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
        />
      )}
      <BottomNav activeTab={activeTab} moreOpen={moreOpen} onOpenMore={() => setMoreOpen(true)} setActiveTab={goToTab} />
      {accountOpen && <AccountModal sync={sync} recovery={recovery} heroName={gameState.heroName} onRenameHero={name => setGameState(prev => ({ ...prev, heroName: name }))} onClose={() => { setAccountOpen(false); setRecovery(null); }} />}
      <MovementHost />
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
