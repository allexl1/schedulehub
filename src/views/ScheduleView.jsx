import React, { useState } from 'react';

const MOCK_SCHEDULE = {
  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  activeDay: 'Mon',
  week: 3,
  lessons: [
    { id: '1', time: '09:00 - 10:35', subject: 'Higher Mathematics', type: 'Lecture', room: '4-301', teacher: 'Prof. A. A. Ivanov', subgroup: 0 },
    { id: '2', time: '10:50 - 12:25', subject: 'Physics', type: 'Practice', room: '2-110', teacher: 'Assoc. Prof. E. M. Petrov', subgroup: 1 },
    { id: '3', time: '14:00 - 15:35', subject: 'Object-Oriented Programming', type: 'Lab', room: '5-204', teacher: 'Dr. V. I. Sidorov', subgroup: 1 },
    { id: '4', time: '15:50 - 17:25', subject: 'Operating Systems', type: 'Lecture', room: '4-102', teacher: 'Dr. S. N. Kovalev', subgroup: 0 }
  ]
};

export default function ScheduleView() {
  const [selectedDay, setSelectedDay] = useState('Mon');
  const [activeWeek, setActiveWeek] = useState(3);

  return (
    <div>
      {/* Week & Day Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Schedule</h2>
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(255, 255, 255, 0.05)', padding: '4px', borderRadius: '12px' }}>
          {[1, 2, 3, 4].map(w => (
            <button
              key={w}
              onClick={() => setActiveWeek(w)}
              style={{
                background: activeWeek === w ? 'var(--accent-blue, #38bdf8)' : 'transparent',
                color: activeWeek === w ? '#000' : 'var(--text-secondary, #94a3b8)',
                border: 'none',
                borderRadius: '8px',
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              W{w}
            </button>
          ))}
        </div>
      </div>

      {/* Days Horizontal Scroll */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', pb: '4px' }}>
        {MOCK_SCHEDULE.days.map(day => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            style={{
              flex: 1,
              padding: '10px 0',
              background: selectedDay === day ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              border: `1px solid ${selectedDay === day ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
              borderRadius: '14px',
              color: selectedDay === day ? 'var(--accent-blue, #38bdf8)' : 'var(--text-secondary, #94a3b8)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Timetable List */}
      <div>
        {MOCK_SCHEDULE.lessons.map(lesson => (
          <div key={lesson.id} className="glass-panel" style={{ padding: '16px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--accent-blue, #38bdf8)', fontWeight: 600 }}>{lesson.time}</span>
              <span style={{ fontSize: '10px', fontWeight: 700, background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '6px' }}>
                {lesson.type}
              </span>
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 4px 0' }}>{lesson.subject}</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', margin: '0 0 10px 0' }}>{lesson.teacher}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary, #94a3b8)' }}>
              <span>📍 Room {lesson.room}</span>
              <span>{lesson.subgroup ? `Subgroup ${lesson.subgroup}` : 'Entire Group'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
