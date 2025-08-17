import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useBYOKStore } from '../byokStore';
import { getDefaultACSClient } from '@/services/acs';
import type { OrchestACSClient } from '@/services/acs';

// Mock the ACS client
vi.mock('@/services/acs', () => ({
  getDefaultACSClient: vi.fn()
}));

// Mock Supabase client
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } })
    }
  }
}));

// Mock the models service
const mockListAPIKeys = vi.fn();
const mockModelsService = {
  listAPIKeys: mockListAPIKeys
};

// Mock ACS client
const mockACSClient = {
  getAuthToken: vi.fn(),
  isAuthenticated: vi.fn(),
  models: mockModelsService
} as unknown as OrchestACSClient;

const mockGetDefaultACSClient = vi.mocked(getDefaultACSClient);

describe('BYOK Store', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Reset store state
    useBYOKStore.setState({
      useStoredKeysPreference: true,
      storedKeyProviders: [],
      isLoadingKeyProviders: false,
      keyProvidersError: null
    });
    
    // Setup default mock behavior
    mockGetDefaultACSClient.mockReturnValue(mockACSClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchStoredKeyProviders', () => {
    it('should successfully fetch and process key providers when auth token is present', async () => {
      // Arrange
      mockACSClient.getAuthToken = vi.fn().mockReturnValue('valid-token-123');
      mockACSClient.isAuthenticated = vi.fn().mockReturnValue(true);
      mockListAPIKeys.mockResolvedValue({
        data: [
          { provider_name: 'openai', has_key: true },
          { provider_name: 'anthropic', has_key: true },
          { provider_name: 'google', has_key: false }
        ]
      });

      // Act
      await useBYOKStore.getState().fetchStoredKeyProviders();

      // Assert
      const state = useBYOKStore.getState();
      expect(state.storedKeyProviders).toEqual(['openai', 'anthropic']);
      expect(state.isLoadingKeyProviders).toBe(false);
      expect(state.keyProvidersError).toBeNull();
      expect(mockListAPIKeys).toHaveBeenCalledOnce();
    });

    it('should abort API call when auth token is not ready (race condition protection)', async () => {
      // Arrange
      mockACSClient.getAuthToken = vi.fn().mockReturnValue(null);
      mockACSClient.isAuthenticated = vi.fn().mockReturnValue(false);

      // Act
      await useBYOKStore.getState().fetchStoredKeyProviders();

      // Assert
      const state = useBYOKStore.getState();
      expect(state.keyProvidersError).toBe('Auth not ready');
      expect(state.isLoadingKeyProviders).toBe(false);
      expect(state.storedKeyProviders).toEqual([]);
      expect(mockListAPIKeys).not.toHaveBeenCalled();
    });

    it('should abort API call when auth token is empty string', async () => {
      // Arrange
      mockACSClient.getAuthToken = vi.fn().mockReturnValue('');
      mockACSClient.isAuthenticated = vi.fn().mockReturnValue(false);

      // Act
      await useBYOKStore.getState().fetchStoredKeyProviders();

      // Assert
      const state = useBYOKStore.getState();
      expect(state.keyProvidersError).toBe('Auth not ready');
      expect(state.isLoadingKeyProviders).toBe(false);
      expect(mockListAPIKeys).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      mockACSClient.getAuthToken = vi.fn().mockReturnValue('valid-token-123');
      mockACSClient.isAuthenticated = vi.fn().mockReturnValue(true);
      const apiError = new Error('Network error');
      mockListAPIKeys.mockRejectedValue(apiError);

      // Act
      await useBYOKStore.getState().fetchStoredKeyProviders();

      // Assert
      const state = useBYOKStore.getState();
      expect(state.keyProvidersError).toBe('Network error');
      expect(state.isLoadingKeyProviders).toBe(false);
      expect(state.storedKeyProviders).toEqual([]);
    });

    it('should handle API errors with status codes', async () => {
      // Arrange
      mockACSClient.getAuthToken = vi.fn().mockReturnValue('valid-token-123');
      mockACSClient.isAuthenticated = vi.fn().mockReturnValue(true);
      const apiError = new Error('Unauthorized');
      (apiError as any).status = 401;
      mockListAPIKeys.mockRejectedValue(apiError);

      // Act
      await useBYOKStore.getState().fetchStoredKeyProviders();

      // Assert
      const state = useBYOKStore.getState();
      expect(state.keyProvidersError).toBe('Unauthorized');
      expect(state.isLoadingKeyProviders).toBe(false);
    });

    it('should set loading state correctly during API call', async () => {
      // Arrange
      mockACSClient.getAuthToken = vi.fn().mockReturnValue('valid-token-123');
      mockACSClient.isAuthenticated = vi.fn().mockReturnValue(true);
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      mockListAPIKeys.mockReturnValue(pendingPromise);

      // Act
      const fetchPromise = useBYOKStore.getState().fetchStoredKeyProviders();
      
      // Wait for next tick to allow async operations to start
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Assert loading state
      expect(useBYOKStore.getState().isLoadingKeyProviders).toBe(true);
      expect(useBYOKStore.getState().keyProvidersError).toBeNull();

      // Complete the promise
      resolvePromise!({ data: [] });
      await fetchPromise;

      // Assert final state
      expect(useBYOKStore.getState().isLoadingKeyProviders).toBe(false);
    });

    it('should filter out providers without keys', async () => {
      // Arrange
      mockACSClient.getAuthToken = vi.fn().mockReturnValue('valid-token-123');
      mockACSClient.isAuthenticated = vi.fn().mockReturnValue(true);
      mockListAPIKeys.mockResolvedValue({
        data: [
          { provider_name: 'openai', has_key: true },
          { provider_name: 'anthropic', has_key: false },
          { provider_name: 'google', has_key: true },
          { provider_name: 'cohere', has_key: false }
        ]
      });

      // Act
      await useBYOKStore.getState().fetchStoredKeyProviders();

      // Assert
      const state = useBYOKStore.getState();
      expect(state.storedKeyProviders).toEqual(['openai', 'google']);
    });

    it('should handle empty API response', async () => {
      // Arrange
      mockACSClient.getAuthToken = vi.fn().mockReturnValue('valid-token-123');
      mockACSClient.isAuthenticated = vi.fn().mockReturnValue(true);
      mockListAPIKeys.mockResolvedValue({ data: [] });

      // Act
      await useBYOKStore.getState().fetchStoredKeyProviders();

      // Assert
      const state = useBYOKStore.getState();
      expect(state.storedKeyProviders).toEqual([]);
      expect(state.isLoadingKeyProviders).toBe(false);
      expect(state.keyProvidersError).toBeNull();
    });

    it('should handle null/undefined API response data', async () => {
      // Arrange
      mockACSClient.getAuthToken = vi.fn().mockReturnValue('valid-token-123');
      mockACSClient.isAuthenticated = vi.fn().mockReturnValue(true);
      mockListAPIKeys.mockResolvedValue({ data: null });

      // Act
      await useBYOKStore.getState().fetchStoredKeyProviders();

      // Assert
      const state = useBYOKStore.getState();
      expect(state.storedKeyProviders).toEqual([]);
      expect(state.isLoadingKeyProviders).toBe(false);
      expect(state.keyProvidersError).toBeNull();
    });
  });

  describe('addStoredKeyProvider', () => {
    it('should add a new provider to the list', () => {
      // Arrange
      useBYOKStore.setState({ storedKeyProviders: ['openai'] });

      // Act
      useBYOKStore.getState().addStoredKeyProvider('anthropic');

      // Assert
      expect(useBYOKStore.getState().storedKeyProviders).toEqual(['openai', 'anthropic']);
    });

    it('should not add duplicate providers', () => {
      // Arrange
      useBYOKStore.setState({ storedKeyProviders: ['openai', 'anthropic'] });

      // Act
      useBYOKStore.getState().addStoredKeyProvider('openai');

      // Assert
      expect(useBYOKStore.getState().storedKeyProviders).toEqual(['openai', 'anthropic']);
    });
  });

  describe('removeStoredKeyProvider', () => {
    it('should remove a provider from the list', () => {
      // Arrange
      useBYOKStore.setState({ storedKeyProviders: ['openai', 'anthropic', 'google'] });

      // Act
      useBYOKStore.getState().removeStoredKeyProvider('anthropic');

      // Assert
      expect(useBYOKStore.getState().storedKeyProviders).toEqual(['openai', 'google']);
    });

    it('should handle removing non-existent provider gracefully', () => {
      // Arrange
      useBYOKStore.setState({ storedKeyProviders: ['openai', 'anthropic'] });

      // Act
      useBYOKStore.getState().removeStoredKeyProvider('google');

      // Assert
      expect(useBYOKStore.getState().storedKeyProviders).toEqual(['openai', 'anthropic']);
    });
  });

  describe('setUseStoredKeysPreference', () => {
    it('should update the preference', () => {
      // Arrange
      useBYOKStore.setState({ useStoredKeysPreference: true });

      // Act
      useBYOKStore.getState().setUseStoredKeysPreference(false);

      // Assert
      expect(useBYOKStore.getState().useStoredKeysPreference).toBe(false);
    });
  });

  describe('Type Safety Tests', () => {
    it('should ensure getAuthToken method exists and is callable', () => {
      // This test ensures that the getAuthToken method is properly exposed
      // and prevents the optional chaining issue that was causing silent failures
      
      // Arrange
      mockACSClient.getAuthToken = vi.fn().mockReturnValue('test-token');
      
      // Act
      const client = getDefaultACSClient();
      const token = client.getAuthToken();
      
      // Assert
      expect(typeof client.getAuthToken).toBe('function');
      expect(token).toBe('test-token');
      expect(mockACSClient.getAuthToken).toHaveBeenCalled();
    });

    it('should fail compilation if getAuthToken method is missing', () => {
      // This test ensures TypeScript will catch missing methods at compile time
      // rather than silently failing with optional chaining
      
      const client = getDefaultACSClient();
      
      // This should compile without issues since we've added the method
      const token: string | null = client.getAuthToken();
      
      // If the method was missing, TypeScript would error here
      expect(typeof token === 'string' || token === null).toBe(true);
    });
  });
});