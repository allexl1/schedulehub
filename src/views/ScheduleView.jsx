import React, { useState, useEffect } from 'react';
import GlassCard from '../components/common/GlassCard';
import PersonalEventModal from '../components/schedule/PersonalEventModal';

export default function ScheduleView({ todaySchedule = [], loading }) {
  const [selectedDay, setSelectedDay] = useState('Mon');
  const [viewMode, setViewMode] = useState('day'); // 'day' | 'week'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [personalEvents, setPersonalEvents] = useState(() => {
    return JSON.parse(localStorage.getItem('sh_personal_events') || '[]');
  });

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleAddEvent = (newEvent) => {
    const updated = [...personalEvents, newEvent];
    setPersonalEvents(updated);
    localStorage.setItem('sh_personal_events', JSON.stringify(updated));
  };

  // Merge BSUIR timetable schedule with personal events
  const dayPersonalEvents = personalEvents.filter((ev) => ev.day === selectedDay);
  const combinedSchedule = [...todaySchedule, ...dayPersonalEvents];

  return (
    <div className="space-y-4">
      {/* View Header & Mode Toggle */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">Schedule</h2>
          <p className="text-xs text-[var(--text-secondary)]">Week 2 • Academic Timetable</p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-black/10 dark:bg-white/5 rounded-xl border border-[var(--border-glass)]">
          <button
            onClick={() => setViewMode('day')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'day' ? 'bg-[#2997ff] text-white shadow-sm' : 'text-[var(--text-secondary)]'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'week' ? 'bg-[#2997ff] text-white shadow-sm' : 'text-[var(--text-secondary)]'
            }`}
          >
            Week
          </button>
        </div>
      </div>

      {/* Day Selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {days.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              selectedDay === day
                ? 'bg-[#2997ff] text-white shadow-md'
                : 'liquid-glass text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Action Bar */}
      <div className="flex justify-between items-center pt-1">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          {selectedDay} Classes ({combinedSchedule.length})
        </span>
        <button
          onClick={() => setIsModalOpen(true)}
          className="text-xs font-semibold text-[#2997ff] bg-[#2997ff]/10 border border-[#2997ff]/20 px-2.5 py-1 rounded-lg"
        >
          + Add Event
        </button>
      </div>

      {/* Timetable List */}
      {loading ? (
        <GlassCard className="text-center py-8 text-xs text-[var(--text-secondary)]">
          Loading timetable...
        </GlassCard>
      ) : combinedSchedule.length > 0 ? (
        <div className="space-y-2.5">
          {combinedSchedule.map((item, idx) => {
            const isFirst = idx === 0; // Highlight current/next class
            return (
              <GlassCard
                key={idx}
                className={`flex gap-3 items-center ${
                  isFirst ? 'border-l-4 border-l-[#2997ff]' : ''
                }`}
              >
                <div className="text-center pr-3 border-r border-[var(--border-glass)] min-w-[65px]">
                  <span className="block text-xs font-bold text-[#2997ff]">
                    {item.time?.split(' - ')[0] || '09:00'}
                  </span>
                  <span className="block text-[10px] text-[var(--text-secondary)]">
                    {item.time?.split(' - ')[1] || '10:20'}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                      {item.subject}
                    </h4>
                    {item.isPersonal && (
                      <span className="text-[9px] font-bold uppercase bg-[#30d158]/15 text-[#30d158] px-1.5 py-0.5 rounded border border-[#30d158]/30">
                        Personal
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    📍 {item.room} • {item.teacher}
                  </p>
                </div>
              </GlassCard>
            );
          })}
        </div>
      ) : (
        <GlassCard className="text-center py-10 text-xs text-[var(--text-secondary)]">
          No classes or events scheduled for {selectedDay}.
        </GlassCard>
      )}

      {/* Personal Event Modal */}
      <PersonalEventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddEvent={handleAddEvent}
      />
    </div>
  );
}
