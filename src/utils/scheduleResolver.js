const DAYS = [
  "Воскресенье",
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота"
];

const DAY_MAP = {
  Sun: "Воскресенье",
  Mon: "Понедельник",
  Tue: "Вторник",
  Wed: "Среда",
  Thu: "Четверг",
  Fri: "Пятница",
  Sat: "Суббота"
};

function toDate(value) {
  if (value instanceof Date) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
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
  const offset = day === 0 ? -6 : 1 - day;

  date.setDate(date.getDate() + offset);

  return date;
}

function weeksBetween(a, b) {
  const first = startOfWeek(a);
  const second = startOfWeek(b);

  if (!first || !second) return null;

  const weekMs = 7 * 24 * 60 * 60 * 1000;

  return Math.round(
    (first.getTime() - second.getTime()) / weekMs
  );
}

function normalizeSubgroup(value) {
  const text = String(value ?? "all")
    .trim()
    .toLowerCase();

  if (text === "1") return 1;
  if (text === "2") return 2;

  return "all";
}

function normalizeWeeks(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(Number)
    .filter(
      week =>
        Number.isInteger(week) &&
        week >= 1 &&
        week <= 4
    );
}

function lessonMatchesWeek(lesson, week) {
  const weeks = normalizeWeeks(
    lesson?.weekNumber
  );

  return weeks.includes(week);
}

function lessonMatchesSubgroup(
  lesson,
  subgroup
) {
  const selected = normalizeSubgroup(
    subgroup
  );

  const lessonSubgroup = Number(
    lesson?.numSubgroup ?? 0
  );

  if (
    !Number.isInteger(lessonSubgroup) ||
    lessonSubgroup === 0
  ) {
    return true;
  }

  if (selected === "all") {
    return true;
  }

  return lessonSubgroup === selected;
}

function timeToMinutes(value) {
  const match = String(value || "").match(
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

  const match = String(time || "").match(
    /^(\d{1,2}):(\d{2})/
  );

  if (!result || !match) return null;

  result.setHours(
    Number(match[1]),
    Number(match[2]),
    0,
    0
  );

  return result;
}

function getRoom(auditories) {
  if (
    !Array.isArray(auditories) ||
    !auditories.length
  ) {
    return "";
  }

  return auditories
    .map(auditory => {
      if (typeof auditory === "string") {
        return auditory;
      }

      return (
        auditory?.auditoryName ||
        auditory?.name ||
        auditory?.number ||
        auditory?.auditory ||
        ""
      );
    })
    .filter(Boolean)
    .join(", ");
}

function getTeacher(employees) {
  if (
    !Array.isArray(employees) ||
    !employees.length
  ) {
    return "";
  }

  return employees
    .map(employee =>
      [
        employee?.lastName,
        employee?.firstName,
        employee?.middleName
      ]
        .filter(Boolean)
        .join(" ")
    )
    .filter(Boolean)
    .join(", ");
}

export function formatDateKey(value) {
  const date = toDate(value);

  if (!date) return "";

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

export function getRussianDayName(value) {
  const date = toDate(value);

  if (!date) return null;

  return (
    DAYS[date.getDay()] ||
    null
  );
}

export function getAcademicWeekForDateMondayBased(
  date,
  currentWeek = 1,
  referenceDate = new Date()
) {
  const targetWeek = startOfWeek(date);
  const referenceWeek =
    startOfWeek(referenceDate);

  const baseWeek = Number(currentWeek);

  if (
    !targetWeek ||
    !referenceWeek ||
    !Number.isInteger(baseWeek) ||
    baseWeek < 1 ||
    baseWeek > 4
  ) {
    return null;
  }

  const difference = weeksBetween(
    targetWeek,
    referenceWeek
  );

  if (difference === null) {
    return null;
  }

  return (
    ((baseWeek - 1 + difference) % 4 + 4) %
    4
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

export function normalizeLesson(
  lesson = {},
  date = null
) {
  const start =
    lesson.startLessonTime || "";

  const end =
    lesson.endLessonTime || "";

  const subject =
    lesson.subject ||
    lesson.subjectFullName ||
    "Lesson";

  const dateKey = date
    ? formatDateKey(date)
    : "";

  const subgroup =
    Number(lesson.numSubgroup) || 0;

  const id =
    lesson.id ||
    [
      subject,
      dateKey,
      start,
      end,
      subgroup
    ].join("-");

  return {
    ...lesson,
    id,
    subject,
    subjectFullName:
      lesson.subjectFullName ||
      subject,
    type:
      lesson.lessonTypeAbbrev || "",
    time:
      start && end
        ? `${start}-${end}`
        : start,
    startLessonTime: start,
    endLessonTime: end,
    room: getRoom(
      lesson.auditories
    ),
    teacher: getTeacher(
      lesson.employees
    ),
    weekNumber:
      normalizeWeeks(
        lesson.weekNumber
      ),
    numSubgroup: subgroup,
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

export function resolveLessonsForDate(
  schedules,
  date,
  currentWeek = 1,
  subgroup = "all",
  options = {}
) {
  const target = toDate(date);

  if (!target) return [];

  const referenceDate =
    options.referenceDate ||
    options.now ||
    new Date();

  const week = resolveWeek(
    target,
    currentWeek,
    referenceDate
  );

  if (!week) return [];

  const russianDay =
    getRussianDayName(target);

  const lessons =
    Array.isArray(
      schedules?.[russianDay]
    )
      ? schedules[russianDay]
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
  subgroup = "all",
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
  subgroup = "all"
) {
  const russianDay =
    DAY_MAP[weekday] ||
    weekday;

  const lessons =
    Array.isArray(
      schedules?.[russianDay]
    )
      ? schedules[russianDay]
      : [];

  const week = Number(currentWeek);

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
  subgroup = "all",
  currentWeek = 1,
  now = new Date()
) {
  const start =
    startOfDay(startDate);

  if (!start) return null;

  const limit =
    endDate
      ? startOfDay(endDate)
      : new Date(
          start.getTime() +
          370 *
            24 *
            60 *
            60 *
            1000
        );

  if (!limit) return null;

  const currentTime =
    toDate(now);

  if (!currentTime) return null;

  let date =
    new Date(start);

  while (date <= limit) {
    const lessons =
      resolveLessonsForDate(
        schedules,
        date,
        currentWeek,
        subgroup,
        {
          referenceDate: currentTime
        }
      );

    const next =
      lessons.find(lesson => {
        if (!lesson.startDateTime) {
          return false;
        }

        return (
          lesson.startDateTime >
          currentTime
        );
      });

    if (next) {
      return next;
    }

    date.setDate(
      date.getDate() + 1
    );
  }

  return null;
}