import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChatUIProvider, useChatUI } from '@/context/ChatUIContext';

// Mock the useACSChatUI hook
vi.mock('@/hooks/useACSChatUI', () => ({
  useACSChatUI: vi.fn(() => ({
    isInitialized: true,
    isAuthenticated: true,
    isConnected: true,
    connectionStatus: 'connected',
    currentSessionId: 'test-session',
    sessions: [],
    messages: [],
    isLoading: false,
    hasStreamingMessage: false,
    agentConfigs: [],
    currentAgentConfigId: undefined,
    currentAgentConfig: undefined,
    user: null,
    initialize: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    createSession: vi.fn(),
    switchToSession: vi.fn(),
    deleteSession: vi.fn(),
    renameSession: vi.fn(),
    sendMessage: vi.fn(),
    startConversation: vi.fn(),
    loadAgentConfigs: vi.fn(),
    setCurrentAgentConfig: vi.fn(),
    createAgentConfig: vi.fn(),
    updateAgentConfig: vi.fn(),
    deleteAgentConfig: vi.fn(),
    connectStreaming: vi.fn(),
    disconnectStreaming: vi.fn(),
    navigateToSession: vi.fn(),
    navigateToChat: vi.fn(),
    refresh: vi.fn(),
    getHealthStatus: vi.fn(),
    error: null,
    clearError: vi.fn()
  }))
}));

// Test component that uses the context
const TestComponent: React.FC = () => {
  const chatUI = useChatUI();
  return (
    <div>
      <div data-testid="initialized">{chatUI.isInitialized ? 'true' : 'false'}</div>
      <div data-testid="authenticated">{chatUI.isAuthenticated ? 'true' : 'false'}</div>
      <div data-testid="connected">{chatUI.isConnected ? 'true' : 'false'}</div>
      <div data-testid="session-id">{chatUI.currentSessionId || 'none'}</div>
    </div>
  );
};

describe('ChatUIContext', () => {
  it('provides chat UI context to children', () => {
    render(
      <ChatUIProvider>
        <TestComponent />
      </ChatUIProvider>
    );

    expect(screen.getByTestId('initialized')).toHaveTextContent('true');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('connected')).toHaveTextContent('true');
    expect(screen.getByTestId('session-id')).toHaveTextContent('test-session');
  });

  it('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useChatUI must be used inside ChatUIProvider');
    
    consoleSpy.mockRestore();
  });
});