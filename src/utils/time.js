/**
 * Robustly parses time strings such as:
 * "09:00 - 10:20", "09:00–10:20", "09:00 — 10:20", "09:00"
 */
export function parseTimeRange(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') {
    return { startTime: null, endTime: null, startMinutes: null, endMinutes: null };
  }

  const matches = timeStr.match(/(\d{1,2}:\d{2})/g);
  if (!matches || matches.length === 0) {
    return { startTime: null, endTime: null, startMinutes: null, endMinutes: null };
  }

  const startTime = matches[0];
  const endTime = matches.length > 1 ? matches[1] : null;

  const toMinutes = (t) => {
    if (!t) return null;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const startMinutes = toMinutes(startTime);
  const endMinutes = endTime ? toMinutes(endTime) : (startMinutes !== null ? startMinutes + 80 : null);

  return { startTime, endTime, startMinutes, endMinutes };
}

export function parseStartTimeInMinutes(timeStr) {
  return parseTimeRange(timeStr).startMinutes ?? 0;
}

export function calculateMinutesUntil(timeStr, now = new Date()) {
  const { startMinutes } = parseTimeRange(timeStr);
  if (startMinutes === null) return null;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return startMinutes - currentMinutes;
}

/**
 * Formats room string preventing double prefixes (e.g. "Room Room 302")
 */
export function formatRoomString(room, prefix) {
  if (!room || typeof room !== 'string') return '';
  const trimmed = room.trim();
  if (prefix && trimmed.toLowerCase().startsWith(prefix.toLowerCase())) {
    return trimmed;
  }
  return prefix ? `${prefix} ${trimmed}` : trimmed;
}

/**
 * Centralized Schedule State Machine
 * Classifies items into: 'current', 'upcoming', or 'finished'
 * Supports single fallback item evaluation
 */
export function evaluateScheduleLifecycle(scheduleList = [], fallbackItem = null, now = new Date()) {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  let currentLesson = null;
  let upcomingLesson = null;

  // 1. Evaluate schedule array
  for (const item of scheduleList) {
    const { startMinutes, endMinutes } = parseTimeRange(item.time);
    if (startMinutes === null) continue;

    if (nowMinutes >= startMinutes && (endMinutes === null || nowMinutes < endMinutes)) {
      if (!currentLesson) currentLesson = item;
    } else if (startMinutes > nowMinutes) {
      if (!upcomingLesson) upcomingLesson = item;
    }
  }

  // 2. Fallback resolution for standalone nextLesson if list gave no active item
  if (!currentLesson && !upcomingLesson && fallbackItem) {
    const { startMinutes, endMinutes } = parseTimeRange(fallbackItem.time);
    if (startMinutes !== null) {
      if (nowMinutes >= startMinutes && (endMinutes === null || nowMinutes < endMinutes)) {
        currentLesson = fallbackItem;
      } else if (startMinutes > nowMinutes) {
        upcomingLesson = fallbackItem;
      }
    } else {
      upcomingLesson = fallbackItem;
    }
  }

  let heroState = 'finished';
  let effectiveHeroLesson = null;
  let heroEndTime = null;
  let heroMinutesUntil = null;

  if (currentLesson) {
    heroState = 'current';
    effectiveHeroLesson = currentLesson;
    const { endTime } = parseTimeRange(currentLesson.time);
    heroEndTime = endTime;
  } else if (upcomingLesson) {
    heroState = 'upcoming';
    effectiveHeroLesson = upcomingLesson;
    heroMinutesUntil = calculateMinutesUntil(upcomingLesson.time, now);
  }

  return {
    currentLesson,
    upcomingLesson,
    effectiveHeroLesson,
    heroState,
    heroEndTime,
    heroMinutesUntil
  };
}
