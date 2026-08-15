import React, { useState, useEffect, useMemo } from 'react';

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


/* ============================================================
   EMPTY DATA
   ============================================================ */

const EMPTY_DATA = {
  studentGroup: null,

  /*
   * Date-based schedule:
   *
   * {
   *   "2026-09-01": [lesson, lesson],
   *   "2026-09-02": [lesson],
   *   ...
   * }
   */
  schedules: {},

  todaySchedules: [],

  exams: [],

  currentWeek: 1,

  nextLesson: null,

  cached: false,
  fallback: false,
  stale: false,

  debug: null,

  /*
   * Keep the original BSUIR data too.
   * This is useful for debugging and future views.
   */
  rawSchedule: null,

  semesterStart: null,
  semesterEnd: null
};


/* ============================================================
   DATE HELPERS
   ============================================================ */

/*
 * Convert:
 *
 * 01.09.2026
 *
 * into:
 *
 * Date(2026, 8, 1)
 *
 * without timezone surprises.
 */
function parseBsuirDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return new Date(
      value.getFullYear(),
      value.getMonth(),
      value.getDate()
    );
  }

  const stringValue = String(value).trim();

  /*
   * BSUIR format:
   * DD.MM.YYYY
   */
  const dotMatch = stringValue.match(
    /^(\d{2})\.(\d{2})\.(\d{4})$/
  );

  if (dotMatch) {
    const day = Number(dotMatch[1]);
    const month = Number(dotMatch[2]) - 1;
    const year = Number(dotMatch[3]);

    return new Date(year, month, day);
  }

  /*
   * ISO:
   * YYYY-MM-DD
   */
  const isoMatch = stringValue.match(
    /^(\d{4})-(\d{2})-(\d{2})/
  );

  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);

    return new Date(year, month, day);
  }

  /*
   * Last attempt.
   */
  const parsed = new Date(stringValue);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate()
  );
}


/*
 * Return YYYY-MM-DD.
 *
 * IMPORTANT:
 * Do not use date.toISOString().slice(0, 10)
 * because that can shift the date around midnight
 * depending on timezone.
 */
function formatDateKey(date) {
  if (!date || Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    date.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}


/*
 * Clone a date without changing the original.
 */
function cloneDate(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}


/*
 * Add N days.
 */
function addDays(date, amount) {
  const result = cloneDate(date);

  result.setDate(
    result.getDate() + amount
  );

  return result;
}


/*
 * Monday = 1
 * Tuesday = 2
 * ...
 * Sunday = 7
 */
function getIsoWeekday(date) {
  const day = date.getDay();

  return day === 0
    ? 7
    : day;
}


/*
 * BSUIR uses Russian weekday names.
 */
const WEEKDAY_TO_ISO = {
  'Понедельник': 1,
  'Вторник': 2,
  'Среда': 3,
  'Четверг': 4,
  'Пятница': 5,
  'Суббота': 6,
  'Воскресенье': 7
};


/*
 * Also support English just in case.
 */
const WEEKDAY_ALIASES = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,

  'Понедельник': 1,
  'Вторник': 2,
  'Среда': 3,
  'Четверг': 4,
  'Пятница': 5,
  'Суббота': 6,
  'Воскресенье': 7
};


/* ============================================================
   SEMESTER WEEK CALCULATION
   ============================================================ */

/*
 * Calculate academic week from the actual calendar date.
 *
 * Example:
 *
 * semesterStart = 01.09.2026
 *
 * Sep 1-6  -> week 1
 * Sep 7-13 -> week 2
 * Sep 14-20 -> week 3
 *
 * This is intentionally calendar based.
 */
function getAcademicWeek(date, semesterStart) {
  if (!date || !semesterStart) {
    return 1;
  }

  const current = cloneDate(date);
  const start = cloneDate(semesterStart);

  /*
   * Normalize both dates to midnight.
   */
  current.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);

  const diffMs =
    current.getTime() -
    start.getTime();

  const diffDays =
    Math.floor(
      diffMs / (1000 * 60 * 60 * 24)
    );

  if (diffDays < 0) {
    return 1;
  }

  return Math.floor(diffDays / 7) + 1;
}


/* ============================================================
   LESSON NORMALIZATION
   ============================================================ */

function normalizeLesson(lesson, dateKey) {
  if (!lesson || typeof lesson !== 'object') {
    return null;
  }

  const date = parseBsuirDate(
    dateKey
  );

  return {
    ...lesson,

    /*
     * Canonical date used by the frontend.
     */
    date: dateKey,

    dateKey,

    /*
     * Preserve these aliases because different
     * components may use different names.
     */
    lessonDate: dateKey,

    startTime:
      lesson.startLessonTime ??
      lesson.startTime ??
      '',

    endTime:
      lesson.endLessonTime ??
      lesson.endTime ??
      '',

    type:
      lesson.lessonTypeAbbrev ??
      lesson.type ??
      '',

    room:
      Array.isArray(lesson.auditories)
        ? lesson.auditories[0] || ''
        : lesson.auditory ||
          lesson.room ||
          '',

    subject:
      lesson.subject ??
      lesson.subjectName ??
      '',

    subjectFullName:
      lesson.subjectFullName ??
      lesson.subject ??
      '',

    teacher:
      Array.isArray(lesson.employees) &&
      lesson.employees.length > 0
        ? lesson.employees[0]
        : null,

    weekday:
      date
        ? getIsoWeekday(date)
        : null
  };
}


/* ============================================================
   EXPAND BSUIR nextSchedules
   ============================================================ */

/*
 * THIS IS THE IMPORTANT FIX.
 *
 * BSUIR gives us:
 *
 * nextSchedules: {
 *   "Понедельник": [
 *      {
 *        startLessonDate: "07.09.2026",
 *        endLessonDate: "28.12.2026",
 *        weekNumber: [1,2,4],
 *        ...
 *      }
 *   ]
 * }
 *
 * That is a recurring timetable template.
 *
 * The frontend needs concrete dates:
 *
 * schedules["2026-09-07"]
 * schedules["2026-09-14"]
 * schedules["2026-09-21"]
 * ...
 */
function expandNextSchedules(
  nextSchedules,
  semesterStart,
  semesterEnd
) {
  const result = {};

  if (
    !nextSchedules ||
    typeof nextSchedules !== 'object'
  ) {
    return result;
  }

  Object.entries(nextSchedules).forEach(
    ([weekdayName, lessons]) => {
      if (!Array.isArray(lessons)) {
        return;
      }

      const weekday =
        WEEKDAY_ALIASES[weekdayName] ??
        WEEKDAY_TO_ISO[weekdayName];

      if (!weekday) {
        console.warn(
          'Unknown BSUIR weekday:',
          weekdayName
        );

        return;
      }

      lessons.forEach((lesson) => {
        /*
         * Each individual lesson may have its own
         * start/end date.
         */
        const lessonStart =
          parseBsuirDate(
            lesson.startLessonDate
          ) ||
          semesterStart;

        const lessonEnd =
          parseBsuirDate(
            lesson.endLessonDate
          ) ||
          semesterEnd;

        if (!lessonStart || !lessonEnd) {
          return;
        }

        /*
         * Do not allow a lesson to generate
         * dates outside the semester.
         */
        let startDate = cloneDate(
          lessonStart
        );

        let endDate = cloneDate(
          lessonEnd
        );

        if (semesterStart) {
          if (
            startDate.getTime() <
            semesterStart.getTime()
          ) {
            startDate =
              cloneDate(semesterStart);
          }
        }

        if (semesterEnd) {
          if (
            endDate.getTime() >
            semesterEnd.getTime()
          ) {
            endDate =
              cloneDate(semesterEnd);
          }
        }

        /*
         * Move to the first occurrence of this
         * weekday.
         */
        while (
          startDate <= endDate &&
          getIsoWeekday(startDate) !== weekday
        ) {
          startDate =
            addDays(startDate, 1);
        }

        /*
         * Generate every matching calendar date.
         */
        let currentDate =
          cloneDate(startDate);

        while (
          currentDate <= endDate
        ) {
          /*
           * Academic week is determined from
           * the semester start.
           */
          const academicWeek =
            getAcademicWeek(
              currentDate,
              semesterStart
            );

          /*
           * BSUIR lesson has weekNumber:
           *
           * [1, 3]
           *
           * or:
           *
           * [1, 2, 3, 4]
           *
           * A lesson should only appear when
           * its academic week matches.
           */
          const lessonWeeks =
            Array.isArray(
              lesson.weekNumber
            )
              ? lesson.weekNumber
              : [];

          const matchesWeek =
            lessonWeeks.length === 0 ||
            lessonWeeks.includes(
              academicWeek
            );

          if (matchesWeek) {
            const dateKey =
              formatDateKey(
                currentDate
              );

            if (dateKey) {
              if (!result[dateKey]) {
                result[dateKey] = [];
              }

              const normalizedLesson =
                normalizeLesson(
                  {
                    ...lesson,

                    /*
                     * Make the generated
                     * academic week explicit.
                     */
                    academicWeek,

                    /*
                     * Keep the original weekday.
                     */
                    weekdayName,

                    /*
                     * This helps ScheduleView
                     * identify the actual date.
                     */
                    generatedFromRecurringSchedule:
                      true
                  },
                  dateKey
                );

              if (normalizedLesson) {
                result[dateKey].push(
                  normalizedLesson
                );
              }
            }
          }

          /*
           * Next same weekday.
           */
          currentDate =
            addDays(currentDate, 7);
        }
      });
    }
  );

  /*
   * Sort every day's lessons by start time.
   */
  Object.keys(result).forEach(
    (dateKey) => {
      result[dateKey].sort(
        (a, b) => {
          const aTime =
            a.startTime || '';

          const bTime =
            b.startTime || '';

          return aTime.localeCompare(
            bTime
          );
        }
      );
    }
  );

  return result;
}


/* ============================================================
   TODAY
   ============================================================ */

function getTodaySchedules(
  schedules,
  date = new Date()
) {
  const todayKey =
    formatDateKey(date);

  if (!todayKey) {
    return [];
  }

  return Array.isArray(
    schedules?.[todayKey]
  )
    ? schedules[todayKey]
    : [];
}


/* ============================================================
   NEXT LESSON
   ============================================================ */

/*
 * Find the next actual calendar lesson,
 * not simply the first item in todaySchedules.
 */
function findNextLesson(
  schedules,
  fromDate = new Date()
) {
  if (
    !schedules ||
    typeof schedules !== 'object'
  ) {
    return null;
  }

  const now = new Date();

  const startKey =
    formatDateKey(fromDate);

  const dates =
    Object.keys(schedules)
      .filter(
        (key) =>
          key >= startKey
      )
      .sort();

  for (const dateKey of dates) {
    const lessons =
      Array.isArray(
        schedules[dateKey]
      )
        ? schedules[dateKey]
        : [];

    if (lessons.length === 0) {
      continue;
    }

    /*
     * For today, try to find the next lesson
     * based on its start time.
     */
    if (
      dateKey ===
      formatDateKey(now)
    ) {
      for (const lesson of lessons) {
        if (!lesson.startTime) {
          return lesson;
        }

        const parts =
          lesson.startTime.split(':');

        const hours =
          Number(parts[0]);

        const minutes =
          Number(parts[1]);

        if (
          Number.isFinite(hours) &&
          Number.isFinite(minutes)
        ) {
          const lessonStart =
            new Date(now);

          lessonStart.setHours(
            hours,
            minutes,
            0,
            0
          );

          if (
            lessonStart >= now
          ) {
            return lesson;
          }
        } else {
          return lesson;
        }
      }

      /*
       * Nothing later today.
       */
      continue;
    }

    /*
     * First lesson on a future date.
     */
    return lessons[0];
  }

  return null;
}


/* ============================================================
   NORMALIZE COMPLETE API RESPONSE
   ============================================================ */

function normalizeScheduleData(
  data
) {
  if (
    !data ||
    typeof data !== 'object'
  ) {
    return {
      ...EMPTY_DATA
    };
  }

  /*
   * If this is the wrapper response:
   *
   * {
   *   success: true,
   *   data: {...}
   * }
   *
   * accept it.
   */
  const source =
    data.data &&
    typeof data.data === 'object'
      ? data.data
      : data;

  const raw =
    source.rawSchedule ||
    source.raw ||
    source;

  /*
   * Student group.
   */
  const studentGroup =
    source.studentGroup ??
    source.student ??
    raw.studentGroupDto?.name ??
    null;

  /*
   * Semester dates.
   *
   * The debug payload you supplied has:
   *
   * startDate: 01.09.2026
   * endDate: 28.12.2026
   */
  const semesterStart =
    parseBsuirDate(
      source.startDate ??
      raw.startDate ??
      source.semesterStart
    );

  const semesterEnd =
    parseBsuirDate(
      source.endDate ??
      raw.endDate ??
      source.semesterEnd
    );

  /*
   * ----------------------------------------------------------
   * NEW BSUIR FORMAT
   * ----------------------------------------------------------
   *
   * schedules: null
   * nextSchedules: {...}
   *
   * Use nextSchedules.
   */
  const nextSchedules =
    source.nextSchedules ??
    raw.nextSchedules ??
    null;

  /*
   * Expand recurring BSUIR lessons
   * into actual dates.
   */
  let schedules = {};

  if (
    nextSchedules &&
    typeof nextSchedules === 'object'
  ) {
    schedules =
      expandNextSchedules(
        nextSchedules,
        semesterStart,
        semesterEnd
      );
  }

  /*
   * ----------------------------------------------------------
   * OLD FORMAT SUPPORT
   * ----------------------------------------------------------
   *
   * If an older backend already gives
   * date-keyed schedules, preserve them.
   */
  if (
    Object.keys(schedules).length === 0 &&
    source.schedules &&
    typeof source.schedules === 'object' &&
    !Array.isArray(source.schedules)
  ) {
    Object.entries(
      source.schedules
    ).forEach(
      ([dateKey, lessons]) => {
        if (
          Array.isArray(lessons)
        ) {
          schedules[dateKey] =
            lessons
              .map((lesson) =>
                normalizeLesson(
                  lesson,
                  dateKey
                )
              )
              .filter(Boolean);
        }
      }
    );
  }

  /*
   * If backend already supplies today's
   * lessons, we still prefer the date-based
   * generated value.
   */
  const todaySchedules =
    getTodaySchedules(
      schedules
    );

  /*
   * Current academic week.
   *
   * Prefer backend value when valid,
   * otherwise calculate it.
   */
  const currentWeek =
    Number(
      source.currentWeek ??
      data.currentWeek
    ) > 0
      ? Number(
          source.currentWeek ??
          data.currentWeek
        )
      : semesterStart
        ? getAcademicWeek(
            new Date(),
            semesterStart
          )
        : 1;

  /*
   * Next actual calendar lesson.
   */
  const nextLesson =
    findNextLesson(
      schedules
    );

  /*
   * Keep backend status flags.
   */
  const cached =
    Boolean(
      data.cached ??
      source.cached
    );

  const fallback =
    Boolean(
      data.fallback ??
      source.fallback
    );

  const stale =
    Boolean(
      data.stale ??
      source.stale
    );

  return {
    ...EMPTY_DATA,

    studentGroup,

    schedules,

    todaySchedules,

    exams:
      Array.isArray(
        source.exams
      )
        ? source.exams
        : [],

    currentWeek,

    nextLesson,

    cached,
    fallback,
    stale,

    debug:
      data.debug ??
      source.debug ??
      null,

    rawSchedule:
      raw,

    semesterStart:
      semesterStart
        ? formatDateKey(
            semesterStart
          )
        : null,

    semesterEnd:
      semesterEnd
        ? formatDateKey(
            semesterEnd
          )
        : null
  };
}


/* ============================================================
   API STATUS
   ============================================================ */

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

  if (
    json.fallback === true
  ) {
    return {
      state: 'fallback',
      message:
        'BSUIR data is temporarily unavailable. No live timetable data was received.'
    };
  }

  if (
    json.cached === true
  ) {
    return {
      state: 'cached',
      message:
        'BSUIR is temporarily unavailable. Showing the latest cached timetable.'
    };
  }

  if (
    json.stale === true
  ) {
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


/* ============================================================
   APP CONTENT
   ============================================================ */

function AppContent() {
  const {
    user,
    colorScheme,
    triggerHaptic
  } = useTelegram();

  const isOffline =
    useOffline();

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

  const [
    group,
    setGroup
  ] = useState(
    () =>
      localStorage.getItem(
        'sh_group'
      ) || '373901'
  );

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

  const [
    themeMode,
    setThemeMode
  ] = useState(
    () =>
      localStorage.getItem(
        'sh_theme'
      ) || 'system'
  );

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
   * Load cached schedule.
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

  const [
    lastUpdated,
    setLastUpdated
  ] = useState(
    () =>
      localStorage.getItem(
        'sh_cache_timestamp'
      ) || null
  );


  /* ==========================================================
     THEME
     ========================================================== */

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


  /* ==========================================================
     FETCH SCHEDULE
     ========================================================== */

  useEffect(() => {
    let cancelled = false;

    async function fetchSchedule() {
      const normalizedGroup =
        String(
          group || ''
        ).trim();

      if (!normalizedGroup) {
        setLoading(false);
        setApiState('error');
        setApiError(
          'No student group has been selected.'
        );

        return;
      }

      if (isOffline) {
        if (!cancelled) {
          setLoading(false);

          const hasCachedSchedule =
            scheduleData &&
            scheduleData.schedules &&
            Object.keys(
              scheduleData.schedules
            ).length > 0;

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

        /*
         * Group is encoded so this also works
         * with other group numbers.
         */
        const endpoint =
          `/api/bsuir/schedule?group=${encodeURIComponent(
            normalizedGroup
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

        let json = null;

        try {
          json =
            await res.json();
        } catch {
          json = null;
        }

        /*
         * IMPORTANT:
         *
         * Do not reject a response merely because
         * schedules is null.
         *
         * Your new BSUIR response has:
         *
         * schedules: null
         * nextSchedules: {...}
         *
         * That is valid.
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
         * THIS now expands nextSchedules
         * into real calendar dates.
         */
        const normalizedData =
          normalizeScheduleData(
            json
          );

        const status =
          getApiStatus(json);

        /*
         * We consider the response usable
         * when either:
         *
         * 1. actual date schedules exist
         * 2. exams exist
         * 3. backend supplied nextSchedules
         */
        const hasSchedule =
          Object.keys(
            normalizedData.schedules || {}
          ).length > 0;

        const hasRecurringSchedule =
          json.data?.nextSchedules &&
          Object.keys(
            json.data.nextSchedules
          ).length > 0;

        const hasAnyTimetableData =
          hasSchedule ||
          hasRecurringSchedule ||
          normalizedData.exams.length >
            0;

        /*
         * Store complete normalized data.
         */
        setScheduleData(
          normalizedData
        );

        /*
         * Cache the normalized,
         * date-based representation.
         */
        try {
          localStorage.setItem(
            'sh_cached_schedule',
            JSON.stringify(
              normalizedData
            )
          );
        } catch (
          storageError
        ) {
          console.error(
            'Failed to cache schedule:',
            storageError
          );
        }

        /*
         * Update timestamp whenever
         * we got a successful timetable response.
         */
        if (
          hasAnyTimetableData
        ) {
          const now =
            new Date().toISOString();

          setLastUpdated(
            now
          );

          try {
            localStorage.setItem(
              'sh_cache_timestamp',
              now
            );
          } catch (
            storageError
          ) {
            console.error(
              'Failed to cache timestamp:',
              storageError
            );
          }
        }

        setApiState(
          status.state
        );

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

        setApiState(
          'error'
        );

        const hasExistingSchedule =
          scheduleData &&
          scheduleData.schedules &&
          Object.keys(
            scheduleData.schedules
          ).length > 0;

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


  /* ==========================================================
     ONBOARDING
     ========================================================== */

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
     * Clear previous group's schedule.
     */
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
    } catch (error) {
      console.error(
        'Failed to clear previous schedule cache:',
        error
      );
    }
  };


  /* ==========================================================
     NAVIGATION
     ========================================================== */

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


  /* ==========================================================
     ONBOARDING SCREEN
     ========================================================== */

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


  /* ==========================================================
     CONSUMER DATA
     ========================================================== */

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
   * Recalculate today's lessons directly
   * from the date-based schedule.
   *
   * This prevents stale todaySchedules
   * after midnight.
   */
  const actualTodaySchedule =
    getTodaySchedules(
      scheduleData?.schedules
    );

  const effectiveTodaySchedule =
    actualTodaySchedule.length > 0 ||
    todaySchedule.length === 0
      ? actualTodaySchedule
      : todaySchedule;


  /* ==========================================================
     GREETING
     ========================================================== */

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


  /* ==========================================================
     DISPLAY NAME
     ========================================================== */

  const displayName =
    user?.first_name ||
    (
      typeof student ===
      'object'
        ? student?.name
        : student
    ) ||
    'Student';


  /* ==========================================================
     STATUS
     ========================================================== */

  const statusState =
    isOffline
      ? 'offline'
      : apiState ===
        'live'
        ? 'live'
        : apiState ===
            'cached' ||
          apiState ===
            'stale' ||
          apiState ===
            'fallback'
          ? 'cached'
          : 'error';


  /* ==========================================================
     WEEK
     ========================================================== */

  const weekNumber =
    scheduleData?.currentWeek ||
    1;


  /* ==========================================================
     GREETING TEXT
     ========================================================== */

  const greetingText =
    `${greeting}, ${displayName}`;

  const titleClass =
    greetingText.length > 30
      ? 'text-xl'
      : greetingText.length > 20
        ? 'text-2xl'
        : 'text-[32px]';


  /* ==========================================================
     SUBJECT DETAILS
     ========================================================== */

  if (
    selectedLesson
  ) {
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


  /* ==========================================================
     MAIN APPLICATION
     ========================================================== */

  return (
    <div className="max-w-[440px] mx-auto px-4 pt-5 pb-28">

      {/* ======================================================
          HEADER
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
          Группа: {group}
          {' • '}
          Подгруппа: {subgroup}
          {' • '}
          Неделя: {weekNumber}
        </p>
      </header>


      {/* ======================================================
          API / OFFLINE STATUS
          ====================================================== */}

      {apiError && (
        <div className="mb-4 rounded-2xl p-3 bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-center gap-3 text-xs text-[#f59e0b]">

          <span>
            {apiState ===
            'live'
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


      {/* ======================================================
          MAIN
          ====================================================== */}

      <main>

        {/* HOME */}
        {activeTab ===
          'home' && (
          <HomeView
            scheduleData={{
              student,
              nextLesson,
              todaySchedule:
                effectiveTodaySchedule
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
              (
                newGroup
              ) => {
                const normalizedGroup =
                  String(
                    newGroup ||
                    ''
                  ).trim();

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
              (
                newTheme
              ) => {
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
          FLOATING NAV
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


/* ============================================================
   APP
   ============================================================ */

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
} 