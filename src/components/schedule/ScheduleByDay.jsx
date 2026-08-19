import React, {
  useMemo
} from 'react';

import ScheduleLessonCard from './ScheduleLessonCard';

function startOfDay(date) {
  const result =
    new Date(date);

  result.setHours(
    0,
    0,
    0,
    0
  );

  return result;
}

function getWeekdayIndex(date) {
  return date.getDay() === 0
    ? 7
    : date.getDay();
}

function getWeekdayName(date) {
  return date.toLocaleDateString(
    'en-US',
    {
      weekday: 'long'
    }
  );
}

function getDateForWeekday(
  startDate,
  weekday
) {
  const date =
    startOfDay(startDate);

  const current =
    getWeekdayIndex(date);

  const offset =
    weekday - current;

  date.setDate(
    date.getDate() + offset
  );

  return date;
}

function isWithinRange(
  date,
  startDate,
  endDate
) {
  const value =
    startOfDay(date);

  const start =
    startOfDay(
      new Date(startDate)
    );

  const end =
    startOfDay(
      new Date(endDate)
    );

  return (
    value >= start &&
    value <= end
  );
}

function getLessonWeekMatch(
  lesson,
  weekNumber
) {
  const value =
    lesson?.weekNumber ??
    lesson?.weeks ??
    lesson?.week;

  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return true;
  }

  if (
    Array.isArray(value)
  ) {
    return value.some(
      week =>
        Number(week) ===
        weekNumber
    );
  }

  if (
    typeof value === 'string'
  ) {
    const normalized =
      value.toLowerCase();

    if (
      normalized.includes(
        'always'
      )
    ) {
      return true;
    }

    if (
      normalized.includes(
        'odd'
      )
    ) {
      return (
        weekNumber % 2 === 1
      );
    }

    if (
      normalized.includes(
        'even'
      )
    ) {
      return (
        weekNumber % 2 === 0
      );
    }

    return (
      Number(value) ===
      weekNumber
    );
  }

  return (
    Number(value) ===
    weekNumber
  );
}

function getWeekNumberForDate(
  date,
  currentWeek,
  referenceDate
) {
  const target =
    startOfDay(date);

  const reference =
    startOfDay(
      new Date(referenceDate)
    );

  const difference =
    Math.floor(
      (
        target.getTime() -
        reference.getTime()
      ) /
        86400000
    );

  const weeks =
    Math.floor(
      difference / 7
    );

  return (
    ((currentWeek - 1 + weeks) %
      4 +
      4) %
      4
  ) + 1;
}

function getLessonsForWeekday(
  schedules,
  date,
  subgroup
) {
  const weekday =
    getWeekdayIndex(date);

  const keyCandidates = [
    String(weekday),
    weekday,
    String(
      weekday - 1
    )
  ];

  let lessons = [];

  for (
    const key of keyCandidates
  ) {
    const value =
      schedules?.[key];

    if (
      Array.isArray(value)
    ) {
      lessons = value;
      break;
    }
  }

  return lessons.filter(
    lesson => {
      if (
        !lesson ||
        typeof lesson !==
          'object'
      ) {
        return false;
      }

      if (
        !getLessonWeekMatch(
          lesson,
          date.weekNumber
        )
      ) {
        return false;
      }

      const lessonSubgroup =
        Number(
          lesson.numSubgroup ??
            lesson.subgroup ??
            0
        );

      if (
        !lessonSubgroup ||
        !subgroup
      ) {
        return true;
      }

      return (
        lessonSubgroup ===
        Number(subgroup)
      );
    }
  );
}

export default function ScheduleByDay({
  schedules,
  currentWeek,
  scheduleStartDate,
  scheduleEndDate,
  subgroup,
  onLessonClick,
  now
}) {
  const sections =
    useMemo(() => {
      if (
        !scheduleStartDate ||
        !scheduleEndDate
      ) {
        return [];
      }

      const referenceDate =
        new Date(
          scheduleStartDate
        );

      const weekStart =
        startOfDay(
          now || new Date()
        );

      weekStart.setDate(
        weekStart.getDate() -
          (
            getWeekdayIndex(
              weekStart
            ) - 1
          )
      );

      return Array.from(
        {
          length: 7
        },
        (_, index) => {
          const date =
            new Date(
              weekStart
            );

          date.setDate(
            date.getDate() +
              index
          );

          if (
            !isWithinRange(
              date,
              scheduleStartDate,
              scheduleEndDate
            )
          ) {
            return {
              date,
              lessons: []
            };
          }

          const weekNumber =
            getWeekNumberForDate(
              date,
              currentWeek,
              referenceDate
            );

          date.weekNumber =
            weekNumber;

          const lessons =
            getLessonsForWeekday(
              schedules,
              date,
              subgroup
            );

          return {
            date,
            lessons
          };
        }
      );
    }, [
      schedules,
      currentWeek,
      scheduleStartDate,
      scheduleEndDate,
      subgroup,
      now
    ]);

  return (
    <div className="space-y-6">
      {sections.map(
        section => {
          const dayName =
            getWeekdayName(
              section.date
            );

          return (
            <section
              key={dayName}
            >
              <div className="mb-3 px-1">
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  {dayName}
                </h2>

                <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                  Week{' '}
                  {
                    section
                      .date
                      .weekNumber
                  }
                </p>
              </div>

              {section.lessons
                .length > 0 ? (
                <div className="overflow-hidden rounded-2xl bg-[var(--surface-glass)]">
                  {section.lessons.map(
                    (
                      lesson,
                      index
                    ) => (
                      <ScheduleLessonCard
                        key={
                          lesson.id ||
                          `${dayName}-${index}`
                        }
                        item={
                          lesson
                        }
                        now={
                          now
                        }
                        index={
                          index
                        }
                        onLessonClick={
                          onLessonClick
                        }
                      />
                    )
                  )}
                </div>
              ) : (
                <div className="rounded-2xl bg-[var(--surface-glass)] px-4 py-5">
                  <p className="text-xs text-[var(--text-secondary)]">
                    No classes
                  </p>
                </div>
              )}
            </section>
          );
        }
      )}
    </div>
  );
}