const RUSSIAN_DAYS = [
  "Воскресенье",
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота"
];

const ENGLISH_TO_RUSSIAN = {
  Sun: "Воскресенье",
  Mon: "Понедельник",
  Tue: "Вторник",
  Wed: "Среда",
  Thu: "Четверг",
  Fri: "Пятница",
  Sat: "Суббота",

  Sunday: "Воскресенье",
  Monday: "Понедельник",
  Tuesday: "Вторник",
  Wednesday: "Среда",
  Thursday: "Четверг",
  Friday: "Пятница",
  Saturday: "Суббота"
};

function getRussianDay(date) {
  if (
    !(date instanceof Date) ||
    Number.isNaN(date.getTime())
  ) {
    return null;
  }

  return RUSSIAN_DAYS[
    date.getDay()
  ];
}

function matchesWeek(
  lesson,
  currentWeek
) {
  const weeks =
    Array.isArray(
      lesson?.weekNumber
    )
      ? lesson.weekNumber
          .map(Number)
          .filter(Number.isInteger)
      : [];

  if (weeks.length === 0) {
    return true;
  }

  return weeks.includes(
    Number(currentWeek)
  );
}

function matchesSubgroup(
  lesson,
  subgroup
) {
  const lessonSubgroup =
    Number(
      lesson?.numSubgroup
    );

  /*
   * 0 means the lesson is not split.
   */
  if (
    lessonSubgroup === 0 ||
    !Number.isInteger(
      lessonSubgroup
    )
  ) {
    return true;
  }

  return (
    lessonSubgroup ===
    Number(subgroup)
  );
}

function timeToMinutes(
  value
) {
  const match =
    String(value || "").match(
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

function getTeacher(
  employees
) {
  if (
    !Array.isArray(employees) ||
    !employees.length
  ) {
    return "";
  }

  const employee =
    employees[0];

  return [
    employee.firstName,
    employee.middleName,
    employee.lastName
  ]
    .filter(Boolean)
    .join(" ");
}

function getRoom(
  auditories
) {
  if (
    !Array.isArray(auditories)
  ) {
    return "";
  }

  return auditories[0] || "";
}

export function normalizeLesson(
  lesson = {}
) {
  const start =
    lesson.startLessonTime || "";

  const end =
    lesson.endLessonTime || "";

  const subject =
    lesson.subject ||
    lesson.subjectFullName ||
    "Lesson";

  const room =
    getRoom(
      lesson.auditories
    );

  const teacher =
    getTeacher(
      lesson.employees
    );

  const id =
    lesson.id ||
    [
      subject,
      start,
      end,
      room,
      lesson.numSubgroup
    ].join("-");

  return {
    ...lesson,

    id,

    subject,

    subjectFullName:
      lesson.subjectFullName ||
      subject,

    type:
      lesson.lessonTypeAbbrev ||
      "",

    time:
      start && end
        ? `${start}-${end}`
        : start,

    startLessonTime: start,

    endLessonTime: end,

    room,

    teacher,

    weekNumber:
      Array.isArray(
        lesson.weekNumber
      )
        ? lesson.weekNumber
        : [],

    numSubgroup:
      Number(
        lesson.numSubgroup
      ) || 0
  };
}

export function resolveLessonsForDate(
  schedules,
  date,
  currentWeek,
  subgroup = 1
) {
  if (
    !schedules ||
    typeof schedules !== "object"
  ) {
    return [];
  }

  const russianDay =
    getRussianDay(date);

  if (!russianDay) {
    return [];
  }

  const lessons =
    schedules[
      russianDay
    ];

  if (!Array.isArray(lessons)) {
    return [];
  }

  return lessons
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
}

export function resolveLessonsForWeekday(
  schedules,
  weekday,
  currentWeek,
  subgroup = 1
) {
  const russianDay =
    ENGLISH_TO_RUSSIAN[
      weekday
    ] || weekday;

  if (
    !schedules ||
    !Array.isArray(
      schedules[russianDay]
    )
  ) {
    return {
      [currentWeek]: []
    };
  }

  const lessons =
    schedules[russianDay]
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
    [currentWeek]: lessons
  };
}

export function getRussianDayName(
  date
) {
  return getRussianDay(date);
}