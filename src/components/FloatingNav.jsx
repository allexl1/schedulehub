import React from 'react';

export default function FloatingNav({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'schedule', label: 'Schedule', icon: '📅' },
    { id: 'teachers', label: 'Teachers', icon: '👨‍🏫' },
    { id: 'exams', label: 'Exams', icon: '📝' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <nav style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 32px)',
      maxWidth: '408px',
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '24px',
      padding: '8px 12px',
      display: 'flex',
      justify: 'space-around',
      alignItems: 'center',
      zIndex: 1000,
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
    }}>
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            style={{
              background: 'transparent',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justify: 'center',
              padding: '6px 8px',
              cursor: 'pointer',
              color: isActive ? '#60a5fa' : '#64748b',
              transition: 'all 0.2s ease',
              transform: isActive ? 'scale(1.08)' : 'scale(1)'
            }}
          >
            <span style={{ fontSize: '18px', marginBottom: '2px', lineHeight: 1 }}>{item.icon}</span>
            <span style={{
              fontSize: '10px',
              fontWeight: isActive ? 700 : 500,
              letterSpacing: '0.02em'
            }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
