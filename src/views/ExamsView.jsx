import React from 'react';

const MOCK_EXAMS = [
  { id: '1', subject: 'Higher Mathematics', type: 'Exam', date: 'June 18', time: '10:00', room: '4-301', teacher: 'Prof. A. A. Ivanov', daysLeft: 12 },
  { id: '2', subject: 'Object-Oriented Programming', type: 'Exam', date: 'June 22', time: '09:00', room: '5-204', teacher: 'Dr. V. I. Sidorov', daysLeft: 16 },
  { id: '3', subject: 'Operating Systems', type: 'Credit (Зачет)', date: 'June 26', time: '12:00', room: '4-102', teacher: 'Dr. S. N. Kovalev', daysLeft: 20 }
];

export default function ExamsView() {
  const nextExam = MOCK_EXAMS[0];

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 16px 0' }}>Exams</h2>

      {/* Hero Exam Countdown Card */}
      {nextExam && (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(15, 23, 42, 0.6) 100%)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, background: '#8b5cf6', color: '#fff', padding: '2px 8px', borderRadius: '6px' }}>
              NEXT EXAM
            </span>
            <span style={{ fontSize: '24px', fontWeight: 800, color: '#a78bfa' }}>
              {nextExam.daysLeft} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary, #94a3b8)' }}>DAYS LEFT</span>
            </span>
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px 0' }}>{nextExam.subject}</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary, #94a3b8)', margin: '0 0 14px 0' }}>{nextExam.teacher}</p>
          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#f8fafc' }}>
            <span>📅 {nextExam.date} · {nextExam.time}</span>
            <span>📍 Room {nextExam.room}</span>
          </div>
        </div>
      )}

      {/* Upcoming Exams List */}
      <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>Upcoming Schedule</h3>
      {MOCK_EXAMS.slice(1).map(exam => (
        <div key={exam.id} className="glass-panel" style={{ padding: '16px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>{exam.subject}</span>
            <span style={{ fontSize: '11px', color: '#a78bfa', fontWeight: 600 }}>{exam.date}</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', margin: '0 0 8px 0' }}>{exam.teacher}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary, #94a3b8)' }}>
            <span>⏰ {exam.time}</span>
            <span>📍 Room {exam.room}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
