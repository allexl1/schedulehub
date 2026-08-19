import React, {
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import LessonDetailsSheet from '../components/schedule/LessonDetailsSheet';
import TeacherDetailsSheet from '../components/schedule/TeacherDetailsSheet';
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
  getInitialContinuousSchedule,
  getMoreContinuousSchedule
} from '../utils/continuousSchedule';

const PERSONAL_EVENTS_KEY =
  'sh_personal_events';

const FAVORITES_KEY =
  'sh_schedule_favorite_groups';

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

function addDays(
  date,
  amount
) {
  const result =
    new Date(date);

  result.setDate(
    result.getDate() +
      amount
  );

  return result;
}

function sameDate(
  first,
  second
) {
  return (
    first.getFullYear() ===
      second.getFullYear() &&
    first.getMonth() ===
      second.getMonth() &&
    first.getDate() ===
      second.getDate()
  );
}

function formatDate(date) {
  return date.toLocaleDateString(
    'en-US',
    {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }
  );
}

function getDayName(date) {
  return date.toLocaleDateString(
    'en-US',
    {
      weekday: 'long'
    }
  );
}

function getRelativeLabel(
  date,
  now
) {
  if (
    sameDate(
      date,
      now
    )
  ) {
    return 'Today';
  }

  if (
    sameDate(
      date,
      addDays(now, 1)
    )
  ) {
    return 'Tomorrow';
  }

  if (
    sameDate(
      date,
      addDays(now, -1)
    )
  ) {
    return 'Yesterday';
  }

  return '';
}

function getPersonalDay(
  date
) {
  return date.toLocaleDateString(
    'en-US',
    {
      weekday: 'short'
    }
  );
}

function readPersonalEvents() {
  try {
    const value =
      localStorage.getItem(
        PERSONAL_EVENTS_KEY
      );

    if (!value) {
      return [];
    }

    const parsed =
      JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function savePersonalEvents(
  events
) {
  try {
    localStorage.setItem(
      PERSONAL_EVENTS_KEY,
      JSON.stringify(events)
    );
  } catch {
    return;
  }
}

function readFavoriteGroups() {
  try {
    const value =
      localStorage.getItem(
        FAVORITES_KEY
      );

    if (!value) {
      return [];
    }

    const parsed =
      JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function saveFavoriteGroups(
  groups
) {
  try {
    localStorage.setItem(
      FAVORITES_KEY,
      JSON.stringify(groups)
    );
  } catch {
    return;
  }
}

function formatExamDate(
  value
) {
  if (!value) {
    return '';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
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

function getLessonStatus(
  lesson,
  date,
  now
) {
  if (
    !sameDate(
      date,
      now
    )
  ) {
    return date < now
      ? 'past'
      : 'upcoming';
  }

  const status =
    getClassStatus(
      lesson.time,
      now
    );

  if (
    status === 'current'
  ) {
    return 'in_progress';
  }

  if (
    status === 'finished'
  ) {
    return 'past';
  }

  return 'upcoming';
}

function getCompactSections(
  loadedDays
) {
  const sections = new Map();

  loadedDays.forEach(
    section => {
      const weekday =
        section.date.getDay() ===
        0
          ? 7
          : section.date.getDay();

      if (
        !sections.has(
          weekday
        )
      ) {
        sections.set(
          weekday,
          {
            weekday,
            date:
              section.date,
            weekNumber:
              section.weekNumber,
            lessons:
              section.lessons
          }
        );
      }
    }
  );

  return Array.from(
    sections.values()
  ).sort(
    (a, b) =>
      a.weekday -
      b.weekday
  );
}

function SectionHeader({
  date,
  weekNumber,
  now,
  compact = false
}) {
  const relative =
    getRelativeLabel(
      date,
      now
    );

  const isToday =
    sameDate(
      date,
      now
    );

  if (compact) {
    return (
      <div className="mb-3 px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            {getDayName(date)}
          </h2>

          {isToday && (
            <span className="rounded-full bg-[#2997ff]/10 px-2 py-0.5 text-[9px] font-bold text-[#2997ff]">
              Today
            </span>
          )}
        </div>

        <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">
          Week {weekNumber}
        </p>
      </div>
    );
  }

  return (
    <div className="mb-3 px-1">
      <div className="flex items-center gap-2">
        <h2
          className={`text-base font-bold ${
            isToday
              ? 'text-[#2997ff]'
              : 'text-[var(--text-primary)]'
          }`}
        >
          {formatDate(date)}
        </h2>

        {relative && (
          <span
            className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
              isToday
                ? 'bg-[#2997ff]/10 text-[#2997ff]'
                : 'bg-[var(--surface-glass)] text-[var(--text-secondary)]'
            }`}
          >
            {relative}
          </span>
        )}
      </div>

      <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--text-secondary)]">
        <span>
          {getDayName(date)}
        </span>

        <span aria-hidden="true">
          •
        </span>

        <span>
          Week {weekNumber}
        </span>
      </div>
    </div>
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
  const [
    now,
    setNow
  ] = useState(
    () => new Date()
  );

  const [
    selectedDate,
    setSelectedDate
  ] = useState(
    () =>
      startOfDay(
        new Date()
      )
  );

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
  ] = useState(
    'continuous'
  );

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
  ] = useState(
    readPersonalEvents
  );

  const [
    favoriteGroups,
    setFavoriteGroups
  ] = useState(
    readFavoriteGroups
  );

  const [
    loadedDays,
    setLoadedDays
  ] = useState([]);

  const [
    isLoadingMore,
    setIsLoadingMore
  ] = useState(false);

  const scheduleListRef =
    useRef(null);

  const loadMoreRef =
    useRef(null);

  useEffect(() => {
    const interval =
      setInterval(() => {
        setNow(
          new Date()
        );
      }, 5000);

    return () =>
      clearInterval(
        interval
      );
  }, []);

  const schedules =
    scheduleData?.schedules &&
    typeof scheduleData.schedules ===
      'object'
      ? scheduleData.schedules
      : {};

  const currentWeek =
    Number(
      scheduleData?.currentWeek
    ) || 1;

  const exams =
    Array.isArray(
      scheduleData?.exams
    )
      ? scheduleData.exams
      : [];

  const scheduleStartDate =
    scheduleData?.startDate ||
    null;

  const scheduleEndDate =
    scheduleData?.endDate ||
    null;

  const scheduleReady =
    Boolean(
      scheduleStartDate &&
        scheduleEndDate &&
        Object.keys(
          schedules
        ).length > 0
    );

  useEffect(() => {
    if (!scheduleReady) {
      setLoadedDays([]);
      return;
    }

    const days =
      getInitialContinuousSchedule({
        schedules,
        startDate:
          scheduleStartDate,
        endDate:
          scheduleEndDate,
        now,
        subgroup,
        limit: 12
      });

    setLoadedDays(days);
  }, [
    scheduleReady,
    schedules,
    scheduleStartDate,
    scheduleEndDate,
    subgroup
  ]);

  const loadMoreDays =
    () => {
      if (
        isLoadingMore ||
        loadedDays.length ===
          0
      ) {
        return;
      }

      const lastDay =
        loadedDays[
          loadedDays.length -
            1
        ];

      if (
        !lastDay?.date ||
        !scheduleEndDate
      ) {
        return;
      }

      setIsLoadingMore(true);

      const moreDays =
        getMoreContinuousSchedule({
          schedules,
          startDate:
            scheduleStartDate,
          endDate:
            scheduleEndDate,
          lastDate:
            lastDay.date,
          now,
          subgroup,
          limit: 10
        });

      if (
        moreDays.length > 0
      ) {
        setLoadedDays(
          current => [
            ...current,
            ...moreDays
          ]
        );
      }

      setIsLoadingMore(false);
    };

  useEffect(() => {
    const element =
      loadMoreRef.current;

    if (!element) {
      return undefined;
    }

    const observer =
      new IntersectionObserver(
        entries => {
          if (
            entries[0]
              ?.isIntersecting
          ) {
            loadMoreDays();
          }
        },
        {
          rootMargin:
            '500px'
        }
      );

    observer.observe(
      element
    );

    return () =>
      observer.disconnect();
  }, [
    loadedDays,
    isLoadingMore,
    scheduleEndDate
  ]);

  const daySections =
    useMemo(
      () =>
        loadedDays.map(
          section => {
            const personal =
              personalEvents.filter(
                event =>
                  event?.day ===
                  getPersonalDay(
                    section.date
                  )
              );

            const lessons =
              section.lessons.map(
                lesson => ({
                  ...lesson,
                  status:
                    getLessonStatus(
                      lesson,
                      section.date,
                      now
                    )
                })
              );

            const items = [
              ...lessons,
              ...personal.map(
                event => ({
                  ...event,
                  status:
                    sameDate(
                      section.date,
                      now
                    )
                      ? 'upcoming'
                      : section.date <
                          now
                        ? 'past'
                        : 'upcoming'
                })
              )
            ].sort(
              (a, b) =>
                parseStartTimeInMinutes(
                  a.time
                ) -
                parseStartTimeInMinutes(
                  b.time
                )
            );

            return {
              ...section,
              items
            };
          }
        ),
      [
        loadedDays,
        personalEvents,
        now
      ]
    );

  const compactSections =
    useMemo(
      () =>
        getCompactSections(
          daySections
        ),
      [daySections]
    );

  const isCurrentGroupFavorite =
    Boolean(
      group &&
        favoriteGroups.includes(
          group
        )
    );

  const handleToggleFavorite =
    () => {
      if (!group) {
        return;
      }

      const updated =
        isCurrentGroupFavorite
          ? favoriteGroups.filter(
              favoriteGroup =>
                favoriteGroup !==
                group
            )
          : [
              ...favoriteGroups,
              group
            ];

      setFavoriteGroups(
        updated
      );

      saveFavoriteGroups(
        updated
      );
    };

  const handleToolbarAction =
    action => {
      setActiveAction(
        action
      );

      if (
        action ===
        'continuous'
      ) {
        requestAnimationFrame(
          () => {
            scheduleListRef.current?.scrollIntoView(
              {
                behavior:
                  'smooth',
                block:
                  'start'
              }
            );
          }
        );
      }
    };

  const handleDateSelect =
    date => {
      const nextDate =
        startOfDay(
          new Date(date)
        );

      setSelectedDate(
        nextDate
      );

      setActiveAction(
        'calendar'
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

  const handleGroupChange =
    nextGroup => {
      const normalized =
        String(
          nextGroup || ''
        ).trim();

      if (!normalized) {
        return;
      }

      onGroupChange?.(
        normalized
      );

      setIsGroupSelectorOpen(
        false
      );

      setIsGroupBrowserOpen(
        false
      );
    };

  const handleSaveEvent =
    event => {
      const exists =
        personalEvents.some(
          item =>
            item.id ===
            event.id
        );

      const updated =
        exists
          ? personalEvents.map(
              item =>
                item.id ===
                event.id
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

      savePersonalEvents(
        updated
      );

      setIsModalOpen(
        false
      );

      setEditingEvent(null);
    };

  const handleDeleteEvent =
    eventId => {
      const updated =
        personalEvents.filter(
          event =>
            event.id !==
            eventId
        );

      setPersonalEvents(
        updated
      );

      savePersonalEvents(
        updated
      );
    };

  const openCreateEvent =
    () => {
      setEditingEvent(null);
      setIsModalOpen(true);
    };

  const openEditEvent =
    event => {
      setEditingEvent(
        event
      );

      setIsModalOpen(true);
    };

  const renderDaySections =
    (
      sections,
      compact = false
    ) => (
      <div
        ref={
          compact
            ? undefined
            : scheduleListRef
        }
        className="space-y-7"
      >
        {sections.map(
          section => (
            <section
              key={
                compact
                  ? `compact-${section.weekday}`
                  : section.dateKey
              }
              className="scroll-mt-4"
            >
              <SectionHeader
                date={
                  section.date
                }
                weekNumber={
                  section.weekNumber
                }
                now={now}
                compact={
                  compact
                }
              />

              <div className="overflow-hidden rounded-2xl border border-[var(--border-glass)] bg-[var(--surface-glass)]">
                {section.items.map(
                  (
                    item,
                    index
                  ) => (
                    <ScheduleLessonCard
                      key={
                        item.id ||
                        `${section.dateKey || section.weekday}-${index}`
                      }
                      item={item}
                      now={now}
                      index={index}
                      onLessonClick={
                        handleLessonClick
                      }
                      onEditPersonalEvent={
                        openEditEvent
                      }
                      onDeletePersonalEvent={
                        handleDeleteEvent
                      }
                    />
                  )
                )}
              </div>
            </section>
          )
        )}

        {!loading &&
          scheduleReady &&
          sections.length ===
            0 && (
            <div className="rounded-2xl bg-[var(--surface-glass)] px-4 py-10 text-center">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                No classes
              </p>

              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                No classes are available for this schedule.
              </p>
            </div>
          )}

        {!compact &&
          scheduleReady &&
          sections.length >
            0 && (
            <div
              ref={
                loadMoreRef
              }
              className="flex min-h-12 items-center justify-center"
            >
              {isLoadingMore && (
                <span className="text-xs text-[var(--text-secondary)]">
                  Loading more...
                </span>
              )}
            </div>
          )}
      </div>
    );

  const renderContinuous =
    () =>
      renderDaySections(
        daySections
      );

  const renderCompact =
    () =>
      renderDaySections(
        compactSections,
        true
      );

  const renderCalendar =
    () => (
      <ScheduleCalendar
        selectedDate={
          selectedDate
        }
        onSelectDate={
          handleDateSelect
        }
        schedules={
          schedules
        }
        currentWeek={
          currentWeek
        }
        subgroup={
          subgroup
        }
        referenceDate={
          now
        }
      />
    );

  const renderExams =
    () => (
      <div className="space-y-3">
        {exams.length ===
        0 ? (
          <div className="rounded-2xl bg-[var(--surface-glass)] px-4 py-10 text-center">
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
                className="rounded-2xl border border-[var(--border-glass)] bg-[var(--surface-glass)] p-4"
              >
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  {exam.subject ||
                    exam.name ||
                    'Exam'}
                </h3>

                {exam.teacher && (
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">
                    {
                      exam.teacher
                    }
                  </p>
                )}

                {exam.room && (
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Room{' '}
                    {
                      exam.room
                    }
                  </p>
                )}

                {exam.date && (
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {formatExamDate(
                      exam.date
                    )}
                  </p>
                )}
              </div>
            )
          )
        )}
      </div>
    );

  return (
    <>
      <div className="space-y-5">
        <header className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text-secondary)]">
                Schedule
              </p>

              <button
                type="button"
                onClick={() =>
                  setIsGroupSelectorOpen(
                    true
                  )
                }
                className="mt-1 flex max-w-full items-center gap-2 text-left"
              >
                <span className="truncate text-xl font-extrabold text-[var(--text-primary)]">
                  {group ||
                    'All groups'}
                </span>

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4 shrink-0 text-[var(--text-secondary)]"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
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
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-glass)] text-[var(--text-secondary)] transition-transform active:scale-95"
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
            isFavorite={
              isCurrentGroupFavorite
            }
            onToggleFavorite={
              handleToggleFavorite
            }
          />
        </header>

        {activeAction ===
          'continuous' &&
          renderContinuous()}

        {activeAction ===
          'compact' &&
          renderCompact()}

        {activeAction ===
          'calendar' &&
          renderCalendar()}

        {activeAction ===
          'exams' &&
          renderExams()}
      </div>

      {activeAction ===
        'continuous' && (
        <button
          type="button"
          onClick={
            openCreateEvent
          }
          aria-label="Add personal event"
          className="fixed bottom-5 right-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#2997ff] text-2xl font-light text-white shadow-lg transition-transform active:scale-95"
        >
          +
        </button>
      )}

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
          onSave={
            handleSaveEvent
          }
          onDelete={
            handleDeleteEvent
          }
          onClose={() => {
            setIsModalOpen(
              false
            );
            setEditingEvent(
              null
            );
          }}
        />
      )}

      {isGroupSelectorOpen && (
        <GroupSelectorSheet
          currentGroup={
            group
          }
          onSelectGroup={
            handleGroupChange
          }
          onOpenBrowser={() => {
            setIsGroupSelectorOpen(
              false
            );

            setIsGroupBrowserOpen(
              true
            );
          }}
          onClose={() =>
            setIsGroupSelectorOpen(
              false
            )
          }
        />
      )}

      {isGroupBrowserOpen && (
        <GroupBrowser
          currentGroup={
            group
          }
          onSelectGroup={
            handleGroupChange
          }
          onClose={() =>
            setIsGroupBrowserOpen(
              false
            )
          }
        />
      )}
    </>
  );
}