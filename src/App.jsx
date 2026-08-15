import React, { useState, useEffect } from 'react';
import FloatingNav from './components/FloatingNav';
import HomeView from './views/HomeView';
import ScheduleView from './views/ScheduleView';
import TeachersView from './views/TeachersView';
import ExamsView from './views/ExamsView';
import SettingsView from './views/SettingsView';
import OnboardingView from './views/OnboardingView';
import { useTelegram } from './hooks/useTelegram';
import { useOffline } from './hooks/useOffline';
import SubjectDetailsView from './views/SubjectDetailsView';
import { LanguageProvider } from './context/LanguageContext';

const EMPTY_DATA = {
  student: null,
  nextLesson: null,
  todaySchedule: []
};

function AppContent() {
  const { user, colorScheme, triggerHaptic } = useTelegram();
  const isOffline = useOffline();

  const [activeTab, setActiveTab] = useState('home');
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [isOnboarded, setIsOnboarded] = useState(() => localStorage.getItem('sh_onboarded') === 'true');
  const [group, setGroup] = useState(() => localStorage.getItem('sh_group') || '150501');
  const [subgroup, setSubgroup] = useState(() => Number(localStorage.getItem('sh_subgroup')) || 1);
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('sh_theme') || 'system');
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  // Safe Cache Initialization
  const [scheduleData, setScheduleData] = useState(() => {
    try {
      const cached = localStorage.getItem('sh_cached_schedule');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      console.error('Failed to load cached schedule:', e);
    }
    return EMPTY_DATA;
  });

  const [lastUpdated, setLastUpdated] = useState(() => {
    return localStorage.getItem('sh_cache_timestamp') || null;
  });

  // Apply Theme Mode (System Auto-Detect, Light, or Dark)
  useEffect(() => {
    const root = document.documentElement;
    const activeTheme = themeMode === 'system' ? (colorScheme || 'dark') : themeMode;

    root.classList.remove('light', 'dark');
    root.classList.add(activeTheme);
  }, [themeMode, colorScheme]);

  // Fetch BSUIR Schedule Data Safely
  useEffect(() => {
    async function fetchSchedule() {
      if (isOffline) {
        setApiError('Device is offline. Showing cached data.');
        setLoading(false);
        return;
      }

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
          setScheduleData(json.data);
          setApiError(null);
          const now = new Date().toISOString();
          setLastUpdated(now);
          localStorage.setItem('sh_cached_schedule', JSON.stringify(json.data));
          localStorage.setItem('sh_cache_timestamp', now);
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
  }, [group, isOffline]);

  const handleOnboardingComplete = (newGroup, newSubgroup) => {
    triggerHaptic('medium');
    setGroup(newGroup);
    setSubgroup(newSubgroup);
    localStorage.setItem('sh_group', newGroup);
    localStorage.setItem('sh_subgroup', newSubgroup);
    localStorage.setItem('sh_onboarded', 'true');
    setIsOnboarded(true);
  };

  const handleTabChange = (tab) => {
    triggerHaptic('light');
    setActiveTab(tab);
  };

  // Render Guided Onboarding Flow for First-Time Users
  if (!isOnboarded) {
  return (
    <div className="max-w-[440px] mx-auto px-4">
      <OnboardingView onComplete={handleOnboardingComplete} />
    </div>
  );
}

  // Safe Property Extraction 
  const student = scheduleData?.student;
  const nextLesson = scheduleData?.nextLesson;
  const todaySchedule = Array.isArray(scheduleData?.todaySchedule)
  ? scheduleData.todaySchedule
  : [];

const hour = new Date().getHours();

let greeting = 'Hello';

if (hour >= 6 && hour < 12) {
  greeting = 'Доброе утро';
} else if (hour >= 12 && hour < 17) {
  greeting = 'Добрый день';
} else if (hour >= 17 && hour < 22) {
  greeting = 'Добрый вечер';
} else {
  greeting = 'Доброй ночи';
}
  
  const displayName = user?.first_name || student?.name || "Unknown Student";
  const statusState = isOffline ? 'offline' : apiError ? 'cached' : 'live';
const weekNumber = scheduleData?.currentWeek || 1;

const greetingText = `${greeting}, ${displayName}`;

let greetingEmoji = '👋';

if (hour >= 6 && hour < 12) {
  greetingEmoji = '☀️';
} else if (hour >= 12 && hour < 17) {
  greetingEmoji = '🌤️';
} else if (hour >= 17 && hour < 22) {
  greetingEmoji = '🌆';
} else {
  greetingEmoji = '🌙';
}

const titleClass =
  greetingText.length > 30
    ? 'text-xl'
    : greetingText.length > 20
    ? 'text-2xl'
    : 'text-[32px]';

if (selectedLesson) {
  return (
    <div className="max-w-[440px] mx-auto px-4 pt-5 pb-10">
      <SubjectDetailsView
        lesson={selectedLesson}
        onBack={() => setSelectedLesson(null)}
      />
    </div>
  );
}
  
  return (
    <div className="max-w-[440px] mx-auto px-4 pt-5 pb-28">
{/* App Header */}
<header className="mb-6">
  <h1
    className={`${titleClass} font-bold tracking-tight leading-tight text-[var(--text-primary)] break-all`}
  >
    {greeting}, {displayName} {greetingEmoji}
  </h1>

  <p className="mt-2 text-sm font-medium text-[var(--text-secondary)]">
    Группа: {group} • Подгруппа: {subgroup} • Неделя: {weekNumber}
  </p>
</header>

      {/* Outage / Offline Alert Banner */}
      {apiError && (
        <div className="mb-4 rounded-2xl p-3 bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-center gap-3 text-xs text-[#f59e0b]">
          <span>⚠️</span>
          <div>
            <strong className="block font-bold">
              {isOffline ? 'Offline Mode Active' : 'BSUIR Outage Detected'}
            </strong>
            <span className="text-[11px] opacity-80">{apiError}</span>
          </div>
        </div>
      )}

 
<main>
  {activeTab === 'home' && (
    <HomeView
      scheduleData={{ student, nextLesson, todaySchedule }}
      status={statusState}
      lastUpdatedTimestamp={lastUpdated}
    />
  )}

  {activeTab === 'schedule' && (
  <ScheduleView
  scheduleData={scheduleData}
  loading={loading}
/>
  )}

  {activeTab === 'teachers' && <TeachersView />}

  {activeTab === 'exams' && <ExamsView />}

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
export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
