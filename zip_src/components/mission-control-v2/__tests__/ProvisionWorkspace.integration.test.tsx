import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MissionControlV2 from '../MissionControlV2';
import { getDefaultACSClient } from '@/services/acs';
import { InfrastructureUtils } from '@/services/acs/infrastructure';

// Mock the ACS client
vi.mock('@/services/acs', () => ({
  getDefaultACSClient: vi.fn()
}));

// Mock the infrastructure utils
vi.mock('@/services/acs/infrastructure', () => ({
  InfrastructureUtils: {
    createTestResourceSpec: vi.fn(() => ({ region: 'iad', volume_size_gb: 1 })),
    pollUntilActive: vi.fn()
  }
}));

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
  useMissionControlStore: vi.fn(() => mockStore),
  // Add getState method for the store
  useMissionControlStore: Object.assign(
    vi.fn(() => mockStore),
    {
      getState: vi.fn(() => mockStore)
    }
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

describe('Provision Workspace Integration', () => {
  let mockACSClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockACSClient = {
      infrastructure: {
        provisionAppPerUser: vi.fn(),
        getAppPerUserStatus: vi.fn()
      }
    };
    
    (getDefaultACSClient as any).mockReturnValue(mockACSClient);
  });

  it('should render provision workspace button in idle state', () => {
    const wrapper = createWrapper();
    render(<MissionControlV2 />, { wrapper });

    const provisionButton = screen.getByRole('button', { name: /provision/i });
    expect(provisionButton).toBeInTheDocument();
    expect(provisionButton).not.toBeDisabled();
    expect(screen.getByText('Provision')).toBeInTheDocument();
  });

  it('should handle successful workspace provisioning', async () => {
    const wrapper = createWrapper();
    
    // Mock successful provisioning
    mockACSClient.infrastructure.provisionAppPerUser.mockResolvedValue({
      data: { status: 'provisioning' }
    });
    
    const mockStatus = {
      status: 'active',
      app_status: 'running',
      app_url: 'https://test-workspace.fly.dev'
    };
    
    (InfrastructureUtils.pollUntilActive as any).mockResolvedValue(mockStatus);

    render(<MissionControlV2 />, { wrapper });

    const provisionButton = screen.getByRole('button', { name: /provision/i });
    fireEvent.click(provisionButton);

    // Should show provisioning state
    await waitFor(() => {
      expect(screen.getByText('Provisioning...')).toBeInTheDocument();
    });

    // Should show active state after completion
    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
    }, { timeout: 1000 });

    // Verify ACS calls
    expect(mockACSClient.infrastructure.provisionAppPerUser).toHaveBeenCalledWith({
      resource_spec: { region: 'iad', volume_size_gb: 1 }
    });
    expect(InfrastructureUtils.pollUntilActive).toHaveBeenCalled();
  });

  it('should handle provisioning errors', async () => {
    const wrapper = createWrapper();
    
    // Mock provisioning failure
    const errorMessage = 'Provisioning failed: insufficient resources';
    mockACSClient.infrastructure.provisionAppPerUser.mockRejectedValue(
      new Error(errorMessage)
    );

    render(<MissionControlV2 />, { wrapper });

    const provisionButton = screen.getByRole('button', { name: /provision/i });
    fireEvent.click(provisionButton);

    // Should show provisioning state initially
    await waitFor(() => {
      expect(screen.getByText('Provisioning...')).toBeInTheDocument();
    });

    // Should show error state
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
    }, { timeout: 1000 });

    // Error should be displayed in tooltip/title
    const errorButton = screen.getByRole('button', { name: /error/i });
    expect(errorButton).toHaveAttribute('title', errorMessage);
  });

  it('should handle polling timeout errors', async () => {
    const wrapper = createWrapper();
    
    // Mock successful initial provisioning but polling timeout
    mockACSClient.infrastructure.provisionAppPerUser.mockResolvedValue({
      data: { status: 'provisioning' }
    });
    
    const timeoutError = new Error('Polling timeout: Infrastructure did not become active within 300000ms');
    (InfrastructureUtils.pollUntilActive as any).mockRejectedValue(timeoutError);

    render(<MissionControlV2 />, { wrapper });

    const provisionButton = screen.getByRole('button', { name: /provision/i });
    fireEvent.click(provisionButton);

    // Should show error state after timeout
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
    }, { timeout: 1000 });

    // Should show timeout error message
    const errorButton = screen.getByRole('button', { name: /error/i });
    expect(errorButton).toHaveAttribute('title', timeoutError.message);
  });

  it('should disable button during provisioning', async () => {
    const wrapper = createWrapper();
    
    // Mock slow provisioning
    mockACSClient.infrastructure.provisionAppPerUser.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ data: {} }), 100))
    );
    
    (InfrastructureUtils.pollUntilActive as any).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ 
        status: 'active', 
        app_url: 'https://test.fly.dev' 
      }), 200))
    );

    render(<MissionControlV2 />, { wrapper });

    const provisionButton = screen.getByRole('button', { name: /provision/i });
    fireEvent.click(provisionButton);

    // Button should be disabled during provisioning
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /provisioning/i });
      expect(button).toBeDisabled();
    });
  });

  it('should show progress text during provisioning', async () => {
    const wrapper = createWrapper();
    
    // Mock provisioning that takes some time
    mockACSClient.infrastructure.provisionAppPerUser.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ data: {} }), 50))
    );
    
    (InfrastructureUtils.pollUntilActive as any).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ 
        status: 'active', 
        app_url: 'https://workspace.fly.dev' 
      }), 100))
    );

    render(<MissionControlV2 />, { wrapper });

    const provisionButton = screen.getByRole('button', { name: /provision/i });
    fireEvent.click(provisionButton);

    // Should show initial progress text
    await waitFor(() => {
      expect(screen.getByText('Provisioning workspace...')).toBeInTheDocument();
    });

    // Should show waiting text
    await waitFor(() => {
      expect(screen.getByText('Waiting for workspace to become active...')).toBeInTheDocument();
    });

    // Should show final success text in button title
    await waitFor(() => {
      const activeButton = screen.getByRole('button', { name: /active/i });
      expect(activeButton).toHaveAttribute('title', 'Active at https://workspace.fly.dev');
    });
  });
});