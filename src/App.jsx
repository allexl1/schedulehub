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
 */

const EMPTY_DATA = {
  studentGroup: null,

  /*
   * The frontend expects:
   *
   * {
   *   Monday: [],
   *   Tuesday: [],
   *   ...
   * }
   *
   * BSUIR may return this as either `schedules` or
   * `nextSchedules`, so normalizeScheduleData() handles both.
   */
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

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

/**
 * Returns true when an object contains actual timetable entries.
 */
function hasScheduleEntries(schedules) {
  if (
    !schedules ||
    typeof schedules !== 'object' ||
    Array.isArray(schedules)
  ) {
    return false;
  }

  return Object.values(schedules).some(
    (lessons) =>
      Array.isArray(lessons) &&
      lessons.length > 0
  );
}

/**
 * BSUIR uses Russian weekday names in the response.
 *
 * We intentionally preserve them because ScheduleView may already
 * understand the backend's original structure.
 */
function normalizeSchedules(schedules) {
  if (
    !schedules ||
    typeof schedules !== 'object' ||
    Array.isArray(schedules)
  ) {
    return {};
  }

  const normalized = {};

  Object.entries(schedules).forEach(
    ([day, lessons]) => {
      if (!Array.isArray(lessons)) {
        return;
      }

      normalized[day] = lessons;
    }
  );

  return normalized;
}

/**
 * Converts one BSUIR lesson into the shape expected by the
 * frontend when necessary.
 *
 * We keep the original properties as well, so existing components
 * don't lose any backend-specific information.
 */
function normalizeLesson(lesson) {
  if (!lesson || typeof lesson !== 'object') {
    return null;
  }

  return {
    ...lesson,

    subject:
      lesson.subject ??
      lesson.subjectName ??
      lesson.name ??
      '',

    subjectFullName:
      lesson.subjectFullName ??
      lesson.subjectName ??
      lesson.subject ??
      '',

    startLessonTime:
      lesson.startLessonTime ??
      lesson.startTime ??
      '',

    endLessonTime:
      lesson.endLessonTime ??
      lesson.endTime ??
      '',

    lessonTypeAbbrev:
      lesson.lessonTypeAbbrev ??
      lesson.lessonType ??
      '',

    auditories:
      Array.isArray(lesson.auditories)
        ? lesson.auditories
        : lesson.auditory
          ? [lesson.auditory]
          : [],

    employees:
      Array.isArray(lesson.employees)
        ? lesson.employees
        : [],

    studentGroups:
      Array.isArray(lesson.studentGroups)
        ? lesson.studentGroups
        : [],

    numSubgroup:
      Number.isFinite(Number(lesson.numSubgroup))
        ? Number(lesson.numSubgroup)
        : 0,

    weekNumber:
      Array.isArray(lesson.weekNumber)
        ? lesson.weekNumber
        : []
  };
}

/**
 * Normalize an entire schedule object.
 */
function normalizeScheduleMap(schedules) {
  const normalized =
    normalizeSchedules(schedules);

  const result = {};

  Object.entries(normalized).forEach(
    ([day, lessons]) => {
      result[day] = lessons
        .map(normalizeLesson)
        .filter(Boolean);
    }
  );

  return result;
}

/**
 * Get all lessons from a schedule map.
 */
function flattenSchedules(schedules) {
  if (
    !schedules ||
    typeof schedules !== 'object'
  ) {
    return [];
  }

  return Object.values(schedules).flatMap(
    (lessons) =>
      Array.isArray(lessons)
        ? lessons
        : []
  );
}

/**
 * Calculate today's weekday in Russian.
 *
 * BSUIR's API uses:
 *
 * Понедельник
 * Вторник
 * Среда
 * Четверг
 * Пятница
 * Суббота
 * Воскресенье
 */
function getTodayRussianDay() {
  const days = [
    'Воскресенье',
    'Понедельник',
    'Вторник',
    'Среда',
    'Четверг',
    'Пятница',
    'Суббота'
  ];

  return days[new Date().getDay()];
}

/**
 * Build today's schedule from the normalized schedule map.
 */
function buildTodaySchedule(schedules) {
  const today = getTodayRussianDay();

  const lessons =
    schedules?.[today];

  return Array.isArray(lessons)
    ? lessons
    : [];
}

/**
 * Select the next lesson.
 *
 * We first prefer today's lessons. If today's schedule is empty,
 * we simply return null rather than inventing a lesson from another
 * day.
 */
function findNextLesson(todaySchedules) {
  if (
    !Array.isArray(todaySchedules) ||
    todaySchedules.length === 0
  ) {
    return null;
  }

  const now = new Date();

  const currentMinutes =
    now.getHours() * 60 +
    now.getMinutes();

  const upcoming =
    todaySchedules
      .map((lesson) => {
        const time =
          lesson?.startLessonTime;

        if (
          typeof time !== 'string' ||
          !time.includes(':')
        ) {
          return {
            lesson,
            minutes: Number.MAX_SAFE_INTEGER
          };
        }

        const [
          hours,
          minutes
        ] = time
          .split(':')
          .map(Number);

        if (
          !Number.isFinite(hours) ||
          !Number.isFinite(minutes)
        ) {
          return {
            lesson,
            minutes: Number.MAX_SAFE_INTEGER
          };
        }

        return {
          lesson,
          minutes:
            hours * 60 + minutes
        };
      })
      .filter(
        ({ minutes }) =>
          minutes >= currentMinutes
      )
      .sort(
        (a, b) =>
          a.minutes - b.minutes
      );

  return (
    upcoming[0]?.lesson ??
    null
  );
}

/*
 * ============================================================
 * MAIN NORMALIZER
 * ============================================================
 *
 * IMPORTANT:
 *
 * Your actual BSUIR response is:
 *
 * data: {
 *   schedules: null,
 *   nextSchedules: {
 *      Понедельник: [...],
 *      Вторник: [...],
 *      ...
 *   }
 * }
 *
 * The previous App.jsx only looked at:
 *
 * data.schedules
 *
 * which is null.
 *
 * Therefore it converted a perfectly valid timetable into {}.
 *
 * This version explicitly falls back to:
 *
 * data.nextSchedules
 *
 * when data.schedules is empty/null.
 */

function normalizeScheduleData(data) {
  if (
    !data ||
    typeof data !== 'object'
  ) {
    return {
      ...EMPTY_DATA
    };
  }

  /*
   * ----------------------------------------------------------
   * Determine the actual schedule source.
   * ----------------------------------------------------------
   */

  const rawSchedules =
    hasScheduleEntries(data.schedules)
      ? data.schedules
      : hasScheduleEntries(data.nextSchedules)
        ? data.nextSchedules
        : {};

  const schedules =
    normalizeScheduleMap(
      rawSchedules
    );

  /*
   * ----------------------------------------------------------
   * Student group
   * ----------------------------------------------------------
   */

  let studentGroup =
    data.studentGroup ??
    data.student ??
    null;

  /*
   * If the backend didn't expose studentGroup directly,
   * recover it from the first lesson.
   */

  if (!studentGroup) {
    const allLessons =
      flattenSchedules(schedules);

    const firstLesson =
      allLessons[0];

    const firstGroup =
      firstLesson?.studentGroups?.[0];

    if (firstGroup?.name) {
      studentGroup =
        firstGroup.name;
    }
  }

  /*
   * ----------------------------------------------------------
   * Today's schedule
   * ----------------------------------------------------------
   */

  let todaySchedules =
    Array.isArray(data.todaySchedules)
      ? data.todaySchedules
      : Array.isArray(data.todaySchedule)
        ? data.todaySchedule
        : null;

  if (!todaySchedules) {
    todaySchedules =
      buildTodaySchedule(
        schedules
      );
  }

  todaySchedules =
    todaySchedules
      .map(normalizeLesson)
      .filter(Boolean);

  /*
   * ----------------------------------------------------------
   * Exams
   * ----------------------------------------------------------
   */

  const exams =
    Array.isArray(data.exams)
      ? data.exams
      : [];

  /*
   * ----------------------------------------------------------
   * Current week
   * ----------------------------------------------------------
   */

  const parsedWeek =
    Number(data.currentWeek);

  const currentWeek =
    Number.isFinite(parsedWeek) &&
    parsedWeek > 0
      ? parsedWeek
      : 1;

  /*
   * ----------------------------------------------------------
   * Next lesson
   * ----------------------------------------------------------
   */

  const nextLesson =
    data.nextLesson
      ? normalizeLesson(
          data.nextLesson
        )
      : findNextLesson(
          todaySchedules
        );

  /*
   * ----------------------------------------------------------
   * Return normalized object
   * ----------------------------------------------------------
   */

  return {
    ...EMPTY_DATA,
    ...data,

    studentGroup,

    schedules,

    todaySchedules,

    exams,

    currentWeek,

    nextLesson,

    cached:
      Boolean(data.cached),

    fallback:
      Boolean(data.fallback),

    stale:
      Boolean(data.stale),

    debug:
      data.debug ?? null
  };
}

/*
 * ============================================================
 * API STATUS
 * ============================================================
 */

function getApiStatus(json) {
  if (
    !json ||
    typeof json !== 'object'
  ) {
    return {
      state: 'error',
      message:
        'The schedule server returned an invalid response.'
    };
  }

  /*
   * Backend explicitly says fallback.
   */
  if (
    json.fallback === true
  ) {
    return {
      state: 'fallback',
      message:
        'BSUIR data is temporarily unavailable. No live timetable data was received.'
    };
  }

  /*
   * Backend explicitly says cached.
   */
  if (
    json.cached === true
  ) {
    return {
      state: 'cached',
      message:
        'BSUIR is temporarily unavailable. Showing the latest cached timetable.'
    };
  }

  /*
   * Backend explicitly says stale.
   */
  if (
    json.stale === true
  ) {
    return {
      state: 'stale',
      message:
        'The timetable may be out of date because live BSUIR data was unavailable.'
    };
  }

  /*
   * A successful response is live even if schedules came from
   * `nextSchedules`.
   */
  return {
    state: 'live',
    message: null
  };
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

  const isOffline =
    useOffline();

  /*
   * ----------------------------------------------------------
   * Navigation
   * ----------------------------------------------------------
   */

  const [
    activeTab,
    setActiveTab
  ] = useState('home');

  const [
    selectedLesson,
    setSelectedLesson
  ] = useState(null);

  /*
   * ----------------------------------------------------------
   * Onboarding
   * ----------------------------------------------------------
   */

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
   * ----------------------------------------------------------
   * Group
   * ----------------------------------------------------------
   *
   * IMPORTANT:
   *
   * Your real group is 373901.
   *
   * We keep 150501 only as a legacy fallback for users who have
   * never selected a group. If onboarding has already saved 373901,
   * it will always win.
   */

  const [
    group,
    setGroup
  ] = useState(
    () =>
      localStorage.getItem(
        'sh_group'
      ) || '150501'
  );

  /*
   * ----------------------------------------------------------
   * Subgroup
   * ----------------------------------------------------------
   */

  const [
    subgroup,
    setSubgroup
  ] = useState(
    () =>
      Number(
        localStorage.getItem(
          'sh_subgroup'
        )
      ) || 1
  );

  /*
   * ----------------------------------------------------------
   * Theme
   * ----------------------------------------------------------
   */

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
   * ----------------------------------------------------------
   * Loading / API state
   * ----------------------------------------------------------
   */

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    apiError,
    setApiError
  ] = useState(null);

  const [
    apiState,
    setApiState
  ] = useState('loading');

  /*
   * ----------------------------------------------------------
   * Cached schedule
   * ----------------------------------------------------------
   */

  const [
    scheduleData,
    setScheduleData
  ] = useState(() => {
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

  /*
   * ----------------------------------------------------------
   * Last updated
   * ----------------------------------------------------------
   */

  const [
    lastUpdated,
    setLastUpdated
  ] = useState(
    () =>
      localStorage.getItem(
        'sh_cache_timestamp'
      ) || null
  );

  /*
   * ==========================================================
   * THEME
   * ==========================================================
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
   * ==========================================================
   * FETCH SCHEDULE
   * ==========================================================
   */

  useEffect(() => {
    let cancelled = false;

    async function fetchSchedule() {
      /*
       * --------------------------------------------------------
       * Validate group
       * --------------------------------------------------------
       */

      if (!group) {
        setLoading(false);
        setApiState('error');
        setApiError(
          'No student group has been selected.'
        );
        return;
      }

      /*
       * --------------------------------------------------------
       * Offline
       * --------------------------------------------------------
       */

      if (isOffline) {
        if (!cancelled) {
          setLoading(false);

          const hasCachedSchedule =
            hasScheduleEntries(
              scheduleData?.schedules
            );

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

      /*
       * --------------------------------------------------------
       * Start request
       * --------------------------------------------------------
       */

      try {
        setLoading(true);
        setApiError(null);
        setApiState('loading');

        const endpoint =
          `/api/bsuir/schedule?group=${encodeURIComponent(
            group
          )}`;

        const res =
          await fetch(
            endpoint,
            {
              headers: {
                Accept:
                  'application/json'
              }
            }
          );

        /*
         * ------------------------------------------------------
         * Parse JSON even for HTTP errors.
         * ------------------------------------------------------
         */

        let json = null;

        try {
          json =
            await res.json();
        } catch {
          json = null;
        }

        /*
         * ------------------------------------------------------
         * HTTP error
         * ------------------------------------------------------
         */

        if (!res.ok) {
          const serverMessage =
            json?.error ||
            json?.message ||
            `Schedule server returned HTTP ${res.status}.`;

          throw new Error(
            serverMessage
          );
        }

        /*
         * ------------------------------------------------------
         * Validate response.
         * ------------------------------------------------------
         */

        if (
          !json ||
          json.success !== true ||
          !json.data
        ) {
          throw new Error(
            json?.error ||
              'The schedule server returned no timetable data.'
          );
        }

        if (cancelled) {
          return;
        }

        /*
         * ------------------------------------------------------
         * NORMALIZE THE IMPORTANT PART
         * ------------------------------------------------------
         *
         * This is where the original bug was.
         *
         * BSUIR response:
         *
         * data.schedules = null
         * data.nextSchedules = { ...actual timetable... }
         *
         * normalizeScheduleData() now correctly uses
         * nextSchedules when schedules is empty.
         */

        const normalizedData =
          normalizeScheduleData(
            json.data
          );

        const status =
          getApiStatus(json);

        /*
         * ------------------------------------------------------
         * Determine whether timetable actually exists.
         * ------------------------------------------------------
         */

        const hasSchedule =
          hasScheduleEntries(
            normalizedData.schedules
          );

        /*
         * ------------------------------------------------------
         * Store normalized schedule.
         * ------------------------------------------------------
         */

        setScheduleData(
          normalizedData
        );

        /*
         * ------------------------------------------------------
         * Cache complete normalized response.
         * ------------------------------------------------------
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
         * ------------------------------------------------------
         * Update timestamp only when actual timetable exists.
         * ------------------------------------------------------
         */

        if (hasSchedule) {
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
         * ------------------------------------------------------
         * API state
         * ------------------------------------------------------
         */

        setApiState(
          status.state
        );

        /*
         * A live response with `nextSchedules` is still valid.
         *
         * Do NOT show "No timetable entries were returned".
         */

        if (
          status.state === 'live'
        ) {
          setApiError(null);
        } else {
          setApiError(
            status.message
          );
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

        /*
         * ------------------------------------------------------
         * Preserve existing schedule.
         * ------------------------------------------------------
         */

        const hasExistingSchedule =
          hasScheduleEntries(
            scheduleData?.schedules
          );

        if (
          hasExistingSchedule
        ) {
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
   * ==========================================================
   * ONBOARDING
   * ==========================================================
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
     * Save group.
     */

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
     * Clear old group's schedule.
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
   * ==========================================================
   * NAVIGATION
   * ==========================================================
   */

  const handleTabChange = (
    tab
  ) => {
    triggerHaptic(
      'light'
    );

    setActiveTab(
      tab
    );
  };

  /*
   * ==========================================================
   * ONBOARDING SCREEN
   * ==========================================================
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
   * ==========================================================
   * NORMALIZED DATA FOR VIEWS
   * ==========================================================
   */

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

  /*
   * ==========================================================
   * GREETING
   * ==========================================================
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
   * ----------------------------------------------------------
   * Display name
   * ----------------------------------------------------------
   */

  const displayName =
    user?.first_name ||
    (
      typeof student === 'object'
        ? student?.name
        : student
    ) ||
    'Unknown Student';

  /*
   * ==========================================================
   * STATUS
   * ==========================================================
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

  /*
   * ==========================================================
   * WEEK
   * ==========================================================
   */

  const weekNumber =
    scheduleData?.currentWeek ||
    1;

  /*
   * ==========================================================
   * HEADER
   * ==========================================================
   */

  const greetingText =
    `${greeting}, ${displayName}`;

  const titleClass =
    greetingText.length > 30
      ? 'text-xl'
      : greetingText.length > 20
        ? 'text-2xl'
        : 'text-[32px]';

  /*
   * ==========================================================
   * SUBJECT DETAILS
   * ==========================================================
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
   * ==========================================================
   * MAIN APP
   * ==========================================================
   */

  return (
    <div className="max-w-[440px] mx-auto px-4 pt-5 pb-28">

      {/* ======================================================
          APP HEADER
          ====================================================== */}

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
      </header>

      {/* ======================================================
          API / OFFLINE STATUS
          ====================================================== */}

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

      {/* ======================================================
          MAIN
          ====================================================== */}

      <main>

        {/* HOME */}
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

        {/* SCHEDULE */}
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

        {/* TEACHERS */}
        {activeTab === 'teachers' && (
          <TeachersView />
        )}

        {/* EXAMS */}
        {activeTab === 'exams' && (
          <ExamsView />
        )}

        {/* SETTINGS */}
        {activeTab === 'settings' && (
          <SettingsView
            group={group}
            setGroup={(
              newGroup
            ) => {
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
            setThemeMode={(
              newTheme
            ) => {
              setThemeMode(
                newTheme
              );

              localStorage.setItem(
                'sh_theme',
                newTheme
              );
            }}
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
 * ROOT APP
 * ============================================================
 */

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}