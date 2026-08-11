import React, { useState, useEffect } from 'react';
import FloatingNav from './components/FloatingNav';
import ScheduleView from './views/ScheduleView';
import TeachersView from './views/TeachersView';
import ExamsView from './views/ExamsView';
import SettingsView from './views/SettingsView';

const FALLBACK_DATA = {
  student: { name: "Alex", group: "150501", subgroup: 1, currentWeek: 3 },
  nextLesson: {
    subject: "Object-Oriented Programming",
    type: "Lab",
    time: "14:00 - 15:35",
    room: "5-204",
    teacher: "Dr. V. I. Sidorov",
    startsInMinutes: 25
  },
  todaySchedule: [
    { id: "1", subject: "Higher Mathematics", type: "Lecture", time: "09:00 - 10:35", room: "4-301", teacher: "Prof. A. A. Ivanov", status: "completed" },
    { id: "2", subject: "Physics", type: "Practice", time: "10:50 - 12:25", room: "2-110", teacher: "Assoc. Prof. E. M. Petrov", status: "completed" },
    { id: "3", subject: "Object-Oriented Programming", type: "Lab", time: "14:00 - 15:35", room: "5-204", teacher: "Dr. V. I. Sidorov", status: "next" },
    { id: "4", subject: "Operating Systems", type: "Lecture", time: "15:50 - 17:25", room: "4-102", teacher: "Dr. S. N. Kovalev", status: "upcoming" }
  ]
};

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null); // Tracks 503 or connection errors
  const [scheduleData, setScheduleData] = useState(FALLBACK_DATA);

  useEffect(() => {
    async function fetchSchedule() {
      try {
        setLoading(true);
        const res = await fetch('/api/bsuir/schedule?group=150501');
        
        if (res.status === 503) {
          throw new Error('BSUIR API is temporarily down (503 Service Unavailable).');
        }
        
        if (!res.ok) {
          throw new Error(`Server returned HTTP status ${res.status}`);
        }

        const json = await res.json();
        if (json.success && json.data) {
          // Live API data loaded successfully
          setApiError(null);
        } else {
          throw new Error(json.error || 'Failed to parse BSUIR payload');
        }
      } catch (err) {
        // Fall back to local cache/mock data on error
        setApiError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchSchedule();
  }, []);

  const { student, nextLesson, todaySchedule } = scheduleData;

  return (
    <div style={{ maxWidth: '440px', margin: '0 auto', padding: '20px 16px 110px 16px' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Hello, {student.name} 👋</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary, #94a3b8)', margin: '4px 0 0 0' }}>
            Group {student.group} · Subgroup {student.subgroup}
          </p>
        </div>
        <span style={{ 
          background: 'rgba(56, 189, 248, 0.12)', 
          color: 'var(--accent-blue, #38bdf8)', 
          border: '1px solid rgba(56, 189, 248, 0.3)', 
          padding: '4px 12px', 
          borderRadius: '16px', 
          fontSize: '12px', 
          fontWeight: 600 
        }}>
          Week {student.currentWeek}
        </span>
      </header>

      {/* 503 / Offline Outage Banner */}
      {apiError && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.15)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '14px',
          padding: '10px 14px',
          marginBottom: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '12px',
          color: '#fbbf24'
        }}>
          <span>⚠️</span>
          <div>
            <strong>BSUIR Outage Detected</strong>
            <div style={{ fontSize: '11px', opacity: 0.85 }}>{apiError} Showing cached data.</div>
          </div>
        </div>
      )}

      {/* Main Content Router */}
      <main>
        {activeTab === 'home' && (
          <div>
            <section className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ background: '#f43f5e', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' }}>
                  {nextLesson.type}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--accent-blue, #38bdf8)', fontWeight: 600 }}>
                  In {nextLesson.startsInMinutes} mins
                </span>
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px 0' }}>{nextLesson.subject}</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary, #94a3b8)', margin: '0 0 14px 0' }}>{nextLesson.teacher}</p>
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                <span>⏰ {nextLesson.time}</span>
                <span>📍 Room {nextLesson.room}</span>
              </div>
            </section>

            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Today's Schedule</h3>
            {todaySchedule.map(lesson => (
              <div 
                key={lesson.id} 
                className="glass-panel" 
                style={{ 
                  display: 'flex', 
                  justify: 'space-between', 
                  alignItems: 'center', 
                  padding: '14px 16px', 
                  marginBottom: '10px', 
                  opacity: lesson.status === 'completed' ? 0.4 : 1 
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{lesson.subject}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', marginTop: '2px' }}>
                    {lesson.time} · Room {lesson.room}
                  </div>
                </div>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent-blue, #38bdf8)' }}>{lesson.type}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'schedule' && <ScheduleView />}
        {activeTab === 'teachers' && <TeachersView />}
        {activeTab === 'exams' && <ExamsView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      <FloatingNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

