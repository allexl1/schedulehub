const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

const DAY_INDEX = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6
};

const ALL_WEEKS = [1, 2, 3, 4];

const MILLISECONDS_PER_DAY =
  24 * 60 * 60 * 1000;

const MILLISECONDS_PER_WEEK =
  7 * MILLISECONDS_PER_DAY;

function toDate(value) {
  if (value instanceof Date) {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();

  if (!text) {
    return null;
  }

  const dottedDate = text.match(
    /^(\d{2})\.(\d{2})\.(\d{4})$/
  );

  if (dottedDate) {
    const date = new Date(
      Number(dottedDate[3]),
      Number(dottedDate[2]) - 1,
      Number(dottedDate[1])
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

  date.setHours(0, 0, 0, 0);

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

function addDays(value, amount) {
  const date = toDate(value);

  if (!date) {
    return null;
  }

  date.setDate(
    date.getDate() + amount
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
    const weeks = value
      .map(Number)
      .filter(
        week =>
          Number.isInteger(week) &&
          week >= 1 &&
          week <= 4
      );

    return weeks.length > 0
      ? [...new Set(weeks)]
      : [...ALL_WEEKS];
  }

  if (
    value === null ||
    value === undefined
  ) {
    return [...ALL_WEEKS];
  }

  const number = Number(value);

  if (number === 0) {
    return [...ALL_WEEKS];
  }

  if (
    Number.isInteger(number) &&
    number >= 1 &&
    number <= 4
  ) {
    return [number];
  }

  return [...ALL_WEEKS];
}

function normalizeEmployee(employee) {
  if (
    !employee ||
    typeof employee !== 'object'
  ) {
    return null;
  }

  const id =
    employee.id ??
    employee.employeeId ??
    employee.urlId ??
    null;

  const fio =
    employee.fio ||
    [
      employee.lastName,
      employee.firstName,
      employee.middleName
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

  if (!fio && !id) {
    return null;
  }

  return {
    id,
    urlId:
      employee.urlId || null,
    firstName:
      employee.firstName || '',
    middleName:
      employee.middleName || '',
    lastName:
      employee.lastName || '',
    fio,
    rank:
      employee.rank || null,
    degree:
      employee.degree || null,
    academicDepartment:
      Array.isArray(
        employee.academicDepartment
      )
        ? employee.academicDepartment
        : [],
    photoLink:
      employee.photoLink || null
  };
}

function lessonMatchesWeek(
  lesson,
  week
) {
  return normalizeWeeks(
    lesson?.weekNumber
  ).includes(week);
}

function lessonMatchesSubgroup(
  lesson,
  subgroup
) {
  const selected =
    normalizeSubgroup(subgroup);

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

  if (selected === 'all') {
    return true;
  }

  return (
    lessonSubgroup === selected
  );
}

function timeToMinutes(value) {
  const match = String(
    value || ''
  ).match(
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

function parseTime(value) {
  const match = String(
    value || ''
  ).match(
    /^(\d{1,2}):(\d{2})/
  );

  if (!match) {
    return null;
  }

  const hour = Number(
    match[1]
  );

  const minute = Number(
    match[2]
  );

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return {
    hour,
    minute
  };
}

function makeDateTime(
  date,
  time
) {
  const result =
    startOfDay(date);

  const parsed =
    parseTime(time);

  if (!result || !parsed) {
    return null;
  }

  result.setHours(
    parsed.hour,
    parsed.minute,
    0,
    0
  );

  return result;
}

function getRoom(auditories) {
  if (
    !Array.isArray(auditories) ||
    auditories.length === 0
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
    !Array.isArray(employees) ||
    employees.length === 0
  ) {
    return '';
  }

  return employees
    .map(employee => {
      const normalized =
        normalizeEmployee(
          employee
        );

      return (
        normalized?.fio || ''
      );
    })
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

  if (!target || !reference) {
    return null;
  }

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

  /*
   * This mirrors the Swift implementation:
   *
   * - September 1 starts the academic year.
   * - Before July, dates before September belong
   *   to the previous academic year.
   * - The reference date determines which side of
   *   the academic-year boundary we are currently on.
   */
  if (
    target < firstDay &&
    reference < lastDay
  ) {
    firstDay = new Date(
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

  if (!target || !reference) {
    return null;
  }

  const academicYearStart =
    getAcademicYearStart(
      target,
      reference
    );

  if (!academicYearStart) {
    return null;
  }

  const distanceStart =
    startOfWeek(
      academicYearStart
    );

  const distanceEnd =
    startOfWeek(target);

  if (
    !distanceStart ||
    !distanceEnd
  ) {
    return null;
  }

  const weekDistance =
    Math.round(
      (
        distanceEnd.getTime() -
        distanceStart.getTime()
      ) /
        MILLISECONDS_PER_WEEK
    );

  return (
    Math.abs(weekDistance) % 4
  ) + 1;
}

export function getAcademicWeekForDateMondayBased(
  date,
  _currentWeek = 1,
  referenceDate = new Date()
) {
  return getAcademicWeekForDate(
    date,
    referenceDate
  );
}

export function resolveWeek(
  date,
  _currentWeek = 1,
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
    startOfDay(value);

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

export function getDayName(
  value
) {
  const date =
    toDate(value);

  if (!date) {
    return null;
  }

  return (
    DAY_NAMES[
      date.getDay()
    ] || null
  );
}

export function getRussianDayName(
  value
) {
  return getDayName(value);
}

function getScheduleEntriesForDate(
  schedules,
  date
) {
  if (
    !schedules ||
    typeof schedules !== 'object'
  ) {
    return [];
  }

  const dayName =
    getDayName(date);

  if (!dayName) {
    return [];
  }

  const candidates = [
    dayName,
    dayName.slice(0, 3),
    dayName.toLowerCase(),
    dayName
      .toLowerCase()
      .slice(0, 3)
  ];

  for (
    const key of candidates
  ) {
    if (
      Array.isArray(
        schedules[key]
      )
    ) {
      return schedules[key];
    }
  }

  return [];
}

function getScheduleEntriesByDate(
  schedules,
  date
) {
  if (
    !schedules ||
    typeof schedules !== 'object'
  ) {
    return [];
  }

  const dateKey =
    formatDateKey(date);

  if (
    dateKey &&
    Array.isArray(
      schedules[dateKey]
    )
  ) {
    return schedules[dateKey];
  }

  return getScheduleEntriesForDate(
    schedules,
    date
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

  if (lesson?.dateLesson) {
    const lessonDate =
      startOfDay(
        lesson.dateLesson
      );

    return (
      Boolean(lessonDate) &&
      formatDateKey(
        lessonDate
      ) ===
        formatDateKey(target)
    );
  }

  const startDate =
    lesson?.startLessonDate
      ? startOfDay(
          lesson.startLessonDate
        )
      : null;

  const endDate =
    lesson?.endLessonDate
      ? startOfDay(
          lesson.endLessonDate
        )
      : null;

  if (startDate && endDate) {
    return (
      target >= startDate &&
      target <= endDate
    );
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

  const dateKey = date
    ? formatDateKey(date)
    : '';

  const subgroup =
    Number(
      lesson.numSubgroup
    ) || 0;

  const employees =
    Array.isArray(
      lesson.employees
    )
      ? lesson.employees
          .map(normalizeEmployee)
          .filter(Boolean)
      : [];

  const auditories =
    Array.isArray(
      lesson.auditories
    )
      ? lesson.auditories
      : [];

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
      lesson.type ||
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
      lesson.room ||
      getRoom(auditories),

    teacher:
      lesson.teacher ||
      getTeacher(employees),

    employees,

    auditories,

    weekNumber:
      normalizeWeeks(
        lesson.weekNumber
      ),

    numSubgroup:
      subgroup,

    date:
      dateKey ||
      lesson.date ||
      undefined,

    startDateTime:
      date && start
        ? makeDateTime(
            date,
            start
          )
        : null,

    endDateTime:
      date && end
        ? makeDateTime(
            date,
            end
          )
        : null
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
    startOfDay(date);

  if (!target) {
    return [];
  }

  const referenceDate =
    options.referenceDate ||
    new Date();

  const week =
    getAcademicWeekForDate(
      target,
      referenceDate
    );

  if (!week) {
    return [];
  }

  const startDate =
    options.startDate ||
    options.scheduleStartDate ||
    null;

  const endDate =
    options.endDate ||
    options.scheduleEndDate ||
    null;

  if (
    !isDateWithinScheduleRange(
      target,
      startDate,
      endDate
    )
  ) {
    return [];
  }

  const entries =
    getScheduleEntriesByDate(
      schedules,
      target
    );

  return entries
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
          a.time
        ) -
        timeToMinutes(
          b.time
        )
    );
}

export function resolveLessonsForWeekday(
  schedules,
  weekday,
  currentWeek = 1,
  subgroup = 'all',
  options = {}
) {
  const referenceDate =
    options.referenceDate ||
    new Date();

  const reference =
    startOfDay(
      referenceDate
    );

  if (!reference) {
    return [];
  }

  const normalized =
    String(weekday || '')
      .trim()
      .toLowerCase();

  const dayIndex =
    DAY_INDEX[normalized];

  if (
    dayIndex === undefined
  ) {
    return [];
  }

  const weekStart =
    startOfWeek(reference);

  if (!weekStart) {
    return [];
  }

  const offset =
    dayIndex === 0
      ? 6
      : dayIndex - 1;

  const targetDate =
    addDays(
      weekStart,
      offset
    );

  if (!targetDate) {
    return [];
  }

  return resolveLessonsForDate(
    schedules,
    targetDate,
    currentWeek,
    subgroup,
    options
  );
}

export function getNextLesson(
  lessons,
  now = new Date()
) {
  const reference =
    toDate(now);

  if (!reference) {
    return null;
  }

  const sorted =
    Array.isArray(lessons)
      ? [...lessons].sort(
          (a, b) => {
            const aTime =
              a.startDateTime instanceof Date
                ? a.startDateTime.getTime()
                : timeToMinutes(
                    a.time
                  );

            const bTime =
              b.startDateTime instanceof Date
                ? b.startDateTime.getTime()
                : timeToMinutes(
                    b.time
                  );

            return (
              aTime - bTime
            );
          }
        )
      : [];

  return (
    sorted.find(lesson => {
      if (
        lesson.startDateTime instanceof Date
      ) {
        return (
          lesson.startDateTime >
          reference
        );
      }

      return (
        timeToMinutes(
          lesson.time
        ) >
        (
          reference.getHours() *
            60 +
          reference.getMinutes()
        )
      );
    }) || null
  );
}

export function resolveScheduleForDate(
  schedules,
  date,
  currentWeek = 1,
  subgroup = 'all',
  options = {}
) {
  return resolveLessonsForDate(
    schedules,
    date,
    currentWeek,
    subgroup,
    options
  );
}

export function getDayNames() {
  return [...DAY_NAMES];
}