import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocalToolOrchestrator } from '../LocalToolOrchestrator';
import { FirehoseMux } from './helpers/mockMux';
import type { ACSRawEvent } from '@/services/acs/streaming/FirehoseMux';
import { sessionPermissionsUtils } from '@/stores/sessionPermissionsStore';

// Mock ensureLspServer to throw an error
vi.mock('../lspServerBootstrap', () => ({
  ensureLspServer: vi.fn().mockRejectedValue(new Error('LSP manager not ready'))
}));

// Mock Tauri environment
const mockInvoke = vi.fn();
Object.defineProperty(globalThis, 'window', {
  value: {
    __TAURI__: {
      core: {
        invoke: mockInvoke
      }
    }
  },
  writable: true
});

// Mock stores
vi.mock('@/stores/pendingToolsStore', () => ({
  usePendingToolsStore: {
    subscribe: vi.fn(),
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
    getOrCreateSessionPermissions: vi.fn()
  }
}));

vi.mock('@/stores/settingsStore', () => ({
  useSettingsStore: {
    getState: vi.fn(() => ({
      settings: {
        vault: {
          path: '/test/vault'
        }
      }
    }))
  }
}));

describe('LocalToolOrchestrator - Degraded Start', () => {
  let orchestrator: LocalToolOrchestrator;
  let mockFirehose: FirehoseMux;
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
    // Create mock firehose
    mockFirehose = new FirehoseMux();
    
    // Create orchestrator
    orchestrator = new LocalToolOrchestrator(mockFirehose as any, {
      acsApi: 'http://localhost:8080'
    });

    // Mock native tools list
    mockInvoke.mockImplementation((command) => {
      if (command === 'list_native_tools') {
        return Promise.resolve(['search_files', 'read_files', 'str_replace_editor']);
      }
      return Promise.resolve({ status: 'success', output: 'test result' });
    });

    // Set up sessionPermissionsUtils mock
    vi.mocked(sessionPermissionsUtils.getOrCreateSessionPermissions).mockResolvedValue({
      isCustomized: false,
      lastModified: 1234567890,
      accessPolicy: {
        whitelist: ['/workspace'],
        blacklist: [],
        shell_forbidden_patterns: []
      }
    });

    // Spy on console methods
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    vi.clearAllMocks();
  });

  afterEach(() => {
    orchestrator.stop();
    mockFirehose.clearListeners();
    vi.restoreAllMocks();
  });

  it('should subscribe to events even when LSP bootstrap fails', async () => {
    // Verify no listeners initially
    expect(mockFirehose.getListenerCount()).toBe(0);

    // Start orchestrator - LSP will fail but subscription should succeed
    await orchestrator.start();

    // Verify subscription occurred despite LSP failure
    expect(mockFirehose.getListenerCount()).toBe(1);

    // Verify error was logged for LSP failure
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[LTO] LSP bootstrap failed, continuing in degraded mode:',
      expect.any(Error)
    );
  });

  it('should process events in degraded mode (LSP unavailable)', async () => {
    // Start orchestrator in degraded mode
    await orchestrator.start();

    // Mock fetch for ACS outcome posting
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
    global.fetch = mockFetch;

    // Create a waiting_local_tool event for a non-native tool (should be rejected)
    const testEvent: ACSRawEvent = {
      event_type: 'waiting_local_tool',
      session_id: 'test-session',
      event_id: 'event-123',
      message_id: 'msg-123',
      data: {
        job_instruction: {
          schema_version: '1.0.0',
          job_id: 'test-job-123',
          tool_use_id: 'tool-use-123',
          session_id: 'test-session',
          cwd: '/workspace',
          tool_name: 'non_native_lsp_tool',
          tool_input: { test: 'data' }
        }
      }
    };

    // Emit the event
    mockFirehose.emit(testEvent);

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 10));

    // Verify warning was logged for LSP unavailable
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[LTO] LSP unavailable – rejecting job',
      'non_native_lsp_tool'
    );

    // Verify rejection outcome was sent to ACS
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8080/acs/local-tool/result',
      expect.objectContaining({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: expect.stringContaining('LSP HTTP unavailable')
      })
    );
  });

  it('should still execute native tools in degraded mode', async () => {
    // Start orchestrator in degraded mode
    await orchestrator.start();

    // Mock fetch for ACS outcome posting
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
    global.fetch = mockFetch;

    // Create a waiting_local_tool event for a native tool
    const testEvent: ACSRawEvent = {
      event_type: 'waiting_local_tool',
      session_id: 'test-session',
      event_id: 'event-456',
      message_id: 'msg-456',
      data: {
        job_instruction: {
          schema_version: '1.0.0',
          job_id: 'test-job-456',
          tool_use_id: 'tool-use-456',
          session_id: 'test-session',
          cwd: '/workspace',
          tool_name: 'search_files',
          tool_input: { 
            root: '/workspace',
            content: 'test'
          }
        }
      }
    };

    // Emit the event
    mockFirehose.emit(testEvent);

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 10));

    // Verify native tool was executed via Tauri
    expect(mockInvoke).toHaveBeenCalledWith(
      'tool_search_files',
      expect.objectContaining({
        input: { root: '/workspace', content: 'test' },
        cwd: '/workspace',
        vault_path: '/test/vault'
      })
    );

    // Verify success outcome was sent to ACS
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8080/acs/local-tool/result',
      expect.objectContaining({
        method: 'POST',
        headers: { 'content-type': 'application/json' }
      })
    );
  });

  it('should properly clean up subscription on stop', async () => {
    // Start orchestrator
    await orchestrator.start();
    expect(mockFirehose.getListenerCount()).toBe(1);

    // Stop orchestrator
    orchestrator.stop();
    expect(mockFirehose.getListenerCount()).toBe(0);
  });
});