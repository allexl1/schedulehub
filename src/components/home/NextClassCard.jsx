import React from 'react';
import GlassCard from '../common/GlassCard';
import Icon from '../common/Icon';

export default function NextClassCard({ nextLesson }) {
  if (!nextLesson) {
    return (
      <GlassCard className="mb-6">
        <div className="flex items-center gap-3 py-2">
          <div className="w-10 h-10 rounded-full bg-[#2997ff]/10 flex items-center justify-center text-[#2997ff]">
            <Icon name="schedule" className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#f5f5f7]">No upcoming classes today</h3>
            <p className="text-xs text-[#86868b]">You're all done for today!</p>
          </div>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="relative mb-6 rounded-2xl p-5 bg-gradient-to-br from-[#1c1c1e] to-[#0a0a0c] border border-white/10 shadow-2xl overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#2997ff]/20 rounded-full blur-2xl pointer-events-none" />

      {/* Top Meta Header */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#2997ff] bg-[#2997ff]/10 px-2.5 py-0.5 rounded-full border border-[#2997ff]/20">
          Starts in ~{nextLesson.startsInMinutes || 15} min
        </span>
        <span className="text-xs font-semibold text-[#86868b] flex items-center gap-1">
          <Icon name="clock" className="w-3.5 h-3.5" />
          {nextLesson.time}
        </span>
      </div>

      {/* Class Title & Type */}
      <h2 className="text-lg font-bold text-[#f5f5f7] tracking-tight mb-1">
        {nextLesson.subject}
      </h2>
      <p className="text-xs text-[#86868b] mb-4 font-medium">
        {nextLesson.type || 'Lecture'}
      </p>

      {/* Room & Teacher Details */}
      <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs text-[#f5f5f7]">
        <div className="flex items-center gap-1.5">
          <Icon name="location" className="w-4 h-4 text-[#2997ff]" />
          <span className="font-semibold">Room {nextLesson.room}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[#86868b]">
          <Icon name="user" className="w-4 h-4" />
          <span>{nextLesson.teacher}</span>
        </div>
      </div>
    </div>
  );
}
