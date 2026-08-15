// Shared resolver for turning a raw BSUIR "schedules" object into
// lessons that actually apply to a given day, week, and subgroup.
//
// Used by:
//   - api/bsuir/schedule.js
//   - src/views/ScheduleView.jsx
//
// Keeping this logic in one place ensures that the frontend and
// backend agree about which lessons belong to a particular day.

/**
 * BSUIR weekday names.
 *
 * JavaScript Date uses:
 *   0 = Sunday
 *   1 = Monday
 *   ...
 *   6 = Saturday
 */
const RU_DAY_NAMES = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье'
];

/**
 * Convert a JavaScript Date into the corresponding
 * Russian BSUIR weekday name.
 */
function weekdayNameForDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }

  const jsDay = date.getDay();

  // Convert:
  // Sunday 0 -> index 6
  // Monday 1 -> index 0
  // ...
  // Saturday 6 -> index 5
  const index = jsDay === 0 ? 6 : jsDay - 1;

  return RU_DAY_NAMES[index];
}

/**
 * Convert "HH:MM" into minutes since midnight.
 *
 * Examples:
 *   "08:30" -> 510
 *   "13:25" -> 805
 *   "18:30" -> 1110
 */
function timeStrToMinutes(value) {
  if (!value || typeof value !== 'string') {
    return 0;
  }

  const parts = value.split(':');

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {
    return 0;
  }

  return hours * 60 + minutes;
}

/**
 * Determine whether a lesson applies to a particular academic week.
 *
 * BSUIR lesson data normally contains weekNumber as an array,
 * for example:
 *
 *   [1]
 *   [2]
 *   [1, 3]
 *
 * Some lessons may have no weekNumber information. In that case
 * we treat them as applicable to every week.
 */
function lessonMatchesWeek(lesson, currentWeek) {
  const weeks = lesson?.weekNumber;

  // No week restriction.
  if (
    weeks === undefined ||
    weeks === null ||
    weeks === ''
  ) {
    return true;
  }

  // Empty array = no week restriction.
  if (Array.isArray(weeks) && weeks.length === 0) {
    return true;
  }

  // Occasionally API data may contain a single number.
  if (typeof weeks === 'number') {
    return weeks === currentWeek;
  }

  // Occasionally API data may contain a string.
  if (typeof weeks === 'string') {
    const parsed = Number(weeks);

    if (Number.isFinite(parsed)) {
      return parsed === currentWeek;
    }

    return true;
  }

  if (Array.isArray(weeks)) {
    return weeks.some((week) => {
      const parsed = Number(week);

      return (
        Number.isFinite(parsed) &&
        parsed === Number(currentWeek)
      );
    });
  }

  return true;
}

/**
 * Determine whether a lesson applies to a subgroup.
 *
 * subgroup = 0 means:
 *   do not restrict by subgroup.
 *
 * numSubgroup = 0 / missing means:
 *   lesson applies to everyone.
 */
function lessonMatchesSubgroup(lesson, subgroup) {
  const lessonSubgroup = Number(
    lesson?.numSubgroup || 0
  );

  const selectedSubgroup = Number(
    subgroup || 0
  );

  // Lesson is not subgroup-specific.
  if (
    !Number.isFinite(lessonSubgroup) ||
    lessonSubgroup === 0
  ) {
    return true;
  }

  // Caller did not specify a subgroup.
  if (
    !Number.isFinite(selectedSubgroup) ||
    selectedSubgroup === 0
  ) {
    return true;
  }

  return lessonSubgroup === selectedSubgroup;
}

/**
 * Resolve lessons for an exact calendar date.
 *
 * This is the main function used by the API.
 *
 * Example:
 *
 * resolveLessonsForDate(
 *   schedules,
 *   new Date(),
 *   currentWeek,
 *   1
 * )
 */
function resolveLessonsForDate(
  schedules,
  date,
  currentWeek = 1,
  subgroup = 0
) {
  if (!schedules || typeof schedules !== 'object') {
    return [];
  }

  const dayName = weekdayNameForDate(date);

  if (!dayName) {
    return [];
  }

  const dayLessons = Array.isArray(schedules[dayName])
    ? schedules[dayName]
    : [];

  const filtered = dayLessons.filter((lesson) => {
    if (!lesson || typeof lesson !== 'object') {
      return false;
    }

    const weekMatches =
      lessonMatchesWeek(
        lesson,
        currentWeek
      );

    const subgroupMatches =
      lessonMatchesSubgroup(
        lesson,
        subgroup
      );

    return (
      weekMatches &&
      subgroupMatches
    );
  });

  return filtered.sort((a, b) => {
    return (
      timeStrToMinutes(a.startLessonTime) -
      timeStrToMinutes(b.startLessonTime)
    );
  });
}

/**
 * Resolve lessons for a weekday.
 *
 * Unlike resolveLessonsForDate(), this function does not select
 * one particular academic week.
 *
 * It groups lessons by week so the frontend can display the
 * recurring timetable correctly.
 *
 * Result example:
 *
 * {
 *   1: [lesson, lesson],
 *   2: [lesson],
 *   3: [lesson]
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

  const dayLessons = Array.isArray(schedules[dayName])
    ? schedules[dayName]
    : [];

  const filtered = dayLessons.filter((lesson) => {
    if (!lesson || typeof lesson !== 'object') {
      return false;
    }

    return lessonMatchesSubgroup(
      lesson,
      subgroup
    );
  });

  const grouped = {};

  for (const lesson of filtered) {
    let weeks = lesson.weekNumber;

    /*
     * A lesson without week information is treated as
     * applicable to every week.
     *
     * We use the key "all" for those lessons rather than
     * pretending they belong to week 1.
     */
    if (
      weeks === undefined ||
      weeks === null ||
      weeks === ''
    ) {
      weeks = ['all'];
    } else if (
      Array.isArray(weeks) &&
      weeks.length === 0
    ) {
      weeks = ['all'];
    } else if (!Array.isArray(weeks)) {
      weeks = [weeks];
    }

    for (const week of weeks) {
      const key = String(week);

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push(lesson);
    }
  }

  /*
   * Sort every week chronologically.
   */
  for (const weekKey of Object.keys(grouped)) {
    grouped[weekKey].sort((a, b) => {
      return (
        timeStrToMinutes(
          a.startLessonTime
        ) -
        timeStrToMinutes(
          b.startLessonTime
        )
      );
    });
  }

  return grouped;
}

/**
 * Create the normalized lesson format used by ScheduleView.
 *
 * Raw BSUIR lesson objects are fairly verbose.
 * The UI only needs a consistent smaller object.
 */
function normalizeLesson(lesson) {
  if (!lesson || typeof lesson !== 'object') {
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

  /*
   * Teachers / employees
   */
  const employees = Array.isArray(
    lesson.employees
  )
    ? lesson.employees
    : [];

  const teacherNames = [];

  for (const employee of employees) {
    if (!employee || typeof employee !== 'object') {
      continue;
    }

    const lastName =
      employee.lastName ||
      '';

    const firstName =
      employee.firstName ||
      '';

    const firstInitial =
      firstName.charAt(0);

    let teacherName = '';

    if (lastName && firstInitial) {
      teacherName =
        `${lastName} ${firstInitial}.`;
    } else if (lastName) {
      teacherName = lastName;
    } else if (firstName) {
      teacherName = firstName;
    }

    if (teacherName) {
      teacherNames.push(
        teacherName
      );
    }
  }

  /*
   * Remove duplicate teacher names.
   */
  const uniqueTeacherNames = [
    ...new Set(teacherNames)
  ];

  /*
   * Auditories / rooms
   */
  const auditories = Array.isArray(
    lesson.auditories
  )
    ? lesson.auditories
    : [];

  const room =
    auditories.length > 0
      ? auditories
          .map((auditory) => {
            if (
              typeof auditory === 'string'
            ) {
              return auditory;
            }

            if (
              auditory &&
              typeof auditory === 'object'
            ) {
              return (
                auditory.auditory ||
                auditory.name ||
                auditory.number ||
                ''
              );
            }

            return '';
          })
          .filter(Boolean)
          .join(', ')
      : 'N/A';

  /*
   * Week information.
   */
  let weekNumber = lesson.weekNumber;

  if (!Array.isArray(weekNumber)) {
    if (
      weekNumber === undefined ||
      weekNumber === null ||
      weekNumber === ''
    ) {
      weekNumber = [];
    } else {
      weekNumber = [weekNumber];
    }
  }

  /*
   * Stable-ish ID.
   *
   * Prefer an API-provided ID if available.
   */
  const generatedId = [
    lesson.subject || 'lesson',
    lesson.startLessonTime || '',
    lesson.endLessonTime || '',
    weekNumber.join('-'),
    lesson.numSubgroup || 0
  ]
    .join('-')
    .replace(/\s+/g, '-');

  return {
    id:
      lesson.id ||
      lesson.lessonId ||
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
      uniqueTeacherNames.length > 0
        ? uniqueTeacherNames.join(', ')
        : 'Faculty',

    time:
      `${lesson.startLessonTime || '--:--'} - ${
        lesson.endLessonTime || '--:--'
      }`,

    startLessonTime:
      lesson.startLessonTime ||
      null,

    endLessonTime:
      lesson.endLessonTime ||
      null,

    weekNumber,

    numSubgroup:
      Number(lesson.numSubgroup || 0),

    note:
      lesson.note ||
      null
  };
}

export {
  RU_DAY_NAMES,
  weekdayNameForDate,
  timeStrToMinutes,
  lessonMatchesWeek,
  lessonMatchesSubgroup,
  resolveLessonsForDate,
  resolveLessonsForWeekday,
  normalizeLesson
};