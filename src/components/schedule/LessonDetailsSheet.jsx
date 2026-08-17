import React, { useEffect } from 'react';

function getTeacherName(employee) {
  return employee?.fio || '';
}

function getTeacherPhoto(employee) {
  return employee?.photoLink || '';
}

function getRoom(item) {
  if (item?.room) {
    return item.room;
  }

  if (!Array.isArray(item?.auditories)) {
    return '';
  }

  return item.auditories
    .map(auditory => {
      if (typeof auditory === 'string') {
        return auditory;
      }

      return (
        auditory?.auditoryName ||
        auditory?.name ||
        auditory?.number ||
        auditory?.auditory ||
        ''
      );
    })
    .filter(Boolean)
    .join(', ');
}

function getTeachers(item) {
  if (!Array.isArray(item?.employees)) {
    return [];
  }

  return item.employees.filter(
    employee =>
      employee &&
      typeof employee === 'object'
  );
}

function getLessonType(item) {
  return (
    item?.type ||
    item?.lessonTypeAbbrev ||
    item?.lessonType ||
    'Lesson'
  );
}

function getWeekLabel(item) {
  if (!Array.isArray(item?.weekNumber)) {
    return '';
  }

  if (
    item.weekNumber.length === 0 ||
    item.weekNumber.length === 4
  ) {
    return 'Every week';
  }

  return item.weekNumber
    .sort((a, b) => a - b)
    .join(', ');
}

function getTeacherInitials(employee) {
  const name =
    getTeacherName(employee);

  if (!name) {
    return '?';
  }

  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part =>
      part.charAt(0).toUpperCase()
    )
    .join('');
}

export default function LessonDetailsSheet({
  lesson,
  onClose,
  onTeacherClick,
  onTeacherPhotoClick
}) {
  useEffect(() => {
    if (!lesson) {
      return undefined;
    }

    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener(
      'keydown',
      handleKeyDown
    );

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      'hidden';

    return () => {
      document.removeEventListener(
        'keydown',
        handleKeyDown
      );

      document.body.style.overflow =
        previousOverflow;
    };
  }, [
    lesson,
    onClose
  ]);

  if (!lesson) {
    return null;
  }

  const teachers =
    getTeachers(lesson);

  const room =
    getRoom(lesson);

  const week =
    getWeekLabel(lesson);

  return (
    <div
      className="fixed inset-0 z-[80]"
      role="dialog"
      aria-modal="true"
      aria-label={
        lesson.subject ||
        'Lesson details'
      }
    >
      <button
        type="button"
        aria-label="Close lesson details"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
      />

      <div className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col overflow-hidden rounded-t-[28px] border border-[var(--border-glass)] bg-[var(--background-primary)] shadow-2xl">
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-[var(--text-secondary)]/30" />

        <div className="flex items-center justify-between px-5 pb-3 pt-4">
          <div className="min-w-0 pr-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              Lesson details
            </p>

            <h2 className="mt-1 truncate text-xl font-extrabold text-[var(--text-primary)]">
              {lesson.subject ||
                'Lesson'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-glass)] text-lg text-[var(--text-secondary)] transition-transform active:scale-90"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-8">
          {lesson.subjectFullName &&
            lesson.subjectFullName !==
              lesson.subject && (
              <p className="mb-4 text-sm leading-5 text-[var(--text-secondary)]">
                {lesson.subjectFullName}
              </p>
            )}

          <div className="overflow-hidden rounded-2xl border border-[var(--border-glass)] bg-[var(--surface-glass)]">
            <InfoRow
              label="Time"
              value={
                lesson.time ||
                '—'
              }
            />

            <InfoRow
              label="Type"
              value={
                getLessonType(
                  lesson
                )
              }
            />

            <InfoRow
              label="Room"
              value={
                room || '—'
              }
            />

            {lesson.numSubgroup &&
              Number(
                lesson.numSubgroup
              ) > 0 && (
                <InfoRow
                  label="Subgroup"
                  value={String(
                    lesson.numSubgroup
                  )}
                />
              )}

            {week && (
              <InfoRow
                label="Weeks"
                value={week}
              />
            )}
          </div>

          {lesson.note && (
            <section className="mt-4">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                Note
              </h3>

              <div className="rounded-2xl border border-[var(--border-glass)] bg-[var(--surface-glass)] p-4">
                <p className="text-sm leading-5 text-[var(--text-primary)]">
                  {lesson.note}
                </p>
              </div>
            </section>
          )}

          {teachers.length > 0 && (
            <section className="mt-5">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                Teachers
              </h3>

              <div className="space-y-2">
                {teachers.map(
                  (
                    teacher,
                    index
                  ) => {
                    const name =
                      getTeacherName(
                        teacher
                      );

                    const photo =
                      getTeacherPhoto(
                        teacher
                      );

                    const teacherId =
                      teacher.id ??
                      teacher.urlId ??
                      index;

                    return (
                      <div
                        key={
                          teacherId
                        }
                        className="flex items-center gap-3 rounded-2xl border border-[var(--border-glass)] bg-[var(--surface-glass)] p-3"
                      >
                        <button
                          type="button"
                          disabled={!photo}
                          onClick={() =>
                            onTeacherPhotoClick?.(
                              teacher
                            )
                          }
                          className="shrink-0 disabled:cursor-default"
                          aria-label={
                            photo
                              ? `Open photo of ${name}`
                              : undefined
                          }
                        >
                          {photo ? (
                            <img
                              src={photo}
                              alt=""
                              loading="lazy"
                              className="h-12 w-12 rounded-full object-cover ring-1 ring-white/10"
                            />
                          ) : (
                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-xs font-bold text-[var(--text-secondary)] ring-1 ring-white/10">
                              {getTeacherInitials(
                                teacher
                              )}
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onTeacherClick?.(
                              teacher
                            )
                          }
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="block truncate text-sm font-bold text-[var(--text-primary)]">
                            {name ||
                              'Teacher'}
                          </span>

                          {teacher.rank && (
                            <span className="mt-0.5 block truncate text-[11px] text-[var(--text-secondary)]">
                              {
                                teacher.rank
                              }
                            </span>
                          )}

                          {teacher.degree && (
                            <span className="mt-0.5 block truncate text-[11px] text-[var(--text-secondary)]">
                              {
                                teacher.degree
                              }
                            </span>
                          )}
                        </button>

                        <span
                          aria-hidden="true"
                          className="shrink-0 text-sm text-[var(--text-secondary)]"
                        >
                          ›
                        </span>
                      </div>
                    );
                  }
                )}
              </div>
            </section>
          )}

          {Array.isArray(
            lesson.auditories
          ) &&
            lesson.auditories.length >
              0 && (
              <section className="mt-5">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                  Auditories
                </h3>

                <div className="space-y-2">
                  {lesson.auditories.map(
                    (
                      auditory,
                      index
                    ) => {
                      const name =
                        typeof auditory ===
                        'string'
                          ? auditory
                          : auditory?.auditoryName ||
                            auditory?.name ||
                            auditory?.number ||
                            auditory?.auditory ||
                            '';

                      if (!name) {
                        return null;
                      }

                      return (
                        <div
                          key={`${name}-${index}`}
                          className="rounded-xl bg-[var(--surface-glass)] px-3 py-2 text-sm text-[var(--text-primary)]"
                        >
                          {name}
                        </div>
                      );
                    }
                  )}
                </div>
              </section>
            )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--border-glass)] px-4 py-3 last:border-b-0">
      <span className="text-xs font-medium text-[var(--text-secondary)]">
        {label}
      </span>

      <span className="text-right text-sm font-semibold text-[var(--text-primary)]">
        {value}
      </span>
    </div>
  );
}
