import React from 'react';

import {
  getMinutesUntilEnd,
  parseTimeRange
} from '../../utils/time';

function getTeacher(item) {
  if (item?.teacher) {
    return item.teacher;
  }

  if (!Array.isArray(item?.employees)) {
    return '';
  }

  return item.employees
    .map(employee => employee?.fio || '')
    .filter(Boolean)
    .join(', ');
}

function getTeacherPhoto(item) {
  if (!Array.isArray(item?.employees)) {
    return '';
  }

  return (
    item.employees[0]?.photoLink ||
    ''
  );
}

function getLessonAccent(item) {
  return (
    item?.color ||
    item?.lessonColor ||
    'var(--accent-primary, #2997ff)'
  );
}

function getLessonTime(item) {
  if (!item?.time) {
    return null;
  }

  const range =
    parseTimeRange(item.time);

  if (
    !range?.startTime &&
    !range?.endTime
  ) {
    return null;
  }

  return {
    start:
      range.startTime || '',
    end:
      range.endTime || ''
  };
}

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

  const time =
    getLessonTime(item);

  const minutesLeft = current &&
    item.time
      ? getMinutesUntilEnd(
          item.time,
          now
        )
      : null;

  const teacher =
    getTeacher(item);

  const teacherPhoto =
    getTeacherPhoto(item);

  const accent =
    getLessonAccent(item);

  const handleLessonClick =
    () => {
      if (item.isPersonal) {
        return;
      }

      onLessonClick?.(item);
    };

  const handleEdit =
    event => {
      event.stopPropagation();

      onEditPersonalEvent?.(
        item
      );
    };

  const handleDelete =
    event => {
      event.stopPropagation();

      onDeletePersonalEvent?.(
        item.id
      );
    };

  return (
    <div
      data-index={index}
      className={`flex w-full items-stretch gap-3 p-3 transition-all ${
        past
          ? 'opacity-40'
          : 'opacity-100'
      } ${
        current
          ? 'bg-white/5'
          : ''
      }`}
    >
      <div className="w-14 shrink-0 pt-0.5 text-right font-mono">
        {time ? (
          <>
            <span
              className={`block text-xs font-bold ${
                current
                  ? 'text-[#30d158]'
                  : next
                    ? 'text-[#2997ff]'
                    : 'text-[var(--text-primary)]'
              }`}
            >
              {time.start}
            </span>

            {time.end && (
              <span className="mt-0.5 block text-[10px] text-[var(--text-secondary)]">
                {time.end}
              </span>
            )}
          </>
        ) : (
          <span className="text-[10px] text-[var(--text-secondary)]">
            —
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={handleLessonClick}
        disabled={item.isPersonal}
        className="group flex min-w-0 flex-1 items-stretch gap-3 text-left disabled:cursor-default"
        aria-label={
          item.isPersonal
            ? undefined
            : `Open ${
                item.subject ||
                'lesson'
              }`
        }
      >
        <span
          aria-hidden="true"
          className="w-1 shrink-0 rounded-full"
          style={{
            backgroundColor:
              accent
          }}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h4
                className={`truncate text-sm ${
                  current
                    ? 'font-bold text-[var(--text-primary)]'
                    : 'font-semibold text-[var(--text-primary)]'
                }`}
              >
                {item.subject ||
                  'Lesson'}
              </h4>

              {item.subjectFullName &&
                item.subjectFullName !==
                  item.subject && (
                  <p className="mt-0.5 truncate text-[10px] text-[var(--text-secondary)]">
                    {
                      item.subjectFullName
                    }
                  </p>
                )}
            </div>

            {item.type && (
              <span className="shrink-0 rounded-md bg-white/5 px-1.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                {item.type}
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--text-secondary)]">
            {item.room && (
              <span>
                Room{' '}
                {item.room}
              </span>
            )}

            {item.numSubgroup &&
              item.numSubgroup !==
                'all' && (
                <>
                  {item.room && (
                    <span aria-hidden="true">
                      •
                    </span>
                  )}

                  <span>
                    Subgroup{' '}
                    {
                      item.numSubgroup
                    }
                  </span>
                </>
              )}
          </div>

          {teacher && (
            <div className="mt-2 min-w-0">
              <span className="block truncate text-[11px] font-medium text-[var(--text-secondary)]">
                {teacher}
              </span>
            </div>
          )}

          {current &&
            minutesLeft !==
              null && (
              <p className="mt-1.5 text-[11px] font-bold text-[#30d158]">
                Ends in{' '}
                {minutesLeft}{' '}
                min
              </p>
            )}

          {current && (
            <span className="mt-1.5 inline-flex rounded-md bg-[#30d158]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#30d158]">
              Now
            </span>
          )}

          {next && (
            <span className="mt-1.5 inline-flex rounded-md bg-[#2997ff]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#2997ff]">
              Next
            </span>
          )}

          {item.isPersonal && (
            <span className="mt-1.5 inline-flex rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-medium text-[var(--text-secondary)]">
              Personal
            </span>
          )}
        </div>

        {!item.isPersonal && (
          <div className="flex w-11 shrink-0 items-start justify-end">
            {teacherPhoto ? (
              <img
                src={teacherPhoto}
                alt=""
                loading="lazy"
                className="h-10 w-10 rounded-full object-cover ring-1 ring-white/10"
              />
            ) : (
              <div
                aria-hidden="true"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-[11px] font-bold text-[var(--text-secondary)] ring-1 ring-white/10"
              >
                {teacher
                  ? teacher
                      .trim()
                      .charAt(0)
                      .toUpperCase()
                  : '?'}
              </div>
            )}
          </div>
        )}
      </button>

      {item.isPersonal && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={handleEdit}
            className="rounded-md p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-white/10 hover:text-[#2997ff]"
            title="Edit event"
            aria-label="Edit personal event"
          >
            ✎
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="rounded-md p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-white/10 hover:text-[#ff3b30]"
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