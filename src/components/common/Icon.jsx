import React from 'react';

const icons = {
  home: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M3 11.5 12 3l9 8.5M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10"
    />
  ),

  schedule: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M8 3v4M16 3v4M4 9h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm3 8h2m2 0h2m-6 4h2m2 0h2"
    />
  ),
  
    lessonLecture: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M4 19V5h16v14M8 9h8M8 13h5M8 17h3"
    />
  ),

  lessonPractice: (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={1.8}
    d="M5 19h14M7 16V8l5-4 5 4v8M9 16v-4h6v4"
  />
),

  lessonLab: (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={1.8}
    d="M9 3h6M10 3v6.5L5 19h14l-5-9.5V3M8 15h8"
  />
),

  lessonConsultation: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3 4h4m-4 4h4m-4 4h2"
    />
  ),

  lessonExam: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="m4 7 8-4 8 4-8 4-8-4Zm3 3v5c0 1.5 2.2 3 5 3s5-1.5 5-3v-5M20 8v7"
    />
  ),

  lessonTest: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="m5 19 3-3m0 0 9-9m-9 9 4 1 5-5-4-4-5 5 1 4Zm8-11 2-2 4 4-2 2"
    />
  ),

  lessonUnknown: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M9.5 9a2.5 2.5 0 1 1 4.7 1.2c-.7 1.1-2.2 1.4-2.2 3.3M12 17.5h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z"
    />
  ),

  list: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M8 5h12M8 12h12M8 19h12M4 5h.01M4 12h.01M4 19h.01"
    />
  ),

  calendar: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M7 3v4M17 3v4M4 9h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm4 8h.01M14 13h.01M10 17h.01M14 17h.01"
    />
  ),

  star: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="m12 3 2.78 5.63 6.22.9-4.5 4.38 1.06 6.19L12 17.18l-5.56 2.92 1.06-6.19L3 9.53l6.22-.9L12 3Z"
    />
  ),

  exams: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 5h4m-4 4h4m-4 4h2"
    />
  ),

  teachers: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7-7.5a4 4 0 0 1 0 7.5m2 10h4v-2a4 4 0 0 0-4-3.87"
    />
  ),

  settings: (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={1.8}
    d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.42 1.42-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20h-2v-.48a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.42-1.42.06-.06A1.7 1.7 0 0 0 9.4 15a1.7 1.7 0 0 0-1.56-1.03H7.35v-2h.49A1.7 1.7 0 0 0 9.4 10.94a1.7 1.7 0 0 0-.34-1.88L9 9l1.42-1.42.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 13.39 6.4V6h2v.4a1.7 1.7 0 0 0 1.03 1.58 1.7 1.7 0 0 0 1.88-.34l.06-.06L19.78 9l-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.96 12h.49v2h-.49A1.7 1.7 0 0 0 19.4 15Z"
  />
),

  search: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="m21 21-4.35-4.35m1.35-5.15a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"
    />
  ),

  clock: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
    />
  ),

  location: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Zm-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
    />
  ),
  
    subgroup: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-6 10a6 6 0 0 1 12 0M17 5a3 3 0 0 1 0 6m2 10a5 5 0 0 0-4-4.85"
    />
  ),

  subgroupSingle: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 21a7 7 0 0 1 14 0"
    />
  ),

  user: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M19 21a7 7 0 0 0-14 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
    />
  ),

  image: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Zm3 11 3-3 2.5 2.5L15 13l3 3M15.5 9.5h.01"
    />
  ),

  chevronRight: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="m9 5 7 7-7 7"
    />
  ),

  chevronLeft: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="m15 5-7 7 7 7"
    />
  ),

  chevronDown: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="m6 9 6 6 6-6"
    />
  )
};

export default function Icon({
  name,
  className = 'w-5 h-5',
  strokeWidth
}) {
  const icon = icons[name];

  if (!icon) {
    return null;
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden="true"
    >
      {icon}
    </svg>
  );
}