import React from 'react';
import { calculateMinutesUntil } from '../../utils/time';
import { useLanguage } from '../../context/LanguageContext';

export default function NextClassCard({ nextLesson }) {
  const { language } = useLanguage();
  const isRu = language === 'ru';

  if (!nextLesson) {
    return (
      <div className="relative overflow-hidden rounded-[28px] bg-[var(--surface-glass)] backdrop-blur-2xl border border-[var(--border-glass)] p-7 text-center shadow-xl shadow-black/5 space-y-3 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/15 before:to-transparent">
        {/* Soft Ambient Background Light */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-32 h-32 bg-[#2997ff]/[0.06] rounded-full blur-2xl pointer-events-none" />
        
        <div className="w-10 h-10 mx-auto rounded-2xl bg-[#2997ff]/10 border border-[#2997ff]/15 flex items-center justify-center text-sm mb-2 text-[#2997ff] shadow-inner">
          ✓
        </div>
        <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
          {isRu ? 'На сегодня всё' : 'All Clear Today'}
        </h3>
        <p className="text-xs font-medium text-[var(--text-secondary)] max-w-[220px] mx-auto leading-relaxed">
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

  const badgeText = isPersonal
    ? (isRu ? 'ЛИЧНОЕ СОБЫТИЕ' : 'PERSONAL EVENT')
    : (isRu ? 'СЛЕДУЮЩАЯ ПАРА' : 'NEXT CLASS');

  const typeLabelMap = {
    Lecture: isRu ? 'Лекция' : 'Lecture',
    Lab: isRu ? 'Лабораторная' : 'Lab',
    Practice: isRu ? 'Практика' : 'Practice',
    Study: isRu ? 'Учёба' : 'Study',
    Gym: isRu ? 'Спорт' : 'Gym',
    Assignment: isRu ? 'Задание' : 'Assignment',
    Personal: isRu ? 'Личное' : 'Personal'
  };

  const typeText = typeLabelMap[nextLesson.type] || nextLesson.type || (isRu ? 'Занятие' : 'Class');

  return (
    <div className="relative overflow-hidden rounded-[28px] bg-[var(--surface-glass)] backdrop-blur-2xl border border-[var(--border-glass)] p-6 shadow-2xl shadow-black/10 space-y-5 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent">
      {/* Restrained Ambient Blue Glow behind Countdown */}
      <div className="absolute top-8 left-4 w-40 h-28 bg-[#2997ff]/[0.07] rounded-full blur-2xl pointer-events-none" />

      {/* Top Meta Bar */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2997ff] shadow-[0_0_6px_rgba(41,151,255,0.5)]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[#2997ff]">
            {badgeText}
          </span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-black/10 dark:bg-white/5 text-[var(--text-secondary)] border border-white/[0.06]">
          {typeText}
        </span>
      </div>

      {/* 1. Primary Visual Anchor: Countdown */}
      <div className="relative z-10 pt-1">
        <div className="flex items-baseline gap-2.5">
          <span className="text-6xl font-black tracking-tighter text-[#2997ff] font-mono leading-none select-none">
            {minutesUntil !== null ? minutesUntil : '--'}
          </span>
          <div className="flex flex-col justify-end">
            <span className="text-sm font-black text-[#2997ff] font-mono leading-none">
              {isRu ? 'мин' : 'min'}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mt-1">
              {isRu ? 'до начала' : 'until start'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Secondary Visual Focus: Subject Title */}
      <div className="relative z-10">
        <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)] leading-snug">
          {nextLesson.subject}
        </h2>
      </div>

      {/* 3. Tertiary Grouping: Time Range Chip & Room/Teacher Metadata */}
      <div className="relative z-10 pt-4 border-t border-[var(--border-glass)]/60 flex items-center justify-between text-xs gap-3">
        {/* Time Chip */}
        <div className="shrink-0 font-mono font-bold text-[var(--text-primary)]">
          <span className="text-[11px] px-2.5 py-1 rounded-xl bg-black/15 dark:bg-white/5 border border-white/[0.08] shadow-inner">
            {timeSlot}
          </span>
        </div>

        {/* Room & Teacher Metadata */}
        <div className="flex items-center gap-2 truncate text-right">
          {isPersonal ? (
            <span className="text-xs font-medium text-[var(--text-secondary)] italic">
              {isRu ? 'Личное расписание' : 'Personal schedule'}
            </span>
          ) : (
            <>
              {roomText && (
                <span className="text-xs font-bold text-[var(--text-primary)] shrink-0">
                  {roomText}
                </span>
              )}
              {roomText && teacherText && (
                <span className="text-[var(--text-secondary)] opacity-30">•</span>
              )}
              {teacherText && (
                <span className="text-xs font-medium text-[var(--text-secondary)] truncate">
                  {teacherText}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
