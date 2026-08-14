import React from 'react';
import { calculateMinutesUntil } from '../../utils/time';
import { useLanguage } from '../../context/LanguageContext';

export default function NextClassCard({ nextLesson }) {
  const { language } = useLanguage();
  const isRu = language === 'ru';

  if (!nextLesson) {
    return (
      <div className="rounded-3xl bg-[var(--surface-glass)] border border-[var(--border-glass)] p-6 text-center space-y-1.5 shadow-sm">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">
          {isRu ? 'На сегодня всё' : 'All Clear Today'}
        </h3>
        <p className="text-xs text-[var(--text-secondary)] opacity-80 max-w-[220px] mx-auto">
          {isRu
            ? 'Все занятия и события на сегодня завершены.'
            : 'No remaining classes or events on your schedule.'}
        </p>
      </div>
    );
  }

  const minutesUntil = nextLesson.startsInMinutes ?? calculateMinutesUntil(nextLesson.time);
  const isPersonal = Boolean(nextLesson.isPersonal);
  const timeSlot = nextLesson.time || '09:00 - 10:20';
  const roomText = nextLesson.room ? (isRu ? 'Ауд. ' + nextLesson.room : 'Room ' + nextLesson.room) : '';
  const teacherText = nextLesson.teacher || '';

  const now = new Date();
  const localeCode = isRu ? 'ru-RU' : 'en-US';
  const formattedDate = now.toLocaleDateString(localeCode, {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  }).toUpperCase();

  // Compress metadata into a single line
  let metaLine = timeSlot;
  if (isPersonal) {
    metaLine += ' · ' + (isRu ? 'Личное событие' : 'Personal Activity');
  } else {
    if (roomText) metaLine += ' · ' + roomText;
    if (teacherText) metaLine += ' · ' + teacherText;
  }

  return (
    <div className="rounded-3xl bg-[var(--surface-glass)] border border-[var(--border-glass)] p-6 shadow-sm space-y-3.5">
      {/* Level 4: Date Context */}
      <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] opacity-50">
        {formattedDate}
      </div>

      {/* Level 1: Primary Visual Focus (Countdown) */}
      <div className="flex items-baseline gap-2">
        <span className="text-5xl font-black tracking-tighter text-[#2997ff] font-mono leading-none">
          {minutesUntil !== null ? `${minutesUntil}m` : '--'}
        </span>
        <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          {isRu ? 'до начала' : 'until start'}
        </span>
      </div>

      {/* Level 2: Secondary Visual Focus (Subject Title) */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)] leading-snug">
          {nextLesson.subject}
        </h2>
      </div>

      {/* Level 3: Compressed Metadata */}
      <div className="text-xs font-medium text-[var(--text-secondary)] truncate pt-3 border-t border-[var(--border-glass)]/40 opacity-80">
        {metaLine}
      </div>
    </div>
  );
}
