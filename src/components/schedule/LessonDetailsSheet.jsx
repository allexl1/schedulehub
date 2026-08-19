import React, {
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

function getTeacherName(employee) {
  if (
    !employee ||
    typeof employee !== 'object'
  ) {
    return '';
  }

  return (
    employee.fio ||
    employee.name ||
    employee.fullName ||
    ''
  );
}

function getTeacherPhoto(employee) {
  if (
    !employee ||
    typeof employee !== 'object'
  ) {
    return '';
  }

  return (
    employee.photoLink ||
    employee.photo ||
    employee.photoUrl ||
    employee.image ||
    employee.imageUrl ||
    ''
  );
}

function getTeacherInitials(employee) {
  const name =
    getTeacherName(employee);

  if (!name) {
    return '?';
  }

  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part =>
      part.charAt(0).toUpperCase()
    )
    .join('');
}

function getTeachers(item) {
  if (
    !Array.isArray(
      item?.employees
    )
  ) {
    return [];
  }

  return item.employees.filter(
    employee =>
      employee &&
      typeof employee === 'object'
  );
}

function getAuditoryName(auditory) {
  if (
    typeof auditory === 'string'
  ) {
    return auditory;
  }

  if (
    !auditory ||
    typeof auditory !== 'object'
  ) {
    return '';
  }

  return (
    auditory.auditoryName ||
    auditory.name ||
    auditory.number ||
    auditory.auditory ||
    ''
  );
}

function getRooms(item) {
  if (item?.room) {
    return [
      String(item.room)
    ];
  }

  if (
    !Array.isArray(
      item?.auditories
    )
  ) {
    return [];
  }

  return item.auditories
    .map(getAuditoryName)
    .filter(Boolean);
}

function getLessonType(item) {
  return (
    item?.type ||
    item?.lessonTypeAbbrev ||
    item?.lessonType ||
    item?.form?.name ||
    ''
  );
}

function getWeekLabel(item) {
  const weeks =
    item?.weekNumber ??
    item?.weeks;

  if (
    typeof weeks === 'string'
  ) {
    return weeks.trim();
  }

  if (
    !Array.isArray(weeks) ||
    weeks.length === 0
  ) {
    return '';
  }

  const normalized =
    weeks
      .map(Number)
      .filter(Number.isFinite)
      .sort(
        (a, b) => a - b
      );

  if (
    normalized.length === 0
  ) {
    return '';
  }

  return normalized.join(', ');
}

function getSubgroupLabel(item) {
  const subgroup =
    item?.numSubgroup ??
    item?.subgroup;

  if (
    subgroup === undefined ||
    subgroup === null ||
    subgroup === '' ||
    Number(subgroup) === 0 ||
    String(subgroup).toLowerCase() ===
      'all'
  ) {
    return '';
  }

  return String(subgroup);
}

function getDayLabel(item) {
  if (item?.date) {
    const date =
      item.date instanceof Date
        ? item.date
        : new Date(item.date);

    if (
      !Number.isNaN(
        date.getTime()
      )
    ) {
      return date.toLocaleDateString(
        'en-US',
        {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        }
      );
    }
  }

  if (item?.day) {
    return String(
      item.day
    );
  }

  if (item?.weekday) {
    return String(
      item.weekday
    );
  }

  return '';
}

function getGroups(item) {
  const groups =
    item?.groups ??
    item?.groupNames;

  if (
    !Array.isArray(groups)
  ) {
    return [];
  }

  return groups
    .map(group => {
      if (
        typeof group === 'string' ||
        typeof group === 'number'
      ) {
        return String(group);
      }

      if (
        group &&
        typeof group === 'object'
      ) {
        return (
          group.name ||
          group.groupName ||
          group.number ||
          ''
        );
      }

      return '';
    })
    .filter(Boolean);
}

function InfoRow({
  label,
  value
}) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--border-glass)] px-4 py-3 last:border-b-0">
      <span className="shrink-0 text-xs font-medium text-[var(--text-secondary)]">
        {label}
      </span>

      <span className="min-w-0 text-right text-sm font-semibold text-[var(--text-primary)]">
        {value}
      </span>
    </div>
  );
}

function SectionTitle({
  children
}) {
  return (
    <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
      {children}
    </h3>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function ZoomIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle
        cx="10.5"
        cy="10.5"
        r="5.5"
      />
      <path d="m15 15 4 4" />
      <path d="M8.5 10.5h4" />
      <path d="M10.5 8.5v4" />
    </svg>
  );
}

export default function LessonDetailsSheet({
  lesson,
  onClose,
  onTeacherClick,
  onTeacherPhotoClick,
  onGroupClick
}) {
  const [
    previewTeacher,
    setPreviewTeacher
  ] = useState(null);

  const [
    sheetPosition,
    setSheetPosition
  ] = useState('half');

  const [
    dragOffset,
    setDragOffset
  ] = useState(0);

  const dragState =
  useRef({
    active: false,
    startY: 0
  });

  const sheetRef =
    useRef(null);

  const teachers = useMemo(
    () => getTeachers(lesson),
    [lesson]
  );

  const rooms = useMemo(
    () => getRooms(lesson),
    [lesson]
  );

  const groups = useMemo(
    () => getGroups(lesson),
    [lesson]
  );

  const weekLabel = useMemo(
    () => getWeekLabel(lesson),
    [lesson]
  );

  const subgroup = useMemo(
    () => getSubgroupLabel(lesson),
    [lesson]
  );

  const dayLabel = useMemo(
    () => getDayLabel(lesson),
    [lesson]
  );

  useEffect(() => {
    if (!lesson) {
      return undefined;
    }

    const handleKeyDown =
      event => {
        if (
          event.key !== 'Escape'
        ) {
          return;
        }

        if (previewTeacher) {
          setPreviewTeacher(
            null
          );
          return;
        }

        onClose?.();
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
    onClose,
    previewTeacher
  ]);

  useEffect(() => {
    setPreviewTeacher(null);
    setSheetPosition('half');
    setDragOffset(0);
  }, [lesson]);

  if (!lesson) {
    return null;
  }

  const positionPercent =
    sheetPosition === 'expanded'
      ? 0
      : sheetPosition === 'half'
        ? 44
        : 76;

  const transform =
    `translateY(calc(${positionPercent}% + ${dragOffset}px))`;

  const handlePointerDown =
    event => {
      if (
        event.pointerType ===
        'mouse' &&
        event.button !== 0
      ) {
        return;
      }

      dragState.current = {
  active: true,
  startY: event.clientY
};

      event.currentTarget.setPointerCapture(
        event.pointerId
      );
    };

  const handlePointerMove =
    event => {
      if (
        !dragState.current.active
      ) {
        return;
      }

      setDragOffset(delta);
    };

  const finishDrag = () => {
    if (
      !dragState.current.active
    ) {
      return;
    }

    const delta =
      dragState.current.startY -
      dragState.current.startY;

    const currentOffset =
      dragOffset;

    dragState.current.active =
      false;

    setDragOffset(0);

    if (
      currentOffset < -80
    ) {
      setSheetPosition(
        'expanded'
      );
      return;
    }

    if (
      currentOffset > 80
    ) {
      setSheetPosition(
        'collapsed'
      );
      return;
    }

    setSheetPosition(
      'half'
    );
  };

  const handleBackdropClick =
    () => {
      if (
        sheetPosition ===
        'expanded'
      ) {
        setSheetPosition(
          'half'
        );
        return;
      }

      onClose?.();
    };

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
        onClick={
          handleBackdropClick
        }
        className={`absolute inset-0 bg-black/35 transition-opacity duration-300 ${
          sheetPosition ===
          'expanded'
            ? 'opacity-50'
            : 'opacity-100'
        }`}
      />

      <div
        ref={sheetRef}
        className="absolute inset-x-0 bottom-0 flex h-[88vh] flex-col overflow-hidden rounded-t-[28px] border border-[var(--border-glass)] bg-[var(--background-primary)] shadow-2xl"
        style={{
          transform,
          transition:
            dragState.current
              .active
              ? 'none'
              : 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      >
        <div
          className="shrink-0 touch-none cursor-grab px-5 pb-2 pt-2 active:cursor-grabbing"
          onPointerDown={
            handlePointerDown
          }
          onPointerMove={
            handlePointerMove
          }
          onPointerUp={
            finishDrag
          }
          onPointerCancel={
            finishDrag
          }
          onPointerLeave={
            event => {
              if (
                event.buttons !== 0
              ) {
                return;
              }

              finishDrag();
            }
          }
        >
          <div
            aria-hidden="true"
            className="mx-auto h-1.5 w-10 rounded-full bg-[var(--text-secondary)]/30"
          />
        </div>

        <div className="flex shrink-0 items-center justify-between gap-4 px-5 pb-4 pt-2">
          <div className="min-w-0">
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
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-glass)] text-[var(--text-secondary)] transition-transform active:scale-90"
            aria-label="Close lesson details"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-10">
          {lesson.subjectFullName &&
            lesson.subjectFullName !==
              lesson.subject && (
              <p className="mb-4 text-sm leading-5 text-[var(--text-secondary)]">
                {
                  lesson.subjectFullName
                }
              </p>
            )}

          <div className="overflow-hidden rounded-2xl border border-[var(--border-glass)] bg-[var(--surface-glass)]">
            <InfoRow
              label="Time"
              value={
                lesson.time || '—'
              }
            />

            <InfoRow
              label="Day"
              value={
                dayLabel || '—'
              }
            />

            <InfoRow
              label="Type"
              value={
                getLessonType(
                  lesson
                ) || '—'
              }
            />

            <InfoRow
              label="Room"
              value={
                rooms.length > 0
                  ? rooms.join(', ')
                  : '—'
              }
            />

            <InfoRow
              label="Subgroup"
              value={
                subgroup || '—'
              }
            />

            <InfoRow
              label="Weeks"
              value={
                weekLabel || '—'
              }
            />
          </div>

          {teachers.length > 0 && (
            <section className="mt-5">
              <SectionTitle>
                Teachers
              </SectionTitle>

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
                      `${name}-${index}`;

                    return (
                      <div
                        key={
                          teacherId
                        }
                        className="flex items-center gap-3 rounded-2xl border border-[var(--border-glass)] bg-[var(--surface-glass)] p-3"
                      >
                        {photo ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewTeacher(
                                teacher
                              );

                              onTeacherPhotoClick?.(
                                teacher
                              );
                            }}
                            className="relative shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-[#2997ff]/60"
                            aria-label={`Open photo of ${
                              name ||
                              'teacher'
                            }`}
                          >
                            <img
                              src={
                                photo
                              }
                              alt=""
                              loading="lazy"
                              className="h-12 w-12 rounded-full object-cover ring-1 ring-white/10"
                            />

                            <span
                              aria-hidden="true"
                              className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-[var(--background-primary)] bg-[var(--surface-glass)] text-[var(--text-primary)]"
                            >
                              <ZoomIcon />
                            </span>
                          </button>
                        ) : (
                          <div
                            aria-hidden="true"
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/5 text-xs font-bold text-[var(--text-secondary)] ring-1 ring-white/10"
                          >
                            {getTeacherInitials(
                              teacher
                            )}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            onTeacherClick?.(
                              teacher
                            )
                          }
                          className="min-w-0 flex-1 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#2997ff]/50"
                          aria-label={
                            name
                              ? `Open details for ${name}`
                              : 'Open teacher details'
                          }
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
                          className="shrink-0 text-[var(--text-secondary)]"
                        >
                          <ChevronIcon />
                        </span>
                      </div>
                    );
                  }
                )}
              </div>
            </section>
          )}

          {groups.length > 0 && (
            <section className="mt-5">
              <SectionTitle>
                Groups
              </SectionTitle>

              <div className="space-y-2">
                {groups.map(
                  (
                    group,
                    index
                  ) => (
                    <button
                      key={`${group}-${index}`}
                      type="button"
                      onClick={() =>
                        onGroupClick?.(
                          group
                        )
                      }
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--border-glass)] bg-[var(--surface-glass)] px-4 py-3 text-left transition-colors active:bg-white/10"
                    >
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {group}
                      </span>

                      {onGroupClick && (
                        <ChevronIcon />
                      )}
                    </button>
                  )
                )}
              </div>
            </section>
          )}

          {lesson.note && (
            <section className="mt-5">
              <SectionTitle>
                Note
              </SectionTitle>

              <div className="rounded-2xl border border-[var(--border-glass)] bg-[var(--surface-glass)] p-4">
                <p className="whitespace-pre-wrap text-sm leading-5 text-[var(--text-primary)]">
                  {lesson.note}
                </p>
              </div>
            </section>
          )}
        </div>
      </div>

      {previewTeacher && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6">
          <button
            type="button"
            onClick={() =>
              setPreviewTeacher(
                null
              )
            }
            className="absolute inset-0"
            aria-label="Close teacher photo"
          />

          <div className="relative z-10 max-w-full">
            <img
              src={getTeacherPhoto(
                previewTeacher
              )}
              alt={getTeacherName(
                previewTeacher
              )}
              className="max-h-[75vh] max-w-full rounded-3xl object-contain shadow-2xl"
            />

            <p className="mt-3 text-center text-sm font-semibold text-white">
              {getTeacherName(
                previewTeacher
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}