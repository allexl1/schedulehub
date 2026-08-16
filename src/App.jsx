import React, { useEffect, useState } from 'react';

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
import { LanguageProvider } from './context/LanguageContext';

const DEFAULT_GROUP = '373901';

const EMPTY_DATA = {
  studentGroup: null,
  schedules: {},
  todaySchedules: [],
  exams: [],
  currentWeek: 1,
  nextLesson: null,
  cached: false,
  fallback: false,
  stale: false,
  debug: null
};

function cacheKey(group) {
  return `sh_cached_schedule_${String(group || '').trim()}`;
}

function timestampKey(group) {
  return `sh_cache_timestamp_${String(group || '').trim()}`;
}

function readCachedSchedule(group) {
  if (!group) {
    return null;
  }

  try {
    const value = localStorage.getItem(
      cacheKey(group)
    );

    if (!value) {
      return null;
    }

    const parsed = JSON.parse(value);

    if (
      !parsed ||
      typeof parsed !== 'object'
    ) {
      return null;
    }

    const data =
      parsed.data &&
      typeof parsed.data === 'object'
        ? parsed.data
        : parsed;

    return {
      ...EMPTY_DATA,
      ...data,
      schedules:
        data.schedules &&
        typeof data.schedules === 'object'
          ? data.schedules
          : {},
      todaySchedules:
        Array.isArray(data.todaySchedules)
          ? data.todaySchedules
          : [],
      exams:
        Array.isArray(data.exams)
          ? data.exams
          : [],
      currentWeek:
        Number(data.currentWeek) || 1,
      nextLesson:
        data.nextLesson || null,
      cached: true
    };
  } catch (error) {
    console.error(
      'Failed to read cached schedule:',
      error
    );

    return null;
  }
}

function readCacheTimestamp(group) {
  if (!group) {
    return null;
  }

  try {
    return localStorage.getItem(
      timestampKey(group)
    );
  } catch {
    return null;
  }
}

function saveCachedSchedule(group, json) {
  if (!group || !json) {
    return;
  }

  try {
    localStorage.setItem(
      cacheKey(group),
      JSON.stringify(json)
    );

    localStorage.setItem(
      timestampKey(group),
      new Date().toISOString()
    );
  } catch (error) {
    console.error(
      'Failed to save schedule cache:',
      error
    );
  }
}

function normalizeResponse(json) {
  if (
    !json ||
    typeof json !== 'object'
  ) {
    return null;
  }

  const source =
    json.data &&
    typeof json.data === 'object'
      ? json.data
      : null;

  if (!source) {
    return null;
  }

  return {
    ...EMPTY_DATA,
    ...source,
    schedules:
      source.schedules &&
      typeof source.schedules === 'object'
        ? source.schedules
        : {},
    todaySchedules:
      Array.isArray(source.todaySchedules)
        ? source.todaySchedules
        : [],
    exams:
      Array.isArray(source.exams)
        ? source.exams
        : [],
    currentWeek:
      Number(source.currentWeek) || 1,
    nextLesson:
      source.nextLesson || null,
    cached:
      Boolean(json.cached),
    fallback:
      Boolean(json.fallback),
    stale:
      Boolean(json.stale),
    debug:
      json.debug || null
  };
}

function hasScheduleData(data) {
  if (
    !data ||
    !data.schedules ||
    typeof data.schedules !== 'object'
  ) {
    return false;
  }

  return Object.values(
    data.schedules
  ).some(
    value =>
      Array.isArray(value) &&
      value.length > 0
  );
}

function getStatusMessage(
  state,
  offline
) {
  if (offline) {
    return hasScheduleData(state)
      ? 'Device is offline. Showing the latest cached timetable.'
      : 'Device is offline and no cached timetable is available.';
  }

  if (state?.fallback) {
    return 'BSUIR data is temporarily unavailable. No live timetable data was received.';
  }

  if (state?.cached || state?.stale) {
    return 'BSUIR is temporarily unavailable. Showing the latest cached timetable.';
  }

  return null;
}

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
        ) || DEFAULT_GROUP
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

  const [loading, setLoading] =
    useState(true);

  const [apiError, setApiError] =
    useState(null);

  const [apiState, setApiState] =
    useState('loading');

  const [scheduleData, setScheduleData] =
    useState(() => {
      const savedGroup =
        localStorage.getItem(
          'sh_group'
        ) || DEFAULT_GROUP;

      return (
        readCachedSchedule(
          savedGroup
        ) || {
          ...EMPTY_DATA
        }
      );
    });

  const [lastUpdated, setLastUpdated] =
    useState(() => {
      const savedGroup =
        localStorage.getItem(
          'sh_group'
        ) || DEFAULT_GROUP;

      return readCacheTimestamp(
        savedGroup
      );
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

  useEffect(() => {
    let cancelled = false;

    async function loadSchedule() {
      const normalizedGroup =
        String(group || '').trim();

      if (!normalizedGroup) {
        setLoading(false);
        setApiState('error');
        setApiError(
          'No student group has been selected.'
        );
        return;
      }

      const localCache =
        readCachedSchedule(
          normalizedGroup
        );

      if (localCache) {
        setScheduleData(
          localCache
        );

        setLastUpdated(
          readCacheTimestamp(
            normalizedGroup
          )
        );
      } else {
        setScheduleData({
          ...EMPTY_DATA
        });

        setLastUpdated(null);
      }

      if (isOffline) {
        setLoading(false);

        setApiState(
          localCache
            ? 'cached'
            : 'offline'
        );

        setApiError(
          getStatusMessage(
            localCache,
            true
          )
        );

        return;
      }

      try {
        setLoading(true);
        setApiError(null);
        setApiState('loading');

        const endpoint =
          `/api/bsuir/schedule?group=${encodeURIComponent(
            normalizedGroup
          )}&subgroup=${encodeURIComponent(
            subgroup
          )}`;

        const response =
          await fetch(
            endpoint,
            {
              headers: {
                Accept:
                  'application/json'
              }
            }
          );

        let json = null;

        try {
          json =
            await response.json();
        } catch {
          json = null;
        }

        if (!response.ok) {
          throw new Error(
            json?.debug?.error ||
            json?.error ||
            json?.message ||
            `Schedule server returned HTTP ${response.status}.`
          );
        }

        if (
          !json ||
          json.success !== true ||
          !json.data
        ) {
          throw new Error(
            json?.debug?.error ||
            'The schedule server returned no timetable data.'
          );
        }

        if (cancelled) {
          return;
        }

        const data =
          normalizeResponse(json);

        if (!data) {
          throw new Error(
            'Invalid schedule response.'
          );
        }

        const usable =
          hasScheduleData(data) ||
          data.exams.length > 0 ||
          Boolean(
            json.data?.studentGroup
          );

        if (usable) {
          setScheduleData(data);

          saveCachedSchedule(
            normalizedGroup,
            json
          );

          setLastUpdated(
            new Date().toISOString()
          );
        } else {
          const cached =
            localCache;

          if (cached) {
            setScheduleData(
              cached
            );
          } else {
            setScheduleData(
              data
            );
          }
        }

        if (json.fallback) {
          setApiState(
            'fallback'
          );
          setApiError(
            getStatusMessage(
              data,
              false
            )
          );
        } else if (
          json.cached ||
          json.stale
        ) {
          setApiState(
            'cached'
          );
          setApiError(
            getStatusMessage(
              data,
              false
            )
          );
        } else {
          setApiState('live');
          setApiError(null);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          'Failed to fetch BSUIR schedule:',
          error
        );

        if (localCache) {
          setScheduleData(
            localCache
          );

          setApiState(
            'cached'
          );

          setApiError(
            'Unable to refresh the timetable. Showing the last saved timetable.'
          );
        } else {
          setApiState(
            'error'
          );

          setApiError(
            error?.message ||
              'Unable to load the academic timetable.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSchedule();

    return () => {
      cancelled = true;
    };
  }, [
    group,
    subgroup,
    isOffline
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
      Number(newSubgroup) || 1;

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

    setScheduleData({
      ...EMPTY_DATA
    });

    setLastUpdated(null);
  };

  const handleTabChange = tab => {
    triggerHaptic(
      'light'
    );

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
      typeof student ===
      'object'
        ? student?.name
        : student
    ) ||
    'Student';

  const statusState =
    isOffline
      ? 'offline'
      : apiState === 'live'
        ? 'live'
        : apiState ===
              'cached' ||
            apiState ===
              'stale' ||
            apiState ===
              'fallback'
          ? 'cached'
          : 'error';

  const weekNumber =
    scheduleData?.currentWeek ||
    1;

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
            {apiState === 'live'
              ? '✓'
              : isOffline
                ? '📴'
                : apiState ===
                    'cached'
                  ? '🗄️'
                  : apiState ===
                      'fallback'
                    ? '⚠️'
                    : '⚠️'}
          </span>

          <div>
            <strong className="block font-bold">
              {isOffline
                ? 'Offline Mode'
                : apiState ===
                    'cached'
                  ? 'Cached Timetable'
                  : apiState ===
                      'fallback'
                    ? 'BSUIR Data Unavailable'
                    : apiState ===
                        'error'
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
            setGroup={newGroup => {
              const normalizedGroup =
                String(
                  newGroup || ''
                ).trim();

              setGroup(
                normalizedGroup
              );

              localStorage.setItem(
                'sh_group',
                normalizedGroup
              );
            }}
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