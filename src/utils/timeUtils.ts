/**
 * Utility functions for time and duration formatting
 */

/**
 * Format a duration in seconds to a human-readable string (HH:MM:SS or MM:SS)
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "00:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

/**
 * Calculate the number of days until a given date
 */
export function getDaysUntil(targetDate: string | Date): number {
  const target = new Date(targetDate);
  const now = new Date();

  // Reset time to start of day for accurate day calculation
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffTime = targetStart.getTime() - nowStart.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Format a date to a relative string (e.g., "in 5 days", "yesterday", "today")
 */
export function formatRelativeDate(date: string | Date): string {
  const days = getDaysUntil(date);

  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days > 0) return `in ${days} days`;
  return `${Math.abs(days)} days ago`;
}

/**
 * Parse a time string (HH:MM:SS or MM:SS) to seconds
 */
export function parseTimeString(timeString: string): number {
  const parts = timeString.split(':').map(Number);

  if (parts.length === 3) {
    // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // MM:SS
    return parts[0] * 60 + parts[1];
  }

  return 0;
}

/**
 * Calculate time difference between two durations in seconds
 */
export function calculateTimeDifference(actualSeconds: number, goalSeconds: number): {
  difference: number;
  percentage: number;
  formatted: string;
} {
  const difference = goalSeconds - actualSeconds;
  const percentage = goalSeconds > 0 ? (difference / goalSeconds) * 100 : 0;

  return {
    difference,
    percentage,
    formatted: formatDuration(Math.abs(difference))
  };
}
