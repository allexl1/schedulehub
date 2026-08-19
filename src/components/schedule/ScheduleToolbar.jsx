import React from 'react';
import Icon from '../common/Icon';

const ACTIONS = [
  {
    id: 'days',
    label: 'Display',
    icon: 'schedule'
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
  activeAction = 'days',
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
      <div className="grid min-w-0 flex-1 grid-cols-3 gap-2">
        {ACTIONS.map(action => {
          const isActive =
            activeAction === action.id;

          return (
            <button
              key={action.id}
              type="button"
              onClick={() =>
                onAction?.(action.id)
              }
              aria-pressed={isActive}
              className={`flex min-w-0 items-center justify-center gap-2 rounded-2xl px-2.5 py-3 transition-all active:scale-[0.97] ${
                isActive
                  ? 'bg-[#2997ff] text-white shadow-sm'
                  : 'bg-[var(--surface-glass)] text-[var(--text-secondary)]'
              }`}
            >
              <Icon
                name={action.icon}
                className="h-[17px] w-[17px] shrink-0"
              />

              <span className="truncate text-[10px] font-bold">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onToggleFavorite}
        aria-pressed={isFavorite}
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