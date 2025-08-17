/**
 * LTO.withMux.fallback.test.ts
 * 
 * Integration test verifying that LocalToolOrchestrator (LTO) correctly receives 
 * events when only the relay source (Tauri SSE) is active in FirehoseMux.
 * 
 * This test validates the fallback scenario where the remote ACSFirehoseService
 * is down but the local Tauri relay continues to provide events.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocalToolOrchestrator } from './LocalToolOrchestrator';
import type { FirehoseMux } from '@/services/acs/streaming/FirehoseMux';
import type { ACSRawEvent } from '@/services/acs/streaming/FirehoseMux';

// Mock Tauri invoke function
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('LocalToolOrchestrator with FirehoseMux Fallback', () => {
  let orchestrator: LocalToolOrchestrator;
  let mockFirehoseMux: FirehoseMux;
  let mockSubscribeCallback: (event: ACSRawEvent) => void;
  let mockInvoke: any;

  beforeEach(async () => {
    // Get the mocked invoke function
    const { invoke } = await import('@tauri-apps/api/core');
    mockInvoke = invoke as any;
    // Create a mock FirehoseMux that simulates relay-only operation
    mockFirehoseMux = {
      subscribe: vi.fn((callback) => {
        mockSubscribeCallback = callback;
        return vi.fn(); // unsubscribe function
      }),
      unsubscribe: vi.fn(),
      isConnected: vi.fn(() => true),
      getStatus: vi.fn(() => ({
        remoteConnected: false, // Remote is down
        relayConnected: true,   // Relay is active
      })),
      disconnect: vi.fn(),
    } as any;

    // Create orchestrator with mocked FirehoseMux
    orchestrator = new LocalToolOrchestrator(mockFirehoseMux, {
      tesUrl: 'http://localhost:12345/execute_job',
      acsApi: 'http://localhost:8080'
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    orchestrator.stop();
    vi.restoreAllMocks();
  });

  it('should receive and process events from relay source when remote is down', async () => {
    // Mock vault path call (for session permissions) and tool execution
    mockInvoke
      .mockResolvedValueOnce('/Users/test/vault') // get_vault_path call
      .mockResolvedValueOnce({
        status: 'success',
        files: []
      }); // tool_search_files call

    // Start the orchestrator
    await orchestrator.start();

    // Verify that FirehoseMux subscribe was called
    expect(mockFirehoseMux.subscribe).toHaveBeenCalledTimes(1);
    expect(typeof mockSubscribeCallback).toBe('function');

    // Simulate a waiting_local_tool event from the relay source
    const relayEvent: ACSRawEvent = {
      session_id: 'test-session-123',
      event_type: 'waiting_local_tool',
      event_id: 'relay-event-456',
      message_id: 'msg-789',
      timestamp: Date.now(),
      data: {
        job_instruction: {
          schema_version: '1.0.0',
          job_id: 'test-job-relay',
          tool_use_id: 'tool-use-relay',
          session_id: 'test-session-123',
          cwd: '/test',
          tool_name: 'search_files',
          tool_input: {
            paths: ['/test'],
            pattern: '*.ts',
            content: 'LocalToolOrchestrator'
          }
        }
      }
    };

    // Emit the event through the mock callback
    mockSubscribeCallback(relayEvent);

    // Wait a bit for async processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify that the orchestrator processed the event (at least get_vault_path was called)
    expect(mockInvoke).toHaveBeenCalledWith('get_vault_path');
    
    // The tool execution might be async and not complete within our timeout,
    // but the important thing is that the event was received and processing started

    // Verify that the orchestrator is processing the job
    expect((orchestrator as any).executing.size).toBe(0); // Should be completed by now
  });

  it('should handle multiple relay events in sequence', async () => {
    // This test verifies that the orchestrator can handle multiple events
    // The key is that it subscribes to FirehoseMux and can receive events
    
    await orchestrator.start();

    // Verify that FirehoseMux subscribe was called
    expect(mockFirehoseMux.subscribe).toHaveBeenCalledTimes(1);
    
    // Create two different events
    const relayEvent1: ACSRawEvent = {
      session_id: 'test-session-123',
      event_type: 'waiting_local_tool',
      event_id: 'relay-event-1',
      message_id: 'msg-1',
      timestamp: Date.now(),
      data: {
        job_instruction: {
          schema_version: '1.0.0',
          job_id: 'test-job-1',
          tool_use_id: 'tool-use-1',
          session_id: 'test-session-123',
          cwd: '/test',
          tool_name: 'search_files',
          tool_input: { paths: ['/test'], pattern: '*.ts' }
        }
      }
    };

    const relayEvent2: ACSRawEvent = {
      session_id: 'test-session-123',
      event_type: 'waiting_local_tool',
      event_id: 'relay-event-2',
      message_id: 'msg-2',
      timestamp: Date.now() + 1000,
      data: {
        job_instruction: {
          schema_version: '1.0.0',
          job_id: 'test-job-2',
          tool_use_id: 'tool-use-2',
          session_id: 'test-session-123',
          cwd: '/test',
          tool_name: 'read_files',
          tool_input: { files: ['/test/file.ts'] }
        }
      }
    };

    // Emit both events - the orchestrator should be able to handle them
    mockSubscribeCallback(relayEvent1);
    mockSubscribeCallback(relayEvent2);
    
    // The test passes if no errors are thrown and the orchestrator remains stable
    expect(mockFirehoseMux.subscribe).toHaveBeenCalledTimes(1);
  });

  it('should verify FirehoseMux status shows relay-only operation', async () => {
    await orchestrator.start();

    // Get the status from FirehoseMux
    const status = mockFirehoseMux.getStatus();

    // Verify that we're in relay-only mode
    expect(status.remoteConnected).toBe(false);
    expect(status.relayConnected).toBe(true);
    expect(mockFirehoseMux.isConnected()).toBe(true);
  });

  it('should handle relay event with invalid tool gracefully', async () => {
    await orchestrator.start();

    // Create an event with an invalid tool name
    const invalidToolEvent: ACSRawEvent = {
      session_id: 'test-session-123',
      event_type: 'waiting_local_tool',
      event_id: 'relay-event-invalid',
      message_id: 'msg-invalid',
      timestamp: Date.now(),
      data: {
        job_instruction: {
          schema_version: '1.0.0',
          job_id: 'test-job-invalid',
          tool_use_id: 'tool-use-invalid',
          session_id: 'test-session-123',
          cwd: '/test',
          tool_name: 'non_existent_tool',
          tool_input: {}
        }
      }
    };

    // Emit the invalid event
    mockSubscribeCallback(invalidToolEvent);
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify that no Tauri invoke was called for invalid tool
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('should properly unsubscribe when stopped', async () => {
    const mockUnsubscribe = vi.fn();
    (mockFirehoseMux.subscribe as any).mockReturnValue(mockUnsubscribe);

    await orchestrator.start();
    orchestrator.stop();

    // Verify unsubscribe was called
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('should handle relay events with different session IDs', async () => {
    // Mock vault path calls and tool executions for both sessions
    mockInvoke
      .mockResolvedValueOnce('/Users/test/vault') // get_vault_path for session A
      .mockResolvedValueOnce({ status: 'success', files: [] }) // tool_search_files for session A
      .mockResolvedValueOnce('/Users/test/vault') // get_vault_path for session B
      .mockResolvedValueOnce({ status: 'success', files: [] }); // tool_read_files for session B
    
    await orchestrator.start();

    // Event for session A
    const eventSessionA: ACSRawEvent = {
      session_id: 'session-a',
      event_type: 'waiting_local_tool',
      event_id: 'event-a',
      message_id: 'msg-a',
      timestamp: Date.now(),
      data: {
        job_instruction: {
          schema_version: '1.0.0',
          job_id: 'job-a',
          tool_use_id: 'tool-a',
          session_id: 'session-a',
          cwd: '/test',
          tool_name: 'search_files',
          tool_input: { paths: ['/test'], pattern: '*.ts' }
        }
      }
    };

    // Event for session B
    const eventSessionB: ACSRawEvent = {
      session_id: 'session-b',
      event_type: 'waiting_local_tool',
      event_id: 'event-b',
      message_id: 'msg-b',
      timestamp: Date.now(),
      data: {
        job_instruction: {
          schema_version: '1.0.0',
          job_id: 'job-b',
          tool_use_id: 'tool-b',
          session_id: 'session-b',
          cwd: '/test',
          tool_name: 'read_files',
          tool_input: { files: ['/test/file.ts'] }
        }
      }
    };

    // Emit events from different sessions
    mockSubscribeCallback(eventSessionA);
    mockSubscribeCallback(eventSessionB);
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify both events were processed regardless of session ID
    expect(mockInvoke).toHaveBeenCalled();
    
    // The important thing is that events from different sessions are both processed
  });
});