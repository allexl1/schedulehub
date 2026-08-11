import React, { useState } from 'react';
import NextClassCard from '../components/home/NextClassCard';
import StatusPill from '../components/home/StatusPill';
import { formatCacheAge } from '../utils/formatCacheTime';
import { parseStartTimeInMinutes, calculateMinutesUntil } from '../utils/time';

export default function HomeView({ scheduleData, status = 'live', lastUpdatedTimestamp }) {
  const { student, nextLesson, todaySchedule } = scheduleData || {};

  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dayMonth = now.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });

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

  // Merge today's academic schedule and personal events, sorting chronologically by start time
  const combinedTodaySchedule = [...(todaySchedule || []), ...dayPersonalEvents].sort((a, b) => {
    const timeA = parseStartTimeInMinutes(a.time);
    const timeB = parseStartTimeInMinutes(b.time);
    if (timeA === timeB) {
      // Academic lessons retain priority if times are identical
      return a.isPersonal ? 1 : -1;
    }
    return timeA - timeB;
  });

  // Identify nearest upcoming item (academic class or personal event)
  const upcomingItem = combinedTodaySchedule.find((item) => {
    const mins = calculateMinutesUntil(item.time);
    return mins !== null && mins >= 0;
  });

  const effectiveNextLesson = upcomingItem || nextLesson || null;
  const formattedAge = formatCacheAge(lastUpdatedTimestamp);

  return (
    <div className="pt-2">
      {/* Date-First Typography Header */}
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] mb-1">
          {dayName}
        </h1>
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-medium">
          <span>{dayMonth}</span>
          <span>•</span>
          <span>Week {student?.currentWeek || 1}</span>
          <span>•</span>
          <StatusPill status={status} lastUpdated={formattedAge} />
        </div>
      </header>

      {/* Hero Pass Focal Point */}
      <NextClassCard nextLesson={effectiveNextLesson} />

      {/* Grouped Today Schedule Overview */}
      <div className="mb-3">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          Today's Schedule ({combinedTodaySchedule.length})
        </h2>
      </div>

      {combinedTodaySchedule.length === 0 ? (
        <div className="p-6 rounded-2xl bg-[var(--surface-glass)] text-center text-xs text-[var(--text-secondary)]">
          No classes or events on today's timetable.
        </div>
      ) : (
        <div className="bg-[var(--surface-glass)] rounded-2xl overflow-hidden divide-y divide-[var(--border-glass)]">
          {combinedTodaySchedule.map((item, idx) => (
            <div key={item.id || idx} className="p-4 flex justify-between items-center">
              <div className="pr-3 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {item.subject}
                  </h4>
                  {item.isPersonal && (
                    <span className="text-[9px] font-medium tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-[var(--text-secondary)] border border-white/10 shrink-0">
                      Personal
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-secondary)] flex items-center gap-2 truncate">
                  {item.isPersonal ? (
                    <span className="italic">Personal Activity</span>
                  ) : (
                    <>
                      <span>Room {item.room}</span>
                      <span>•</span>
                      <span className="truncate">{item.teacher}</span>
                    </>
                  )}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-bold text-[var(--text-primary)] font-mono block">
                  {item.time}
                </span>
                <span className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  {item.type || 'Lecture'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
