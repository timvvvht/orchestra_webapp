/**
 * Test for the simple cancelConversation utility function
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cancelConversation } from '../cancelConversation';

// Mock the ACS client
const mockPost = vi.fn();
const mockGetClient = vi.fn(() => ({
  post: mockPost
}));

vi.mock('@/services/acs', () => ({
  getDefaultACSClient: vi.fn(() => ({
    getClient: mockGetClient
  }))
}));

describe('cancelConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should make a POST request to /acs/converse/cancel with session_id', async () => {
    const sessionId = 'test-session-123';
    mockPost.mockResolvedValue({ status: 200, data: {} });

    await cancelConversation(sessionId);

    expect(mockPost).toHaveBeenCalledWith('/acs/converse/cancel', {
      session_id: sessionId
    });
  });

  it('should throw error if no session ID provided', async () => {
    await expect(cancelConversation('')).rejects.toThrow('Session ID is required');
  });

  it('should handle API errors gracefully', async () => {
    const sessionId = 'test-session-123';
    const apiError = new Error('API Error');
    mockPost.mockRejectedValue(apiError);

    await expect(cancelConversation(sessionId)).rejects.toThrow('Failed to cancel conversation: API Error');
  });

  it('should log success when API call succeeds', async () => {
    const sessionId = 'test-session-123';
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockPost.mockResolvedValue({ status: 200, data: { success: true } });

    await cancelConversation(sessionId);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('✅ SUCCESS! Conversation cancelled'),
      expect.objectContaining({ sessionId })
    );

    consoleSpy.mockRestore();
  });
});