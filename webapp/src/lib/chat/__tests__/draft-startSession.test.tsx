/**
 * Integration test for draft-startSession flow
 *
 * Tests that startNewChatForDraft correctly:
 * 1. Creates a worktree session via startNewChat
 * 2. Sends message with autoMode & modelAutoMode both TRUE
 * 3. Passes agent_cwd_override correctly
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { startNewChatForDraft } from "../newChatHelper";
import { startNewChat } from "../newChatHandler";
import { sendChatMessage } from "@/utils/sendChatMessage";

// Mock dependencies
vi.mock("../newChatHandler");
vi.mock("@/utils/sendChatMessage");

const mockStartNewChat = vi.mocked(startNewChat);
const mockSendChatMessage = vi.mocked(sendChatMessage);

describe("Draft Start Session Integration", () => {
  const mockAcsClient = {
    core: {
      sendMessage: vi.fn(),
    },
  };

  const testOptions = {
    draftText: "Fix the login bug in the authentication module",
    userId: "user-123",
    agentConfigName: "General Assistant",
    acsClient: mockAcsClient,
    agentConfigId: "general-config",
    sessionName: "Draft Task",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create worktree session and send message with auto modes enabled", async () => {
    // Mock startNewChat to return session and workspace path
    const mockChatResult = {
      sessionId: "session-456",
      workspacePath: "/tmp/worktree-session-456",
    };
    mockStartNewChat.mockResolvedValue(mockChatResult);

    // Mock sendChatMessage to return success
    const mockSendResult = {
      success: true,
      userMessageId: "msg-789",
      sessionId: "session-456", // Include sessionId in the result
    };
    mockSendChatMessage.mockResolvedValue(mockSendResult);

    // Execute the helper
    const result = await startNewChatForDraft(testOptions);

    // Verify startNewChat was called with correct options
    expect(mockStartNewChat).toHaveBeenCalledWith({
      agentConfigId: "general-config",
      sessionName: "Draft Task",
    });

    // Verify sendChatMessage was called with auto modes enabled
    expect(mockSendChatMessage).toHaveBeenCalledWith({
      sessionId: "session-456",
      message: "Fix the login bug in the authentication module",
      userId: "user-123",
      agentConfigName: "General Assistant",
      acsClient: mockAcsClient,
      autoMode: true, // ✅ Auto agent config selection enabled
      modelAutoMode: true, // ✅ Auto model switching enabled
      acsOverrides: {
        agent_cwd_override: "/tmp/worktree-session-456", // ✅ Worktree path passed
      },
    });

    // Verify return value
    expect(result).toEqual({
      sessionId: "session-456",
      workspacePath: "/tmp/worktree-session-456",
      userMessageId: "msg-789",
    });
  });

  it("should pass through agentCwd option to startNewChat", async () => {
    const mockChatResult = {
      sessionId: "session-456",
      workspacePath: "/custom/workspace/path",
    };
    mockStartNewChat.mockResolvedValue(mockChatResult);

    const mockSendResult = {
      success: true,
      userMessageId: "msg-789",
      sessionId: "session-456", // Include sessionId in the result
    };
    mockSendChatMessage.mockResolvedValue(mockSendResult);

    // Test with custom agentCwd
    const optionsWithCwd = {
      ...testOptions,
      agentCwd: "/custom/workspace/path",
    };

    await startNewChatForDraft(optionsWithCwd);

    // Verify startNewChat was called with agentCwd
    expect(mockStartNewChat).toHaveBeenCalledWith({
      agentConfigId: "general-config",
      sessionName: "Draft Task",
      agentCwd: "/custom/workspace/path",
    });

    // Verify sendChatMessage uses the workspace path from startNewChat result
    expect(mockSendChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        acsOverrides: {
          agent_cwd_override: "/custom/workspace/path",
        },
      })
    );
  });

  it("should handle startNewChat failure", async () => {
    // Mock startNewChat to fail
    const mockError = new Error("Failed to create worktree");
    mockStartNewChat.mockRejectedValue(mockError);

    // Execute should throw
    await expect(startNewChatForDraft(testOptions)).rejects.toThrow(
      "Failed to start new chat for draft: Failed to create worktree"
    );

    // Verify sendChatMessage was not called
    expect(mockSendChatMessage).not.toHaveBeenCalled();
  });

  it("should handle sendChatMessage failure", async () => {
    // Mock startNewChat to succeed
    const mockChatResult = {
      sessionId: "session-456",
      workspacePath: "/tmp/worktree-session-456",
    };
    mockStartNewChat.mockResolvedValue(mockChatResult);

    // Mock sendChatMessage to fail
    const mockSendResult = {
      success: false,
      error: "Network error",
    };
    mockSendChatMessage.mockResolvedValue(mockSendResult);

    // Execute should throw
    await expect(startNewChatForDraft(testOptions)).rejects.toThrow(
      "Failed to start new chat for draft: Failed to send draft message: Network error"
    );

    // Verify both functions were called
    expect(mockStartNewChat).toHaveBeenCalled();
    expect(mockSendChatMessage).toHaveBeenCalled();
  });

  it("should handle sendChatMessage exception", async () => {
    // Mock startNewChat to succeed
    const mockChatResult = {
      sessionId: "session-456",
      workspacePath: "/tmp/worktree-session-456",
    };
    mockStartNewChat.mockResolvedValue(mockChatResult);

    // Mock sendChatMessage to throw
    const mockError = new Error("Connection timeout");
    mockSendChatMessage.mockRejectedValue(mockError);

    // Execute should throw
    await expect(startNewChatForDraft(testOptions)).rejects.toThrow(
      "Failed to start new chat for draft: Connection timeout"
    );

    // Verify both functions were called
    expect(mockStartNewChat).toHaveBeenCalled();
    expect(mockSendChatMessage).toHaveBeenCalled();
  });

  it("should verify auto modes are explicitly set to true", async () => {
    const mockChatResult = {
      sessionId: "session-456",
      workspacePath: "/tmp/worktree-session-456",
    };
    mockStartNewChat.mockResolvedValue(mockChatResult);

    const mockSendResult = {
      success: true,
      userMessageId: "msg-789",
      sessionId: "session-456", // Include sessionId in the result
    };
    mockSendChatMessage.mockResolvedValue(mockSendResult);

    await startNewChatForDraft(testOptions);

    // Get the call arguments
    const sendChatMessageCall = mockSendChatMessage.mock.calls[0][0];

    // Explicitly verify the boolean values
    expect(sendChatMessageCall.autoMode).toBe(true);
    expect(sendChatMessageCall.modelAutoMode).toBe(true);
    expect(typeof sendChatMessageCall.autoMode).toBe("boolean");
    expect(typeof sendChatMessageCall.modelAutoMode).toBe("boolean");
  });

  it("should pass correct agent_cwd_override from worktree result", async () => {
    const mockChatResult = {
      sessionId: "session-456",
      workspacePath: "/isolated/worktree/path/session-456",
    };
    mockStartNewChat.mockResolvedValue(mockChatResult);

    const mockSendResult = {
      success: true,
      userMessageId: "msg-789",
      sessionId: "session-456", // Include sessionId in the result
    };
    mockSendChatMessage.mockResolvedValue(mockSendResult);

    await startNewChatForDraft(testOptions);

    // Verify the exact worktree path is passed as agent_cwd_override
    const sendChatMessageCall = mockSendChatMessage.mock.calls[0][0];
    expect(sendChatMessageCall.acsOverrides.agent_cwd_override).toBe(
      "/isolated/worktree/path/session-456"
    );
  });
});
