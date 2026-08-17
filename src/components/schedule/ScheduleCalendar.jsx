import React, { useMemo, useState } from 'react';
import {
  getAcademicWeekForDate,
  resolveLessonsForDate
} from '../../utils/scheduleResolver';

const WEEKDAY_LABELS = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun'
];

const MONTH_FORMATTER = new Intl.DateTimeFormat(
  'en-US',
  {
    month: 'long',
    year: 'numeric'
  }
);

const DATE_FORMATTER = new Intl.DateTimeFormat(
  'en-US',
  {
    month: 'short',
    day: 'numeric'
  }
);

function startOfMonth(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  );
}

function addMonths(date, amount) {
  return new Date(
    date.getFullYear(),
    date.getMonth() + amount,
    1
  );
}

function addDays(date, amount) {
  const result = new Date(date);
  result.setDate(
    result.getDate() + amount
  );
  return result;
}

function startOfCalendarGrid(date) {
  const monthStart = startOfMonth(date);
  const weekday =
    monthStart.getDay() === 0
      ? 6
      : monthStart.getDay() - 1;

  return addDays(
    monthStart,
    -weekday
  );
}

function sameDate(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dateKey(date) {
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

function isValidDate(value) {
  return (
    value instanceof Date &&
    !Number.isNaN(
      value.getTime()
    )
  );
}

function getMonthDays(monthDate) {
  const first = startOfCalendarGrid(
    monthDate
  );

  return Array.from(
    { length: 42 },
    (_, index) =>
      addDays(first, index)
  );
}

function getLessonCount(
  schedules,
  date,
  subgroup,
  referenceDate
) {
  const week =
    getAcademicWeekForDate(
      date,
      referenceDate
    );

  if (!week) {
    return 0;
  }

  const lessons =
    resolveLessonsForDate(
      schedules,
      date,
      week,
      subgroup,
      {
        referenceDate
      }
    );

  return Array.isArray(lessons)
    ? lessons.length
    : 0;
}

export default function ScheduleCalendar({
  schedules,
  selectedDate,
  subgroup = 1,
  referenceDate = new Date(),
  onSelectDate
}) {
  const [visibleMonth, setVisibleMonth] =
    useState(() =>
      startOfMonth(
        selectedDate
      )
    );

  const days = useMemo(
    () =>
      getMonthDays(
        visibleMonth
      ),
    [visibleMonth]
  );

  const lessonCounts = useMemo(() => {
    const counts = {};

    days.forEach(date => {
      counts[dateKey(date)] =
        getLessonCount(
          schedules,
          date,
          subgroup,
          referenceDate
        );
    });

    return counts;
  }, [
    schedules,
    days,
    subgroup,
    referenceDate
  ]);

  const goPreviousMonth = () => {
    setVisibleMonth(
      addMonths(
        visibleMonth,
        -1
      )
    );
  };

  const goNextMonth = () => {
    setVisibleMonth(
      addMonths(
        visibleMonth,
        1
      )
    );
  };

  const goToday = () => {
    const today =
      startOfMonth(
        referenceDate
      );

    setVisibleMonth(today);
    onSelectDate?.(
      new Date(referenceDate)
    );
  };

  const selectDate = date => {
    if (!isValidDate(date)) {
      return;
    }

    onSelectDate?.(
      new Date(date)
    );
  };

  return (
    <section
      className="space-y-3"
      aria-label="Schedule calendar"
    >
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goPreviousMonth}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-glass)] text-sm font-bold text-[var(--text-secondary)] transition-all active:scale-95"
          aria-label="Previous month"
        >
          ‹
        </button>

        <div className="min-w-0 text-center">
          <h3 className="truncate text-sm font-extrabold text-[var(--text-primary)]">
            {MONTH_FORMATTER.format(
              visibleMonth
            )}
          </h3>

          <button
            type="button"
            onClick={goToday}
            className="mt-0.5 text-[10px] font-bold text-[#2997ff]"
          >
            Today
          </button>
        </div>

        <button
          type="button"
          onClick={goNextMonth}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-glass)] text-sm font-bold text-[var(--text-secondary)] transition-all active:scale-95"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="rounded-2xl bg-[var(--surface-glass)] p-3">
        <div className="mb-2 grid grid-cols-7 gap-1">
          {WEEKDAY_LABELS.map(label => (
            <div
              key={label}
              className="py-1 text-center text-[9px] font-bold uppercase tracking-wide text-[var(--text-secondary)]"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map(date => {
            const key =
              dateKey(date);

            const selected =
              sameDate(
                date,
                selectedDate
              );

            const today =
              sameDate(
                date,
                referenceDate
              );

            const inCurrentMonth =
              date.getMonth() ===
              visibleMonth.getMonth();

            const lessonCount =
              lessonCounts[key] || 0;

            return (
              <button
                key={key}
                type="button"
                onClick={() =>
                  selectDate(date)
                }
                className={`relative flex min-h-[48px] flex-col items-center justify-center rounded-xl px-1 py-1.5 transition-all active:scale-95 ${
                  selected
                    ? 'bg-[#2997ff] text-white shadow-sm'
                    : inCurrentMonth
                      ? 'text-[var(--text-primary)] hover:bg-white/5'
                      : 'text-[var(--text-secondary)] opacity-35'
                }`}
                aria-label={`${DATE_FORMATTER.format(
                  date
                )}${lessonCount ? `, ${lessonCount} classes` : ''}`}
                aria-pressed={selected}
              >
                <span
                  className={`text-xs font-bold ${
                    today && !selected
                      ? 'text-[#2997ff]'
                      : ''
                  }`}
                >
                  {date.getDate()}
                </span>

                {lessonCount > 0 && (
                  <span
                    className={`mt-1 min-w-[16px] rounded-full px-1 text-[8px] font-extrabold leading-4 ${
                      selected
                        ? 'bg-white/20 text-white'
                        : 'bg-[#2997ff]/10 text-[#2997ff]'
                    }`}
                  >
                    {lessonCount}
                  </span>
                )}

                {today && (
                  <span
                    className={`absolute bottom-1 h-1 w-1 rounded-full ${
                      selected
                        ? 'bg-white'
                        : 'bg-[#2997ff]'
                    }`}
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-1 text-[10px] text-[var(--text-secondary)]">
        Select a date to view its schedule.
      </div>
    </section>
  );
}