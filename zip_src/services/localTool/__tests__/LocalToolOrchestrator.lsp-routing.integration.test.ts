import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { createServer, Server } from 'http';
import { LocalToolOrchestrator } from '../LocalToolOrchestrator';

// Skip on CI unless explicitly enabled
const isIntegrationEnabled = !process.env.CI || process.env.VITE_INTEGRATION === 'true';

// Mock @tauri-apps/api/core to return fixed port
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue({ port: 8123 }),
}));

import { invoke } from '@tauri-apps/api/core';
const mockInvoke = vi.mocked(invoke);

// Mock FirehoseMux that matches the real interface
class FakeMux {
  private listeners: Function[] = [];

  // FirehoseMux.subscribe() takes only a callback, not an eventType
  subscribe(callback: Function) {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Emit ACSRawEvent structure
  emitEvent(event: any) {
    this.listeners.forEach(callback => callback(event));
  }
}

describe.skipIf(!isIntegrationEnabled)('LocalToolOrchestrator LSP Routing Integration', () => {
  let lspProcess: ChildProcess | null = null;
  let acsStubServer: Server | null = null;
  let acsStubPort: number;
  let acsStubReceivedPosts: any[] = [];
  let orchestrator: LocalToolOrchestrator;
  let fakeMux: FakeMux;

  beforeAll(async () => {
    // Store original fetch for LSP forwarding
    (global as any).__REAL_FETCH__ = global.fetch;

    // Start ACS stub server on random port
    acsStubServer = createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/acs/local-tool/result') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            acsStubReceivedPosts.push(data);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
          }
        });
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    // Mock fetch to only handle ACS requests, let LSP requests go to real server
    global.fetch = vi.fn().mockImplementation(async (url, options) => {
      // Let LSP requests go to the real server
      if (url.includes('127.0.0.1:8123')) {
        const realFetch = (global as any).__REAL_FETCH__;
        return realFetch(url, options);
      }
      
      // Handle ACS requests - capture and respond
      if (url.includes('/acs/local-tool/result')) {
        const body = options?.body ? JSON.parse(options.body as string) : null;
        if (body) {
          acsStubReceivedPosts.push(body);
        }
        return {
          ok: true,
          json: async () => ({ success: true })
        };
      }
      
      // For other requests, return success
      return {
        ok: true,
        json: async () => ({ status: 'ok' })
      };
    });

    // Listen on random port
    await new Promise<void>((resolve) => {
      acsStubServer!.listen(0, () => {
        acsStubPort = (acsStubServer!.address() as any).port;
        resolve();
      });
    });

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

    // Cleanup ACS stub server
    if (acsStubServer) {
      acsStubServer.close();
    }
  });

  beforeEach(() => {
    // Reset mocks and state
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue({ port: 8123 });
    acsStubReceivedPosts = [];
    
    // Store original fetch for LSP requests
    (global as any).__REAL_FETCH__ = global.fetch;
    
    // Create fresh instances
    fakeMux = new FakeMux();
    orchestrator = new LocalToolOrchestrator(fakeMux as any, {
      acsApi: `http://127.0.0.1:${acsStubPort}`
    });
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

  it('should route LSP tool execution through real HTTP and post results to ACS', async () => {
    // Add debugging to capture console logs
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const logs: string[] = [];
    
    console.log = (...args) => {
      logs.push(`[LOG] ${args.join(' ')}`);
      originalConsoleLog(...args);
    };
    console.error = (...args) => {
      logs.push(`[ERROR] ${args.join(' ')}`);
      originalConsoleError(...args);
    };

    try {
      // Start orchestrator
      await orchestrator.start();
      console.log('Orchestrator started, LSP tools:', Array.from((orchestrator as any).lspTools));

      // Emit a waiting_local_tool event for get_symbols_overview in ACSRawEvent format
      const jobId = 'test-job-123';
      const toolUseId = 'test-tool-456';
      const sessionId = 'test-session-123';
      
      console.log('Emitting waiting_local_tool event...');
      fakeMux.emitEvent({
        event_type: 'waiting_local_tool',
        session_id: sessionId,
        event_id: 'event-123',
        message_id: 'msg-123',
        timestamp: Date.now(),
        data: {
          job_instruction: {
            job_id: jobId,
            tool_use_id: toolUseId,
            tool_name: 'get_symbols_overview',
            cwd: '/Users/tim/Code/serena-lsp',
            tool_input: {}
          }
        }
      });

      // Wait for processing
      console.log('Waiting for processing...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Debug: Log what we received
      console.log('ACS stub received posts:', JSON.stringify(acsStubReceivedPosts, null, 2));
      console.log('Total posts received:', acsStubReceivedPosts.length);

      // Print all captured logs for debugging
      console.log('=== CAPTURED LOGS ===');
      logs.forEach(log => console.log(log));
      console.log('=== END LOGS ===');

      // Assert ACS stub received the result
      expect(acsStubReceivedPosts).toHaveLength(1);
      
      const postedResult = acsStubReceivedPosts[0];
      expect(postedResult.session_id).toBe(sessionId);
      expect(postedResult.job_outcome.job_id).toBe(jobId);
      
      // Debug: Log the actual status and result payload
      console.log('Job outcome status:', postedResult.job_outcome.status);
      console.log('Job outcome result_payload:', JSON.stringify(postedResult.job_outcome.result_payload, null, 2));
      if (postedResult.job_outcome.error_message) {
        console.log('Job outcome error:', postedResult.job_outcome.error_message);
      }
      
      expect(postedResult.job_outcome.status).toBe('success');
      expect(postedResult.job_outcome.tool_use_id).toBe(toolUseId);
      
      // Verify we got real LSP data
      expect(postedResult.job_outcome.result_payload).toBeDefined();
      expect(postedResult.job_outcome.result_payload.data).toBeDefined();
      
      // Verify the orchestrator made the correct HTTP call
      expect(mockInvoke).toHaveBeenCalledWith('lsp_start_server');
    } finally {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    }
  }, 15000);

  it('should pass project_root and tool_kwargs in correct format', async () => {
    // Start orchestrator
    await orchestrator.start();

    // Mock fetch to capture the request
    const originalFetch = (global as any).__REAL_FETCH__ || global.fetch;
    let capturedRequest: any = null;
    
    global.fetch = vi.fn().mockImplementation(async (url, options) => {
      if (url.includes('/execute_job')) {
        capturedRequest = {
          url,
          method: options?.method,
          body: options?.body ? JSON.parse(options.body as string) : null,
          headers: options?.headers
        };
        
        // Forward to real server and return its response
        return originalFetch(url, options);
      }
      
      // Forward LSP requests to real server
      if (url.includes('127.0.0.1:8123')) {
        return originalFetch(url, options);
      }
      
      // Fall back to original fetch for other requests
      return originalFetch(url, options);
    });

    try {
      // Emit a waiting_local_tool event in ACSRawEvent format
      const jobId = 'test-job-789';
      const sessionId = 'test-session-789';
      const cwd = '/Users/tim/Code/serena-lsp';
      
      fakeMux.emitEvent({
        event_type: 'waiting_local_tool',
        session_id: sessionId,
        event_id: 'event-789',
        message_id: 'msg-789',
        timestamp: Date.now(),
        data: {
          job_instruction: {
            job_id: jobId,
            tool_use_id: 'test-tool-789',
            tool_name: 'find_symbol',
            cwd: cwd,
            tool_input: { name_path: 'test_symbol' }
          }
        }
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify the request format
      expect(capturedRequest).not.toBeNull();
      expect(capturedRequest.url).toBe('http://127.0.0.1:8123/execute_job');
      expect(capturedRequest.method).toBe('POST');
      expect(capturedRequest.body).toEqual({
        project_root: cwd,
        tool_name: 'find_symbol',
        tool_kwargs: { name_path: 'test_symbol' }
      });
      
    } finally {
      // Restore original fetch
      global.fetch = originalFetch;
    }
  }, 10000);
});