# Chat Library

This directory contains utilities and handlers for chat functionality in Orchestra.

## Files

### `newChatHandler.ts`

Provides the main integration between worktree creation and chat session management.

#### Key Functions

- **`startNewChat(options?)`**: Creates a new chat session with an associated worktree workspace
- **`getSessionWorkspacePath(sessionId)`**: Gets the workspace path for an existing session
- **`sessionHasWorkspace(sessionId)`**: Checks if a session has a workspace path set
- **`updateSessionWorkspacePath(sessionId, workspacePath)`**: Updates workspace path for existing session (not yet implemented)

#### Usage Example

```typescript
import { startNewChat } from '@/lib/chat/newChatHandler';

// Basic usage - creates worktree and session with defaults
const { sessionId, workspacePath } = await startNewChat();

// With custom options
const result = await startNewChat({
    agentConfigId: 'CodeAssistant',
    sessionName: 'Code Review Session',
});

// Using existing workspace path
const result = await startNewChat({
    agentCwd: '/existing/workspace/path',
    sessionName: 'Existing Project Chat'
});
```

#### Integration with State Management

The `startNewChat` function integrates with the existing chat store by:

1. **Generating Session ID**: Creates a unique UUID for the session
2. **Creating Worktree**: Calls the `create_worktree` Tauri command to create a dedicated workspace
3. **Creating Chat Session**: Uses the chat store's `createSession` method with the workspace path set as `agent_cwd`
4. **Returning Both Values**: Returns both `sessionId` and `workspacePath` for further use

#### State Storage

The session data is stored in the existing chat state management system:

- **Session Metadata**: Stored in `ChatStoreState.sessions` (SessionMeta objects)
- **Full Session Data**: Stored in `ChatStoreState.chats` (ChatSession objects)
- **Workspace Path**: Stored as `ChatSession.agent_cwd` field

#### Error Handling

The function provides comprehensive error handling:

- **Worktree Creation Errors**: Catches and re-throws with context
- **Session Creation Errors**: Catches and re-throws with context
- **Validation**: Verifies session was created with correct workspace path

#### Testing

Comprehensive test suite in `__tests__/newChatHandler.test.ts` covers:

- Successful worktree and session creation
- Custom options handling
- Using existing workspace paths
- Error scenarios
- Utility function behavior

## Architecture Integration

### With Existing Chat Store

The new chat handler integrates seamlessly with the existing chat store architecture:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  newChatHandler │───▶│   ChatStore      │───▶│  SessionManager │
│                 │    │                  │    │                 │
│ - startNewChat  │    │ - createSession  │    │ - createSession │
│ - utilities     │    │ - state mgmt     │    │ - Supabase      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                                               │
         ▼                                               ▼
┌─────────────────┐                            ┌─────────────────┐
│ Tauri Backend   │                            │   Database      │
│                 │                            │                 │
│ - create_worktree│                           │ - chat_sessions │
│ - WorktreeManager│                           │ - agent_cwd     │
└─────────────────┘                            └─────────────────┘
```

### With Worktree Management

The handler bridges the gap between frontend chat sessions and backend worktree management:

1. **Frontend Request**: User initiates new chat
2. **Worktree Creation**: Tauri command creates isolated workspace
3. **Session Creation**: Chat session created with workspace path
4. **State Persistence**: Both session and workspace info stored
5. **Ready for Use**: Session ready with dedicated workspace

## Future Enhancements

### Planned Features

1. **Session Workspace Updates**: Implement `updateSessionWorkspacePath` function
2. **Workspace Cleanup**: Add cleanup utilities for abandoned workspaces  
3. **Workspace Templates**: Support for different workspace templates
4. **Workspace Sharing**: Enable sharing workspaces between sessions

### Integration Points

1. **SCM Integration**: Leverage existing SCM checkpoint functionality
2. **Tool Access**: Ensure tools can access session workspace paths
3. **File Management**: Integrate with file operations in workspace context
4. **Backup/Restore**: Include workspace state in session backup/restore

## Dependencies

- `@tauri-apps/api/core`: For Tauri command invocation
- `@/stores/chat`: For chat state management
- `uuid`: For session ID generation
- `@/types/chatTypes`: For type definitions

## Related Files

- `/src/stores/chat/managers/SessionManager.ts`: Core session management
- `/src/stores/chat/state/chatState.ts`: Chat state definitions
- `/src-tauri/src/lib.rs`: Backend worktree command implementation
- `/src-tauri/src/worktree_manager.rs`: Worktree management logic