# Chat UI React Hook

A unified React hook for integrating chat functionality into the Orchestra Tauri app. This hook combines all the existing chat store logic into a clean, reusable interface.

## Overview

The `useChatUI` hook provides everything needed for chat integration:
- Automatic initialization
- Session management
- Message handling
- Real-time updates via Tauri events
- Error recovery
- Navigation integration

## Quick Start

### Basic Usage

```typescript
import { useChatUI } from '@/hooks/useChatUI';

function MyChatComponent() {
  const chat = useChatUI({
    defaultAgentConfigId: 'your-agent-config-id'
  });
  
  if (!chat.isInitialized) {
    return <div>Loading...</div>;
  }
  
  return (
    <div>
      {/* Display messages */}
      {chat.messages.map(message => (
        <div key={message.id}>{message.content}</div>
      ))}
      
      {/* Send message */}
      <button onClick={() => chat.sendMessage('Hello!')}>
        Send Message
      </button>
    </div>
  );
}
```

### Simple Integration

For basic chat functionality, use the simplified hook:

```typescript
import { useSimpleChatUI } from '@/hooks/useChatUI';

function SimpleChatComponent() {
  const chat = useSimpleChatUI('your-agent-config-id');
  
  return (
    <div>
      {chat.messages.map(message => (
        <div key={message.id}>{message.content}</div>
      ))}
      
      <button onClick={() => chat.createAndSendMessage('Hello!')}>
        Start Conversation
      </button>
    </div>
  );
}
```

### Session Management

For sidebar or session list components:

```typescript
import { useChatSessions } from '@/hooks/useChatUI';

function SessionSidebar() {
  const sessions = useChatSessions();
  
  return (
    <div>
      {sessions.sessions.map(session => (
        <div 
          key={session.id}
          onClick={() => sessions.switchToSession(session.id)}
        >
          {session.name} ({session.messageCount} messages)
        </div>
      ))}
      
      <button onClick={() => sessions.createSession('agent-id', 'New Chat')}>
        New Session
      </button>
    </div>
  );
}
```

## API Reference

### `useChatUI(options?)`

Main hook providing full chat functionality.

#### Options

```typescript
interface UseChatUIOptions {
  autoInitialize?: boolean;        // Auto-initialize on mount (default: true)
  autoLoadMessages?: boolean;      // Auto-load messages for current session (default: true)
  enableCodingMode?: boolean;      // Enable coding mode support (default: false)
  defaultAgentConfigId?: string;   // Default agent config for new sessions
}
```

#### Returns

```typescript
interface UseChatUIReturn {
  // State
  isInitialized: boolean;
  currentSessionId: string | undefined;
  currentSession: ChatSession | undefined;
  messages: ChatMessage[];
  sessions: SessionInfo[];
  
  // Loading states
  isLoading: boolean;
  hasStreamingMessage: boolean;
  hasThinkingMessage: boolean;
  
  // Actions
  sendMessage: (content: string, options?: SendMessageOptions) => Promise<void>;
  createSession: (agentConfigId?: string, name?: string) => Promise<string>;
  createSessionAndSendMessage: (message: string, agentConfigId?: string, sessionName?: string) => Promise<string>;
  deleteSession: (sessionId: string) => Promise<void>;
  switchToSession: (sessionId: string) => void;
  loadMoreMessages: (sessionId?: string, limit?: number) => Promise<void>;
  
  // Navigation helpers
  navigateToSession: (sessionId: string) => void;
  navigateToChat: () => void;
  
  // Utility
  refresh: () => Promise<void>;
  cleanup: () => void;
}
```

### `useSimpleChatUI(agentConfigId?)`

Simplified hook for basic chat functionality.

#### Returns

```typescript
{
  isReady: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  createAndSendMessage: (message: string) => Promise<string>;
  goToChat: () => void;
}
```

### `useChatSessions()`

Hook for session management only.

#### Returns

```typescript
{
  sessions: SessionInfo[];
  currentSessionId: string | undefined;
  switchToSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => Promise<void>;
  createSession: (agentConfigId: string, name?: string) => Promise<string>;
}
```

## Real-time Updates

The hook automatically handles real-time updates via Tauri's event system:

- **Streaming messages**: `hasStreamingMessage` indicates when AI is typing
- **Thinking state**: `hasThinkingMessage` shows when AI is processing
- **Tool calls**: Automatically displayed in message content
- **Error handling**: Errors are captured and displayed

## Error Handling

All async operations include error handling:

```typescript
try {
  await chat.sendMessage('Hello!');
} catch (error) {
  console.error('Failed to send message:', error);
  // Handle error in UI
}
```

## Integration with Existing Components

The hook is designed to work with the existing Orchestra chat components:

```typescript
// Replace existing hook usage in ChatMainRefined.tsx
const { sendMessage, initialize, setCurrentSession } = useChatActions();
const { currentSessionId, isInitialized } = useChatState();
const { messages, hasStreamingMessage, isLoading } = useSessionMessages(agentId);

// With the new unified hook
const chat = useChatUI({ defaultAgentConfigId: agentId });
// Now you have: chat.sendMessage, chat.isInitialized, chat.messages, etc.
```

## Examples

See `/src/components/examples/ChatUIExample.tsx` for complete working examples:

- `FullChatUIExample`: Complete chat interface with sidebar
- `SimpleChatUIExample`: Basic chat for landing pages
- `SessionsExample`: Session management component

## Architecture

The hook builds on the existing Orchestra chat architecture:

- **Zustand Store**: Uses the existing modular chat store
- **Tauri Events**: Leverages `AgentEventService` for real-time updates
- **React Router**: Integrates with existing routing (`/whatsapp`, `/chat/:sessionId`)
- **Type Safety**: Full TypeScript support with existing chat types

## Migration Guide

To migrate existing components:

1. **Replace multiple hooks** with single `useChatUI`:
   ```typescript
   // Before
   const actions = useChatActions();
   const state = useChatState();
   const messages = useSessionMessages(sessionId);
   
   // After
   const chat = useChatUI();
   ```

2. **Update action calls**:
   ```typescript
   // Before
   await actions.sendMessage(content, options);
   
   // After
   await chat.sendMessage(content, options);
   ```

3. **Update state access**:
   ```typescript
   // Before
   const { currentSessionId, isInitialized } = state;
   
   // After
   const { currentSessionId, isInitialized } = chat;
   ```

## Development

To test the hook:

1. Start the development server: `bun run dev`
2. Navigate to the examples: `/src/components/examples/ChatUIExample.tsx`
3. Import and use the hook in your components

## Notes

- The hook automatically handles initialization and cleanup
- Real-time events are managed transparently
- Navigation integration works with existing routes
- Error recovery includes session restoration
- Performance is optimized with memoization and stable references

This hook provides a clean, unified interface for all chat functionality while maintaining compatibility with the existing Orchestra architecture.
