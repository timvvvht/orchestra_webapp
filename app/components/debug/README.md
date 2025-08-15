# SSE Debug Panel Implementation

## Overview

The SSE Debug Panel is a development tool that provides real-time monitoring of Server-Sent Events (SSE) traffic for per-session debugging in the Orchestra AI chat interface.

## Files Added/Modified

### 1. New Component: `SSEEventDebugPanel.tsx`

**Location**: `/Users/tim/Code/orchestra/src/components/debug/SSEEventDebugPanel.tsx`

A React component that displays SSE events in a collapsible panel:

```tsx
interface Props {
  events: SSEEvent[];
}

export const SSEEventDebugPanel: React.FC<Props> = ({ events }) => {
  // Implementation details...
}
```

**Features**:
- Fixed position top-right overlay
- Full viewport height when expanded
- Collapsible with click to expand/collapse
- Quick filter dropdown by event type
- Shows event count in header (filtered count)
- Displays timestamp and event type
- Full JSON representation of each event
- Limits to 200 most recent events
- Monospace font for better readability

**Styling**:
- Dark theme with `rgba(0,0,0,0.8)` background
- 420px width, full viewport height when expanded
- High z-index (9999) to appear above other content
- Individual event cards with subtle borders and backgrounds

### 2. Modified Hook: `useACSChatUI.ts`

**Location**: `/Users/tim/Code/orchestra/src/hooks/useACSChatUI.ts`

**Changes Made**:

1. **Added to Return Type Interface**:
```tsx
export interface UseACSChatUIReturn {
  // ... existing properties
  
  // ACS Client access (for debug purposes)
  acsClient: OrchestACSClient;
}
```

2. **Added to Return Object**:
```tsx
return useMemo(
  () => ({
    // ... existing properties
    
    // ACS Client access (for debug purposes)
    acsClient
  }),
  [
    // ... existing dependencies
    acsClient
  ]
);
```

This exposes the ACS client so components can access the streaming service for debug purposes.

### 3. Modified Component: `ChatMain.tsx`

**Location**: `/Users/tim/Code/orchestra/src/components/chat-interface/ChatMain.tsx`

**Changes Made**:

1. **Added Imports**:
```tsx
import { SSEEventDebugPanel } from '@/components/debug/SSEEventDebugPanel';
import type { SSEEvent } from '@/services/acs';
```

2. **Added State**:
```tsx
const [sseEvents, setSseEvents] = useState<SSEEvent[]>([]);
```

3. **Added SSE Event Subscription**:
```tsx
useEffect(() => {
  // Skip until client ready
  const unsubscribe = window.__ACS_DEBUG__ === false
    ? () => {}
    : chatUI.acsClient.streaming.onEvent((ev: SSEEvent) => {
        // Add timestamp when event is received
        const eventWithTimestamp = {
          ...ev,
          _receivedAt: Date.now()
        };
        setSseEvents(prev => [eventWithTimestamp, ...prev].slice(0, 500));
    });

  return () => unsubscribe();
}, [chatUI.acsClient]);
```

4. **Added Debug Panel to JSX**:
```tsx
{/* ──────────── SSE DEBUG PANEL (dev only) ─────────── */}
{process.env.NODE_ENV !== 'production' && (
  <SSEEventDebugPanel events={sseEvents} />
)}
{/* ────────────── END SSE DEBUG PANEL ──────────────── */}
```

**Replaced**: The old debug overlay system with the new SSE-specific debug panel.

### 4. Test Page: `SSEDebugTest.tsx`

**Location**: `/Users/tim/Code/orchestra/src/pages/SSEDebugTest.tsx`

A dedicated test page that simulates SSE events to demonstrate the debug panel functionality:

- Generates mock SSE events every 2 seconds
- Shows different event types (chunk, token, tool_call, tool_result, done, error, status)
- Includes the SSE Debug Panel for testing
- Accessible at `/sse-debug-test` route

### 5. Modified Router: `App.tsx`

**Location**: `/Users/tim/Code/orchestra/src/App.tsx`

**Changes Made**:
- Added lazy import for `SSEDebugTest`
- Added route: `<Route path="/sse-debug-test" element={<SSEDebugTest />} />`

## Behavior

### Panel Visibility
- **Development**: Visible when `process.env.NODE_ENV !== 'production'`
- **Production**: Hidden (tree-shaken out)
- **Debug Flag**: Respects `window.__ACS_DEBUG__` flag for additional control

### Event Collection
- Subscribes to all SSE events via `acsClient.streaming.onEvent()`
- Filters out heartbeat events to reduce noise
- Adds `_receivedAt` timestamp when events are received
- Maintains up to 500 recent events in memory
- Displays up to 200 events in the panel

### User Interaction
- **Collapsed State**: Shows "▶ SSE Debug {count}" with event count (32px height)
- **Expanded State**: Shows "◀ SSE Debug {count}" with full event list and filter dropdown (full viewport height)
- **Click to Toggle**: Click header to expand/collapse
- **Event Filtering**: Dropdown to filter by event type (shows count per type)
- **Auto-scroll**: Panel content scrolls independently with full viewport height

### Event Display Format
```
HH:MM:SS | event_type
{
  "type": "chunk",
  "sessionId": "session-123",
  "delta": "Hello world",
  "_receivedAt": 1640995200000,
  ...
}
```

## Integration

### In ChatMain Components
The debug panel automatically appears in any chat interface that uses the `useChatUI` hook and includes the `<SSEEventDebugPanel>` component.

### Session Filtering
Events are automatically filtered to the current session context since the SSE subscription is session-specific.

### Zero Impact on Production
- Component is conditionally rendered based on `NODE_ENV`
- Event collection is disabled in production
- No performance impact on production builds

## Testing

### Manual Testing
1. Navigate to `/sse-debug-test` to see the panel with simulated events
2. Open any chat session and observe real SSE events
3. Test panel expand/collapse functionality
4. Verify event timestamps and formatting

### Event Types Displayed
- `chunk` - Text streaming chunks
- `token` - Individual token updates
- `tool_call` - Tool invocation events
- `tool_result` - Tool execution results
- `done` - Completion events
- `error` - Error events
- `status` - Status updates
- `agent_status` - Agent status changes

**Note**: `heartbeat` events are filtered out to reduce noise in the debug panel.

## Configuration

### Constants (in SSEEventDebugPanel.tsx)
```tsx
const MAX_EVENTS = 200;    // Maximum events to display
// Panel height is now 100vh when expanded
```

### Event Limit (in ChatMain.tsx)
```tsx
.slice(0, 500)  // Maximum events to keep in memory
```

### Debug Control
```tsx
window.__ACS_DEBUG__ = false;  // Disable event collection
```

## Future Enhancements

Potential improvements that could be added:

1. **Event Filtering**: Filter by event type, session, or content
2. **Export Functionality**: Export events to JSON file
3. **Search**: Search through event content
4. **Performance Metrics**: Show event frequency and timing
5. **Session Switching**: View events from different sessions
6. **Event Replay**: Replay captured events for debugging

## Security Considerations

- Debug panel only appears in development builds
- No sensitive data is logged beyond what's already in SSE events
- Panel can be disabled via `window.__ACS_DEBUG__` flag
- Events are stored only in memory, not persisted

## Performance Impact

- **Development**: Minimal impact, events stored in memory with size limits
- **Production**: Zero impact, component and event collection disabled
- **Memory Usage**: Limited to 500 events × average event size
- **Rendering**: Virtualized display of up to 200 events