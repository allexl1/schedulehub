import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { formatRoomString } from '../../utils/time';

export default function NextClassCard({
  nextLesson,
  lessonState = 'upcoming',
  endTime = null,
  minutesUntil = null
}) {
  const { t } = useLanguage();

  if (!nextLesson || lessonState === 'finished') {
    return (
      <div className="rounded-2xl bg-[var(--surface-glass)] border border-[var(--border-glass)] p-5 text-center space-y-1 shadow-sm">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">
          {t('noMoreClassesToday')}
        </h3>

        <p className="text-xs text-[var(--text-secondary)] opacity-70">
          {t('allActivitiesFinished')}
        </p>
      </div>
    );
  }

  const isPersonal = Boolean(nextLesson.isPersonal);

  const timeSlot =
    nextLesson.time || '09:00 - 10:20';

  const roomText = formatRoomString(
    nextLesson.room,
    t('room')
  );

  const teacherText = nextLesson.teacher || '';

  let urgencyText = '';
  let urgencyColor = 'text-[var(--text-secondary)]';

  if (lessonState === 'current') {
    urgencyText = endTime
      ? `● ${t('inProgress')} · ${t('until')} ${endTime}`
      : `● ${t('inProgress')}`;

    urgencyColor = 'text-[#30d158]';
  } else if (lessonState === 'upcoming') {
    urgencyColor = 'text-[#2997ff]';

    if (minutesUntil !== null) {
      urgencyText = `${t('startsIn')} ${minutesUntil} ${t('min')}`;
    } else {
      urgencyText = t('soon');
    }
  }

  const metaLine = isPersonal
    ? t('personalActivity')
    : [roomText, teacherText]
        .filter(Boolean)
        .join(' · ');

  return (
    <div className="rounded-2xl bg-[var(--surface-glass)] border border-[var(--border-glass)] p-5 shadow-sm space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className={`font-semibold tracking-tight ${urgencyColor}`}>
          {urgencyText}
        </span>

        <span className="font-mono font-medium text-[var(--text-secondary)] opacity-70">
          {timeSlot}
        </span>
      </div>

      <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)] leading-snug line-clamp-2">
        {nextLesson.subject}
      </h2>

      {metaLine && (
        <div className="text-xs text-[var(--text-secondary)] opacity-70 leading-snug break-words pt-0.5">
          {metaLine}
        </div>
      )}
    </div>
  );
}
