export function parseTimeRange(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const normalized = timeStr.replace(/[–—]/g, '-').trim();
  const parts = normalized.split('-').map((s) => s.trim());
  if (parts.length < 2) return null;
  return parts;
}

export function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

export function parseStartTimeInMinutes(timeSlot) {
  const parts = parseTimeRange(timeSlot);
  if (!parts) return 0;
  return parseTimeToMinutes(parts[0]);
}

export function getMinutesUntilEnd(timeSlot, now = new Date()) {
  const parts = parseTimeRange(timeSlot);
  if (!parts) return null;

  const [hours, minutes] = parts[1].split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;

  const endTime = new Date(now);
  endTime.setHours(hours, minutes, 0, 0);

  const diffMs = endTime.getTime() - now.getTime();
  if (diffMs <= 0) return 0;

  return Math.round(diffMs / 60000);
}

export function getClassStatus(timeSlot, isSelectedDayToday, now = new Date()) {
  if (!timeSlot || !isSelectedDayToday) return 'upcoming';

  const parts = parseTimeRange(timeSlot);
  if (!parts) return 'upcoming';

  const [startH, startM] = parts[0].split(':').map(Number);
  const [endH, endM] = parts[1].split(':').map(Number);
  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return 'upcoming';

  const start = new Date(now);
  start.setHours(startH, startM, 0, 0);

  const end = new Date(now);
  end.setHours(endH, endM, 0, 0);

  if (now >= start && now <= end) return 'in_progress';
  if (now > end) return 'past';
  return 'upcoming';
}

export function isValidTimeSlot(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return false;
  const parts = parseTimeRange(timeStr);
  if (!parts) return false;

  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(parts[0]) && timeRegex.test(parts[1]);
}
