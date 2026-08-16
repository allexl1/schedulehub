import React, { useState } from 'react';
import GlassCard from '../components/common/GlassCard';
import Icon from '../components/common/Icon';

export default function OnboardingView({ onComplete }) {
  const [step, setStep] = useState(1);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedSubgroup, setSelectedSubgroup] = useState(1);

  const popularGroups = ['373902', '361401', '473904', '373901', '373905'];

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      onComplete(selectedGroup, selectedSubgroup);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-between py-6">
      {/* Top Header & Step Progress */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-[#2997ff]">
            Step {step} of 3
          </span>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step ? 'w-6 bg-[#2997ff]' : 'w-2 bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>

        {/* STEP 1: Select Group */}
        {step === 1 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Find Your Group
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Enter your BSUIR student group number to load your live schedule timetable.
            </p>

            <GlassCard>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2">
                Group Number
              </label>
              <input
                type="text"
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                placeholder="Enter your group number"
                className="w-full bg-black/10 dark:bg-white/5 border border-[var(--border-glass)] rounded-xl px-4 py-3 text-lg font-bold text-[var(--text-primary)] outline-none focus:border-[#2997ff]"
              />
            </GlassCard>

            <div>
              <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">
                Popular Groups
              </p>
              <div className="flex flex-wrap gap-2">
                {popularGroups.map((g) => (
                  <button
                    key={g}
                    onClick={() => setSelectedGroup(g)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      selectedGroup === g
                        ? 'bg-[#2997ff] text-white border-[#2997ff]'
                        : 'liquid-glass text-[var(--text-secondary)]'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Select Subgroup */}
        {step === 2 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Choose Subgroup
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Select your subgroup to filter out lab classes that belong to other students.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {[1, 2].map((sub) => (
                <GlassCard
                  key={sub}
                  interactive
                  onClick={() => setSelectedSubgroup(sub)}
                  className={`text-center py-6 border-2 ${
                    selectedSubgroup === sub ? 'border-[#2997ff]' : 'border-transparent'
                  }`}
                >
                  <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">
                    Subgroup {sub}
                  </div>
                  <span className="text-xs text-[var(--text-secondary)]">
                    {sub === 1 ? 'First Division' : 'Second Division'}
                  </span>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: Setup Confirmation */}
        {step === 3 && (
          <div className="space-y-4 text-center pt-4">
            <div className="w-16 h-16 rounded-full bg-[#2997ff]/20 text-[#2997ff] flex items-center justify-center mx-auto mb-2">
              <Icon name="schedule" className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              All Set!
            </h1>
            <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto">
              Your group <strong className="text-[var(--text-primary)]">{selectedGroup}</strong> (Subgroup {selectedSubgroup}) has been saved.
            </p>

            <GlassCard className="text-left mt-6">
              <div className="flex justify-between py-1 border-b border-[var(--border-glass)] text-xs">
                <span className="text-[var(--text-secondary)]">Target Group:</span>
                <span className="font-bold text-[var(--text-primary)]">{selectedGroup}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-glass)] text-xs">
                <span className="text-[var(--text-secondary)]">Subgroup:</span>
                <span className="font-bold text-[var(--text-primary)]">Subgroup {selectedSubgroup}</span>
              </div>
              <div className="flex justify-between py-1 text-xs">
                <span className="text-[var(--text-secondary)]">Reminders:</span>
                <span className="font-bold text-[#30d158]">Enabled via Telegram Bot</span>
              </div>
            </GlassCard>
          </div>
        )}
      </div>

      {/* Bottom CTA Button */}
      <button
        onClick={handleNext}
        className="w-full bg-[#2997ff] text-white py-3.5 rounded-2xl font-bold text-sm shadow-lg active:scale-98 transition-transform mt-6"
      >
        {step === 3 ? 'Get Started' : 'Continue'}
      </button>
    </div>
  );
}
