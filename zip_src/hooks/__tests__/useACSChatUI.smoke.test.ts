import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useACSChatUIRefactored as useACSChatUI } from '../acs-chat';
import type { OrchestACSClient } from '@/services/acs';

// Mock the router
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ sessionId: undefined })
}));

// Mock the auth context
vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null
  })
}));

// Mock the BYOK store
vi.mock('@/stores/byokStore', () => ({
  useBYOKStore: {
    getState: () => ({
      useStoredKeysPreference: false
    })
  }
}));

// Mock Supabase
vi.mock('@/auth/SupabaseClient', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } })
    }
  }
}));

// Create a mock ACS client with smoke-suite approved APIs
function createMockACSClient(): OrchestACSClient {
  return {
    // Auth service
    auth: {
      login: vi.fn().mockResolvedValue({
        data: {
          data: {
            user: { id: 'test-user', email: 'test@example.com' },
            access_token: 'test-token'
          }
        }
      }),
      logout: vi.fn().mockResolvedValue(undefined)
    },
    
    // Core service
    core: {
      sendMessage: vi.fn().mockResolvedValue({
        data: {
          session_id: 'test-session',
          response_messages: [],
          final_text_response: 'Test response'
        }
      }),
      startConversation: vi.fn().mockResolvedValue({
        data: {
          session_id: 'new-session',
          response_messages: [],
          final_text_response: 'New conversation started'
        }
      })
    },
    
    // Streaming service
    streaming: {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      isConnected: vi.fn().mockReturnValue(false),
      onConnectionChange: vi.fn().mockReturnValue(() => {}),
      onEvent: vi.fn().mockReturnValue(() => {})
    },
    
    // Sessions service
    sessions: {
      listSessions: vi.fn().mockResolvedValue({
        data: { sessions: [] }
      }),
      createDefaultSession: vi.fn().mockResolvedValue({
        data: { session_id: 'new-session' }
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { id: 'test-session', messages: [] }
      }),
      deleteSession: vi.fn().mockResolvedValue({
        data: { success: true }
      }),
      renameSession: vi.fn().mockResolvedValue({
        data: { success: true }
      })
    },
    
    // Agent configs service
    agentConfigs: {
      getAgentConfigs: vi.fn().mockResolvedValue([
        {
          id: 'general',
          name: 'General Assistant',
          agent: { name: 'general' }
        }
      ]),
      createAgentConfig: vi.fn().mockResolvedValue({ id: 'new-config' }),
      updateAgentConfig: vi.fn().mockResolvedValue(undefined),
      deleteAgentConfig: vi.fn().mockResolvedValue(undefined)
    },
    
    // Other required methods
    isAuthenticated: vi.fn().mockReturnValue(false),
    setAuthToken: vi.fn(),
    getHealthStatus: vi.fn().mockResolvedValue({ overall: 'healthy' }),
    initialize: vi.fn().mockResolvedValue({ authenticated: false })
  } as any;
}

describe('useACSChatUI - Smoke Suite API Usage', () => {
  let mockClient: OrchestACSClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockACSClient();
  });

  it('should use smoke-suite approved auth APIs for login', async () => {
    const { result } = renderHook(() =>
      useACSChatUI({ 
        autoInitialize: false, 
        acsClient: mockClient 
      })
    );

    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });

    // Verify smoke-suite approved APIs were called
    expect(mockClient.auth.login).toHaveBeenCalledWith('test@example.com', 'password');
    expect(mockClient.isAuthenticated).toHaveBeenCalled();
    
    // Verify legacy helpers were NOT called
    expect((mockClient as any).loginAndConnect).toBeUndefined();
  });

  it('should use smoke-suite approved auth APIs for logout', async () => {
    const { result } = renderHook(() =>
      useACSChatUI({ 
        autoInitialize: false, 
        acsClient: mockClient 
      })
    );

    await act(async () => {
      await result.current.logout();
    });

    // Verify smoke-suite approved APIs were called
    expect(mockClient.streaming.disconnect).toHaveBeenCalled();
    expect(mockClient.auth.logout).toHaveBeenCalled();
    
    // Verify legacy helpers were NOT called
    expect((mockClient as any).logoutAndDisconnect).toBeUndefined();
  });

  it('should use smoke-suite approved core APIs for sending messages', async () => {
    // Set up authenticated state
    mockClient.isAuthenticated = vi.fn().mockReturnValue(true);
    
    const { result } = renderHook(() =>
      useACSChatUI({ 
        autoInitialize: false, 
        acsClient: mockClient,
        userId: 'test-user'
      })
    );

    // Set current session
    act(() => {
      (result.current as any).setCurrentSessionId('test-session');
    });

    await act(async () => {
      await result.current.sendMessage('Hello world');
    });

    // Verify smoke-suite approved APIs were called
    expect(mockClient.core.sendMessage).toHaveBeenCalledWith(
      'test-session',
      'Hello world',
      'test-user',
      'default',
      expect.objectContaining({
        useStoredKeys: false
      })
    );
    
    // Verify legacy helpers were NOT called
    expect((mockClient as any).sendMessageWithStreaming).toBeUndefined();
  });

  it('should use smoke-suite approved core APIs for starting conversations', async () => {
    const { result } = renderHook(() =>
      useACSChatUI({ 
        autoInitialize: false, 
        acsClient: mockClient,
        userId: 'test-user'
      })
    );

    await act(async () => {
      await result.current.startConversation('Start new chat');
    });

    // Verify smoke-suite approved APIs were called
    expect(mockClient.core.startConversation).toHaveBeenCalledWith(
      'Start new chat',
      'test-user',
      'default',
      expect.objectContaining({
        agentCwd: '/workspace',
        useStoredKeys: false
      })
    );
    expect(mockClient.streaming.connect).toHaveBeenCalledWith('new-session');
    
    // Verify legacy helpers were NOT called
    expect((mockClient as any).startConversationWithStreaming).toBeUndefined();
  });

  it('should use smoke-suite approved streaming APIs', async () => {
    const { result } = renderHook(() =>
      useACSChatUI({ 
        autoInitialize: false, 
        acsClient: mockClient 
      })
    );

    await act(async () => {
      await result.current.connectStreaming('test-session');
    });

    await act(async () => {
      await result.current.disconnectStreaming();
    });

    // Verify smoke-suite approved APIs were called
    expect(mockClient.streaming.connect).toHaveBeenCalledWith('test-session');
    expect(mockClient.streaming.disconnect).toHaveBeenCalled();
  });

  it('should ensure streaming connection before sending messages', async () => {
    // Set up authenticated state
    mockClient.isAuthenticated = vi.fn().mockReturnValue(true);
    mockClient.streaming.isConnected = vi.fn().mockReturnValue(false);
    
    const { result } = renderHook(() =>
      useACSChatUI({ 
        autoInitialize: false, 
        acsClient: mockClient,
        userId: 'test-user'
      })
    );

    // Set current session
    act(() => {
      (result.current as any).setCurrentSessionId('test-session');
    });

    await act(async () => {
      await result.current.sendMessage('Hello world');
    });

    // Verify streaming connection was attempted before sending message
    expect(mockClient.streaming.isConnected).toHaveBeenCalled();
    expect(mockClient.streaming.connect).toHaveBeenCalledWith('test-session');
    expect(mockClient.core.sendMessage).toHaveBeenCalled();
  });
});