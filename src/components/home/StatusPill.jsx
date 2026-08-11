import React from 'react';

export default function StatusPill({ status = 'live', lastUpdated = 'Just now' }) {
  const statusConfig = {
    live: {
      color: 'bg-[#30d158]',
      text: 'Live API',
      border: 'border-[#30d158]/20',
      bg: 'bg-[#30d158]/10',
      textColor: 'text-[#30d158]'
    },
    cached: {
      color: 'bg-[#f59e0b]',
      text: `Cached • ${lastUpdated}`,
      border: 'border-[#f59e0b]/20',
      bg: 'bg-[#f59e0b]/10',
      textColor: 'text-[#f59e0b]'
    },
    offline: {
      color: 'bg-[#ff453a]',
      text: 'Offline',
      border: 'border-[#ff453a]/20',
      bg: 'bg-[#ff453a]/10',
      textColor: 'text-[#ffff3a]'
    }
  };

  const current = statusConfig[status] || statusConfig.live;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${current.border} ${current.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${current.color} animate-pulse`} />
      <span className={`text-[11px] font-semibold tracking-tight ${current.textColor}`}>
        {current.text}
      </span>
    </div>
  );
}
