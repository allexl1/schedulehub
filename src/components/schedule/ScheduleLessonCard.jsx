import React from 'react';

import {
  getMinutesUntilEnd,
  parseTimeRange
} from '../../utils/time';

import Icon from '../common/Icon';

const FORM_CONFIG = {
  lecture: {
    color: '#34c759',
    icon: 'lessonLecture'
  },
  practice: {
    color: '#ff3b30',
    icon: 'lessonPractice'
  },
  lab: {
    color: '#ffcc00',
    icon: 'lessonLab'
  },
  consultation: {
    color: '#a2845e',
    icon: 'lessonConsultation'
  },
  exam: {
    color: '#af52de',
    icon: 'lessonExam'
  },
  test: {
    color: '#5856d6',
    icon: 'lessonTest'
  },
  unknown: {
    color: '#8e8e93',
    icon: 'lessonUnknown'
  }
};

function normalizeLessonForm(item) {
  const value = String(
    item?.lessonTypeAbbrev ||
      item?.lessonType ||
      item?.type ||
      ''
  )
    .trim()
    .toLowerCase();

  if (
    value === 'лк' ||
    value === 'улк' ||
    value.includes('lecture')
  ) {
    return 'lecture';
  }

  if (
    value === 'пз' ||
    value === 'упз' ||
    value.includes('practice') ||
    value.includes('seminar')
  ) {
    return 'practice';
  }

  if (
    value === 'лр' ||
    value === 'улр' ||
    value.includes('lab')
  ) {
    return 'lab';
  }

  if (value.includes('консульта')) {
    return 'consultation';
  }

  if (
    value.includes('экзамен') ||
    value.includes('exam')
  ) {
    return 'exam';
  }

  if (
    value.includes('зачет') ||
    value.includes('test')
  ) {
    return 'test';
  }

  return 'unknown';
}

function getLessonTime(item) {
  if (!item?.time) {
    return null;
  }

  const range = parseTimeRange(
    item.time
  );

  if (
    !range?.startTime &&
    !range?.endTime
  ) {
    return null;
  }

  return {
    start: range.startTime || '',
    end: range.endTime || ''
  };
}

function getSubgroup(item) {
  const value =
    item?.numSubgroup ??
    item?.subgroup;

  const subgroup =
    Number(value);

  if (
    !Number.isInteger(subgroup) ||
    subgroup === 0
  ) {
    return null;
  }

  return subgroup;
}

function getWeeks(item) {
  if (
    Array.isArray(item?.weekNumber)
  ) {
    return item.weekNumber
      .filter(
        week =>
          Number.isInteger(
            Number(week)
          ) &&
          Number(week) >= 1 &&
          Number(week) <= 4
      )
      .map(Number)
      .join(', ');
  }

  return '';
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

  const time =
    getLessonTime(item);

  const minutesLeft =
    current && item.time
      ? getMinutesUntilEnd(
          item.time,
          now
        )
      : null;

  const form =
    normalizeLessonForm(item);

  const formConfig =
    FORM_CONFIG[form];

  const subgroup =
    getSubgroup(item);

  const weeks =
    getWeeks(item);

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

  if (item.isPersonal) {
    return (
      <div
        data-index={index}
        className="rounded-lg bg-[var(--surface-secondary)] px-3 py-2.5 text-[var(--text-primary)]"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold">
              {item.subject ||
                item.title ||
                'Personal event'}
            </p>

            {time && (
              <p className="mt-0.5 font-mono text-[12px] text-[var(--text-secondary)]">
                {time.start}
                {time.end
                  ? `–${time.end}`
                  : ''}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={
                handleEdit
              }
              className="px-2 py-1 text-sm text-[#007aff]"
              aria-label="Edit personal event"
            >
              Edit
            </button>

            <button
              type="button"
              onClick={
                handleDelete
              }
              className="px-2 py-1 text-sm text-[#ff3b30]"
              aria-label="Delete personal event"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      data-index={index}
      onClick={
        handleLessonClick
      }
      className={`flex w-full items-center gap-2 rounded-lg bg-[var(--surface-secondary)] px-3 py-2.5 text-left transition-opacity active:opacity-70 ${
        past
          ? 'opacity-55'
          : ''
      }`}
      aria-label={`Open ${
        item.subject ||
        'lesson'
      }`}
    >
      <div className="w-[58px] shrink-0 text-right">
        {time ? (
          <div className="flex flex-col items-end">
            <span className="font-mono text-[14px] leading-tight text-[var(--text-primary)]">
              {time.start}
            </span>

            {time.end && (
              <span className="mt-0.5 font-mono text-[11px] leading-tight text-[var(--text-secondary)]">
                {time.end}
              </span>
            )}
          </div>
        ) : (
          <span className="font-mono text-[13px] text-[var(--text-secondary)]">
            —
          </span>
        )}
      </div>

      <div
        aria-hidden="true"
        className="h-9 w-1 shrink-0 rounded-full"
        style={{
          backgroundColor:
            formConfig.color
        }}
      />

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <Icon
            name={
              formConfig.icon
            }
            className="h-[17px] w-[17px] shrink-0"
            strokeWidth={1.7}
          />

          <span className="min-w-0 truncate text-[15px] font-semibold leading-tight text-[var(--text-primary)]">
            {item.subject ||
              'Lesson'}
          </span>
        </div>

        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          {item.room && (
            <span className="truncate text-[13px] leading-tight text-[var(--text-secondary)]">
              {item.room}
            </span>
          )}

          {subgroup !== null && (
            <span className="flex shrink-0 items-center gap-0.5 text-[12px] text-[var(--text-secondary)]">
              <Icon
                name="user"
                className="h-3.5 w-3.5"
                strokeWidth={1.6}
              />
              {subgroup}
            </span>
          )}

          {weeks && (
            <span className="text-[12px] text-[var(--text-secondary)]">
              {weeks}
            </span>
          )}
        </div>

        {current &&
          minutesLeft !== null && (
            <span className="mt-1 block text-[10px] font-medium text-[#34c759]">
              Ends in {minutesLeft} min
            </span>
          )}
      </div>
    </button>
  );
}