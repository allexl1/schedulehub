import React from 'react';

import {
  getMinutesUntilEnd,
  parseTimeRange
} from '../../utils/time';

export default function ScheduleLessonCard({
  item,
  now,
  index = 0,
  onLessonClick,
  onEditPersonalEvent,
  onDeletePersonalEvent
}) {
  const past =
    item.status === 'past';

  const current =
    item.status === 'in_progress';

  const next =
    item.status === 'next';

  const minutesLeft = current
    ? getMinutesUntilEnd(
        item.time,
        now
      )
    : null;

  const range =
    parseTimeRange(item.time);

  const start =
    range?.startTime ||
    item.startLessonTime ||
    '09:00';

  const end =
    range?.endTime ||
    item.endLessonTime ||
    '10:20';

  const handleClick = () => {
    onLessonClick?.(item);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full p-4 flex items-center justify-between gap-3 transition-all text-left ${
        past
          ? 'opacity-35'
          : 'opacity-100'
      } ${
        current
          ? 'bg-white/10'
          : ''
      }`}
      aria-label={`Open ${
        item.subject || 'lesson'
      }`}
    >
      <div className="w-20 shrink-0 font-mono">
        <span
          className={`block text-xs font-bold ${
            current
              ? 'text-[#30d158] text-sm'
              : next
                ? 'text-[#2997ff]'
                : 'text-[var(--text-primary)]'
          }`}
        >
          {start}
        </span>

        <span className="block text-[10px] text-[var(--text-secondary)]">
          {end}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h4
            className={`text-sm truncate ${
              current
                ? 'font-bold text-base text-[var(--text-primary)]'
                : 'font-semibold text-[var(--text-primary)]'
            }`}
          >
            {item.subject || 'Lesson'}
          </h4>

          {current && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#30d158]/20 text-[#30d158] shrink-0">
              NOW
            </span>
          )}

          {next && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#2997ff]/15 text-[#2997ff] shrink-0">
              NEXT
            </span>
          )}

          {item.isPersonal && (
            <span className="text-[9px] font-medium tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-[var(--text-secondary)] border border-white/10 shrink-0">
              Personal
            </span>
          )}
        </div>

        <p className="text-xs text-[var(--text-secondary)] truncate">
          {item.isPersonal ? (
            <span className="italic">
              Personal Activity
            </span>
          ) : (
            <>
              Room {item.room || '-'}{' '}
              • {item.teacher || '-'}
            </>
          )}
        </p>

        {current &&
          minutesLeft !== null && (
            <p className="text-[11px] font-bold text-[#30d158] mt-1">
              Ends in {minutesLeft} min
            </p>
          )}
      </div>

      <div className="text-right shrink-0 flex items-center gap-1.5">
        <span className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">
          {item.type || 'Lecture'}
        </span>

        {item.isPersonal && (
          <div className="flex items-center gap-1 ml-1">
            <span
              role="button"
              tabIndex={0}
              onClick={event => {
                event.stopPropagation();
                onEditPersonalEvent?.(item);
              }}
              onKeyDown={event => {
                if (
                  event.key === 'Enter' ||
                  event.key === ' '
                ) {
                  event.preventDefault();
                  event.stopPropagation();
                  onEditPersonalEvent?.(item);
                }
              }}
              className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[#2997ff] hover:bg-white/10 transition-colors"
              title="Edit event"
              aria-label="Edit personal event"
            >
              ✎
            </span>

            <span
              role="button"
              tabIndex={0}
              onClick={event => {
                event.stopPropagation();
                onDeletePersonalEvent?.(
                  item.id
                );
              }}
              onKeyDown={event => {
                if (
                  event.key === 'Enter' ||
                  event.key === ' '
                ) {
                  event.preventDefault();
                  event.stopPropagation();
                  onDeletePersonalEvent?.(
                    item.id
                  );
                }
              }}
              className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[#ff3b30] hover:bg-white/10 transition-colors"
              title="Delete event"
              aria-label="Delete personal event"
            >
              ×
            </span>
          </div>
        )}
      </div>
    </button>
  );
}