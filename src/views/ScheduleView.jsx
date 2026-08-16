import React, { useEffect, useMemo, useState } from 'react';
import PersonalEventModal from '../components/schedule/PersonalEventModal';

import {
  getClassStatus,
  getMinutesUntilEnd,
  parseStartTimeInMinutes,
  parseTimeRange
} from '../utils/time';

import { resolveLessonsForDate } from '../utils/scheduleResolver';

const WEEKDAYS = [
  { key: 1, label: 'Mon' },
  { key: 2, label: 'Tue' },
  { key: 3, label: 'Wed' },
  { key: 4, label: 'Thu' },
  { key: 5, label: 'Fri' },
  { key: 6, label: 'Sat' }
];

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();

  const mondayOffset = day === 0 ? -6 : 1 - day;

  d.setDate(d.getDate() + mondayOffset);
  d.setHours(0, 0, 0, 0);

  return d;
}

function addDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

function sameDate(a, b) {
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

function getPersonalDayKey(date) {
  const day = date.getDay();

  if (day === 1) return 'Mon';
  if (day === 2) return 'Tue';
  if (day === 3) return 'Wed';
  if (day === 4) return 'Thu';
  if (day === 5) return 'Fri';
  if (day === 6) return 'Sat';

  return 'Sun';
}

function getInitialDate() {
  const today = new Date();

  if (today.getDay() === 0) {
    return addDays(today, -1);
  }

  return today;
}

export default function ScheduleView({
  scheduleData,
  subgroup = 1,
  loading = false,
  onLessonClick
}) {
  const [now, setNow] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(
    getInitialDate
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const [personalEvents, setPersonalEvents] = useState(() => {
    try {
      const saved = localStorage.getItem(
        'sh_personal_events'
      );

      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  /*
   * Support both:
   *
   * scheduleData.data.schedules
   * and the older top-level shape.
   */
  const data = scheduleData?.data || scheduleData || {};

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
    Object.values(schedules).some(
      value =>
        Array.isArray(value) &&
        value.length > 0
    );

  const weekStart = useMemo(
    () => startOfWeek(selectedDate),
    [selectedDate]
  );

  const weekDates = useMemo(() => {
    return WEEKDAYS.map(day => ({
      ...day,
      date: addDays(weekStart, day.key - 1)
    }));
  }, [weekStart]);

  const selectedDayKey =
    getPersonalDayKey(selectedDate);

  const selectedLessons = useMemo(() => {
    return resolveLessonsForDate(
      schedules,
      selectedDate,
      currentWeek,
      subgroup
    );
  }, [
    schedules,
    selectedDate,
    currentWeek,
    subgroup
  ]);

  const selectedPersonalEvents = useMemo(() => {
    return personalEvents.filter(
      event => event.day === selectedDayKey
    );
  }, [
    personalEvents,
    selectedDayKey
  ]);

  const processedSchedule = useMemo(() => {
    const combined = [
      ...selectedLessons,
      ...selectedPersonalEvents
    ];

    const sorted = [...combined].sort(
      (a, b) =>
        parseStartTimeInMinutes(a.time) -
        parseStartTimeInMinutes(b.time)
    );

    const selectedIsToday =
      sameDate(selectedDate, now);

    let nextFound = false;

    return sorted.map(item => {
      if (item.isPersonal) {
        return {
          ...item,
          status: 'upcoming'
        };
      }

      const rawStatus = getClassStatus(
        item.time,
        now
      );

      let status = rawStatus;

      if (
        selectedIsToday &&
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
    selectedLessons,
    selectedPersonalEvents,
    selectedDate,
    now
  ]);

  const selectedExamCount = useMemo(() => {
    return exams.filter(exam => {
      if (!exam?.date) return false;

      const examDate = new Date(exam.date);

      return (
        !Number.isNaN(examDate.getTime()) &&
        sameDate(examDate, selectedDate)
      );
    }).length;
  }, [exams, selectedDate]);

  const goToToday = () => {
    setSelectedDate(getInitialDate());
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

  const handleOpenCreateModal = () => {
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = event => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
  };

  const handleSaveEvent = savedEvent => {
    const exists = personalEvents.some(
      event => event.id === savedEvent.id
    );

    const updated = exists
      ? personalEvents.map(event =>
          event.id === savedEvent.id
            ? savedEvent
            : event
        )
      : [...personalEvents, savedEvent];

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

  const handleDeleteEvent = eventId => {
    const updated = personalEvents.filter(
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

      {/* Header */}
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
          onClick={handleOpenCreateModal}
          className="text-xs font-bold text-[#2997ff] bg-[#2997ff]/10 px-3 py-1.5 rounded-xl transition-all active:scale-95"
        >
          + Add Event
        </button>
      </div>

      {/* Calendar controls */}
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
          onClick={goToToday}
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

      {/* Calendar week */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {weekDates.map(day => {
          const isSelected =
            sameDate(day.date, selectedDate);

          const isToday =
            sameDate(day.date, now);

          return (
            <button
              key={day.key}
              type="button"
              onClick={() =>
                setSelectedDate(day.date)
              }
              className={`flex-1 min-w-[52px] py-2 px-2 rounded-xl text-center transition-all ${
                isSelected
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

              {isToday && (
                <span
                  className={`block text-[8px] font-medium mt-0.5 ${
                    isSelected
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

      {/* Date / week information */}
      <div className="flex justify-between items-center px-0.5">
        <div>
          <p className="text-sm font-bold text-[var(--text-primary)]">
            {formatFullDate(selectedDate)}
          </p>

          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
            Week {currentWeek} - {formatDate(weekStart)} to{' '}
            {formatDate(addDays(weekStart, 5))}
          </p>
        </div>

        <span className="text-[10px] font-medium text-[var(--text-secondary)]">
          {processedSchedule.length} items
        </span>
      </div>

      {/* Data warning */}
      {!loading && !hasScheduleData && (
        <div className="p-3 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-xs text-[#f59e0b]">
          Academic timetable data is not loaded.
          Please check the selected group or reload
          the schedule.
        </div>
      )}

      {/* Schedule */}
      {loading ? (
        <div className="p-6 rounded-2xl bg-[var(--surface-glass)] text-center text-xs text-[var(--text-secondary)]">
          Loading timetable...
        </div>
      ) : processedSchedule.length > 0 ? (
        <div className="bg-[var(--surface-glass)] rounded-2xl overflow-hidden divide-y divide-[var(--border-glass)]">
          {processedSchedule.map((item, index) => {
            const isPast =
              item.status === 'past';

            const isInProgress =
              item.status === 'in_progress';

            const isNext =
              item.status === 'next';

            const minutesLeft =
              isInProgress
                ? getMinutesUntilEnd(
                    item.time,
                    now
                  )
                : null;

            const timeParts =
              parseTimeRange(item.time);

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
                key={item.id || index}
                onClick={() =>
                  onLessonClick?.(item)
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
                <div className="w-20 shrink-0 font-mono">
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

                  <span className="block text-[10px] text-[var(--text-secondary)]">
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
                      {item.subject || 'Lesson'}
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
                        Room {item.room || '-'} {'\u2022'}{' '}
                        {item.teacher || '-'}
                      </>
                    )}
                  </p>

                  {isInProgress &&
                    minutesLeft !== null && (
                      <p className="text-[11px] font-bold text-[#30d158] mt-1">
                        Ends in {minutesLeft} min
                      </p>
                    )}
                </div>

                {/* Type / actions */}
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    {item.type || 'Lesson'}
                  </span>

                  {item.isPersonal && (
                    <div className="flex items-center gap-1 mt-1">
                      <button
                        type="button"
                        onClick={event => {
                          event.stopPropagation();
                          handleOpenEditModal(item);
                        }}
                        className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[#2997ff] hover:bg-white/10 transition-colors"
                        title="Edit event"
                        aria-label="Edit personal event"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={event => {
                          event.stopPropagation();
                          handleDeleteEvent(item.id);
                        }}
                        className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[#ff3b30] hover:bg-white/10 transition-colors"
                        title="Delete event"
                        aria-label="Delete personal event"
                      >
                        Delete
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
          No classes or events scheduled for this date.
        </div>
      )}

      {selectedExamCount > 0 && (
        <div className="p-3 rounded-xl bg-[#2997ff]/10 text-xs text-[#2997ff]">
          {selectedExamCount} exam
          {selectedExamCount === 1 ? '' : 's'} on this date.
        </div>
      )}

      <PersonalEventModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSaveEvent={handleSaveEvent}
        initialEvent={editingEvent}
      />
    </div>
  );
}