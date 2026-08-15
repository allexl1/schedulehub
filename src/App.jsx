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
 * The application expects scheduleData to have this shape:
 *
 * {
 *   studentGroup,
 *   schedules,
 *   todaySchedules,
 *   exams,
 *   currentWeek,
 *   nextLesson,
 *
 *   // API status metadata
 *   cached,
 *   fallback,
 *   stale,
 *   debug
 * }
 *
 * The backend may occasionally return an older shape, so the
 * normalizer below accepts both old and new field names.
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
  debug: null
};

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

  const studentGroup =
    data.studentGroup ??
    data.student ??
    null;

  const exams = Array.isArray(data.exams)
    ? data.exams
    : [];

  const currentWeek =
    Number(data.currentWeek) > 0
      ? Number(data.currentWeek)
      : 1;

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
      (todaySchedules.length > 0 ? todaySchedules[0] : null),

    cached: Boolean(data.cached),
    fallback: Boolean(data.fallback),
    stale: Boolean(data.stale),
    debug: data.debug ?? null
  };
}

function getApiStatus(json) {
  if (!json || typeof json !== 'object') {
    return {
      state: 'error',
      message: 'The schedule server returned an invalid response.'
    };
  }

  /*
   * Backend fallback:
   *
   * success: true
   * fallback: true
   *
   * This is NOT a frontend/network failure.
   * The backend handled the request but could not obtain live
   * BSUIR data.
   */

  if (json.fallback === true) {
    return {
      state: 'fallback',
      message:
        'BSUIR data is temporarily unavailable. No live timetable data was received.'
    };
  }

  if (json.cached === true) {
    return {
      state: 'cached',
      message:
        'BSUIR is temporarily unavailable. Showing the latest cached timetable.'
    };
  }

  if (json.stale === true) {
    return {
      state: 'stale',
      message:
        'The timetable may be out of date because live BSUIR data was unavailable.'
    };
  }

  return {
    state: 'live',
    message: null
  };
}

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
    () => localStorage.getItem('sh_onboarded') === 'true'
  );

  const [group, setGroup] = useState(
    () => localStorage.getItem('sh_group') || '150501'
  );

  const [subgroup, setSubgroup] = useState(
    () => Number(localStorage.getItem('sh_subgroup')) || 1
  );

  const [themeMode, setThemeMode] = useState(
    () => localStorage.getItem('sh_theme') || 'system'
  );

  const [loading, setLoading] = useState(true);

  const [apiError, setApiError] = useState(null);

  const [apiState, setApiState] = useState('loading');

  /*
   * Load cached schedule.
   *
   * Old cache formats are normalized here so an old localStorage
   * entry cannot break the new ScheduleView.
   */
  const [scheduleData, setScheduleData] = useState(() => {
    try {
      const cached = localStorage.getItem('sh_cached_schedule');

      if (!cached) {
        return { ...EMPTY_DATA };
      }

      const parsed = JSON.parse(cached);

      return normalizeScheduleData(parsed);
    } catch (error) {
      console.error(
        'Failed to load cached schedule:',
        error
      );

      return { ...EMPTY_DATA };
    }
  });

  const [lastUpdated, setLastUpdated] = useState(
    () => localStorage.getItem('sh_cache_timestamp') || null
  );

  /*
   * Theme
   */
  useEffect(() => {
    const root = document.documentElement;

    const activeTheme =
      themeMode === 'system'
        ? colorScheme || 'dark'
        : themeMode;

    root.classList.remove('light', 'dark');
    root.classList.add(activeTheme);
  }, [themeMode, colorScheme]);

  /*
   * Fetch schedule
   */
  useEffect(() => {
    let cancelled = false;

    async function fetchSchedule() {
      if (!group) {
        setLoading(false);
        setApiState('error');
        setApiError('No student group has been selected.');
        return;
      }

      if (isOffline) {
        if (!cancelled) {
          setLoading(false);

          /*
           * If cached schedule exists, offline mode is not an
           * actual error.
           */
          const hasCachedSchedule =
            scheduleData &&
            scheduleData.schedules &&
            Object.keys(scheduleData.schedules).length > 0;

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
          `/api/bsuir/schedule?group=${encodeURIComponent(group)}`;

        const res = await fetch(endpoint, {
          headers: {
            Accept: 'application/json'
          }
        });

        /*
         * Try to parse JSON even when HTTP status is not 2xx.
         * Your backend is supposed to return useful JSON describing
         * fallback/cache state, so throwing immediately on 503 would
         * hide that information.
         */
        let json = null;

        try {
          json = await res.json();
        } catch {
          json = null;
        }

        if (!res.ok) {
          const serverMessage =
            json?.error ||
            json?.message ||
            `Schedule server returned HTTP ${res.status}.`;

          throw new Error(serverMessage);
        }

        if (!json || json.success !== true || !json.data) {
          throw new Error(
            json?.error ||
            'The schedule server returned no timetable data.'
          );
        }

        if (cancelled) {
          return;
        }

        const normalizedData =
          normalizeScheduleData(json.data);

        const status = getApiStatus(json);

        /*
         * Determine whether the backend actually supplied schedule
         * entries.
         */
        const hasSchedule =
          normalizedData.schedules &&
          Object.keys(normalizedData.schedules).length > 0;

        /*
         * Store the complete normalized data.
         *
         * This is important: ScheduleView needs `schedules`,
         * while HomeView needs `todaySchedules` and `nextLesson`.
         */
        setScheduleData(normalizedData);

        /*
         * Save even a valid cached/fallback response so the frontend
         * and backend stay synchronized with the current response
         * contract.
         */
        try {
          localStorage.setItem(
            'sh_cached_schedule',
            JSON.stringify(normalizedData)
          );
        } catch (storageError) {
          console.error(
            'Failed to cache schedule:',
            storageError
          );
        }

        /*
         * Only update the timestamp when the backend actually gave
         * us usable schedule information.
         */
        if (hasSchedule) {
          const now = new Date().toISOString();

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
         * API status is separate from fetch success.
         *
         * live    = live BSUIR response
         * cached  = backend served Redis cache
         * fallback = backend had no live/cache schedule
         */
        setApiState(status.state);

        if (status.state === 'live') {
          setApiError(null);
        } else {
          setApiError(status.message);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          'Failed to fetch BSUIR schedule:',
          error
        );

        /*
         * Do NOT destroy the existing schedule when a refresh fails.
         * Keep whatever was already loaded from localStorage.
         */
        setApiState('error');

        const hasExistingSchedule =
          scheduleData &&
          scheduleData.schedules &&
          Object.keys(scheduleData.schedules).length > 0;

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
  }, [group, isOffline]);

  /*
   * Onboarding
   */
  const handleOnboardingComplete = (
    newGroup,
    newSubgroup
  ) => {
    triggerHaptic('medium');

    const normalizedGroup =
      String(newGroup || '').trim();

    const normalizedSubgroup =
      Number(newSubgroup) || 1;

    setGroup(normalizedGroup);
    setSubgroup(normalizedSubgroup);

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

    setIsOnboarded(true);

    /*
     * Clear the previous group's schedule.
     *
     * Otherwise the new group can briefly see the previous group's
     * timetable while the new request is loading.
     */
    setScheduleData({
      ...EMPTY_DATA
    });

    setLastUpdated(null);

    try {
      localStorage.removeItem(
        'sh_cached_schedule'
      );

      localStorage.removeItem(
        'sh_cache_timestamp'
      );
    } catch (error) {
      console.error(
        'Failed to clear previous schedule cache:',
        error
      );
    }
  };

  /*
   * Navigation
   */
  const handleTabChange = (tab) => {
    triggerHaptic('light');
    setActiveTab(tab);
  };

  /*
   * Onboarding
   */
  if (!isOnboarded) {
    return (
      <div className="max-w-[440px] mx-auto px-4">
        <OnboardingView
          onComplete={handleOnboardingComplete}
        />
      </div>
    );
  }

  /*
   * Normalize data for consumers.
   */
  const student =
    scheduleData?.studentGroup || null;

  const nextLesson =
    scheduleData?.nextLesson || null;

  const todaySchedule =
    Array.isArray(scheduleData?.todaySchedules)
      ? scheduleData.todaySchedules
      : [];

  const hour = new Date().getHours();

  let greeting = 'Hello';
  let greetingEmoji = '👋';

  if (hour >= 6 && hour < 12) {
    greeting = 'Доброе утро';
    greetingEmoji = '☀️';
  } else if (hour >= 12 && hour < 17) {
    greeting = 'Добрый день';
    greetingEmoji = '🌤️';
  } else if (hour >= 17 && hour < 22) {
    greeting = 'Добрый вечер';
    greetingEmoji = '🌆';
  } else {
    greeting = 'Доброй ночи';
    greetingEmoji = '🌙';
  }

  const displayName =
    user?.first_name ||
    student?.name ||
    student ||
    'Unknown Student';

  /*
   * Status shown to HomeView.
   */
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

  const weekNumber =
    scheduleData?.currentWeek || 1;

  const greetingText =
    `${greeting}, ${displayName}`;

  const titleClass =
    greetingText.length > 30
      ? 'text-xl'
      : greetingText.length > 20
        ? 'text-2xl'
        : 'text-[32px]';

  /*
   * Subject details
   */
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

  /*
   * Main application
   */
  return (
    <div className="max-w-[440px] mx-auto px-4 pt-5 pb-28">

      {/* App Header */}
      <header className="mb-6">
        <h1
          className={`${titleClass} font-bold tracking-tight leading-tight text-[var(--text-primary)] break-all`}
        >
          {greeting}, {displayName} {greetingEmoji}
        </h1>

        <p className="mt-2 text-sm font-medium text-[var(--text-secondary)]">
          Группа: {group} • Подгруппа: {subgroup} • Неделя: {weekNumber}
        </p>
      </header>

      {/* API / Offline Status */}
      {apiError && (
        <div className="mb-4 rounded-2xl p-3 bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-center gap-3 text-xs text-[#f59e0b]">
          <span>
            {apiState === 'live'
              ? '✓'
              : isOffline
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

        {activeTab === 'exams' && (
          <ExamsView />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            group={group}
            setGroup={(newGroup) => {
              const normalizedGroup =
                String(newGroup || '').trim();

              setGroup(normalizedGroup);

              localStorage.setItem(
                'sh_group',
                normalizedGroup
              );
            }}
            themeMode={themeMode}
            setThemeMode={(newTheme) => {
              setThemeMode(newTheme);

              localStorage.setItem(
                'sh_theme',
                newTheme
              );
            }}
          />
        )}

      </main>

      {/* Floating Glass Navigation */}
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