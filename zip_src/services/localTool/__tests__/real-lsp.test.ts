import { describe, it, expect, beforeAll, vi } from 'vitest';
import { LocalToolOrchestrator } from '../LocalToolOrchestrator';
import { setBaseUrl } from '../httpLspClient';

// Mock all the stores that the orchestrator depends on
vi.mock('@/stores/pendingToolsStore', () => ({
  usePendingToolsStore: {
    subscribe: vi.fn(() => vi.fn()),
    getState: vi.fn(() => ({
      jobs: {},
      prefs: {},
      enqueue: vi.fn(),
      dequeueApproved: vi.fn(() => null),
      dequeueRejected: vi.fn(() => null)
    }))
  }
}));

vi.mock('@/stores/sessionPermissionsStore', () => ({
  useSessionPermissionsStore: vi.fn(),
  sessionPermissionsUtils: {
    getOrCreateSessionPermissions: vi.fn(() => Promise.resolve({
      accessPolicy: {
        whitelist: ['/Users/tim/Code/serena-lsp'],
        blacklist: [],
        shell_forbidden_patterns: []
      },
      isCustomized: false,
      lastModified: Date.now()
    }))
  }
}));

vi.mock('@/stores/settingsStore', () => ({
  useSettingsStore: {
    getState: vi.fn(() => ({
      settings: {
        vault: {
          path: '/Users/tim/Code/vault'
        }
      }
    }))
  }
}));

vi.mock('@/config/approvalTools', () => ({
  requiresApproval: vi.fn(() => false)
}));

// Mock @tauri-apps/api/core
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue({ port: 8123 }),
}));

// Simple mock for FirehoseMux
class FakeMux {
  private listeners: Function[] = [];

  subscribe(callback: Function) {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  emitEvent(event: any) {
    this.listeners.forEach(callback => callback(event));
  }
}

describe('Real LSP Server Test', () => {
  let orchestrator: LocalToolOrchestrator;
  let fakeMux: FakeMux;
  let acsStubReceivedPosts: any[] = [];
  let originalFetch: any;

  beforeAll(async () => {
    // Store original fetch
    originalFetch = global.fetch;
    
    // Set up LSP client to use real server
    setBaseUrl('http://127.0.0.1:8123');
    
    // Wait for LSP server to be ready
    await waitForLspReady();
  });

  beforeAll(() => {
    // Mock fetch to only capture ACS posts, let everything else through
    global.fetch = vi.fn().mockImplementation(async (url, options) => {
      // Capture ACS posts
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
      
      // Let all other requests (including LSP) go to real destinations
      return originalFetch(url, options);
    });
  });

  beforeAll(() => {
    acsStubReceivedPosts = [];
    
    // Create fake mux and orchestrator
    fakeMux = new FakeMux();
    orchestrator = new LocalToolOrchestrator(fakeMux as any, {
      acsApi: 'http://localhost:3000' // dummy ACS API
    });
  });

  async function waitForLspReady(maxAttempts = 50, delayMs = 100): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await originalFetch('http://127.0.0.1:8123/health');
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

  it('should execute get_symbols_overview and get real results', async () => {
    // Start orchestrator
    await orchestrator.start();
    
    // Check if LSP tools were discovered
    const lspTools = Array.from((orchestrator as any).lspTools);
    console.log('LSP tools discovered:', lspTools);
    expect(lspTools).toContain('get_symbols_overview');
    
    // Emit event for get_symbols_overview
    const jobId = 'test-job-123';
    const toolUseId = 'test-tool-456';
    const sessionId = 'test-session-123';
    
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
          tool_input: { max_items: 10 }
        }
      }
    });
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('ACS posts received:', acsStubReceivedPosts.length);
    console.log('All ACS posts:', JSON.stringify(acsStubReceivedPosts, null, 2));
    
    // Just check that we got at least one result
    expect(acsStubReceivedPosts.length).toBeGreaterThan(0);
    
    const result = acsStubReceivedPosts[0];
    console.log('First LSP result:', JSON.stringify(result, null, 2));
    
    expect(result.job_outcome.status).toBe('success');
    expect(result.job_outcome.result_payload).toBeDefined();
    expect(result.job_outcome.result_payload.data).toBeDefined();
  }, 10000);

  it('should execute ping_language_server and get real results', async () => {
    acsStubReceivedPosts = []; // Reset
    
    // Start orchestrator
    await orchestrator.start();
    
    // Emit event for ping_language_server
    const jobId = 'test-job-456';
    const toolUseId = 'test-tool-789';
    const sessionId = 'test-session-456';
    
    fakeMux.emitEvent({
      event_type: 'waiting_local_tool',
      session_id: sessionId,
      event_id: 'event-456',
      message_id: 'msg-456',
      timestamp: Date.now(),
      data: {
        job_instruction: {
          job_id: jobId,
          tool_use_id: toolUseId,
          tool_name: 'ping_language_server',
          cwd: '/Users/tim/Code/serena-lsp',
          tool_input: {}
        }
      }
    });
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('ACS posts received:', acsStubReceivedPosts.length);
    console.log('All ping results:', JSON.stringify(acsStubReceivedPosts, null, 2));
    
    // Just check that we got at least one result
    expect(acsStubReceivedPosts.length).toBeGreaterThan(0);
    
    const result = acsStubReceivedPosts[0];
    console.log('First ping result:', JSON.stringify(result, null, 2));
    
    expect(result.job_outcome.status).toBe('success');
    expect(result.job_outcome.result_payload).toBeDefined();
    expect(result.job_outcome.result_payload.data).toBeDefined();
    expect(result.job_outcome.result_payload.data.ready).toBeDefined();
  }, 10000);
});