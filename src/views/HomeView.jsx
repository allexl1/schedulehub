import React, { useState } from 'react';
import NextClassCard from '../components/home/NextClassCard';
import StatusPill from '../components/home/StatusPill';
import { formatCacheAge } from '../utils/formatCacheTime';
import { parseStartTimeInMinutes, calculateMinutesUntil } from '../utils/time';
import { useLanguage } from '../context/LanguageContext';

export default function HomeView({ scheduleData, status = 'live', lastUpdatedTimestamp }) {
  const { student, nextLesson, todaySchedule } = scheduleData || {};
  const { language } = useLanguage();

  const isRu = language === 'ru';

  const now = new Date();
  const localeCode = isRu ? 'ru-RU' : 'en-US';
  const dayName = now.toLocaleDateString(localeCode, { weekday: 'long' });
  const dayMonth = now.toLocaleDateString(localeCode, { day: 'numeric', month: 'long' });

  const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayDayCode = daysShort[now.getDay()];

  const [personalEvents] = useState(() => {
    try {
      const saved = localStorage.getItem('sh_personal_events');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const dayPersonalEvents = personalEvents.filter((ev) => ev.day === todayDayCode);

  const combinedTodaySchedule = [...(todaySchedule || []), ...dayPersonalEvents].sort((a, b) => {
    const timeA = parseStartTimeInMinutes(a.time);
    const timeB = parseStartTimeInMinutes(b.time);
    if (timeA === timeB) {
      return a.isPersonal ? 1 : -1;
    }
    return timeA - timeB;
  });

  const upcomingItem = combinedTodaySchedule.find((item) => {
    const mins = calculateMinutesUntil(item.time);
    return mins !== null && mins >= 0;
  });

  const effectiveNextLesson = upcomingItem || nextLesson || null;
  const formattedAge = formatCacheAge(lastUpdatedTimestamp);

  const displayName = student?.name || 'Student';
  const groupNumber = student?.group || '150501';
  const weekNumber = student?.currentWeek || 1;

  const greetingText = isRu
    ? 'Привет, ' + displayName + ' 👋'
    : 'Hello, ' + displayName + ' 👋';

  const groupWeekText = isRu
    ? 'Группа ' + groupNumber + ' • ' + weekNumber + ' неделя'
    : 'Group ' + groupNumber + ' • Week ' + weekNumber;

  const todayScheduleTitle = isRu
    ? 'Расписание на сегодня'
    : "Today's Schedule";

  const noClassesTitle = isRu
    ? 'На сегодня всё свободно'
    : 'No Classes Scheduled';

  const noClassesSub = isRu
    ? 'Занятий и событий на сегодня больше нет.'
    : 'There are no remaining classes or events for today.';

  const personalBadgeText = isRu ? 'Личное' : 'Personal';
  const personalActivityText = isRu ? 'Личное событие' : 'Personal Activity';

  const getTypeLabel = (type) => {
    if (!type) return isRu ? 'Лекция' : 'Lecture';
    const typeMap = {
      Lecture: isRu ? 'Лекция' : 'Lecture',
      Lab: isRu ? 'Лабораторная' : 'Lab',
      Practice: isRu ? 'Практика' : 'Practice',
      Study: isRu ? 'Учёба' : 'Study',
      Gym: isRu ? 'Спорт' : 'Gym',
      Assignment: isRu ? 'Задание' : 'Assignment',
      Personal: isRu ? 'Личное' : 'Personal'
    };
    return typeMap[type] || type;
  };

  const getRoomText = (room) => {
    return isRu ? 'Ауд. ' + room : 'Room ' + room;
  };

  return (
    <div className="space-y-7 pt-2 pb-6">
      {/* 1. Hero Header */}
      <header className="space-y-3">
        {/* Top Meta Bar: Date Badge & Status Indicator */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#2997ff] bg-[#2997ff]/10 px-2.5 py-1 rounded-lg border border-[#2997ff]/20 shadow-sm backdrop-blur-md">
              {dayName}
            </span>
            <span className="text-xs font-bold tracking-wider text-[var(--text-secondary)] uppercase">
              {dayMonth}
            </span>
          </div>
          <StatusPill status={status} lastUpdated={formattedAge} />
        </div>

        {/* Primary Focus: Hero Greeting & Subtext */}
        <div className="pt-1">
          <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)] leading-tight">
            {greetingText}
          </h1>
          <p className="text-xs font-bold text-[var(--text-secondary)] mt-1 tracking-wide">
            {groupWeekText}
          </p>
        </div>
      </header>

      {/* 2. Hero Next Class Card */}
      <section className="relative">
        <NextClassCard nextLesson={effectiveNextLesson} />
      </section>

      {/* 3. Today's Schedule Preview */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-[var(--text-primary)]">
              {todayScheduleTitle}
            </h2>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/10 text-[var(--text-secondary)] font-mono border border-white/5">
              {combinedTodaySchedule.length}
            </span>
          </div>
          <span className="text-[10px] font-bold text-[var(--text-secondary)] font-mono uppercase tracking-widest">
            {todayDayCode}
          </span>
        </div>

        {combinedTodaySchedule.length === 0 ? (
          /* 4. Refined Empty State */
          <div className="p-8 rounded-3xl bg-[var(--surface-glass)] backdrop-blur-2xl border border-[var(--border-glass)] text-center space-y-2 shadow-xl shadow-black/5">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[#2997ff]/10 border border-[#2997ff]/20 flex items-center justify-center text-xl mb-3">
              ✨
            </div>
            <h3 className="text-sm font-extrabold text-[var(--text-primary)] tracking-tight">
              {noClassesTitle}
            </h3>
            <p className="text-xs font-medium text-[var(--text-secondary)] max-w-[240px] mx-auto leading-relaxed">
              {noClassesSub}
            </p>
          </div>
        ) : (
          /* Schedule Card List with Upcoming Item Highlighting */
          <div className="bg-[var(--surface-glass)] backdrop-blur-2xl border border-[var(--border-glass)] rounded-3xl overflow-hidden divide-y divide-[var(--border-glass)] shadow-xl shadow-black/5">
            {combinedTodaySchedule.map((item, idx) => {
              const isHighlight =
                upcomingItem &&
                (item === upcomingItem || item.id === upcomingItem.id);

              return (
                <div
                  key={item.id || idx}
                  className={`p-4 flex justify-between items-center transition-all duration-200 relative ${
                    isHighlight
                      ? 'bg-[#2997ff]/10 dark:bg-[#2997ff]/15 border-l-4 border-l-[#2997ff]'
                      : 'hover:bg-white/[0.04] active:bg-white/[0.08]'
                  }`}
                >
                  <div className="pr-3 min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4
                        className={`text-sm font-bold truncate ${
                          isHighlight
                            ? 'text-[var(--text-primary)] font-extrabold'
                            : 'text-[var(--text-primary)]'
                        }`}
                      >
                        {item.subject}
                      </h4>
                      {isHighlight && (
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#2997ff]/20 text-[#2997ff] shrink-0 border border-[#2997ff]/30">
                          {isRu ? 'СЛЕДУЮЩАЯ' : 'NEXT'}
                        </span>
                      )}
                      {item.isPersonal && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-[var(--text-secondary)] border border-white/10 shrink-0">
                          {personalBadgeText}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] font-medium flex items-center gap-2 truncate">
                      {item.isPersonal ? (
                        <span className="italic">{personalActivityText}</span>
                      ) : (
                        <>
                          <span className="font-bold text-[var(--text-primary)]">
                            {getRoomText(item.room)}
                          </span>
                          <span className="opacity-40">•</span>
                          <span className="truncate">{item.teacher}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs font-extrabold font-mono block ${
                        isHighlight
                          ? 'text-[#2997ff]'
                          : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {item.time}
                    </span>
                    <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      {getTypeLabel(item.type)}
                    </span>
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
