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

import {
  getByDayScheduleForWeek
} from '../utils/daySchedule';

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
      weekday: 'short',
      month: 'long',
      day: 'numeric'
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
      <div className="mb-3 px-2">
        <div className="flex items-center gap-2">
          <h2 className="text-[20px] font-bold tracking-tight text-[var(--text-primary)]">
            {getDayName(date)}
          </h2>

          {isToday && (
            <span className="text-[13px] font-semibold text-[#007aff]">
              Today
            </span>
          )}
        </div>

        <p className="mt-0.5 text-[14px] text-[var(--text-secondary)]">
          Week {weekNumber}
        </p>
      </div>
    );
  }

  return (
    <div className="mb-3 px-2">
      <div className="flex items-baseline gap-2">
        <h2
          className={`text-[21px] font-bold tracking-tight ${
            isToday
              ? 'text-[#007aff]'
              : 'text-[var(--text-primary)]'
          }`}
        >
          {formatDate(date)}
        </h2>

        {relative && (
          <span className="text-[13px] font-semibold text-[#007aff]">
            {relative}
          </span>
        )}
      </div>

      <p className="mt-0.5 text-[14px] font-medium text-[var(--text-secondary)]">
        Week {weekNumber}
      </p>
    </div>
  );
}

function CompactSectionHeader({
  dayName,
  weekNumber
}) {
  return (
    <div className="mb-3 px-2">
      <div className="flex items-center gap-2">
        <h2 className="text-[20px] font-bold tracking-tight text-[var(--text-primary)]">
          {dayName}
        </h2>
      </div>

      <p className="mt-0.5 text-[14px] text-[var(--text-secondary)]">
        Week {weekNumber}
      </p>
    </div>
  );
}

export default function ScheduleView({
  scheduleData,
  group,
  subgroup = 1,
  loading = false,
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

    setLoadedDays(
      days
    );
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

      setIsLoadingMore(
        true
      );

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

      setIsLoadingMore(
        false
      );
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

  const byDaySections =
    useMemo(() => {
      if (
        !scheduleReady
      ) {
        return [];
      }

      const days =
        getByDayScheduleForWeek({
          schedules,
          startDate:
            scheduleStartDate,
          endDate:
            scheduleEndDate,
          referenceDate:
            now,
          subgroup,
          weekNumber:
            currentWeek
        });

      return days.map(
        day => ({
          ...day,
          dayName:
            day.key,
          weekNumber:
            currentWeek,
          items:
            day.lessons.map(
              lesson => ({
                ...lesson,
                status:
                  'upcoming'
              })
            )
        })
      );
    }, [
      scheduleReady,
      schedules,
      scheduleStartDate,
      scheduleEndDate,
      subgroup,
      currentWeek,
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

      setEditingEvent(
        null
      );
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
      setEditingEvent(
        null
      );

      setIsModalOpen(
        true
      );
    };

  const openEditEvent =
    event => {
      setEditingEvent(
        event
      );

      setIsModalOpen(
        true
      );
    };

  const renderContinuous =
    () => (
      <div
        ref={
          scheduleListRef
        }
        className="space-y-8"
      >
        {daySections.map(
          section => (
            <section
              key={
                section.dateKey
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
              />

              <div className="space-y-3">
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
          daySections.length ===
            0 && (
            <div className="rounded-[16px] bg-[#f2f2f7] px-4 py-10 text-center">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                No classes
              </p>

              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                No classes are available for this schedule.
              </p>
            </div>
          )}

        {scheduleReady &&
          daySections.length >
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

  const renderByDay =
    () => (
      <div className="space-y-8">
        {byDaySections.map(
          section => (
            <section
              key={
                `by-day-${section.key}`
              }
            >
              <CompactSectionHeader
                dayName={
                  section.dayName
                }
                weekNumber={
                  section.weekNumber
                }
              />

              <div className="space-y-3">
                {section.items.map(
                  (
                    item,
                    index
                  ) => (
                    <ScheduleLessonCard
                      key={
                        item.id ||
                        `by-day-${section.key}-${index}`
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
          byDaySections.length ===
            0 && (
            <div className="rounded-[16px] bg-[#f2f2f7] px-4 py-10 text-center">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                No classes
              </p>

              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                No recurring classes are available.
              </p>
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
          <div className="rounded-[16px] bg-[#f2f2f7] px-4 py-10 text-center">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              No exams
            </p>
          </div>
        ) : (
          exams.map(
            (
              exam,
              index
            ) => (
              <div
                key={
                  exam.id ||
                  `${exam.date}-${index}`
                }
                className="rounded-[16px] bg-[#f2f2f7] p-4"
              >
                <h3 className="text-[17px] font-bold text-[var(--text-primary)]">
                  {exam.subject ||
                    exam.name ||
                    'Exam'}
                </h3>

                {exam.teacher && (
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {
                      exam.teacher
                    }
                  </p>
                )}

                {exam.room && (
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Room{' '}
                    {
                      exam.room
                    }
                  </p>
                )}

                {exam.date && (
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
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
      <div className="space-y-6">
        <ScheduleToolbar
          group={group}
          activeAction={
            activeAction
          }
          onAction={
            handleToolbarAction
          }
          onOpenGroupSelector={() =>
            setIsGroupSelectorOpen(
              true
            )
          }
          onOpenGroupBrowser={() =>
            setIsGroupBrowserOpen(
              true
            )
          }
          isFavorite={
            isCurrentGroupFavorite
          }
          onToggleFavorite={
            handleToggleFavorite
          }
        />

        {activeAction ===
          'continuous' &&
          renderContinuous()}

        {activeAction ===
          'compact' &&
          renderByDay()}

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
          className="fixed bottom-20 right-5 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-[#007aff] text-2xl font-light text-white shadow-lg transition-transform active:scale-95"
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