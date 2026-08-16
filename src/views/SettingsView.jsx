import React, { useState } from 'react';
import GlassCard from '../components/common/GlassCard';
import { useLanguage } from '../context/LanguageContext';

export default function SettingsView({
  group,
  setGroup,
  themeMode = 'system',
  setThemeMode,
  onClearCache
}) {
  const [inputVal, setInputVal] = useState(group || '');
  const [savedMsg, setSavedMsg] = useState(false);
  const [cacheClearedMsg, setCacheClearedMsg] = useState(false);

const { language, setLanguage, t } = useLanguage();
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    const cleanGroup = inputVal.trim();
    setGroup(cleanGroup);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  };

  const themes = [
    { id: 'system', label: 'System' },
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">Settings</h2>

<GlassCard>
  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2.5">
    {t('settings.language')}
  </label>

  <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/10 dark:bg-white/5 rounded-xl border border-[var(--border-glass)]">
    <button
      type="button"
      onClick={() => setLanguage('ru')}
      className={`py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
        language === 'ru'
          ? 'bg-[#2997ff] text-white shadow-md'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
      }`}
    >
      Русский
    </button>

    <button
      type="button"
      onClick={() => setLanguage('en')}
      className={`py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
        language === 'en'
          ? 'bg-[#2997ff] text-white shadow-md'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
      }`}
    >
      English
    </button>
  </div>
</GlassCard>
      
      {/* Appearance / Theme Selector */}
      <GlassCard>
        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2.5">
          Appearance Mode
        </label>
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/10 dark:bg-white/5 rounded-xl border border-[var(--border-glass)]">
          {themes.map((t) => {
            const isActive = themeMode === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setThemeMode && setThemeMode(t.id)}
                className={`py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-[#2997ff] text-white shadow-md'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </GlassCard>

      {/* Student Group Input */}
      <GlassCard>
        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2">
          BSUIR Student Group Number
        </label>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Enter your group number"
            className="flex-1 bg-black/10 dark:bg-white/5 border border-[var(--border-glass)] rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[#2997ff]"
          />
          <button
            type="submit"
            className="bg-[#2997ff] text-white font-semibold text-xs px-4 py-2 rounded-xl active:scale-95 transition-transform"
          >
            Save
          </button>
        </form>
        {savedMsg && (
          <p className="text-[11px] text-[#30d158] mt-2 font-semibold">
            ✓ Group updated successfully!
          </p>
        )}
      </GlassCard>
      
      <GlassCard>
  <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">
    Cached Timetable
  </h3>

  <p className="text-xs text-[var(--text-secondary)] mb-3">
    Clear the timetable saved on this device. Your group and settings will not be changed.
  </p>

  <button
    type="button"
    onClick={() => {
      onClearCache?.();
      setCacheClearedMsg(true);

      setTimeout(() => {
        setCacheClearedMsg(false);
      }, 2000);
    }}
    className="w-full bg-black/10 dark:bg-white/5 border border-[var(--border-glass)] text-[var(--text-primary)] font-semibold text-xs px-4 py-2.5 rounded-xl active:scale-[0.98] transition-transform"
  >
    Clear Cached Timetable
  </button>

  {cacheClearedMsg && (
    <p className="text-[11px] text-[#30d158] mt-2 font-semibold">
      ✓ Cached timetable cleared.
    </p>
  )}
</GlassCard>

      {/* Reminders Info */}
      <GlassCard>
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">Class Reminders</h3>
        <p className="text-xs text-[var(--text-secondary)] mb-3">
          Automated Telegram alerts are sent 15 minutes before scheduled lectures and labs.
        </p>
        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#2997ff] bg-[#2997ff]/10 px-3 py-1.5 rounded-lg border border-[#2997ff]/20">
          Status: Active via Telegram Bot
        </div>
      </GlassCard>
    </div>
  );
}
