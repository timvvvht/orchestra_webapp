/**
 * Message grouping utilities for chat interface
 * Extracted from ChatMainCanonicalLegacy.tsx
 */

import type { ChatMessage } from '@/types/chatTypes';
import { isSameDay } from './dateFormatting';

export interface MessageGroup {
  date: Date;
  messages: ChatMessage[];
}

/**
 * Check if messages should be grouped together
 * Groups messages from the same role within 2 minutes of each other
 */
export function shouldGroupMessages(msg1: ChatMessage, msg2: ChatMessage): boolean {
  const time1 = msg1.createdAt || 0;
  const time2 = msg2.createdAt || 0;
  const timeDiff = Math.abs(time1 - time2);
  const twoMinutes = 2 * 60 * 1000;

  return msg1.role === msg2.role && timeDiff < twoMinutes;
}

/**
 * Group messages by date for display
 * Creates date-based groups with messages for each day
 */
export function groupMessagesByDate(messages: ChatMessage[]): MessageGroup[] {
  if (!messages.length) {
    return [];
  }

  const groups: MessageGroup[] = [];
  let currentDate: Date | null = null;
  let currentGroup: ChatMessage[] = [];

  messages.forEach((message) => {
    const messageTime = message.createdAt || Date.now();
    const messageDate = new Date(messageTime);
    messageDate.setHours(0, 0, 0, 0);

    if (!currentDate || !isSameDay(currentDate, messageDate)) {
      if (currentGroup.length > 0) {
        groups.push({ date: currentDate!, messages: [...currentGroup] });
        currentGroup = [];
      }
      currentDate = messageDate;
    }

    currentGroup.push(message);
  });

  if (currentGroup.length > 0 && currentDate) {
    groups.push({ date: currentDate, messages: currentGroup });
  }

  return groups;
}