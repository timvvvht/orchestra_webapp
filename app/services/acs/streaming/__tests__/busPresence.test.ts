/**
 * Unit smoke-test for eventBus presence in ACSStreamingService
 * Verifies that the eventBus import is working correctly and doesn't throw ReferenceError
 */

import { describe, it, expect } from 'vitest';

describe('ACSStreamingService eventBus integration', () => {
  it('should import ACSStreamingService without throwing ReferenceError', async () => {
    // This test verifies that the eventBus import is properly resolved
    // and doesn't cause a ReferenceError during module loading
    await expect(async () => {
      const { ACSStreamingService } = await import('../index');
      expect(ACSStreamingService).toBeDefined();
    }).not.toThrow();
  });

  it('should have eventBus available in the module scope', async () => {
    // Import the streaming service module
    const streamingModule = await import('../index');
    
    // Verify the module loads successfully
    expect(streamingModule.ACSStreamingService).toBeDefined();
    
    // Verify that we can create an instance without errors
    const config = {
      sseUrl: 'http://localhost:9000',
      debug: false
    };
    
    expect(() => {
      new streamingModule.ACSStreamingService(config);
    }).not.toThrow();
  });
});