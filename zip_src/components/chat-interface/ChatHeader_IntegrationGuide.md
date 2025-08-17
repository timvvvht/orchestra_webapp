# ChatHeader Integration Guide

## Overview
This guide explains how to properly integrate the ChatHeader component into your existing codebase after fixing the integration issues.

## What Was Fixed

### 1. **Props Interface Alignment**
- **Before**: Expected `currentSession` object and `onAgentChange` callback
- **After**: Works with `sessionId` and delegates actions to parent components

### 2. **Data Retrieval Pattern**
- **Before**: Expected full session object to be passed as prop
- **After**: Retrieves session data from stores using sessionId

### 3. **Session Management**
- **Before**: Had its own session creation logic that could conflict
- **After**: Delegates session creation to parent components via callbacks

### 4. **Navigation Patterns**
- **Before**: Direct navigation that might not align with app flow
- **After**: Uses callbacks to let parent components handle navigation

## Integration Steps

### Step 1: Use the Fixed ChatHeader
Replace the import in ChatMain.tsx:
```tsx
import ChatHeader from './header/ChatHeader';
```

### Step 2: Update Props Usage
The ChatHeader now expects these props:
```tsx
interface ChatHeaderProps {
  sessionId?: string | null;      // Session ID instead of full object
  onNewChat?: () => void;         // Callback for new chat action
  onOpenAgentSelector?: () => void; // Callback for agent selector
  className?: string;
}
```

### Step 3: Implement Missing Features

#### Agent Selector Modal
Create an agent selector modal or use existing navigation:
```tsx
const [showAgentSelector, setShowAgentSelector] = useState(false);

// In ChatMain component
<ChatHeader 
  sessionId={agentId}
  onNewChat={() => setIsNewChatModalOpen(true)}
  onOpenAgentSelector={() => setShowAgentSelector(true)}
/>

// Add the agent selector modal
<AgentSelectorModal
  isOpen={showAgentSelector}
  onClose={() => setShowAgentSelector(false)}
  onSelectAgent={(agentConfig) => {
    // Handle agent selection
    // Create new session with selected agent
  }}
/>
```

#### Session Creation Flow
Ensure new chat creation follows your existing patterns:
```tsx
const handleNewChatWithAgent = async (agentConfig: AgentConfigTS) => {
  const sessionId = await createSession(
    agentConfig.id,
    agentConfig.agent.name || 'New Chat',
    {
      // Session metadata
    }
  );
  
  if (sessionId) {
    navigate(`/chat/${sessionId}`);
  }
};
```

### Step 4: Data Structure Alignment

Ensure your ChatSession type includes all required fields:
```tsx
interface ChatSession {
  id: string;
  name: string;
  avatar: string;
  specialty: string;
  messages: ChatMessage[];
  model: string;
  tools: string[];
  createdAt: number;
  lastUpdated: number;
  agent_config_id?: string | null;
  // ... other fields
}
```

### Step 5: Clean Up

1. Remove the original ChatHeader.tsx if no longer needed
2. Update any other components that might be using the old ChatHeader
3. Test the integration thoroughly

## Testing Checklist

- [ ] Chat header displays correctly with session info
- [ ] New chat button works and opens modal
- [ ] Keyboard shortcut (Cmd+N) creates new chat
- [ ] Session duration updates correctly
- [ ] Agent capabilities expand/collapse works
- [ ] Settings button appears when callback is provided
- [ ] No console errors or warnings

## Future Enhancements

1. **Agent Quick Switch**: Add a dropdown to quickly switch between recent agents
2. **Session Search**: Add search functionality in the header
3. **Session Actions**: Add more session management options (archive, export, etc.)
4. **Customization**: Allow themes or color customization based on agent type

## Troubleshooting

### Issue: Session data not displaying
- Check that sessionId is being passed correctly
- Verify the chat store has the session data loaded
- Check console for any store initialization errors

### Issue: New chat not working
- Ensure NewChatModal is properly imported and implemented
- Check that the onNewChat callback is properly wired
- Verify navigation routes are set up correctly

### Issue: Agent config not found
- Ensure agentConfigStore is initialized before ChatHeader renders
- Check that agent_config_id exists in the session data
- Verify agent configs are being fetched from the backend