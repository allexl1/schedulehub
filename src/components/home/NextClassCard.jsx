import React from 'react';
import GlassCard from '../common/GlassCard';

export default function NextClassCard({ nextLesson }) {
  if (!nextLesson) {
    return (
      <GlassCard className="mb-6 text-center py-6">
        <span className="text-xs text-[var(--text-secondary)] font-medium">
          No remaining classes today
        </span>
      </GlassCard>
    );
  }

  return (
    <div className="relative mb-6 rounded-2xl p-5 bg-gradient-to-b from-white/10 to-white/5 dark:from-white/5 dark:to-transparent border border-[var(--border-glass)] shadow-sm">
      {/* Top Header Row */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#2997ff] bg-[#2997ff]/10 px-2.5 py-1 rounded-md">
          Starts in ~{nextLesson.startsInMinutes || 15}m
        </span>
        <span className="text-xs font-semibold text-[var(--text-secondary)] font-mono">
          {nextLesson.time}
        </span>
      </div>

      {/* Main Subject Focus */}
      <h3 className="text-xl font-bold tracking-tight text-[var(--text-primary)] mb-4 leading-snug">
        {nextLesson.subject}
      </h3>

      {/* Structured Details Grid */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[var(--border-glass)] text-xs">
        <div>
          <span className="block text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary, #8e8e93)] mb-0.5">
            Room
          </span>
          <span className="font-semibold text-[var(--text-primary)]">
            📍 {nextLesson.room}
          </span>
        </div>
        <div>
          <span className="block text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary, #8e8e93)] mb-0.5">
            Teacher
          </span>
          <span className="font-semibold text-[var(--text-primary)] truncate block">
            👨‍🏫 {nextLesson.teacher}
          </span>
        </div>
      </div>
    </div>
  );
}
