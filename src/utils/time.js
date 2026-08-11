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
