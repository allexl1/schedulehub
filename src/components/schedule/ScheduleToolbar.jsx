import React from 'react';
import Icon from '../common/Icon';

const ACTIONS = [
  {
    id: 'days',
    label: 'Days',
    icon: 'schedule'
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: 'calendar'
  },
  {
    id: 'favorites',
    label: 'Favorites',
    icon: 'star'
  },
  {
    id: 'exams',
    label: 'Exams',
    icon: 'exams'
  }
];

export default function ScheduleToolbar({
  activeAction = 'days',
  onAction
}) {
  return (
    <div
      className="grid grid-cols-4 gap-2"
      role="toolbar"
      aria-label="Schedule tools"
    >
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
            className={`flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-2.5 transition-all active:scale-95 ${
              isActive
                ? 'bg-[#2997ff]/10 text-[#2997ff]'
                : 'bg-[var(--surface-glass)] text-[var(--text-secondary)]'
            }`}
          >
            <Icon
              name={action.icon}
              className="h-[18px] w-[18px]"
            />

            <span className="truncate text-[10px] font-bold">
              {action.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}