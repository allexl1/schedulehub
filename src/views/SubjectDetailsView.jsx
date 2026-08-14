import React from 'react';

export default function SubjectDetailsView({ lesson, onBack }) {
  if (!lesson) return null;

  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="text-[#2997ff] text-sm font-medium"
      >
        ← Назад
      </button>

      <div className="rounded-3xl bg-[var(--surface-glass)] p-5 border border-[var(--border-glass)]">
        <h1 className="text-2xl font-bold">
          {lesson.subject}
        </h1>

        <div className="mt-4 space-y-2 text-sm">
          <p><strong>Тип:</strong> {lesson.type}</p>
          <p><strong>Время:</strong> {lesson.time}</p>
          <p><strong>Аудитория:</strong> {lesson.room}</p>
          <p><strong>Преподаватель:</strong> {lesson.teacher}</p>
        </div>
      </div>
    </div>
  );
}
