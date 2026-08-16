import React, { useEffect, useMemo, useState } from 'react';
import PersonalEventModal from '../components/schedule/PersonalEventModal';

import {
  getClassStatus,
  getMinutesUntilEnd,
  parseStartTimeInMinutes,
  parseTimeRange
} from '../utils/time';

import {
  resolveLessonsForDate,
  resolveLessonsForWeekday
} from '../utils/scheduleResolver';

const DAYS = [
  { key: 'Mon', label: 'Mon' },
  { key: 'Tue', label: 'Tue' },
  { key: 'Wed', label: 'Wed' },
  { key: 'Thu', label: 'Thu' },
  { key: 'Fri', label: 'Fri' },
  { key: 'Sat', label: 'Sat' }
];

function getTodayKey(date) {
  const day = date.getDay();

  if (day === 1) return 'Mon';
  if (day === 2) return 'Tue';
  if (day === 3) return 'Wed';
  if (day === 4) return 'Thu';
  if (day === 5) return 'Fri';
  if (day === 6) return 'Sat';

  return 'Sun';
}

function getLessonsForDay(
  schedules,
  selectedDay,
  currentWeek,
  subgroup
) {
  if (selectedDay === getTodayKey(new Date())) {
    return resolveLessonsForDate(
      schedules,
      new Date(),
      currentWeek,
      subgroup
    );
  }

  const result = resolveLessonsForWeekday(
    schedules,
    selectedDay,
    currentWeek,
    subgroup
  );

  return Object.values(result).flat();
}

export default function ScheduleView({
  scheduleData,
  subgroup = 1,
  loading = false,
  onLessonClick
}) {
  const [now, setNow] = useState(() => new Date());

  const [selectedDay, setSelectedDay] = useState(() => {
    const today = getTodayKey(new Date());

    return today === 'Sun' ? 'Mon' : today;
  });

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
    const interval = setInterval(() => {
      setNow(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const schedules =
    scheduleData?.schedules &&
    typeof scheduleData.schedules === 'object'
      ? scheduleData.schedules
      : {};

  const exams = Array.isArray(scheduleData?.exams)
    ? scheduleData.exams
    : [];

  const currentWeek =
    Number(scheduleData?.currentWeek) >= 1 &&
    Number(scheduleData?.currentWeek) <= 4
      ? Number(scheduleData.currentWeek)
      : 1;

  const todayDay = getTodayKey(now);

  const isSelectedDayToday =
    selectedDay === todayDay;

  const hasScheduleData =
    Object.keys(schedules).length > 0;

  const dayPersonalEvents = useMemo(() => {
    return personalEvents.filter(
      event => event.day === selectedDay
    );
  }, [personalEvents, selectedDay]);

  const academicLessons = useMemo(() => {
    return getLessonsForDay(
      schedules,
      selectedDay,
      currentWeek,
      subgroup
    );
  }, [
    schedules,
    selectedDay,
    currentWeek,
    subgroup
  ]);

  const processedSchedule = useMemo(() => {
    const combined = [
      ...academicLessons,
      ...dayPersonalEvents
    ];

    const sorted = combined.sort((a, b) => {
      return (
        parseStartTimeInMinutes(a.time) -
        parseStartTimeInMinutes(b.time)
      );
    });

    let foundNext = false;

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
        rawStatus === 'upcoming' &&
        !foundNext &&
        isSelectedDayToday
      ) {
        status = 'next';
        foundNext = true;
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
    academicLessons,
    dayPersonalEvents,
    now,
    isSelectedDayToday
  ]);

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

      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {DAYS.map(day => {
          const isToday =
            day.key === todayDay;

          const isSelected =
            day.key === selectedDay;

          return (
            <button
              key={day.key}
              onClick={() =>
                setSelectedDay(day.key)
              }
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all text-center min-w-[50px] ${
                isSelected
                  ? 'bg-[#2997ff] text-white shadow-sm'
                  : 'bg-[var(--surface-glass)] text-[var(--text-secondary)]'
              }`}
            >
              <span>{day.label}</span>

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

      {!loading && !hasScheduleData && (
        <div className="p-3 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/20 text-xs text-[#f59e0b]">
          Academic timetable data is not loaded.
          Please check the selected group or reload
          the schedule.
        </div>
      )}

      {hasScheduleData && (
        <div className="flex justify-between items-center px-0.5">
          <span className="text-[10px] font-medium text-[var(--text-secondary)]">
            Week {currentWeek}
          </span>

          <span className="text-[10px] font-medium text-[var(--text-secondary)]">
            {selectedDay}
          </span>
        </div>
      )}

      <div className="flex justify-between items-center px-0.5">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          {selectedDay} Agenda ({processedSchedule.length})
        </h3>
      </div>

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
                    ? 'bg-white/10'
                    : ''
                }`}
              >
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
                        Room {item.room} {'\u2022'}{' '}
                        {item.teacher}
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
                        title="Delete personal event"
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
          No classes or events scheduled for {selectedDay}.
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