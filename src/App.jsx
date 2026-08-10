import React, { useState } from 'react';

// Temporary Phase 1 Mock Data
const mockData = {
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
  const { student, nextLesson, todaySchedule } = mockData;

  return (
    <div style={{ maxWidth: '440px', margin: '0 auto', padding: '20px 16px 90px 16px', color: '#f8fafc', fontFamily: '-apple-system, sans-serif' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Hello, {student.name} 👋</h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0' }}>Group {student.group} · Subgroup {student.subgroup}</p>
        </div>
        <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '4px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: 600 }}>
          Week {student.currentWeek}
        </span>
      </header>

      {/* Main Content */}
      {activeTab === 'home' && (
        <main>
          {/* Hero Card */}
          <section style={{ background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(15, 23, 42, 0.6) 100%)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '20px', padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ background: '#f43f5e', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' }}>{nextLesson.type}</span>
              <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 600 }}>In {nextLesson.startsInMinutes} mins</span>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px 0' }}>{nextLesson.subject}</h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 14px 0' }}>{nextLesson.teacher}</p>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#f8fafc' }}>
              <span>⏰ {nextLesson.time}</span>
              <span>📍 Room {nextLesson.room}</span>
            </div>
          </section>

          {/* Today List */}
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Today's Schedule</h3>
          {todaySchedule.map(lesson => (
            <div key={lesson.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '12px 14px', borderRadius: '14px', marginBottom: '8px', opacity: lesson.status === 'completed' ? 0.5 : 1 }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>{lesson.subject}</div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>{lesson.time} · Room {lesson.room}</div>
              </div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#38bdf8' }}>{lesson.type}</span>
            </div>
          ))}
        </main>
      )}

      {/* Floating Glass Navigation */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxWidth: '440px', margin: '0 auto', height: '64px', background: 'rgba(11, 15, 25, 0.85)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
        {['home', 'schedule', 'teachers', 'exams', 'settings'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: 'none', border: 'none', color: activeTab === tab ? '#38bdf8' : '#64748b', fontSize: '11px', textTransform: 'capitalize', cursor: 'pointer' }}>
            {tab === 'home' && '🏠'}
            {tab === 'schedule' && '📅'}
            {tab === 'teachers' && '👨‍🏫'}
            {tab === 'exams' && '🎓'}
            {tab === 'settings' && '⚙️'}
            <div style={{ marginTop: '2px' }}>{tab}</div>
          </button>
        ))}
      </nav>
    </div>
  );
}
