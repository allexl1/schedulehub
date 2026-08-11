import React, { useState, useEffect } from 'react';
import FloatingNav from './components/FloatingNav';
import HomeView from './views/HomeView';
import ScheduleView from './views/ScheduleView';
import TeachersView from './views/TeachersView';
import ExamsView from './views/ExamsView';
import SettingsView from './views/SettingsView';
import { useTelegram } from './hooks/useTelegram';

const FALLBACK_DATA = {
  student: { name: "Alex", group: "150501", subgroup: 1, currentWeek: 3 },
  nextLesson: {
    subject: "Object-Oriented Programming",
    type: "Lecture",
    time: "09:00 - 10:20",
    room: "201-4",
    teacher: "A. A. Ivanov",
    startsInMinutes: 15
  },
  todaySchedule: [
    {
      id: 1,
      subject: "Object-Oriented Programming",
      type: "Lecture",
      time: "09:00 - 10:20",
      room: "201-4",
      teacher: "A. A. Ivanov"
    }
  ]
};

export default function App() {
  const { user, colorScheme, triggerHaptic } = useTelegram();
  const [activeTab, setActiveTab] = useState('home');
  const [group, setGroup] = useState(() => localStorage.getItem('sh_group') || '150501');
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('sh_theme') || 'system');
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [scheduleData, setScheduleData] = useState(FALLBACK_DATA);

  // Apply Theme Mode (System Auto-Detect, Light, or Dark)
  useEffect(() => {
    const root = document.documentElement;
    const activeTheme = themeMode === 'system' ? (colorScheme || 'dark') : themeMode;

    root.classList.remove('light', 'dark');
    root.classList.add(activeTheme);
  }, [themeMode, colorScheme]);

  // Fetch BSUIR Schedule
  useEffect(() => {
    async function fetchSchedule() {
      try {
        setLoading(true);
        const res = await fetch(`/api/bsuir/schedule?group=${group}`);
        
        if (res.status === 503) {
          throw new Error('BSUIR API is temporarily down (503 Service Unavailable).');
        }
        if (!res.ok) {
          throw new Error(`Server returned HTTP status ${res.status}`);
        }
        
        const json = await res.json();
        if (json.success && json.data) {
          setApiError(null);
        } else {
          throw new Error(json.error || 'Failed to parse BSUIR payload');
        }
      } catch (err) {
        setApiError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchSchedule();
  }, [group]);

  const { student, nextLesson, todaySchedule } = scheduleData;
  const displayName = user?.first_name || student.name;

  const handleTabChange = (tab) => {
    triggerHaptic('light');
    setActiveTab(tab);
  };

  return (
    <div style={{ maxWidth: '440px', margin: '0 auto', padding: '20px 16px 110px 16px' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Hello, {displayName} 👋</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary, #86868b)', margin: '4px 0 0 0' }}>
            Group {group} • Week {student.currentWeek}
          </p>
        </div>
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          padding: '4px 8px',
          borderRadius: '20px',
          background: 'rgba(41, 151, 255, 0.15)',
          color: 'var(--accent-blue, #2997ff)',
          border: '1px solid rgba(41, 151, 255, 0.3)'
        }}>
          Subgroup {student.subgroup}
        </span>
      </header>

      {/* Outage Banner */}
      {apiError && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.15)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '14px',
          padding: '10px 14px',
          marginBottom: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '12px',
          color: '#f59e0b'
        }}>
          <span>⚠️</span>
          <div>
            <strong>BSUIR Outage Detected</strong>
            <div style={{ fontSize: '11px', opacity: 0.85 }}>{apiError} Showing cached data.</div>
          </div>
        </div>
      )}

      {/* 5-Tab Content Router */}
      <main>
        {/* TAB 1: HOME DASHBOARD */}
        {activeTab === 'home' && (
          <HomeView
            scheduleData={scheduleData}
            status={apiError ? 'cached' : 'live'}
            lastUpdated="Cached copy"
          />
        )}

        {/* TAB 2: DEDICATED SCHEDULE VIEW */}
        {activeTab === 'schedule' && (
          <ScheduleView
            nextLesson={nextLesson}
            todaySchedule={todaySchedule}
            loading={loading}
          />
        )}

        {/* TAB 3: TEACHERS VIEW */}
        {activeTab === 'teachers' && <TeachersView />}

        {/* TAB 4: EXAMS VIEW */}
        {activeTab === 'exams' && <ExamsView />}

        {/* TAB 5: SETTINGS VIEW */}
        {activeTab === 'settings' && (
          <SettingsView
            group={group}
            setGroup={(newGroup) => {
              setGroup(newGroup);
              localStorage.setItem('sh_group', newGroup);
            }}
            themeMode={themeMode}
            setThemeMode={(newTheme) => {
              setThemeMode(newTheme);
              localStorage.setItem('sh_theme', newTheme);
            }}
          />
        )}
      </main>

      {/* Floating Glass Navigation */}
      <FloatingNav activeTab={activeTab} setActiveTab={handleTabChange} />
    </div>
  );
}
