import React from 'react';
import NextClassCard from '../components/home/NextClassCard';
import StatusPill from '../components/home/StatusPill';
import GlassCard from '../components/common/GlassCard';
import { formatCacheAge } from '../utils/formatCacheTime';

export default function HomeView({ scheduleData, status = 'live', lastUpdatedTimestamp }) {
  const { student, nextLesson, todaySchedule } = scheduleData || {};

  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  const formattedAge = formatCacheAge(lastUpdatedTimestamp);

  return (
    <div>
      {/* Date Header & Connection Status Pill */}
      <div className="flex justify-between items-start mb-5 pt-1">
        <div>
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">
            {todayDate}
          </p>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
            Week {student?.currentWeek || 1}
          </h1>
        </div>
        <StatusPill status={status} lastUpdated={formattedAge} />
      </div>

      {/* Next Class Hero Section */}
      <NextClassCard nextLesson={nextLesson} />

      {/* Today's Schedule Overview */}
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          Today's Schedule ({todaySchedule?.length || 0})
        </h3>
      </div>

      <div className="space-y-2.5">
        {!todaySchedule || todaySchedule.length === 0 ? (
          <GlassCard className="text-center py-8 text-[var(--text-secondary)] text-xs">
            No classes on today's timetable.
          </GlassCard>
        ) : (
          todaySchedule.map((item, idx) => (
            <GlassCard key={idx} className="flex justify-between items-center">
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">{item.subject}</h4>
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <span>📍 {item.room}</span>
                  <span>•</span>
                  <span>{item.teacher}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-[#2997ff]">{item.time}</span>
                <span className="block text-[10px] text-[var(--text-secondary)] font-mono">{item.type || 'Lecture'}</span>
              </div>
            </GlassCard>
          ))
        )}
      </div>
    </div>
  );
}
