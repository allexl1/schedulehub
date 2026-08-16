const RUSSIAN_DAYS = [
  'Воскресенье',
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота'
];

const ENGLISH_TO_RUSSIAN = {
  Sun: 'Воскресенье',
  Mon: 'Понедельник',
  Tue: 'Вторник',
  Wed: 'Среда',
  Thu: 'Четверг',
  Fri: 'Пятница',
  Sat: 'Суббота',
  Sunday: 'Воскресенье',
  Monday: 'Понедельник',
  Tuesday: 'Вторник',
  Wednesday: 'Среда',
  Thursday: 'Четверг',
  Friday: 'Пятница',
  Saturday: 'Суббота'
};

function toDate(value) {
  if (value instanceof Date) {
    const copy = new Date(value);
    return Number.isNaN(copy.getTime()) ? null : copy;
  }

  if (!value) return null;

  const text = String(value).trim();

  const ru = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);

  if (ru) {
    const date = new Date(
      Number(ru[3]),
      Number(ru[2]) - 1,
      Number(ru[1])
    );

    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(text);

  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(value) {
  const date = toDate(value);

  if (!date) return null;

  date.setHours(0, 0, 0, 0);

  return date;
}

function startOfWeek(value) {
  const date = startOfDay(value);

  if (!date) return null;

  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  date.setDate(date.getDate() + mondayOffset);

  return date;
}

function sameDate(a, b) {
  const first = startOfDay(a);
  const second = startOfDay(b);

  if (!first || !second) return false;

  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

export function formatDateKey(value) {
  const date = toDate(value);

  if (!date) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getRussianDayName(value) {
  const date = toDate(value);

  if (!date) return null;

  return RUSSIAN_DAYS[date.getDay()];
}

function normalizeWeek(value) {
  if (Array.isArray(value)) {
    const weeks = value
      .map(Number)
      .filter(
        week =>
          Number.isInteger(week) &&
          week >= 1 &&
          week <= 4
      );

    return [...new Set(weeks)];
  }

  const week = Number(value);

  if (
    Number.isInteger(week) &&
    week >= 1 &&
    week <= 4
  ) {
    return [week];
  }

  return [1, 2, 3, 4];
}

function lessonMatchesWeek(lesson, week) {
  return normalizeWeek(lesson?.weekNumber).includes(week);
}

function lessonMatchesSubgroup(lesson, subgroup) {
  const lessonSubgroup = Number(
    lesson?.numSubgroup ??
    lesson?.subgroup ??
    0
  );

  if (
    !Number.isInteger(lessonSubgroup) ||
    lessonSubgroup === 0
  ) {
    return true;
  }

  const selectedSubgroup = Number(subgroup);

  if (!Number.isInteger(selectedSubgroup)) {
    return true;
  }

  return lessonSubgroup === selectedSubgroup;
}

function lessonMatchesDate(lesson, date) {
  const target = startOfDay(date);

  if (!target) return false;

  if (lesson?.dateLesson) {
    if (!sameDate(lesson.dateLesson, target)) {
      return false;
    }
  }

  if (lesson?.startLessonDate) {
    const start = startOfDay(lesson.startLessonDate);

    if (start && target < start) {
      return false;
    }
  }

  if (lesson?.endLessonDate) {
    const end = startOfDay(lesson.endLessonDate);

    if (end && target > end) {
      return false;
    }
  }

  return true;
}

function timeToMinutes(value) {
  const match = String(value || '').match(
    /^(\d{1,2}):(\d{2})/
  );

  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  return (
    Number(match[1]) * 60 +
    Number(match[2])
  );
}

function makeDateTime(date, time) {
  const result = startOfDay(date);

  const match = String(time || '').match(
    /^(\d{1,2}):(\d{2})/
  );

  if (!result || !match) {
    return null;
  }

  result.setHours(
    Number(match[1]),
    Number(match[2]),
    0,
    0
  );

  return result;
}

function getTeacher(employees) {
  if (!Array.isArray(employees) || !employees.length) {
    return '';
  }

  return employees
    .map(employee =>
      [
        employee?.lastName,
        employee?.firstName,
        employee?.middleName
      ]
        .filter(Boolean)
        .join(' ')
    )
    .filter(Boolean)
    .join(', ');
}

function getRoom(auditories) {
  if (!Array.isArray(auditories) || !auditories.length) {
    return '';
  }

  const first = auditories[0];

  if (typeof first === 'string') {
    return first;
  }

  return (
    first?.auditoryName ||
    first?.name ||
    first?.number ||
    first?.auditory ||
    ''
  );
}

export function normalizeLesson(lesson = {}, date = null) {
  const start = lesson.startLessonTime || '';
  const end = lesson.endLessonTime || '';

  const subject =
    lesson.subject ||
    lesson.subjectFullName ||
    'Lesson';

  const dateKey = date
    ? formatDateKey(date)
    : '';

  const id =
    lesson.id ||
    [
      subject,
      dateKey,
      start,
      end,
      lesson.numSubgroup || 0
    ].join('-');

  return {
    ...lesson,
    id,
    subject,
    subjectFullName:
      lesson.subjectFullName || subject,
    type: lesson.lessonTypeAbbrev || '',
    time:
      start && end
        ? `${start}-${end}`
        : start,
    startLessonTime: start,
    endLessonTime: end,
    room: getRoom(lesson.auditories),
    teacher: getTeacher(lesson.employees),
    weekNumber: Array.isArray(lesson.weekNumber)
      ? lesson.weekNumber
      : lesson.weekNumber == null
        ? []
        : [lesson.weekNumber],
    numSubgroup:
      Number(
        lesson.numSubgroup ??
        lesson.subgroup ??
        0
      ) || 0,
    date: dateKey || undefined,
    startDateTime:
      date && start
        ? makeDateTime(date, start)
        : undefined,
    endDateTime:
      date && end
        ? makeDateTime(date, end)
        : undefined
  };
}

export function getAcademicWeekForDateMondayBased(
  date,
  currentWeek = 1,
  referenceDate = new Date()
) {
  const target = startOfWeek(date);
  const reference = startOfWeek(referenceDate);

  if (!target || !reference) {
    return null;
  }

  const suppliedWeek = Number(currentWeek);

  if (
    !Number.isInteger(suppliedWeek) ||
    suppliedWeek < 1 ||
    suppliedWeek > 4
  ) {
    return null;
  }

  const millisecondsPerWeek =
    7 * 24 * 60 * 60 * 1000;

  const difference = Math.round(
    (target.getTime() - reference.getTime()) /
    millisecondsPerWeek
  );

  return (
    ((suppliedWeek - 1 + difference) % 4 + 4) % 4
  ) + 1;
}

export function resolveWeek(
  date,
  currentWeek = 1,
  referenceDate = new Date()
) {
  return getAcademicWeekForDateMondayBased(
    date,
    currentWeek,
    referenceDate
  );
}

export function resolveLessonsForDate(
  schedules,
  date,
  currentWeek = 1,
  subgroup = 1,
  options = {}
) {
  const target = toDate(date);

  if (!target) {
    return [];
  }

  const referenceDate =
    options.referenceDate ||
    options.now ||
    new Date();

  const week = resolveWeek(
    target,
    currentWeek,
    referenceDate
  );

  if (!week) {
    return [];
  }

  const russianDay =
    getRussianDayName(target);

  const lessons =
    Array.isArray(schedules?.[russianDay])
      ? schedules[russianDay]
      : [];

  return lessons
    .filter(lesson =>
      lessonMatchesWeek(lesson, week)
    )
    .filter(lesson =>
      lessonMatchesDate(lesson, target)
    )
    .filter(lesson =>
      lessonMatchesSubgroup(
        lesson,
        subgroup
      )
    )
    .map(lesson =>
      normalizeLesson(lesson, target)
    )
    .sort(
      (a, b) =>
        timeToMinutes(a.startLessonTime) -
        timeToMinutes(b.startLessonTime)
    );
}

export function resolveScheduleForDate(
  schedules,
  date,
  subgroup = 1,
  currentWeek = 1,
  referenceDate = new Date()
) {
  return resolveLessonsForDate(
    schedules,
    date,
    currentWeek,
    subgroup,
    { referenceDate }
  );
}

export function resolveLessonsForWeekday(
  schedules,
  weekday,
  currentWeek = 1,
  subgroup = 1
) {
  const russianDay =
    ENGLISH_TO_RUSSIAN[weekday] ||
    weekday;

  const lessons =
    Array.isArray(schedules?.[russianDay])
      ? schedules[russianDay]
      : [];

  const week = Number(currentWeek);

  return {
    [week]: lessons
      .filter(lesson =>
        lessonMatchesWeek(lesson, week)
      )
      .filter(lesson =>
        lessonMatchesSubgroup(
          lesson,
          subgroup
        )
      )
      .map(normalizeLesson)
      .sort(
        (a, b) =>
          timeToMinutes(a.startLessonTime) -
          timeToMinutes(b.startLessonTime)
      )
  };
}

export function getNextLesson(
  schedules,
  startDate = new Date(),
  endDate = null,
  subgroup = 1,
  currentWeek = 1,
  now = new Date()
) {
  const start = startOfDay(startDate);

  if (!start) {
    return null;
  }

  const limit =
    endDate
      ? startOfDay(endDate)
      : new Date(
          start.getTime() +
          370 * 24 * 60 * 60 * 1000
        );

  if (!limit) {
    return null;
  }

  let date = start;

  while (date <= limit) {
    const lessons =
      resolveLessonsForDate(
        schedules,
        date,
        currentWeek,
        subgroup,
        { referenceDate: now }
      );

    const next = lessons.find(
      lesson =>
        lesson.endDateTime &&
        lesson.endDateTime > now
    );

    if (next) {
      return next;
    }

    date = new Date(date);
    date.setDate(date.getDate() + 1);
  }

  return null;
}