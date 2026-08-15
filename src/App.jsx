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

/*
 * ============================================================
 * EMPTY DATA
 * ============================================================
 *
 * This is the canonical frontend schedule shape.
 *
 * Backend:
 *
 * {
 *   success,
 *   status,
 *   cached,
 *   fallback,
 *   stale,
 *   debug,
 *   data: {
 *     studentGroup,
 *     schedules,
 *     todaySchedules,
 *     exams,
 *     currentWeek,
 *     nextLesson
 *   }
 * }
 *
 * App stores only the contents of `data`, plus the status fields.
 */

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
  status: 'unknown',
  debug: null
};

/*
 * ============================================================
 * SCHEDULE DATA NORMALIZER
 * ============================================================
 *
 * Accepts both the new backend format and some older formats
 * that may still exist in localStorage.
 */
function normalizeScheduleData(data) {
  if (!data || typeof data !== 'object') {
    return { ...EMPTY_DATA };
  }

  const schedules =
    data.schedules &&
    typeof data.schedules === 'object' &&
    !Array.isArray(data.schedules)
      ? data.schedules
      : {};

  const todaySchedules = Array.isArray(data.todaySchedules)
    ? data.todaySchedules
    : Array.isArray(data.todaySchedule)
      ? data.todaySchedule
      : [];

  const exams = Array.isArray(data.exams)
    ? data.exams
    : [];

  const currentWeek =
    Number(data.currentWeek) > 0
      ? Number(data.currentWeek)
      : 1;

  /*
   * The backend calls this `studentGroup`.
   *
   * Older frontend versions sometimes used `student`.
   */
  const studentGroup =
    data.studentGroup ??
    data.student ??
    null;

  return {
    ...EMPTY_DATA,
    ...data,

    studentGroup,
    schedules,
    todaySchedules,
    exams,
    currentWeek,

    nextLesson:
      data.nextLesson ??
      (todaySchedules.length > 0
        ? todaySchedules[0]
        : null),

    cached: Boolean(data.cached),
    fallback: Boolean(data.fallback),
    stale: Boolean(data.stale),

    status:
      typeof data.status === 'string'
        ? data.status
        : 'unknown',

    debug:
      data.debug ??
      null
  };
}

/*
 * ============================================================
 * BACKEND RESPONSE NORMALIZER
 * ============================================================
 *
 * This is intentionally separate from normalizeScheduleData().
 *
 * `json` is the complete API response.
 *
 * Example:
 *
 * {
 *   success: true,
 *   status: "live",
 *   cached: false,
 *   fallback: false,
 *   stale: false,
 *   data: {
 *     schedules: {...}
 *   }
 * }
 */
function normalizeApiResponse(json) {
  if (!json || typeof json !== 'object') {
    return {
      ok: false,
      error:
        'The schedule server returned an invalid response.'
    };
  }

  if (json.success !== true) {
    return {
      ok: false,
      error:
        json.error ||
        json.message ||
        'The schedule server rejected the request.'
    };
  }

  if (!json.data || typeof json.data !== 'object') {
    return {
      ok: false,
      error:
        'The schedule server returned no timetable data.'
    };
  }

  /*
   * IMPORTANT:
   *
   * The backend status lives on `json`, not inside `json.data`.
   */
  const normalizedData = normalizeScheduleData({
    ...json.data,

    cached: json.cached,
    fallback: json.fallback,
    stale: json.stale,
    status: json.status,
    debug: json.debug
  });

  return {
    ok: true,
    data: normalizedData,

    status:
      typeof json.status === 'string'
        ? json.status
        : json.fallback
          ? 'fallback'
          : json.cached
            ? 'cached'
            : 'live',

    cached: Boolean(json.cached),
    fallback: Boolean(json.fallback),
    stale: Boolean(json.stale),

    debug:
      json.debug ??
      null
  };
}

/*
 * ============================================================
 * API STATUS MESSAGE
 * ============================================================
 */
function getApiStatus(response) {
  if (!response || !response.ok) {
    return {
      state: 'error',
      message:
        response?.error ||
        'Unable to load the academic timetable.'
    };
  }

  /*
   * Backend explicitly says fallback.
   *
   * This means the API endpoint itself worked, but BSUIR and
   * Redis did not provide usable timetable data.
   */
  if (response.fallback) {
    return {
      state: 'fallback',
      message:
        'Live BSUIR timetable data is unavailable and no cached timetable was found.'
    };
  }

  /*
   * Backend served Redis data.
   */
  if (response.cached) {
    return {
      state: 'cached',
      message:
        'Showing the latest saved timetable because live BSUIR data was unavailable.'
    };
  }

  /*
   * Live BSUIR data.
   */
  if (
    response.status === 'live' &&
    !response.fallback &&
    !response.cached
  ) {
    return {
      state: 'live',
      message: null
    };
  }

  /*
   * Backend may mark a response stale.
   */
  if (response.stale) {
    return {
      state: 'stale',
      message:
        'The timetable may be out of date.'
    };
  }

  return {
    state: 'live',
    message: null
  };
}

/*
 * ============================================================
 * HAS SCHEDULE
 * ============================================================
 *
 * Used only for deciding whether we actually have timetable
 * information. An empty day does NOT mean the entire API failed.
 */
function hasScheduleData(data) {
  return Boolean(
    data &&
    data.schedules &&
    typeof data.schedules === 'object' &&
    !Array.isArray(data.schedules) &&
    Object.keys(data.schedules).length > 0
  );
}

/*
 * ============================================================
 * APP CONTENT
 * ============================================================
 */
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
        ) || '150501'
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

  /*
   * ============================================================
   * LOAD LOCAL CACHE
   * ============================================================
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
    useState(
      () =>
        localStorage.getItem(
          'sh_cache_timestamp'
        ) || null
    );

  /*
   * ============================================================
   * THEME
   * ============================================================
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
   * ============================================================
   * FETCH SCHEDULE
   * ============================================================
   */
  useEffect(() => {
    let cancelled = false;

    async function fetchSchedule() {
      if (!group) {
        if (!cancelled) {
          setLoading(false);
          setApiState('error');
          setApiError(
            'No student group has been selected.'
          );
        }

        return;
      }

      /*
       * ========================================================
       * OFFLINE
       * ========================================================
       */
      if (isOffline) {
        if (!cancelled) {
          setLoading(false);

          const hasCached =
            hasScheduleData(
              scheduleData
            );

          if (hasCached) {
            setApiState('cached');
            setApiError(
              'Device is offline. Showing the latest saved timetable.'
            );
          } else {
            setApiState('offline');
            setApiError(
              'Device is offline and no cached timetable is available.'
            );
          }
        }

        return;
      }

      try {
        setLoading(true);
        setApiState('loading');
        setApiError(null);

        /*
         * Do NOT put BSUIR directly in the frontend.
         *
         * The browser calls our Vercel endpoint:
         *
         * /api/bsuir/schedule
         */
        const endpoint =
          `/api/bsuir/schedule?group=${encodeURIComponent(
            group
          )}`;

        const response =
          await fetch(
            endpoint,
            {
              method: 'GET',
              headers: {
                Accept:
                  'application/json'
              }
            }
          );

        /*
         * Try JSON regardless of HTTP status.
         *
         * This lets us understand useful backend responses
         * instead of immediately throwing on 503.
         */
        let json = null;

        try {
          json =
            await response.json();
        } catch {
          json = null;
        }

        if (cancelled) {
          return;
        }

        /*
         * ======================================================
         * HTTP ERROR
         * ======================================================
         */
        if (!response.ok) {
          const message =
            json?.error ||
            json?.message ||
            `Schedule server returned HTTP ${response.status}.`;

          throw new Error(
            message
          );
        }

        /*
         * ======================================================
         * NORMALIZE BACKEND RESPONSE
         * ======================================================
         */
        const normalized =
          normalizeApiResponse(
            json
          );

        if (!normalized.ok) {
          throw new Error(
            normalized.error
          );
        }

        const normalizedData =
          normalized.data;

        const status =
          getApiStatus(
            normalized
          );

        /*
         * ======================================================
         * KEEP THE DATA
         * ======================================================
         *
         * Even cached data is useful.
         *
         * Even an empty timetable can be a valid response.
         *
         * We therefore do NOT reject the response merely because
         * `schedules` is empty.
         */
        setScheduleData(
          normalizedData
        );

        /*
         * ======================================================
         * SAVE CACHE
         * ======================================================
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
         * ======================================================
         * UPDATE TIMESTAMP
         * ======================================================
         *
         * If we received actual schedule data, update the
         * timestamp.
         */
        if (
          hasScheduleData(
            normalizedData
          )
        ) {
          const timestamp =
            new Date().toISOString();

          setLastUpdated(
            timestamp
          );

          try {
            localStorage.setItem(
              'sh_cache_timestamp',
              timestamp
            );
          } catch (storageError) {
            console.error(
              'Failed to cache timestamp:',
              storageError
            );
          }
        }

        /*
         * ======================================================
         * STATUS
         * ======================================================
         */
        setApiState(
          status.state
        );

        setApiError(
          status.message
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          'Failed to fetch schedule:',
          error
        );

        /*
         * IMPORTANT:
         *
         * Never destroy a timetable that was already loaded.
         *
         * If BSUIR goes down for five minutes, the user should
         * continue seeing their previous schedule.
         */
        const hasExistingSchedule =
          hasScheduleData(
            scheduleData
          );

        setApiState(
          hasExistingSchedule
            ? 'cached'
            : 'error'
        );

        setApiError(
          hasExistingSchedule
            ? 'Unable to refresh the timetable. Showing the last saved timetable.'
            : error?.message ||
              'Unable to load the academic timetable.'
        );
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
   * ============================================================
   * ONBOARDING
   * ============================================================
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

    /*
     * If the user changed groups, the old schedule must not
     * remain visible.
     */
    setScheduleData({
      ...EMPTY_DATA
    });

    setLastUpdated(
      null
    );

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

    setIsOnboarded(
      true
    );

    /*
     * Clear the previous group's cache.
     */
    try {
      localStorage.removeItem(
        'sh_cached_schedule'
      );

      localStorage.removeItem(
        'sh_cache_timestamp'
      );
    } catch (error) {
      console.error(
        'Failed to clear schedule cache:',
        error
      );
    }
  };

  /*
   * ============================================================
   * NAVIGATION
   * ============================================================
   */
  const handleTabChange =
    (tab) => {
      triggerHaptic(
        'light'
      );

      setActiveTab(
        tab
      );
    };

  /*
   * ============================================================
   * ONBOARDING SCREEN
   * ============================================================
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
   * ============================================================
   * NORMALIZED DATA FOR VIEWS
   * ============================================================
   */
  const studentGroup =
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

  /*
   * ============================================================
   * GREETING
   * ============================================================
   */
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

  /*
   * `studentGroup` from the backend is normally a string
   * such as "150501", not an object.
   */
  const displayName =
    user?.first_name ||
    'Student';

  /*
   * ============================================================
   * HOME STATUS
   * ============================================================
   */
  let statusState =
    'error';

  if (isOffline) {
    statusState =
      'offline';
  } else if (
    apiState === 'live'
  ) {
    statusState =
      'live';
  } else if (
    apiState === 'cached' ||
    apiState === 'stale'
  ) {
    statusState =
      'cached';
  } else if (
    apiState === 'fallback'
  ) {
    statusState =
      'cached';
  }

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
   * ============================================================
   * SUBJECT DETAILS
   * ============================================================
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
   * ============================================================
   * MAIN APPLICATION
   * ============================================================
   */
  return (
    <div className="max-w-[440px] mx-auto px-4 pt-5 pb-28">

      {/* ======================================================
          HEADER
          ====================================================== */}
      <header className="mb-6">
        <h1
          className={`${titleClass} font-bold tracking-tight leading-tight text-[var(--text-primary)] break-all`}
        >
          {greeting},{' '}
          {displayName}{' '}
          {greetingEmoji}
        </h1>

        <p className="mt-2 text-sm font-medium text-[var(--text-secondary)]">
          Группа:{' '}
          {group}
          {' • '}
          Подгруппа:{' '}
          {subgroup}
          {' • '}
          Неделя:{' '}
          {weekNumber}
        </p>
      </header>

      {/* ======================================================
          API STATUS
          ====================================================== */}
      {apiError && (
        <div className="mb-4 rounded-2xl p-3 bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-center gap-3 text-xs text-[#f59e0b]">
          <span className="shrink-0">
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

          <div className="min-w-0">
            <strong className="block font-bold">
              {isOffline
                ? 'Offline Mode'
                : apiState ===
                    'cached'
                  ? 'Cached Timetable'
                  : apiState ===
                      'fallback'
                    ? 'BSUIR Data Unavailable'
                    : 'Schedule Loading Error'}
            </strong>

            <span className="text-[11px] opacity-80">
              {apiError}
            </span>
          </div>
        </div>
      )}

      {/* ======================================================
          MAIN
          ====================================================== */}
      <main>

        {/* HOME */}
        {activeTab ===
          'home' && (
            <HomeView
              scheduleData={{
                student:
                  studentGroup,
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
              setGroup={
                (newGroup) => {
                  const normalizedGroup =
                    String(
                      newGroup ||
                        ''
                    ).trim();

                  /*
                   * Changing the group means the old schedule
                   * should not remain on screen.
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
                        'Failed to clear old schedule cache:',
                        error
                      );
                    }
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
                (newTheme) => {
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

      {/* ======================================================
          FLOATING NAVIGATION
          ====================================================== */}
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

/*
 * ============================================================
 * APP ROOT
 * ============================================================
 */
export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}