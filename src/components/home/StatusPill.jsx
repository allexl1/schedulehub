import React from 'react';

export default function StatusPill({ status = 'live', lastUpdated }) {
  const statusConfig = {
    live: {
      label: 'Live',
      dotColor: 'bg-[#30d158]',
      textColor: 'text-[#30d158]'
    },
    cached: {
      label: lastUpdated || 'Cached',
      dotColor: 'bg-[#f59e0b]',
      textColor: 'text-[#f59e0b]'
    },
    offline: {
      label: 'Offline',
      dotColor: 'bg-[#ff453a]',
      textColor: 'text-[#ff453a]'
    }
  };

  const current = statusConfig[status] || statusConfig.live;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span className={`w-1.5 h-1.5 rounded-full ${current.dotColor}`} />
      <span className={current.textColor}>{current.label}</span>
    </span>
  );
}
