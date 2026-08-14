/**
 * Parse time ranges like:
 * "09:00 - 10:20"
 * "09:00–10:20"
 * "09:00 — 10:20"
 * "09:00"
 */
export function parseTimeRange(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') {
    return {
      startTime: null,
      endTime: null,
      startMinutes: null,
      endMinutes: null
    };
  }

  const matches = timeStr.match(/\d{1,2}:\d{2}/g);

  if (!matches || matches.length === 0) {
    return {
      startTime: null,
      endTime: null,
      startMinutes: null,
      endMinutes: null
    };
  }

  const startTime = matches[0];
  const endTime = matches[1] || null;

  const toMinutes = (value) => {
    if (!value) return null;

    const [hours, minutes] = value.split(':').map(Number);

    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes)
    ) {
      return null;
    }

    return hours * 60 + minutes;
  };

  const startMinutes = toMinutes(startTime);

  const endMinutes =
    endTime !== null
      ? toMinutes(endTime)
      : startMinutes !== null
      ? startMinutes + 80
      : null;

  return {
    startTime,
    endTime,
    startMinutes,
    endMinutes
  };
}

export function parseStartTimeInMinutes(timeStr) {
  return parseTimeRange(timeStr).startMinutes ?? 0;
}

export function calculateMinutesUntil(timeStr, now = new Date()) {
  const { startMinutes } = parseTimeRange(timeStr);

  if (startMinutes === null) {
    return null;
  }

  const currentMinutes =
    now.getHours() * 60 + now.getMinutes();

  return startMinutes - currentMinutes;
}

/**
 * Used by PersonalEventModal.jsx
 */
export function isValidTimeSlot(timeStr) {
  const parsed = parseTimeRange(timeStr);

  return (
    parsed.startMinutes !== null &&
    parsed.endMinutes !== null &&
    parsed.endMinutes > parsed.startMinutes
  );
}

/**
 * Prevent:
 * "Room Room 302"
 * "Ауд. Ауд. 302"
 */
export function formatRoomString(room, prefix = '') {
  if (!room || typeof room !== 'string') {
    return '';
  }

  const trimmed = room.trim();

  if (!prefix) {
    return trimmed;
  }

  const normalizedRoom = trimmed.toLowerCase();
  const normalizedPrefix = prefix.toLowerCase();

  if (normalizedRoom.startsWith(normalizedPrefix)) {
    return trimmed;
  }

  return `${prefix} ${trimmed}`;
}

/**
 * Schedule lifecycle resolver
 */
export function evaluateScheduleLifecycle(
  scheduleList = [],
  fallbackItem = null,
  now = new Date()
) {
  const currentMinutes =
    now.getHours() * 60 + now.getMinutes();

  let currentLesson = null;
  let upcomingLesson = null;

  for (const item of scheduleList) {
    if (!item) continue;

    const {
      startMinutes,
      endMinutes
    } = parseTimeRange(item.time);

    if (startMinutes === null) continue;

    const isCurrent =
      currentMinutes >= startMinutes &&
      (endMinutes === null ||
        currentMinutes < endMinutes);

    const isUpcoming =
      startMinutes > currentMinutes;

    if (isCurrent && !currentLesson) {
      currentLesson = item;
    }

    if (
      isUpcoming &&
      !upcomingLesson
    ) {
      upcomingLesson = item;
    }
  }

  /**
   * Standalone nextLesson fallback
   */
  if (
    !currentLesson &&
    !upcomingLesson &&
    fallbackItem
  ) {
    const {
      startMinutes,
      endMinutes
    } = parseTimeRange(fallbackItem.time);

    if (startMinutes !== null) {
      const isCurrent =
        currentMinutes >= startMinutes &&
        (endMinutes === null ||
          currentMinutes < endMinutes);

      const isUpcoming =
        startMinutes > currentMinutes;

      if (isCurrent) {
        currentLesson = fallbackItem;
      } else if (isUpcoming) {
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

    const { endTime } = parseTimeRange(
      currentLesson.time
    );

    heroEndTime = endTime;
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
