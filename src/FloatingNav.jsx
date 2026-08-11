import React from 'react';

const TABS = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'schedule', label: 'Schedule', icon: '📅' },
  { id: 'teachers', label: 'Teachers', icon: '👨‍🏫' },
  { id: 'exams', label: 'Exams', icon: '🎓' },
  { id: 'settings', label: 'Settings', icon: '⚙️' }
];

export default function FloatingNav({ activeTab, setActiveTab }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(12px + var(--safe-bottom))',
      left: '16px',
      right: '16px',
      maxWidth: '400px',
      margin: '0 auto',
      zIndex: 1000
    }}>
      <nav style={{
        display: 'flex',
        justify: 'space-around',
        alignItems: 'center',
        padding: '6px 8px',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(25px)',
        WebkitBackdropFilter: 'blur(25px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '28px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05) inset'
      }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justify: 'center',
                flex: 1,
                padding: '8px 0',
                background: 'none',
                border: 'none',
                color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'color 0.2s ease'
              }}
            >
              <span style={{ fontSize: '18px', transform: isActive ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.2s ease' }}>
                {tab.icon}
              </span>
              <span style={{ fontSize: '10px', fontWeight: isActive ? '600' : '400', marginTop: '3px' }}>
                {tab.label}
              </span>
              {isActive && (
                <div style={{
                  position: 'absolute',
                  bottom: '2px',
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  background: 'var(--accent-blue)',
                  boxShadow: '0 0 8px var(--accent-blue)'
                }} />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
