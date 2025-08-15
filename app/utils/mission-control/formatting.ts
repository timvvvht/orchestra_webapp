/**
 * Formatting utility functions for Mission Control components.
 * Provides consistent formatting for tool calls, results, markdown, paths, and time.
 */

/**
 * Formats a tool call into a readable summary string.
 * @param toolCall - Tool call object with name and parameters
 * @returns Formatted summary string
 */
export const formatToolCallSummary = (toolCall: any): string => {
  // Tool call summary formatting logic will be moved here
  if (!toolCall) return '';
  
  const { tool_name, parameters } = toolCall;
  if (!tool_name) return 'Unknown tool call';
  
  // Basic implementation - will be enhanced during refactor
  return `${tool_name}(${Object.keys(parameters || {}).length} params)`;
};

/**
 * Formats a tool result into a readable summary string.
 * @param toolResult - Tool result object with success status and output
 * @returns Formatted summary string with status indicator
 */
export const formatToolResultSummary = (toolResult: any): string => {
  // Tool result summary formatting logic will be moved here
  if (!toolResult) return '';
  
  const { success, output } = toolResult;
  const status = success ? '✓' : '✗';
  const preview = output ? String(output).slice(0, 50) : 'No output';
  
  return `${status} ${preview}${output && output.length > 50 ? '...' : ''}`;
};

/**
 * Strips markdown syntax from text for clean preview display.
 * @param text - Text with markdown syntax
 * @param maxLength - Maximum length of output string
 * @returns Clean text without markdown, truncated if necessary
 */
export const stripMarkdownForPreview = (text: string, maxLength: number = 100): string => {
  // Markdown stripping logic will be moved here
  if (!text) return '';
  
  // Basic implementation - remove common markdown syntax
  const stripped = text
    .replace(/#{1,6}\s+/g, '') // Headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
    .replace(/\*(.*?)\*/g, '$1') // Italic
    .replace(/`(.*?)`/g, '$1') // Inline code
    .replace(/```[\s\S]*?```/g, '[code block]') // Code blocks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    .trim();
  
  return stripped.length > maxLength 
    ? stripped.slice(0, maxLength) + '...' 
    : stripped;
};

/**
 * Formats file paths for compact display by showing only relevant segments.
 * @param path - Full file path
 * @returns Shortened path showing last 2-3 segments
 */
export const formatCodePath = (path: string): string => {
  // Code path formatting logic will be moved here
  if (!path) return '';
  
  // Show only the last 2-3 path segments for brevity
  const segments = path.split('/');
  if (segments.length <= 3) return path;
  
  return '.../' + segments.slice(-2).join('/');
};

/**
 * Formats timestamps into human-readable "time ago" strings.
 * @param timestamp - Timestamp in various formats
 * @returns Human-readable time difference (e.g., "5m ago", "2h ago")
 */
export const formatTimeAgo = (timestamp: string | number | Date): string => {
  // Time ago formatting logic will be moved here
  if (!timestamp) return '';
  
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return time.toLocaleDateString();
};

/**
 * Extracts and formats a preview of the latest message from a message list.
 * @param messages - Array of message objects
 * @returns Preview text of the most recent message
 */
export const getLatestMessagePreview = (messages: any[]): string => {
  // Latest message preview logic will be moved here
  if (!messages || messages.length === 0) return 'No messages';
  
  const latestMessage = messages[messages.length - 1];
  if (!latestMessage) return 'No messages';
  
  const content = latestMessage.content || latestMessage.text || '';
  return stripMarkdownForPreview(content, 80);
};