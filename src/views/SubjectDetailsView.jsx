import React, { useEffect } from 'react';

function getLessonValue(lesson, keys, fallback = '-') {
  for (const key of keys) {
    const value = lesson?.[key];

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ''
    ) {
      return value;
    }
  }

  return fallback;
}

function normalizeTeacher(lesson) {
  const teacher =
    lesson?.teacher ||
    lesson?.teacherName ||
    null;

  if (!teacher) {
    return null;
  }

  if (typeof teacher === 'string') {
    return {
      name: teacher,
      photo: null
    };
  }

  return {
    name:
      teacher.name ||
      [
        teacher.firstName,
        teacher.lastName
      ]
        .filter(Boolean)
        .join(' ') ||
      'Teacher',
    photo:
      teacher.photoLink ||
      teacher.photo ||
      teacher.image ||
      null
  };
}

function DetailRow({ label, value }) {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === '' ||
    value === '-'
  ) {
    return null;
  }

  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-[var(--border-glass)] last:border-b-0">
      <span className="text-xs font-medium text-[var(--text-secondary)]">
        {label}
      </span>

      <span className="text-sm font-semibold text-[var(--text-primary)] text-right break-words">
        {value}
      </span>
    </div>
  );
}

export default function SubjectDetailsView({
  lesson,
  onBack
}) {
  useEffect(() => {
    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, []);

  if (!lesson) {
    return null;
  }

  const subject = getLessonValue(
    lesson,
    ['subject', 'name'],
    'Lesson'
  );

  const type = getLessonValue(
    lesson,
    ['type', 'lessonType'],
    null
  );

  const time = getLessonValue(
    lesson,
    ['time', 'startTime'],
    null
  );

  const room = getLessonValue(
    lesson,
    ['room', 'auditory', 'classroom'],
    null
  );

  const group = getLessonValue(
    lesson,
    ['group', 'studentGroup'],
    null
  );

  const teacher =
    normalizeTeacher(lesson);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Close lesson details"
        onClick={onBack}
        className="absolute inset-0 bg-black/35"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label={`${subject} details`}
        className="relative w-full max-w-[440px] max-h-[88vh] overflow-y-auto rounded-t-[28px] bg-[var(--background)] border-t border-[var(--border-glass)] shadow-2xl animate-[slideUp_180ms_ease-out]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-[var(--background)]/95 backdrop-blur-xl border-b border-[var(--border-glass)]">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 text-sm font-semibold text-[#2997ff] active:scale-95 transition-transform"
          >
            <span
              aria-hidden="true"
              className="text-lg leading-none"
            >
              ‹
            </span>
            Back
          </button>

          <div className="w-10 h-1 rounded-full bg-[var(--border-glass)] absolute left-1/2 -translate-x-1/2 top-2" />

          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            Details
          </span>
        </div>

        <div className="px-5 pt-5 pb-8">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#2997ff] mb-2">
              {type || 'Lesson'}
            </p>

            <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
              {subject}
            </h2>
          </div>

          <div className="rounded-2xl bg-[var(--surface-glass)] border border-[var(--border-glass)] px-4">
            <DetailRow
              label="Time"
              value={time}
            />

            <DetailRow
              label="Room"
              value={room}
            />

            <DetailRow
              label="Group"
              value={group}
            />
          </div>

          {teacher && (
            <div className="mt-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                Teacher
              </p>

              <button
                type="button"
                className="w-full flex items-center gap-3 rounded-2xl bg-[var(--surface-glass)] border border-[var(--border-glass)] p-3 text-left active:scale-[0.99] transition-transform"
                onClick={() => {
                  // Teacher profile navigation will be wired
                  // after the teacher profile screen is ready.
                }}
              >
                {teacher.photo ? (
                  <img
                    src={teacher.photo}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[var(--border-glass)] flex items-center justify-center text-[var(--text-secondary)] shrink-0">
                    <span
                      aria-hidden="true"
                      className="text-lg"
                    >
                      ?
                    </span>
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                    {teacher.name}
                  </p>

                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    View teacher profile
                  </p>
                </div>

                <span
                  aria-hidden="true"
                  className="text-lg text-[var(--text-secondary)]"
                >
                  ›
                </span>
              </button>
            </div>
          )}

          <div className="mt-5 rounded-2xl bg-[var(--surface-glass)] border border-[var(--border-glass)] p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
              Lesson information
            </p>

            <div className="space-y-2 text-sm text-[var(--text-secondary)]">
              {lesson.date && (
                <p>
                  <span className="font-semibold text-[var(--text-primary)]">
                    Date:
                  </span>{' '}
                  {lesson.date}
                </p>
              )}

              {lesson.subgroup && (
                <p>
                  <span className="font-semibold text-[var(--text-primary)]">
                    Subgroup:
                  </span>{' '}
                  {lesson.subgroup}
                </p>
              )}

              {lesson.notes && (
                <p>
                  <span className="font-semibold text-[var(--text-primary)]">
                    Notes:
                  </span>{' '}
                  {lesson.notes}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}