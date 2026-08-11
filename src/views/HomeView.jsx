import React from 'react';
import NextClassCard from '../components/home/NextClassCard';
import StatusPill from '../components/home/StatusPill';
import { formatCacheAge } from '../utils/formatCacheTime';

export default function HomeView({ scheduleData, status = 'live', lastUpdatedTimestamp }) {
  const { student, nextLesson, todaySchedule } = scheduleData || {};

  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dayMonth = now.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });

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

      {/* Hero Pass */}
      <NextClassCard nextLesson={nextLesson} />

      {/* Today's Schedule Overview */}
      <div className="mb-3">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          Today's Schedule ({todaySchedule?.length || 0})
        </h2>
      </div>

      {!todaySchedule || todaySchedule.length === 0 ? (
        <div className="p-6 rounded-2xl bg-[var(--surface-glass)] text-center text-xs text-[var(--text-secondary)]">
          No classes on today's timetable.
        </div>
      ) : (
        /* Single Grouped Reminders-Style Container */
        <div className="bg-[var(--surface-glass)] rounded-2xl overflow-hidden divide-y divide-[var(--border-glass)]">
          {todaySchedule.map((item, idx) => (
            <div
              key={item.id || idx}
              className="p-4 flex justify-between items-center"
            >
              <div className="pr-3 min-w-0">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate mb-1">
                  {item.subject}
                </h4>
                <p className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
                  <span>Room {item.room}</span>
                  <span>•</span>
                  <span className="truncate">{item.teacher}</span>
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
