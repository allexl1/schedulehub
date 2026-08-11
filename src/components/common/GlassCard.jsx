import React from 'react';

export default function GlassCard({
  children,
  className = '',
  interactive = false,
  onClick
}) {
  const baseClass = interactive ? 'liquid-glass-interactive cursor-pointer' : 'liquid-glass';

  return (
    <div
      onClick={onClick}
      className={`${baseClass} rounded-2xl p-4 ${className}`}
    >
      {children}
    </div>
  );
}
