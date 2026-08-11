import React, { useState } from 'react';

export default function SettingsView({ group, setGroup }) {
  const [inputVal, setInputVal] = useState(group || '150501');
  const [savedMsg, setSavedMsg] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    const cleanGroup = inputVal.trim();
    setGroup(cleanGroup);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  };

  return (
    <div>
      <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Settings</h2>

      <div style={{
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(51, 65, 85, 0.5)',
        borderRadius: '16px',
        padding: '16px',
        marginBottom: '16px'
      }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
          BSUIR Student Group Number
        </label>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="150501"
            style={{
              flex: 1,
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(51, 65, 85, 0.8)',
              borderRadius: '10px',
              padding: '10px 12px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              outline: 'none'
            }}
          />
          <button
            type="submit"
            style={{
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Save
          </button>
        </form>
        {savedMsg && (
          <div style={{ fontSize: '11px', color: '#10b981', marginTop: '8px', fontWeight: 600 }}>
            ✓ Group updated successfully!
          </div>
        )}
      </div>

      <div style={{
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(51, 65, 85, 0.5)',
        borderRadius: '16px',
        padding: '16px'
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', margin: 0 }}>Class Reminders</h3>
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 12px 0' }}>
          Automated Telegram alerts are sent 15 minutes before your scheduled lectures and labs.
        </p>
        <div style={{
          fontSize: '11px',
          color: '#38bdf8',
          background: 'rgba(56, 189, 248, 0.1)',
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid rgba(56, 189, 248, 0.2)'
        }}>
          Status: Active via Telegram Bot
        </div>
      </div>
    </div>
  );
}
