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
      d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-12v1.2m0 14.6v1.2M4.58 4.58l.85.85m13.14 13.14.85.85M1.5 12h1.2m18.6 0h1.2M4.58 19.42l.85-.85M18.57 5.43l.85-.85M19.07 8.1l.92-.53-1.4-2.43-.92.53a8.5 8.5 0 0 0-2.2-1.27V3.35h-2.8v1.05a8.5 8.5 0 0 0-2.2 1.27l-.92-.53-1.4 2.43.92.53a8.5 8.5 0 0 0 0 2.54l-.92.53 1.4 2.43.92-.53a8.5 8.5 0 0 0 2.2 1.27v1.05h2.8v-1.05a8.5 8.5 0 0 0 2.2-1.27l.92.53 1.4-2.43-.92-.53a8.5 8.5 0 0 0 0-2.54Z"
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

  user: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      d="M19 21a7 7 0 0 0-14 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
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