import React, { useEffect, useMemo, useState } from 'react';
import GlassCard from '../components/common/GlassCard';
import Icon from '../components/common/Icon';

const EMPTY_TEACHERS = [];

function getTeacherName(teacher) {
  return (
    teacher?.name ||
    [teacher?.firstName, teacher?.middleName, teacher?.lastName]
      .filter(Boolean)
      .join(' ') ||
    'Unknown teacher'
  );
}

function getDepartmentName(teacher) {
  if (!Array.isArray(teacher?.academicDepartment)) {
    return '';
  }

  return teacher.academicDepartment
    .map(department => {
      if (typeof department === 'string') {
        return department;
      }

      return (
        department?.name ||
        department?.title ||
        department?.shortName ||
        ''
      );
    })
    .filter(Boolean)
    .join(', ');
}

function getInitials(teacher) {
  const first =
    teacher?.firstName?.trim()?.charAt(0) || '';

  const last =
    teacher?.lastName?.trim()?.charAt(0) || '';

  const initials =
    `${first}${last}`.toUpperCase();

  if (initials) {
    return initials;
  }

  return getTeacherName(teacher)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase();
}

function getPhotoUrl(teacher) {
  const value =
    teacher?.photoLink ||
    teacher?.photo ||
    teacher?.photoUrl ||
    null;

  if (!value) {
    return null;
  }

  const url = String(value).trim();

  if (!url) {
    return null;
  }

  if (
    url.startsWith('http://') ||
    url.startsWith('https://')
  ) {
    return url;
  }

  if (url.startsWith('//')) {
    return `https:${url}`;
  }

  return url;
}

function TeacherAvatar({ teacher, large = false }) {
  const [imageFailed, setImageFailed] =
    useState(false);

  const photoUrl =
    getPhotoUrl(teacher);

  useEffect(() => {
    setImageFailed(false);
  }, [photoUrl]);

  const sizeClass =
    large
      ? 'w-20 h-20'
      : 'w-12 h-12';

  if (photoUrl && !imageFailed) {
    return (
      <img
        src={photoUrl}
        alt={getTeacherName(teacher)}
        className={`${sizeClass} rounded-2xl object-cover shrink-0 bg-black/10 dark:bg-white/5`}
        loading="lazy"
        onError={() =>
          setImageFailed(true)
        }
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-2xl flex items-center justify-center shrink-0 bg-[#2997ff]/10 border border-[#2997ff]/20 text-[#2997ff] font-bold ${
        large
          ? 'text-xl'
          : 'text-sm'
      }`}
    >
      {getInitials(teacher)}
    </div>
  );
}

export default function TeachersView() {
  const [teachers, setTeachers] =
    useState(EMPTY_TEACHERS);

  const [searchQuery, setSearchQuery] =
    useState('');

  const [selectedTeacher, setSelectedTeacher] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTeachers() {
      try {
        setLoading(true);
        setError(null);

        const response =
          await fetch(
            '/api/bsuir/teacher',
            {
              headers: {
                Accept:
                  'application/json'
              }
            }
          );

        let json = null;

        try {
          json =
            await response.json();
        } catch {
          json = null;
        }

        if (!response.ok) {
          throw new Error(
            json?.error ||
              json?.message ||
              `Teacher server returned HTTP ${response.status}.`
          );
        }

        if (
          !json ||
          json.success !== true ||
          !json.data ||
          !Array.isArray(
            json.data.teachers
          )
        ) {
          throw new Error(
            'The teacher server returned invalid data.'
          );
        }

        if (cancelled) {
          return;
        }

        setTeachers(
          json.data.teachers
        );
      } catch (fetchError) {
        if (cancelled) {
          return;
        }

        console.error(
          'Failed to load teachers:',
          fetchError
        );

        setTeachers(
          EMPTY_TEACHERS
        );

        setError(
          fetchError?.message ||
            'Unable to load teachers.'
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTeachers();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredTeachers =
    useMemo(() => {
      const query =
        searchQuery
          .trim()
          .toLowerCase();

      if (!query) {
        return teachers;
      }

      return teachers.filter(
        teacher => {
          const name =
            getTeacherName(
              teacher
            ).toLowerCase();

          const compactName =
            teacher?.compactName
              ?.toLowerCase() || '';

          const department =
            getDepartmentName(
              teacher
            ).toLowerCase();

          const rank =
            String(
              teacher?.rank || ''
            ).toLowerCase();

          const degree =
            String(
              teacher?.degree || ''
            ).toLowerCase();

          return (
            name.includes(query) ||
            compactName.includes(query) ||
            department.includes(query) ||
            rank.includes(query) ||
            degree.includes(query)
          );
        }
      );
    }, [
      teachers,
      searchQuery
    ]);

  const handleTeacherClick =
    teacher => {
      setSelectedTeacher(
        current =>
          current?.id === teacher?.id
            ? null
            : teacher
      );
    };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)] mb-1">
          Teachers
        </h2>

        <p className="text-xs text-[var(--text-secondary)] mb-3">
          Search BSUIR teachers and open their profiles
        </p>

        <div className="relative">
          <input
            type="text"
            placeholder="Search by name or department..."
            value={searchQuery}
            onChange={event =>
              setSearchQuery(
                event.target.value
              )
            }
            className="w-full bg-black/10 dark:bg-white/5 border border-[var(--border-glass)] rounded-xl pl-9 pr-4 py-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[#2997ff]"
          />

          <div className="absolute left-3 top-2.5 text-[var(--text-secondary)]">
            <Icon
              name="search"
              className="w-4 h-4"
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="space-y-2.5">
          {Array.from({
            length: 5
          }).map((_, index) => (
            <GlassCard
              key={index}
              className="animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-black/10 dark:bg-white/5" />

                <div className="flex-1 space-y-2">
                  <div className="h-3 w-40 rounded bg-black/10 dark:bg-white/5" />
                  <div className="h-2.5 w-28 rounded bg-black/10 dark:bg-white/5" />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {!loading && error && (
        <GlassCard className="text-center py-8">
          <div className="text-2xl mb-2">
            ⚠️
          </div>

          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Unable to load teachers
          </p>

          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {error}
          </p>
        </GlassCard>
      )}

      {!loading &&
        !error &&
        filteredTeachers.length === 0 && (
          <GlassCard className="text-center py-8">
            <div className="text-2xl mb-2">
              🔎
            </div>

            <p className="text-sm font-semibold text-[var(--text-primary)]">
              No teachers found
            </p>

            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Try a different name or department.
            </p>
          </GlassCard>
        )}

      {!loading &&
        !error &&
        filteredTeachers.length > 0 && (
          <div className="space-y-2.5">
            {filteredTeachers.map(
              teacher => {
                const isSelected =
                  selectedTeacher?.id ===
                  teacher?.id;

                const department =
                  getDepartmentName(
                    teacher
                  );

                return (
                  <GlassCard
                    key={
                      teacher?.id ??
                      teacher?.urlId ??
                      getTeacherName(
                        teacher
                      )
                    }
                    interactive
                    onClick={() =>
                      handleTeacherClick(
                        teacher
                      )
                    }
                  >
                    <div className="flex items-center gap-3">
                      <TeacherAvatar
                        teacher={
                          teacher
                        }
                      />

                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">
                          {getTeacherName(
                            teacher
                          )}
                        </h4>

                        {department && (
                          <p className="mt-0.5 text-xs text-[var(--text-secondary)] truncate">
                            {department}
                          </p>
                        )}

                        {(teacher?.rank ||
                          teacher?.degree) && (
                          <p className="mt-1 text-[10px] text-[var(--text-secondary)] opacity-80 truncate">
                            {[
                              teacher?.rank,
                              teacher?.degree
                            ]
                              .filter(
                                Boolean
                              )
                              .join(
                                ' • '
                              )}
                          </p>
                        )}
                      </div>

                      <span className="text-[var(--text-secondary)] text-xs">
                        {isSelected
                          ? '⌃'
                          : '›'}
                      </span>
                    </div>

                    {isSelected && (
                      <div className="mt-4 pt-4 border-t border-[var(--border-glass)]">
                        <div className="flex items-start gap-3">
                          <TeacherAvatar
                            teacher={
                              teacher
                            }
                            large
                          />

                          <div className="min-w-0 flex-1">
                            <h3 className="text-base font-bold text-[var(--text-primary)]">
                              {getTeacherName(
                                teacher
                              )}
                            </h3>

                            {teacher?.compactName && (
                              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                {teacher.compactName}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 space-y-2">
                          {department && (
                            <div className="rounded-xl bg-black/10 dark:bg-white/5 px-3 py-2">
                              <span className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-0.5">
                                Department
                              </span>

                              <span className="text-xs text-[var(--text-primary)]">
                                {department}
                              </span>
                            </div>
                          )}

                          {teacher?.rank && (
                            <div className="rounded-xl bg-black/10 dark:bg-white/5 px-3 py-2">
                              <span className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-0.5">
                                Academic rank
                              </span>

                              <span className="text-xs text-[var(--text-primary)]">
                                {teacher.rank}
                              </span>
                            </div>
                          )}

                          {teacher?.degree && (
                            <div className="rounded-xl bg-black/10 dark:bg-white/5 px-3 py-2">
                              <span className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-0.5">
                                Degree
                              </span>

                              <span className="text-xs text-[var(--text-primary)]">
                                {teacher.degree}
                              </span>
                            </div>
                          )}

                          {teacher?.urlId && (
                            <div className="rounded-xl bg-black/10 dark:bg-white/5 px-3 py-2">
                              <span className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-0.5">
                                BSUIR ID
                              </span>

                              <span className="text-xs text-[var(--text-primary)]">
                                {teacher.urlId}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </GlassCard>
                );
              }
            )}
          </div>
        )}
    </div>
  );
}