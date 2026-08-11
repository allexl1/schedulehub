import React, { useState } from 'react';

export default function ScheduleView({ nextLesson, todaySchedule, loading }) {
  const [selectedDay, setSelectedDay] = useState('Today');
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Timetable</h2>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Week 3</span>
      </div>

      {/* Day Selector Pills */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '8px',
        marginBottom: '16px',
        scrollbarWidth: 'none'
      }}>
        {days.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            style={{
              background: selectedDay === day ? '#2563eb' : 'rgba(30, 41, 59, 0.6)',
              color: selectedDay === day ? '#ffffff' : '#94a3b8',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '8px 14px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Schedule List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: '13px' }}>
          Loading timetable...
        </div>
      ) : todaySchedule && todaySchedule.length > 0 ? (
        todaySchedule.map((lesson, idx) => (
          <div key={idx} style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(51, 65, 85, 0.5)',
            borderRadius: '14px',
            padding: '14px',
            marginBottom: '10px',
            display: 'flex',
            gap: '12px'
          }}>
            <div style={{
              borderRight: '1px solid rgba(51, 65, 85, 0.5)',
              paddingRight: '12px',
              textAlign: 'center',
              minWidth: '65px'
            }}>
              <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>
                {lesson.time?.split(' - ')[0] || '09:00'}
              </span>
              <span style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>
                {lesson.time?.split(' - ')[1] || '10:20'}
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>
                {lesson.subject}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                <span>📍 Room {lesson.room}</span>
                <span>👨‍🏫 {lesson.teacher}</span>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div style={{
          background: 'rgba(15, 23, 42, 0.4)',
          border: '1px solid rgba(51, 65, 85, 0.3)',
          borderRadius: '14px',
          padding: '24px',
          textAlign: 'center',
          color: '#94a3b8',
          fontSize: '13px'
        }}>
          No classes scheduled for this day.
        </div>
      )}
    </div>
  );
}
