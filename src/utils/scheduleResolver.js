// src/utils/scheduleResolver.js
//
// Schedule resolver for ScheduleHub.
//
// PRIMARY DATA MODEL
// ------------------
// The frontend schedule is now date-based:
//
// {
//   "2026-09-01": [lesson, lesson],
//   "2026-09-02": [lesson],
//   "2026-09-03": [lesson, lesson],
//   ...
// }
//
// The resolver also accepts the raw BSUIR format:
//
// {
//   schedules: {
//     "Понедельник": [...],
//     "Вторник": [...]
//   },
//   nextSchedules: {
//     "Понедельник": [...],
//     "Вторник": [...]
//   }
// }
//
// IMPORTANT
// ---------
// Calendar date is the source of truth.
// We do NOT blindly use the current API week for a selected date.
// The academic week is calculated from the term start date whenever
// possible, then weekNumber/date-range/subgroup are applied.
//
// This prevents the old bug where:
//
//   date-keyed schedules
//        ↓
//   resolver looks for "Четверг"
//        ↓
//   finds nothing
//
// The resolver now checks:
//
//   1. exact YYYY-MM-DD key
//   2. raw weekday key
//   3. nextSchedules weekday key
//   4. explicit lesson date range
//   5. academic week
//   6. subgroup
//   7. time sorting
//

const RU_DAY_NAMES = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье'
];

const DAY_ALIASES = {
  Mon: 'Понедельник',
  Monday: 'Понедельник',
  Понедельник: 'Понедельник',

  Tue: 'Вторник',
  Tuesday: 'Вторник',
  Вторник: 'Вторник',

  Wed: 'Среда',
  Wednesday: 'Среда',
  Среда: 'Среда',

  Thu: 'Четверг',
  Thursday: 'Четверг',
  Четверг: 'Четверг',

  Fri: 'Пятница',
  Friday: 'Пятница',
  Пятница: 'Пятница',

  Sat: 'Суббота',
  Saturday: 'Суббота',
  Суббота: 'Суббота',

  Sun: 'Воскресенье',
  Sunday: 'Воскресенье',
  Воскресенье: 'Воскресенье'
};

/* -------------------------------------------------------------------------- */
/* Basic helpers                                                              */
/* -------------------------------------------------------------------------- */

function normalizeDayName(dayName) {
  if (!dayName) {
    return null;
  }

  const value = String(dayName).trim();

  return DAY_ALIASES[value] || value;
}

function isDateKey(value) {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
  );
}

function weekdayNameForDate(date) {
  const normalized = toDateOnly(date);

  if (!normalized) {
    return null;
  }

  const jsDay = normalized.getDay();

  // JS:
  // 0 Sunday
  // 1 Monday
  // ...
  // 6 Saturday

  const index = jsDay === 0 ? 6 : jsDay - 1;

  return RU_DAY_NAMES[index];
}

/* -------------------------------------------------------------------------- */
/* Date helpers                                                               */
/* -------------------------------------------------------------------------- */

function toDateOnly(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    return new Date(
      value.getFullYear(),
      value.getMonth(),
      value.getDate()
    );
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    // YYYY-MM-DD
    let match = trimmed.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);

      const result = new Date(
        year,
        month - 1,
        day
      );

      if (
        result.getFullYear() !== year ||
        result.getMonth() !== month - 1 ||
        result.getDate() !== day
      ) {
        return null;
      }

      return result;
    }

    // DD.MM.YYYY
    match = trimmed.match(
      /^(\d{2})\.(\d{2})\.(\d{4})/
    );

    if (match) {
      const day = Number(match[1]);
      const month = Number(match[2]);
      const year = Number(match[3]);

      const result = new Date(
        year,
        month - 1,
        day
      );

      if (
        result.getFullYear() !== year ||
        result.getMonth() !== month - 1 ||
        result.getDate() !== day
      ) {
        return null;
      }

      return result;
    }

    // ISO datetime / other parseable date.
    const parsed = new Date(trimmed);

    if (!Number.isNaN(parsed.getTime())) {
      return new Date(
        parsed.getFullYear(),
        parsed.getMonth(),
        parsed.getDate()
      );
    }

    return null;
  }

  if (typeof value === 'number') {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return new Date(
        parsed.getFullYear(),
        parsed.getMonth(),
        parsed.getDate()
      );
    }
  }

  return null;
}

function dateKey(date) {
  const normalized = toDateOnly(date);

  if (!normalized) {
    return null;
  }

  const year = normalized.getFullYear();

  const month = String(
    normalized.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    normalized.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function dateIsBetween(
  date,
  startDate,
  endDate
) {
  const target = toDateOnly(date);

  if (!target) {
    return false;
  }

  const start = startDate
    ? toDateOnly(startDate)
    : null;

  const end = endDate
    ? toDateOnly(endDate)
    : null;

  if (start && target < start) {
    return false;
  }

  if (end && target > end) {
    return false;
  }

  return true;
}

/* -------------------------------------------------------------------------- */
/* Academic term helpers                                                      */
/* -------------------------------------------------------------------------- */

function getTermStartDate(scheduleData) {
  if (!scheduleData) {
    return null;
  }

  const candidates = [
    scheduleData.startDate,
    scheduleData.termStartDate,
    scheduleData.currentTerm?.startDate,
    scheduleData.currentTerm?.start,
    scheduleData.data?.startDate,
    scheduleData.data?.termStartDate,
    scheduleData.data?.currentTerm?.startDate
  ];

  for (const candidate of candidates) {
    const parsed = toDateOnly(candidate);

    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function getTermEndDate(scheduleData) {
  if (!scheduleData) {
    return null;
  }

  const candidates = [
    scheduleData.endDate,
    scheduleData.termEndDate,
    scheduleData.currentTerm?.endDate,
    scheduleData.currentTerm?.end,
    scheduleData.data?.endDate,
    scheduleData.data?.termEndDate,
    scheduleData.data?.currentTerm?.endDate
  ];

  for (const candidate of candidates) {
    const parsed = toDateOnly(candidate);

    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function getAcademicWeekForDate(
  date,
  termStartDate
) {
  const target = toDateOnly(date);
  const start = toDateOnly(termStartDate);

  if (!target || !start) {
    return null;
  }

  const millisecondsPerDay =
    24 * 60 * 60 * 1000;

  const difference =
    target.getTime() -
    start.getTime();

  const daysSinceStart =
    Math.floor(
      difference / millisecondsPerDay
    );

  if (daysSinceStart < 0) {
    return null;
  }

  return (
    Math.floor(daysSinceStart / 7) +
    1
  );
}

/* -------------------------------------------------------------------------- */
/* Week helpers                                                               */
/* -------------------------------------------------------------------------- */

function getLessonWeeks(lesson) {
  if (!lesson) {
    return [];
  }

  const value = lesson.weekNumber;

  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return [];
  }

  const values = Array.isArray(value)
    ? value
    : [value];

  return values
    .flatMap((item) => {
      if (
        typeof item === 'string' &&
        item.includes(',')
      ) {
        return item.split(',');
      }

      return [item];
    })
    .map((item) => Number(item))
    .filter((item) =>
      Number.isFinite(item)
    );
}

function lessonMatchesWeek(
  lesson,
  academicWeek
) {
  const weeks =
    getLessonWeeks(lesson);

  // No restriction.
  if (weeks.length === 0) {
    return true;
  }

  const week = Number(
    academicWeek
  );

  if (!Number.isFinite(week)) {
    // We cannot determine the week.
    // Do not hide valid data.
    return true;
  }

  return weeks.includes(week);
}

/* -------------------------------------------------------------------------- */
/* Subgroup helpers                                                           */
/* -------------------------------------------------------------------------- */

function lessonMatchesSubgroup(
  lesson,
  subgroup
) {
  if (!lesson) {
    return false;
  }

  const requested =
    Number(subgroup) || 0;

  const lessonSubgroup =
    Number(lesson.numSubgroup) || 0;

  // 0 = everyone.
  if (lessonSubgroup === 0) {
    return true;
  }

  // No selected subgroup.
  // Do not hide the lesson.
  if (requested === 0) {
    return true;
  }

  return (
    lessonSubgroup === requested
  );
}

/* -------------------------------------------------------------------------- */
/* Date-range helpers                                                         */
/* -------------------------------------------------------------------------- */

function lessonMatchesDate(
  lesson,
  date
) {
  if (!lesson) {
    return false;
  }

  const startDate =
    lesson.startLessonDate ||
    lesson.startDate ||
    null;

  const endDate =
    lesson.endLessonDate ||
    lesson.endDate ||
    null;

  // No explicit date range.
  if (!startDate && !endDate) {
    return true;
  }

  return dateIsBetween(
    date,
    startDate,
    endDate
  );
}

/* -------------------------------------------------------------------------- */
/* Time / sorting                                                             */
/* -------------------------------------------------------------------------- */

function timeStrToMinutes(time) {
  if (
    !time ||
    typeof time !== 'string'
  ) {
    return Number.MAX_SAFE_INTEGER;
  }

  const match = time.match(
    /(\d{1,2}):(\d{2})/
  );

  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {
    return Number.MAX_SAFE_INTEGER;
  }

  return (
    hours * 60 +
    minutes
  );
}

function getLessonStartTime(
  lesson
) {
  return (
    lesson?.startLessonTime ||
    lesson?.startTime ||
    lesson?.time?.split?.('-')?.[0] ||
    ''
  );
}

function getLessonEndTime(
  lesson
) {
  return (
    lesson?.endLessonTime ||
    lesson?.endTime ||
    lesson?.time?.split?.('-')?.[1] ||
    ''
  );
}

function sortLessons(lessons) {
  return [...lessons].sort(
    (a, b) => {
      const timeDifference =
        timeStrToMinutes(
          getLessonStartTime(a)
        ) -
        timeStrToMinutes(
          getLessonStartTime(b)
        );

      if (timeDifference !== 0) {
        return timeDifference;
      }

      const subjectA =
        String(
          a?.subjectFullName ||
            a?.subject ||
            ''
        ).toLowerCase();

      const subjectB =
        String(
          b?.subjectFullName ||
            b?.subject ||
            ''
        ).toLowerCase();

      return subjectA.localeCompare(
        subjectB
      );
    }
  );
}

/* -------------------------------------------------------------------------- */
/* Schedule source extraction                                                 */
/* -------------------------------------------------------------------------- */

function getScheduleSource(
  scheduleData
) {
  if (!scheduleData) {
    return {};
  }

  /*
   * Direct schedules object:
   *
   * {
   *   "2026-09-01": [...],
   *   "2026-09-02": [...]
   * }
   *
   * or:
   *
   * {
   *   "Понедельник": [...]
   * }
   */
  if (
    !scheduleData.schedules &&
    !scheduleData.nextSchedules &&
    !scheduleData.data &&
    typeof scheduleData === 'object'
  ) {
    const keys =
      Object.keys(scheduleData);

    const looksLikeScheduleObject =
      keys.some(
        (key) =>
          isDateKey(key) ||
          RU_DAY_NAMES.includes(key) ||
          DAY_ALIASES[key]
      );

    if (
      looksLikeScheduleObject
    ) {
      return scheduleData;
    }
  }

  /*
   * Prefer schedules when populated.
   */
  if (
    scheduleData.schedules &&
    typeof scheduleData.schedules ===
      'object' &&
    Object.keys(
      scheduleData.schedules
    ).length > 0
  ) {
    return scheduleData.schedules;
  }

  /*
   * Raw BSUIR fallback.
   */
  if (
    scheduleData.nextSchedules &&
    typeof scheduleData.nextSchedules ===
      'object' &&
    Object.keys(
      scheduleData.nextSchedules
    ).length > 0
  ) {
    return scheduleData.nextSchedules;
  }

  /*
   * Nested data wrapper.
   */
  if (
    scheduleData.data &&
    typeof scheduleData.data ===
      'object'
  ) {
    if (
      scheduleData.data.schedules &&
      typeof scheduleData.data.schedules ===
        'object'
    ) {
      return scheduleData.data.schedules;
    }

    if (
      scheduleData.data.nextSchedules &&
      typeof scheduleData.data.nextSchedules ===
        'object'
    ) {
      return (
        scheduleData.data.nextSchedules
      );
    }

    /*
     * data itself can be the date-keyed
     * schedule object.
     */
    const dataKeys =
      Object.keys(scheduleData.data);

    if (
      dataKeys.some(
        (key) =>
          isDateKey(key) ||
          RU_DAY_NAMES.includes(key) ||
          DAY_ALIASES[key]
      )
    ) {
      return scheduleData.data;
    }
  }

  return {};
}

function getScheduleEntries(
  scheduleData
) {
  return getScheduleSource(
    scheduleData
  );
}

/* -------------------------------------------------------------------------- */
/* Date-keyed schedule support                                                */
/* -------------------------------------------------------------------------- */

function getLessonsForDateKey(
  schedules,
  date
) {
  if (
    !schedules ||
    typeof schedules !== 'object'
  ) {
    return [];
  }

  const key = dateKey(date);

  if (!key) {
    return [];
  }

  const value =
    schedules[key];

  return Array.isArray(value)
    ? value
    : [];
}

function scheduleIsDateKeyed(
  schedules
) {
  if (
    !schedules ||
    typeof schedules !== 'object'
  ) {
    return false;
  }

  return Object.keys(
    schedules
  ).some(isDateKey);
}

/* -------------------------------------------------------------------------- */
/* Weekday schedule support                                                   */
/* -------------------------------------------------------------------------- */

function getLessonsForDay(
  schedules,
  dayName
) {
  if (
    !schedules ||
    typeof schedules !== 'object'
  ) {
    return [];
  }

  const normalizedDay =
    normalizeDayName(dayName);

  if (!normalizedDay) {
    return [];
  }

  const candidates = [
    normalizedDay,
    dayName
  ];

  for (const key of candidates) {
    if (
      key &&
      Array.isArray(
        schedules[key]
      )
    ) {
      return schedules[key];
    }
  }

  const matchingKey =
    Object.keys(
      schedules
    ).find(
      (key) =>
        normalizeDayName(
          String(key).trim()
        ) === normalizedDay
    );

  if (
    matchingKey &&
    Array.isArray(
      schedules[matchingKey]
    )
  ) {
    return schedules[
      matchingKey
    ];
  }

  return [];
}

/* -------------------------------------------------------------------------- */
/* Lesson identity / deduplication                                            */
/* -------------------------------------------------------------------------- */

function lessonIdentity(
  lesson
) {
  if (!lesson) {
    return '';
  }

  if (
    lesson.id !== undefined &&
    lesson.id !== null
  ) {
    return `id:${lesson.id}`;
  }

  const groups = Array.isArray(
    lesson.studentGroups
  )
    ? lesson.studentGroups
        .map(
          (group) =>
            group?.name || ''
        )
        .join(',')
    : '';

  const teachers =
    Array.isArray(
      lesson.employees
    )
      ? lesson.employees
          .map(
            (employee) =>
              employee?.id ||
              employee?.urlId ||
              ''
          )
          .join(',')
      : '';

  const rooms =
    Array.isArray(
      lesson.auditories
    )
      ? lesson.auditories.join(',')
      : '';

  return [
    lesson.subject || '',
    lesson.subjectFullName || '',
    getLessonStartTime(lesson),
    getLessonEndTime(lesson),
    lesson.startLessonDate || '',
    lesson.endLessonDate || '',
    getLessonWeeks(lesson).join(','),
    Number(lesson.numSubgroup) || 0,
    groups,
    teachers,
    rooms
  ].join('|');
}

function dedupeLessons(
  lessons
) {
  const result = [];
  const seen = new Set();

  for (const lesson of lessons) {
    const key =
      lessonIdentity(lesson);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(lesson);
  }

  return result;
}

/* -------------------------------------------------------------------------- */
/* Calendar-date resolution                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Resolve lessons for ONE actual calendar date.
 *
 * This is the primary resolver used by ScheduleView.
 */
function resolveLessonsForDate(
  scheduleData,
  date,
  currentWeek,
  subgroup = 0
) {
  const targetDate =
    toDateOnly(date);

  if (!targetDate) {
    return [];
  }

  const schedules =
    getScheduleSource(
      scheduleData
    );

  if (
    !schedules ||
    typeof schedules !== 'object'
  ) {
    return [];
  }

  /*
   * If App has already converted the API into
   * YYYY-MM-DD keys, use the exact date first.
   */
  let candidates = [];

  if (
    scheduleIsDateKeyed(
      schedules
    )
  ) {
    candidates =
      getLessonsForDateKey(
        schedules,
        targetDate
      );
  }

  /*
   * If there was no exact date entry,
   * support raw weekday schedules.
   */
  if (candidates.length === 0) {
    const dayName =
      weekdayNameForDate(
        targetDate
      );

    candidates =
      getLessonsForDay(
        schedules,
        dayName
      );
  }

  if (
    !Array.isArray(candidates) ||
    candidates.length === 0
  ) {
    return [];
  }

  /*
   * Prefer a deterministic academic week
   * calculated from the actual term start.
   *
   * Only fall back to currentWeek if the
   * response doesn't contain startDate.
   */
  const calculatedWeek =
    getAcademicWeekForDate(
      targetDate,
      getTermStartDate(
        scheduleData
      )
    );

  const effectiveWeek =
    calculatedWeek ??
    Number(currentWeek);

  const filtered =
    candidates.filter(
      (lesson) => {
        if (!lesson) {
          return false;
        }

        /*
         * The exact date key already proves
         * the lesson was assigned to this date.
         *
         * We still apply explicit BSUIR date
         * ranges when they exist.
         */
        if (
          !lessonMatchesDate(
            lesson,
            targetDate
          )
        ) {
          return false;
        }

        /*
         * IMPORTANT:
         *
         * For date-keyed schedules, the date
         * expansion has already selected the
         * actual occurrence.
         *
         * Therefore weekNumber is only used
         * as a filter when the schedule is
         * still weekday-based.
         */
        if (
          !scheduleIsDateKeyed(
            schedules
          ) &&
          !lessonMatchesWeek(
            lesson,
            effectiveWeek
          )
        ) {
          return false;
        }

        if (
          !lessonMatchesSubgroup(
            lesson,
            subgroup
          )
        ) {
          return false;
        }

        return true;
      }
    );

  return sortLessons(
    dedupeLessons(filtered)
  );
}

/**
 * Resolve and normalize lessons for a date.
 */
function resolveNormalizedLessonsForDate(
  scheduleData,
  date,
  currentWeek,
  subgroup = 0
) {
  return resolveLessonsForDate(
    scheduleData,
    date,
    currentWeek,
    subgroup
  ).map((lesson) =>
    normalizeLesson(
      lesson,
      date
    )
  );
}

/* -------------------------------------------------------------------------- */
/* Week resolution                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Resolve a complete calendar week.
 *
 * Returns:
 *
 * {
 *   "2026-09-07": [...],
 *   "2026-09-08": [...],
 *   ...
 * }
 */
function resolveWeek(
  scheduleData,
  weekStartDate,
  currentWeek,
  subgroup = 0
) {
  const start =
    toDateOnly(
      weekStartDate
    );

  if (!start) {
    return {};
  }

  const result = {};

  for (let i = 0; i < 7; i += 1) {
    const date = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + i
    );

    const key =
      dateKey(date);

    result[key] =
      resolveLessonsForDate(
        scheduleData,
        date,
        currentWeek,
        subgroup
      );
  }

  return result;
}

/**
 * Resolve a complete week with normalized lessons.
 */
function resolveNormalizedWeek(
  scheduleData,
  weekStartDate,
  currentWeek,
  subgroup = 0
) {
  const start =
    toDateOnly(
      weekStartDate
    );

  if (!start) {
    return {};
  }

  const result = {};

  for (let i = 0; i < 7; i += 1) {
    const date = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + i
    );

    const key =
      dateKey(date);

    result[key] =
      resolveNormalizedLessonsForDate(
        scheduleData,
        date,
        currentWeek,
        subgroup
      );
  }

  return result;
}

/* -------------------------------------------------------------------------- */
/* Weekday compatibility                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Legacy compatibility resolver.
 *
 * Returns:
 *
 * {
 *   all: [...],
 *   "1": [...],
 *   "2": [...],
 *   ...
 * }
 */
function resolveLessonsForWeekday(
  scheduleData,
  dayName,
  subgroup = 0
) {
  const schedules =
    getScheduleSource(
      scheduleData
    );

  if (
    !schedules ||
    typeof schedules !== 'object'
  ) {
    return {};
  }

  /*
   * For date-keyed schedules we must collect
   * matching dates rather than looking for
   * "Четверг" directly.
   */
  if (
    scheduleIsDateKeyed(
      schedules
    )
  ) {
    const normalizedDay =
      normalizeDayName(
        dayName
      );

    const result = {};

    for (
      const key of Object.keys(
        schedules
      )
    ) {
      if (!isDateKey(key)) {
        continue;
      }

      const date =
        toDateOnly(key);

      if (!date) {
        continue;
      }

      if (
        weekdayNameForDate(
          date
        ) !== normalizedDay
      ) {
        continue;
      }

      const lessons =
        Array.isArray(
          schedules[key]
        )
          ? schedules[key]
          : [];

      for (const lesson of lessons) {
        if (
          !lessonMatchesSubgroup(
            lesson,
            subgroup
          )
        ) {
          continue;
        }

        const weeks =
          getLessonWeeks(
            lesson
          );

        if (
          weeks.length === 0
        ) {
          if (!result.all) {
            result.all = [];
          }

          result.all.push(
            lesson
          );

          continue;
        }

        for (const week of weeks) {
          const keyWeek =
            String(week);

          if (
            !result[keyWeek]
          ) {
            result[keyWeek] = [];
          }

          result[keyWeek].push(
            lesson
          );
        }
      }
    }

    for (
      const key of Object.keys(
        result
      )
    ) {
      result[key] =
        sortLessons(
          dedupeLessons(
            result[key]
          )
        );
    }

    return result;
  }

  /*
   * Raw weekday schedule.
   */
  const normalizedDay =
    normalizeDayName(
      dayName
    );

  const lessons =
    getLessonsForDay(
      schedules,
      normalizedDay
    );

  if (!Array.isArray(lessons)) {
    return {};
  }

  const filtered =
    lessons.filter(
      (lesson) =>
        lessonMatchesSubgroup(
          lesson,
          subgroup
        )
    );

  const grouped = {};

  for (const lesson of filtered) {
    const weeks =
      getLessonWeeks(
        lesson
      );

    if (
      weeks.length === 0
    ) {
      if (!grouped.all) {
        grouped.all = [];
      }

      grouped.all.push(
        lesson
      );

      continue;
    }

    for (const week of weeks) {
      const key =
        String(week);

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push(
        lesson
      );
    }
  }

  for (
    const key of Object.keys(
      grouped
    )
  ) {
    grouped[key] =
      sortLessons(
        dedupeLessons(
          grouped[key]
        )
      );
  }

  return grouped;
}

/* -------------------------------------------------------------------------- */
/* Normalization                                                              */
/* -------------------------------------------------------------------------- */

function getTeacherName(
  lesson
) {
  if (
    !lesson ||
    !Array.isArray(
      lesson.employees
    )
  ) {
    return '';
  }

  return lesson.employees
    .map((employee) => {
      if (!employee) {
        return '';
      }

      return [
        employee.lastName,
        employee.firstName,
        employee.middleName
      ]
        .filter(Boolean)
        .join(' ');
    })
    .filter(Boolean)
    .join(', ');
}

function getRoomName(
  lesson
) {
  if (
    !lesson ||
    !Array.isArray(
      lesson.auditories
    )
  ) {
    return '';
  }

  return lesson.auditories
    .filter(Boolean)
    .join(', ');
}

function normalizeLesson(
  lesson,
  date = null
) {
  if (!lesson) {
    return null;
  }

  const startTime =
    getLessonStartTime(
      lesson
    );

  const endTime =
    getLessonEndTime(
      lesson
    );

  const normalizedDate =
    dateKey(date);

  const subject =
    lesson.subjectFullName ||
    lesson.subject ||
    'Lesson';

  const teacher =
    getTeacherName(
      lesson
    );

  const room =
    getRoomName(
      lesson
    );

  /*
   * Preserve the original BSUIR lesson
   * while adding UI-friendly properties.
   */
  return {
    ...lesson,

    id:
      lesson.id ||
      [
        normalizedDate || '',
        subject,
        startTime,
        endTime,
        room,
        Number(
          lesson.numSubgroup
        ) || 0
      ].join('|'),

    subject,

    subjectFullName:
      lesson.subjectFullName ||
      subject,

    teacher,

    room,

    type:
      lesson.lessonTypeAbbrev ||
      lesson.type ||
      'Lecture',

    startLessonTime:
      startTime,

    endLessonTime:
      endTime,

    time:
      startTime && endTime
        ? `${startTime} - ${endTime}`
        : startTime,

    date:
      normalizedDate ||
      lesson.date ||
      lesson.dateLesson ||
      null,

    weekNumber:
      getLessonWeeks(
        lesson
      ),

    subgroup:
      Number(
        lesson.numSubgroup
      ) || 0,

    isPersonal:
      Boolean(
        lesson.isPersonal
      )
  };
}

/* -------------------------------------------------------------------------- */
/* Public exports                                                             */
/* -------------------------------------------------------------------------- */

export {
  RU_DAY_NAMES,
  DAY_ALIASES,

  normalizeDayName,
  weekdayNameForDate,

  toDateOnly,
  dateKey,

  getTermStartDate,
  getTermEndDate,
  getAcademicWeekForDate,

  getLessonWeeks,
  lessonMatchesWeek,
  lessonMatchesSubgroup,
  lessonMatchesDate,

  timeStrToMinutes,
  sortLessons,

  getScheduleSource,
  getScheduleEntries,

  getLessonsForDay,

  resolveLessonsForDate,
  resolveNormalizedLessonsForDate,

  resolveWeek,
  resolveNormalizedWeek,

  resolveLessonsForWeekday,

  normalizeLesson
};