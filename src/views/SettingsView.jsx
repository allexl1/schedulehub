import React, { useState } from 'react';

export default function SettingsView() {
  const [group, setGroup] = useState('150501');
  const [subgroup, setSubgroup] = useState('1');
  const [reminders, setReminders] = useState(true);

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 16px 0' }}>Settings</h2>

      {/* Student Profile Section */}
      <div className="glass-panel" style={{ padding: '18px', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 14px 0', color: 'var(--accent-blue, #38bdf8)' }}>ACADEMIC PROFILE</h3>
        
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', marginBottom: '6px' }}>Group Number</label>
          <input
            type="text"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '14px'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', marginBottom: '6px' }}>Subgroup</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['1', '2', 'Both'].map(sub => (
              <button
                key={sub}
                onClick={() => setSubgroup(sub)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  background: subgroup === sub ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                  border: `1px solid ${subgroup === sub ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                  borderRadius: '10px',
                  color: subgroup === sub ? 'var(--accent-blue, #38bdf8)' : '#fff',
                  fontSize: '13px',
                  fontWeight: 600
                }}
              >
                {sub === 'Both' ? 'Both' : `Sub ${sub}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications Controls */}
      <div className="glass-panel" style={{ padding: '18px', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 14px 0', color: 'var(--accent-blue, #38bdf8)' }}>NOTIFICATIONS</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>Class Reminders</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)' }}>Get Telegram alerts 15m before class</div>
          </div>
          <input
            type="checkbox"
            checked={reminders}
            onChange={(e) => setReminders(e.target.checked)}
            style={{ width: '20px', height: '20px', accentColor: 'var(--accent-blue, #38bdf8)' }}
          />
        </div>
      </div>

      {/* System Health */}
      <div className="glass-panel" style={{ padding: '18px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 10px 0', color: 'var(--accent-blue, #38bdf8)' }}>SYSTEM STATUS</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
          <span>BSUIR API Service</span>
          <span style={{ color: '#34d399', fontWeight: 600 }}>● Operational</span>
        </div>
      </div>
    </div>
  );
}
