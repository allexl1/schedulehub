import React, { useEffect, useMemo, useState } from 'react';
import PersonalEventModal from '../components/schedule/PersonalEventModal';

import {
  getClassStatus,
  getMinutesUntilEnd,
  parseStartTimeInMinutes,
  parseTimeRange
} from '../utils/time';

import { resolveLessonsForDate } from '../utils/scheduleResolver';

const DAYS = [
  { key: 1, label: 'Mon' },
  { key: 2, label: 'Tue' },
  { key: 3, label: 'Wed' },
  { key: 4, label: 'Thu' },
  { key: 5, label: 'Fri' },
  { key: 6, label: 'Sat' }
];

function addDays(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function startOfWeek(date) {
  const result = new Date(date);
  const day = result.getDay();
  const offset = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + offset);
  result.setHours(0, 0, 0, 0);

  return result;
}

function sameDate(a, b) {
  if (!a || !b) return false;

  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}

function formatFullDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
}

function personalDay(date) {
  const day = date.getDay();

  if (day === 1) return 'Mon';
  if (day === 2) return 'Tue';
  if (day === 3) return 'Wed';
  if (day === 4) return 'Thu';
  if (day === 5) return 'Fri';
  if (day === 6) return 'Sat';

  return 'Sun';
}

function initialDate() {
  const today = new Date();

  return today.getDay() === 0
    ? addDays(today, -1)
    : today;
}

function getScheduleData(value) {
  return value?.data || value || {};
}

function hasLessons(schedules) {
  return Object.values(schedules || {}).some(
    value =>
      Array.isArray(value) &&
      value.length > 0
  );
}

export default function ScheduleView({
  scheduleData,
  subgroup = 1,
  loading = false,
  onLessonClick
}) {
  const [now, setNow] = useState(() => new Date());
  const [selectedDate, setSelectedDate] =
    useState(initialDate);

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

  useEffect(() => {
    const timer = setInterval(
      () => setNow(new Date()),
      5000
    );

    return () => clearInterval(timer);
  }, []);

  const data = useMemo(
    () => getScheduleData(scheduleData),
    [scheduleData]
  );

  const schedules =
    data?.schedules &&
    typeof data.schedules === 'object'
      ? data.schedules
      : {};

  const exams = Array.isArray(data?.exams)
    ? data.exams
    : [];

  const currentWeek =
    Number(data?.currentWeek) >= 1 &&
    Number(data?.currentWeek) <= 4
      ? Number(data.currentWeek)
      : 1;

  const hasScheduleData =
    hasLessons(schedules);

  const weekStart = useMemo(
    () => startOfWeek(selectedDate),
    [selectedDate]
  );

  const weekDates = useMemo(
    () =>
      DAYS.map(day => ({
        ...day,
        date: addDays(
          weekStart,
          day.key - 1
        )
      })),
    [weekStart]
  );

  const lessons = useMemo(
    () =>
      resolveLessonsForDate(
        schedules,
        selectedDate,
        currentWeek,
        subgroup,
        {
          referenceDate: now
        }
      ),
    [
      schedules,
      selectedDate,
      currentWeek,
      subgroup,
      now
    ]
  );

  const events = useMemo(() => {
    const day = personalDay(selectedDate);

    return personalEvents.filter(
      event => event.day === day
    );
  }, [personalEvents, selectedDate]);

  const schedule = useMemo(() => {
    const combined = [
      ...lessons,
      ...events
    ].sort(
      (a, b) =>
        parseStartTimeInMinutes(a.time) -
        parseStartTimeInMinutes(b.time)
    );

    const today =
      sameDate(selectedDate, now);

    let nextFound = false;

    return combined.map(item => {
      if (item.isPersonal) {
        return {
          ...item,
          status: 'upcoming'
        };
      }

      const rawStatus =
        getClassStatus(item.time, now);

      let status = rawStatus;

      if (
        today &&
        rawStatus === 'upcoming' &&
        !nextFound
      ) {
        status = 'next';
        nextFound = true;
      }

      if (rawStatus === 'current') {
        status = 'in_progress';
      }

      if (rawStatus === 'finished') {
        status = 'past';
      }

      return {
        ...item,
        status
      };
    });
  }, [
    lessons,
    events,
    selectedDate,
    now
  ]);

  const selectedExamCount = useMemo(
    () =>
      exams.filter(exam => {
        if (!exam?.date) return false;

        const date = new Date(exam.date);

        return (
          !Number.isNaN(date.getTime()) &&
          sameDate(date, selectedDate)
        );
      }).length,
    [exams, selectedDate]
  );

  const selectDate = date => {
    setSelectedDate(new Date(date));
  };

  const goToday = () => {
    setSelectedDate(initialDate());
  };

  const goPreviousWeek = () => {
    setSelectedDate(
      addDays(selectedDate, -7)
    );
  };

  const goNextWeek = () => {
    setSelectedDate(
      addDays(selectedDate, 7)
    );
  };

  const openCreateModal = () => {
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const openEditModal = event => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
  };

  const saveEvent = event => {
    const exists = personalEvents.some(
      item => item.id === event.id
    );

    const updated = exists
      ? personalEvents.map(item =>
          item.id === event.id
            ? event
            : item
        )
      : [...personalEvents, event];

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

  const deleteEvent = eventId => {
    const updated =
      personalEvents.filter(
        event => event.id !== eventId
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

  return (
    <div className="space-y-5">

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
          onClick={openCreateModal}
          className="text-xs font-bold text-[#2997ff] bg-[#2997ff]/10 px-3 py-1.5 rounded-xl transition-all active:scale-95"
        >
          + Add Event
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={goPreviousWeek}
          className="px-3 py-2 rounded-xl bg-[var(--surface-glass)] text-[var(--text-secondary)] text-xs font-bold"
        >
          Prev
        </button>

        <button
          type="button"
          onClick={goToday}
          className="px-3 py-2 rounded-xl bg-[#2997ff]/10 text-[#2997ff] text-xs font-bold"
        >
          Today
        </button>

        <button
          type="button"
          onClick={goNextWeek}
          className="px-3 py-2 rounded-xl bg-[var(--surface-glass)] text-[var(--text-secondary)] text-xs font-bold"
        >
          Next
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {weekDates.map(day => {
          const selected =
            sameDate(
              day.date,
              selectedDate
            );

          const today =
            sameDate(day.date, now);

          return (
            <button
              key={day.key}
              type="button"
              onClick={() =>
                selectDate(day.date)
              }
              className={`flex-1 min-w-[52px] py-2 px-2 rounded-xl text-center transition-all ${
                selected
                  ? 'bg-[#2997ff] text-white shadow-sm'
                  : 'bg-[var(--surface-glass)] text-[var(--text-secondary)]'
              }`}
            >
              <span className="block text-[10px] font-bold">
                {day.label}
              </span>

              <span className="block text-sm font-extrabold mt-0.5">
                {day.date.getDate()}
              </span>

              {today && (
                <span
                  className={`block text-[8px] font-medium mt-0.5 ${
                    selected
                      ? 'text-white/80'
                      : 'text-[#2997ff]'
                  }`}
                >
                  Today
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between items-center px-0.5">
        <div>
          <p className="text-sm font-bold text-[var(--text-primary)]">
            {formatFullDate(selectedDate)}
          </p>

          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
            Week {currentWeek} -{' '}
            {formatDate(weekStart)} to{' '}
            {formatDate(
              addDays(weekStart, 5)
            )}
          </p>
        </div>

        <span className="text-[10px] font-medium text-[var(--text-secondary)]">
          {schedule.length} items
          {selectedExamCount > 0
            ? ` - ${selectedExamCount} exam${
                selectedExamCount > 1
                  ? 's'
                  : ''
              }`
            : ''}
        </span>
      </div>

      {!loading && !hasScheduleData && (
        <div className="p-3 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-xs text-[#f59e0b]">
          Academic timetable data is not loaded.
          Please check the selected group or reload
          the schedule.
        </div>
      )}

      {loading ? (
        <div className="p-6 rounded-2xl bg-[var(--surface-glass)] text-center text-xs text-[var(--text-secondary)]">
          Loading timetable...
        </div>
      ) : schedule.length > 0 ? (
        <div className="bg-[var(--surface-glass)] rounded-2xl overflow-hidden divide-y divide-[var(--border-glass)]">
          {schedule.map((item, index) => {
            const past =
              item.status === 'past';

            const current =
              item.status === 'in_progress';

            const next =
              item.status === 'next';

            const minutesLeft = current
              ? getMinutesUntilEnd(
                  item.time,
                  now
                )
              : null;

            const range =
              parseTimeRange(item.time);

            const start =
              range?.startTime ||
              item.startLessonTime ||
              '09:00';

            const end =
              range?.endTime ||
              item.endLessonTime ||
              '10:20';

            return (
              <div
                key={item.id || index}
                onClick={() =>
                  onLessonClick?.(item)
                }
                className={`w-full p-4 flex items-center justify-between gap-3 transition-all text-left ${
                  past
                    ? 'opacity-35'
                    : 'opacity-100'
                } ${
                  current
                    ? 'bg-white/10'
                    : ''
                }`}
              >
                <div className="w-20 shrink-0 font-mono">
                  <span
                    className={`block text-xs font-bold ${
                      current
                        ? 'text-[#30d158] text-sm'
                        : next
                          ? 'text-[#2997ff]'
                          : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {start}
                  </span>

                  <span className="block text-[10px] text-[var(--text-secondary)]">
                    {end}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4
                      className={`text-sm truncate ${
                        current
                          ? 'font-bold text-base text-[var(--text-primary)]'
                          : 'font-semibold text-[var(--text-primary)]'
                      }`}
                    >
                      {item.subject || 'Lesson'}
                    </h4>

                    {current && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#30d158]/20 text-[#30d158] shrink-0">
                        NOW
                      </span>
                    )}

                    {next && (
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
                        Room {item.room || '-'}{' '}
                        • {item.teacher || '-'}
                      </>
                    )}
                  </p>

                  {current &&
                    minutesLeft !== null && (
                      <p className="text-[11px] font-bold text-[#30d158] mt-1">
                        Ends in {minutesLeft} min
                      </p>
                    )}
                </div>

                <div className="text-right shrink-0 flex items-center gap-1.5">
                  <span className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    {item.type || 'Lecture'}
                  </span>

                  {item.isPersonal && (
                    <div className="flex items-center gap-1 ml-1">
                      <button
                        type="button"
                        onClick={event => {
                          event.stopPropagation();
                          openEditModal(item);
                        }}
                        className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[#2997ff] hover:bg-white/10 transition-colors"
                        title="Edit event"
                        aria-label="Edit personal event"
                      >
                        ✎
                      </button>

                      <button
                        type="button"
                        onClick={event => {
                          event.stopPropagation();
                          deleteEvent(item.id);
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
          })}
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-[var(--surface-glass)] text-center text-xs text-[var(--text-secondary)]">
          No classes or events scheduled for{' '}
          {formatFullDate(selectedDate)}.
        </div>
      )}

      <PersonalEventModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSaveEvent={saveEvent}
        initialEvent={editingEvent}
      />
    </div>
  );
}