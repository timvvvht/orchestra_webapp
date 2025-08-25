/**
 * Example usage of the updated sendChatMessage function with automatic session creation
 *
 * IMPORTANT: createSessionFast is now called ALWAYS to ensure sessions exist in the database,
 * regardless of whether sessionId is provided or not. This fixes the bug where sessions
 * were not being created in Supabase.
 */

import { sendChatMessage } from "./sendChatMessage";

// Example 1: Send message with existing session ID - will ensure it exists in DB
export async function sendMessageWithExistingSession() {
  const result = await sendChatMessage({
    sessionId: "existing-session-123", // ✅ Existing session - will be verified in DB
    message: "Hello, how can you help me?",
    userId: "user-456",
    agentConfigName: "general",
    acsClient: null, // Not used in web app
  });

  console.log("Message sent:", result);
  // Result: { success: true, userMessageId: 'user-1234567890', sessionId: 'existing-session-123' }
  // Note: createSessionFast was called to ensure the session exists in the database
}

// Example 2: Send message without session ID - will create one automatically
export async function sendMessageWithoutSession() {
  const result = await sendChatMessage({
    // sessionId: undefined, // ✅ No session ID - will create one automatically
    message: "Create a new chat session for me",
    userId: "user-456",
    agentConfigName: "general",
    acsClient: null, // Not used in web app
  });

  console.log("Message sent with new session:", result);
  // Result: { success: true, userMessageId: 'user-1234567890', sessionId: 'new-session-789' }
  // Note: createSessionFast was called to create a new session in the database
}

// Example 3: Send message with session creation options
export async function sendMessageWithSessionOptions() {
  const result = await sendChatMessage({
    // sessionId: undefined, // ✅ No session ID - will create one automatically
    message: "Help me with my project",
    userId: "user-456",
    agentConfigName: "general",
    acsClient: null, // Not used in web app

    // ✅ Session creation options
    sessionCreationOptions: {
      sessionName: "Project Help Session",
      agentConfigId: "general",
      workspacePath: "/path/to/my/project",
      metadata: {
        project_type: "web_app",
        priority: "high",
      },
    },
  });

  console.log("Message sent with custom session:", result);
  // Result: { success: true, userMessageId: 'user-1234567890', sessionId: 'custom-session-abc' }
  // Note: createSessionFast was called with custom options to create a session in the database
}

// Example 4: Send message with repo context (web origin)
export async function sendMessageWithRepoContext() {
  const result = await sendChatMessage({
    // sessionId: undefined, // ✅ No session ID - will create one automatically
    message: "Review my code changes",
    userId: "user-456",
    agentConfigName: "general",
    acsClient: null, // Not used in web app
    endpoint: "web", // ✅ Web origin

    // ✅ Repo context for web origin
    repoContextWeb: {
      repo_id: 12345,
      repo_full_name: "myorg/myproject",
      branch: "main",
    },

    // ✅ Session creation will use repo context automatically
    sessionCreationOptions: {
      sessionName: "Code Review Session",
      agentConfigId: "general",
    },
  });

  console.log("Message sent with repo context:", result);
  // Result: { success: true, userMessageId: 'user-1234567890', sessionId: 'repo-session-def' }
  // Note: createSessionFast was called with repo context to create a session in the database
}

// Example 5: Send message with workspace path override
export async function sendMessageWithWorkspaceOverride() {
  const result = await sendChatMessage({
    // sessionId: undefined, // ✅ No session ID - will create one automatically
    message: "Analyze this codebase",
    userId: "user-456",
    agentConfigName: "general",
    acsClient: null, // Not used in web app

    // ✅ ACS overrides with workspace path
    acsOverrides: {
      agent_cwd_override: "/custom/workspace/path",
    },

    // ✅ Session creation will use the workspace path from acsOverrides
  });

  console.log("Message sent with workspace override:", result);
  // Result: { success: true, userMessageId: 'user-1234567890', sessionId: 'workspace-session-ghi' }
  // Note: createSessionFast was called and will use the workspace path from acsOverrides
}

// Example 6: Send message with existing session - demonstrates DB verification
export async function sendMessageWithExistingSessionVerification() {
  const result = await sendChatMessage({
    sessionId: "existing-session-456", // ✅ Existing session ID provided
    message: "Continue our conversation",
    userId: "user-456",
    agentConfigName: "general",
    acsClient: null, // Not used in web app

    // ✅ Session creation options (optional for existing sessions)
    sessionCreationOptions: {
      sessionName: "Continued Conversation", // Will be used if session needs recreation
      agentConfigId: "general",
    },
  });

  console.log("Message sent with existing session verification:", result);
  // Result: { success: true, userMessageId: 'user-1234567890', sessionId: 'existing-session-456' }
  // Note: createSessionFast was called to verify the session exists in the database
  // If the session doesn't exist, it will be recreated with the provided options
}
