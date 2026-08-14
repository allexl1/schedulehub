/**
 * Parse a time string.
 * Supports:
 * "09:00 - 10:20"
 * "09:00–10:20"
 * "09:00 — 10:20"
 * "09:00"
 * "09:00 (lab)"
 */

export function parseTimeRange(timeStr) {
  const emptyResult = {
    startTime: null,
    endTime: null,
    startMinutes: null,
    endMinutes: null
  };

  if (typeof timeStr !== 'string' || !timeStr.trim()) {
    return emptyResult;
  }

  const matches = timeStr.match(/\d{1,2}:\d{2}/g);

  if (!matches || matches.length === 0) {
    return emptyResult;
  }

  const startTime = matches[0];
  const endTime = matches.length > 1 ? matches[1] : null;

  function toMinutes(time) {
    if (!time) return null;

    const parts = time.split(':');

    if (parts.length !== 2) return null;

    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return null;
    }

    return hours * 60 + minutes;
  }

  const startMinutes = toMinutes(startTime);

  let endMinutes = null;

  if (endTime) {
    endMinutes = toMinutes(endTime);
  } else if (startMinutes !== null) {
    // default lesson duration
    endMinutes = startMinutes + 80;
  }

  return {
    startTime,
    endTime,
    startMinutes,
    endMinutes
  };
}

export function parseStartTimeInMinutes(timeStr) {
  const parsed = parseTimeRange(timeStr);

  return parsed.startMinutes !== null
    ? parsed.startMinutes
    : 0;
}

export function calculateMinutesUntil(timeStr, now = new Date()) {
  const parsed = parseTimeRange(timeStr);

  if (parsed.startMinutes === null) {
    return null;
  }

  const currentMinutes =
    now.getHours() * 60 +
    now.getMinutes();

  return parsed.startMinutes - currentMinutes;
}

export function formatRoomString(room, prefix) {
  if (!room) return '';

  const roomText = String(room).trim();

  if (!roomText) return '';

  if (
    prefix &&
    roomText.toLowerCase().startsWith(prefix.toLowerCase())
  ) {
    return roomText;
  }

  return prefix
    ? `${prefix} ${roomText}`
    : roomText;
}

/**
 * Central lifecycle evaluator.
 */
export function evaluateScheduleLifecycle(
  scheduleList = [],
  fallbackItem = null,
  now = new Date()
) {
  const currentMinutes =
    now.getHours() * 60 +
    now.getMinutes();

  let currentLesson = null;
  let upcomingLesson = null;
  let nearestUpcomingStart = Infinity;

  const safeSchedule = Array.isArray(scheduleList)
    ? scheduleList
    : [];

  for (const item of safeSchedule) {
    if (!item) continue;

    const parsed = parseTimeRange(item.time);

    if (parsed.startMinutes === null) {
      continue;
    }

    const isCurrent =
      currentMinutes >= parsed.startMinutes &&
      (
        parsed.endMinutes === null ||
        currentMinutes < parsed.endMinutes
      );

    if (isCurrent) {
      currentLesson = item;
      break;
    }

    if (
      parsed.startMinutes > currentMinutes &&
      parsed.startMinutes < nearestUpcomingStart
    ) {
      nearestUpcomingStart = parsed.startMinutes;
      upcomingLesson = item;
    }
  }

  if (!currentLesson && !upcomingLesson && fallbackItem) {
    const parsed = parseTimeRange(fallbackItem.time);

    if (parsed.startMinutes !== null) {
      const isCurrent =
        currentMinutes >= parsed.startMinutes &&
        (
          parsed.endMinutes === null ||
          currentMinutes < parsed.endMinutes
        );

      if (isCurrent) {
        currentLesson = fallbackItem;
      } else if (parsed.startMinutes > currentMinutes) {
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

    const parsed = parseTimeRange(currentLesson.time);
    heroEndTime = parsed.endTime;
  } else if (upcomingLesson) {
    heroState = 'upcoming';
    effectiveHeroLesson = upcomingLesson;
    heroMinutesUntil = calculateMinutesUntil(
      upcomingLesson.time,
      now
    );
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
