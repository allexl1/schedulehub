import React, { useState, useEffect } from 'react';
import { useTelegram } from './hooks/useTelegram';

export default function App() {
  const { user, triggerHaptic, triggerNotification } = useTelegram();
  
  // State management
  const [group, setGroup] = useState(() => localStorage.getItem('sh_group') || '150501');
  const [inputGroup, setInputGroup] = useState(group);
  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' | 'exams' | 'teachers'
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch schedule from Vercel API
  const fetchSchedule = async (targetGroup) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bsuir/schedule?group=${targetGroup}`);
      const json = await res.json();
      if (json.success && json.data) {
        setScheduleData(json.data);
      } else {
        setError(json.error || 'Failed to load schedule');
      }
    } catch (err) {
      setError('Network error connecting to ScheduleHub API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule(group);
  }, [group]);

  const handleGroupSubmit = (e) => {
    e.preventDefault();
    if (!inputGroup.trim()) return;
    triggerHaptic('medium');
    const cleaned = inputGroup.trim();
    setGroup(cleaned);
    localStorage.setItem('sh_group', cleaned);
  };

  const handleTabSwitch = (tab) => {
    triggerHaptic('light');
    setActiveTab(tab);
  };

  const nextLesson = scheduleData?.nextLesson;
  const todayLessons = scheduleData?.todaySchedules || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-20 font-sans">
      {/* Header & User Greeting */}
      <header className="flex justify-between items-center mb-5 pt-2">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-blue-500">
            Schedule<span className="text-slate-100">Hub</span>
          </h1>
          <p className="text-xs text-slate-400">BSUIR Student Assistant</p>
        </div>
        {user ? (
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{user.first_name}</span>
          </div>
        ) : (
          <span className="text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full text-slate-400">
            Web Mode
          </span>
        )}
      </header>

      {/* Group Selector Input */}
      <form onSubmit={handleGroupSubmit} className="mb-5 flex gap-2">
        <input
          type="text"
          value={inputGroup}
          onChange={(e) => setInputGroup(e.target.value)}
          placeholder="Group (e.g. 150501)"
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors active:scale-95"
        >
          Save
        </button>
      </form>

      {/* Next Class Alert Banner */}
      {nextLesson && (
        <div className="mb-5 bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/30 rounded-2xl p-4 shadow-lg backdrop-blur-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-950/80 px-2.5 py-0.5 rounded-md border border-blue-500/30">
              Starts in ~15 mins
            </span>
            <span className="text-xs font-bold text-slate-300">{nextLesson.time}</span>
          </div>
          <h3 className="text-base font-bold text-slate-100">{nextLesson.subject}</h3>
          <div className="flex justify-between items-center mt-2 text-xs text-slate-300">
            <span>📍 Room: <strong className="text-white">{nextLesson.room}</strong></span>
            <span>👨‍🏫 {nextLesson.teacher}</span>
          </div>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl mb-5">
        {['schedule', 'exams', 'teachers'].map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabSwitch(tab)}
            className={`flex-1 py-2 text-xs font-bold capitalize rounded-lg transition-all ${
              activeTab === tab
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs font-medium">Fetching BSUIR schedule...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-4 text-center">
          <p className="text-xs font-medium text-rose-400 mb-2">{error}</p>
          <button
            onClick={() => fetchSchedule(group)}
            className="text-xs bg-rose-900/50 text-rose-200 px-3 py-1.5 rounded-lg border border-rose-700/50"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div>
          {activeTab === 'schedule' && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">
                Today's Classes ({todayLessons.length})
              </h2>

              {todayLessons.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-6 text-center text-slate-400">
                  <p className="text-sm font-medium">🎉 No classes scheduled for today!</p>
                </div>
              ) : (
                todayLessons.map((item, index) => (
                  <div
                    key={index}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex gap-4 items-center"
                  >
                    <div className="text-center border-r border-slate-800 pr-4 min-w-[65px]">
                      <span className="block text-xs font-bold text-blue-400">{item.startLessonTime || '09:00'}</span>
                      <span className="block text-[10px] text-slate-500">{item.endLessonTime || '10:20'}</span>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-100">{item.subject}</span>
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                          {item.lessonTypeAbbrev || 'Lecture'}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>📍 {item.auditories?.[0] || 'N/A'}</span>
                        <span>👨‍🏫 {item.employees?.[0]?.fio || 'Faculty'}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'exams' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-400">
              <p className="text-sm font-medium mb-1">📋 Exam Timetable</p>
              <p className="text-xs text-slate-500">Exams for group {group} will appear here during examination sessions.</p>
            </div>
          )}

          {activeTab === 'teachers' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-400">
              <p className="text-sm font-medium mb-1">🔍 Faculty Lookup</p>
              <p className="text-xs text-slate-500">Search BSUIR professors and view department schedules.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
