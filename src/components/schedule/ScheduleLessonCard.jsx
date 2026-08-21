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

  if (
    value.includes('консульта')
  ) {
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

function getTeacherPhoto(item) {
  if (
    !Array.isArray(
      item?.employees
    )
  ) {
    return '';
  }

  return (
    item.employees[0]
      ?.photoLink || ''
  );
}

function getSubgroup(item) {
  const value =
    item?.numSubgroup ??
    item?.subgroup;

  const subgroup =
    Number(value);

  if (
    !Number.isInteger(
      subgroup
    ) ||
    subgroup === 0
  ) {
    return null;
  }

  return subgroup;
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
    item.status ===
    'in_progress';

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

  const teacherPhoto =
    getTeacherPhoto(item);

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
        className="rounded-2xl bg-[#f2f2f7] px-4 py-3 text-[var(--text-primary)]"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold">
              {item.subject ||
                item.title ||
                'Personal event'}
            </p>

            {time && (
              <p className="mt-1 font-mono text-[13px] text-[#6b6b70]">
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
              className="rounded-full px-2 py-1 text-sm text-[#007aff]"
              aria-label="Edit personal event"
            >
              Edit
            </button>

            <button
              type="button"
              onClick={
                handleDelete
              }
              className="rounded-full px-2 py-1 text-sm text-[#ff3b30]"
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
      className={`flex w-full items-stretch rounded-2xl bg-[#f2f2f7] px-4 py-3.5 text-left transition-opacity active:opacity-70 ${
        past
          ? 'opacity-55'
          : ''
      }`}
      aria-label={`Open ${
        item.subject ||
        'lesson'
      }`}
    >
      <div className="flex w-[72px] shrink-0 flex-col justify-center pr-3 text-right">
        {time ? (
          <>
            <span className="font-mono text-[18px] font-medium leading-[1.15] tracking-tight text-[var(--text-primary)]">
              {time.start}
            </span>

            {time.end && (
              <span className="mt-1 font-mono text-[15px] leading-[1.15] text-[var(--text-primary)]">
                {time.end}
              </span>
            )}
          </>
        ) : (
          <span className="font-mono text-[15px] text-[#8e8e93]">
            —
          </span>
        )}
      </div>

      <div
        aria-hidden="true"
        className="my-0.5 w-[5px] shrink-0 rounded-full"
        style={{
          backgroundColor:
            formConfig.color
        }}
      />

      <div className="min-w-0 flex-1 pl-4">
        <div className="flex min-w-0 items-center gap-2">
          <Icon
            name={
              formConfig.icon
            }
            className="h-6 w-6 shrink-0 text-[var(--text-primary)]"
            strokeWidth={1.8}
          />

          <h3 className="min-w-0 truncate text-[19px] font-bold leading-tight text-[var(--text-primary)]">
            {item.subject ||
              'Lesson'}
          </h3>

          {subgroup !==
            null && (
            <div className="flex shrink-0 items-center gap-1 text-[#6b6b70]">
              <Icon
                name="user"
                className="h-5 w-5"
                strokeWidth={1.7}
              />

              <span className="text-[17px] leading-none">
                {subgroup}
              </span>
            </div>
          )}
        </div>

        <div className="mt-2 min-w-0">
          <span className="block truncate text-[17px] leading-tight text-[#3c3c43]">
            {item.room || '—'}
          </span>
        </div>

        {current &&
          minutesLeft !==
            null && (
            <span className="mt-1.5 block text-[11px] font-semibold text-[#34c759]">
              Ends in{' '}
              {minutesLeft}{' '}
              min
            </span>
          )}
      </div>

      <div className="ml-3 flex w-[58px] shrink-0 items-center justify-center">
        <div className="flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-full bg-[#e1e1e6]">
          {teacherPhoto ? (
            <img
              src={teacherPhoto}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <Icon
              name="image"
              className="h-7 w-7 text-[#8e8e93]"
              strokeWidth={1.7}
            />
          )}
        </div>
      </div>
    </button>
  );
}