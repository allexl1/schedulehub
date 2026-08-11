import React from 'react';
import GlassCard from '../components/common/GlassCard';
import Icon from '../components/common/Icon';

const UPCOMING_EXAMS = [
  {
    id: 1,
    subject: 'Object-Oriented Programming',
    type: 'Exam',
    date: 'Jan 18, 2027',
    time: '09:00 AM',
    room: '201-4',
    teacher: 'A. A. Ivanov',
    daysLeft: 14
  },
  {
    id: 2,
    subject: 'Higher Mathematics',
    type: 'Exam',
    date: 'Jan 22, 2027',
    time: '11:30 AM',
    room: '408-2',
    teacher: 'E. V. Petrov',
    daysLeft: 18
  },
  {
    id: 3,
    subject: 'Computer Networks',
    type: 'Credit (Зачет)',
    date: 'Jan 25, 2027',
    time: '02:00 PM',
    room: '105-1',
    teacher: 'S. I. Sidorov',
    daysLeft: 21
  }
];

export default function ExamsView() {
  const nextExam = UPCOMING_EXAMS[0];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)] mb-1">
          Exams & Sessions
        </h2>
        <p className="text-xs text-[var(--text-secondary)]">Winter Exam Session 2026/2027</p>
      </div>

      {/* Hero Countdown Card */}
      {nextExam && (
        <div className="relative rounded-2xl p-5 bg-gradient-to-br from-[#1c1c1e] to-[#0a0a0c] border border-white/10 shadow-2xl overflow-hidden">
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#ff9500]/20 rounded-full blur-2xl pointer-events-none" />

          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#ff9500] bg-[#ff9500]/10 px-2.5 py-0.5 rounded-full border border-[#ff9500]/20">
              Next Exam
            </span>
            <span className="text-xs font-semibold text-[#86868b]">{nextExam.date}</span>
          </div>

          <h3 className="text-lg font-bold text-[#f5f5f7] mb-1">{nextExam.subject}</h3>
          <p className="text-xs text-[#86868b] mb-4">📍 Room {nextExam.room} • {nextExam.teacher}</p>

          <div className="flex items-center gap-3 pt-3 border-t border-white/10">
            <div className="text-3xl font-extrabold text-[#ff9500]">{nextExam.daysLeft}</div>
            <div className="text-xs text-[#86868b] font-medium leading-tight">
              Days Remaining<br />
              <span className="text-[10px] text-[#f5f5f7]">Starts at {nextExam.time}</span>
            </div>
          </div>
        </div>
      )}

      {/* All Session Exams */}
      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] pt-1">
        All Scheduled Assessments ({UPCOMING_EXAMS.length})
      </h3>

      <div className="space-y-2.5">
        {UPCOMING_EXAMS.map((exam) => (
          <GlassCard key={exam.id} className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">{exam.subject}</h4>
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/10 text-[var(--text-secondary)]">
                  {exam.type}
                </span>
              </div>
              <div className="text-xs text-[var(--text-secondary)]">
                📍 Room {exam.room} • {exam.date}
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-[#2997ff]">{exam.daysLeft}d left</span>
              <span className="block text-[10px] text-[var(--text-secondary)]">{exam.time}</span>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
