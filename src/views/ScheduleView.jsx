import React, { useState, useEffect } from 'react';
import PersonalEventModal from '../components/schedule/PersonalEventModal';
import {
  getClassStatus,
  parseStartTimeInMinutes,
  getMinutesUntilEnd,
  parseTimeRange
} from '../utils/time';
import {
  resolveLessonsForWeekday,
  normalizeLesson,
  RU_DAY_NAMES
} from '../utils/scheduleResolver';

const DAY_MAP = {
  Mon: 'Понедельник',
  Tue: 'Вторник',
  Wed: 'Среда',
  Thu: 'Четверг',
  Fri: 'Пятница',
  Sat: 'Суббота'
};

const DISPLAY_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ScheduleView({
  scheduleData,
  subgroup = 1,
  loading = false,
  onLessonClick
}) {
  const schedules = scheduleData?.schedules || {};
  const exams = scheduleData?.exams || [];
  const currentWeek = scheduleData?.currentWeek || 1;
  const studentGroup = scheduleData?.studentGroup;

  const [scheduleMode, setScheduleMode] = useState(() => {
    try {
      return localStorage.getItem('sh_schedule_mode') || 'weekday';
    } catch {
      return 'weekday';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('sh_schedule_mode', scheduleMode);
    } catch {
      // Ignore localStorage errors.
    }
  }, [scheduleMode]);

  const days = DISPLAY_DAYS;

  // ---------------------------------------------------------
  // Current time
  // ---------------------------------------------------------

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const jsDay = now.getDay();

  // JS:
  // Sunday = 0
  // Monday = 1
  // ...
  // Saturday = 6
  //
  // Our display array:
  // Mon = 0 ... Sat = 5
  const currentDayIndex = jsDay >= 1 && jsDay <= 6
    ? jsDay - 1
    : -1;

  const todayDayName =
    currentDayIndex >= 0
      ? days[currentDayIndex]
      : 'Sun';

  const [selectedDay, setSelectedDay] = useState(() => {
    const initialDayIndex = new Date().getDay();

    if (initialDayIndex >= 1 && initialDayIndex <= 6) {
      return days[initialDayIndex - 1];
    }

    return 'Mon';
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  // ---------------------------------------------------------
  // Personal events
  // ---------------------------------------------------------

  const [personalEvents, setPersonalEvents] = useState(() => {
    try {
      const saved = localStorage.getItem('sh_personal_events');
      return saved ? JSON.parse(saved) : [];
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
    const exists = personalEvents.some(
      (ev) => ev.id === savedEvent.id
    );

    const updated = exists
      ? personalEvents.map((ev) =>
          ev.id === savedEvent.id ? savedEvent : ev
        )
      : [...personalEvents, savedEvent];

    setPersonalEvents(updated);

    try {
      localStorage.setItem(
        'sh_personal_events',
        JSON.stringify(updated)
      );
    } catch (e) {
      console.error(
        'Failed to persist personal events:',
        e
      );
    }
  };

  const handleDeleteEvent = (eventId) => {
    const updated = personalEvents.filter(
      (ev) => ev.id !== eventId
    );

    setPersonalEvents(updated);

    try {
      localStorage.setItem(
        'sh_personal_events',
        JSON.stringify(updated)
      );
    } catch (e) {
      console.error(
        'Failed to delete personal event:',
        e
      );
    }
  };

  // ---------------------------------------------------------
  // Selected day
  // ---------------------------------------------------------

  const isSelectedDayToday =
    selectedDay === todayDayName;

  const russianDayName =
    DAY_MAP[selectedDay] || selectedDay;

  // ---------------------------------------------------------
  // Academic lessons
  // ---------------------------------------------------------

  const weekdayLessonsByWeek =
    resolveLessonsForWeekday(
      schedules,
      russianDayName,
      subgroup
    );

  const weekdayLessons = Object.values(
    weekdayLessonsByWeek
  )
    .flat()
    .map(normalizeLesson);

  // ---------------------------------------------------------
  // Personal events
  // ---------------------------------------------------------

  const dayPersonalEvents = personalEvents.filter(
    (ev) => ev.day === selectedDay
  );

  // ---------------------------------------------------------
  // Combine academic + personal schedule
  // ---------------------------------------------------------

  const unmergedSchedule = [
    ...weekdayLessons,
    ...dayPersonalEvents
  ];

  const sortedSchedule = [...unmergedSchedule].sort(
    (a, b) =>
      parseStartTimeInMinutes(a.time) -
      parseStartTimeInMinutes(b.time)
  );

  // ---------------------------------------------------------
  // Determine whether API actually contains this day
  // ---------------------------------------------------------

  const hasAcademicDataForSelectedDay =
    Array.isArray(schedules[russianDayName]) &&
    schedules[russianDayName].length > 0;

  const hasAnyScheduleData =
    Object.keys(schedules).length > 0;

  // ---------------------------------------------------------
  // Statuses
  // ---------------------------------------------------------

  let foundNext = false;

  const processedSchedule = sortedSchedule.map((item) => {
    const rawStatus = getClassStatus(item.time, now);

    let finalStatus = rawStatus;

    if (
      rawStatus === 'upcoming' &&
      !foundNext &&
      isSelectedDayToday &&
      !item.isPersonal
    ) {
      finalStatus = 'next';
      foundNext = true;
    }

    if (rawStatus === 'current') {
      finalStatus = 'in_progress';
    }

    if (rawStatus === 'finished') {
      finalStatus = 'past';
    }

    return {
      ...item,
      status: finalStatus
    };
  });

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Schedule
          </h2>

          <p className="text-xs font-medium text-[var(--text-secondary)] mt-0.5">
            {studentGroup
              ? `${studentGroup} • Academic Timetable`
              : 'Academic Timetable'}
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="text-xs font-bold text-[#2997ff] bg-[#2997ff]/10 px-3 py-1.5 rounded-xl transition-all active:scale-95"
        >
          + Add Event
        </button>
      </div>

      {/* Day selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {days.map((day) => {
          const isToday = day === todayDayName;
          const isSelected = day === selectedDay;

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all text-center min-w-[50px] ${
                isSelected
                  ? 'bg-[#2997ff] text-white shadow-sm'
                  : 'bg-[var(--surface-glass)] text-[var(--text-secondary)]'
              }`}
            >
              <span>{day}</span>

              {isToday && (
                <span
                  className={`block text-[9px] font-normal ${
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

      {/* Data status */}
      {!loading && (
        <div className="p-3 rounded-xl bg-[var(--surface-glass)] border border-[var(--border-glass)] text-xs text-[var(--text-secondary)] flex items-center gap-2">
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              hasAcademicDataForSelectedDay
                ? 'bg-[#30d158]'
                : hasAnyScheduleData
                ? 'bg-[#ff9f0a]'
                : 'bg-[#ff3b30]'
            }`}
          />

          <span>
            {hasAcademicDataForSelectedDay
              ? `Academic schedule loaded for ${russianDayName}.`
              : hasAnyScheduleData
              ? `No academic lessons found for ${russianDayName} in the current timetable.`
              : 'Academic timetable data is not loaded.'}
          </span>
        </div>
      )}

      {/* Agenda title */}
      <div className="flex justify-between items-center px-0.5">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          {selectedDay} Agenda ({processedSchedule.length})
        </h3>
      </div>

      {/* Schedule */}
      {loading ? (
        <div className="p-6 rounded-2xl bg-[var(--surface-glass)] text-center text-xs text-[var(--text-secondary)]">
          Loading timetable...
        </div>
      ) : processedSchedule.length > 0 ? (
        <div className="bg-[var(--surface-glass)] rounded-2xl overflow-hidden divide-y divide-[var(--border-glass)]">

          {processedSchedule.map((item, idx) => {
            const isPast =
              item.status === 'past';

            const isInProgress =
              item.status === 'in_progress';

            const isNext =
              item.status === 'next';

            const minutesLeft =
              isInProgress
                ? getMinutesUntilEnd(item.time, now)
                : null;

            const timeParts =
              parseTimeRange(item.time);

            const startTime =
              timeParts?.startTime || '09:00';

            const endTime =
              timeParts?.endTime || '10:20';

            return (
              <div
                key={item.id || idx}
                onClick={() =>
                  onLessonClick?.(item)
                }
                className={`w-full p-4 flex items-center justify-between gap-3 transition-all text-left ${
                  isPast
                    ? 'opacity-35'
                    : 'opacity-100'
                } ${
                  isInProgress
                    ? 'bg-white/10 dark:bg-white/10'
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
                      className={`text-sm font-semibold truncate ${
                        isInProgress
                          ? 'text-[var(--text-primary)] font-bold text-base'
                          : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {item.subject}
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
                      `Room ${item.room} • ${item.teacher}`
                    )}
                  </p>

                  {isInProgress &&
                    minutesLeft !== null && (
                      <p className="text-[11px] font-bold text-[#30d158] mt-1">
                        Ends in {minutesLeft} min
                      </p>
                    )}
                </div>

                {/* Type + personal controls */}
                <div className="text-right shrink-0 flex items-center gap-1.5">

                  <span className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    {item.type || 'Lecture'}
                  </span>

                  {item.isPersonal && (
                    <div className="flex items-center gap-1 ml-1">

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(item);
                        }}
                        className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[#2997ff] hover:bg-white/10 transition-colors"
                        title="Edit event"
                        aria-label="Edit personal event"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEvent(item.id);
                        }}
                        className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[#ff3b30] hover:bg-white/10 transition-colors"
                        title="Delete event"
                        aria-label="Delete personal event"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
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

          {dayPersonalEvents.length > 0
            ? 'No academic classes. Personal events are shown above.'
            : hasAcademicDataForSelectedDay
            ? `No classes scheduled for ${selectedDay}.`
            : hasAnyScheduleData
            ? `No academic lessons found for ${selectedDay}.`
            : 'No timetable data is available.'}

        </div>
      )}

      {/* Personal Event Modal */}
      <PersonalEventModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSaveEvent={handleSaveEvent}
        initialEvent={editingEvent}
      />

    </div>
  );
}