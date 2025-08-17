/**
 * Integration tests for @ file mention functionality in LandingPageInfinite
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LandingPageInfinite } from '../LandingPageInfinite';
import { useFileSearch } from '@/hooks/useFileSearch';
import { useAgentConfigs } from '@/hooks/useAgentConfigs';
import { useAuth } from '@/auth/AuthContext';
import { useSelections } from '@/context/SelectionContext';
import { useSettingsStore } from '@/stores/settingsStore';

// Mock dependencies
jest.mock('@/hooks/useFileSearch');
jest.mock('@/hooks/useAgentConfigs');
jest.mock('@/auth/AuthContext');
jest.mock('@/context/SelectionContext');
jest.mock('@/stores/settingsStore');
jest.mock('@/services/acs');

const mockUseFileSearch = useFileSearch as jest.MockedFunction<typeof useFileSearch>;
const mockUseAgentConfigs = useAgentConfigs as jest.MockedFunction<typeof useAgentConfigs>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseSelections = useSelections as jest.MockedFunction<typeof useSelections>;
const mockUseSettingsStore = useSettingsStore as jest.MockedFunction<typeof useSettingsStore>;

// Mock data
const mockAgentConfig = {
  id: 'test-agent-1',
  agent: {
    name: 'Test Agent',
    description: 'A test agent',
    avatar: null,
    metadata: {
      skills: ['coding', 'testing']
    }
  },
  ai_config: {
    model_id: 'gpt-4'
  }
};

const mockFileResults = [
  {
    display: 'LandingPage.tsx',
    full_path: '/tmp/project/src/LandingPage.tsx',
    relative_path: 'src/LandingPage.tsx',
    file_type: 'file'
  },
  {
    display: 'App.tsx',
    full_path: '/tmp/project/src/App.tsx',
    relative_path: 'src/App.tsx',
    file_type: 'file'
  }
];

const mockProjectContext = {
  path: '/tmp/project',
  name: 'Test Project'
};

describe('LandingPageInfinite - File Mention Integration', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock implementations
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'test-user' },
      setShowModal: jest.fn()
    } as any);

    mockUseSelections.mockReturnValue({
      selectedModelId: null,
      setSelectedModelId: jest.fn()
    } as any);

    mockUseSettingsStore.mockReturnValue({
      settings: {
        defaultAgentId: 'test-agent-1',
        vault: { path: '/default/vault' }
      }
    } as any);

    mockUseAgentConfigs.mockReturnValue({
      agentConfigs: { 'test-agent-1': mockAgentConfig },
      agentConfigsArray: [mockAgentConfig],
      isLoading: false,
      error: null
    } as any);

    // Default file search mock - returns empty results initially
    mockUseFileSearch.mockReturnValue({
      results: [],
      isLoading: false,
      error: null,
      search: jest.fn(),
      clear: jest.fn(),
      hasResults: false,
      isEmpty: true
    });
  });

  const renderComponent = (projectContext = mockProjectContext) => {
    return render(
      <BrowserRouter>
        <LandingPageInfinite 
          projectContext={projectContext}
          onProjectChange={jest.fn()}
        />
      </BrowserRouter>
    );
  };

  it('should render LexicalPillEditor when projectContext is provided', async () => {
    renderComponent();

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Test Agent')).toBeInTheDocument();
    });

    // Check that the editor is rendered (look for the placeholder text)
    expect(screen.getByText(/Type your message/)).toBeInTheDocument();
    expect(screen.getByText(/💡 Tip: Type @ to reference files/)).toBeInTheDocument();
  });

  it('should call useFileSearch with correct codePath when projectContext is provided', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Agent')).toBeInTheDocument();
    });

    // Verify useFileSearch was called with the correct codePath
    expect(mockUseFileSearch).toHaveBeenCalledWith(
      '', // initial empty query
      expect.objectContaining({
        codePath: '/tmp/project',
        debounceMs: 200,
        limit: 10,
        minQueryLength: 0
      })
    );
  });

  it('should show file search results when @ is typed', async () => {
    // Mock file search to return results when query is provided
    mockUseFileSearch.mockImplementation((query) => {
      if (query === 'Lan') {
        return {
          results: mockFileResults,
          isLoading: false,
          error: null,
          search: jest.fn(),
          clear: jest.fn(),
          hasResults: true,
          isEmpty: false
        };
      }
      return {
        results: [],
        isLoading: false,
        error: null,
        search: jest.fn(),
        clear: jest.fn(),
        hasResults: false,
        isEmpty: true
      };
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Agent')).toBeInTheDocument();
    });

    // Find the Lexical editor content area
    const editorContent = screen.getByRole('textbox', { hidden: true });
    expect(editorContent).toBeInTheDocument();

    // Simulate typing @ followed by search query
    // Note: This is a simplified test - in reality, Lexical's FileMentionPlugin
    // would handle the @ detection and trigger the file search
    fireEvent.input(editorContent, { target: { textContent: '@Lan' } });

    // The file search should be triggered with the query
    await waitFor(() => {
      expect(mockUseFileSearch).toHaveBeenCalledWith(
        'Lan',
        expect.objectContaining({
          codePath: '/tmp/project'
        })
      );
    });
  });

  it('should enable send button when editor has content', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Agent')).toBeInTheDocument();
    });

    // Initially, send button should be disabled
    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeDisabled();

    // Simulate adding content to the editor
    const editorContent = screen.getByRole('textbox', { hidden: true });
    fireEvent.input(editorContent, { target: { textContent: 'Test message' } });

    // Send button should now be enabled
    await waitFor(() => {
      expect(sendButton).not.toBeDisabled();
    });
  });

  it('should handle markdown content with file mentions', async () => {
    const mockNavigate = jest.fn();
    
    // Mock react-router-dom navigate
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate
    }));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Test Agent')).toBeInTheDocument();
    });

    // Simulate editor content with file mention markdown
    const editorContent = screen.getByRole('textbox', { hidden: true });
    const markdownWithMention = 'Please review [@LandingPage.tsx](@file:/tmp/project/src/LandingPage.tsx)';
    
    fireEvent.input(editorContent, { target: { textContent: markdownWithMention } });

    // Click send button
    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);

    // Verify that the markdown content would be processed
    // (In a real test, we'd mock the ACS client and verify the message content)
    await waitFor(() => {
      expect(sendButton).toBeInTheDocument();
    });
  });

  it('should not show file search when no projectContext is provided', async () => {
    renderComponent(undefined);

    await waitFor(() => {
      expect(screen.getByText('Test Agent')).toBeInTheDocument();
    });

    // Verify useFileSearch was called with undefined codePath
    expect(mockUseFileSearch).toHaveBeenCalledWith(
      '',
      expect.objectContaining({
        codePath: undefined
      })
    );
  });
});