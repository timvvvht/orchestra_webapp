/**
 * Date formatting utilities for chat messages
 * Extracted from ChatMainCanonicalLegacy.tsx
 */

/**
 * Format date for message groups in WhatsApp style
 * Shows "Today", "Yesterday", or formatted date
 */
export function formatMessageDate(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Check if date is within the current year
  const isCurrentYear = date.getFullYear() === today.getFullYear();

  if (date.getTime() === today.getTime()) {
    return 'Today';
  }

  if (date.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }

  // For dates within the current year, don't show the year (WhatsApp style)
  if (isCurrentYear) {
    return date.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short'
    });
  }

  // For older dates, include the year (WhatsApp style)
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}