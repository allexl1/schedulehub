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
    parseTimeRange(
      item.time
    );

  const start =
    range?.startTime ||
    item.startLessonTime ||
    '09:00';

  const end =
    range?.endTime ||
    item.endLessonTime ||
    '10:20';

  const handleLessonClick =
    () => {
      if (
        item.isPersonal
      ) {
        return;
      }

      onLessonClick?.(item);
    };

  const cardClass = `
    w-full
    p-4
    flex
    items-center
    justify-between
    gap-3
    transition-all
    text-left
    ${
      past
        ? 'opacity-35'
        : 'opacity-100'
    }
    ${
      current
        ? 'bg-white/10'
        : ''
    }
  `;

  return (
    <div
      className={cardClass}
    >
      <button
        type="button"
        onClick={
          handleLessonClick
        }
        disabled={
          item.isPersonal
        }
        className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"
        aria-label={
          item.isPersonal
            ? undefined
            : `Open ${
                item.subject ||
                'lesson'
              }`
        }
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

        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-2">
            <h4
              className={`truncate text-sm ${
                current
                  ? 'text-base font-bold text-[var(--text-primary)]'
                  : 'font-semibold text-[var(--text-primary)]'
              }`}
            >
              {item.subject ||
                'Lesson'}
            </h4>

            {current && (
              <span className="shrink-0 rounded bg-[#30d158]/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#30d158]">
                NOW
              </span>
            )}

            {next && (
              <span className="shrink-0 rounded bg-[#2997ff]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#2997ff]">
                NEXT
              </span>
            )}

            {item.isPersonal && (
              <span className="shrink-0 rounded border border-white/10 bg-white/10 px-1.5 py-0.5 text-[9px] font-medium tracking-wider text-[var(--text-secondary)]">
                Personal
              </span>
            )}
          </div>

          <p className="truncate text-xs text-[var(--text-secondary)]">
            {item.isPersonal ? (
              <span className="italic">
                Personal Activity
              </span>
            ) : (
              <>
                Room{' '}
                {item.room ||
                  '-'}{' '}
                •{' '}
                {item.teacher ||
                  '-'}
              </>
            )}
          </p>

          {current &&
            minutesLeft !==
              null && (
              <p className="mt-1 text-[11px] font-bold text-[#30d158]">
                Ends in{' '}
                {minutesLeft}{' '}
                min
              </p>
            )}
        </div>

        <div className="shrink-0 text-right">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            {item.type ||
              'Lecture'}
          </span>
        </div>
      </button>

      {item.isPersonal && (
        <div className="ml-1 flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() =>
              onEditPersonalEvent?.(
                item
              )
            }
            className="rounded-md p-1 text-[var(--text-secondary)] transition-colors hover:bg-white/10 hover:text-[#2997ff]"
            title="Edit event"
            aria-label="Edit personal event"
          >
            ✎
          </button>

          <button
            type="button"
            onClick={() =>
              onDeletePersonalEvent?.(
                item.id
              )
            }
            className="rounded-md p-1 text-[var(--text-secondary)] transition-colors hover:bg-white/10 hover:text-[#ff3b30]"
            title="Delete event"
            aria-label="Delete personal event"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}