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

function validDate(value) {
  if (value instanceof Date) {
    return !Number.isNaN(value.getTime()) ? new Date(value) : null;
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

  const iso = new Date(text);

  return Number.isNaN(iso.getTime()) ? null : iso;
}

function startOfDay(date) {
  const d = validDate(date);

  if (!d) return null;

  d.setHours(0, 0, 0, 0);
  return d;
}

function sameDay(a, b) {
  const first = startOfDay(a);
  const second = startOfDay(b);

  if (!first || !second) return false;

  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function startOfWeek(date) {
  const d = startOfDay(date);

  if (!d) return null;

  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  d.setDate(d.getDate() + mondayOffset);

  return d;
}

function russianDayForDate(date) {
  const d = validDate(date);

  if (!d) return null;

  return RUSSIAN_DAYS[d.getDay()];
}

function academicWeekForDate(date, now = new Date()) {
  const target = validDate(date);
  const current = validDate(now) || new Date();

  if (!target) return null;

  let firstDay = new Date(
    target.getFullYear(),
    8,
    1
  );

  const lastDay = new Date(
    target.getFullYear(),
    6,
    1
  );

  if (
    target < firstDay &&
    current < lastDay
  ) {
    firstDay = new Date(
      firstDay.getFullYear() - 1,
      8,
      1
    );
  }

  const firstWeek = startOfWeek(firstDay);
  const targetWeek = startOfWeek(target);

  if (!firstWeek || !targetWeek) return null;

  const millisecondsPerWeek =
    7 * 24 * 60 * 60 * 1000;

  const distance =
    Math.round(
      (targetWeek.getTime() - firstWeek.getTime()) /
      millisecondsPerWeek
    );

  return (Math.abs(distance) % 4) + 1;
}

function normalizeWeekNumbers(value) {
  if (value === null || value === undefined) {
    return [1, 2, 3, 4];
  }

  if (Array.isArray(value)) {
    const numbers = value
      .map(Number)
      .filter(
        number =>
          Number.isInteger(number) &&
          number >= 0 &&
          number <= 4
      );

    if (
      numbers.includes(0) ||
      numbers.length === 0
    ) {
      return [1, 2, 3, 4];
    }

    return [
      ...new Set(numbers)
    ];
  }

  const number = Number(value);

  if (!Number.isInteger(number)) {
    return [1, 2, 3, 4];
  }

  if (number === 0) {
    return [1, 2, 3, 4];
  }

  if (number >= 1 && number <= 4) {
    return [number];
  }

  return [];
}

function matchesWeek(lesson, weekNumber) {
  if (!Number.isInteger(weekNumber)) {
    return false;
  }

  return normalizeWeekNumbers(
    lesson?.weekNumber
  ).includes(weekNumber);
}

function matchesDateRestrictions(
  lesson,
  date
) {
  const target = startOfDay(date);

  if (!target) return false;

  const dateLesson =
    validDate(lesson?.dateLesson);

  if (
    dateLesson &&
    !sameDay(dateLesson, target)
  ) {
    return false;
  }

  const startLessonDate =
    validDate(lesson?.startLessonDate);

  const endLessonDate =
    validDate(lesson?.endLessonDate);

  if (
    startLessonDate &&
    endLessonDate
  ) {
    const start = startOfDay(startLessonDate);
    const end = startOfDay(endLessonDate);

    if (
      !start ||
      !end ||
      target < start ||
      target > end
    ) {
      return false;
    }
  }

  return true;
}

function matchesSubgroup(
  lesson,
  subgroup
) {
  const lessonSubgroup =
    Number(
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

  const selectedSubgroup =
    Number(subgroup);

  if (
    !Number.isInteger(selectedSubgroup)
  ) {
    return true;
  }

  return (
    lessonSubgroup ===
    selectedSubgroup
  );
}

function timeToMinutes(value) {
  const match =
    String(value || '').match(
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
  const target = startOfDay(date);

  if (!target) return null;

  const match =
    String(time || '').match(
      /^(\d{1,2}):(\d{2})/
    );

  if (!match) return null;

  target.setHours(
    Number(match[1]),
    Number(match[2]),
    0,
    0
  );

  return target;
}

function getTeacher(employees) {
  if (
    !Array.isArray(employees) ||
    employees.length === 0
  ) {
    return '';
  }

  const employee = employees[0] || {};

  return [
    employee.firstName,
    employee.middleName,
    employee.lastName
  ]
    .filter(Boolean)
    .join(' ');
}

function getRoom(auditories) {
  if (!Array.isArray(auditories)) {
    return '';
  }

  return auditories[0] || '';
}

export function normalizeLesson(
  lesson = {},
  date = null
) {
  const start =
    lesson.startLessonTime || '';

  const end =
    lesson.endLessonTime || '';

  const subject =
    lesson.subject ||
    lesson.subjectFullName ||
    'Lesson';

  const room =
    getRoom(lesson.auditories);

  const teacher =
    getTeacher(lesson.employees);

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
      room,
      lesson.numSubgroup || 0
    ].join('-');

  return {
    ...lesson,
    id,
    subject,
    subjectFullName:
      lesson.subjectFullName ||
      subject,
    type:
      lesson.lessonTypeAbbrev || '',
    time:
      start && end
        ? `${start}-${end}`
        : start,
    startLessonTime: start,
    endLessonTime: end,
    room,
    teacher,
    weekNumber:
      Array.isArray(lesson.weekNumber)
        ? lesson.weekNumber
        : lesson.weekNumber === undefined
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

function getDayLessons(
  schedules,
  date
) {
  const day = russianDayForDate(date);

  if (!day) return [];

  const lessons = schedules?.[day];

  return Array.isArray(lessons)
    ? lessons
    : [];
}

export function resolveLessonsForDate(
  schedules,
  date,
  currentWeek,
  subgroup = 1,
  options = {}
) {
  const target = validDate(date);

  if (!target) return [];

  const week =
    Number.isInteger(
      Number(currentWeek)
    )
      ? Number(currentWeek)
      : academicWeekForDate(
          target,
          options.now || new Date()
        );

  if (!Number.isInteger(week)) {
    return [];
  }

  return getDayLessons(
    schedules,
    target
  )
    .filter(lesson =>
      matchesWeek(
        lesson,
        week
      )
    )
    .filter(lesson =>
      matchesDateRestrictions(
        lesson,
        target
      )
    )
    .filter(lesson =>
      matchesSubgroup(
        lesson,
        subgroup
      )
    )
    .map(lesson =>
      normalizeLesson(
        lesson,
        target
      )
    )
    .sort(
      (a, b) =>
        timeToMinutes(
          a.startLessonTime
        ) -
        timeToMinutes(
          b.startLessonTime
        )
    );
}

export function resolveLessonsForWeekday(
  schedules,
  weekday,
  currentWeek,
  subgroup = 1
) {
  const russianDay =
    ENGLISH_TO_RUSSIAN[weekday] ||
    weekday;

  const lessons =
    schedules?.[russianDay];

  if (!Array.isArray(lessons)) {
    return {
      [currentWeek]: []
    };
  }

  const filtered =
    lessons
      .filter(lesson =>
        matchesWeek(
          lesson,
          currentWeek
        )
      )
      .filter(lesson =>
        matchesSubgroup(
          lesson,
          subgroup
        )
      )
      .map(normalizeLesson)
      .sort(
        (a, b) =>
          timeToMinutes(
            a.startLessonTime
          ) -
          timeToMinutes(
            b.startLessonTime
          )
      );

  return {
    [currentWeek]: filtered
  };
}

export function getAcademicWeekForDateMondayBased(
  date,
  now = new Date()
) {
  return academicWeekForDate(
    date,
    now
  );
}

export function resolveWeek(
  date,
  now = new Date()
) {
  return academicWeekForDate(
    date,
    now
  );
}

export function getRussianDayName(
  date
) {
  return russianDayForDate(date);
}

export function formatDateKey(date) {
  const d = validDate(date);

  if (!d) return '';

  const year =
    d.getFullYear();

  const month =
    String(
      d.getMonth() + 1
    ).padStart(2, '0');

  const day =
    String(
      d.getDate()
    ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function resolveScheduleForDate(
  schedules,
  date,
  subgroup = 1,
  now = new Date()
) {
  const week =
    academicWeekForDate(
      date,
      now
    );

  return resolveLessonsForDate(
    schedules,
    date,
    week,
    subgroup,
    { now }
  );
}

export function getNextLesson(
  schedules,
  startDate = new Date(),
  endDate = null,
  subgroup = 1,
  now = new Date()
) {
  const start =
    validDate(startDate);

  if (!start) return null;

  const limit =
    endDate
      ? startOfDay(endDate)
      : new Date(
          start.getTime() +
          370 * 24 * 60 * 60 * 1000
        );

  if (!limit) return null;

  let date = startOfDay(start);

  while (
    date &&
    date <= limit
  ) {
    const lessons =
      resolveScheduleForDate(
        schedules,
        date,
        subgroup,
        now
      );

    const upcoming =
      lessons.find(
        lesson =>
          lesson.endDateTime &&
          lesson.endDateTime > now
      );

    if (upcoming) {
      return upcoming;
    }

    date = new Date(date);
    date.setDate(
      date.getDate() + 1
    );
  }

  return null;
}