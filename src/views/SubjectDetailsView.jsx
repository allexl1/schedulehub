import React from 'react';

export default function SubjectDetailsView({ lesson, onBack }) {
  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="text-sm font-medium text-[#2997ff]"
      >
        ← Back
      </button>

      <div className="rounded-3xl bg-[var(--surface-glass)] border border-[var(--border-glass)] p-6">
        <h1 className="text-2xl font-bold">
          {lesson.subject}
        </h1>

        <div className="mt-4 space-y-2 text-sm">
          <p><strong>Type:</strong> {lesson.type}</p>
          <p><strong>Time:</strong> {lesson.time}</p>
          <p><strong>Room:</strong> {lesson.room}</p>
          <p><strong>Teacher:</strong> {lesson.teacher}</p>
        </div>
      </div>
    </div>
  );
}