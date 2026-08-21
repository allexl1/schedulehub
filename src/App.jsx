import React, { useEffect, useState } from 'react';

import FloatingNav from './components/FloatingNav';
import HomeView from './views/HomeView';
import ScheduleView from './views/ScheduleView';
import TeachersView from './views/TeachersView';
import SettingsView from './views/SettingsView';
import OnboardingView from './views/OnboardingView';
import SubjectDetailsView from './views/SubjectDetailsView';

import { useTelegram } from './hooks/useTelegram';
import { useOffline } from './hooks/useOffline';
import { useSchedule } from './hooks/useSchedule';
import { clearScheduleCache } from './services/scheduleService';
import { LanguageProvider } from './context/LanguageContext';

const SUBGROUP_OPTIONS = [
  '1',
  '2',
  'all'
];

function readSubgroup(
  key,
  fallback = '1'
) {
  const saved =
    localStorage.getItem(key);

  return SUBGROUP_OPTIONS.includes(
    saved
  )
    ? saved
    : fallback;
}

function normalizeSubgroup(
  subgroup
) {
  const value =
    String(subgroup);

  return SUBGROUP_OPTIONS.includes(
    value
  )
    ? value
    : '1';
}

function AppContent() {
  const {
    user,
    colorScheme,
    triggerHaptic
  } = useTelegram();

  const isOffline = useOffline();

  const [
    activeTab,
    setActiveTab
  ] = useState('home');

  const [
    selectedLesson,
    setSelectedLesson
  ] = useState(null);

  const [
    isOnboarded,
    setIsOnboarded
  ] = useState(
    () =>
      localStorage.getItem(
        'sh_onboarded'
      ) === 'true'
  );

  /*
   * Personal schedule
   *
   * Used by Home and Settings.
   * This is the student's own
   * configured group/subgroup.
   */
  const [
    group,
    setGroup
  ] = useState(
    () =>
      localStorage.getItem(
        'sh_group'
      ) || ''
  );

  const [
    subgroup,
    setSubgroup
  ] = useState(
    () =>
      readSubgroup(
        'sh_subgroup'
      )
  );

  /*
   * Schedule browser
   *
   * Independent from the personal
   * schedule configuration.
   *
   * Schedule can browse another
   * group/subgroup without changing
   * what Home represents.
   */
  const [
    scheduleGroup,
    setScheduleGroup
  ] = useState(
    () =>
      localStorage.getItem(
        'sh_schedule_group'
      ) ||
      localStorage.getItem(
        'sh_group'
      ) ||
      ''
  );

  const [
    scheduleSubgroup,
    setScheduleSubgroup
  ] = useState(
    () =>
      readSubgroup(
        'sh_schedule_subgroup'
      )
  );

  const [
    themeMode,
    setThemeMode
  ] = useState(
    () =>
      localStorage.getItem(
        'sh_theme'
      ) || 'system'
  );

  /*
   * Personal schedule data.
   *
   * Home must always use the
   * personal subgroup.
   */
  const {
    scheduleData:
      personalScheduleData,
    loading:
      personalLoading,
    apiError:
      personalApiError,
    apiState:
      personalApiState,
    lastUpdated:
      personalLastUpdated
  } = useSchedule({
    group,
    subgroup,
    isOffline
  });

  /*
   * Schedule browser data.
   *
   * ScheduleView gets its own group
   * and subgroup state.
   */
  const {
    scheduleData:
      scheduleBrowserData,
    loading:
      scheduleLoading,
    apiError:
      scheduleApiError,
    apiState:
      scheduleApiState
  } = useSchedule({
    group:
      scheduleGroup,
    subgroup:
      scheduleSubgroup,
    isOffline
  });

  useEffect(() => {
    const root =
      document.documentElement;

    const activeTheme =
      themeMode === 'system'
        ? colorScheme || 'dark'
        : themeMode;

    root.classList.remove(
      'light',
      'dark'
    );

    root.classList.add(
      activeTheme
    );
  }, [
    themeMode,
    colorScheme
  ]);

  const handleOnboardingComplete = (
    newGroup,
    newSubgroup
  ) => {
    triggerHaptic(
      'medium'
    );

    const normalizedGroup =
      String(
        newGroup || ''
      ).trim();

    const normalizedSubgroup =
      normalizeSubgroup(
        newSubgroup
      );

    if (!normalizedGroup) {
      return;
    }

    localStorage.setItem(
      'sh_group',
      normalizedGroup
    );

    localStorage.setItem(
      'sh_subgroup',
      normalizedSubgroup
    );

    /*
     * Schedule starts from the
     * personal group/subgroup once.
     * After that, it is independent.
     */
    localStorage.setItem(
      'sh_schedule_group',
      normalizedGroup
    );

    localStorage.setItem(
      'sh_schedule_subgroup',
      normalizedSubgroup
    );

    localStorage.setItem(
      'sh_onboarded',
      'true'
    );

    setGroup(
      normalizedGroup
    );

    setSubgroup(
      normalizedSubgroup
    );

    setScheduleGroup(
      normalizedGroup
    );

    setScheduleSubgroup(
      normalizedSubgroup
    );

    setIsOnboarded(
      true
    );
  };

  const handleTabChange = tab => {
    triggerHaptic(
      'light'
    );

    setSelectedLesson(
      null
    );

    setActiveTab(
      tab
    );
  };

  const handleGroupChange =
    newGroup => {
      const normalizedGroup =
        String(
          newGroup || ''
        ).trim();

      if (!normalizedGroup) {
        return;
      }

      setGroup(
        normalizedGroup
      );

      localStorage.setItem(
        'sh_group',
        normalizedGroup
      );
    };

  /*
   * Home/personal subgroup.
   */
  const handleSubgroupChange =
    newSubgroup => {
      const normalizedSubgroup =
        normalizeSubgroup(
          newSubgroup
        );

      setSubgroup(
        normalizedSubgroup
      );

      localStorage.setItem(
        'sh_subgroup',
        normalizedSubgroup
      );
    };

  /*
   * Schedule-only group.
   *
   * Does not affect Home.
   */
  const handleScheduleGroupChange =
    newGroup => {
      const normalizedGroup =
        String(
          newGroup || ''
        ).trim();

      if (!normalizedGroup) {
        return;
      }

      setScheduleGroup(
        normalizedGroup
      );

      localStorage.setItem(
        'sh_schedule_group',
        normalizedGroup
      );
    };

  /*
   * Schedule-only subgroup.
   *
   * This is the important fix:
   * changing Schedule's subgroup
   * cannot change Home's subgroup.
   */
  const handleScheduleSubgroupChange =
    newSubgroup => {
      const normalizedSubgroup =
        normalizeSubgroup(
          newSubgroup
        );

      setScheduleSubgroup(
        normalizedSubgroup
      );

      localStorage.setItem(
        'sh_schedule_subgroup',
        normalizedSubgroup
      );
    };

  const handleThemeChange =
    newTheme => {
      setThemeMode(
        newTheme
      );

      localStorage.setItem(
        'sh_theme',
        newTheme
      );
    };

  const handleClearCache =
    () => {
      clearScheduleCache(
        group
      );
    };

  if (!isOnboarded) {
    return (
      <div className="max-w-[440px] mx-auto px-4">
        <OnboardingView
          onComplete={
            handleOnboardingComplete
          }
        />
      </div>
    );
  }

  const student =
    personalScheduleData
      ?.studentGroup ||
    null;

  const statusState =
    isOffline
      ? 'offline'
      : personalApiState ===
          'live'
        ? 'live'
        : personalApiState ===
              'cached' ||
            personalApiState ===
              'stale' ||
            personalApiState ===
              'fallback'
          ? 'cached'
          : 'error';

  if (selectedLesson) {
    return (
      <div className="max-w-[440px] mx-auto px-4 pt-5 pb-10">
        <SubjectDetailsView
          lesson={
            selectedLesson
          }
          onBack={() =>
            setSelectedLesson(
              null
            )
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-[440px] mx-auto px-4 pt-5 pb-28">
      {activeTab === 'home' && (
        <HomeView
          user={user}
          group={group}
          subgroup={subgroup}
          scheduleData={
            personalScheduleData
          }
          status={
            statusState
          }
          lastUpdatedTimestamp={
            personalLastUpdated
          }
        />
      )}

      {activeTab === 'schedule' && (
        <ScheduleView
          scheduleData={
            scheduleBrowserData
          }
          group={
            scheduleGroup
          }
          subgroup={
            scheduleSubgroup
          }
          loading={
            scheduleLoading
          }
          onLessonClick={
            setSelectedLesson
          }
          onGroupChange={
            handleScheduleGroupChange
          }
          onSubgroupChange={
            handleScheduleSubgroupChange
          }
        />
      )}

      {activeTab === 'teachers' && (
        <TeachersView />
      )}

      {activeTab === 'settings' && (
        <SettingsView
          group={group}
          setGroup={
            handleGroupChange
          }
          themeMode={
            themeMode
          }
          setThemeMode={
            handleThemeChange
          }
          onClearCache={
            handleClearCache
          }
        />
      )}

      <FloatingNav
        activeTab={
          activeTab
        }
        setActiveTab={
          handleTabChange
        }
      />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}