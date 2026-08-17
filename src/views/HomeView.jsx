import React, {
  useEffect,
  useState
} from 'react';

import NextClassCard from '../components/home/NextClassCard';
import StatusPill from '../components/home/StatusPill';
import { formatCacheAge } from '../utils/formatCacheTime';

import {
  parseStartTimeInMinutes,
  evaluateScheduleLifecycle,
  formatRoomString
} from '../utils/time';

import { useLanguage } from '../context/LanguageContext';

export default function HomeView({
  user,
  group,
  subgroup,
  scheduleData,
  status = 'live',
  lastUpdatedTimestamp
}) {
  const {
    student,
    nextLesson,
    todaySchedule
  } = scheduleData || {};

  const {
    dictionary,
    language
  } = useLanguage();

  const [now, setNow] = useState(
    () => new Date()
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

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

  const daysShort = [
    'Sun',
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat'
  ];

  const todayFilterCode =
    daysShort[now.getDay()];

  const [personalEvents] = useState(() => {
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

  const dayPersonalEvents =
    personalEvents.filter(
      event =>
        event.day ===
        todayFilterCode
    );

  const combinedTodaySchedule = [
    ...(todaySchedule || []),
    ...dayPersonalEvents
  ].sort((a, b) => {
    const timeA =
      parseStartTimeInMinutes(
        a.time
      );

    const timeB =
      parseStartTimeInMinutes(
        b.time
      );

    if (timeA === timeB) {
      return a.isPersonal
        ? 1
        : -1;
    }

    return timeA - timeB;
  });

  const lifecycle =
    evaluateScheduleLifecycle(
      combinedTodaySchedule,
      nextLesson,
      now
    );

  const formattedAge =
    formatCacheAge(
      lastUpdatedTimestamp,
      language
    );

  const weekNumber =
    Number(
      student?.currentWeek
    ) || 1;

  const displayName =
    user?.first_name ||
    (
      typeof student === 'object'
        ? student?.name
        : student
    ) ||
    'Student';

  const greetingData = (() => {
    const hour = now.getHours();

    if (hour >= 6 && hour < 12) {
      return {
        text: 'Доброе утро',
        emoji: '☀️'
      };
    }

    if (hour >= 12 && hour < 17) {
      return {
        text: 'Добрый день',
        emoji: '🌤️'
      };
    }

    if (hour >= 17 && hour < 22) {
      return {
        text: 'Добрый вечер',
        emoji: '🌆'
      };
    }

    return {
      text: 'Доброй ночи',
      emoji: '🌙'
    };
  })();

  const greetingText =
    `${greetingData.text}, ${displayName}`;

  const titleClass =
    greetingText.length > 30
      ? 'text-xl'
      : greetingText.length > 20
        ? 'text-2xl'
        : 'text-[32px]';

  return (
    <div className="pt-2 pb-6 space-y-6">
      <header>
        <h1
          className={`${titleClass} font-bold tracking-tight leading-tight text-[var(--text-primary)] break-words`}
        >
          {greetingData.text},{' '}
          {displayName}{' '}
          {greetingData.emoji}
        </h1>

        <p className="mt-2 text-sm font-medium text-[var(--text-secondary)]">
          Группа: {group}
          {' • '}
          Подгруппа: {subgroup}
          {' • '}
          Неделя: {weekNumber}
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

          <span className="text-[11px] font-medium text-[var(--text-secondary)] opacity-60 capitalize">
            {todayDayName}
          </span>
        </div>

        {combinedTodaySchedule.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--text-secondary)] opacity-60 border-t border-[var(--border-glass)]/30">
            {dictionary.noEventsToday}
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-glass)]/25 border-t border-b border-[var(--border-glass)]/25">
            {combinedTodaySchedule.map(
              (item, index) => {
                const isCurrent =
                  lifecycle.currentLesson &&
                  (
                    item ===
                      lifecycle.currentLesson ||
                    item.id ===
                      lifecycle.currentLesson.id
                  );

                const isNext =
                  lifecycle.upcomingLesson &&
                  (
                    item ===
                      lifecycle.upcomingLesson ||
                    item.id ===
                      lifecycle.upcomingLesson.id
                  );

                const lessonType =
                  item.type || '';

                const lessonColor =
                  lessonType === 'Lecture'
                    ? '#2997ff'
                    : lessonType === 'Lab'
                      ? '#30d158'
                      : lessonType === 'Practice'
                        ? '#ff9f0a'
                        : lessonType === 'Exam'
                          ? '#ff453a'
                          : item.isPersonal
                            ? '#bf5af2'
                            : '#8e8e93';

                const borderIndicatorColor =
                  isCurrent
                    ? '#30d158'
                    : isNext
                      ? '#2997ff'
                      : lessonColor;

                const roomText =
                  formatRoomString(
                    item.room,
                    dictionary.room
                  );

                const teacherText =
                  item.teacher || '';

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
                      index
                    }
                    className="py-3 pl-2.5 border-l-2 flex items-start gap-3.5 transition-colors"
                    style={{
                      borderLeftColor:
                        borderIndicatorColor
                    }}
                  >
                    <div
                      className={`w-11 shrink-0 text-xs font-mono pt-0.5 flex items-center gap-1.5 ${
                        isCurrent
                          ? 'text-[var(--text-primary)] font-semibold'
                          : isNext
                            ? 'text-[#2997ff] font-semibold'
                            : 'text-[var(--text-secondary)] opacity-70'
                      }`}
                    >
                      {isNext &&
                        lifecycle.currentLesson && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#2997ff] shrink-0" />
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
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              lessonColor
                          }}
                        />

                        <div
                          className={`text-sm leading-snug line-clamp-2 ${
                            isCurrent ||
                            isNext
                              ? 'font-semibold text-[var(--text-primary)]'
                              : 'font-normal text-[var(--text-primary)]'
                          }`}
                        >
                          {item.subject}
                        </div>
                      </div>

                      <div className="text-xs text-[var(--text-secondary)] opacity-65 leading-snug break-words">
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
        <div className="text-[10px] text-[var(--text-secondary)] opacity-50 text-center">
          {formattedAge}
        </div>
      )}
    </div>
  );
}