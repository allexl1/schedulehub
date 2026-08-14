import React, { useState } from 'react';
import NextClassCard from '../components/home/NextClassCard';
import StatusPill from '../components/home/StatusPill';
import { formatCacheAge } from '../utils/formatCacheTime';
import {
  parseStartTimeInMinutes,
  evaluateScheduleLifecycle,
  formatRoomString
} from '../utils/time';
import { useLanguage } from '../context/LanguageContext';

export default function HomeView({ scheduleData, status = 'live', lastUpdatedTimestamp }) {
  const { student, nextLesson, todaySchedule } = scheduleData || {};
  const { t, language } = useLanguage();

  const now = new Date();
  const localeCode = language === 'ru' ? 'ru-RU' : 'en-US';

  // Localized weekday code
  const todayDayCode = now
    .toLocaleDateString(localeCode, { weekday: 'short' })
    .toUpperCase()
    .replace('.', '');

  const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayFilterCode = daysShort[now.getDay()];

  const [personalEvents] = useState(() => {
    try {
      const saved = localStorage.getItem('sh_personal_events');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const dayPersonalEvents = personalEvents.filter((ev) => ev.day === todayFilterCode);

  const combinedTodaySchedule = [...(todaySchedule || []), ...dayPersonalEvents].sort((a, b) => {
    const timeA = parseStartTimeInMinutes(a.time);
    const timeB = parseStartTimeInMinutes(b.time);
    if (timeA === timeB) {
      return a.isPersonal ? 1 : -1;
    }
    return timeA - timeB;
  });

  // Centralized Lifecycle Resolution with standalone nextLesson fallback support
  const lifecycle = evaluateScheduleLifecycle(combinedTodaySchedule, nextLesson, now);
  const formattedAge = formatCacheAge(lastUpdatedTimestamp, language);

  // Safe Identity Resolution
  const displayName =
    student?.shortName ||
    student?.firstName ||
    student?.name ||
    t.student;

  const groupNumber = student?.group || '373901';
  const subgroupSuffix = student?.subgroup ? `-${student.subgroup}` : '';
  const weekNumber = student?.currentWeek || 1;
  const weekLabel = language === 'ru' ? `${weekNumber} ${t.weekShort}` : `${t.weekShort}${weekNumber}`;

  const identityString = `${displayName} · ${groupNumber}${subgroupSuffix} (${weekLabel})`;

  return (
    <div className="pt-2 pb-6 space-y-6">
      {/* 1. Single Unified Top Context Bar */}
      <header className="flex justify-between items-center">
        <div className="text-xs font-semibold text-[var(--text-primary)] tracking-tight truncate pr-2">
          {identityString}
        </div>
        <div className="shrink-0">
          <StatusPill status={status} lastUpdated={formattedAge} />
        </div>
      </header>

      {/* 2. Hero Pass: Next / Current Class */}
      <section>
        <NextClassCard
          nextLesson={lifecycle.effectiveHeroLesson}
          lessonState={lifecycle.heroState}
          endTime={lifecycle.heroEndTime}
          minutesUntil={lifecycle.heroMinutesUntil}
        />
      </section>

      {/* 3. Open Timeline Agenda */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] opacity-70">
            {t.todaySchedule} ({combinedTodaySchedule.length})
          </h2>
          <span className="text-[10px] font-bold text-[var(--text-secondary)] font-mono opacity-50">
            {todayDayCode}
          </span>
        </div>

        {combinedTodaySchedule.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--text-secondary)] opacity-60 border-t border-[var(--border-glass)]/30">
            {t.noEventsToday}
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-glass)]/25 border-t border-b border-[var(--border-glass)]/25">
            {combinedTodaySchedule.map((item, idx) => {
              const isCurrent =
                lifecycle.currentLesson &&
                (item === lifecycle.currentLesson || item.id === lifecycle.currentLesson.id);

              const isNext =
                lifecycle.upcomingLesson &&
                (item === lifecycle.upcomingLesson || item.id === lifecycle.upcomingLesson.id);

              // Dual Awareness: Current gets green border; Next gets blue border consistently
              const borderIndicatorClass = isCurrent
                ? 'border-[#30d158]'
                : isNext
                ? 'border-[#2997ff]'
                : 'border-transparent';

              const roomText = formatRoomString(item.room, t.room);
              const teacherText = item.teacher || '';
              const metaText = [roomText, teacherText].filter(Boolean).join(' · ');

              return (
                <div
                  key={item.id || idx}
                  className={`py-3 pl-2.5 border-l-2 ${borderIndicatorClass} flex items-start gap-3.5 transition-colors`}
                >
                  {/* Left Fixed Monospaced Time */}
                  <div
                    className={`w-11 shrink-0 text-xs font-mono pt-0.5 flex items-center gap-1.5 ${
                      isCurrent
                        ? 'text-[var(--text-primary)] font-semibold'
                        : isNext
                        ? 'text-[#2997ff] font-semibold'
                        : 'text-[var(--text-secondary)] opacity-70'
                    }`}
                  >
                    {/* Dual awareness indicator: Blue dot for upcoming class during active lesson */}
                    {isNext && lifecycle.currentLesson && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2997ff] shrink-0" />
                    )}
                    <span>{item.time?.split(/[-–—]/)[0]?.trim()}</span>
                  </div>

                  {/* Right Subject & Metadata */}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div
                      className={`text-sm leading-snug line-clamp-2 ${
                        isCurrent || isNext
                          ? 'font-semibold text-[var(--text-primary)]'
                          : 'font-normal text-[var(--text-primary)]'
                      }`}
                    >
                      {item.subject}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] opacity-65 leading-snug break-words">
                      {item.isPersonal ? (
                        <span className="italic">{t.personalActivity}</span>
                      ) : (
                        metaText
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
