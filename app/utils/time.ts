/**
 * Formats a timestamp into a human-readable relative time string
 * @param timestamp ISO date string or Date object
 * @returns Relative time string like "now", "5m ago", "3h ago", "2d ago"
 */
export const formatTimeAgo = (timestamp: string | Date): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  // Handle future dates or invalid dates
  if (diffMs < 0 || isNaN(diffMs)) {
    return 'now';
  }
  
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  if (diffSeconds < 30) return 'now';
  if (diffMinutes < 1) return `${diffSeconds}s ago`;
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${diffYears}y ago`;
};

/**
 * Gets the most relevant timestamp for sorting/display from a session
 * @param session Session object with timestamp fields
 * @returns The most recent timestamp as Date object
 */
export const getSessionTimestamp = (session: { 
  last_message_at?: string | null; 
  latest_message_timestamp?: string | null;
  created_at: string; 
}): Date => {
  const timestamp = session.last_message_at || session.latest_message_timestamp || session.created_at;
  return new Date(timestamp);
};

/**
 * Sorts sessions by most recent activity (descending)
 * @param sessions Array of session objects
 * @returns Sorted array with most recent first
 */
export const sortSessionsByActivity = <T extends { 
  last_message_at?: string | null; 
  latest_message_timestamp?: string | null;
  created_at: string; 
}>(sessions: T[]): T[] => {
  return [...sessions].sort((a, b) => {
    const timeA = getSessionTimestamp(a).getTime();
    const timeB = getSessionTimestamp(b).getTime();
    return timeB - timeA; // Descending order (most recent first)
  });
};