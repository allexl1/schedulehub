import {
  formatDateKey,
  resolveLessonsForDate
} from './scheduleResolver';

const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(value) {
  if (value instanceof Date) {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const text = String(value).trim();

  if (!text) {
    return null;
  }

  const dotted = text.match(
    /^(\d{2})\.(\d{2})\.(\d{4})$/
  );

  if (dotted) {
    const date = new Date(
      Number(dotted[3]),
      Number(dotted[2]) - 1,
      Number(dotted[1])
    );

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  const iso = text.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (iso) {
    const date = new Date(
      Number(iso[1]),
      Number(iso[2]) - 1,
      Number(iso[3])
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

function addDays(value, amount) {
  const date = startOfDay(value);

  if (!date) {
    return null;
  }

  date.setDate(
    date.getDate() + amount
  );

  return date;
}

function isSameOrBefore(
  left,
  right
) {
  return (
    left.getTime() <=
    right.getTime()
  );
}

function getAcademicWeek(
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
   * Exact Swift WeekSchedule behavior:
   *
   * September 1 is the academic-year start.
   * Before July, dates before September belong
   * to the previous academic year.
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

  const firstWeek =
    new Date(firstDay);

  const firstWeekday =
    firstWeek.getDay();

  firstWeek.setDate(
    firstWeek.getDate() +
      (
        firstWeekday === 0
          ? -6
          : 1 - firstWeekday
      )
  );

  const targetWeek =
    new Date(target);

  const targetWeekday =
    targetWeek.getDay();

  targetWeek.setDate(
    targetWeek.getDate() +
      (
        targetWeekday === 0
          ? -6
          : 1 - targetWeekday
      )
  );

  const weekDistance =
    Math.round(
      (
        targetWeek.getTime() -
        firstWeek.getTime()
      ) /
        (7 * DAY_MS)
    );

  return (
    Math.abs(weekDistance) % 4
  ) + 1;
}

/**
 * Web equivalent of Swift:
 *
 * WeekSchedule.schedule(
 *   starting:now:calendar:universityCalendar:
 * )
 *
 * It:
 * - starts at a real date
 * - respects schedule start/end
 * - calculates the academic week
 * - resolves lessons for the real date
 * - returns only days containing lessons
 */
export function getContinuousScheduleDays({
  schedules,
  startDate,
  endDate,
  startingDate,
  now = new Date(),
  subgroup = 'all',
  limit = 12
}) {
  const rangeStart =
    startOfDay(startDate);

  const rangeEnd =
    startOfDay(endDate);

  let date =
    startOfDay(startingDate);

  if (
    !rangeStart ||
    !rangeEnd ||
    !date ||
    rangeStart > rangeEnd ||
    limit <= 0
  ) {
    return [];
  }

  const days = [];

  while (
    isSameOrBefore(
      date,
      rangeEnd
    ) &&
    days.length < limit
  ) {
    if (date >= rangeStart) {
      const weekNumber =
        getAcademicWeek(
          date,
          now
        );

      if (weekNumber) {
        const lessons =
          resolveLessonsForDate(
            schedules,
            date,
            weekNumber,
            subgroup,
            {
              referenceDate: now,
              startDate: rangeStart,
              endDate: rangeEnd
            }
          );

        if (
          Array.isArray(lessons) &&
          lessons.length > 0
        ) {
          days.push({
            date,
            dateKey:
              formatDateKey(date),
            weekNumber,
            lessons
          });
        }
      }
    }

    const next =
      addDays(date, 1);

    if (!next) {
      break;
    }

    date = next;
  }

  return days;
}

export function getInitialContinuousSchedule({
  schedules,
  startDate,
  endDate,
  now = new Date(),
  subgroup = 'all',
  limit = 12
}) {
  const yesterday =
    addDays(now, -1);

  return getContinuousScheduleDays({
    schedules,
    startDate,
    endDate,
    startingDate: yesterday,
    now,
    subgroup,
    limit
  });
}

export function getMoreContinuousSchedule({
  schedules,
  startDate,
  endDate,
  lastDate,
  now = new Date(),
  subgroup = 'all',
  limit = 10
}) {
  const nextDate =
    addDays(lastDate, 1);

  return getContinuousScheduleDays({
    schedules,
    startDate,
    endDate,
    startingDate: nextDate,
    now,
    subgroup,
    limit
  });
}