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

    const [h, m] = value.split(':').map(Number);

    if (Number.isNaN(h) || Number.isNaN(m)) {
      return null;
    }

    return h * 60 + m;
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

/**
 * Legacy helper
 */
export function parseStartTimeInMinutes(timeStr) {
  return parseTimeRange(timeStr).startMinutes ?? 0;
}

/**
 * Minutes until lesson starts
 */
export function calculateMinutesUntil(timeStr, now = new Date()) {
  const { startMinutes } = parseTimeRange(timeStr);

  if (startMinutes === null) return null;

  const currentMinutes =
    now.getHours() * 60 +
    now.getMinutes();

  return startMinutes - currentMinutes;
}

/**
 * Legacy helper used by ScheduleView
 */
export function getMinutesUntilEnd(timeStr, now = new Date()) {
  const { endMinutes } = parseTimeRange(timeStr);

  if (endMinutes === null) return null;

  const currentMinutes =
    now.getHours() * 60 +
    now.getMinutes();

  return endMinutes - currentMinutes;
}

/**
 * Legacy helper used by ScheduleView
 *
 * Returns:
 * 'upcoming'
 * 'current'
 * 'finished'
 */
export function getClassStatus(timeStr, now = new Date()) {
  const {
    startMinutes,
    endMinutes
  } = parseTimeRange(timeStr);

  if (startMinutes === null) {
    return 'upcoming';
  }

  const currentMinutes =
    now.getHours() * 60 +
    now.getMinutes();

  if (
    currentMinutes >= startMinutes &&
    (endMinutes === null ||
      currentMinutes < endMinutes)
  ) {
    return 'current';
  }

  if (currentMinutes < startMinutes) {
    return 'upcoming';
  }

  return 'finished';
}

/**
 * Used by PersonalEventModal
 */
export function isValidTimeSlot(timeStr) {
  const { startMinutes } =
    parseTimeRange(timeStr);

  return startMinutes !== null;
}

/**
 * Prevents:
 * Room Room 302
 * Ауд. Ауд. 302
 */
export function formatRoomString(room, prefix = '') {
  if (!room || typeof room !== 'string') {
    return '';
  }

  const trimmed = room.trim();

  if (
    prefix &&
    trimmed
      .toLowerCase()
      .startsWith(prefix.toLowerCase())
  ) {
    return trimmed;
  }

  return prefix
    ? `${prefix} ${trimmed}`
    : trimmed;
}

/**
 * Main lifecycle engine
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

  for (const item of scheduleList) {
    const {
      startMinutes,
      endMinutes
    } = parseTimeRange(item?.time);

    if (startMinutes === null) continue;

    if (
      currentMinutes >= startMinutes &&
      (endMinutes === null ||
        currentMinutes < endMinutes)
    ) {
      if (!currentLesson) {
        currentLesson = item;
      }
    } else if (
      startMinutes > currentMinutes
    ) {
      if (!upcomingLesson) {
        upcomingLesson = item;
      }
    }
  }

  if (
    !currentLesson &&
    !upcomingLesson &&
    fallbackItem
  ) {
    const {
      startMinutes,
      endMinutes
    } = parseTimeRange(
      fallbackItem.time
    );

    if (startMinutes !== null) {
      if (
        currentMinutes >= startMinutes &&
        (endMinutes === null ||
          currentMinutes < endMinutes)
      ) {
        currentLesson = fallbackItem;
      } else if (
        startMinutes > currentMinutes
      ) {
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
    effectiveHeroLesson =
      currentLesson;

    heroEndTime =
      parseTimeRange(
        currentLesson.time
      ).endTime;
  } else if (upcomingLesson) {
    heroState = 'upcoming';
    effectiveHeroLesson =
      upcomingLesson;

    heroMinutesUntil =
      calculateMinutesUntil(
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
