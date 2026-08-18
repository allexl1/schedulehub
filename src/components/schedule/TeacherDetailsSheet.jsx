import React, {
  useEffect,
  useMemo
} from 'react';

function getTeacherName(teacher) {
  if (!teacher || typeof teacher !== 'object') {
    return '';
  }

  return (
    teacher.fio ||
    teacher.name ||
    teacher.fullName ||
    [
      teacher.lastName,
      teacher.firstName,
      teacher.middleName
    ]
      .filter(Boolean)
      .join(' ') ||
    ''
  );
}

function getTeacherPhoto(teacher) {
  if (!teacher || typeof teacher !== 'object') {
    return '';
  }

  return (
    teacher.photoLink ||
    teacher.photo ||
    teacher.photoUrl ||
    teacher.image ||
    teacher.imageUrl ||
    ''
  );
}

function getInitials(name) {
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

function getValue(teacher, keys) {
  for (const key of keys) {
    const value = teacher?.[key];

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ''
    ) {
      return String(value);
    }
  }

  return '';
}

function DetailRow({
  label,
  value
}) {
  if (!value) {
    return null;
  }

  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border-glass)] px-4 py-3 last:border-b-0">
      <span className="shrink-0 text-xs font-medium text-[var(--text-secondary)]">
        {label}
      </span>

      <span className="min-w-0 text-right text-sm font-semibold leading-5 text-[var(--text-primary)]">
        {value}
      </span>
    </div>
  );
}

export default function TeacherDetailsSheet({
  teacher,
  onClose,
  onPhotoClick
}) {
  const name = useMemo(
    () => getTeacherName(teacher),
    [teacher]
  );

  const photo = useMemo(
    () => getTeacherPhoto(teacher),
    [teacher]
  );

  const rank = useMemo(
    () =>
      getValue(teacher, [
        'rank',
        'academicRank'
      ]),
    [teacher]
  );

  const degree = useMemo(
    () =>
      getValue(teacher, [
        'degree',
        'academicDegree'
      ]),
    [teacher]
  );

  const department = useMemo(
    () =>
      getValue(teacher, [
        'academicDepartment',
        'department',
        'departmentName'
      ]),
    [teacher]
  );

  const email = useMemo(
    () =>
      getValue(teacher, [
        'email',
        'emailAddress'
      ]),
    [teacher]
  );

  const phone = useMemo(
    () =>
      getValue(teacher, [
        'phone',
        'phoneNumber'
      ]),
    [teacher]
  );

  useEffect(() => {
    if (!teacher) {
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
    teacher,
    onClose
  ]);

  if (!teacher) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-label={
        name ||
        'Teacher details'
      }
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close teacher details"
        className="absolute inset-0 bg-black/40"
      />

      <div className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-hidden rounded-t-[28px] border border-[var(--border-glass)] bg-[var(--background-primary)] shadow-2xl">
        <div
          aria-hidden="true"
          className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-[var(--text-secondary)]/30"
        />

        <div className="flex items-center justify-between gap-4 px-5 pb-4 pt-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              Teacher
            </p>

            <h2 className="mt-1 truncate text-xl font-extrabold text-[var(--text-primary)]">
              {name ||
                'Teacher'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close teacher details"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-glass)] text-lg text-[var(--text-secondary)] transition-transform active:scale-90"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-8">
          <div className="flex flex-col items-center rounded-3xl border border-[var(--border-glass)] bg-[var(--surface-glass)] p-5">
            {photo ? (
              <button
                type="button"
                onClick={() =>
                  onPhotoClick?.(
                    teacher
                  )
                }
                className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-[#2997ff]/60"
                aria-label={`Open photo of ${
                  name ||
                  'teacher'
                }`}
              >
                <img
                  src={photo}
                  alt=""
                  loading="lazy"
                  className="h-28 w-28 rounded-full object-cover ring-2 ring-white/10"
                />

                <span
                  aria-hidden="true"
                  className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--background-primary)] bg-[var(--surface-glass)] text-sm text-[var(--text-primary)]"
                >
                  ⌕
                </span>
              </button>
            ) : (
              <div
                aria-hidden="true"
                className="flex h-28 w-28 items-center justify-center rounded-full bg-white/5 text-2xl font-extrabold text-[var(--text-secondary)] ring-2 ring-white/10"
              >
                {getInitials(
                  name
                )}
              </div>
            )}

            <h3 className="mt-4 text-center text-lg font-extrabold text-[var(--text-primary)]">
              {name ||
                'Teacher'}
            </h3>

            {rank && (
              <p className="mt-1 text-center text-xs text-[var(--text-secondary)]">
                {rank}
              </p>
            )}

            {degree && (
              <p className="mt-1 text-center text-xs text-[var(--text-secondary)]">
                {degree}
              </p>
            )}
          </div>

          {(rank ||
            degree ||
            department ||
            email ||
            phone) && (
            <section className="mt-5">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                Information
              </h3>

              <div className="overflow-hidden rounded-2xl border border-[var(--border-glass)] bg-[var(--surface-glass)]">
                <DetailRow
                  label="Rank"
                  value={rank}
                />

                <DetailRow
                  label="Degree"
                  value={degree}
                />

                <DetailRow
                  label="Department"
                  value={
                    department
                  }
                />

                <DetailRow
                  label="Email"
                  value={email}
                />

                <DetailRow
                  label="Phone"
                  value={phone}
                />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}