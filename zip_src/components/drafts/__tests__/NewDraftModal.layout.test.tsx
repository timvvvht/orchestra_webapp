import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NewDraftModal } from '../NewDraftModal';
import { SelectionProvider } from '@/context/SelectionContext';
import { ChatUIProvider } from '@/context/ChatUIContext';

// Mock dependencies
vi.mock('../LexicalPillEditor', () => ({
  LexicalPillEditor: ({ value, onChange, className, onFilesChange, codePath, placeholder, autoFocus, 'data-testid': testId }: any) => (
    <textarea 
      data-testid={testId || 'lexical-editor'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      placeholder={placeholder}
      autoFocus={autoFocus}
    />
  ),
}));

vi.mock('../CodebaseSelector', () => ({
  CodebaseSelector: ({ value, onChange, placeholder }: any) => (
    <input 
      data-testid="codebase-selector"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/utils/taskOrchestration', () => ({
  isRepositoryDirty: vi.fn(() => Promise.resolve(false)),
  commitChanges: vi.fn(() => Promise.resolve()),
  checkRepositoryState: vi.fn(() => Promise.resolve({ isDirty: false })),
  createTaskSession: vi.fn(() => Promise.resolve('test-session-id')),
}));

vi.mock('@/workers/sessionBackgroundWorker', () => ({
  startBackgroundSessionOps: vi.fn(),
}));

vi.mock('@/stores/missionControlStore', () => ({
  useMissionControlStore: () => ({
    sessions: [],
    setSessions: vi.fn(),
    updateSession: vi.fn(),
    setBackgroundProcessing: vi.fn(),
  }),
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
  }),
}));

vi.mock('@/hooks/useAgentConfigs', () => ({
  useAgentConfigs: () => ({
    agentConfigsArray: [
      {
        id: 'test-config-id',
        agent: { name: 'Test Agent' },
      },
    ],
  }),
}));

vi.mock('@/hooks/useMissionControlShortcuts', () => ({
  useMissionControlShortcuts: () => ({
    getShortcutHint: () => '⌘S',
  }),
}));

vi.mock('@/stores/settingsStore', () => ({
  useSettingsStore: () => ({
    settings: {
      vault: { path: '/test/path' },
    },
  }),
}));

vi.mock('@/stores/draftStore', () => ({
  useDraftStore: () => ({
    addDraft: vi.fn(),
  }),
}));

vi.mock('@/utils/projectStorage', () => ({
  recentProjectsManager: {
    get: () => [{ path: '/recent/project' }],
  },
}));

// Mock ReactDOM.createPortal
vi.mock('react-dom', async () => {
  const ReactDOM = await import('react-dom');
  return {
    ...ReactDOM,
    createPortal: (node: React.ReactNode) => node,
  };
});

// Mock the useACSChatUI hook
vi.mock('@/hooks/acs-chat', () => ({
  useACSChatUIRefactored: () => ({
    currentSession: null,
    currentAgentConfig: null,
    // Add other required properties as needed
  }),
}));

// Test wrapper with providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ChatUIProvider>
      <SelectionProvider>
        {children}
      </SelectionProvider>
    </ChatUIProvider>
  );
};

describe('NewDraftModal Layout Structure', () => {
  const baseProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSessionCreated: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders header, main, and footer when open', () => {
    render(<NewDraftModal {...baseProps} />, { wrapper: TestWrapper });

    // Check header exists
    expect(screen.getByTestId('ndm-header')).toBeInTheDocument();
    
    // Check main content area exists
    expect(screen.getByTestId('ndm-main')).toBeInTheDocument();
    
    // Check footer exists
    expect(screen.getByTestId('ndm-footer')).toBeInTheDocument();
    
    // Check specific elements within each region
    expect(screen.getByText('New Task')).toBeInTheDocument();
    expect(screen.getByTestId('ndm-codebase-wrapper')).toBeInTheDocument();
    expect(screen.getByTestId('ndm-editor-wrapper')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send to agent/i })).toBeInTheDocument();
  });

  it('footer remains visible regardless of content height', () => {
    render(<NewDraftModal {...baseProps} />, { wrapper: TestWrapper });

    const footer = screen.getByTestId('ndm-footer');
    const footerParent = footer.closest('.shrink-0');
    
    // Footer should be in a shrink-0 container (non-scrollable)
    expect(footerParent).toHaveClass('shrink-0');
    
    // Footer buttons should be visible
    expect(screen.getByRole('button', { name: /send to agent/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeVisible();
  });

  it('main content area is scrollable', () => {
    render(<NewDraftModal {...baseProps} />, { wrapper: TestWrapper });

    const mainContent = screen.getByTestId('ndm-main');
    
    // Main content should have overflow-y-auto for scrolling
    expect(mainContent).toHaveClass('overflow-y-auto');
    expect(mainContent).toHaveClass('min-h-0');
  });

  it('advanced toggle button has correct test id and functionality', () => {
    render(<NewDraftModal {...baseProps} />, { wrapper: TestWrapper });

    const toggleButton = screen.getByTestId('ndm-toggle-advanced');
    expect(toggleButton).toBeInTheDocument();
    
    // Click the toggle button
    fireEvent.click(toggleButton);
    
    // Button should still be present (it doesn't get removed)
    expect(toggleButton).toBeInTheDocument();
  });

  it('editor has constrained height and scroll', () => {
    render(<NewDraftModal {...baseProps} />, { wrapper: TestWrapper });

    const editor = screen.getByTestId('ndm-editor');
    
    // Editor should have max height constraint
    expect(editor).toHaveClass('max-h-[40vh]');
    expect(editor).toHaveClass('overflow-y-auto');
  });

  it('codebase selector and editor wrappers have correct test ids', () => {
    render(<NewDraftModal {...baseProps} />, { wrapper: TestWrapper });

    expect(screen.getByTestId('ndm-codebase-wrapper')).toBeInTheDocument();
    expect(screen.getByTestId('ndm-editor-wrapper')).toBeInTheDocument();
  });

  it('advanced section is conditionally rendered based on advancedOpen state', () => {
    render(<NewDraftModal {...baseProps} />, { wrapper: TestWrapper });

    // Initially, advanced section should not be present
    expect(screen.queryByTestId('ndm-advanced')).not.toBeInTheDocument();

    // Click the toggle button to open advanced settings
    const toggleButton = screen.getByTestId('ndm-toggle-advanced');
    fireEvent.click(toggleButton);

    // Now advanced section should be present
    expect(screen.getByTestId('ndm-advanced')).toBeInTheDocument();

    // Click again to close
    fireEvent.click(toggleButton);

    // Advanced section should be gone again
    expect(screen.queryByTestId('ndm-advanced')).not.toBeInTheDocument();
  });
});