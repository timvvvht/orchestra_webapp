import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocalToolOrchestrator } from '../LocalToolOrchestrator';
import { FirehoseMux } from './helpers/mockMux';
import { sessionPermissionsUtils } from '@/stores/sessionPermissionsStore';

// Mock ensureLspServer to succeed
vi.mock('../lspServerBootstrap', () => ({
  ensureLspServer: vi.fn().mockResolvedValue(12345) // Mock LSP port
}));

// Mock LSP client
vi.mock('../httpLspClient', () => ({
  lspClient: {
    listTools: vi.fn().mockResolvedValue([
      { name: 'lsp_tool_1' },
      { name: 'lsp_tool_2' },
      { name: 'think' }
    ]),
    callTool: vi.fn().mockResolvedValue({ result: 'success' }),
    getBaseUrl: vi.fn().mockReturnValue('http://localhost:12345')
  }
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

describe('LocalToolOrchestrator - Normal Start', () => {
  let orchestrator: LocalToolOrchestrator;
  let mockFirehose: FirehoseMux;
  let consoleErrorSpy: any;

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

    vi.clearAllMocks();
  });

  afterEach(() => {
    orchestrator.stop();
    mockFirehose.clearListeners();
    vi.restoreAllMocks();
  });

  it('should subscribe to events when LSP bootstrap succeeds', async () => {
    // Verify no listeners initially
    expect(mockFirehose.getListenerCount()).toBe(0);

    // Start orchestrator - LSP should succeed
    await orchestrator.start();

    // Verify subscription occurred
    expect(mockFirehose.getListenerCount()).toBe(1);

    // Verify NO error was logged (LSP bootstrap succeeded)
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      '[LTO] LSP bootstrap failed, continuing in degraded mode:',
      expect.any(Error)
    );
  });

  it('should execute both native and LSP tools when LSP is available', async () => {
    // Start orchestrator in normal mode
    await orchestrator.start();

    // Mock fetch for ACS outcome posting
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
    global.fetch = mockFetch;

    // Test native tool execution
    const nativeEvent = {
      event_type: 'waiting_local_tool' as const,
      session_id: 'test-session',
      event_id: 'event-native',
      message_id: 'msg-native',
      data: {
        job_instruction: {
          schema_version: '1.0.0',
          job_id: 'test-job-native',
          tool_use_id: 'tool-use-native',
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

    // Emit native tool event
    mockFirehose.emit(nativeEvent);
    await new Promise(resolve => setTimeout(resolve, 10));

    // Verify native tool was executed
    expect(mockInvoke).toHaveBeenCalledWith(
      'tool_search_files',
      expect.objectContaining({
        input: { root: '/workspace', content: 'test' }
      })
    );

    // Test LSP tool execution
    const lspEvent = {
      event_type: 'waiting_local_tool' as const,
      session_id: 'test-session',
      event_id: 'event-lsp',
      message_id: 'msg-lsp',
      data: {
        job_instruction: {
          schema_version: '1.0.0',
          job_id: 'test-job-lsp',
          tool_use_id: 'tool-use-lsp',
          session_id: 'test-session',
          cwd: '/workspace',
          tool_name: 'think',
          tool_input: { 
            thought: 'test thought'
          }
        }
      }
    };

    // Clear previous fetch calls
    mockFetch.mockClear();

    // Emit LSP tool event
    mockFirehose.emit(lspEvent);
    await new Promise(resolve => setTimeout(resolve, 10));

    // Verify LSP tool outcome was posted (indicating successful execution)
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8080/acs/local-tool/result',
      expect.objectContaining({
        method: 'POST',
        headers: { 'content-type': 'application/json' }
      })
    );
  });

  it('should maintain subscription priority even with successful LSP bootstrap', async () => {
    // Start orchestrator
    await orchestrator.start();

    // Verify subscription happened immediately (before any potential LSP delays)
    expect(mockFirehose.getListenerCount()).toBe(1);

    // Verify the orchestrator can process events immediately
    const testEvent = {
      event_type: 'waiting_local_tool' as const,
      session_id: 'test-session',
      event_id: 'event-immediate',
      message_id: 'msg-immediate',
      data: {
        job_instruction: {
          schema_version: '1.0.0',
          job_id: 'test-job-immediate',
          tool_use_id: 'tool-use-immediate',
          session_id: 'test-session',
          cwd: '/workspace',
          tool_name: 'search_files',
          tool_input: { root: '/workspace' }
        }
      }
    };

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    // Emit event immediately after start
    mockFirehose.emit(testEvent);
    await new Promise(resolve => setTimeout(resolve, 10));

    // Verify event was processed (tool was executed)
    expect(mockInvoke).toHaveBeenCalledWith(
      'tool_search_files',
      expect.objectContaining({
        input: { root: '/workspace' }
      })
    );
  });
});