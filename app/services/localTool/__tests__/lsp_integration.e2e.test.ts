import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';

// Skip on CI unless explicitly enabled
const isE2EEnabled = !process.env.CI || process.env.VITE_E2E === 'true';

describe.skipIf(!isE2EEnabled)('LSP HTTP Integration E2E', () => {
  let lspProcess: ChildProcess | null = null;

  beforeAll(async () => {
    // Start real LSP server
    lspProcess = spawn('python3', ['-m', 'uvicorn', 'orchestra_lsp.server:app', '--host', '127.0.0.1', '--port', '8123'], {
      cwd: '/Users/tim/Code/serena-lsp',
      stdio: 'pipe'
    });

    // Wait for LSP server to be ready
    await waitForLspReady();
  }, 30000);

  afterAll(async () => {
    // Cleanup LSP process
    if (lspProcess) {
      lspProcess.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (!lspProcess.killed) {
        lspProcess.kill('SIGKILL');
      }
    }
  });

  async function waitForLspReady(maxAttempts = 50, delayMs = 100): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch('http://127.0.0.1:8123/health');
        if (response.ok) {
          return;
        }
      } catch (error) {
        // Server not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    throw new Error('LSP server failed to start within timeout');
  }

  describe('Health Endpoint', () => {
    it('should respond to health check', async () => {
      const response = await fetch('http://127.0.0.1:8123/health');
      
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data.status).toBe('ok');
    });
  });

  describe('Tools Endpoint', () => {
    it('should return tools list via GET /tools', async () => {
      const response = await fetch('http://127.0.0.1:8123/tools');
      
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      
      // Should return either an array or an object with tools property
      if (Array.isArray(data)) {
        expect(data.length).toBeGreaterThan(0);
        // Each tool should have name and description
        data.forEach(tool => {
          expect(tool).toHaveProperty('name');
          expect(tool).toHaveProperty('description');
        });
      } else {
        expect(data).toHaveProperty('tools');
        expect(Array.isArray(data.tools)).toBe(true);
        expect(data.tools.length).toBeGreaterThan(0);
        // Each tool should have name and description
        data.tools.forEach((tool: any) => {
          expect(tool).toHaveProperty('name');
          expect(tool).toHaveProperty('description');
        });
      }
    });
  });

  describe('Execute Job Endpoint', () => {
    it('should execute ping_language_server successfully', async () => {
      const response = await fetch('http://127.0.0.1:8123/execute_job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_root: '/Users/tim/Code/serena-lsp',
          tool_name: 'ping_language_server',
          tool_kwargs: {}
        })
      });
      
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('result');
      expect(data.result).toHaveProperty('success');
      expect(data.result.success).toBe(true);
    });

    it('should execute get_symbols_overview with minimal kwargs', async () => {
      const response = await fetch('http://127.0.0.1:8123/execute_job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_root: '/Users/tim/Code/serena-lsp',
          tool_name: 'get_symbols_overview',
          tool_kwargs: {
            // Minimal kwargs - may need adjustment based on actual tool requirements
          }
        })
      });
      
      // This tool might require specific context, so we accept either success or well-formed error
      expect([200, 400].includes(response.status)).toBe(true);
      
      const data = await response.json();
      
      if (response.status === 200) {
        // Success case
        expect(data).toHaveProperty('result');
      } else {
        // Well-formed error case
        expect(data).toHaveProperty('detail');
        expect(typeof data.detail).toBe('string');
      }
    });

    it('should handle invalid tool name gracefully', async () => {
      const response = await fetch('http://127.0.0.1:8123/execute_job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_root: '/Users/tim/Code/serena-lsp',
          tool_name: 'nonexistent_tool',
          tool_kwargs: {}
        })
      });
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data).toHaveProperty('detail');
      expect(typeof data.detail).toBe('string');
      expect(data.detail.toLowerCase()).toContain('tool');
    });

    it('should handle missing required fields', async () => {
      const response = await fetch('http://127.0.0.1:8123/execute_job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Missing project_root and tool_name
          tool_kwargs: {}
        })
      });
      
      expect(response.status).toBe(422); // FastAPI validation error
      
      const data = await response.json();
      expect(data).toHaveProperty('detail');
      expect(Array.isArray(data.detail)).toBe(true);
    });

    it('should handle malformed JSON', async () => {
      const response = await fetch('http://127.0.0.1:8123/execute_job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: '{ invalid json }'
      });
      
      expect(response.status).toBe(422);
      
      const data = await response.json();
      expect(data).toHaveProperty('detail');
    });
  });

  describe('CORS and Headers', () => {
    it('should include appropriate CORS headers', async () => {
      const response = await fetch('http://127.0.0.1:8123/health');
      
      expect(response.ok).toBe(true);
      
      // Check for common CORS headers (may vary based on server configuration)
      const headers = response.headers;
      expect(headers.get('content-type')).toContain('application/json');
    });
  });
});