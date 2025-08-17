import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GitHubConnectPanel from '../GitHubConnectPanel';
import MissionControlV2 from '../MissionControlV2';
import { getDefaultACSClient } from '@/services/acs';
import type { GitHubStatus, GitHubRepo } from '@/services/acs/shared/types';

// Mock the ACS client
vi.mock('@/services/acs', () => ({
  getDefaultACSClient: vi.fn()
}));

// Mock window.location.assign
Object.defineProperty(window, 'location', {
  value: {
    assign: vi.fn()
  },
  writable: true
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('GitHubConnectPanel', () => {
  let mockACSClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockACSClient = {
      github: {
        getStatus: vi.fn(),
        startConnect: vi.fn(),
        listRepos: vi.fn(),
        setRepo: vi.fn()
      }
    };
    
    (getDefaultACSClient as any).mockReturnValue(mockACSClient);
  });

  it('should show loading state initially', async () => {
    mockACSClient.github.getStatus.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ connected: false }), 100))
    );

    const wrapper = createWrapper();
    render(<GitHubConnectPanel />, { wrapper });

    expect(screen.getByText('Loading GitHub status...')).toBeInTheDocument();
  });

  it('should show connect button when not connected', async () => {
    const mockStatus: GitHubStatus = { connected: false };
    mockACSClient.github.getStatus.mockResolvedValue(mockStatus);

    const wrapper = createWrapper();
    render(<GitHubConnectPanel />, { wrapper });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /connect github/i })).toBeInTheDocument();
    });

    expect(screen.queryByText('Loading GitHub status...')).not.toBeInTheDocument();
  });

  it('should handle GitHub connection flow', async () => {
    const mockStatus: GitHubStatus = { connected: false };
    mockACSClient.github.getStatus.mockResolvedValue(mockStatus);
    mockACSClient.github.startConnect.mockResolvedValue({ 
      url: 'https://github.com/login/oauth/authorize?client_id=test' 
    });

    const wrapper = createWrapper();
    render(<GitHubConnectPanel />, { wrapper });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /connect github/i })).toBeInTheDocument();
    });

    const connectButton = screen.getByRole('button', { name: /connect github/i });
    fireEvent.click(connectButton);

    // Should show connecting state
    await waitFor(() => {
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });

    // Should call startConnect and redirect
    expect(mockACSClient.github.startConnect).toHaveBeenCalled();
    await waitFor(() => {
      expect(window.location.assign).toHaveBeenCalledWith(
        'https://github.com/login/oauth/authorize?client_id=test'
      );
    });
  });

  it('should show connected state with repository selection', async () => {
    const mockStatus: GitHubStatus = { 
      connected: true, 
      repo: 'owner/test-repo',
      installation_id: 12345 
    };
    const mockRepos: GitHubRepo[] = [
      { id: 1, full_name: 'owner/repo1', private: false, default_branch: 'main' },
      { id: 2, full_name: 'owner/repo2', private: true, default_branch: 'master' }
    ];

    mockACSClient.github.getStatus.mockResolvedValue(mockStatus);
    mockACSClient.github.listRepos.mockResolvedValue(mockRepos);

    const wrapper = createWrapper();
    render(<GitHubConnectPanel />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('GitHub Connected')).toBeInTheDocument();
    });

    expect(screen.getByText('Repository: owner/test-repo')).toBeInTheDocument();
    expect(mockACSClient.github.listRepos).toHaveBeenCalled();
  });

  it('should handle repository selection', async () => {
    const mockStatus: GitHubStatus = { 
      connected: true, 
      repo: null,
      installation_id: 12345 
    };
    const mockRepos: GitHubRepo[] = [
      { id: 1, full_name: 'owner/repo1', private: false, default_branch: 'main' },
      { id: 2, full_name: 'owner/repo2', private: true, default_branch: 'master' }
    ];

    mockACSClient.github.getStatus.mockResolvedValue(mockStatus);
    mockACSClient.github.listRepos.mockResolvedValue(mockRepos);
    mockACSClient.github.setRepo.mockResolvedValue({ success: true });

    const wrapper = createWrapper();
    render(<GitHubConnectPanel />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Select Repository')).toBeInTheDocument();
    });

    // Click to open repository dropdown
    const selectButton = screen.getByRole('button', { name: /select repository/i });
    fireEvent.click(selectButton);

    await waitFor(() => {
      expect(screen.getByText('owner/repo1')).toBeInTheDocument();
      expect(screen.getByText('owner/repo2')).toBeInTheDocument();
    });

    // Select a repository
    const repo1Button = screen.getByText('owner/repo1');
    fireEvent.click(repo1Button);

    expect(mockACSClient.github.setRepo).toHaveBeenCalledWith('owner/repo1');
  });

  it('should handle connection errors', async () => {
    const errorMessage = 'Failed to connect to GitHub API';
    mockACSClient.github.getStatus.mockRejectedValue(new Error(errorMessage));

    const wrapper = createWrapper();
    render(<GitHubConnectPanel />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('should handle OAuth connection errors', async () => {
    const mockStatus: GitHubStatus = { connected: false };
    mockACSClient.github.getStatus.mockResolvedValue(mockStatus);
    mockACSClient.github.startConnect.mockRejectedValue(
      new Error('OAuth configuration error')
    );

    const wrapper = createWrapper();
    render(<GitHubConnectPanel />, { wrapper });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /connect github/i })).toBeInTheDocument();
    });

    const connectButton = screen.getByRole('button', { name: /connect github/i });
    fireEvent.click(connectButton);

    await waitFor(() => {
      expect(screen.getByText('OAuth configuration error')).toBeInTheDocument();
    });

    // Should not redirect on error
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it('should handle repository setting errors', async () => {
    const mockStatus: GitHubStatus = { 
      connected: true, 
      repo: null,
      installation_id: 12345 
    };
    const mockRepos: GitHubRepo[] = [
      { id: 1, full_name: 'owner/repo1', private: false, default_branch: 'main' }
    ];

    mockACSClient.github.getStatus.mockResolvedValue(mockStatus);
    mockACSClient.github.listRepos.mockResolvedValue(mockRepos);
    mockACSClient.github.setRepo.mockRejectedValue(
      new Error('Repository access denied')
    );

    const wrapper = createWrapper();
    render(<GitHubConnectPanel />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Select Repository')).toBeInTheDocument();
    });

    // Open dropdown and select repo
    const selectButton = screen.getByRole('button', { name: /select repository/i });
    fireEvent.click(selectButton);

    await waitFor(() => {
      expect(screen.getByText('owner/repo1')).toBeInTheDocument();
    });

    const repo1Button = screen.getByText('owner/repo1');
    fireEvent.click(repo1Button);

    await waitFor(() => {
      expect(screen.getByText('Repository access denied')).toBeInTheDocument();
    });
  });

  it('should show empty state when no repositories available', async () => {
    const mockStatus: GitHubStatus = { 
      connected: true, 
      repo: null,
      installation_id: 12345 
    };
    const mockRepos: GitHubRepo[] = [];

    mockACSClient.github.getStatus.mockResolvedValue(mockStatus);
    mockACSClient.github.listRepos.mockResolvedValue(mockRepos);

    const wrapper = createWrapper();
    render(<GitHubConnectPanel />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Select Repository')).toBeInTheDocument();
    });

    // Open dropdown
    const selectButton = screen.getByRole('button', { name: /select repository/i });
    fireEvent.click(selectButton);

    await waitFor(() => {
      expect(screen.getByText('No repositories found')).toBeInTheDocument();
    });
  });

  it('should show repository details in dropdown', async () => {
    const mockStatus: GitHubStatus = { 
      connected: true, 
      repo: 'owner/repo1',
      installation_id: 12345 
    };
    const mockRepos: GitHubRepo[] = [
      { id: 1, full_name: 'owner/repo1', private: false, default_branch: 'main' },
      { id: 2, full_name: 'owner/private-repo', private: true, default_branch: 'develop' }
    ];

    mockACSClient.github.getStatus.mockResolvedValue(mockStatus);
    mockACSClient.github.listRepos.mockResolvedValue(mockRepos);

    const wrapper = createWrapper();
    render(<GitHubConnectPanel />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Repository: owner/repo1')).toBeInTheDocument();
    });

    // Open dropdown
    const selectButton = screen.getByRole('button', { name: /repository: owner\/repo1/i });
    fireEvent.click(selectButton);

    await waitFor(() => {
      expect(screen.getByText('owner/repo1')).toBeInTheDocument();
      expect(screen.getByText('owner/private-repo')).toBeInTheDocument();
      expect(screen.getByText('Private')).toBeInTheDocument();
      expect(screen.getByText('develop')).toBeInTheDocument();
    });
  });

  describe('Integration with MissionControlV2', () => {
    // Mock additional dependencies for MissionControlV2
    beforeEach(() => {
      // Mock auth context
      vi.mock('@/auth/AuthContext', () => ({
        useAuth: () => ({
          isAuthenticated: true,
          setShowModal: vi.fn()
        })
      }));

      // Mock mission control store
      const mockStore = {
        viewMode: 'active',
        showNewDraftModal: false,
        setShowNewDraftModal: vi.fn(),
        setSessions: vi.fn(),
        setPlans: vi.fn(),
        setPlanRefetchCallback: vi.fn(),
        setSessionRefetchCallback: vi.fn(),
        sessions: [],
        plans: {},
        planRefetchCallback: vi.fn(),
        sessionRefetchCallback: vi.fn(),
        getSelectedAgentCwd: vi.fn(),
        initialDraftCodePath: null,
        setInitialDraftCodePath: vi.fn(),
        selectedSession: null,
        setSelectedSession: vi.fn(),
        getGroupedSessions: () => ({ processing: [] })
      };

      vi.mock('@/stores/missionControlStore', () => ({
        useMissionControlStore: Object.assign(
          vi.fn(() => mockStore),
          { getState: vi.fn(() => mockStore) }
        )
      }));

      // Mock draft store
      vi.mock('@/stores/draftStore', () => ({
        useDraftStore: () => ({
          getDraftsArray: () => []
        })
      }));

      // Mock hooks
      vi.mock('@/hooks/useSessionsSnapshot', () => ({
        useSessionsSnapshot: () => ({
          sessions: [],
          isLoading: false,
          error: null,
          refetch: vi.fn()
        })
      }));

      vi.mock('@/hooks/usePlansSnapshot', () => ({
        usePlansSnapshot: () => ({
          plansBySession: {},
          refetch: vi.fn()
        })
      }));

      vi.mock('@/hooks/useMissionControlFirehose', () => ({
        useMissionControlFirehose: vi.fn()
      }));

      vi.mock('@/hooks/useMissionControlHotkeys', () => ({
        useMissionControlHotkeys: vi.fn()
      }));

      // Mock components
      vi.mock('../LayoutSplit', () => ({
        default: () => <div data-testid="layout-split">Layout Split</div>
      }));

      vi.mock('../DynamicStatus', () => ({
        default: () => <div data-testid="dynamic-status">Dynamic Status</div>
      }));

      vi.mock('../AmbientIndicators', () => ({
        default: () => <div data-testid="ambient-indicators">Ambient Indicators</div>
      }));

      // Mock infrastructure utils
      vi.mock('@/services/acs/infrastructure', () => ({
        InfrastructureUtils: {
          createTestResourceSpec: vi.fn(() => ({ region: 'iad', volume_size_gb: 1 })),
          pollUntilActive: vi.fn()
        }
      }));
    });

    it('should render GitHubConnectPanel within MissionControlV2', async () => {
      const mockStatus: GitHubStatus = { connected: false };
      mockACSClient.github.getStatus.mockResolvedValue(mockStatus);

      const wrapper = createWrapper();
      render(<MissionControlV2 />, { wrapper });

      // Should render the GitHub connect panel within the mission control interface
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /connect github/i })).toBeInTheDocument();
      });

      // Should also have other mission control elements
      expect(screen.getByTestId('mc-header')).toBeInTheDocument();
      expect(screen.getByTestId('layout-split')).toBeInTheDocument();
    });

    it('should show connected GitHub state in MissionControlV2', async () => {
      const mockStatus: GitHubStatus = { 
        connected: true, 
        repo: 'owner/test-repo',
        installation_id: 12345 
      };
      const mockRepos: GitHubRepo[] = [
        { id: 1, full_name: 'owner/test-repo', private: false, default_branch: 'main' }
      ];

      mockACSClient.github.getStatus.mockResolvedValue(mockStatus);
      mockACSClient.github.listRepos.mockResolvedValue(mockRepos);

      const wrapper = createWrapper();
      render(<MissionControlV2 />, { wrapper });

      // Should show connected state
      await waitFor(() => {
        expect(screen.getByText('GitHub Connected')).toBeInTheDocument();
        expect(screen.getByText('Repository: owner/test-repo')).toBeInTheDocument();
      });
    });
  });

  describe('Integration with MissionControlV2', () => {
    // Mock additional dependencies for MissionControlV2
    beforeEach(() => {
      // Mock auth context
      vi.mock('@/auth/AuthContext', () => ({
        useAuth: () => ({
          isAuthenticated: true,
          setShowModal: vi.fn()
        })
      }));

      // Mock mission control store
      const mockStore = {
        viewMode: 'active',
        showNewDraftModal: false,
        setShowNewDraftModal: vi.fn(),
        setSessions: vi.fn(),
        setPlans: vi.fn(),
        setPlanRefetchCallback: vi.fn(),
        setSessionRefetchCallback: vi.fn(),
        sessions: [],
        plans: {},
        planRefetchCallback: vi.fn(),
        sessionRefetchCallback: vi.fn(),
        getSelectedAgentCwd: vi.fn(),
        initialDraftCodePath: null,
        setInitialDraftCodePath: vi.fn(),
        selectedSession: null,
        setSelectedSession: vi.fn(),
        getGroupedSessions: () => ({ processing: [] })
      };

      vi.mock('@/stores/missionControlStore', () => ({
        useMissionControlStore: Object.assign(
          vi.fn(() => mockStore),
          { getState: vi.fn(() => mockStore) }
        )
      }));

      // Mock draft store
      vi.mock('@/stores/draftStore', () => ({
        useDraftStore: () => ({
          getDraftsArray: () => []
        })
      }));

      // Mock hooks
      vi.mock('@/hooks/useSessionsSnapshot', () => ({
        useSessionsSnapshot: () => ({
          sessions: [],
          isLoading: false,
          error: null,
          refetch: vi.fn()
        })
      }));

      vi.mock('@/hooks/usePlansSnapshot', () => ({
        usePlansSnapshot: () => ({
          plansBySession: {},
          refetch: vi.fn()
        })
      }));

      vi.mock('@/hooks/useMissionControlFirehose', () => ({
        useMissionControlFirehose: vi.fn()
      }));

      vi.mock('@/hooks/useMissionControlHotkeys', () => ({
        useMissionControlHotkeys: vi.fn()
      }));

      // Mock components
      vi.mock('../LayoutSplit', () => ({
        default: () => <div data-testid="layout-split">Layout Split</div>
      }));

      vi.mock('../DynamicStatus', () => ({
        default: () => <div data-testid="dynamic-status">Dynamic Status</div>
      }));

      vi.mock('../AmbientIndicators', () => ({
        default: () => <div data-testid="ambient-indicators">Ambient Indicators</div>
      }));

      // Mock infrastructure utils
      vi.mock('@/services/acs/infrastructure', () => ({
        InfrastructureUtils: {
          createTestResourceSpec: vi.fn(() => ({ region: 'iad', volume_size_gb: 1 })),
          pollUntilActive: vi.fn()
        }
      }));
    });

    it('should render GitHubConnectPanel within MissionControlV2', async () => {
      const mockStatus: GitHubStatus = { connected: false };
      mockACSClient.github.getStatus.mockResolvedValue(mockStatus);

      const wrapper = createWrapper();
      render(<MissionControlV2 />, { wrapper });

      // Should render the GitHub connect panel within the mission control interface
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /connect github/i })).toBeInTheDocument();
      });

      // Should also have other mission control elements
      expect(screen.getByTestId('mc-header')).toBeInTheDocument();
      expect(screen.getByTestId('layout-split')).toBeInTheDocument();
    });

    it('should show connected GitHub state in MissionControlV2', async () => {
      const mockStatus: GitHubStatus = { 
        connected: true, 
        repo: 'owner/test-repo',
        installation_id: 12345 
      };
      const mockRepos: GitHubRepo[] = [
        { id: 1, full_name: 'owner/test-repo', private: false, default_branch: 'main' }
      ];

      mockACSClient.github.getStatus.mockResolvedValue(mockStatus);
      mockACSClient.github.listRepos.mockResolvedValue(mockRepos);

      const wrapper = createWrapper();
      render(<MissionControlV2 />, { wrapper });

      // Should show connected state
      await waitFor(() => {
        expect(screen.getByText('GitHub Connected')).toBeInTheDocument();
        expect(screen.getByText('Repository: owner/test-repo')).toBeInTheDocument();
      });
    });
  });
});