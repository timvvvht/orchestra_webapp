import { describe, it, expect, beforeAll } from 'vitest';
import { useBYOKStore } from '../byokStore';
import { getDefaultACSClient } from '@/services/acs';

/**
 * REAL Integration Tests for BYOK Store
 * 
 * Prerequisites:
 * 1. Test user must be logged in via Google Auth
 * 2. Valid Supabase token must be available
 * 3. ACS backend must be accessible
 * 
 * Run with: npm run test src/stores/__tests__/byokStore.integration.test.ts
 */
describe('BYOK Store - Real Integration Tests', () => {
  let realClient: any;
  let initialToken: string | null;

  beforeAll(async () => {
    // Get the real ACS client
    realClient = getDefaultACSClient();
    initialToken = realClient.getAuthToken();
    
    console.log('🔍 Integration Test Setup:', {
      clientExists: !!realClient,
      hasGetAuthTokenMethod: typeof realClient.getAuthToken === 'function',
      hasRealToken: !!initialToken,
      tokenLength: initialToken?.length || 0,
      tokenPreview: initialToken?.substring(0, 30) + '...' || 'no-token'
    });
  });

  it('should have real authenticated client with token', () => {
    expect(realClient).toBeDefined();
    expect(typeof realClient.getAuthToken).toBe('function');
    expect(initialToken).toBeTruthy();
    expect(initialToken).toMatch(/^ey/); // JWT tokens start with 'ey'
    expect(initialToken!.length).toBeGreaterThan(100); // Real tokens are long
  });

  it('should successfully fetch real key providers with real auth', async () => {
    // Reset store state
    useBYOKStore.setState({
      storedKeyProviders: [],
      isLoadingKeyProviders: false,
      keyProvidersError: null
    });

    // Test the real implementation
    await useBYOKStore.getState().fetchStoredKeyProviders();

    const state = useBYOKStore.getState();
    
    console.log('🔑 Real BYOK Test Results:', {
      providers: state.storedKeyProviders,
      isLoading: state.isLoadingKeyProviders,
      error: state.keyProvidersError
    });

    // Assertions
    expect(state.isLoadingKeyProviders).toBe(false);
    expect(state.keyProvidersError).toBeNull();
    expect(Array.isArray(state.storedKeyProviders)).toBe(true);
    // Note: providers array might be empty if no keys are stored, that's OK
  });

  it('should handle race condition protection with real auth', async () => {
    // Temporarily clear the token to simulate race condition
    const originalSetAuthToken = realClient.setAuthToken;
    const originalGetAuthToken = realClient.getAuthToken;
    
    // Mock a scenario where token is not ready
    realClient.getAuthToken = () => null;
    
    // Reset store
    useBYOKStore.setState({
      storedKeyProviders: [],
      isLoadingKeyProviders: false,
      keyProvidersError: null
    });

    // This should abort gracefully
    await useBYOKStore.getState().fetchStoredKeyProviders();

    const state = useBYOKStore.getState();
    expect(state.keyProvidersError).toBe('Auth not ready');
    expect(state.isLoadingKeyProviders).toBe(false);

    // Restore original methods
    realClient.getAuthToken = originalGetAuthToken;
  });

  it('should work after token is restored', async () => {
    // Ensure token is restored
    expect(realClient.getAuthToken()).toBeTruthy();

    // Reset store
    useBYOKStore.setState({
      storedKeyProviders: [],
      isLoadingKeyProviders: false,
      keyProvidersError: null
    });

    // This should work now
    await useBYOKStore.getState().fetchStoredKeyProviders();

    const state = useBYOKStore.getState();
    expect(state.isLoadingKeyProviders).toBe(false);
    expect(state.keyProvidersError).toBeNull();
  });

  it('should verify getAuthToken method is properly exposed', () => {
    // This tests our main implementation - exposing getAuthToken on public client
    const token = realClient.getAuthToken();
    
    expect(typeof realClient.getAuthToken).toBe('function');
    expect(token).toBe(initialToken); // Should return same token
    
    // Test that it's the same as the underlying client
    const underlyingClient = realClient.getClient();
    expect(realClient.getAuthToken()).toBe(underlyingClient.getAuthToken());
  });
});