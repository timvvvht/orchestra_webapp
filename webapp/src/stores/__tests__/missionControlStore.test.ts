/**
 * Tests for missionControlStore workspace hashing and navigation functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMissionControlStore } from '../missionControlStore';

// Mock crypto.subtle for testing
const mockCrypto = {
  subtle: {
    digest: vi.fn(),
  },
};

// Mock btoa for base64 encoding
const mockBtoa = vi.fn();

// Setup global mocks
beforeEach(() => {
  // Mock crypto.subtle
  Object.defineProperty(global, 'crypto', {
    value: mockCrypto,
    writable: true,
  });

  // Mock btoa
  Object.defineProperty(global, 'btoa', {
    value: mockBtoa,
    writable: true,
  });

  // Mock TextEncoder
  Object.defineProperty(global, 'TextEncoder', {
    value: class TextEncoder {
      encode(input: string) {
        return new Uint8Array(Buffer.from(input, 'utf8'));
      }
    },
    writable: true,
  });

  // Reset all mocks
  vi.clearAllMocks();
});

afterEach(() => {
  // Reset store state
  useMissionControlStore.getState().setWorkspaceKey(null, null);
  useMissionControlStore.getState().setRouterNavigate(null);
});

describe('missionControlStore - Workspace Hashing and Navigation', () => {
  describe('computeHashedWorkspaceId', () => {
    it('should compute hash from workspace key and user ID', async () => {
      const mockDigest = new ArrayBuffer(32);
      const mockBytes = new Uint8Array(mockDigest);
      mockBytes.fill(65); // Fill with 'A' character code
      
      mockCrypto.subtle.digest.mockResolvedValue(mockDigest);
      mockBtoa.mockReturnValue('QUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUE=');

      const store = useMissionControlStore.getState();
      const result = await store.computeHashedWorkspaceId('/workspace', 'user-123');

      expect(mockCrypto.subtle.digest).toHaveBeenCalledWith(
        'SHA-256',
        expect.any(Uint8Array)
      );
      expect(result).toBe('QUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUE');
    });

    it('should create base64url format (no padding, URL-safe chars)', async () => {
      const mockDigest = new ArrayBuffer(32);
      mockCrypto.subtle.digest.mockResolvedValue(mockDigest);
      mockBtoa.mockReturnValue('ABC+/123==');

      const store = useMissionControlStore.getState();
      const result = await store.computeHashedWorkspaceId('/workspace', 'user-123');

      // Should replace + with -, / with _, and remove padding
      expect(result).toBe('ABC-_123');
    });
  });

  describe('setWorkspaceKey', () => {
    it('should set workspace key and compute hashed workspace ID', async () => {
      const mockDigest = new ArrayBuffer(32);
      mockCrypto.subtle.digest.mockResolvedValue(mockDigest);
      mockBtoa.mockReturnValue('hashedworkspaceid123=');

      const store = useMissionControlStore.getState();
      await store.setWorkspaceKey('/workspace', 'user-123');

      const state = useMissionControlStore.getState();
      expect(state.workspaceKey).toBe('/workspace');
      expect(state.hashedWorkspaceId).toBe('hashedworkspaceid123');
    });

    it('should clear state when workspace key or user ID is null', async () => {
      const store = useMissionControlStore.getState();
      
      // First set some values
      await store.setWorkspaceKey('/workspace', 'user-123');
      
      // Then clear with null workspace key
      await store.setWorkspaceKey(null, 'user-123');
      
      const state = useMissionControlStore.getState();
      expect(state.workspaceKey).toBe(null);
      expect(state.hashedWorkspaceId).toBe(null);
    });

    it('should clear state when user ID is null', async () => {
      const store = useMissionControlStore.getState();
      await store.setWorkspaceKey('/workspace', null);
      
      const state = useMissionControlStore.getState();
      expect(state.workspaceKey).toBe('/workspace');
      expect(state.hashedWorkspaceId).toBe(null);
    });
  });

  describe('setRouterNavigate', () => {
    it('should set router navigate function', () => {
      const mockNavigate = vi.fn();
      const store = useMissionControlStore.getState();
      
      store.setRouterNavigate(mockNavigate);
      
      const state = useMissionControlStore.getState();
      expect(state.routerNavigate).toBe(mockNavigate);
    });

    it('should clear router navigate function when null', () => {
      const mockNavigate = vi.fn();
      const store = useMissionControlStore.getState();
      
      // First set
      store.setRouterNavigate(mockNavigate);
      expect(useMissionControlStore.getState().routerNavigate).toBe(mockNavigate);
      
      // Then clear
      store.setRouterNavigate(null);
      expect(useMissionControlStore.getState().routerNavigate).toBe(null);
    });
  });

  describe('navigateToSession', () => {
    it('should set selected session and navigate to project URL', async () => {
      const mockNavigate = vi.fn();
      const store = useMissionControlStore.getState();
      
      // Setup
      store.setRouterNavigate(mockNavigate);
      await store.setWorkspaceKey('/workspace', 'user-123');
      
      // Mock the hash computation
      const mockDigest = new ArrayBuffer(32);
      mockCrypto.subtle.digest.mockResolvedValue(mockDigest);
      mockBtoa.mockReturnValue('abc123==');
      
      // Re-set workspace key to trigger hash computation with mocked crypto
      await store.setWorkspaceKey('/workspace', 'user-123');
      
      // Test navigation
      await store.navigateToSession('session-456');
      
      const state = useMissionControlStore.getState();
      expect(state.selectedSession).toBe('session-456');
      expect(mockNavigate).toHaveBeenCalledWith('/project/abc123/session-456');
    });

    it('should use "unknown" when hashed workspace ID is not available', async () => {
      const mockNavigate = vi.fn();
      const store = useMissionControlStore.getState();
      
      store.setRouterNavigate(mockNavigate);
      // Don't set workspace key, so hashedWorkspaceId will be null
      
      await store.navigateToSession('session-456');
      
      expect(mockNavigate).toHaveBeenCalledWith('/project/unknown/session-456');
    });

    it('should fallback to history.pushState when navigate function not available', async () => {
      const mockPushState = vi.fn();
      Object.defineProperty(window, 'history', {
        value: { pushState: mockPushState },
        writable: true,
      });

      const store = useMissionControlStore.getState();
      await store.setWorkspaceKey('/workspace', 'user-123');
      
      // Mock hash computation
      const mockDigest = new ArrayBuffer(32);
      mockCrypto.subtle.digest.mockResolvedValue(mockDigest);
      mockBtoa.mockReturnValue('abc123==');
      await store.setWorkspaceKey('/workspace', 'user-123');
      
      // Don't set router navigate function
      await store.navigateToSession('session-456');
      
      expect(mockPushState).toHaveBeenCalledWith({}, '', '/project/abc123/session-456');
    });

    it('should do nothing when session ID is empty', async () => {
      const mockNavigate = vi.fn();
      const store = useMissionControlStore.getState();
      
      store.setRouterNavigate(mockNavigate);
      
      await store.navigateToSession('');
      
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(useMissionControlStore.getState().selectedSession).toBe(null);
    });
  });

  describe('initial state', () => {
    it('should initialize workspace state as null', () => {
      const state = useMissionControlStore.getState();
      expect(state.workspaceKey).toBe(null);
      expect(state.hashedWorkspaceId).toBe(null);
      expect(state.routerNavigate).toBe(null);
    });
  });
});