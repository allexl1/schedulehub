import React from 'react';
import { calculateMinutesUntil } from '../../utils/time';

export default function NextClassCard({ nextLesson }) {
  if (!nextLesson) {
    return (
      <div className="mb-8 p-6 rounded-2xl bg-[var(--surface-glass)] text-center">
        <span className="text-xs font-medium text-[var(--text-secondary)]">
          No remaining classes or events today
        </span>
      </div>
    );
  }

  const minutesUntil = nextLesson.startsInMinutes ?? calculateMinutesUntil(nextLesson.time);

  return (
    <div className="mb-8 p-6 rounded-2xl bg-[var(--surface-glass)]">
      {/* Primary Visual Anchor: Countdown Display */}
      <div className="mb-4">
        <span className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary,#8e8e93)] mb-1">
          {nextLesson.isPersonal ? 'Next Event' : 'Next Class'}
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-extrabold tracking-tight text-[#2997ff]">
            {minutesUntil !== null ? `${minutesUntil}m` : nextLesson.time?.split(' - ')[0]}
          </span>
          {minutesUntil !== null && (
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              until start • {nextLesson.time}
            </span>
          )}
        </div>
      </div>

      {/* Subject Title */}
      <div className="flex items-center gap-2 mb-5">
        <h3 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
          {nextLesson.subject}
        </h3>
        {nextLesson.isPersonal && (
          <span className="text-[9px] font-medium tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-[var(--text-secondary)] border border-white/10 shrink-0">
            Personal
          </span>
        )}
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary,#8e8e93)] mb-1">
            {nextLesson.isPersonal ? 'Type' : 'Room'}
          </span>
          <span className="text-sm font-semibold text-[var(--text-primary)] block">
            {nextLesson.isPersonal ? 'Personal Activity' : `Room ${nextLesson.room}`}
          </span>
        </div>
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary,#8e8e93)] mb-1">
            {nextLesson.isPersonal ? 'Category' : 'Teacher'}
          </span>
          <span className="text-sm font-semibold text-[var(--text-primary)] truncate block">
            {nextLesson.isPersonal ? nextLesson.type : nextLesson.teacher}
          </span>
        </div>
      </div>
    </div>
  );
}
