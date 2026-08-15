// Shared BSUIR schedule resolver.
//
// BSUIR's raw schedule uses Russian weekday names:
// Понедельник, Вторник, Среда, Четверг, Пятница, Суббота.
//
// The UI may use English abbreviations such as Mon/Tue/Wed.
// This file normalizes both sides so the API and UI always agree.

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

function normalizeDayName(dayName) {
  if (!dayName) return null;

  return DAY_ALIASES[dayName] || dayName;
}

function weekdayNameForDate(date) {
  const jsDay = date.getDay();

  // JS:
  // 0 = Sunday
  // 1 = Monday
  // ...
  // 6 = Saturday

  const index = jsDay === 0 ? 6 : jsDay - 1;

  return RU_DAY_NAMES[index];
}

function timeStrToMinutes(time) {
  if (!time || typeof time !== 'string') {
    return Number.MAX_SAFE_INTEGER;
  }

  const parts = time.split(':').map(Number);

  const hours = Number.isFinite(parts[0]) ? parts[0] : 0;
  const minutes = Number.isFinite(parts[1]) ? parts[1] : 0;

  return hours * 60 + minutes;
}

function lessonMatchesWeek(lesson, currentWeek) {
  if (!lesson) return false;

  const weeks = lesson.weekNumber;

  // No week restriction = every week.
  if (
    weeks === undefined ||
    weeks === null ||
    (Array.isArray(weeks) && weeks.length === 0)
  ) {
    return true;
  }

  const normalizedCurrentWeek = Number(currentWeek);

  if (!Number.isFinite(normalizedCurrentWeek)) {
    return true;
  }

  const weekArray = Array.isArray(weeks)
    ? weeks
    : [weeks];

  return weekArray.some((week) => {
    return Number(week) === normalizedCurrentWeek;
  });
}

function lessonMatchesSubgroup(lesson, subgroup) {
  if (!lesson) return false;

  const requestedSubgroup = Number(subgroup) || 0;
  const lessonSubgroup = Number(lesson.numSubgroup) || 0;

  // numSubgroup 0 means the lesson is shared by all subgroups.
  if (lessonSubgroup === 0) {
    return true;
  }

  // If caller doesn't know a subgroup, don't hide subgroup-specific data.
  if (requestedSubgroup === 0) {
    return true;
  }

  return lessonSubgroup === requestedSubgroup;
}

function sortLessons(lessons) {
  return [...lessons].sort((a, b) => {
    return (
      timeStrToMinutes(a.startLessonTime) -
      timeStrToMinutes(b.startLessonTime)
    );
  });
}

/**
 * Resolve lessons for an actual calendar date.
 */
function resolveLessonsForDate(
  schedules,
  date,
  currentWeek,
  subgroup = 0
) {
  if (!schedules || typeof schedules !== 'object') {
    return [];
  }

  const dayName = weekdayNameForDate(date);
  const normalizedDayName = normalizeDayName(dayName);

  const dayLessons =
    schedules[normalizedDayName] ||
    schedules[dayName] ||
    [];

  if (!Array.isArray(dayLessons)) {
    return [];
  }

  const filtered = dayLessons.filter((lesson) => {
    return (
      lessonMatchesWeek(lesson, currentWeek) &&
      lessonMatchesSubgroup(lesson, subgroup)
    );
  });

  return sortLessons(filtered);
}

/**
 * Resolve all recurring lessons for a selected weekday.
 *
 * Returns:
 * {
 *   "1": [...],
 *   "2": [...],
 *   "3": [...],
 *   "4": [...]
 * }
 */
function resolveLessonsForWeekday(
  schedules,
  dayName,
  subgroup = 0
) {
  if (!schedules || typeof schedules !== 'object') {
    return {};
  }

  const normalizedDayName = normalizeDayName(dayName);

  const dayLessons =
    schedules[normalizedDayName] ||
    schedules[dayName] ||
    [];

  if (!Array.isArray(dayLessons)) {
    return {};
  }

  const filtered = dayLessons.filter((lesson) => {
    return lessonMatchesSubgroup(lesson, subgroup);
  });

  const grouped = {};

  for (const lesson of filtered) {
    const weeks =
      Array.isArray(lesson.weekNumber) &&
      lesson.weekNumber.length > 0
        ? lesson.weekNumber
        : ['all'];

    for (const week of weeks) {
      const key = String(week);

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push(lesson);
    }
  }

  for (const key of Object.keys(grouped)) {
    grouped[key] = sortLessons(grouped[key]);
  }

  return grouped;
}

/**
 * Convert raw BSUIR lesson into the shape used by the UI.
 */
function normalizeLesson(lesson) {
  if (!lesson) {
    return {
      id: `unknown-${Date.now()}`,
      subject: 'Lesson',
      subjectShort: '',
      type: 'Lecture',
      room: 'N/A',
      teacher: 'Faculty',
      time: '--:-- - --:--',
      startLessonTime: null,
      endLessonTime: null,
      weekNumber: [],
      numSubgroup: 0,
      note: null
    };
  }

  const employees = Array.isArray(lesson.employees)
    ? lesson.employees
    : [];

  const teacherNames = employees
    .map((employee) => {
      if (!employee) return '';

      const lastName = employee.lastName || '';
      const firstName = employee.firstName || '';
      const middleName = employee.middleName || '';

      const firstInitial = firstName
        ? `${firstName.charAt(0)}.`
        : '';

      const middleInitial = middleName
        ? ` ${middleName.charAt(0)}.`
        : '';

      return `${lastName} ${firstInitial}${middleInitial}`.trim();
    })
    .filter(Boolean);

  const auditories = Array.isArray(lesson.auditories)
    ? lesson.auditories
    : [];

  const room =
    auditories.length > 0
      ? auditories
          .map((auditory) => {
            if (typeof auditory === 'string') {
              return auditory;
            }

            if (auditory && typeof auditory === 'object') {
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

  const startTime = lesson.startLessonTime || '--:--';
  const endTime = lesson.endLessonTime || '--:--';

  const weekNumber =
    Array.isArray(lesson.weekNumber)
      ? lesson.weekNumber
      : lesson.weekNumber !== undefined &&
          lesson.weekNumber !== null
        ? [lesson.weekNumber]
        : [];

  return {
    id:
      lesson.id ||
      [
        lesson.subject || 'lesson',
        startTime,
        endTime,
        weekNumber.join('-'),
        lesson.numSubgroup || 0
      ].join('-'),

    subject:
      lesson.subjectFullName ||
      lesson.subject ||
      'Lesson',

    subjectShort:
      lesson.subject || '',

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

    startLessonTime: lesson.startLessonTime || null,
    endLessonTime: lesson.endLessonTime || null,

    weekNumber,

    numSubgroup:
      Number(lesson.numSubgroup) || 0,

    note:
      lesson.note ||
      null,

    // Keep the original object available if a detail screen
    // eventually needs fields not exposed above.
    rawLesson: lesson
  };
}

export {
  RU_DAY_NAMES,
  normalizeDayName,
  weekdayNameForDate,
  resolveLessonsForDate,
  resolveLessonsForWeekday,
  normalizeLesson
};