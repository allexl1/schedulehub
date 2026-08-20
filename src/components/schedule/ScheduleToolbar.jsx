import React, {
  useState
} from 'react';

import Icon from '../common/Icon';

const ACTIONS = [
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

  const currentAction =
    ACTIONS.find(
      action =>
        action.id ===
        activeAction
    ) || ACTIONS[0];

  return (
    <header className="space-y-4">
      <div className="relative flex h-12 items-center">
        <button
          type="button"
          onClick={
            onOpenGroupSelector
          }
          className="flex min-w-0 items-center gap-1 text-[#007aff] transition-opacity active:opacity-60"
          aria-label="Open group selector"
        >
          <Icon
            name="chevronLeft"
            className="h-7 w-7 shrink-0"
            strokeWidth={2}
          />

          <span className="truncate text-[17px] font-medium">
            All groups
          </span>
        </button>

        <button
          type="button"
          onClick={
            onOpenGroupSelector
          }
          className="absolute left-1/2 max-w-[45%] -translate-x-1/2 truncate text-[26px] font-bold tracking-tight text-[var(--text-primary)] transition-opacity active:opacity-60"
          aria-label={`Select group ${
            group || 'All groups'
          }`}
        >
          {group ||
            'All groups'}
        </button>

        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              setIsDisplayMenuOpen(
                value => !value
              )
            }
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors active:opacity-60 ${
              isDisplayMenuOpen ||
              activeAction !==
                'continuous'
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-primary)]'
            }`}
            aria-label="Schedule display options"
            aria-expanded={
              isDisplayMenuOpen
            }
          >
            <Icon
              name="list"
              className="h-7 w-7"
              strokeWidth={2}
            />
          </button>

          <button
            type="button"
            onClick={
              onOpenGroupBrowser
            }
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#8e8e93] transition-colors active:opacity-60"
            aria-label="Browse groups"
          >
            <Icon
              name="teachers"
              className="h-8 w-8"
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
                : 'text-[#8e8e93]'
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
              className="h-8 w-8"
              strokeWidth={1.7}
            />
          </button>
        </div>

        {isDisplayMenuOpen && (
          <div className="absolute right-0 top-12 z-30 w-44 overflow-hidden rounded-2xl border border-[var(--border-glass)] bg-[var(--surface-glass)] p-1.5 shadow-xl backdrop-blur-xl">
            {ACTIONS.map(
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
                    />

                    <span className="text-sm font-semibold">
                      {
                        action.label
                      }
                    </span>

                    {active && (
                      <span className="ml-auto text-sm">
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

      <div className="sr-only">
        Current schedule mode:{' '}
        {currentAction.label}
      </div>
    </header>
  );
}