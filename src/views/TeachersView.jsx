import React, { useState } from 'react';

const MOCK_TEACHERS = [
  { id: '1', name: 'Abramov I. I.', department: 'Higher Mathematics', title: 'Professor', room: '4-301' },
  { id: '2', name: 'Avakov S. M.', department: 'Physics & Electronics', title: 'Docent', room: '2-110' },
  { id: '3', name: 'Sidorov V. I.', department: 'Software Engineering', title: 'Senior Lecturer', room: '5-204' },
  { id: '4', name: 'Kovalev S. N.', department: 'Computer Systems', title: 'Associate Professor', room: '4-102' }
];

export default function TeachersView() {
  const [search, setSearch] = useState('');

  const filtered = MOCK_TEACHERS.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.department.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 16px 0' }}>Teachers</h2>
      
      {/* Search Input */}
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="🔍 Search teacher or department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            color: '#fff',
            fontSize: '14px',
            outline: 'none'
          }}
        />
      </div>

      {/* Teachers Directory */}
      {filtered.map(teacher => (
        <div key={teacher.id} className="glass-panel" style={{ padding: '16px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 4px 0' }}>{teacher.name}</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', margin: '0 0 8px 0' }}>{teacher.department} · {teacher.title}</p>
            </div>
            <span style={{ fontSize: '11px', background: 'rgba(56, 189, 248, 0.12)', color: 'var(--accent-blue, #38bdf8)', padding: '4px 8px', borderRadius: '8px' }}>
              📍 {teacher.room}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
