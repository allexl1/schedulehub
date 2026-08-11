import React from 'react';
import NextClassCard from '../components/home/NextClassCard';
import StatusPill from '../components/home/StatusPill';
import GlassCard from '../components/common/GlassCard';
import { formatCacheAge } from '../utils/formatCacheTime';

export default function HomeView({ scheduleData, status = 'live', lastUpdatedTimestamp }) {
  const { student, nextLesson, todaySchedule } = scheduleData || {};

  // Date Formatting: e.g. "Monday" & "11 August"
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dayMonth = now.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });

  const formattedAge = formatCacheAge(lastUpdatedTimestamp);

  return (
    <div className="pt-2">
      {/* Date-First Header Hierarchy */}
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

      {/* Primary Visual Focal Point: Apple Wallet Hero Pass */}
      <NextClassCard nextLesson={nextLesson} />

      {/* Reminders-Style Grouped Schedule List */}
      <div className="mb-3">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          Today's Schedule ({todaySchedule?.length || 0})
        </h2>
      </div>

      {!todaySchedule || todaySchedule.length === 0 ? (
        <GlassCard className="text-center py-8 text-[var(--text-secondary)] text-xs">
          No classes on today's timetable.
        </GlassCard>
      ) : (
        <div className="liquid-glass rounded-2xl overflow-hidden divide-y divide-[var(--border-glass)]">
          {todaySchedule.map((item, idx) => (
            <div key={item.id || idx} className="p-3.5 flex justify-between items-center">
              <div className="pr-3 min-w-0">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate mb-0.5">
                  {item.subject}
                </h4>
                <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                  <span>📍 {item.room}</span>
                  <span>•</span>
                  <span className="truncate">{item.teacher}</span>
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-bold text-[#2997ff] font-mono block">
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
