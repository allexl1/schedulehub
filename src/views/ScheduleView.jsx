import React, { useEffect, useMemo, useState } from 'react';
import PersonalEventModal from '../components/schedule/PersonalEventModal';

import {
  getClassStatus,
  getMinutesUntilEnd,
  parseTimeRange
} from '../utils/time';

import {
  getAcademicWeekForDateMondayBased,
  resolveWeek,
  normalizeLesson
} from '../utils/scheduleResolver';

const DAYS = [
  { key: 'Mon', label: 'Mon' },
  { key: 'Tue', label: 'Tue' },
  { key: 'Wed', label: 'Wed' },
  { key: 'Thu', label: 'Thu' },
  { key: 'Fri', label: 'Fri' },
  { key: 'Sat', label: 'Sat' }
];

const DAY_NAMES = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday'
};

function toDateOnly(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    return new Date(
      value.getFullYear(),
      value.getMonth(),
      value.getDate()
    );
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    const isoMatch = trimmed.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

    if (isoMatch) {
      return new Date(
        Number(isoMatch[1]),
        Number(isoMatch[2]) - 1,
        Number(isoMatch[3])
      );
    }

    const bsuirMatch = trimmed.match(
      /^(\d{2})\.(\d{2})\.(\d{4})/
    );

    if (bsuirMatch) {
      return new Date(
        Number(bsuirMatch[3]),
        Number(bsuirMatch[2]) - 1,
        Number(bsuirMatch[1])
      );
    }

    const parsed = new Date(trimmed);

    if (!Number.isNaN(parsed.getTime())) {
      return new Date(
        parsed.getFullYear(),
        parsed.getMonth(),
        parsed.getDate()
      );
    }
  }

  return null;
}

function dateKey(date) {
  const normalized = toDateOnly(date);

  if (!normalized) {
    return null;
  }

  const year = normalized.getFullYear();
  const month = String(
    normalized.getMonth() + 1
  ).padStart(2, '0');
  const day = String(
    normalized.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getDayKey(date) {
  const day = date.getDay();

  if (day === 0) {
    return 'Sun';
  }

  return DAYS[day - 1]?.key || 'Mon';
}

function getMonday(date) {
  const normalized = toDateOnly(date);

  if (!normalized) {
    return null;
  }

  const day = normalized.getDay();

  const offset =
    day === 0
      ? -6
      : 1 - day;

  normalized.setDate(
    normalized.getDate() + offset
  );

  return normalized;
}

function addDays(date, amount) {
  const result = toDateOnly(date);

  if (!result) {
    return null;
  }

  result.setDate(
    result.getDate() + amount
  );

  return result;
}

function isDateWithinRange(
  date,
  startDate,
  endDate
) {
  const target = toDateOnly(date);

  if (!target) {
    return false;
  }

  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate);

  if (start && target < start) {
    return false;
  }

  if (end && target > end) {
    return false;
  }

  return true;
}

function formatDateShort(date) {
  return new Intl.DateTimeFormat(
    'en-GB',
    {
      day: '2-digit',
      month: '2-digit'
    }
  ).format(date);
}

function formatDateLong(date) {
  return new Intl.DateTimeFormat(
    'en-GB',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }
  ).format(date);
}

function formatMonthYear(date) {
  return new Intl.DateTimeFormat(
    'en-GB',
    {
      month: 'long',
      year: 'numeric'
    }
  ).format(date);
}

function sameDate(a, b) {
  const keyA = dateKey(a);
  const keyB = dateKey(b);

  return Boolean(
    keyA &&
    keyB &&
    keyA === keyB
  );
}

function parseStartMinutes(item) {
  const time =
    item?.startLessonTime ||
    parseTimeRange(item?.time)?.startTime ||
    '';

  const match =
    String(time).match(
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

function getTermStart(scheduleData) {
  return (
    scheduleData?.startDate ||
    scheduleData?.data?.startDate ||
    null
  );
}

function getTermEnd(scheduleData) {
  return (
    scheduleData?.endDate ||
    scheduleData?.data?.endDate ||
    null
  );
}

function getInitialDate(scheduleData) {
  const now = new Date();

  const termStart = toDateOnly(
    getTermStart(scheduleData)
  );

  const termEnd = toDateOnly(
    getTermEnd(scheduleData)
  );

  if (
    termStart &&
    now < termStart
  ) {
    return termStart;
  }

  if (
    termEnd &&
    now > termEnd
  ) {
    return termEnd;
  }

  return toDateOnly(now);
}

export default function ScheduleView({
  scheduleData,
  subgroup = 1,
  loading = false,
  onLessonClick
}) {
  const [now, setNow] = useState(
    () => new Date()
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  /*
   * --------------------------------------------------------------------------
   * Academic term
   * --------------------------------------------------------------------------
   */

  const termStart = useMemo(
    () =>
      toDateOnly(
        getTermStart(scheduleData)
      ),
    [scheduleData]
  );

  const termEnd = useMemo(
    () =>
      toDateOnly(
        getTermEnd(scheduleData)
      ),
    [scheduleData]
  );

  /*
   * --------------------------------------------------------------------------
   * Selected calendar date
   *
   * IMPORTANT:
   *
   * This is now the primary state.
   *
   * We do NOT select "Thursday" and then ask for all Thursdays.
   * We select an actual date such as:
   *
   *   2026-09-10
   *
   * and the resolver determines what happens on that date.
   * --------------------------------------------------------------------------
   */

  const [selectedDate, setSelectedDate] =
    useState(() =>
      getInitialDate(scheduleData)
    );

  /*
   * If a completely new timetable is loaded, make sure the selected
   * date belongs to that timetable's academic term.
   */
  useEffect(() => {
    const initialDate =
      getInitialDate(scheduleData);

    if (initialDate) {
      setSelectedDate(initialDate);
    }
  }, [
    scheduleData?.startDate,
    scheduleData?.endDate,
    scheduleData?.studentGroup
  ]);

  const normalizedSelectedDate =
    toDateOnly(selectedDate) ||
    getInitialDate(scheduleData) ||
    new Date();

  const selectedDateKey =
    dateKey(normalizedSelectedDate);

  const selectedDayKey =
    getDayKey(normalizedSelectedDate);

  const selectedDayLabel =
    DAY_NAMES[selectedDayKey] ||
    'Sunday';

  /*
   * --------------------------------------------------------------------------
   * Week navigation
   * --------------------------------------------------------------------------
   */

  const weekStart = useMemo(
    () =>
      getMonday(
        normalizedSelectedDate
      ),
    [selectedDateKey]
  );

  const weekDates = useMemo(() => {
    if (!weekStart) {
      return [];
    }

    const dates = [];

    for (let index = 0; index < 7; index += 1) {
      const date = addDays(
        weekStart,
        index
      );

      if (!date) {
        continue;
      }

      const dayKey =
        getDayKey(date);

      /*
       * The BSUIR timetable is Monday-Saturday.
       * Sunday is intentionally not rendered as a schedule tab.
       */
      if (dayKey === 'Sun') {
        continue;
      }

      /*
       * Don't render dates outside the academic term when the API
       * gives us explicit term boundaries.
       */
      if (
        !isDateWithinRange(
          date,
          termStart,
          termEnd
        )
      ) {
        continue;
      }

      dates.push(date);
    }

    return dates;
  }, [
    weekStart,
    termStart,
    termEnd
  ]);

  const moveWeek = (amount) => {
    const currentMonday =
      getMonday(
        normalizedSelectedDate
      );

    if (!currentMonday) {
      return;
    }

    const nextMonday =
      addDays(
        currentMonday,
        amount * 7
      );

    if (!nextMonday) {
      return;
    }

    /*
     * Pick the same weekday where possible.
     */
    const selectedDayIndex =
      normalizedSelectedDate.getDay() === 0
        ? 0
        : normalizedSelectedDate.getDay() - 1;

    let nextDate =
      addDays(
        nextMonday,
        selectedDayIndex
      );

    /*
     * Clamp to the academic term.
     */
    if (
      termStart &&
      nextDate < termStart
    ) {
      nextDate = termStart;
    }

    if (
      termEnd &&
      nextDate > termEnd
    ) {
      nextDate = termEnd;
    }

    setSelectedDate(nextDate);
  };

  const handleGoToday = () => {
    const today =
      toDateOnly(new Date());

    if (!today) {
      return;
    }

    if (
      termStart &&
      today < termStart
    ) {
      setSelectedDate(termStart);
      return;
    }

    if (
      termEnd &&
      today > termEnd
    ) {
      setSelectedDate(termEnd);
      return;
    }

    setSelectedDate(today);
  };

  /*
   * --------------------------------------------------------------------------
   * Resolve the COMPLETE WEEK using calendar dates.
   *
   * This is the important change.
   *
   * resolveWeek() calculates the academic week separately for every date.
   *
   * For example:
   *
   * 2026-09-08 -> academic week 2
   * 2026-09-09 -> academic week 2
   * 2026-09-10 -> academic week 2
   *
   * and then applies:
   *
   *   date range
   *   weekday
   *   weekNumber
   *   subgroup
   *   sorting
   *
   * against the actual BSUIR data.
   * --------------------------------------------------------------------------
   */

  const resolvedWeek = useMemo(() => {
    if (
      !scheduleData ||
      !weekStart
    ) {
      return [];
    }

    return resolveWeek(
      scheduleData,
      weekStart,
      subgroup
    );
  }, [
    scheduleData,
    weekStart,
    subgroup
  ]);

  /*
   * --------------------------------------------------------------------------
   * Selected-day lessons
   * --------------------------------------------------------------------------
   */

  const selectedDayData = useMemo(() => {
    const matchingDay =
      resolvedWeek.find(
        (day) =>
          day.dateKey ===
          selectedDateKey
      );

    if (matchingDay) {
      return matchingDay;
    }

    /*
     * Defensive fallback.
     */
    return {
      date:
        normalizedSelectedDate,
      dateKey:
        selectedDateKey,
      dayName:
        selectedDayLabel,
      academicWeek:
        getAcademicWeekForDateMondayBased(
          normalizedSelectedDate,
          termStart
        ),
      lessons: [],
      normalizedLessons: [],
      count: 0
    };
  }, [
    resolvedWeek,
    selectedDateKey,
    normalizedSelectedDate,
    selectedDayLabel,
    termStart
  ]);

  /*
   * --------------------------------------------------------------------------
   * Personal events
   * --------------------------------------------------------------------------
   */

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [editingEvent, setEditingEvent] =
    useState(null);

  const [personalEvents, setPersonalEvents] =
    useState(() => {
      try {
        const saved =
          localStorage.getItem(
            'sh_personal_events'
          );

        return saved
          ? JSON.parse(saved)
          : [];
      } catch {
        return [];
      }
    });

  const handleOpenCreateModal = () => {
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (event) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
  };

  const handleSaveEvent = (savedEvent) => {
    const exists =
      personalEvents.some(
        (event) =>
          event.id ===
          savedEvent.id
      );

    const updated = exists
      ? personalEvents.map((event) =>
          event.id ===
          savedEvent.id
            ? savedEvent
            : event
        )
      : [
          ...personalEvents,
          savedEvent
        ];

    setPersonalEvents(updated);

    try {
      localStorage.setItem(
        'sh_personal_events',
        JSON.stringify(updated)
      );
    } catch (error) {
      console.error(
        'Failed to save personal events:',
        error
      );
    }
  };

  const handleDeleteEvent = (
    eventId
  ) => {
    const updated =
      personalEvents.filter(
        (event) =>
          event.id !== eventId
      );

    setPersonalEvents(updated);

    try {
      localStorage.setItem(
        'sh_personal_events',
        JSON.stringify(updated)
      );
    } catch (error) {
      console.error(
        'Failed to delete personal event:',
        error
      );
    }
  };

  /*
   * Personal events historically use a weekday field.
   *
   * We support both:
   *
   *   event.date = "2026-09-10"
   *
   * and the existing:
   *
   *   event.day = "Thu"
   *
   * so existing personal events do not disappear.
   */
  const dayPersonalEvents =
    personalEvents.filter(
      (event) => {
        if (
          event.date &&
          dateKey(
            toDateOnly(event.date)
          ) === selectedDateKey
        ) {
          return true;
        }

        return (
          event.day ===
          selectedDayKey
        );
      }
    );

  /*
   * --------------------------------------------------------------------------
   * Merge + normalize + sort
   * --------------------------------------------------------------------------
   */

  const normalizedAcademicLessons =
    selectedDayData.normalizedLessons?.length
      ? selectedDayData.normalizedLessons
      : selectedDayData.lessons.map(
          (lesson) =>
            normalizeLesson(
              lesson,
              normalizedSelectedDate
            )
        );

  const mergedSchedule = [
    ...normalizedAcademicLessons,
    ...dayPersonalEvents
  ];

  const sortedSchedule =
    [...mergedSchedule].sort(
      (a, b) => {
        const timeDifference =
          parseStartMinutes(a) -
          parseStartMinutes(b);

        if (timeDifference !== 0) {
          return timeDifference;
        }

        return String(
          a.subject || ''
        ).localeCompare(
          String(
            b.subject || ''
          )
        );
      }
    );

  /*
   * --------------------------------------------------------------------------
   * Status
   * --------------------------------------------------------------------------
   */

  const selectedDateIsToday =
    sameDate(
      normalizedSelectedDate,
      now
    );

  let foundNext = false;

  const processedSchedule =
    sortedSchedule.map((item) => {
      /*
       * Personal events do not participate in academic "NOW/NEXT"
       * status calculations.
       */
      if (item.isPersonal) {
        return {
          ...item,
          status: 'upcoming'
        };
      }

      /*
       * A future date means every lesson is upcoming.
       */
      if (!selectedDateIsToday) {
        return {
          ...item,
          status:
            normalizedSelectedDate > now
              ? 'upcoming'
              : 'past'
        };
      }

      const rawStatus =
        getClassStatus(
          item.time,
          now
        );

      let status = rawStatus;

      if (
        rawStatus === 'upcoming' &&
        !foundNext
      ) {
        status = 'next';
        foundNext = true;
      }

      if (
        rawStatus === 'current'
      ) {
        status = 'in_progress';
      }

      if (
        rawStatus === 'finished'
      ) {
        status = 'past';
      }

      return {
        ...item,
        status
      };
    });

  /*
   * --------------------------------------------------------------------------
   * Metadata
   * --------------------------------------------------------------------------
   */

  const academicWeek =
    selectedDayData.academicWeek ??
    getAcademicWeekForDateMondayBased(
      normalizedSelectedDate,
      termStart
    );

  const hasAnyScheduleData =
    resolvedWeek.some(
      (day) =>
        day.count > 0
    );

  const isBeforeTerm =
    termStart &&
    normalizedSelectedDate <
      termStart;

  const isAfterTerm =
    termEnd &&
    normalizedSelectedDate >
      termEnd;

  return (
    <div className="space-y-5">

      {/* ------------------------------------------------------------------ */}
      {/* Header                                                             */}
      {/* ------------------------------------------------------------------ */}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Schedule
          </h2>

          <p className="text-xs font-medium text-[var(--text-secondary)] mt-0.5">
            Academic Timetable
          </p>
        </div>

        <button
          onClick={
            handleOpenCreateModal
          }
          className="text-xs font-bold text-[#2997ff] bg-[#2997ff]/10 px-3 py-1.5 rounded-xl transition-all active:scale-95"
        >
          + Add Event
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Week navigation                                                    */}
      {/* ------------------------------------------------------------------ */}

      <div className="flex items-center justify-between gap-2">

        <button
          type="button"
          onClick={() =>
            moveWeek(-1)
          }
          className="w-9 h-9 rounded-xl bg-[var(--surface-glass)] text-[var(--text-primary)] flex items-center justify-center text-lg font-bold transition-all active:scale-95"
          aria-label="Previous week"
        >
          ‹
        </button>

        <div className="flex-1 text-center min-w-0">
          <div className="text-xs font-bold text-[var(--text-primary)] truncate">
            {formatMonthYear(
              normalizedSelectedDate
            )}
          </div>

          <div className="text-[10px] font-medium text-[var(--text-secondary)] mt-0.5">
            Academic week{' '}
            {academicWeek || '—'}
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            moveWeek(1)
          }
          className="w-9 h-9 rounded-xl bg-[var(--surface-glass)] text-[var(--text-primary)] flex items-center justify-center text-lg font-bold transition-all active:scale-95"
          aria-label="Next week"
        >
          ›
        </button>

      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Today button                                                       */}
      {/* ------------------------------------------------------------------ */}

      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleGoToday}
          className="text-[10px] font-bold text-[#2997ff] bg-[#2997ff]/10 px-3 py-1.5 rounded-lg transition-all active:scale-95"
        >
          Today
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Calendar date selector                                             */}
      {/* ------------------------------------------------------------------ */}

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">

        {weekDates.map((date) => {
          const key =
            dateKey(date);

          const dayKey =
            getDayKey(date);

          const isSelected =
            key === selectedDateKey;

          const isToday =
            sameDate(
              date,
              now
            );

          const dayData =
            resolvedWeek.find(
              (item) =>
                item.dateKey === key
            );

          const lessonCount =
            dayData?.count || 0;

          return (
            <button
              key={key}
              type="button"
              onClick={() =>
                setSelectedDate(date)
              }
              className={`flex-1 min-w-[54px] py-2.5 px-2 rounded-xl text-center transition-all ${
                isSelected
                  ? 'bg-[#2997ff] text-white shadow-sm'
                  : 'bg-[var(--surface-glass)] text-[var(--text-secondary)]'
              }`}
            >
              <span
                className={`block text-[10px] font-bold ${
                  isSelected
                    ? 'text-white/80'
                    : ''
                }`}
              >
                {DAYS.find(
                  (day) =>
                    day.key ===
                    dayKey
                )?.label ||
                  dayKey}
              </span>

              <span className="block text-sm font-extrabold mt-0.5">
                {date.getDate()}
              </span>

              <span
                className={`block text-[8px] font-medium mt-0.5 ${
                  isSelected
                    ? 'text-white/70'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                {lessonCount > 0
                  ? `${lessonCount} ${
                      lessonCount === 1
                        ? 'class'
                        : 'classes'
                    }`
                  : 'No classes'}
              </span>

              {isToday && (
                <span
                  className={`block text-[8px] font-bold mt-1 ${
                    isSelected
                      ? 'text-white'
                      : 'text-[#2997ff]'
                  }`}
                >
                  TODAY
                </span>
              )}
            </button>
          );
        })}

      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Selected date                                                       */}
      {/* ------------------------------------------------------------------ */}

      <div className="flex justify-between items-center px-0.5">

        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            {formatDateLong(
              normalizedSelectedDate
            )}
          </h3>

          <p className="text-[10px] font-medium text-[var(--text-secondary)] mt-0.5">
            Week{' '}
            {academicWeek || '—'}
            {' • '}
            {processedSchedule.length}{' '}
            {processedSchedule.length === 1
              ? 'entry'
              : 'entries'}
          </p>
        </div>

        {selectedDateIsToday && (
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg bg-[#2997ff]/10 text-[#2997ff]">
            Today
          </span>
        )}

      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Loading                                                             */}
      {/* ------------------------------------------------------------------ */}

      {loading && (
        <div className="p-6 rounded-2xl bg-[var(--surface-glass)] text-center text-xs text-[var(--text-secondary)]">
          Loading timetable...
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Term boundary messages                                              */}
      {/* ------------------------------------------------------------------ */}

      {!loading &&
        isBeforeTerm && (
          <div className="p-4 rounded-2xl bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-xs text-[#f59e0b]">
            The academic term has not started
            yet.
          </div>
        )}

      {!loading &&
        isAfterTerm && (
          <div className="p-4 rounded-2xl bg-[var(--surface-glass)] text-xs text-[var(--text-secondary)]">
            The academic term has ended.
          </div>
        )}

      {/* ------------------------------------------------------------------ */}
      {/* No timetable data                                                   */}
      {/* ------------------------------------------------------------------ */}

      {!loading &&
        !hasAnyScheduleData &&
        !termStart && (
          <div className="p-4 rounded-2xl bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-xs text-[#f59e0b]">
            Academic timetable data is not
            loaded.
            <br />
            Please check the selected group
            or reload the schedule.
          </div>
        )}

      {/* ------------------------------------------------------------------ */}
      {/* Selected day agenda                                                 */}
      {/* ------------------------------------------------------------------ */}

      {!loading &&
        processedSchedule.length > 0 && (
          <div className="bg-[var(--surface-glass)] rounded-2xl overflow-hidden divide-y divide-[var(--border-glass)]">

            {processedSchedule.map(
              (item, idx) => {
                const isPast =
                  item.status ===
                  'past';

                const isInProgress =
                  item.status ===
                  'in_progress';

                const isNext =
                  item.status ===
                  'next';

                const minutesLeft =
                  isInProgress
                    ? getMinutesUntilEnd(
                        item.time,
                        now
                      )
                    : null;

                const timeParts =
                  parseTimeRange(
                    item.time
                  );

                const startTime =
                  timeParts?.startTime ||
                  item.startLessonTime ||
                  '09:00';

                const endTime =
                  timeParts?.endTime ||
                  item.endLessonTime ||
                  '10:20';

                return (
                  <div
                    key={
                      item.id ||
                      `${selectedDateKey}-${idx}`
                    }
                    onClick={() =>
                      onLessonClick?.(
                        item
                      )
                    }
                    className={`w-full p-4 flex items-center justify-between gap-3 transition-all text-left ${
                      isPast
                        ? 'opacity-35'
                        : 'opacity-100'
                    } ${
                      isInProgress
                        ? 'bg-white/10'
                        : ''
                    }`}
                  >

                    {/* Time */}
                    <div className="w-24 shrink-0 font-mono">

                      <span
                        className={`block text-xs font-bold ${
                          isInProgress
                            ? 'text-[#30d158] text-sm'
                            : isNext
                              ? 'text-[#2997ff]'
                              : 'text-[var(--text-primary)]'
                        }`}
                      >
                        {startTime}
                      </span>

                      <span className="block text-[10px] text-[var(--text-secondary)] font-medium">
                        {endTime}
                      </span>

                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">

                      <div className="flex items-center gap-2 mb-0.5">

                        <h4
                          className={`text-sm truncate ${
                            isInProgress
                              ? 'font-bold text-base text-[var(--text-primary)]'
                              : 'font-semibold text-[var(--text-primary)]'
                          }`}
                        >
                          {item.subject ||
                            'Lesson'}
                        </h4>

                        {isInProgress && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#30d158]/20 text-[#30d158] shrink-0">
                            NOW
                          </span>
                        )}

                        {isNext && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#2997ff]/15 text-[#2997ff] shrink-0">
                            NEXT
                          </span>
                        )}

                        {item.isPersonal && (
                          <span className="text-[9px] font-medium tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-[var(--text-secondary)] border border-white/10 shrink-0">
                            Personal
                          </span>
                        )}

                      </div>

                      <p className="text-xs text-[var(--text-secondary)] truncate">

                        {item.isPersonal ? (
                          <span className="italic">
                            Personal Activity
                          </span>
                        ) : (
                          <>
                            Room{' '}
                            {item.room ||
                              'N/A'}
                            {' • '}
                            {item.teacher ||
                              'Faculty'}
                          </>
                        )}

                      </p>

                      {item.note && (
                        <p className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5">
                          {item.note}
                        </p>
                      )}

                      {isInProgress &&
                        minutesLeft !==
                          null && (
                          <p className="text-[11px] font-bold text-[#30d158] mt-1">
                            Ends in{' '}
                            {minutesLeft}{' '}
                            min
                          </p>
                        )}

                    </div>

                    {/* Type / actions */}
                    <div className="text-right shrink-0 flex items-center gap-1.5">

                      <span className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                        {item.type ||
                          'Lecture'}
                      </span>

                      {item.isPersonal && (
                        <div className="flex items-center gap-1 ml-1">

                          <button
                            type="button"
                            onClick={(
                              event
                            ) => {
                              event.stopPropagation();

                              handleOpenEditModal(
                                item
                              );
                            }}
                            className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[#2997ff] hover:bg-white/10 transition-colors"
                            title="Edit event"
                            aria-label="Edit personal event"
                          >
                            ✎
                          </button>

                          <button
                            type="button"
                            onClick={(
                              event
                            ) => {
                              event.stopPropagation();

                              handleDeleteEvent(
                                item.id
                              );
                            }}
                            className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[#ff3b30] hover:bg-white/10 transition-colors"
                            title="Delete event"
                            aria-label="Delete personal event"
                          >
                            ×
                          </button>

                        </div>
                      )}

                    </div>

                  </div>
                );
              }
            )}

          </div>
        )}

      {/* ------------------------------------------------------------------ */}
      {/* Empty selected date                                                 */}
      {/* ------------------------------------------------------------------ */}

      {!loading &&
        processedSchedule.length === 0 &&
        !isBeforeTerm &&
        !isAfterTerm && (
          <div className="p-6 rounded-2xl bg-[var(--surface-glass)] text-center">

            <div className="text-sm font-semibold text-[var(--text-primary)]">
              No classes or events
            </div>

            <div className="text-xs text-[var(--text-secondary)] mt-1">
              Nothing is scheduled for{' '}
              {formatDateLong(
                normalizedSelectedDate
              )}
              .
            </div>

          </div>
        )}

      {/* ------------------------------------------------------------------ */}
      {/* Personal event modal                                                */}
      {/* ------------------------------------------------------------------ */}

      <PersonalEventModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSaveEvent={handleSaveEvent}
        initialEvent={editingEvent}
      />

    </div>
  );
}