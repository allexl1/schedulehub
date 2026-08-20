import {
  formatDateKey,
  resolveLessonsForDate
} from './scheduleResolver';

const DAYS = [
  {
    key: 'Sunday',
    index: 0
  },
  {
    key: 'Monday',
    index: 1
  },
  {
    key: 'Tuesday',
    index: 2
  },
  {
    key: 'Wednesday',
    index: 3
  },
  {
    key: 'Thursday',
    index: 4
  },
  {
    key: 'Friday',
    index: 5
  },
  {
    key: 'Saturday',
    index: 6
  }
];

function toDate(value) {
  if (value instanceof Date) {
    const date =
      new Date(value);

    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date;
  }

  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const text =
    String(value).trim();

  if (!text) {
    return null;
  }

  const dotted =
    text.match(
      /^(\d{2})\.(\d{2})\.(\d{4})$/
    );

  if (dotted) {
    const date =
      new Date(
        Number(dotted[3]),
        Number(dotted[2]) - 1,
        Number(dotted[1])
      );

    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date;
  }

  const iso =
    text.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (iso) {
    const date =
      new Date(
        Number(iso[1]),
        Number(iso[2]) - 1,
        Number(iso[3])
      );

    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date;
  }

  const date =
    new Date(text);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}

function startOfDay(value) {
  const date =
    toDate(value);

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

function addDays(
  value,
  amount
) {
  const date =
    startOfDay(value);

  if (!date) {
    return null;
  }

  date.setDate(
    date.getDate() +
      amount
  );

  return date;
}

function getWeekdayIndex(
  date
) {
  return date.getDay();
}

function getLessonKey(
  lesson
) {
  const subject =
    lesson?.subject ||
    lesson?.subjectFullName ||
    '';

  const start =
    lesson?.startLessonTime ||
    '';

  const end =
    lesson?.endLessonTime ||
    '';

  const room =
    lesson?.room ||
    lesson?.auditory ||
    '';

  const subgroup =
    Number(
      lesson?.numSubgroup
    ) || 0;

  const weeks = Array.isArray(
    lesson?.weekNumber
  )
    ? lesson.weekNumber
        .map(Number)
        .sort()
        .join(',')
    : String(
        lesson?.weekNumber ??
          ''
      );

  return [
    subject,
    start,
    end,
    room,
    subgroup,
    weeks
  ].join('|');
}

function isDateSpecificLesson(
  lesson
) {
  return Boolean(
    lesson?.dateLesson
  );
}

function getCycleDates({
  startDate,
  endDate
}) {
  const start =
    startOfDay(startDate);

  const end =
    startOfDay(endDate);

  if (
    !start ||
    !end ||
    start > end
  ) {
    return [];
  }

  const dates = [];

  let date =
    new Date(start);

  const maximumDays =
    28;

  while (
    date <= end &&
    dates.length <
      maximumDays
  ) {
    dates.push(
      new Date(date)
    );

    const next =
      addDays(date, 1);

    if (!next) {
      break;
    }

    date = next;
  }

  return dates;
}

function sortLessons(
  lessons
) {
  return [...lessons].sort(
    (a, b) => {
      const first =
        String(
          a?.startLessonTime ||
            ''
        );

      const second =
        String(
          b?.startLessonTime ||
            ''
        );

      return first.localeCompare(
        second,
        undefined,
        {
          numeric: true
        }
      );
    }
  );
}

export function getByDaySchedule({
  schedules,
  startDate,
  endDate,
  referenceDate = new Date(),
  subgroup = 'all'
}) {
  const cycleDates =
    getCycleDates({
      startDate,
      endDate
    });

  const days = DAYS.map(
    day => ({
      key: day.key,
      weekday: day.index,
      lessons: []
    })
  );

  if (
    cycleDates.length === 0
  ) {
    return days;
  }

  const seen =
    new Map();

  cycleDates.forEach(
    date => {
      const weekday =
        getWeekdayIndex(date);

      const day =
        days.find(
          item =>
            item.weekday ===
            weekday
        );

      if (!day) {
        return;
      }

      const lessons =
        resolveLessonsForDate(
          schedules,
          date,
          undefined,
          subgroup,
          {
            referenceDate,
            startDate,
            endDate
          }
        );

      if (
        !Array.isArray(
          lessons
        )
      ) {
        return;
      }

      lessons.forEach(
        lesson => {
          if (
            isDateSpecificLesson(
              lesson
            )
          ) {
            return;
          }

          const key =
            getLessonKey(
              lesson
            );

          if (!key) {
            return;
          }

          if (
            !seen.has(
              day.weekday
            )
          ) {
            seen.set(
              day.weekday,
              new Set()
            );
          }

          const weekdaySeen =
            seen.get(
              day.weekday
            );

          if (
            weekdaySeen.has(
              key
            )
          ) {
            return;
          }

          weekdaySeen.add(
            key
          );

          day.lessons.push(
            lesson
          );
        }
      );
    }
  );

  return days
    .filter(
      day =>
        day.lessons.length >
        0
    )
    .map(day => ({
      ...day,
      lessons:
        sortLessons(
          day.lessons
        )
    }));
}

export function getByDayScheduleForWeek(
  options
) {
  const {
    schedules,
    startDate,
    endDate,
    referenceDate =
      new Date(),
    subgroup = 'all',
    weekNumber
  } = options;

  const cycleDates =
    getCycleDates({
      startDate,
      endDate
    });

  const result =
    DAYS.map(day => ({
      key: day.key,
      weekday: day.index,
      lessons: []
    }));

  if (
    cycleDates.length === 0
  ) {
    return result;
  }

  cycleDates.forEach(
    date => {
      const weekday =
        getWeekdayIndex(date);

      const target =
        result.find(
          day =>
            day.weekday ===
            weekday
        );

      if (!target) {
        return;
      }

      const lessons =
        resolveLessonsForDate(
          schedules,
          date,
          weekNumber,
          subgroup,
          {
            referenceDate,
            startDate,
            endDate
          }
        );

      if (
        !Array.isArray(
          lessons
        )
      ) {
        return;
      }

      lessons.forEach(
        lesson => {
          if (
            isDateSpecificLesson(
              lesson
            )
          ) {
            return;
          }

          const key =
            getLessonKey(
              lesson
            );

          if (
            !target.lessons.some(
              existing =>
                getLessonKey(
                  existing
                ) === key
            )
          ) {
            target.lessons.push(
              lesson
            );
          }
        }
      );
    }
  );

  return result
    .filter(
      day =>
        day.lessons.length >
        0
    )
    .map(day => ({
      ...day,
      lessons:
        sortLessons(
          day.lessons
        )
    }));
}