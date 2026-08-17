import React, {
  useEffect,
  useMemo,
  useState
} from 'react';

import Icon from '../common/Icon';
import {
  fetchStudentGroups
} from '../../services/groupService';

const FAVORITES_KEY =
  'sh_schedule_favorite_groups';

function readFavorites() {
  try {
    const saved =
      localStorage.getItem(
        FAVORITES_KEY
      );

    if (!saved) {
      return [];
    }

    const parsed =
      JSON.parse(saved);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function saveFavorites(
  favorites
) {
  try {
    localStorage.setItem(
      FAVORITES_KEY,
      JSON.stringify(favorites)
    );
  } catch (error) {
    console.error(
      'Failed to save favorite groups:',
      error
    );
  }
}

function getGroupLabel(group) {
  return (
    group?.name ||
    'Unknown group'
  );
}

function getGroupSecondaryText(
  group
) {
  const parts = [
    group?.faculty,
    group?.speciality,
    group?.course
  ].filter(Boolean);

  return parts.join(' · ');
}

export default function GroupBrowser({
  currentGroup,
  onSelectGroup,
  onClose
}) {
  const [
    groups,
    setGroups
  ] = useState([]);

  const [
    favorites,
    setFavorites
  ] = useState(
    readFavorites
  );

  const [
    search,
    setSearch
  ] = useState('');

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    error,
    setError
  ] = useState(null);

  useEffect(() => {
    const controller =
      new AbortController();

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const result =
          await fetchStudentGroups({
            signal:
              controller.signal
          });

        setGroups(
          result.groups
        );
      } catch (requestError) {
        if (
          requestError?.name ===
          'AbortError'
        ) {
          return;
        }

        console.error(
          'Failed to load student groups:',
          requestError
        );

        setError(
          requestError?.message ||
            'Unable to load BSUIR groups.'
        );
      } finally {
        if (
          !controller.signal.aborted
        ) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      controller.abort();
    };
  }, []);

  const normalizedSearch =
    search.trim().toUpperCase();

  const filteredGroups =
    useMemo(() => {
      if (!normalizedSearch) {
        return groups;
      }

      return groups.filter(
        group =>
          getGroupLabel(group)
            .toUpperCase()
            .includes(
              normalizedSearch
            ) ||
          getGroupSecondaryText(
            group
          )
            .toUpperCase()
            .includes(
              normalizedSearch
            )
      );
    }, [
      groups,
      normalizedSearch
    ]);

  const favoriteGroups =
    useMemo(
      () =>
        favorites
          .map(name =>
            groups.find(
              group =>
                group.name ===
                name
            )
          )
          .filter(Boolean),
      [
        favorites,
        groups
      ]
    );

  const toggleFavorite =
    groupName => {
      const exists =
        favorites.includes(
          groupName
        );

      const updated = exists
        ? favorites.filter(
            name =>
              name !==
              groupName
          )
        : [
            ...favorites,
            groupName
          ];

      setFavorites(
        updated
      );

      saveFavorites(
        updated
      );
    };

  const handleSelect =
    group => {
      onSelectGroup(
        group.name
      );
    };

  return (
    <div className="fixed inset-0 z-50 bg-[var(--background)]">
      <div className="mx-auto flex h-full max-w-[440px] flex-col px-4 pt-5 pb-6">

        <header className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-glass)] text-[var(--text-primary)] active:scale-95"
            aria-label="Close group browser"
          >
            <span className="text-xl leading-none">
              ‹
            </span>
          </button>

          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
              Groups
            </h1>

            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              BSUIR student groups
            </p>
          </div>
        </header>

        <div className="relative mb-4">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]"
          />

          <input
            value={search}
            onChange={event =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search groups"
            className="w-full rounded-2xl bg-[var(--surface-glass)] py-3 pl-10 pr-4 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pb-6">

          {!normalizedSearch &&
            favoriteGroups.length >
              0 && (
              <section className="mb-5">
                <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Favorites
                </h2>

                <div className="space-y-2">
                  {favoriteGroups.map(
                    group => (
                      <GroupRow
                        key={
                          group.name
                        }
                        group={
                          group
                        }
                        selected={
                          group.name ===
                          currentGroup
                        }
                        favorite
                        onSelect={
                          handleSelect
                        }
                        onToggleFavorite={
                          toggleFavorite
                        }
                      />
                    )
                  )}
                </div>
              </section>
            )}

          {loading && (
            <div className="rounded-2xl bg-[var(--surface-glass)] p-6 text-center text-xs text-[var(--text-secondary)]">
              Loading BSUIR groups...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-[#f59e0b]/20 bg-[#f59e0b]/10 p-4 text-xs text-[#f59e0b]">
              {error}
            </div>
          )}

          {!loading &&
            !error &&
            filteredGroups.length ===
              0 && (
              <div className="rounded-2xl bg-[var(--surface-glass)] p-6 text-center text-xs text-[var(--text-secondary)]">
                No groups found.
              </div>
            )}

          {!loading &&
            !error &&
            filteredGroups.length >
              0 && (
              <section>
                <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  {normalizedSearch
                    ? 'Search results'
                    : 'All groups'}
                </h2>

                <div className="space-y-2">
                  {filteredGroups.map(
                    group => (
                      <GroupRow
                        key={
                          group.name
                        }
                        group={
                          group
                        }
                        selected={
                          group.name ===
                          currentGroup
                        }
                        favorite={favorites.includes(
                          group.name
                        )}
                        onSelect={
                          handleSelect
                        }
                        onToggleFavorite={
                          toggleFavorite
                        }
                      />
                    )
                  )}
                </div>
              </section>
            )}
        </div>
      </div>
    </div>
  );
}

function GroupRow({
  group,
  selected,
  favorite,
  onSelect,
  onToggleFavorite
}) {
  const secondary =
    getGroupSecondaryText(
      group
    );

  return (
    <div
      className={`flex items-center gap-2 rounded-2xl bg-[var(--surface-glass)] p-3 ${
        selected
          ? 'ring-1 ring-[#2997ff]/40'
          : ''
      }`}
    >
      <button
        type="button"
        onClick={() =>
          onSelect(group)
        }
        className="min-w-0 flex-1 text-left"
      >
        <span className="block truncate text-sm font-bold text-[var(--text-primary)]">
          {getGroupLabel(group)}
        </span>

        {secondary && (
          <span className="mt-0.5 block truncate text-[10px] text-[var(--text-secondary)]">
            {secondary}
          </span>
        )}

        {selected && (
          <span className="mt-1 block text-[10px] font-semibold text-[#2997ff]">
            Your group
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() =>
          onToggleFavorite(
            group.name
          )
        }
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--text-secondary)] active:scale-95"
        aria-label={
          favorite
            ? `Remove ${group.name} from favorites`
            : `Add ${group.name} to favorites`
        }
      >
        <span
          className={
            favorite
              ? 'text-[#2997ff]'
              : ''
          }
        >
          ★
        </span>
      </button>

      <Icon
        name="chevronRight"
        className="h-4 w-4 shrink-0 text-[var(--text-secondary)]"
      />
    </div>
  );
}