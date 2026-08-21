import React, {
  useState
} from 'react';

import Icon from '../common/Icon';

const DISPLAY_ACTIONS = [
  {
    id: 'continuous',
    label: 'Display',
    icon: 'list'
  },
  {
    id: 'compact',
    label: 'By Day',
    icon: 'calendar'
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: 'calendar'
  },
  {
    id: 'exams',
    label: 'Exams',
    icon: 'exams'
  }
];

export default function ScheduleToolbar({
  group,
  activeAction = 'continuous',
  onAction,
  onOpenGroupSelector,
  onOpenGroupBrowser,
  onOpenSubgroupSelector,
  isFavorite = false,
  onSubgroupChange,
  onToggleFavorite
}) {
  const [
    isDisplayMenuOpen,
    setIsDisplayMenuOpen
  ] = useState(false);

  const [
    isFavoriteMenuOpen,
    setIsFavoriteMenuOpen
  ] = useState(false);
  
  const [
  isSubgroupMenuOpen,
  setIsSubgroupMenuOpen
] = useState(false);

  const handleDisplayMenu = () => {
    setIsFavoriteMenuOpen(false);

    setIsDisplayMenuOpen(
      current => !current
    );
  };

  const handleFavoriteMenu = () => {
    setIsDisplayMenuOpen(false);

    setIsFavoriteMenuOpen(
      current => !current
    );
  };

  const handleAction = action => {
    setIsDisplayMenuOpen(false);
    onAction?.(action);
  };

  const handleFavorite = () => {
    setIsFavoriteMenuOpen(false);
    onToggleFavorite?.();
  };

  return (
    <header>
  

      <div className="relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
        <button
          type="button"
          onClick={
            onOpenGroupBrowser
          }
          className="flex items-center gap-1 text-[#007aff] transition-opacity active:opacity-60"
          aria-label="Browse groups"
        >
          <Icon
            name="chevronLeft"
            className="h-6 w-6"
            strokeWidth={2}
          />

          <span className="text-[17px] font-medium">
            All groups
          </span>
        </button>

        <div className="flex min-w-0 justify-center">
          <button
            type="button"
            onClick={
              onOpenGroupSelector
            }
            className="flex max-w-full items-center gap-1 text-[20px] font-bold tracking-tight text-[var(--text-primary)] transition-opacity active:opacity-60"
            aria-label={`Select group ${
              group || 'All groups'
            }`}
          >
            <span className="truncate">
              {group ||
                'All groups'}
            </span>

            <Icon
              name="chevronDown"
              className="h-4 w-4 shrink-0 text-[var(--text-secondary)]"
              strokeWidth={2}
            />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <div className="relative">
            <button
              type="button"
              onClick={
                handleDisplayMenu
              }
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-primary)] transition-opacity active:opacity-60"
              aria-label="Change schedule display"
              aria-expanded={
                isDisplayMenuOpen
              }
            >
              <Icon
                name="list"
                className="h-6 w-6"
                strokeWidth={1.9}
              />
            </button>

            {isDisplayMenuOpen && (
              <div className="absolute right-0 top-11 z-30 w-48 overflow-hidden rounded-2xl border border-[var(--border-glass)] bg-[var(--surface-glass)] p-1.5 shadow-xl backdrop-blur-xl">
                {DISPLAY_ACTIONS.map(
                  action => {
                    const isActive =
                      action.id ===
                      activeAction;

                    return (
                      <button
                        key={
                          action.id
                        }
                        type="button"
                        onClick={() =>
                          handleAction(
                            action.id
                          )
                        }
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                          isActive
                            ? 'bg-[#007aff]/10 text-[#007aff]'
                            : 'text-[var(--text-primary)] active:bg-black/5'
                        }`}
                        aria-pressed={
                          isActive
                        }
                      >
                        <Icon
                          name={
                            action.icon
                          }
                          className="h-5 w-5 shrink-0"
                          strokeWidth={1.9}
                        />

                        <span className="text-sm font-medium">
                          {
                            action.label
                          }
                        </span>

                        {isActive && (
                          <span className="ml-auto text-sm font-semibold">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  }
                )}
              </div>
            )}
          </div>

<div className="relative">
  <button
    type="button"
    onClick={() => {
      setIsDisplayMenuOpen(false);
      setIsFavoriteMenuOpen(false);
      setIsSubgroupMenuOpen(
        current => !current
      );
    }}
    className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-primary)] transition-opacity active:opacity-60"
    aria-label="Select subgroup"
    aria-expanded={
      isSubgroupMenuOpen
    }
  >
    <Icon
      name="user"
      className="h-6 w-6"
      strokeWidth={1.9}
    />
  </button>

  {isSubgroupMenuOpen && (
    <div className="absolute right-0 top-11 z-30 w-48 overflow-hidden rounded-2xl border border-[var(--border-glass)] bg-[var(--surface-glass)] p-1.5 shadow-xl backdrop-blur-xl">
      {[
        {
          value: 'all',
          label: 'All subgroups'
        },
        {
          value: '1',
          label: 'Subgroup 1'
        },
        {
          value: '2',
          label: 'Subgroup 2'
        }
      ].map(option => {
        const active =
          String(
            subgroup
          ) === option.value;

        return (
          <button
            key={
              option.value
            }
            type="button"
            onClick={() => {
              setIsSubgroupMenuOpen(
                false
              );

              onSubgroupChange?.(
                option.value
              );
            }}
            className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left transition-colors ${
              active
                ? 'bg-[#007aff]/10 text-[#007aff]'
                : 'text-[var(--text-primary)] active:bg-black/5'
            }`}
          >
            <span className="text-sm font-medium">
              {option.label}
            </span>

            {active && (
              <span className="ml-auto text-sm font-semibold">
                ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  )}
</div>

          <div className="relative">
            <button
              type="button"
              onClick={
                handleFavoriteMenu
              }
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-opacity active:opacity-60 ${
                isFavorite
                  ? 'text-[#ffcc00]'
                  : 'text-[var(--text-primary)]'
              }`}
              aria-label={
                isFavorite
                  ? 'Favorite group'
                  : 'Add group to favorites'
              }
              aria-expanded={
                isFavoriteMenuOpen
              }
              aria-pressed={
                isFavorite
              }
            >
              <Icon
                name="star"
                className="h-7 w-7"
                strokeWidth={1.8}
              />
            </button>

            {isFavoriteMenuOpen && (
              <div className="absolute right-0 top-11 z-30 w-52 overflow-hidden rounded-2xl border border-[var(--border-glass)] bg-[var(--surface-glass)] p-1.5 shadow-xl backdrop-blur-xl">
                <button
                  type="button"
                  onClick={
                    handleFavorite
                  }
                  disabled={!group}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[var(--text-primary)] transition-colors disabled:cursor-not-allowed disabled:opacity-40 active:bg-black/5"
                >
                  <Icon
                    name="star"
                    className="h-5 w-5 shrink-0"
                    strokeWidth={1.9}
                  />

                  <span className="text-sm font-medium">
                    {isFavorite
                      ? 'Remove from Favorites'
                      : 'Add to Favorites'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}