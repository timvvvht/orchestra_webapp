// Date utility functions for Orchestra
// Shared date formatting functions used across chat components

/**
 * Formats a message date for display in chat interface
 * Shows "Today", "Yesterday", or formatted date based on recency
 */
export const formatMessageDate = (date: Date): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isCurrentYear = date.getFullYear() === today.getFullYear();

  if (date.getTime() === today.getTime()) {
    return 'Today';
  }

  if (date.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }

  if (isCurrentYear) {
    return date.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short'
    });
  }

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Formats a timestamp for display in chat messages
 * Shows time in HH:MM format
 */
export const formatMessageTime = (date: Date): string => {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

/**
 * Formats a full timestamp for tooltips or detailed views
 */
export const formatFullTimestamp = (date: Date): string => {
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

/**
 * Gets relative time string (e.g., "2 minutes ago", "1 hour ago")
 */
export const getRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return formatMessageDate(date);
  }
};

/**
 * Checks if two dates are on the same day
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.toDateString() === date2.toDateString();
};

/**
 * Groups messages by date for chat display
 */
export const groupMessagesByDate = <T extends { createdAt: string | Date }>(
  messages: T[]
): Array<{ date: Date; messages: T[] }> => {
  const groups: Array<{ date: Date; messages: T[] }> = [];
  let currentGroup: { date: Date; messages: T[] } | null = null;

  for (const message of messages) {
    const messageDate = new Date(message.createdAt);
    const messageDateString = messageDate.toDateString();

    if (!currentGroup || currentGroup.date.toDateString() !== messageDateString) {
      currentGroup = {
        date: messageDate,
        messages: []
      };
      groups.push(currentGroup);
    }

    currentGroup.messages.push(message);
  }

  return groups;
};