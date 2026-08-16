import React, {
  useEffect,
  useState
} from 'react';
import FloatingNav from './components/FloatingNav';
import HomeView from './views/HomeView';
import ScheduleView from './views/ScheduleView';
import TeachersView from './views/TeachersView';
import ExamsView from './views/ExamsView';
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

  const [activeTab, setActiveTab] =
    useState('home');

  const [selectedLesson, setSelectedLesson] =
    useState(null);

  const [isOnboarded, setIsOnboarded] =
    useState(
      () =>
        localStorage.getItem(
          'sh_onboarded'
        ) === 'true'
    );

  const [group, setGroup] =
    useState(
      () =>
        localStorage.getItem(
          'sh_group'
        ) || ''
    );

  const [subgroup, setSubgroup] =
    useState(
      () =>
        Number(
          localStorage.getItem(
            'sh_subgroup'
          )
        ) || 1
    );

  const [themeMode, setThemeMode] =
    useState(
      () =>
        localStorage.getItem(
          'sh_theme'
        ) || 'system'
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
    triggerHaptic('medium');

    const normalizedGroup =
      String(
        newGroup || ''
      ).trim();

    const normalizedSubgroup =
      Number(newSubgroup) || 1;

    if (!normalizedGroup) {
      return;
    }

    setGroup(
      normalizedGroup
    );

    setSubgroup(
      normalizedSubgroup
    );

    localStorage.setItem(
      'sh_group',
      normalizedGroup
    );

    localStorage.setItem(
      'sh_subgroup',
      String(
        normalizedSubgroup
      )
    );

    localStorage.setItem(
      'sh_onboarded',
      'true'
    );

    setIsOnboarded(true);
  };

  const handleTabChange = tab => {
    triggerHaptic('light');

    setSelectedLesson(null);
    setActiveTab(tab);
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
    scheduleData?.studentGroup ||
    null;

  const nextLesson =
    scheduleData?.nextLesson ||
    null;

  const todaySchedule =
    Array.isArray(
      scheduleData?.todaySchedules
    )
      ? scheduleData.todaySchedules
      : [];

  const weekNumber =
    Number(
      scheduleData?.currentWeek
    ) || 1;

  const hour =
    new Date().getHours();

  let greeting = 'Hello';
  let greetingEmoji = '👋';

  if (
    hour >= 6 &&
    hour < 12
  ) {
    greeting =
      'Доброе утро';

    greetingEmoji =
      '☀️';
  } else if (
    hour >= 12 &&
    hour < 17
  ) {
    greeting =
      'Добрый день';

    greetingEmoji =
      '🌤️';
  } else if (
    hour >= 17 &&
    hour < 22
  ) {
    greeting =
      'Добрый вечер';

    greetingEmoji =
      '🌆';
  } else {
    greeting =
      'Доброй ночи';

    greetingEmoji =
      '🌙';
  }

  const displayName =
    user?.first_name ||
    (
      typeof student === 'object'
        ? student?.name
        : student
    ) ||
    'Student';

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

  const greetingText =
    `${greeting}, ${displayName}`;

  const titleClass =
    greetingText.length > 30
      ? 'text-xl'
      : greetingText.length > 20
        ? 'text-2xl'
        : 'text-[32px]';

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
      <header className="mb-6">
        <h1
          className={`${titleClass} font-bold tracking-tight leading-tight text-[var(--text-primary)] break-words`}
        >
          {greeting},{' '}
          {displayName}{' '}
          {greetingEmoji}
        </h1>

        <p className="mt-2 text-sm font-medium text-[var(--text-secondary)]">
          Группа: {group}
          {' • '}
          Подгруппа: {subgroup}
          {' • '}
          Неделя: {weekNumber}
        </p>
      </header>

      {apiError && (
        <div className="mb-4 rounded-2xl p-3 bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-center gap-3 text-xs text-[#f59e0b]">
          <span>
            {isOffline
              ? '📴'
              : apiState === 'cached'
                ? '🗄️'
                : apiState === 'fallback'
                  ? '⚠️'
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
            scheduleData={{
              student,
              nextLesson,
              todaySchedule
            }}
            status={
              statusState
            }
            lastUpdatedTimestamp={
              lastUpdated
            }
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleView
            scheduleData={
              scheduleData
            }
            subgroup={
              subgroup
            }
            loading={
              loading
            }
            onLessonClick={
              setSelectedLesson
            }
          />
        )}

        {activeTab === 'teachers' && (
          <TeachersView />
        )}

        {activeTab === 'exams' && (
          <ExamsView />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            group={
              group
            }
            setGroup={
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
              }
            }
            themeMode={
              themeMode
            }
            setThemeMode={
  newTheme => {
    setThemeMode(
      newTheme
    );

    localStorage.setItem(
      'sh_theme',
      newTheme
    );
  }
}
onClearCache={() => {
  clearScheduleCache(group);
}}
            }
          />
        )}
      </main>

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