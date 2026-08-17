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

function AppContent() {
  const {
    user,
    colorScheme,
    triggerHaptic
  } = useTelegram();

  const isOffline = useOffline();

  const [activeTab, setActiveTab] = useState('home');
  const [selectedLesson, setSelectedLesson] = useState(null);

  const [isOnboarded, setIsOnboarded] = useState(
    () =>
      localStorage.getItem('sh_onboarded') === 'true'
  );

  const [group, setGroup] = useState(
    () => localStorage.getItem('sh_group') || ''
  );

  const [subgroup, setSubgroup] = useState(
    () =>
      Number(localStorage.getItem('sh_subgroup')) || 1
  );

  const [themeMode, setThemeMode] = useState(
    () =>
      localStorage.getItem('sh_theme') || 'system'
  );

  const {
    scheduleData,
    loading,
    apiError,
    apiState,
    lastUpdated
  } = useSchedule({
    group,
    subgroup,
    isOffline
  });

  useEffect(() => {
    const root = document.documentElement;

    const activeTheme =
      themeMode === 'system'
        ? colorScheme || 'dark'
        : themeMode;

    root.classList.remove('light', 'dark');
    root.classList.add(activeTheme);
  }, [themeMode, colorScheme]);

  const handleOnboardingComplete = (
    newGroup,
    newSubgroup
  ) => {
    triggerHaptic('medium');

    const normalizedGroup =
      String(newGroup || '').trim();

    const normalizedSubgroup =
      Number(newSubgroup) || 1;

    if (!normalizedGroup) {
      return;
    }

    localStorage.setItem(
      'sh_group',
      normalizedGroup
    );

    localStorage.setItem(
      'sh_subgroup',
      String(normalizedSubgroup)
    );

    localStorage.setItem(
      'sh_onboarded',
      'true'
    );

    setGroup(normalizedGroup);
    setSubgroup(normalizedSubgroup);
    setIsOnboarded(true);
  };

  const handleTabChange = tab => {
    triggerHaptic('light');
    setSelectedLesson(null);
    setActiveTab(tab);
  };

  const handleGroupChange = newGroup => {
    const normalizedGroup =
      String(newGroup || '').trim();

    if (!normalizedGroup) {
      return;
    }

    setGroup(normalizedGroup);

    localStorage.setItem(
      'sh_group',
      normalizedGroup
    );
  };

  const handleThemeChange = newTheme => {
    setThemeMode(newTheme);

    localStorage.setItem(
      'sh_theme',
      newTheme
    );
  };

  const handleClearCache = () => {
    clearScheduleCache(group);
  };

  if (!isOnboarded) {
    return (
      <div className="max-w-[440px] mx-auto px-4">
        <OnboardingView
          onComplete={handleOnboardingComplete}
        />
      </div>
    );
  }

  const student =
    scheduleData?.studentGroup || null;

  const nextLesson =
    scheduleData?.nextLesson || null;

  const todaySchedule =
    Array.isArray(scheduleData?.todaySchedules)
      ? scheduleData.todaySchedules
      : [];

  const statusState =
    isOffline
      ? 'offline'
      : apiState === 'live'
        ? 'live'
        : apiState === 'cached' ||
            apiState === 'stale' ||
            apiState === 'fallback'
          ? 'cached'
          : 'error';

  if (selectedLesson) {
    return (
      <div className="max-w-[440px] mx-auto px-4 pt-5 pb-10">
        <SubjectDetailsView
          lesson={selectedLesson}
          onBack={() => setSelectedLesson(null)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-[440px] mx-auto px-4 pt-5 pb-28">
      {apiError && (
        <div className="mb-4 rounded-2xl p-3 bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-center gap-3 text-xs text-[#f59e0b]">
          <span>
            {isOffline
              ? '📴'
              : apiState === 'cached'
                ? '🗄️'
                : '⚠️'}
          </span>

          <div>
            <strong className="block font-bold">
              {isOffline
                ? 'Offline Mode'
                : apiState === 'cached'
                  ? 'Cached Timetable'
                  : apiState === 'fallback'
                    ? 'BSUIR Data Unavailable'
                    : apiState === 'error'
                      ? 'Schedule Loading Error'
                      : 'Schedule Status'}
            </strong>

            <span className="text-[11px] opacity-80">
              {apiError}
            </span>
          </div>
        </div>
      )}

      <main>
        {activeTab === 'home' && (
          <HomeView
            user={user}
            group={group}
            subgroup={subgroup}
            scheduleData={{
              student,
              nextLesson,
              todaySchedule
            }}
            status={statusState}
            lastUpdatedTimestamp={lastUpdated}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleView
            scheduleData={scheduleData}
            subgroup={subgroup}
            loading={loading}
            onLessonClick={setSelectedLesson}
          />
        )}

        {activeTab === 'teachers' && (
          <TeachersView />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            group={group}
            setGroup={handleGroupChange}
            themeMode={themeMode}
            setThemeMode={handleThemeChange}
            onClearCache={handleClearCache}
          />
        )}
      </main>

      <FloatingNav
        activeTab={activeTab}
        setActiveTab={handleTabChange}
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