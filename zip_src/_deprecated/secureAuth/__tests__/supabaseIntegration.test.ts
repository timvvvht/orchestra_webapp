/**
 * Supabase OAuth Integration Tests
 * Tests the OAuth callback handling with getSessionFromUrl() fix
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the config
vi.mock('../config', () => ({
  authConfig: {
    supabase: { enabled: true },
    baseUrl: 'https://test-acs.example.com'
  }
}));

// Mock the Supabase client import
vi.mock('@/services/supabase/supabaseClient', () => ({
  supabase: {
    auth: {
      getSessionFromUrl: vi.fn(),
      getSession: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
    }
  }
}));

// Mock SecureTokenManager
vi.mock('../tokenManager', () => ({
  SecureTokenManager: {
    addEventListener: vi.fn()
  }
}));

import { SupabaseOAuthManager } from '../supabaseIntegration';
import { supabase } from '@/services/supabase/supabaseClient';

// Mock fetch for token exchange
global.fetch = vi.fn();

describe('SupabaseOAuthManager.handleOAuthCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        href: 'https://example.com/auth/callback#access_token=test_token&refresh_token=test_refresh&token_type=bearer',
        hash: '#access_token=test_token&refresh_token=test_refresh&token_type=bearer',
        search: ''
      },
      writable: true
    });

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      },
      writable: true
    });

    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'time').mockImplementation(() => {});
    vi.spyOn(console, 'timeEnd').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call getSessionFromUrl when OAuth params are detected', async () => {
    // Mock successful session from URL
    const mockSession = {
      access_token: 'test_token',
      refresh_token: 'test_refresh',
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        app_metadata: { provider: 'google' }
      }
    };

    vi.mocked(supabase.auth.getSessionFromUrl).mockResolvedValue({
      data: { session: mockSession },
      error: null
    });

    // Mock successful token exchange
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        success: true,
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          provider: 'google'
        }
      })
    });

    const result = await SupabaseOAuthManager.handleOAuthCallback();

    // Verify getSessionFromUrl was called
    expect(supabase.auth.getSessionFromUrl).toHaveBeenCalledTimes(1);
    
    // Verify successful result
    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user?.email).toBe('test@example.com');

    // Verify token exchange was called
    expect(global.fetch).toHaveBeenCalledWith(
      'https://test-acs.example.com/api/v1/auth/oauth/exchange',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: expect.stringContaining('supabase')
      })
    );
  });

  it('should handle getSessionFromUrl errors gracefully', async () => {
    // Mock error from getSessionFromUrl
    vi.mocked(supabase.auth.getSessionFromUrl).mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid OAuth parameters' }
    });

    const result = await SupabaseOAuthManager.handleOAuthCallback();

    // Verify getSessionFromUrl was called
    expect(supabase.auth.getSessionFromUrl).toHaveBeenCalledTimes(1);
    
    // Verify error handling
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid OAuth parameters');
  });

  it('should fall back to polling when getSessionFromUrl returns no session', async () => {
    // Mock getSessionFromUrl returning no session
    vi.mocked(supabase.auth.getSessionFromUrl).mockResolvedValue({
      data: { session: null },
      error: null
    });

    // Mock getSession returning session after polling
    const mockSession = {
      access_token: 'test_token',
      refresh_token: 'test_refresh',
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        app_metadata: { provider: 'google' }
      }
    };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
      error: null
    });

    // Mock successful token exchange
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        success: true,
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          provider: 'google'
        }
      })
    });

    const result = await SupabaseOAuthManager.handleOAuthCallback();

    // Verify both methods were called
    expect(supabase.auth.getSessionFromUrl).toHaveBeenCalledTimes(1);
    expect(supabase.auth.getSession).toHaveBeenCalled();
    
    // Verify successful result
    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
  });

  it('should handle URLs without OAuth parameters', async () => {
    // Mock URL without OAuth params
    Object.defineProperty(window, 'location', {
      value: {
        href: 'https://example.com/auth/callback',
        hash: '',
        search: ''
      },
      writable: true
    });

    // Mock existing session
    const mockSession = {
      access_token: 'existing_token',
      refresh_token: 'existing_refresh',
      user: {
        id: 'existing-user-id',
        email: 'existing@example.com',
        app_metadata: { provider: 'google' }
      }
    };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
      error: null
    });

    // Mock successful token exchange
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        success: true,
        user: {
          id: 'existing-user-id',
          email: 'existing@example.com',
          name: 'Existing User',
          provider: 'google'
        }
      })
    });

    const result = await SupabaseOAuthManager.handleOAuthCallback();

    // Verify getSessionFromUrl was NOT called (no OAuth params)
    expect(supabase.auth.getSessionFromUrl).not.toHaveBeenCalled();
    
    // Verify getSession was called directly
    expect(supabase.auth.getSession).toHaveBeenCalledTimes(1);
    
    // Verify successful result
    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
  });

  it('should include verbose logging for debugging', async () => {
    const consoleSpy = vi.spyOn(console, 'log');
    
    // Mock successful session from URL
    const mockSession = {
      access_token: 'test_token',
      refresh_token: 'test_refresh',
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        app_metadata: { provider: 'google' }
      }
    };

    vi.mocked(supabase.auth.getSessionFromUrl).mockResolvedValue({
      data: { session: mockSession },
      error: null
    });

    // Mock successful token exchange
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        success: true,
        user: { id: 'test-user-id', email: 'test@example.com' }
      })
    });

    await SupabaseOAuthManager.handleOAuthCallback();

    // Verify verbose logging was called
    expect(consoleSpy).toHaveBeenCalledWith('🪝 URL:', expect.any(String));
    expect(consoleSpy).toHaveBeenCalledWith('🔑 localStorage keys:', expect.any(Array));
    expect(consoleSpy).toHaveBeenCalledWith('⏳ Parsing URL -> localStorage…');
    expect(consoleSpy).toHaveBeenCalledWith('🎉 Session found from URL parsing!', 'test-user-id');
  });
});