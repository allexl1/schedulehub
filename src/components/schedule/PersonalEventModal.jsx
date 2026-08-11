import React, { useState } from 'react';

export default function PersonalEventModal({ isOpen, onClose, onAddEvent }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Study');
  const [time, setTime] = useState('16:00 - 17:30');
  const [day, setDay] = useState('Mon');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddEvent({
      id: Date.now(),
      subject: title.trim(),
      type: type,
      time: time,
      room: 'Personal',
      teacher: type,
      isPersonal: true,
      day: day
    });

    setTitle('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="w-full max-w-sm bg-[var(--surface-glass)] rounded-2xl p-5 border border-[var(--border-glass)] shadow-xl">
        <div className="flex justify-between items-center pb-3 mb-4 border-b border-[var(--border-glass)]">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Add Personal Event</h3>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
              Title
            </label>
            <input
              type="text"
              placeholder="e.g. Gym Session, Exam Prep"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-black/10 dark:bg-white/5 border border-[var(--border-glass)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[#2997ff]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-black/10 dark:bg-white/5 border border-[var(--border-glass)] rounded-xl px-2 py-2 text-xs text-[var(--text-primary)] outline-none"
              >
                <option value="Study">Study</option>
                <option value="Gym">Gym</option>
                <option value="Assignment">Assignment</option>
                <option value="Personal">Personal</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                Day
              </label>
              <select
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="w-full bg-black/10 dark:bg-white/5 border border-[var(--border-glass)] rounded-xl px-2 py-2 text-xs text-[var(--text-primary)] outline-none"
              >
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
              Time Slot
            </label>
            <input
              type="text"
              placeholder="16:00 - 17:30"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-black/10 dark:bg-white/5 border border-[var(--border-glass)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[#2997ff]"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] bg-black/10 dark:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#2997ff] text-white"
            >
              Save Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
