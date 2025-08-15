import { vi } from 'vitest';

// Test the LSP client directly
import { lspClient, setBaseUrl } from '../httpLspClient';

describe('Simple LSP Test', () => {
  beforeAll(() => {
    // Set the base URL to our running server
    setBaseUrl('http://127.0.0.1:8123');
  });

  it('should call LSP tools directly', async () => {
    try {
      // Test listTools
      console.log('Testing listTools...');
      const tools = await lspClient.listTools();
      console.log('Tools:', tools);
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);

      // Test callTool
      console.log('Testing callTool...');
      const result = await lspClient.callTool('ping_language_server', {
        project_root: '/Users/tim/Code/serena-lsp',
        tool_kwargs: {}
      });
      console.log('Result:', result);
      expect(result).toBeDefined();
    } catch (error) {
      console.error('LSP test failed:', error);
      throw error;
    }
  }, 10000);
});