import React from 'react';

// Helper function to calculate real minutes until class start
function calculateMinutesUntil(timeString) {
  if (!timeString) return null;
  const startTimeStr = timeString.split(' - ')[0];
  const [hours, minutes] = startTimeStr.split(':').map(Number);
  
  const now = new Date();
  const classTime = new Date();
  classTime.setHours(hours, minutes, 0, 0);

  const diffMs = classTime - now;
  if (diffMs <= 0) return 0;
  return Math.round(diffMs / 60000);
}

export default function NextClassCard({ nextLesson }) {
  if (!nextLesson) {
    return (
      <div className="mb-8 p-6 rounded-2xl bg-[var(--surface-glass)] text-center">
        <span className="text-xs font-medium text-[var(--text-secondary)]">
          No remaining classes today
        </span>
      </div>
    );
  }

  // Calculate real countdown directly from lesson time data
  const realMinutes = nextLesson.startsInMinutes ?? calculateMinutesUntil(nextLesson.time);

  return (
    <div className="mb-8 p-6 rounded-2xl bg-[var(--surface-glass)]">
      {/* Primary Hero Focal Point: Giant Countdown */}
      <div className="mb-4">
        <span className="block text-[10px] font-bold uppercase tracking-widest text-[#2997ff] mb-1">
          Next Class
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-extrabold tracking-tight text-[#2997ff]">
            {realMinutes !== null ? `${realMinutes}m` : nextLesson.time.split(' - ')[0]}
          </span>
          {realMinutes !== null && (
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              until start • {nextLesson.time}
            </span>
          )}
        </div>
      </div>

      {/* Subject Name */}
      <h3 className="text-xl font-bold tracking-tight text-[var(--text-primary)] mb-5">
        {nextLesson.subject}
      </h3>

      {/* Info Grid (No Emojis, No Border Lines) */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary, #8e8e93)] mb-1">
            Room
          </span>
          <span className="text-sm font-semibold text-[var(--text-primary)] block">
            {nextLesson.room}
          </span>
        </div>
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary, #8e8e93)] mb-1">
            Teacher
          </span>
          <span className="text-sm font-semibold text-[var(--text-primary)] truncate block">
            {nextLesson.teacher}
          </span>
        </div>
      </div>
    </div>
  );
}
