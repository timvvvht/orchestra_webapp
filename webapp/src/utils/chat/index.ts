/**
 * Chat utilities - extracted from ChatMainCanonicalLegacy.tsx
 * 
 * This module contains utility functions that were previously embedded
 * in the large ChatMainCanonicalLegacy component. Breaking them out
 * improves maintainability and reusability.
 */

// Date formatting utilities
export {
  formatMessageDate,
  isSameDay
} from './dateFormatting';

// Message grouping utilities
export {
  shouldGroupMessages,
  groupMessagesByDate,
  type MessageGroup
} from './messageGrouping';

// Event conversion utilities
export {
  convertEventsToMessages,
  convertEventsToMessagesAsync
} from './eventConversion';

// Scroll management utilities
export {
  scrollToBottom,
  isScrolledToBottom,
  getScrollPercentage
} from './scrollUtils';