import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocalToolOrchestrator } from '../LocalToolOrchestrator';
import type { FirehoseMux } from '@/services/acs/streaming/FirehoseMux';

// Mock the FirehoseMux
const createMockFirehoseMux = (): FirehoseMux => ({
  subscribe: vi.fn(() => vi.fn()), // Returns unsubscribe function
  unsubscribe: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  isConnected: vi.fn(() => false),
  getConnectionState: vi.fn(() => 'disconnected'),
  // Add any other methods that FirehoseMux might have
} as any);

describe('LocalToolOrchestrator in web environment', () => {
  let mockFirehoseMux: FirehoseMux;
  let orchestrator: LocalToolOrchestrator;

  beforeEach(() => {
    mockFirehoseMux = createMockFirehoseMux();
    orchestrator = new LocalToolOrchestrator(mockFirehoseMux);
  });

  it('should initialize without errors in web environment', () => {
    expect(orchestrator).toBeDefined();
    expect(orchestrator.getNativeTools().size).toBe(0);
  });

  it('should start without errors in web environment', async () => {
    // Should not throw when starting in web environment
    await expect(orchestrator.start()).resolves.not.toThrow();
    
    // Should have subscribed to the firehose
    expect(mockFirehoseMux.subscribe).toHaveBeenCalled();
  });

  it('should have empty native tools set in web environment', () => {
    const nativeTools = orchestrator.getNativeTools();
    expect(nativeTools).toBeInstanceOf(Set);
    expect(nativeTools.size).toBe(0);
  });

  it('should return false for isNativeTool in web environment', () => {
    expect(orchestrator.isNativeTool('search_files')).toBe(false);
    expect(orchestrator.isNativeTool('read_files')).toBe(false);
    expect(orchestrator.isNativeTool('any_tool')).toBe(false);
  });

  it('should handle direct tool execution gracefully in web environment', async () => {
    const result = await orchestrator.executeToolDirect('search_files', { query: 'test' });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('LSP HTTP unavailable');
  });

  it('should stop without errors', () => {
    expect(() => orchestrator.stop()).not.toThrow();
  });
});