import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function StatusPill({ status = 'live', lastUpdated }) {
  const { t } = useLanguage();

  const statusConfig = {
    live: {
      label: t.live,
      dotColor: 'bg-[#30d158]'
    },
    cached: {
      label: lastUpdated ? `${t.cached} (${lastUpdated})` : t.cached,
      dotColor: 'bg-[#f59e0b]'
    },
    offline: {
      label: t.offline,
      dotColor: 'bg-[#ff453a]'
    }
  };

  const current = statusConfig[status] || statusConfig.live;

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-secondary)] opacity-80 select-none">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${current.dotColor}`} />
      <span>{current.label}</span>
    </span>
  );
}
