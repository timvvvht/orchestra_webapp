import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChatPane from '../ChatPane';
import { useMissionControlStore } from '@/stores/missionControlStore';
import { useAuth } from '@/auth/AuthContext';
import { sendChatMessage } from '@/utils/sendChatMessage';

// Mock dependencies
vi.mock('@/stores/missionControlStore');
vi.mock('@/auth/AuthContext');
vi.mock('@/utils/sendChatMessage');
vi.mock('@/services/acs', () => ({
  getDefaultACSClient: vi.fn(() => ({}))
}));
vi.mock('@/components/chat-interface/ChatMainCanonicalLegacy', () => ({
  default: ({ onSubmit }: { onSubmit: (message: string) => void }) => (
    <div data-testid="chat-main">
      <button 
        onClick={() => onSubmit('Test message')}
        data-testid="send-message-btn"
      >
        Send Message
      </button>
    </div>
  )
}));

const mockUseMissionControlStore = useMissionControlStore as any;
const mockUseAuth = useAuth as any;
const mockSendChatMessage = sendChatMessage as any;

describe('ChatPane Optimistic Updates', () => {
  let mockStoreActions: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock auth
    mockUseAuth.mockReturnValue({
      user: { id: 'user123' },
      isAuthenticated: true,
    });

    // Mock store actions
    mockStoreActions = {
      selectedSession: 'session123',
      sessions: [{
        id: 'session123',
        mission_title: 'Test Session',
        status: 'idle',
        agent_config_name: 'general',
        agent_cwd: '/test/path',
        isFinalized: false,
      }],
      plans: {},
      setShowNewDraftModal: vi.fn(),
      setInitialDraftCodePath: vi.fn(),
      updateSession: vi.fn(),
      ensureInProcessingOrder: vi.fn(),
      markSessionUnread: vi.fn(),
      markSessionRead: vi.fn(),
    };
    mockUseMissionControlStore.mockReturnValue(mockStoreActions);

    // Mock sendChatMessage to resolve successfully
    mockSendChatMessage.mockResolvedValue(undefined);
  });

  it('should immediately move session to processing when message is sent', async () => {
    render(<ChatPane />);

    // Find and click the send message button
    const sendButton = screen.getByTestId('send-message-btn');
    fireEvent.click(sendButton);

    // Should immediately update the session to processing state
    expect(mockStoreActions.updateSession).toHaveBeenCalledWith('session123', {
      status: 'working',
      latest_message_content: 'Processing your request…',
      latest_message_role: 'user',
      latest_message_timestamp: expect.any(String),
      last_message_at: expect.any(String)
    });

    // Should move to processing bucket
    expect(mockStoreActions.ensureInProcessingOrder).toHaveBeenCalledWith('session123');

    // Should mark as read (since user is actively using it)
    expect(mockStoreActions.markSessionRead).toHaveBeenCalledWith('session123');

    // Should still send the actual message
    await waitFor(() => {
      expect(mockSendChatMessage).toHaveBeenCalledWith({
        sessionId: 'session123',
        message: 'Test message',
        userId: 'user123',
        agentConfigName: 'general',
        acsClient: {},
        autoMode: true,
        modelAutoMode: true,
        acsOverrides: {
          agent_cwd_override: '/test/path'
        }
      });
    });
  });

  it('should not send message if session is finalized', async () => {
    // Mock finalized session
    mockStoreActions.sessions[0].isFinalized = true;

    render(<ChatPane />);

    const sendButton = screen.getByTestId('send-message-btn');
    fireEvent.click(sendButton);

    // Should not update session or send message
    expect(mockStoreActions.updateSession).not.toHaveBeenCalled();
    expect(mockStoreActions.ensureInProcessingOrder).not.toHaveBeenCalled();
    expect(mockSendChatMessage).not.toHaveBeenCalled();
  });

  it('should not send message if user is not authenticated', async () => {
    // Mock unauthenticated user
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    });

    render(<ChatPane />);

    const sendButton = screen.getByTestId('send-message-btn');
    fireEvent.click(sendButton);

    // Should not update session or send message
    expect(mockStoreActions.updateSession).not.toHaveBeenCalled();
    expect(mockStoreActions.ensureInProcessingOrder).not.toHaveBeenCalled();
    expect(mockSendChatMessage).not.toHaveBeenCalled();
  });

  it('should handle message send failure gracefully', async () => {
    // Mock sendChatMessage to reject
    mockSendChatMessage.mockRejectedValue(new Error('Network error'));

    render(<ChatPane />);

    const sendButton = screen.getByTestId('send-message-btn');
    fireEvent.click(sendButton);

    // Should still do optimistic updates
    expect(mockStoreActions.updateSession).toHaveBeenCalled();
    expect(mockStoreActions.ensureInProcessingOrder).toHaveBeenCalled();
    expect(mockStoreActions.markSessionRead).toHaveBeenCalled();

    // Should attempt to send message
    await waitFor(() => {
      expect(mockSendChatMessage).toHaveBeenCalled();
    });

    // Note: In a real implementation, you might want to revert optimistic updates on failure
    // but for now we rely on firehose events to provide the correct state
  });
});