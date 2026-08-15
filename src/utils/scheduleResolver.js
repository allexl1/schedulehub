// src/utils/scheduleResolver.js
//
// Shared BSUIR schedule resolver.
//
// IMPORTANT:
// BSUIR timetable data is not simply a recurring Mon/Tue/Wed schedule.
// A lesson can be constrained by:
//   - weekday
//   - academic week number
//   - startLessonDate / endLessonDate
//   - subgroup
//
// The API can also return:
//   schedules: null
//   nextSchedules: { ... }
//
// Therefore the resolver works with BOTH schedules and nextSchedules
// and resolves the timetable for an ACTUAL CALENDAR DATE.
//
// Main flow:
//
//   raw API data
//        ↓
//   getScheduleSource()
//        ↓
//   resolveLessonsForDate()
//        ↓
//   weekday + date range + week + subgroup
//        ↓
//   normalized + sorted lessons
//
// This is intentionally date-first. The UI should ask:
// "What classes exist on 2026-09-10?"
// rather than:
// "What classes normally happen on Thursday?"

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
/* Basic normalization                                                        */
/* -------------------------------------------------------------------------- */

function normalizeDayName(dayName) {
  if (!dayName) {
    return null;
  }

  return DAY_ALIASES[dayName] || dayName;
}

function weekdayNameForDate(date) {
  const normalizedDate = toDateOnly(date);

  if (!normalizedDate) {
    return null;
  }

  const jsDay = normalizedDate.getDay();

  // JS:
  // 0 = Sunday
  // 1 = Monday
  // ...
  // 6 = Saturday

  const index = jsDay === 0 ? 6 : jsDay - 1;

  return RU_DAY_NAMES[index];
}

/* -------------------------------------------------------------------------- */
/* Date helpers                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Convert a value into a local calendar date with time removed.
 *
 * IMPORTANT:
 * We intentionally avoid new Date('YYYY-MM-DD') because JavaScript treats
 * that format as UTC, which can shift the date in some timezones.
 */
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

      return Number.isNaN(result.getTime())
        ? null
        : result;
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

      return Number.isNaN(result.getTime())
        ? null
        : result;
    }

    // ISO datetime or another parseable value.
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

function startOfDay(date) {
  return toDateOnly(date);
}

function endOfDay(date) {
  const normalized = toDateOnly(date);

  if (!normalized) {
    return null;
  }

  return new Date(
    normalized.getFullYear(),
    normalized.getMonth(),
    normalized.getDate(),
    23,
    59,
    59,
    999
  );
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

function compareDates(a, b) {
  const dateA = toDateOnly(a);
  const dateB = toDateOnly(b);

  if (!dateA || !dateB) {
    return null;
  }

  return dateA.getTime() - dateB.getTime();
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
/* Week helpers                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Normalize weekNumber into an array.
 */
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

  const weeks = Array.isArray(value)
    ? value
    : [value];

  return weeks
    .map((week) => Number(week))
    .filter((week) => Number.isFinite(week));
}

function lessonMatchesWeek(
  lesson,
  currentWeek
) {
  if (!lesson) {
    return false;
  }

  const weeks = getLessonWeeks(lesson);

  // No week restriction means every week.
  if (weeks.length === 0) {
    return true;
  }

  const normalizedCurrentWeek =
    Number(currentWeek);

  if (
    !Number.isFinite(normalizedCurrentWeek)
  ) {
    return true;
  }

  return weeks.includes(
    normalizedCurrentWeek
  );
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

  const requestedSubgroup =
    Number(subgroup) || 0;

  const lessonSubgroup =
    Number(lesson.numSubgroup) || 0;

  // BSUIR uses 0 for a lesson shared by everyone.
  if (lessonSubgroup === 0) {
    return true;
  }

  // Unknown subgroup: don't accidentally hide lessons.
  if (requestedSubgroup === 0) {
    return true;
  }

  return (
    lessonSubgroup === requestedSubgroup
  );
}

/* -------------------------------------------------------------------------- */
/* Date-range helpers                                                         */
/* -------------------------------------------------------------------------- */

function lessonMatchesDate(
  lesson,
  date
) {
  if (!lesson || !date) {
    return false;
  }

  const targetDate = toDateOnly(date);

  if (!targetDate) {
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

  //
  // If BSUIR supplied explicit dates, use them.
  //
  if (startDate || endDate) {
    return dateIsBetween(
      targetDate,
      startDate,
      endDate
    );
  }

  //
  // No explicit range means the lesson is considered
  // recurring and weekNumber determines applicability.
  //
  return true;
}

/* -------------------------------------------------------------------------- */
/* Time helpers                                                               */
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

  return hours * 60 + minutes;
}

function sortLessons(lessons) {
  return [...lessons].sort((a, b) => {
    const timeDifference =
      timeStrToMinutes(
        a.startLessonTime
      ) -
      timeStrToMinutes(
        b.startLessonTime
      );

    if (timeDifference !== 0) {
      return timeDifference;
    }

    //
    // Stable secondary sorting.
    //
    const subjectA =
      String(
        a.subjectFullName ||
          a.subject ||
          ''
      ).toLowerCase();

    const subjectB =
      String(
        b.subjectFullName ||
          b.subject ||
          ''
      ).toLowerCase();

    return subjectA.localeCompare(
      subjectB
    );
  });
}

/* -------------------------------------------------------------------------- */
/* Schedule source helpers                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Return the actual timetable object from the API response.
 *
 * Current BSUIR responses can look like:
 *
 * {
 *   schedules: null,
 *   nextSchedules: {
 *     Понедельник: [...]
 *   }
 * }
 *
 * Older/current responses can also have schedules directly.
 */
function getScheduleSource(scheduleData) {
  if (!scheduleData) {
    return {};
  }

  //
  // scheduleData itself may already be the schedules object.
  //
  if (
    !scheduleData.schedules &&
    !scheduleData.nextSchedules &&
    !scheduleData.data &&
    typeof scheduleData === 'object'
  ) {
    const possibleDayKeys =
      Object.keys(scheduleData);

    const containsDay =
      possibleDayKeys.some(
        (key) =>
          normalizeDayName(key) !== key ||
          RU_DAY_NAMES.includes(key)
      );

    if (containsDay) {
      return scheduleData;
    }
  }

  //
  // Prefer schedules when it contains actual data.
  //
  if (
    scheduleData.schedules &&
    typeof scheduleData.schedules ===
      'object' &&
    Object.keys(scheduleData.schedules)
      .length > 0
  ) {
    return scheduleData.schedules;
  }

  //
  // BSUIR may expose the upcoming/current timetable
  // through nextSchedules while schedules is null.
  //
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

  //
  // Some callers may pass { data: { schedules... } }.
  //
  if (
    scheduleData.data &&
    typeof scheduleData.data === 'object'
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
      typeof scheduleData.data
        .nextSchedules === 'object'
    ) {
      return scheduleData.data.nextSchedules;
    }
  }

  return {};
}

/**
 * Convenience function when callers have the entire API response.
 */
function getScheduleEntries(scheduleData) {
  const source =
    getScheduleSource(scheduleData);

  return source;
}

/* -------------------------------------------------------------------------- */
/* Raw lesson collection                                                      */
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
      Array.isArray(schedules[key])
    ) {
      return schedules[key];
    }
  }

  //
  // Be defensive about accidental casing/spacing.
  //
  const matchingKey =
    Object.keys(schedules).find(
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
    return schedules[matchingKey];
  }

  return [];
}

/* -------------------------------------------------------------------------- */
/* Calendar-date resolution                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Resolve all lessons that ACTUALLY occur on a specific calendar date.
 *
 * This is the primary resolver for the new schedule UI.
 *
 * Example:
 *
 * resolveLessonsForDate(
 *   scheduleData,
 *   new Date(2026, 8, 10),
 *   2,
 *   1
 * )
 *
 * will resolve Thursday, September 10, 2026,
 * then apply:
 *
 *   1. date range
 *   2. week number
 *   3. subgroup
 *   4. time sorting
 */
function resolveLessonsForDate(
  scheduleData,
  date,
  currentWeek,
  subgroup = 0
) {
  if (!date) {
    return [];
  }

  const targetDate = toDateOnly(date);

  if (!targetDate) {
    return [];
  }

  const schedules =
    getScheduleSource(scheduleData);

  if (
    !schedules ||
    typeof schedules !== 'object'
  ) {
    return [];
  }

  const dayName =
    weekdayNameForDate(targetDate);

  if (!dayName) {
    return [];
  }

  const dayLessons =
    getLessonsForDay(
      schedules,
      dayName
    );

  if (!Array.isArray(dayLessons)) {
    return [];
  }

  const filtered =
    dayLessons.filter((lesson) => {
      if (!lesson) {
        return false;
      }

      if (
        !lessonMatchesDate(
          lesson,
          targetDate
        )
      ) {
        return false;
      }

      if (
        !lessonMatchesWeek(
          lesson,
          currentWeek
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
    });

  //
  // Remove accidental duplicate entries.
  //
  const unique = [];
  const seen = new Set();

  for (const lesson of filtered) {
    const weeks =
      getLessonWeeks(lesson)
        .join(',');

    const key = [
      lesson.subject ||
        lesson.subjectFullName ||
        '',
      lesson.startLessonTime ||
        '',
      lesson.endLessonTime ||
        '',
      lesson.startLessonDate ||
        '',
      lesson.endLessonDate ||
        '',
      weeks,
      Number(lesson.numSubgroup) || 0,
      Array.isArray(lesson.auditories)
        ? lesson.auditories.join(',')
        : ''
    ].join('|');

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(lesson);
  }

  return sortLessons(unique);
}

/**
 * Resolve a specific calendar date and normalize every lesson.
 *
 * This is convenient for ScheduleView.
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
/* Recurring weekday compatibility                                            */
/* -------------------------------------------------------------------------- */

/**
 * Resolve all recurring lessons for a weekday.
 *
 * Kept for compatibility with existing callers.
 *
 * NOTE:
 * This should NOT be used as the primary calendar UI resolver.
 */
function resolveLessonsForWeekday(
  scheduleData,
  dayName,
  subgroup = 0
) {
  const schedules =
    getScheduleSource(scheduleData);

  if (
    !schedules ||
    typeof schedules !== 'object'
  ) {
    return {};
  }

  const normalizedDay =
    normalizeDayName(dayName);

  const dayLessons =
    getLessonsForDay(
      schedules,
      normalizedDay
    );

  if (!Array.isArray(dayLessons)) {
    return {};
  }

  const filtered =
    dayLessons.filter((lesson) =>
      lessonMatchesSubgroup(
        lesson,
        subgroup
      )
    );

  const grouped = {};

  for (const lesson of filtered) {
    const weeks =
      getLessonWeeks(lesson);

    //
    // No week restriction.
    //
    if (weeks.length === 0) {
      if (!grouped.all) {
        grouped.all = [];
      }

      grouped.all.push(lesson);
      continue;
    }

    for (const week of weeks) {
      const key = String(week);

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push(lesson);
    }
  }

  for (const key of Object.keys(grouped)) {
    grouped[key] =
      sortLessons(grouped[key]);
  }

  return grouped;
}

/* -------------------------------------------------------------------------- */
/* Academic week calculation                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Calculate the academic week relative to a term start date.
 *
 * BSUIR provides currentPeriod/currentWeek in some API responses,
 * but when resolving arbitrary calendar dates we need a deterministic
 * calculation.
 *
 * Example:
 *
 * startDate = 01.09.2026
 *
 * 01.09.2026 -> week 1
 * 07.09.2026 -> week 2
 * 14.09.2026 -> week 3
 */
function getAcademicWeekForDate(
  date,
  termStartDate
) {
  const target =
    toDateOnly(date);

  const start =
    toDateOnly(termStartDate);

  if (!target || !start) {
    return null;
  }

  const millisecondsPerDay =
    24 * 60 * 60 * 1000;

  const diff =
    Math.floor(
      (
        target.getTime() -
        start.getTime()
      ) / millisecondsPerDay
    );

  if (diff < 0) {
    return null;
  }

  return (
    Math.floor(diff / 7) + 1
  );
}

/**
 * More robust academic week calculation.
 *
 * The first academic week starts on the Monday of the week containing
 * the term start date.
 *
 * This avoids weird results if a term happens to start mid-week.
 */
function getAcademicWeekForDateMondayBased(
  date,
  termStartDate
) {
  const target =
    toDateOnly(date);

  const start =
    toDateOnly(termStartDate);

  if (!target || !start) {
    return null;
  }

  const getMonday =
    (value) => {
      const result =
        toDateOnly(value);

      const day =
        result.getDay();

      const offset =
        day === 0
          ? -6
          : 1 - day;

      result.setDate(
        result.getDate() +
          offset
      );

      return result;
    };

  const targetMonday =
    getMonday(target);

  const startMonday =
    getMonday(start);

  const millisecondsPerDay =
    24 * 60 * 60 * 1000;

  const diffDays =
    Math.floor(
      (
        targetMonday.getTime() -
        startMonday.getTime()
      ) / millisecondsPerDay
    );

  return (
    Math.floor(
      diffDays / 7
    ) + 1
  );
}

/* -------------------------------------------------------------------------- */
/* Date range generation                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Generate a complete calendar range.
 *
 * Useful for the new schedule view when rendering:
 *
 *   Mon 07.09
 *   Tue 08.09
 *   Wed 09.09
 *   ...
 *
 * rather than a purely recurring weekday selector.
 */
function getDateRange(
  startDate,
  endDate
) {
  const start =
    toDateOnly(startDate);

  const end =
    toDateOnly(endDate);

  if (!start || !end) {
    return [];
  }

  if (start > end) {
    return [];
  }

  const dates = [];

  const cursor =
    new Date(
      start.getTime()
    );

  while (cursor <= end) {
    dates.push(
      new Date(
        cursor.getTime()
      )
    );

    cursor.setDate(
      cursor.getDate() + 1
    );
  }

  return dates;
}

/**
 * Generate the academic calendar dates using the API term dates.
 */
function getAcademicDateRange(
  scheduleData
) {
  if (!scheduleData) {
    return [];
  }

  const startDate =
    scheduleData.startDate ||
    scheduleData.data?.startDate ||
    null;

  const endDate =
    scheduleData.endDate ||
    scheduleData.data?.endDate ||
    null;

  return getDateRange(
    startDate,
    endDate
  );
}

/* -------------------------------------------------------------------------- */
/* Daily schedule metadata                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Return useful information about a calendar date.
 *
 * Example:
 *
 * {
 *   date: Date,
 *   dateKey: '2026-09-10',
 *   dayName: 'Четверг',
 *   lessons: [...],
 *   count: 3
 * }
 */
function resolveDay(
  scheduleData,
  date,
  currentWeek,
  subgroup = 0
) {
  const normalizedDate =
    toDateOnly(date);

  if (!normalizedDate) {
    return {
      date: null,
      dateKey: null,
      dayName: null,
      lessons: [],
      count: 0
    };
  }

  const lessons =
    resolveLessonsForDate(
      scheduleData,
      normalizedDate,
      currentWeek,
      subgroup
    );

  return {
    date: normalizedDate,

    dateKey:
      dateKey(normalizedDate),

    dayName:
      weekdayNameForDate(
        normalizedDate
      ),

    lessons,

    normalizedLessons:
      lessons.map((lesson) =>
        normalizeLesson(
          lesson,
          normalizedDate
        )
      ),

    count:
      lessons.length
  };
}

/**
 * Resolve every date in an academic term.
 *
 * This is useful if the UI needs to build a calendar/week/month view.
 */
function resolveAcademicCalendar(
  scheduleData,
  subgroup = 0
) {
  const dates =
    getAcademicDateRange(
      scheduleData
    );

  if (dates.length === 0) {
    return [];
  }

  const termStart =
    scheduleData?.startDate ||
    scheduleData?.data?.startDate ||
    null;

  return dates.map((date) => {
    const academicWeek =
      getAcademicWeekForDateMondayBased(
        date,
        termStart
      );

    return {
      ...resolveDay(
        scheduleData,
        date,
        academicWeek,
        subgroup
      ),

      academicWeek
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Lesson normalization                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Normalize a raw BSUIR lesson into the shape expected by the UI.
 *
 * `date` is optional but important for the new date-based view.
 */
function normalizeLesson(
  lesson,
  date = null
) {
  if (!lesson) {
    return {
      id: `unknown-${Date.now()}`,

      subject: 'Lesson',

      subjectShort: '',

      type: 'Lecture',

      room: 'N/A',

      teacher: 'Faculty',

      time:
        '--:-- - --:--',

      startLessonTime: null,

      endLessonTime: null,

      weekNumber: [],

      numSubgroup: 0,

      note: null,

      date:
        date
          ? dateKey(date)
          : null,

      rawLesson: null
    };
  }

  const employees =
    Array.isArray(
      lesson.employees
    )
      ? lesson.employees
      : [];

  const teacherNames =
    employees
      .map((employee) => {
        if (!employee) {
          return '';
        }

        const lastName =
          employee.lastName || '';

        const firstName =
          employee.firstName || '';

        const middleName =
          employee.middleName || '';

        const firstInitial =
          firstName
            ? `${firstName.charAt(0)}.`
            : '';

        const middleInitial =
          middleName
            ? ` ${middleName.charAt(0)}.`
            : '';

        return (
          `${lastName} ${firstInitial}${middleInitial}`
        ).trim();
      })
      .filter(Boolean);

  const auditories =
    Array.isArray(
      lesson.auditories
    )
      ? lesson.auditories
      : [];

  const room =
    auditories.length > 0
      ? auditories
          .map((auditory) => {
            if (
              typeof auditory ===
              'string'
            ) {
              return auditory;
            }

            if (
              auditory &&
              typeof auditory ===
                'object'
            ) {
              return (
                auditory.auditoryName ||
                auditory.name ||
                auditory.number ||
                auditory.room ||
                ''
              );
            }

            return '';
          })
          .filter(Boolean)
          .join(', ')
      : 'N/A';

  const startTime =
    lesson.startLessonTime ||
    '--:--';

  const endTime =
    lesson.endLessonTime ||
    '--:--';

  const weekNumber =
    getLessonWeeks(lesson);

  const lessonDate =
    date
      ? dateKey(date)
      : null;

  //
  // Prefer an API id if one exists.
  // Otherwise build a deterministic id.
  //
  const generatedId = [
    lesson.subject ||
      lesson.subjectFullName ||
      'lesson',

    lesson.startLessonTime ||
      '',

    lesson.endLessonTime ||
      '',

    lesson.startLessonDate ||
      '',

    lesson.endLessonDate ||
      '',

    weekNumber.join('-'),

    Number(
      lesson.numSubgroup
    ) || 0,

    lessonDate || ''
  ].join('-');

  return {
    id:
      lesson.id ||
      generatedId,

    subject:
      lesson.subjectFullName ||
      lesson.subject ||
      'Lesson',

    subjectShort:
      lesson.subject ||
      '',

    type:
      lesson.lessonTypeAbbrev ||
      lesson.lessonType ||
      'Lecture',

    room,

    teacher:
      teacherNames.length > 0
        ? teacherNames.join(', ')
        : 'Faculty',

    time:
      `${startTime} - ${endTime}`,

    startLessonTime:
      lesson.startLessonTime ||
      null,

    endLessonTime:
      lesson.endLessonTime ||
      null,

    weekNumber,

    numSubgroup:
      Number(
        lesson.numSubgroup
      ) || 0,

    note:
      lesson.note ||
      null,

    //
    // New date-aware fields.
    //
    date: lessonDate,

    startLessonDate:
      lesson.startLessonDate ||
      null,

    endLessonDate:
      lesson.endLessonDate ||
      null,

    //
    // Useful metadata for the UI.
    //
    announcement:
      Boolean(
        lesson.announcement
      ),

    split:
      Boolean(
        lesson.split
      ),

    rawLesson:
      lesson
  };
}

/* -------------------------------------------------------------------------- */
/* Convenience API                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Resolve + normalize a calendar date in one call.
 *
 * This is the function ScheduleView should eventually use.
 */
function getLessonsForDate(
  scheduleData,
  date,
  subgroup = 0
) {
  const normalizedDate =
    toDateOnly(date);

  if (!normalizedDate) {
    return [];
  }

  //
  // Prefer API-provided currentPeriod/currentWeek.
  //
  let currentWeek =
    Number(
      scheduleData?.currentWeek
    );

  //
  // If the API didn't provide one, calculate it
  // from the academic term start date.
  //
  if (!Number.isFinite(currentWeek)) {
    currentWeek =
      getAcademicWeekForDateMondayBased(
        normalizedDate,
        scheduleData?.startDate ||
          scheduleData?.data?.startDate
      );
  }

  //
  // If there is still no week, don't filter by week.
  //
  const lessons =
    resolveLessonsForDate(
      scheduleData,
      normalizedDate,
      currentWeek,
      subgroup
    );

  return lessons.map(
    (lesson) =>
      normalizeLesson(
        lesson,
        normalizedDate
      )
  );
}

/**
 * Resolve a whole week starting from a given date.
 *
 * The result is:
 *
 * [
 *   {
 *     date,
 *     dateKey,
 *     dayName,
 *     lessons
 *   },
 *   ...
 * ]
 */
function resolveWeek(
  scheduleData,
  weekStartDate,
  subgroup = 0
) {
  const start =
    toDateOnly(
      weekStartDate
    );

  if (!start) {
    return [];
  }

  //
  // Normalize to Monday.
  //
  const day =
    start.getDay();

  const mondayOffset =
    day === 0
      ? -6
      : 1 - day;

  start.setDate(
    start.getDate() +
      mondayOffset
  );

  const dates =
    getDateRange(
      start,
      new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + 6
      )
    );

  return dates.map(
    (date) => {
      const academicWeek =
        getAcademicWeekForDateMondayBased(
          date,
          scheduleData?.startDate ||
            scheduleData?.data?.startDate
        );

      const lessons =
        resolveLessonsForDate(
          scheduleData,
          date,
          academicWeek,
          subgroup
        );

      return {
        date,

        dateKey:
          dateKey(date),

        dayName:
          weekdayNameForDate(
            date
          ),

        academicWeek,

        lessons,

        normalizedLessons:
          lessons.map(
            (lesson) =>
              normalizeLesson(
                lesson,
                date
              )
          ),

        count:
          lessons.length
      };
    }
  );
}

/* -------------------------------------------------------------------------- */
/* Exports                                                                    */
/* -------------------------------------------------------------------------- */

export {
  RU_DAY_NAMES,

  normalizeDayName,

  weekdayNameForDate,

  toDateOnly,

  dateKey,

  compareDates,

  dateIsBetween,

  timeStrToMinutes,

  lessonMatchesWeek,

  lessonMatchesSubgroup,

  lessonMatchesDate,

  getLessonWeeks,

  getScheduleSource,

  getScheduleEntries,

  getLessonsForDay,

  getAcademicWeekForDate,

  getAcademicWeekForDateMondayBased,

  getDateRange,

  getAcademicDateRange,

  resolveLessonsForDate,

  resolveNormalizedLessonsForDate,

  resolveLessonsForWeekday,

  resolveDay,

  resolveAcademicCalendar,

  resolveWeek,

  getLessonsForDate,

  normalizeLesson
};