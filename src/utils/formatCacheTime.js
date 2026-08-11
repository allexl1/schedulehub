export function formatCacheAge(timestamp) {
  if (!timestamp) return 'Updated recently';
  
  const elapsedMinutes = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000);

  if (elapsedMinutes < 1) return 'Updated just now';
  if (elapsedMinutes < 60) return `Updated ${elapsedMinutes}m ago`;
  
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `Updated ${elapsedHours}h ago`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `Updated ${elapsedDays}d ago`;
}
