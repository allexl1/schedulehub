export function calculateMinutesUntil(timeString) {
  if (!timeString) return null;

  const startTimeStr = timeString.split(' - ')[0];
  if (!startTimeStr || !startTimeStr.includes(':')) return null;

  const [hours, minutes] = startTimeStr.split(':').map(Number);
  
  const now = new Date();
  const classTime = new Date();
  classTime.setHours(hours, minutes, 0, 0);

  const diffMs = classTime.getTime() - now.getTime();
  if (diffMs <= 0) return 0;

  return Math.round(diffMs / 60000);
}

export function parseStartTimeInMinutes(timeSlot) {
  if (!timeSlot) return 0;
  const startTimeStr = timeSlot.split(' - ')[0];
  if (!startTimeStr || !startTimeStr.includes(':')) return 0;

  const [hours, minutes] = startTimeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

export function getMinutesUntilEnd(timeSlot) {
  if (!timeSlot) return 0;
  const parts = timeSlot.split(' - ');
  if (parts.length < 2 || !parts[1].includes(':')) return 0;

  const [hours, minutes] = parts[1].split(':').map(Number);
  const now = new Date();
  const endTime = new Date(now);
  endTime.setHours(hours, minutes, 0, 0);

  const diffMs = endTime.getTime() - now.getTime();
  if (diffMs <= 0) return 0;

  return Math.round(diffMs / 60000);
}

export function getClassStatus(timeSlot, isSelectedDayToday) {
  if (!timeSlot || !isSelectedDayToday) return 'upcoming';

  const parts = timeSlot.split(' - ');
  if (parts.length < 2) return 'upcoming';

  const [startH, startM] = parts[0].split(':').map(Number);
  const [endH, endM] = parts[1].split(':').map(Number);

  const now = new Date();
  const start = new Date(now);
  start.setHours(startH, startM, 0, 0);

  const end = new Date(now);
  end.setHours(endH, endM, 0, 0);

  if (now >= start && now <= end) return 'in_progress';
  if (now > end) return 'past';
  return 'upcoming';
}
