import { describe, it, expect, beforeEach, vi } from 'vitest';
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
    console.log('FakeMux emitting event:', event);
    this.listeners.forEach(callback => {
      console.log('Calling listener with event');
      callback(event);
    });
  }
}

describe('Simple Orchestrator Test', () => {
  let orchestrator: LocalToolOrchestrator;
  let fakeMux: FakeMux;
  let acsStubReceivedPosts: any[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    acsStubReceivedPosts = [];
    
    // Store original fetch
    (global as any).__REAL_FETCH__ = global.fetch;
    
    // Set up LSP client
    setBaseUrl('http://127.0.0.1:8123');
    
    // Create fake mux and orchestrator
    fakeMux = new FakeMux();
    orchestrator = new LocalToolOrchestrator(fakeMux as any, {
      acsApi: 'http://localhost:3000' // dummy ACS API
    });

    // Mock fetch to capture ACS posts and handle LSP requests
    global.fetch = vi.fn().mockImplementation(async (url, options) => {
      console.log('Fetch called with:', url, options);
      
      if (url.includes('/acs/local-tool/result')) {
        const body = options?.body ? JSON.parse(options.body as string) : null;
        console.log('ACS post captured:', body);
        acsStubReceivedPosts.push(body);
        
        return {
          ok: true,
          json: async () => ({ success: true })
        };
      }
      
      // Handle LSP server requests by forwarding to real server
      if (url.includes('127.0.0.1:8123')) {
        console.log('Forwarding LSP request to real server:', url);
        const realFetch = (global as any).__REAL_FETCH__ || fetch;
        return realFetch(url, options);
      }
      
      // For other requests, return success
      return {
        ok: true,
        json: async () => ({ status: 'ok' })
      };
    });
  });

  it('should handle a simple LSP tool execution', async () => {
    console.log('Starting test...');
    
    // Start orchestrator
    await orchestrator.start();
    console.log('Orchestrator started');
    
    // Check if LSP tools were discovered
    const lspTools = Array.from((orchestrator as any).lspTools);
    console.log('LSP tools discovered:', lspTools);
    
    // Emit a simple event
    const jobId = 'test-job-123';
    const toolUseId = 'test-tool-456';
    const sessionId = 'test-session-123';
    
    console.log('Emitting event...');
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
          tool_name: 'ping_language_server',
          cwd: '/Users/tim/Code/serena-lsp',
          tool_input: {}
        }
      }
    });
    
    // Wait for processing
    console.log('Waiting for processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('ACS posts received:', acsStubReceivedPosts.length);
    console.log('Posts:', JSON.stringify(acsStubReceivedPosts, null, 2));
    
    // Basic assertions
    expect(lspTools.length).toBeGreaterThan(0);
    expect(lspTools).toContain('ping_language_server');
  }, 10000);
});