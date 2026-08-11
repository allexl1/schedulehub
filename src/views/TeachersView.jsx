import React, { useState } from 'react';
import GlassCard from '../components/common/GlassCard';
import Icon from '../components/common/Icon';

const MOCK_TEACHERS = [
  {
    id: 1,
    name: 'A. A. Ivanov',
    department: 'Software Engineering',
    email: 'ivanov@bsuir.by',
    room: '201-4',
    todayClasses: ['OOP (Lecture) • 09:00', 'Java Lab • 12:00']
  },
  {
    id: 2,
    name: 'E. V. Petrov',
    department: 'Higher Mathematics',
    email: 'petrov@bsuir.by',
    room: '408-2',
    todayClasses: ['Linear Algebra • 10:35']
  },
  {
    id: 3,
    name: 'S. I. Sidorov',
    department: 'Computer Networks',
    email: 'sidorov@bsuir.by',
    room: '105-1',
    todayClasses: ['Network Protocols • 14:00']
  }
];

export default function TeachersView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  const filteredTeachers = MOCK_TEACHERS.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div>
        <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)] mb-1">
          Teachers Directory
        </h2>
        <p className="text-xs text-[var(--text-secondary)] mb-3">
          Search professors, rooms, and daily schedules
        </p>

        <div className="relative">
          <input
            type="text"
            placeholder="Search by name or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/10 dark:bg-white/5 border border-[var(--border-glass)] rounded-xl pl-9 pr-4 py-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[#2997ff]"
          />
          <div className="absolute left-3 top-2.5 text-[var(--text-secondary)]">
            <Icon name="search" className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Teachers Directory List */}
      <div className="space-y-2.5">
        {filteredTeachers.map((teacher) => (
          <GlassCard
            key={teacher.id}
            interactive
            onClick={() => setSelectedTeacher(selectedTeacher?.id === teacher.id ? null : teacher)}
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">{teacher.name}</h4>
                <p className="text-xs text-[var(--text-secondary)]">{teacher.department}</p>
              </div>
              <span className="text-[11px] font-semibold text-[#2997ff] bg-[#2997ff]/10 px-2 py-0.5 rounded-md border border-[#2997ff]/20">
                Room {teacher.room}
              </span>
            </div>

            {/* Expanded Profile View */}
            {selectedTeacher?.id === teacher.id && (
              <div className="mt-3 pt-3 border-t border-[var(--border-glass)] space-y-2 text-xs">
                <div className="text-[var(--text-secondary)]">
                  ✉️ <span className="text-[var(--text-primary)] font-medium">{teacher.email}</span>
                </div>
                <div>
                  <span className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Today's Classes:
                  </span>
                  <div className="space-y-1">
                    {teacher.todayClasses.map((cls, i) => (
                      <div
                        key={i}
                        className="bg-black/10 dark:bg-white/5 px-2.5 py-1 rounded-lg text-[11px] text-[var(--text-primary)]"
                      >
                        {cls}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </GlassCard>
        ))}

        {filteredTeachers.length === 0 && (
          <GlassCard className="text-center py-8 text-xs text-[var(--text-secondary)]">
            No professors found matching "{searchQuery}".
          </GlassCard>
        )}
      </div>
    </div>
  );
}
