const DAYS = [
  'Воскресенье',
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота'
];

const DAY_MAP = {
  Sun: 'Воскресенье',
  Mon: 'Понедельник',
  Tue: 'Вторник',
  Wed: 'Среда',
  Thu: 'Четверг',
  Fri: 'Пятница',
  Sat: 'Суббота'
};

function toDate(value) {
  if (value instanceof Date) {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  if (!value) {
    return null;
  }

  const text = String(value).trim();

  const ru = text.match(
    /^(\d{2})\.(\d{2})\.(\d{4})$/
  );

  if (ru) {
    const date = new Date(
      Number(ru[3]),
      Number(ru[2]) - 1,
      Number(ru[1])
    );

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  const isoDate = text.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (isoDate) {
    const date = new Date(
      Number(isoDate[1]),
      Number(isoDate[2]) - 1,
      Number(isoDate[3])
    );

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  const date = new Date(text);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function startOfDay(value) {
  const date = toDate(value);

  if (!date) {
    return null;
  }

  date.setHours(
    0,
    0,
    0,
    0
  );

  return date;
}

function startOfWeek(value) {
  const date = startOfDay(value);

  if (!date) {
    return null;
  }

  const day = date.getDay();

  const offset =
    day === 0
      ? -6
      : 1 - day;

  date.setDate(
    date.getDate() + offset
  );

  return date;
}

function normalizeSubgroup(value) {
  const text = String(
    value ?? 'all'
  )
    .trim()
    .toLowerCase();

  if (text === '1') {
    return 1;
  }

  if (text === '2') {
    return 2;
  }

  return 'all';
}

function normalizeWeeks(value) {
  if (Array.isArray(value)) {
    return value
      .map(Number)
      .filter(
        week =>
          Number.isInteger(week) &&
          week >= 1 &&
          week <= 4
      );
  }

  if (
    value === null ||
    value === undefined
  ) {
    return [1, 2, 3, 4];
  }

  const number = Number(value);

  if (number === 0) {
    return [1, 2, 3, 4];
  }

  if (
    Number.isInteger(number) &&
    number >= 1 &&
    number <= 4
  ) {
    return [number];
  }

  return [];
}

function lessonMatchesWeek(
  lesson,
  week
) {
  const weeks =
    normalizeWeeks(
      lesson?.weekNumber
    );

  return weeks.includes(
    week
  );
}

function lessonMatchesSubgroup(
  lesson,
  subgroup
) {
  const selected =
    normalizeSubgroup(
      subgroup
    );

  const lessonSubgroup =
    Number(
      lesson?.numSubgroup ?? 0
    );

  if (
    !Number.isInteger(
      lessonSubgroup
    ) ||
    lessonSubgroup === 0
  ) {
    return true;
  }

  if (
    selected === 'all'
  ) {
    return true;
  }

  return (
    lessonSubgroup ===
    selected
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

function makeDateTime(
  date,
  time
) {
  const result =
    startOfDay(date);

  const match =
    String(time || '').match(
      /^(\d{1,2}):(\d{2})/
    );

  if (
    !result ||
    !match
  ) {
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

function getRoom(
  auditories
) {
  if (
    !Array.isArray(
      auditories
    ) ||
    !auditories.length
  ) {
    return '';
  }

  return auditories
    .map(auditory => {
      if (
        typeof auditory ===
        'string'
      ) {
        return auditory;
      }

      return (
        auditory?.auditoryName ||
        auditory?.name ||
        auditory?.number ||
        auditory?.auditory ||
        ''
      );
    })
    .filter(Boolean)
    .join(', ');
}

function getTeacher(
  employees
) {
  if (
    !Array.isArray(
      employees
    ) ||
    !employees.length
  ) {
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

function getAcademicYearStart(
  date,
  now
) {
  const target =
    startOfDay(date);

  const reference =
    startOfDay(now);

  if (
    !target ||
    !reference
  ) {
    return null;
  }

  /*
   * This mirrors the Swift app.
   *
   * Academic year starts on
   * September 1.
   *
   * When looking at January–June
   * dates during the current academic
   * year, September belongs to the
   * previous calendar year.
   */
  let firstDay =
    new Date(
      target.getFullYear(),
      8,
      1
    );

  const lastDay =
    new Date(
      target.getFullYear(),
      6,
      1
    );

  if (
    target < firstDay &&
    reference < lastDay
  ) {
    firstDay =
      new Date(
        target.getFullYear() - 1,
        8,
        1
      );
  }

  return firstDay;
}

export function getAcademicWeekForDate(
  date,
  now = new Date()
) {
  const target =
    startOfDay(date);

  const reference =
    startOfDay(now);

  if (
    !target ||
    !reference
  ) {
    return null;
  }

  const firstDay =
    getAcademicYearStart(
      target,
      reference
    );

  if (!firstDay) {
    return null;
  }

  const distanceStart =
    startOfWeek(
      firstDay
    );

  const distanceEnd =
    startOfWeek(
      target
    );

  if (
    !distanceStart ||
    !distanceEnd
  ) {
    return null;
  }

  const weekOfYearDistance =
    Math.round(
      (
        distanceEnd.getTime() -
        distanceStart.getTime()
      ) /
        (
          7 *
          24 *
          60 *
          60 *
          1000
        )
    );

  /*
   * Exact Swift logic:
   *
   * (abs(distance) % 4) + 1
   */
  return (
    Math.abs(
      weekOfYearDistance
    ) % 4
  ) + 1;
}

export function getAcademicWeekForDateMondayBased(
  date,
  currentWeek = 1,
  referenceDate = new Date()
) {
  /*
   * currentWeek is kept in the
   * function signature for backwards
   * compatibility with existing callers.
   *
   * It is intentionally NOT used to
   * calculate the week anymore.
   *
   * The academic calendar is the
   * source of truth, matching Swift.
   */
  void currentWeek;

  return getAcademicWeekForDate(
    date,
    referenceDate
  );
}

export function resolveWeek(
  date,
  currentWeek = 1,
  referenceDate = new Date()
) {
  return getAcademicWeekForDate(
    date,
    referenceDate
  );
}

export function formatDateKey(
  value
) {
  const date =
    toDate(value);

  if (!date) {
    return '';
  }

  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1
    ).padStart(2, '0'),
    String(
      date.getDate()
    ).padStart(2, '0')
  ].join('-');
}

export function getRussianDayName(
  value
) {
  const date =
    toDate(value);

  if (!date) {
    return null;
  }

  return (
    DAYS[
      date.getDay()
    ] || null
  );
}

function isDateWithinScheduleRange(
  date,
  startDate,
  endDate
) {
  const target =
    startOfDay(date);

  const start =
    startDate
      ? startOfDay(startDate)
      : null;

  const end =
    endDate
      ? startOfDay(endDate)
      : null;

  if (!target) {
    return false;
  }

  if (
    start &&
    target < start
  ) {
    return false;
  }

  if (
    end &&
    target > end
  ) {
    return false;
  }

  return true;
}

function lessonMatchesDate(
  lesson,
  date
) {
  const target =
    startOfDay(date);

  if (!target) {
    return false;
  }

  /*
   * Swift:
   *
   * if let dateLesson = pair.dateLesson,
   *    !calendar.isDate(
   *       dateLesson,
   *       inSameDayAs: date
   *    ) {
   *     return false
   * }
   */
  if (
    lesson?.dateLesson
  ) {
    const lessonDate =
      startOfDay(
        lesson.dateLesson
      );

    if (
      !lessonDate ||
      formatDateKey(
        lessonDate
      ) !==
        formatDateKey(
          target
        )
    ) {
      return false;
    }
  } else if (
    lesson?.startLessonDate &&
    lesson?.endLessonDate
  ) {
    /*
     * Swift:
     *
     * startLessonDate...
     * endLessonDate
     */
    const start =
      startOfDay(
        lesson.startLessonDate
      );

    const end =
      startOfDay(
        lesson.endLessonDate
      );

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

export function normalizeLesson(
  lesson = {},
  date = null
) {
  const start =
    lesson.startLessonTime ||
    '';

  const end =
    lesson.endLessonTime ||
    '';

  const subject =
    lesson.subject ||
    lesson.subjectFullName ||
    'Lesson';

  const dateKey =
    date
      ? formatDateKey(date)
      : '';

  const subgroup =
    Number(
      lesson.numSubgroup
    ) || 0;

  const id =
    lesson.id ||
    [
      subject,
      dateKey,
      start,
      end,
      subgroup
    ].join('-');

  return {
    ...lesson,

    id,

    subject,

    subjectFullName:
      lesson.subjectFullName ||
      subject,

    type:
      lesson.lessonTypeAbbrev ||
      lesson.lessonType ||
      '',

    time:
      start && end
        ? `${start}-${end}`
        : start,

    startLessonTime:
      start,

    endLessonTime:
      end,

    room:
      getRoom(
        lesson.auditories
      ),

    teacher:
      getTeacher(
        lesson.employees
      ),

    weekNumber:
      normalizeWeeks(
        lesson.weekNumber
      ),

    numSubgroup:
      subgroup,

    date:
      dateKey ||
      undefined,

    startDateTime:
      date && start
        ? makeDateTime(
            date,
            start
          )
        : undefined,

    endDateTime:
      date && end
        ? makeDateTime(
            date,
            end
          )
        : undefined
  };
}

export function resolveLessonsForDate(
  schedules,
  date,
  currentWeek = 1,
  subgroup = 'all',
  options = {}
) {
  const target =
    toDate(date);

  if (!target) {
    return [];
  }

  const referenceDate =
    options.referenceDate ||
    options.now ||
    new Date();

  if (
    !isDateWithinScheduleRange(
      target,
      options.startDate,
      options.endDate
    )
  ) {
    return [];
  }

  const week =
    getAcademicWeekForDate(
      target,
      referenceDate
    );

  if (!week) {
    return [];
  }

  const russianDay =
    getRussianDayName(
      target
    );

  const lessons =
    Array.isArray(
      schedules?.[
        russianDay
      ]
    )
      ? schedules[
          russianDay
        ]
      : [];

  return lessons
    .filter(lesson =>
      lessonMatchesWeek(
        lesson,
        week
      )
    )
    .filter(lesson =>
      lessonMatchesSubgroup(
        lesson,
        subgroup
      )
    )
    .filter(lesson =>
      lessonMatchesDate(
        lesson,
        target
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

export function resolveScheduleForDate(
  schedules,
  date,
  subgroup = 'all',
  currentWeek = 1,
  referenceDate = new Date(),
  options = {}
) {
  return resolveLessonsForDate(
    schedules,
    date,
    currentWeek,
    subgroup,
    {
      ...options,
      referenceDate
    }
  );
}

export function resolveLessonsForWeekday(
  schedules,
  weekday,
  currentWeek = 1,
  subgroup = 'all'
) {
  const russianDay =
    DAY_MAP[weekday] ||
    weekday;

  const lessons =
    Array.isArray(
      schedules?.[
        russianDay
      ]
    )
      ? schedules[
          russianDay
        ]
      : [];

  const week =
    Number(currentWeek);

  if (
    !Number.isInteger(week) ||
    week < 1 ||
    week > 4
  ) {
    return [];
  }

  return lessons
    .filter(lesson =>
      lessonMatchesWeek(
        lesson,
        week
      )
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
        timeToMinutes(
          a.startLessonTime
        ) -
        timeToMinutes(
          b.startLessonTime
        )
    );
}

export function getNextLesson(
  schedules,
  startDate = new Date(),
  endDate = null,
  subgroup = 'all',
  currentWeek = 1,
  now = new Date(),
  options = {}
) {
  const currentTime =
    toDate(now);

  if (!currentTime) {
    return null;
  }

  const scheduleStart =
    options.startDate
      ? startOfDay(
          options.startDate
        )
      : null;

  const scheduleEnd =
    options.endDate
      ? startOfDay(
          options.endDate
        )
      : null;

  let start =
    startOfDay(
      startDate
    );

  if (!start) {
    start =
      startOfDay(
        currentTime
      );
  }

  if (
    scheduleStart &&
    start < scheduleStart
  ) {
    start =
      scheduleStart;
  }

  let limit =
    endDate
      ? startOfDay(
          endDate
        )
      : scheduleEnd ||
        new Date(
          start.getTime() +
            370 *
              24 *
              60 *
              60 *
              1000
        );

  if (
    scheduleEnd &&
    limit > scheduleEnd
  ) {
    limit =
      scheduleEnd;
  }

  if (
    !limit ||
    start > limit
  ) {
    return null;
  }

  let date =
    new Date(start);

  while (
    date <= limit
  ) {
    const lessons =
      resolveLessonsForDate(
        schedules,
        date,
        currentWeek,
        subgroup,
        {
          referenceDate:
            currentTime,
          startDate:
            scheduleStart,
          endDate:
            scheduleEnd
        }
      );

    const next =
      lessons.find(
        lesson =>
          lesson.startDateTime &&
          lesson.startDateTime >
            currentTime
      );

    if (next) {
      return next;
    }

    date.setDate(
      date.getDate() + 1
    );
  }

  return null;
}