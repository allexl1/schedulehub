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

function getTeacherName(item) {
  return (
    item?.teacherName ||
    item?.teacher ||
    item?.lecturer ||
    item?.lecturerName ||
    ''
  );
}

function getTeacherPhoto(item) {
  return (
    item?.teacherPhoto ||
    item?.teacherPhotoUrl ||
    item?.lecturerPhoto ||
    item?.lecturerPhotoUrl ||
    ''
  );
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

  const teacherName =
    getTeacherName(item);

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
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] px-3.5 py-3 text-[var(--text-primary)]"
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
      className={`group flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] px-3.5 py-3 text-left transition-colors active:opacity-70 ${
        current
          ? 'ring-1 ring-[#007aff]/20'
          : ''
      } ${
        past
          ? 'opacity-55'
          : ''
      }`}
      aria-label={`Open ${
        item.subject ||
        'lesson'
      }`}
    >
      <div className="w-[48px] shrink-0 text-left">
        {time ? (
          <div>
            <span className="block font-mono text-[14px] font-medium leading-tight text-[var(--text-primary)]">
              {time.start}
            </span>

            {time.end && (
              <span className="mt-0.5 block font-mono text-[11px] leading-tight text-[var(--text-secondary)]">
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

      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <div
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{
            backgroundColor: `${formConfig.color}18`
          }}
        >
          <Icon
            name={formConfig.icon}
            className="h-[18px] w-[18px]"
            strokeWidth={1.7}
            style={{
              color:
                formConfig.color
            }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="min-w-0 truncate text-[15px] font-semibold leading-tight text-[var(--text-primary)]">
              {item.subject ||
                'Lesson'}
            </span>

            {subgroup !== null && (
              <span className="shrink-0 rounded-md bg-[var(--surface-tertiary)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">
                {subgroup}
              </span>
            )}
          </div>

          <div className="mt-1 flex min-w-0 items-center gap-1.5">
            {item.room && (
              <span className="truncate text-[12px] leading-tight text-[var(--text-secondary)]">
                {item.room}
              </span>
            )}

            {item.room &&
              teacherName && (
                <span className="text-[11px] text-[var(--text-tertiary)]">
                  •
                </span>
              )}

            {teacherName && (
              <span className="min-w-0 truncate text-[12px] leading-tight text-[var(--text-secondary)]">
                {teacherName}
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

        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[var(--surface-tertiary)]">
          {teacherPhoto ? (
            <img
              src={teacherPhoto}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Icon
                name="user"
                className="h-5 w-5 text-[var(--text-tertiary)]"
                strokeWidth={1.6}
              />
            </div>
          )}
        </div>
      </div>
    </button>
  );
}