import React from 'react';

import Icon from '../common/Icon';

import { parseTimeRange } from '../../utils/time';

const FORM_CONFIG = {
  lecture: {
    color: '#34c759'
  },
  practice: {
    color: '#34c759'
  },
  lab: {
    color: '#ffcc00'
  },
  consultation: {
    color: '#a2845e'
  },
  exam: {
    color: '#af52de'
  },
  test: {
    color: '#5856d6'
  },
  unknown: {
    color: '#8e8e93'
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

  const range = parseTimeRange(item.time);

  if (!range?.startTime && !range?.endTime) {
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

  const subgroup = Number(value);

  if (
    !Number.isInteger(subgroup) ||
    subgroup === 0
  ) {
    return null;
  }

  return subgroup;
}

function getTeacherPhoto(item) {
  return (
    item?.employees?.[0]?.photoLink ||
    item?.teacher?.photoLink ||
    item?.lecturer?.photoLink ||
    ''
  );
}

export default function ScheduleLessonCard({
  item,
  index = 0,
  onLessonClick,
  onEditPersonalEvent,
  onDeletePersonalEvent
}) {
  const time = getLessonTime(item);

  const form =
    FORM_CONFIG[
      normalizeLessonForm(item)
    ] || FORM_CONFIG.unknown;

  const subgroup =
    getSubgroup(item);

  const teacherPhoto =
    getTeacherPhoto(item);

  const handleLessonClick = () => {
    if (item.isPersonal) {
      return;
    }

    onLessonClick?.(item);
  };

  const handleEdit = event => {
    event.stopPropagation();

    onEditPersonalEvent?.(item);
  };

  const handleDelete = event => {
    event.stopPropagation();

    onDeletePersonalEvent?.(item.id);
  };

  if (item.isPersonal) {
    return (
      <div
        data-index={index}
        className="rounded-2xl border border-black/[0.06] bg-white px-4 py-3 text-[var(--text-primary)] shadow-none dark:border-white/[0.08] dark:bg-white/[0.06]"
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
              onClick={handleEdit}
              className="px-2 py-1 text-sm text-[#007aff]"
            >
              Edit
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="px-2 py-1 text-sm text-[#ff3b30]"
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
      onClick={handleLessonClick}
      className="flex w-full items-stretch gap-3 rounded-2xl border border-black/[0.05] bg-white px-3.5 py-3 text-left shadow-none transition-opacity active:opacity-70 dark:border-white/[0.08] dark:bg-white/[0.06]"
      aria-label={`Open ${
        item.subject || 'lesson'
      }`}
    >
      <div className="flex w-[52px] shrink-0 items-center justify-end">
        {time ? (
          <div className="text-right">
            <span className="block font-mono text-[15px] leading-[1.15] text-[var(--text-primary)]">
              {time.start}
            </span>

            {time.end && (
              <span className="mt-1 block font-mono text-[12px] leading-[1.15] text-[var(--text-secondary)]">
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
        className="my-0.5 w-2 shrink-0 rounded-full"
        style={{
          backgroundColor: form.color
        }}
      />

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="min-w-0 truncate text-[16px] font-semibold leading-tight text-[var(--text-primary)]">
              {item.subject || 'Lesson'}
            </span>

          {subgroup !== null && (
  <span className="inline-flex shrink-0 items-center gap-1 text-[14px] font-normal text-[var(--text-secondary)]">
    <Icon
      name="subgroup"
      className="h-4 w-4"
      strokeWidth={1.7}
    />
    {subgroup}
  </span>
)}
          </div>

          <div className="mt-1 min-w-0">
            {item.room && (
              <span className="block truncate text-[14px] leading-tight text-[var(--text-secondary)]">
                {item.room}
              </span>
            )}
          </div>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e5e5ea] dark:bg-white/[0.1]">
          {teacherPhoto ? (
            <img
              src={teacherPhoto}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <Icon
              name="image"
              className="h-5 w-5 text-[#8e8e93]"
              strokeWidth={1.7}
            />
          )}
        </div>
      </div>
    </button>
  );
}