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
  const result = new Date(date);

  result.setHours(
    0,
    0,
    0,
    0
  );

  return result;
}

function addDays(date, amount) {
  const result = new Date(date);

  result.setDate(
    result.getDate() + amount
  );

  return result;
}

function sameDate(a, b) {
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
  if (sameDate(date, now)) {
    return 'Today';
  }

  if (
    sameDate(
      date,
      addDays(now, -1)
    )
  ) {
    return 'Yesterday';
  }

  if (
    sameDate(
      date,
      addDays(now, 1)
    )
  ) {
    return 'Tomorrow';
  }

  return '';
}

function getPersonalDay(date) {
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

function savePersonalEvents(events) {
  try {
    localStorage.setItem(
      PERSONAL_EVENTS_KEY,
      JSON.stringify(events)
    );
  } catch (error) {
    console.error(
      'Failed to save personal events:',
      error
    );
  }
}

function readFavoriteGroups() {
  try {
    const saved =
      localStorage.getItem(
        FAVORITES_KEY
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
}

function saveFavoriteGroups(
  groups
) {
  localStorage.setItem(
    FAVORITES_KEY,
    JSON.stringify(groups)
  );
}

function formatExamDate(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
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

export default function ScheduleView({
  scheduleData,
  group,
  subgroup = 1,
  loading = false,
  onLessonClick,
  onGroupChange
}) {
  const [now, setNow] =
    useState(
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

  /*
   * Initial continuous schedule.
   *
   * This follows the Swift behavior:
   * start around yesterday and resolve
   * actual schedule dates inside the
   * API-provided schedule boundaries.
   */
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

  const loadMoreDays = () => {
    if (
      isLoadingMore ||
      loadedDays.length === 0
    ) {
      return;
    }

    const lastDay =
      loadedDays[
        loadedDays.length - 1
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

    if (moreDays.length > 0) {
      setLoadedDays(
        current => [
          ...current,
          ...moreDays
        ]
      );
    }

    setIsLoadingMore(false);
  };

  /*
   * Automatically request the next batch
   * when the user reaches the bottom.
   */
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
            entries[0]?.isIntersecting
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
    useMemo(() => {
      return loadedDays.map(
        section => {
          const personal =
            personalEvents.filter(
              event =>
                event?.day ===
                getPersonalDay(
                  section.date
                )
            );

          const lessonItems =
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
            ...lessonItems,
            ...personal.map(
              event => ({
                ...event,
                status:
                  sameDate(
                    section.date,
                    now
                  )
                    ? 'upcoming'
                    : section.date < now
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
      );
    }, [
      loadedDays,
      personalEvents,
      now
    ]);
    
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
      setActiveAction(action);

      if (
        action === 'days'
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

  const closeEventModal =
    () => {
      setIsModalOpen(false);
      setEditingEvent(null);
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

      closeEventModal();
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

  const renderContinuous =
    () => (
      <div
        ref={scheduleListRef}
        className="space-y-6"
      >
        {daySections.map(
          section => {
            const isToday =
              sameDate(
                section.date,
                now
              );

            const relative =
              getRelativeLabel(
                section.date,
                now
              );

            return (
              <section
                key={
                  section.dateKey
                }
                className="scroll-mt-4"
              >
                <div className="mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[var(--text-primary)]">
                      {formatDate(
                        section.date
                      )}
                    </h2>

                    {relative && (
                      <span
                        className={`text-[10px] font-semibold ${
                          isToday
                            ? 'text-[#2997ff]'
                            : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        {
                          relative
                        }
                      </span>
                    )}
                  </div>

                  <div className="mt-0.5 flex items-center gap-2">
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      {getDayName(
                        section.date
                      )}
                    </p>

                    <span className="text-[10px] text-[var(--text-secondary)]">
                      Week{' '}
                      {
                        section.weekNumber
                      }
                    </span>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl bg-[var(--surface-glass)]">
                  {section.items.map(
                    (
                      item,
                      index
                    ) => (
                      <ScheduleLessonCard
                        key={
                          item.id ||
                          `${section.dateKey}-${index}`
                        }
                        item={
                          item
                        }
                        now={now}
                        index={
                          index
                        }
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
            );
          }
        )}

        {!loading &&
          scheduleReady &&
          daySections.length ===
            0 && (
            <div className="rounded-2xl bg-[var(--surface-glass)] px-4 py-8 text-center">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                No classes found
              </p>

              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                There are no classes in
                the current schedule range.
              </p>
            </div>
          )}

        {scheduleReady &&
          daySections.length > 0 && (
          <div
            ref={loadMoreRef}
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
        now={now}
      />
    );

  const renderExams =
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

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4 text-[var(--text-secondary)]"
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
  isFavorite={
    isCurrentGroupFavorite
  }
  onToggleFavorite={
    handleToggleFavorite
  }
/>

        {activeAction ===
          'days' &&
          renderContinuous()}

        {activeAction ===
          'calendar' &&
          renderCalendar()}

        {activeAction ===
          'exams' &&
          renderExams()}
      </div>

      {activeAction ===
        'days' && (
        <button
          type="button"
          onClick={
            openCreateEvent
          }
          aria-label="Add personal event"
          className="fixed bottom-5 right-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#2997ff] text-2xl font-light text-white shadow-lg"
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
          onClose={
            closeEventModal
          }
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