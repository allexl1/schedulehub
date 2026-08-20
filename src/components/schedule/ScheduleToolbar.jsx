import React, {
  useState
} from 'react';

import Icon from '../common/Icon';

const DISPLAY_ACTIONS = [
  {
    id: 'continuous',
    label: 'Display',
    icon: 'schedule'
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
  isFavorite = false,
  onToggleFavorite
}) {
  const [
    isDisplayMenuOpen,
    setIsDisplayMenuOpen
  ] = useState(false);

  const handleAction = action => {
    setIsDisplayMenuOpen(false);
    onAction?.(action);
  };

  return (
    <header className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[34px] font-bold leading-none tracking-[-0.03em] text-[var(--text-primary)]">
          Schedule
        </h1>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={
              onOpenGroupBrowser
            }
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-primary)] transition-opacity active:opacity-60"
            aria-label="Browse groups"
          >
            <Icon
              name="teachers"
              className="h-7 w-7"
              strokeWidth={1.8}
            />
          </button>

          <button
            type="button"
            onClick={
              onToggleFavorite
            }
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-all active:scale-95 ${
              isFavorite
                ? 'text-[#ffcc00]'
                : 'text-[var(--text-primary)]'
            }`}
            aria-label={
              isFavorite
                ? 'Remove group from favorites'
                : 'Add group to favorites'
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
        </div>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={
            onOpenGroupSelector
          }
          className="flex max-w-full items-center gap-1.5 text-left transition-opacity active:opacity-60"
          aria-label={`Select group ${
            group || 'All groups'
          }`}
        >
          <span className="truncate text-[22px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
            {group ||
              'All groups'}
          </span>

          <Icon
            name="chevronDown"
            className="h-5 w-5 shrink-0 text-[var(--text-secondary)]"
            strokeWidth={2}
          />
        </button>
      </div>

      <div className="relative flex items-center">
        <button
          type="button"
          onClick={() =>
            setIsDisplayMenuOpen(
              value => !value
            )
          }
          className={`flex h-10 items-center gap-2 rounded-full px-3.5 transition-colors active:opacity-60 ${
            isDisplayMenuOpen ||
            activeAction !==
              'continuous'
              ? 'bg-[var(--surface-secondary)] text-[var(--text-primary)]'
              : 'text-[var(--text-primary)]'
          }`}
          aria-label="Schedule display options"
          aria-expanded={
            isDisplayMenuOpen
          }
        >
          <Icon
            name="list"
            className="h-5 w-5"
            strokeWidth={2}
          />

          <span className="text-[15px] font-semibold">
            Display
          </span>

          <Icon
            name="chevronDown"
            className="h-4 w-4"
            strokeWidth={2}
          />
        </button>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={
              onOpenGroupSelector
            }
            className="flex h-10 items-center gap-1.5 rounded-full px-3 text-[var(--text-primary)] transition-colors active:opacity-60"
            aria-label="Select subgroup"
          >
            <Icon
              name="user"
              className="h-5 w-5"
              strokeWidth={1.9}
            />

            <span className="text-[15px] font-medium">
              Subgroup
            </span>
          </button>
        </div>

        {isDisplayMenuOpen && (
          <div className="absolute left-0 top-12 z-30 w-48 overflow-hidden rounded-2xl border border-[var(--border-glass)] bg-[var(--surface-glass)] p-1.5 shadow-xl backdrop-blur-xl">
            {DISPLAY_ACTIONS.map(
              action => {
                const active =
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
                      active
                        ? 'bg-[#007aff]/10 text-[#007aff]'
                        : 'text-[var(--text-primary)] active:bg-black/5'
                    }`}
                    aria-pressed={
                      active
                    }
                  >
                    <Icon
                      name={
                        action.icon
                      }
                      className="h-5 w-5 shrink-0"
                      strokeWidth={1.9}
                    />

                    <span className="text-sm font-semibold">
                      {
                        action.label
                      }
                    </span>

                    {active && (
                      <span className="ml-auto text-sm font-bold">
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
    </header>
  );
}