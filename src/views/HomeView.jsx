import React, {
  useEffect,
  useMemo,
  useState
} from 'react';

import NextClassCard from '../components/home/NextClassCard';
import { formatCacheAge } from '../utils/formatCacheTime';

import {
  parseStartTimeInMinutes,
  evaluateScheduleLifecycle,
  formatRoomString
} from '../utils/time';

import {
  getAcademicWeekForDate,
  resolveLessonsForDate
} from '../utils/scheduleResolver';

import { useLanguage } from '../context/LanguageContext';

const PERSONAL_EVENTS_KEY =
  'sh_personal_events';

const DAY_NAMES = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat'
];

function readPersonalEvents() {
  try {
    const saved =
      localStorage.getItem(
        PERSONAL_EVENTS_KEY
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

function getLessonColor(item) {
  if (item?.color) {
    return item.color;
  }

  const type =
    String(
      item?.type || ''
    ).toLowerCase();

  if (
    type.includes('lecture') ||
    type.includes('лек')
  ) {
    return '#2997ff';
  }

  if (
    type.includes('lab') ||
    type.includes('лаб')
  ) {
    return '#30d158';
  }

  if (
    type.includes('practice') ||
    type.includes('практ')
  ) {
    return '#ff9f0a';
  }

  if (
    type.includes('exam') ||
    type.includes('экзам')
  ) {
    return '#ff453a';
  }

  if (item?.isPersonal) {
    return '#bf5af2';
  }

  return '#8e8e93';
}

function getGreeting(now) {
  const hour =
    now.getHours();

  if (
    hour >= 6 &&
    hour < 12
  ) {
    return {
      text: 'Good morning',
      emoji: '☀️'
    };
  }

  if (
    hour >= 12 &&
    hour < 17
  ) {
    return {
      text: 'Good afternoon',
      emoji: '🌤️'
    };
  }

  if (
    hour >= 17 &&
    hour < 22
  ) {
    return {
      text: 'Good evening',
      emoji: '🌆'
    };
  }

  return {
    text: 'Good night',
    emoji: '🌙'
  };
}

function isSameLesson(
  a,
  b
) {
  if (!a || !b) {
    return false;
  }

  if (
    a === b
  ) {
    return true;
  }

  if (
    a.id &&
    b.id &&
    a.id === b.id
  ) {
    return true;
  }

  return false;
}

export default function HomeView({
  user,
  group,
  subgroup,
  scheduleData,
  status = 'live',
  lastUpdatedTimestamp
}) {
  const {
    dictionary,
    language
  } = useLanguage();

  const [now, setNow] =
    useState(
      () => new Date()
    );

  useEffect(() => {
    const interval =
      setInterval(() => {
        setNow(
          new Date()
        );
      }, 30000);

    return () =>
      clearInterval(
        interval
      );
  }, []);

  const data =
    scheduleData || {};

  const schedules =
    data?.schedules &&
    typeof data.schedules ===
      'object'
      ? data.schedules
      : {};

  const student =
    data?.studentGroup ||
    data?.student ||
    null;

  const currentWeekFromData =
    Number(
      data?.currentWeek
    );

  const academicWeek =
    getAcademicWeekForDate(
      now,
      now
    );

  const weekNumber =
    academicWeek ||
    (
      Number.isInteger(
        currentWeekFromData
      ) &&
      currentWeekFromData >= 1 &&
      currentWeekFromData <= 4
        ? currentWeekFromData
        : 1
    );

  const localeCode =
    language === 'ru'
      ? 'ru-RU'
      : 'en-US';

  const todayDayName =
    now.toLocaleDateString(
      localeCode,
      {
        weekday: 'long'
      }
    );

  const personalEvents =
    useMemo(
      () =>
        readPersonalEvents(),
      []
    );

  const todayPersonalEvents =
    useMemo(() => {
      const day =
        DAY_NAMES[
          now.getDay()
        ];

      return personalEvents.filter(
        event =>
          event?.day === day
      );
    }, [
      personalEvents,
      now
    ]);

  /*
   * IMPORTANT:
   *
   * Home resolves today's schedule from the
   * actual date instead of trusting the
   * potentially stale todaySchedules/nextLesson
   * values prepared by the service.
   *
   * This prevents future lessons such as
   * September 1 from being treated as if they
   * were happening today.
   */
  const resolvedTodayLessons =
    useMemo(
      () =>
        resolveLessonsForDate(
          schedules,
          now,
          weekNumber,
          subgroup,
          {
            referenceDate: now
          }
        ),
      [
        schedules,
        now,
        weekNumber,
        subgroup
      ]
    );

  const combinedTodaySchedule =
    useMemo(() => {
      return [
        ...resolvedTodayLessons,
        ...todayPersonalEvents
      ].sort(
        (a, b) => {
          const timeA =
            parseStartTimeInMinutes(
              a.time
            );

          const timeB =
            parseStartTimeInMinutes(
              b.time
            );

          if (
            timeA === timeB
          ) {
            return a.isPersonal
              ? 1
              : -1;
          }

          return (
            timeA - timeB
          );
        }
      );
    }, [
      resolvedTodayLessons,
      todayPersonalEvents
    ]);

  const lifecycle =
    evaluateScheduleLifecycle(
      combinedTodaySchedule,
      null,
      now
    );

  const formattedAge =
    formatCacheAge(
      lastUpdatedTimestamp,
      language
    );

  const displayName =
    user?.first_name ||
    (
      typeof student ===
      'object'
        ? student?.name
        : student
    ) ||
    'Student';

  const greetingData =
    getGreeting(now);

  const greetingText =
    `${greetingData.text}, ${displayName}`;

  const titleClass =
    greetingText.length > 30
      ? 'text-xl'
      : greetingText.length > 20
        ? 'text-2xl'
        : 'text-[32px]';

  return (
    <div className="space-y-6 pb-6 pt-2">
      <header>
        <h1
          className={`${titleClass} break-words font-bold leading-tight tracking-tight text-[var(--text-primary)]`}
        >
          {greetingData.text},{' '}
          {displayName}{' '}
          {greetingData.emoji}
        </h1>

        <p className="mt-2 text-sm font-medium text-[var(--text-secondary)]">
          Group: {group || 'Not selected'}
          {' • '}
          Subgroup: {subgroup}
          {' • '}
          Week: {weekNumber}
        </p>
      </header>

      <section>
        <NextClassCard
          nextLesson={
            lifecycle.effectiveHeroLesson
          }
          lessonState={
            lifecycle.heroState
          }
          endTime={
            lifecycle.heroEndTime
          }
          minutesUntil={
            lifecycle.heroMinutesUntil
          }
        />
      </section>

      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] opacity-70">
            {dictionary.todaySchedule} (
            {combinedTodaySchedule.length}
            )
          </h2>

          <span className="text-[11px] font-medium capitalize text-[var(--text-secondary)] opacity-60">
            {todayDayName}
          </span>
        </div>

        {combinedTodaySchedule.length === 0 ? (
          <div className="border-t border-[var(--border-glass)]/30 py-8 text-center text-xs text-[var(--text-secondary)] opacity-60">
            {dictionary.noEventsToday}
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-glass)]/25 border-b border-t border-[var(--border-glass)]/25">
            {combinedTodaySchedule.map(
              (
                item,
                index
              ) => {
                const isCurrent =
                  isSameLesson(
                    item,
                    lifecycle.currentLesson
                  );

                const isNext =
                  isSameLesson(
                    item,
                    lifecycle.upcomingLesson
                  );

                const lessonColor =
                  getLessonColor(
                    item
                  );

                const roomText =
                  formatRoomString(
                    item.room,
                    dictionary.room
                  );

                const teacherText =
                  item.teacher ||
                  '';

                const metaText = [
                  roomText,
                  teacherText
                ]
                  .filter(Boolean)
                  .join(' · ');

                return (
                  <div
                    key={
                      item.id ||
                      `${item.subject}-${item.time}-${index}`
                    }
                    className="flex items-start gap-3.5 border-l-2 py-3 pl-2.5 transition-colors"
                    style={{
                      borderLeftColor:
                        isCurrent
                          ? '#30d158'
                          : isNext
                            ? '#2997ff'
                            : lessonColor
                    }}
                  >
                    <div
                      className={`flex w-11 shrink-0 items-center gap-1.5 pt-0.5 font-mono text-xs ${
                        isCurrent
                          ? 'font-semibold text-[var(--text-primary)]'
                          : isNext
                            ? 'font-semibold text-[#2997ff]'
                            : 'text-[var(--text-secondary)] opacity-70'
                      }`}
                    >
                      {isNext &&
                        lifecycle.currentLesson && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#2997ff]" />
                        )}

                      <span>
                        {item.time
                          ?.split(
                            /[-–—]/
                          )[0]
                          ?.trim()}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              lessonColor
                          }}
                        />

                        <div
                          className={`line-clamp-2 text-sm leading-snug ${
                            isCurrent ||
                            isNext
                              ? 'font-semibold text-[var(--text-primary)]'
                              : 'font-normal text-[var(--text-primary)]'
                          }`}
                        >
                          {item.subject ||
                            'Lesson'}
                        </div>
                      </div>

                      <div className="break-words text-xs leading-snug text-[var(--text-secondary)] opacity-65">
                        {item.isPersonal ? (
                          <span className="italic">
                            {
                              dictionary.personalActivity
                            }
                          </span>
                        ) : (
                          metaText
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </section>

      {formattedAge && (
        <div className="text-center text-[10px] text-[var(--text-secondary)] opacity-50">
          {formattedAge}
        </div>
      )}
    </div>
  );
}