import React, { useState, useEffect } from 'react';
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

const EMPTY_DATA = {
  studentGroup: null,

  // Current/active timetable.
  schedules: {},

  // BSUIR sometimes provides the timetable as nextSchedules.
  nextSchedules: {},

  todaySchedules: [],
  exams: [],
  currentWeek: 1,
  nextLesson: null,

  cached: false,
  fallback: false,
  stale: false,

  status: null,
  debug: null
};

/*
 * Converts any object-like timetable into a safe object.
 */
function normalizeSchedules(value) {
  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  ) {
    return value;
  }

  return {};
}

/*
 * The BSUIR API currently may return:
 *
 * {
 *   schedules: null,
 *   nextSchedules: {
 *     "Понедельник": [...],
 *     "Вторник": [...]
 *   }
 * }
 *
 * Older/backend variants may return:
 *
 * {
 *   schedules: {
 *     "Понедельник": [...]
 *   }
 * }
 *
 * The frontend should support both.
 */
function normalizeScheduleData(data) {
  if (!data || typeof data !== 'object') {
    return { ...EMPTY_DATA };
  }

  const rawSchedules = normalizeSchedules(
    data.schedules
  );

  const rawNextSchedules = normalizeSchedules(
    data.nextSchedules
  );

  /*
   * IMPORTANT:
   *
   * If `schedules` is empty but `nextSchedules` contains
   * actual timetable data, use nextSchedules as the main
   * schedule.
   */
  const hasCurrentSchedules =
    Object.keys(rawSchedules).length > 0;

  const hasNextSchedules =
    Object.keys(rawNextSchedules).length > 0;

  const schedules =
    hasCurrentSchedules
      ? rawSchedules
      : rawNextSchedules;

  /*
   * Keep nextSchedules separately too.
   */
  const nextSchedules =
    hasNextSchedules
      ? rawNextSchedules
      : {};

  const todaySchedules =
    Array.isArray(data.todaySchedules)
      ? data.todaySchedules
      : Array.isArray(data.todaySchedule)
        ? data.todaySchedule
        : [];

  const studentGroup =
    data.studentGroup ??
    data.studentGroupDto?.name ??
    data.student ??
    null;

  const exams =
    Array.isArray(data.exams)
      ? data.exams
      : [];

  const parsedWeek =
    Number(data.currentWeek);

  const currentWeek =
    Number.isFinite(parsedWeek) &&
    parsedWeek > 0
      ? parsedWeek
      : 1;

  /*
   * If backend already calculated nextLesson, keep it.
   *
   * Otherwise use the first lesson from today's schedule
   * when available.
   */
  let nextLesson =
    data.nextLesson ??
    null;

  if (!nextLesson && todaySchedules.length > 0) {
    nextLesson = todaySchedules[0];
  }

  return {
    ...EMPTY_DATA,
    ...data,

    studentGroup,

    schedules,
    nextSchedules,

    todaySchedules,
    exams,
    currentWeek,

    nextLesson,

    cached: Boolean(data.cached),
    fallback: Boolean(data.fallback),
    stale: Boolean(data.stale),

    status:
      data.status ??
      null,

    debug:
      data.debug ??
      null
  };
}

/*
 * Counts all lessons in a timetable object.
 *
 * Example:
 *
 * {
 *   "Понедельник": [lesson, lesson],
 *   "Вторник": [lesson]
 * }
 *
 * => 3
 */
function countScheduleLessons(schedules) {
  if (
    !schedules ||
    typeof schedules !== 'object'
  ) {
    return 0;
  }

  return Object.values(schedules).reduce(
    (total, dayLessons) => {
      if (Array.isArray(dayLessons)) {
        return total + dayLessons.length;
      }

      return total;
    },
    0
  );
}

/*
 * Backend API status.
 */
function getApiStatus(json, normalizedData) {
  if (!json || typeof json !== 'object') {
    return {
      state: 'error',
      message:
        'The schedule server returned an invalid response.'
    };
  }

  /*
   * Backend explicitly says fallback.
   */
  if (json.fallback === true) {
    return {
      state: 'fallback',
      message:
        'BSUIR data is temporarily unavailable. No live timetable data was received.'
    };
  }

  /*
   * Backend cache.
   */
  if (json.cached === true) {
    return {
      state: 'cached',
      message:
        'BSUIR is temporarily unavailable. Showing the latest cached timetable.'
    };
  }

  /*
   * Backend says stale.
   */
  if (json.stale === true) {
    return {
      state: 'stale',
      message:
        'The timetable may be out of date because live BSUIR data was unavailable.'
    };
  }

  /*
   * IMPORTANT:
   *
   * `schedules: null` is NOT necessarily an error.
   *
   * Your current BSUIR response has valid lessons in
   * `nextSchedules`.
   */
  const lessonCount =
    countScheduleLessons(
      normalizedData?.schedules
    );

  if (lessonCount > 0) {
    return {
      state: 'live',
      message: null
    };
  }

  /*
   * Backend can technically report success/live while
   * returning no lessons.
   */
  if (
    json.success === true &&
    json.status === 'live'
  ) {
    return {
      state: 'empty',
      message:
        'The BSUIR server responded successfully, but no timetable entries were returned.'
    };
  }

  return {
    state: 'live',
    message: null
  };
}

/*
 * Try to obtain today's lessons from the backend response.
 *
 * We intentionally do NOT invent today's lessons from
 * nextSchedules because nextSchedules is a recurring weekly
 * timetable and may contain week-specific lessons.
 */
function getTodaySchedule(data) {
  if (
    Array.isArray(data?.todaySchedules) &&
    data.todaySchedules.length > 0
  ) {
    return data.todaySchedules;
  }

  return [];
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
    useState(() => {
      try {
        return (
          localStorage.getItem(
            'sh_onboarded'
          ) === 'true'
        );
      } catch {
        return false;
      }
    });

  const [group, setGroup] =
    useState(() => {
      try {
        return (
          localStorage.getItem(
            'sh_group'
          ) || '373901'
        );
      } catch {
        return '373901';
      }
    });

  const [subgroup, setSubgroup] =
    useState(() => {
      try {
        return (
          Number(
            localStorage.getItem(
              'sh_subgroup'
            )
          ) || 1
        );
      } catch {
        return 1;
      }
    });

  const [themeMode, setThemeMode] =
    useState(() => {
      try {
        return (
          localStorage.getItem(
            'sh_theme'
          ) || 'system'
        );
      } catch {
        return 'system';
      }
    });

  const [loading, setLoading] =
    useState(true);

  const [apiError, setApiError] =
    useState(null);

  const [apiState, setApiState] =
    useState('loading');

  /*
   * Load cached timetable.
   */
  const [scheduleData, setScheduleData] =
    useState(() => {
      try {
        const cached =
          localStorage.getItem(
            'sh_cached_schedule'
          );

        if (!cached) {
          return {
            ...EMPTY_DATA
          };
        }

        const parsed =
          JSON.parse(cached);

        return normalizeScheduleData(
          parsed
        );
      } catch (error) {
        console.error(
          'Failed to load cached schedule:',
          error
        );

        return {
          ...EMPTY_DATA
        };
      }
    });

  const [lastUpdated, setLastUpdated] =
    useState(() => {
      try {
        return (
          localStorage.getItem(
            'sh_cache_timestamp'
          ) || null
        );
      } catch {
        return null;
      }
    });

  /*
   * Theme.
   */
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

  /*
   * Fetch timetable.
   */
  useEffect(() => {
    let cancelled = false;

    async function fetchSchedule() {
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

      /*
       * Offline.
       */
      if (isOffline) {
        if (!cancelled) {
          setLoading(false);

          const hasCachedSchedule =
            countScheduleLessons(
              scheduleData?.schedules
            ) > 0;

          setApiState(
            hasCachedSchedule
              ? 'cached'
              : 'offline'
          );

          setApiError(
            hasCachedSchedule
              ? 'Device is offline. Showing the latest cached timetable.'
              : 'Device is offline and no cached timetable is available.'
          );
        }

        return;
      }

      try {
        setLoading(true);
        setApiError(null);
        setApiState('loading');

        const endpoint =
          `/api/bsuir/schedule?group=${encodeURIComponent(
            normalizedGroup
          )}`;

        console.log(
          '[Schedule] Fetching:',
          endpoint
        );

        const res =
          await fetch(endpoint, {
            headers: {
              Accept:
                'application/json'
            }
          });

        /*
         * Parse JSON even for HTTP errors.
         */
        let json = null;

        try {
          json =
            await res.json();
        } catch (jsonError) {
          console.error(
            '[Schedule] Invalid JSON response:',
            jsonError
          );

          json = null;
        }

        console.log(
          '[Schedule] API response:',
          json
        );

        if (!res.ok) {
          const serverMessage =
            json?.error ||
            json?.message ||
            `Schedule server returned HTTP ${res.status}.`;

          throw new Error(
            serverMessage
          );
        }

        if (
          !json ||
          json.success !== true ||
          !json.data
        ) {
          throw new Error(
            json?.error ||
            json?.message ||
            'The schedule server returned no timetable data.'
          );
        }

        if (cancelled) {
          return;
        }

        /*
         * THIS is the important fix.
         *
         * If the API says:
         *
         * schedules: null
         * nextSchedules: {...}
         *
         * normalizeScheduleData() moves nextSchedules
         * into schedules.
         */
        const normalizedData =
          normalizeScheduleData(
            json.data
          );

        const status =
          getApiStatus(
            json,
            normalizedData
          );

        const lessonCount =
          countScheduleLessons(
            normalizedData.schedules
          );

        console.log(
          '[Schedule] Normalized data:',
          normalizedData
        );

        console.log(
          '[Schedule] Lesson count:',
          lessonCount
        );

        /*
         * Keep the data.
         */
        setScheduleData(
          normalizedData
        );

        /*
         * Cache the complete normalized response.
         */
        try {
          localStorage.setItem(
            'sh_cached_schedule',
            JSON.stringify(
              normalizedData
            )
          );
        } catch (storageError) {
          console.error(
            'Failed to cache schedule:',
            storageError
          );
        }

        /*
         * Update timestamp whenever we received
         * actual timetable entries.
         */
        if (lessonCount > 0) {
          const now =
            new Date().toISOString();

          setLastUpdated(now);

          try {
            localStorage.setItem(
              'sh_cache_timestamp',
              now
            );
          } catch (storageError) {
            console.error(
              'Failed to cache timestamp:',
              storageError
            );
          }
        }

        /*
         * API state.
         */
        setApiState(
          status.state
        );

        if (
          status.state === 'live' &&
          lessonCount > 0
        ) {
          setApiError(null);
        } else if (
          status.message
        ) {
          setApiError(
            status.message
          );
        } else {
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

        setApiState('error');

        const hasExistingSchedule =
          countScheduleLessons(
            scheduleData?.schedules
          ) > 0;

        if (hasExistingSchedule) {
          setApiError(
            'Unable to refresh the timetable. Showing the last saved timetable.'
          );
        } else {
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

    fetchSchedule();

    return () => {
      cancelled = true;
    };
  }, [
    group,
    isOffline
  ]);

  /*
   * Onboarding.
   */
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
      Number(
        newSubgroup
      ) || 1;

    setGroup(
      normalizedGroup
    );

    setSubgroup(
      normalizedSubgroup
    );

    try {
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

      /*
       * Clear previous group's cache.
       */
      localStorage.removeItem(
        'sh_cached_schedule'
      );

      localStorage.removeItem(
        'sh_cache_timestamp'
      );
    } catch (error) {
      console.error(
        'Failed to save onboarding data:',
        error
      );
    }

    setIsOnboarded(
      true
    );

    setScheduleData({
      ...EMPTY_DATA
    });

    setLastUpdated(
      null
    );

    setApiState(
      'loading'
    );

    setApiError(
      null
    );
  };

  /*
   * Navigation.
   */
  const handleTabChange = (
    tab
  ) => {
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

  /*
   * Onboarding screen.
   */
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

  /*
   * Normalized consumer data.
   */
  const student =
    scheduleData?.studentGroup ||
    null;

  const nextLesson =
    scheduleData?.nextLesson ||
    null;

  const todaySchedule =
    getTodaySchedule(
      scheduleData
    );

  const hour =
    new Date().getHours();

  let greeting =
    'Hello';

  let greetingEmoji =
    '👋';

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

  /*
   * HomeView status.
   */
  const statusState =
    isOffline
      ? 'offline'
      : apiState === 'live'
        ? 'live'
        : apiState === 'cached' ||
          apiState === 'stale'
          ? 'cached'
          : apiState === 'fallback'
            ? 'error'
            : apiState === 'empty'
              ? 'error'
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

  /*
   * Count actual timetable entries.
   */
  const lessonCount =
    countScheduleLessons(
      scheduleData?.schedules
    );

  /*
   * Subject details.
   */
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

  /*
   * Main application.
   */
  return (
    <div className="max-w-[440px] mx-auto px-4 pt-5 pb-28">

      {/* Header */}
      <header className="mb-6">
        <h1
          className={`${titleClass} font-bold tracking-tight leading-tight text-[var(--text-primary)] break-words`}
        >
          {greeting},{' '}
          {displayName}{' '}
          {greetingEmoji}
        </h1>

        <p className="mt-2 text-sm font-medium text-[var(--text-secondary)]">
          Группа: {group} • Подгруппа:{' '}
          {subgroup} • Неделя:{' '}
          {weekNumber}
        </p>

        {lessonCount > 0 && (
          <p className="mt-1 text-[11px] text-[var(--text-secondary)] opacity-70">
            Загружено занятий:{' '}
            {lessonCount}
          </p>
        )}
      </header>

      {/* API / Offline Status */}
      {apiError && (
        <div className="mb-4 rounded-2xl p-3 bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-center gap-3 text-xs text-[#f59e0b]">
          <span>
            {isOffline
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
                        'empty'
                      ? 'No Timetable Entries'
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

        {/* HOME */}
        {activeTab ===
          'home' && (
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

        {/* SCHEDULE */}
        {activeTab ===
          'schedule' && (
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

        {/* TEACHERS */}
        {activeTab ===
          'teachers' && (
          <TeachersView />
        )}

        {/* EXAMS */}
        {activeTab ===
          'exams' && (
          <ExamsView />
        )}

        {/* SETTINGS */}
        {activeTab ===
          'settings' && (
          <SettingsView
            group={
              group
            }

            setGroup={(
              newGroup
            ) => {
              const normalizedGroup =
                String(
                  newGroup ||
                    ''
                ).trim();

              /*
               * Don't accidentally trigger
               * an API request for an empty group.
               */
              if (
                !normalizedGroup
              ) {
                return;
              }

              /*
               * If the group actually changes,
               * clear the old group's data.
               */
              if (
                normalizedGroup !==
                group
              ) {
                setScheduleData({
                  ...EMPTY_DATA
                });

                setLastUpdated(
                  null
                );

                setApiError(
                  null
                );

                setApiState(
                  'loading'
                );

                try {
                  localStorage.removeItem(
                    'sh_cached_schedule'
                  );

                  localStorage.removeItem(
                    'sh_cache_timestamp'
                  );
                } catch (
                  error
                ) {
                  console.error(
                    'Failed to clear schedule cache:',
                    error
                  );
                }
              }

              setGroup(
                normalizedGroup
              );

              try {
                localStorage.setItem(
                  'sh_group',
                  normalizedGroup
                );
              } catch (
                error
              ) {
                console.error(
                  'Failed to save group:',
                  error
                );
              }
            }}

            themeMode={
              themeMode
            }

            setThemeMode={(
              newTheme
            ) => {
              setThemeMode(
                newTheme
              );

              try {
                localStorage.setItem(
                  'sh_theme',
                  newTheme
                );
              } catch (
                error
              ) {
                console.error(
                  'Failed to save theme:',
                  error
                );
              }
            }}
          />
        )}

      </main>

      {/* Floating Navigation */}
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