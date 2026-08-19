import React, {
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import TeacherDetailsSheet from '../components/schedule/TeacherDetailsSheet';
import LessonDetailsSheet from '../components/schedule/LessonDetailsSheet';
import ScheduleToolbar from '../components/schedule/ScheduleToolbar';
import ScheduleCalendar from '../components/schedule/ScheduleCalendar';
import PersonalEventModal from '../components/schedule/PersonalEventModal';
import ScheduleLessonCard from '../components/schedule/ScheduleLessonCard';
import GroupSelectorSheet from '../components/schedule/GroupSelectorSheet';
import GroupBrowser from '../components/schedule/GroupBrowser';

import {
  getClassStatus,
  parseStartTimeInMinutes
} from '../utils/time';

import {
  resolveLessonsForDate,
  resolveScheduleForDate
} from '../utils/scheduleResolver';

const PERSONAL_EVENTS_KEY = 'sh_personal_events';

function addDays(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
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

function readPersonalEvents() {
  try {
    const saved = localStorage.getItem(
      PERSONAL_EVENTS_KEY
    );

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function formatDateTitle(date) {
  return date.toLocaleDateString(
    'en-US',
    {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }
  );
}

function formatMonthDay(date) {
  return date.toLocaleDateString(
    'en-US',
    {
      month: 'long',
      day: 'numeric'
    }
  );
}

function getDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

function getDateRange(data) {
  const start = data?.startDate
    ? new Date(data.startDate)
    : null;

  const end = data?.endDate
    ? new Date(data.endDate)
    : null;

  if (
    start &&
    !Number.isNaN(start.getTime()) &&
    end &&
    !Number.isNaN(end.getTime())
  ) {
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    return {
      start,
      end
    };
  }

  return null;
}

function buildContinuousDates(
  schedules,
  data
) {
  const range = getDateRange(data);

  if (!range) {
    return [];
  }

  const dates = [];

  for (
    let date = new Date(range.start);
    date <= range.end;
    date = addDays(date, 1)
  ) {
    dates.push(new Date(date));
  }

  return dates.filter(date => {
    const lessons = resolveScheduleForDate(
      schedules,
      date,
      data?.currentWeek,
      1
    );

    return Array.isArray(lessons)
      ? lessons.length > 0
      : Boolean(lessons);
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

function formatExamDate(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    'en-US',
    {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }
  );
}

function getDayRelativity(date, now) {
  if (sameDate(date, now)) {
    return 'today';
  }

  return date < now
    ? 'past'
    : 'future';
}

function getDaySubtitle(
  date,
  now
) {
  if (sameDate(date, now)) {
    return 'Today';
  }

  const yesterday = addDays(now, -1);

  if (sameDate(date, yesterday)) {
    return 'Yesterday';
  }

  const tomorrow = addDays(now, 1);

  if (sameDate(date, tomorrow)) {
    return 'Tomorrow';
  }

  return '';
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
    selectedLesson,
    setSelectedLesson
  ] = useState(null);

  const [
    selectedTeacher,
    setSelectedTeacher
  ] = useState(null);

  const [
    activeAction,
    setActiveAction
  ] = useState('days');

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
  ] = useState(readPersonalEvents);

  const scheduleListRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 5000);

    return () => {
      clearInterval(timer);
    };
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

  const continuousDates = useMemo(
    () =>
      buildContinuousDates(
        schedules,
        data
      ),
    [
      schedules,
      data
    ]
  );

  const daySections = useMemo(
    () =>
      continuousDates.map(date => {
        const lessons =
          resolveLessonsForDate(
            schedules,
            date,
            currentWeek,
            subgroup,
            {
              referenceDate: now
            }
          );

        const dayEvents =
          personalEvents.filter(
            event =>
              event?.day ===
              personalDay(date)
          );

        const combined = [
          ...(Array.isArray(lessons)
            ? lessons
            : []),
          ...dayEvents
        ].sort(
          (a, b) =>
            parseStartTimeInMinutes(
              a.time
            ) -
            parseStartTimeInMinutes(
              b.time
            )
        );

        let nextFound = false;

        const items = combined.map(
          item => {
            if (item.isPersonal) {
              return {
                ...item,
                status: 'upcoming'
              };
            }

            const rawStatus =
              sameDate(date, now)
                ? getClassStatus(
                    item.time,
                    now
                  )
                : getDayRelativity(
                    date,
                    now
                  ) === 'past'
                  ? 'finished'
                  : 'upcoming';

            let status = rawStatus;

            if (
              sameDate(date, now) &&
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
          }
        );

        return {
          date,
          dateKey: getDateKey(date),
          title: formatDateTitle(date),
          subtitle: getDaySubtitle(
            date,
            now
          ),
          relativity: getDayRelativity(
            date,
            now
          ),
          items
        };
      }),
    [
      continuousDates,
      schedules,
      currentWeek,
      subgroup,
      personalEvents,
      now
    ]
  );

  const selectedDayLessons =
    useMemo(
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

  const selectedDayEvents =
    useMemo(() => {
      const day =
        personalDay(selectedDate);

      return personalEvents.filter(
        event =>
          event?.day === day
      );
    }, [
      personalEvents,
      selectedDate
    ]);

  const selectedSchedule =
    useMemo(() => {
      const combined = [
        ...(Array.isArray(
          selectedDayLessons
        )
          ? selectedDayLessons
          : []),
        ...selectedDayEvents
      ].sort(
        (a, b) =>
          parseStartTimeInMinutes(
            a.time
          ) -
          parseStartTimeInMinutes(
            b.time
          )
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

        let status = rawStatus;

        if (
          sameDate(
            selectedDate,
            now
          ) &&
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
      selectedDayLessons,
      selectedDayEvents,
      selectedDate,
      now
    ]);

  const handleToolbarAction =
    action => {
      setActiveAction(action);

      if (action === 'days') {
        requestAnimationFrame(() => {
          scheduleListRef.current?.scrollIntoView(
            {
              behavior: 'smooth',
              block: 'start'
            }
          );
        });
      }
    };

  const selectDate = date => {
    setSelectedDate(
      new Date(date)
    );

    setActiveAction(
      'calendar'
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
    const exists =
      personalEvents.some(
        item =>
          item.id === event.id
      );

    const updated = exists
      ? personalEvents.map(item =>
          item.id === event.id
            ? event
            : item
        )
      : [
          ...personalEvents,
          event
        ];

    setPersonalEvents(updated);

    try {
      localStorage.setItem(
        PERSONAL_EVENTS_KEY,
        JSON.stringify(updated)
      );
    } catch (error) {
      console.error(
        'Failed to save personal events:',
        error
      );
    }

    closeModal();
  };

  const deleteEvent = eventId => {
    const updated =
      personalEvents.filter(
        event =>
          event.id !== eventId
      );

    setPersonalEvents(updated);

    try {
      localStorage.setItem(
        PERSONAL_EVENTS_KEY,
        JSON.stringify(updated)
      );
    } catch (error) {
      console.error(
        'Failed to delete personal event:',
        error
      );
    }
  };

  const handleGroupChange =
    selectedGroup => {
      onGroupChange?.(
        selectedGroup
      );

      setIsGroupSelectorOpen(
        false
      );

      setIsGroupBrowserOpen(
        false
      );
    };

  const handleLessonClick =
    lesson => {
      setSelectedLesson(
        lesson
      );

      onLessonClick?.(
        lesson
      );
    };

  const renderContinuousView =
    () => (
      <div
        ref={scheduleListRef}
        className="space-y-6"
      >
        {daySections.map(
          section => (
            <section
              key={
                section.dateKey
              }
              className="scroll-mt-4"
            >
              <div className="mb-2 px-1">
                <div className="flex items-baseline gap-2">
                  <h2
                    className={`text-base font-bold ${
                      section.relativity ===
                      'past'
                        ? 'text-[var(--text-secondary)]'
                        : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {formatMonthDay(
                      section.date
                    )}
                  </h2>

                  {section.subtitle && (
                    <span
                      className={`text-[10px] font-semibold ${
                        section.relativity ===
                        'today'
                          ? 'text-[#2997ff]'
                          : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      {
                        section.subtitle
                      }
                    </span>
                  )}
                </div>

                <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">
                  {section.date.toLocaleDateString(
                    'en-US',
                    {
                      weekday:
                        'long'
                    }
                  )}
                </p>
              </div>

              <div className="overflow-hidden rounded-2xl bg-[var(--surface-glass)]">
                {section.items.length >
                0 ? (
                  section.items.map(
                    (item, index) => (
                      <ScheduleLessonCard
                        key={
                          item.id ||
                          `${section.dateKey}-${index}`
                        }
                        item={item}
                        now={now}
                        index={index}
                        onLessonClick={
                          handleLessonClick
                        }
                        onEditPersonalEvent={
                          openEditModal
                        }
                        onDeletePersonalEvent={
                          deleteEvent
                        }
                      />
                    )
                  )
                ) : (
                  <div className="px-4 py-5 text-sm text-[var(--text-secondary)]">
                    No classes
                  </div>
                )}
              </div>
            </section>
          )
        )}

        {!loading &&
          !hasScheduleData && (
            <div className="rounded-2xl bg-[var(--surface-glass)] px-4 py-8 text-center">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                No schedule available
              </p>
            </div>
          )}
      </div>
    );

  const renderCalendarView =
    () => (
      <ScheduleCalendar
        selectedDate={selectedDate}
        onSelectDate={
          selectDate
        }
        schedules={schedules}
        currentWeek={
          currentWeek
        }
        subgroup={subgroup}
        now={now}
      />
    );

  const renderExamsView =
    () => (
      <div className="space-y-3">
        {exams.length === 0 ? (
          <div className="rounded-2xl bg-[var(--surface-glass)] px-4 py-8 text-center">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              No exams
            </p>
          </div>
        ) : (
          exams.map(
            (exam, index) => (
              <div
                key={
                  exam.id ||
                  `${exam.date}-${index}`
                }
                className="rounded-2xl bg-[var(--surface-glass)] p-4"
              >
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  {exam.subject ||
                    exam.name ||
                    'Exam'}
                </h3>

                <div className="mt-2 space-y-1 text-[11px] text-[var(--text-secondary)]">
                  {exam.teacher && (
                    <p>
                      {
                        exam.teacher
                      }
                    </p>
                  )}

                  {exam.room && (
                    <p>
                      Room{' '}
                      {
                        exam.room
                      }
                    </p>
                  )}

                  {exam.date && (
                    <p>
                      {formatExamDate(
                        exam.date
                      )}
                    </p>
                  )}
                </div>
              </div>
            )
          )
        )}
      </div>
    );

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--text-secondary)]">
              Schedule
            </p>

            <button
              type="button"
              onClick={() =>
                setIsGroupSelectorOpen(
                  true
                )
              }
              className="mt-1 flex items-center gap-1.5 text-left"
            >
              <span className="truncate text-lg font-extrabold text-[var(--text-primary)]">
                {group ||
                  'All groups'}
              </span>

              <span
                aria-hidden="true"
                className="text-xs text-[var(--text-secondary)]"
              >
                ▾
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              setIsGroupBrowserOpen(
                true
              )
            }
            aria-label="Browse groups"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-glass)] text-[var(--text-secondary)]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle
                cx="9"
                cy="7"
                r="4"
              />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </button>
        </div>

        <ScheduleToolbar
          activeAction={
            activeAction
          }
          onAction={
            handleToolbarAction
          }
          isFavorite={false}
          onToggleFavorite={() => {}}
        />

        {activeAction ===
          'days' &&
          renderContinuousView()}

        {activeAction ===
          'calendar' &&
          renderCalendarView()}

        {activeAction ===
          'exams' &&
          renderExamsView()}
      </div>

      {selectedLesson && (
        <LessonDetailsSheet
          lesson={
            selectedLesson
          }
          onClose={() =>
            setSelectedLesson(
              null
            )
          }
          onTeacherClick={
            teacher =>
              setSelectedTeacher(
                teacher
              )
          }
        />
      )}

      {selectedTeacher && (
        <TeacherDetailsSheet
          teacher={
            selectedTeacher
          }
          onClose={() =>
            setSelectedTeacher(
              null
            )
          }
        />
      )}

      {isModalOpen && (
        <PersonalEventModal
          event={
            editingEvent
          }
          onSave={saveEvent}
          onDelete={
            deleteEvent
          }
          onClose={
            closeModal
          }
        />
      )}

      {isGroupSelectorOpen && (
        <GroupSelectorSheet
          group={group}
          onSelect={
            handleGroupChange
          }
          onClose={() =>
            setIsGroupSelectorOpen(
              false
            )
          }
        />
      )}

      {isGroupBrowserOpen && (
        <GroupBrowser
          selectedGroup={
            group
          }
          onSelect={
            handleGroupChange
          }
          onClose={() =>
            setIsGroupBrowserOpen(
              false
            )
          }
        />
      )}

      {activeAction ===
        'days' && (
        <button
          type="button"
          onClick={
            openCreateModal
          }
          className="fixed bottom-5 right-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#2997ff] text-2xl font-light text-white shadow-lg"
          aria-label="Add personal event"
        >
          +
        </button>
      )}
    </>
  );
}