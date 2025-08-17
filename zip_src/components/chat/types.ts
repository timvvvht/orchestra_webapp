// Rich Content Part Types
export interface TextPart {
  type: 'text';
  text: string;
}

export interface ToolUsePart {
  type: 'tool_use';
  id: string;           // Tool call ID from LLM (maps to tool_call_id)
  name: string;         // Name of the tool
  input: any;           // Input to the tool
}

export interface ToolResultPart {
  type: 'tool_result';
  tool_use_id: string;  // ID of the tool_use this is a result for
  content: string;      // Stringified result content for display
  is_error?: boolean;
}

export type RichContentPart = TextPart | ToolUsePart | ToolResultPart;

// Legacy interfaces - kept for reference during transition
export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface ToolResult {
  content: string;
}

export enum ChatRole {
  User = 'user',
  Assistant = 'assistant',
  System = 'system',
  Tool = 'tool',
  Error = 'error'
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: ChatRole;
  content: RichContentPart[]; 
  timestamp: number; // Renamed from createdAt
  isStreaming?: boolean;
  model?: string;
  thinking?: boolean;
  reasoning?: string[];
  delivered?: boolean;
  read?: boolean;
  
  // For transition period - these will be removed later
  // Access these only for backward compatibility
  toolCall?: ToolCall;
  toolResult?: ToolResult;
  
  // Legacy field - use only for backward compatibility
  createdAt?: number; // Will be removed, use timestamp instead
  agentId?: string; // Will be removed, use sessionId instead
  
  debugSourceEvent?: { 
    type: string;
    triggerEventId?: string;
  };
}
