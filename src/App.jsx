import React, { useState } from 'react';
import FloatingNav from './components/FloatingNav';

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
    <div style={{ maxWidth: '440px', margin: '0 auto', padding: '20px 16px 110px 16px' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Hello, {student.name} 👋</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Group {student.group} · Subgroup {student.subgroup}
          </p>
        </div>
        <span style={{ 
          background: 'rgba(56, 189, 248, 0.12)', 
          color: 'var(--accent-blue)', 
          border: '1px solid rgba(56, 189, 248, 0.3)', 
          padding: '4px 12px', 
          borderRadius: '16px', 
          fontSize: '12px', 
          fontWeight: 600 
        }}>
          Week {student.currentWeek}
        </span>
      </header>

      {/* Main Content Area */}
      {activeTab === 'home' && (
        <main>
          {/* Hero Card */}
          <section className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ background: '#f43f5e', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' }}>
                {nextLesson.type}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--accent-blue)', fontWeight: 600 }}>
                In {nextLesson.startsInMinutes} mins
              </span>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px 0' }}>{nextLesson.subject}</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 14px 0' }}>{nextLesson.teacher}</p>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
              <span>⏰ {nextLesson.time}</span>
              <span>📍 Room {nextLesson.room}</span>
            </div>
          </section>

          {/* Today's Timeline */}
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
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {lesson.time} · Room {lesson.room}
                </div>
              </div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent-blue)' }}>{lesson.type}</span>
            </div>
          ))}
        </main>
      )}

      {/* Tab Placeholders */}
      {activeTab !== 'home' && (
        <div className="glass-panel" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <h2 style={{ color: 'var(--text-primary)', textTransform: 'capitalize', margin: '0 0 8px 0' }}>{activeTab} View</h2>
          <p style={{ margin: 0, fontSize: '14px' }}>Phase 4 Mock UI coming up next.</p>
        </div>
      )}

      {/* Liquid Glass Bottom Floating Navigation */}
      <FloatingNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
