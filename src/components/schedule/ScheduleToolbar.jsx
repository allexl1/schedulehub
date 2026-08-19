import React from 'react';
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
  activeAction = 'continuous',
  onAction,
  isFavorite = false,
  onToggleFavorite
}) {
  return (
    <div
      className="flex items-center gap-2"
      role="toolbar"
      aria-label="Schedule controls"
    >
      <div className="grid min-w-0 flex-1 grid-cols-4 gap-1.5">
        {ACTIONS.map(action => {
          const isActive =
            activeAction ===
            action.id;

          return (
            <button
              key={action.id}
              type="button"
              onClick={() =>
                onAction?.(
                  action.id
                )
              }
              aria-pressed={
                isActive
              }
              className={`flex min-w-0 items-center justify-center gap-1.5 rounded-2xl px-1.5 py-3 transition-all active:scale-[0.97] ${
                isActive
                  ? 'bg-[#2997ff] text-white shadow-sm'
                  : 'bg-[var(--surface-glass)] text-[var(--text-secondary)]'
              }`}
            >
              <Icon
                name={
                  action.icon
                }
                className="h-4 w-4 shrink-0"
              />

              <span className="truncate text-[9px] font-bold">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={
          onToggleFavorite
        }
        aria-pressed={
          isFavorite
        }
        aria-label={
          isFavorite
            ? 'Remove group from favorites'
            : 'Add group to favorites'
        }
        className={`flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-2xl transition-all active:scale-[0.95] ${
          isFavorite
            ? 'bg-[#2997ff] text-white'
            : 'bg-[var(--surface-glass)] text-[var(--text-secondary)]'
        }`}
      >
        <Icon
          name="star"
          className="h-[18px] w-[18px]"
        />
      </button>
    </div>
  );
}