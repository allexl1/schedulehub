import React from 'react';
import Icon from '../common/Icon';

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

export default function GroupSelectorSheet({
  currentGroup,
  onSelectGroup,
  onOpenBrowser,
  onClose
}) {
  const favorites =
    readFavorites().filter(
      group => group !== currentGroup
    );

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close group selector"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
      />

      <div className="absolute bottom-0 left-0 right-0 mx-auto max-w-[440px] rounded-t-3xl bg-[var(--background)] px-4 pb-8 pt-4 shadow-2xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--border-glass)]" />

        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-[var(--text-primary)]">
              Your groups
            </h2>

            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              Quickly switch timetable
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-glass)] text-[var(--text-secondary)] active:scale-95"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() =>
              onSelectGroup(
                currentGroup
              )
            }
            className="flex w-full items-center gap-3 rounded-2xl bg-[var(--surface-glass)] p-3 text-left ring-1 ring-[#2997ff]/30"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2997ff]/10 text-[#2997ff]">
              <Icon
                name="user"
                className="h-5 w-5"
              />
            </div>

            <div className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-[var(--text-primary)]">
                {currentGroup}
              </span>

              <span className="mt-0.5 block text-[10px] font-semibold text-[#2997ff]">
                Your group
              </span>
            </div>

            <span className="text-[#2997ff]">
              ✓
            </span>
          </button>

          {favorites.length > 0 && (
            <div className="pt-2">
              <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Favorites
              </p>

              {favorites.map(group => (
                <button
                  key={group}
                  type="button"
                  onClick={() =>
                    onSelectGroup(
                      group
                    )
                  }
                  className="mb-2 flex w-full items-center gap-3 rounded-2xl bg-[var(--surface-glass)] p-3 text-left active:scale-[0.99]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-glass)] text-[#2997ff]">
                    ★
                  </div>

                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-[var(--text-primary)]">
                    {group}
                  </span>

                  <Icon
                    name="chevronRight"
                    className="h-4 w-4 shrink-0 text-[var(--text-secondary)]"
                  />
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={onOpenBrowser}
            className="flex w-full items-center gap-3 rounded-2xl border border-[var(--border-glass)] bg-[var(--surface-glass)] p-3 text-left active:scale-[0.99]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2997ff]/10 text-[#2997ff]">
              <Icon
                name="search"
                className="h-5 w-5"
              />
            </div>

            <div className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-[var(--text-primary)]">
                Browse all groups
              </span>

              <span className="mt-0.5 block text-[10px] text-[var(--text-secondary)]">
                Search real BSUIR groups
              </span>
            </div>

            <Icon
              name="chevronRight"
              className="h-4 w-4 shrink-0 text-[var(--text-secondary)]"
            />
          </button>
        </div>
      </div>
    </div>
  );
}