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

  const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayDayCode = daysShort[new Date().getDay()];

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

  const getRoomText = (room) => {
    return isRu ? 'Ауд. ' + room : 'Room ' + room;
  };

  return (
    <div className="pt-2 pb-6">
      {/* 1. Single Top Context Bar */}
      <header className="flex justify-between items-center pb-6">
        <div className="text-xs font-bold text-[var(--text-primary)] tracking-tight">
          {displayName} · {isRu ? 'Группа' : 'Group'} {groupNumber} (W{weekNumber})
        </div>
        <StatusPill status={status} lastUpdated={formattedAge} />
      </header>

      {/* 2. Primary Hero Pass */}
      <section className="mb-7">
        <NextClassCard nextLesson={effectiveNextLesson} />
      </section>

      {/* 3. Calm 2-Column Agenda View */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] opacity-70">
            {isRu ? 'Расписание на сегодня' : "Today's Schedule"} ({combinedTodaySchedule.length})
          </h2>
          <span className="text-[10px] font-bold text-[var(--text-secondary)] font-mono opacity-50">
            {todayDayCode}
          </span>
        </div>

        {combinedTodaySchedule.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[var(--surface-glass)] border border-[var(--border-glass)] text-center text-xs text-[var(--text-secondary)]">
            {isRu ? 'На сегодня занятий и событий нет.' : 'No classes or events scheduled for today.'}
          </div>
        ) : (
          <div className="bg-[var(--surface-glass)] border border-[var(--border-glass)] rounded-3xl divide-y divide-[var(--border-glass)]/40 overflow-hidden shadow-sm">
            {combinedTodaySchedule.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-4 flex items-baseline gap-3 transition-colors hover:bg-white/[0.02]"
              >
                {/* Left Time Column (Fixed Width, Monospace, Neutral) */}
                <div className="w-13 shrink-0 text-xs font-mono font-bold text-[var(--text-secondary)] opacity-75">
                  {item.time?.split(' - ')[0]}
                </div>

                {/* Right Content Column */}
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {item.subject}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] opacity-70 truncate">
                    {item.isPersonal ? (
                      <span className="italic">{isRu ? 'Личное событие' : 'Personal Activity'}</span>
                    ) : (
                      `${getRoomText(item.room)} · ${item.teacher}`
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
