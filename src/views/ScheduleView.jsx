import React, {
  useEffect,
  useMemo,
  useState
} from 'react';

import PersonalEventModal from '../components/schedule/PersonalEventModal';
import ScheduleLessonCard from '../components/schedule/ScheduleLessonCard';

import {
  getClassStatus,
  parseStartTimeInMinutes
} from '../utils/time';

import {
  resolveLessonsForDate
} from '../utils/scheduleResolver';

import GroupSelectorSheet from '../components/schedule/GroupSelectorSheet';
import GroupBrowser from '../components/schedule/GroupBrowser';

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
  const offset =
    day === 0
      ? -6
      : 1 - day;

  result.setDate(
    result.getDate() + offset
  );

  result.setHours(
    0,
    0,
    0,
    0
  );

  return result;
}

function sameDate(a, b) {
  if (!a || !b) {
    return false;
  }

  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDate(date) {
  return date.toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric'
    }
  );
}

function formatFullDate(date) {
  return date.toLocaleDateString(
    'en-US',
    {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    }
  );
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
  return Object.values(
    schedules || {}
  ).some(
    value =>
      Array.isArray(value) &&
      value.length > 0
  );
}

export default function ScheduleView({
  scheduleData,
  group,
  subgroup = 1,
  loading = false,
  onLessonClick,
  onGroupChange
}) {
  const [now, setNow] = useState(
    () => new Date()
  );

  const [
    selectedDate,
    setSelectedDate
  ] = useState(initialDate);

const [
  isGroupSelectorOpen,
  setIsGroupSelectorOpen
] = useState(false);

const [
  isGroupBrowserOpen,
  setIsGroupBrowserOpen
] = useState(false);

  const [
    isModalOpen,
    setIsModalOpen
  ] = useState(false);

  const [
    editingEvent,
    setEditingEvent
  ] = useState(null);

  const [
    personalEvents,
    setPersonalEvents
  ] = useState(() => {
    try {
      const saved =
        localStorage.getItem(
          'sh_personal_events'
        );

      if (!saved) {
        return [];
      }

      const parsed =
        JSON.parse(saved);

      return Array.isArray(parsed)
        ? parsed
        : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const timer = setInterval(
      () => {
        setNow(new Date());
      },
      5000
    );

    return () => {
      clearInterval(timer);
    };
  }, []);

  const data = useMemo(
    () =>
      getScheduleData(
        scheduleData
      ),
    [scheduleData]
  );

  const schedules =
    data?.schedules &&
    typeof data.schedules ===
      'object'
      ? data.schedules
      : {};

  const exams =
    Array.isArray(data?.exams)
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
    () =>
      startOfWeek(
        selectedDate
      ),
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
    const day =
      personalDay(
        selectedDate
      );

    return personalEvents.filter(
      event =>
        event?.day === day
    );
  }, [
    personalEvents,
    selectedDate
  ]);

  const schedule = useMemo(() => {
    const combined = [
      ...lessons,
      ...events
    ].sort(
      (a, b) =>
        parseStartTimeInMinutes(
          a.time
        ) -
        parseStartTimeInMinutes(
          b.time
        )
    );

    const isToday =
      sameDate(
        selectedDate,
        now
      );

    let nextFound = false;

    return combined.map(item => {
      if (item.isPersonal) {
        return {
          ...item,
          status: 'upcoming'
        };
      }

      const rawStatus =
        getClassStatus(
          item.time,
          now
        );

      let status =
        rawStatus;

      if (
        isToday &&
        rawStatus === 'upcoming' &&
        !nextFound
      ) {
        status = 'next';
        nextFound = true;
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
  }, [
    lessons,
    events,
    selectedDate,
    now
  ]);

  const selectedExamCount =
    useMemo(
      () =>
        exams.filter(exam => {
          if (!exam?.date) {
            return false;
          }

          const date =
            new Date(
              exam.date
            );

          return (
            !Number.isNaN(
              date.getTime()
            ) &&
            sameDate(
              date,
              selectedDate
            )
          );
        }).length,
      [
        exams,
        selectedDate
      ]
    );

  const selectDate = date => {
    setSelectedDate(
      new Date(date)
    );
  };

  const goToday = () => {
    setSelectedDate(
      initialDate()
    );
  };

  const goPreviousWeek =
    () => {
      setSelectedDate(
        addDays(
          selectedDate,
          -7
        )
      );
    };

  const goNextWeek = () => {
    setSelectedDate(
      addDays(
        selectedDate,
        7
      )
    );
  };

  const openCreateModal =
    () => {
      setEditingEvent(null);
      setIsModalOpen(true);
    };

  const openEditModal =
    event => {
      setEditingEvent(event);
      setIsModalOpen(true);
    };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
  };

  const saveEvent = event => {
    const exists =
      personalEvents.some(
        item =>
          item.id === event.id
      );

    const updated = exists
      ? personalEvents.map(
          item =>
            item.id === event.id
              ? event
              : item
        )
      : [
          ...personalEvents,
          event
        ];

    setPersonalEvents(
      updated
    );

    try {
      localStorage.setItem(
        'sh_personal_events',
        JSON.stringify(
          updated
        )
      );
    } catch (error) {
      console.error(
        'Failed to save personal events:',
        error
      );
    }

    closeModal();
  };

  const deleteEvent =
    eventId => {
      const updated =
        personalEvents.filter(
          event =>
            event.id !== eventId
        );

      setPersonalEvents(
        updated
      );

      try {
        localStorage.setItem(
          'sh_personal_events',
          JSON.stringify(
            updated
          )
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

   <div className="flex items-center justify-between gap-3">
  <div className="min-w-0">
    <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
      Schedule
    </h2>

    <button
      type="button"
      onClick={() =>
        setIsGroupSelectorOpen(true)
      }
      className="mt-1 flex max-w-full items-center gap-1.5 rounded-lg text-left active:opacity-70"
    >
      <span className="truncate text-xs font-bold text-[#2997ff]">
        {group || 'Select group'}
      </span>

      <span className="text-[10px] text-[#2997ff]">
        ▾
      </span>
    </button>
  </div>

  <button
    type="button"
    onClick={openCreateModal}
    className="shrink-0 rounded-xl bg-[#2997ff]/10 px-3 py-1.5 text-xs font-bold text-[#2997ff] transition-all active:scale-95"
  >
    + Add Event
  </button>
</div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={
            goPreviousWeek
          }
          className="rounded-xl bg-[var(--surface-glass)] px-3 py-2 text-xs font-bold text-[var(--text-secondary)]"
        >
          Prev
        </button>

        <button
          type="button"
          onClick={goToday}
          className="rounded-xl bg-[#2997ff]/10 px-3 py-2 text-xs font-bold text-[#2997ff]"
        >
          Today
        </button>

        <button
          type="button"
          onClick={
            goNextWeek
          }
          className="rounded-xl bg-[var(--surface-glass)] px-3 py-2 text-xs font-bold text-[var(--text-secondary)]"
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
            sameDate(
              day.date,
              now
            );

          return (
            <button
              key={day.key}
              type="button"
              onClick={() =>
                selectDate(
                  day.date
                )
              }
              className={`min-w-[52px] flex-1 rounded-xl px-2 py-2 text-center transition-all ${
                selected
                  ? 'bg-[#2997ff] text-white shadow-sm'
                  : 'bg-[var(--surface-glass)] text-[var(--text-secondary)]'
              }`}
            >
              <span className="block text-[10px] font-bold">
                {day.label}
              </span>

              <span className="mt-0.5 block text-sm font-extrabold">
                {day.date.getDate()}
              </span>

              {today && (
                <span
                  className={`mt-0.5 block text-[8px] font-medium ${
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

      <div className="flex items-center justify-between px-0.5">
        <div>
          <p className="text-sm font-bold text-[var(--text-primary)]">
            {formatFullDate(
              selectedDate
            )}
          </p>

          <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">
            Week {currentWeek} ·{' '}
            {formatDate(
              weekStart
            )}{' '}
            to{' '}
            {formatDate(
              addDays(
                weekStart,
                5
              )
            )}
          </p>
        </div>

        <span className="text-[10px] font-medium text-[var(--text-secondary)]">
          {schedule.length}{' '}
          items
          {selectedExamCount >
          0
            ? ` · ${selectedExamCount} exam${
                selectedExamCount >
                1
                  ? 's'
                  : ''
              }`
            : ''}
        </span>
      </div>

      {!loading &&
        !hasScheduleData && (
          <div className="rounded-xl border border-[#f59e0b]/20 bg-[#f59e0b]/10 p-3 text-xs text-[#f59e0b]">
            Academic timetable
            data is not loaded.
            Please check the
            selected group or
            reload the schedule.
          </div>
        )}

      {loading ? (
        <div className="rounded-2xl bg-[var(--surface-glass)] p-6 text-center text-xs text-[var(--text-secondary)]">
          Loading timetable...
        </div>
      ) : schedule.length >
        0 ? (
        <div className="overflow-hidden rounded-2xl bg-[var(--surface-glass)] divide-y divide-[var(--border-glass)]">
          {schedule.map(
            (
              item,
              index
            ) => (
              <ScheduleLessonCard
                key={
                  item.id ||
                  index
                }
                item={item}
                now={now}
                index={index}
                onLessonClick={
                  onLessonClick
                }
                onEditPersonalEvent={
                  openEditModal
                }
                onDeletePersonalEvent={
                  deleteEvent
                }
              />
            )
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-[var(--surface-glass)] p-6 text-center text-xs text-[var(--text-secondary)]">
          No classes or
          events scheduled
          for{' '}
          {formatFullDate(
            selectedDate
          )}
          .
        </div>
      )}

      <PersonalEventModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSaveEvent={saveEvent}
        initialEvent={
          editingEvent
        }
      />
      {isGroupSelectorOpen && (
  <GroupSelectorSheet
    currentGroup={group}
    onSelectGroup={selectedGroup => {
      onGroupChange(selectedGroup);
      setIsGroupSelectorOpen(false);
    }}
    onOpenBrowser={() => {
      setIsGroupSelectorOpen(false);
      setIsGroupBrowserOpen(true);
    }}
    onClose={() =>
      setIsGroupSelectorOpen(false)
    }
  />
)}

{isGroupBrowserOpen && (
  <GroupBrowser
    currentGroup={group}
    onSelectGroup={selectedGroup => {
      onGroupChange(selectedGroup);
      setIsGroupBrowserOpen(false);
    }}
    onClose={() =>
      setIsGroupBrowserOpen(false)
    }
  />
)}
    </div>
  );
}