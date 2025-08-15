/**
 * Utility functions for parsing and formatting tool call data
 */

export interface ToolCallData {
  tool_call?: {
    name?: string;
    arguments?: any;
  };
  tool_name?: string;
  tool_args?: any;
}

/**
 * Extracts and formats tool call arguments for display in UI previews.
 * Prioritizes 'thought' field for think tools, falls back to stringified arguments.
 * 
 * @param data - Tool call event data
 * @param maxLength - Maximum length for argument preview (default: 100)
 * @returns Formatted argument string or undefined if no meaningful args
 */
export function formatToolCallArguments(data: ToolCallData, maxLength: number = 100): string | undefined {
  // Extract tool arguments from either structure
  const toolArgs = data.tool_call?.arguments || data.tool_args;
  
  if (!toolArgs || typeof toolArgs !== 'object') {
    return undefined;
  }

  // Special handling for 'thought' field (common in think tools)
  if (toolArgs.thought && typeof toolArgs.thought === 'string') {
    const thought = toolArgs.thought.trim();
    if (thought) {
      return thought.length > maxLength 
        ? `${thought.substring(0, maxLength - 3)}...`
        : thought;
    }
  }

  // For other tools, show key arguments
  const argEntries = Object.entries(toolArgs);
  if (argEntries.length === 0) {
    return undefined;
  }

  // If only one argument and it's a string, show it directly
  if (argEntries.length === 1) {
    const [key, value] = argEntries[0];
    if (typeof value === 'string' && value.trim()) {
      const preview = `${key}: ${value.trim()}`;
      return preview.length > maxLength 
        ? `${preview.substring(0, maxLength - 3)}...`
        : preview;
    }
  }

  // Multiple arguments or complex values - stringify with truncation
  try {
    const jsonStr = JSON.stringify(toolArgs);
    return jsonStr.length > maxLength 
      ? `${jsonStr.substring(0, maxLength - 3)}...`
      : jsonStr;
  } catch {
    // Fallback if JSON.stringify fails
    return `${argEntries.length} argument${argEntries.length === 1 ? '' : 's'}`;
  }
}

/**
 * Gets the tool name from tool call data, with fallbacks
 */
export function getToolCallName(data: ToolCallData): string {
  return data.tool_call?.name || data.tool_name || 'unknown';
}

/**
 * Creates a formatted tool call preview for UI display
 * 
 * @param data - Tool call event data
 * @param getDisplayName - Function to get display name for tool (optional)
 * @param maxArgLength - Maximum length for arguments (default: 100)
 * @returns Formatted preview string
 */
export function formatToolCallPreview(
  data: ToolCallData, 
  getDisplayName?: (name: string) => string,
  maxArgLength: number = 100
): string {
  const toolName = getToolCallName(data);
  const displayName = getDisplayName ? getDisplayName(toolName) : toolName;
  const args = formatToolCallArguments(data, maxArgLength);
  
  if (args) {
    return `${displayName}: ${args}`;
  } else {
    return `${displayName}`;
  }
}