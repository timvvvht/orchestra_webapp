import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { LocalToolOrchestrator } from '../LocalToolOrchestrator';
import { lspClient, setBaseUrl } from '../httpLspClient';

// Mock @tauri-apps/api/core to return fixed port
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

describe('Debug LSP Routing', () => {
  let orchestrator: LocalToolOrchestrator;
  let fakeMux: FakeMux;

  beforeEach(() => {
    vi.clearAllMocks();
    fakeMux = new FakeMux();
    orchestrator = new LocalToolOrchestrator(fakeMux as any, {
      acsApi: 'http://localhost:3000' // dummy ACS API
    });
  });

  it('should bootstrap LSP tools correctly', async () => {
    // Manually set the base URL to the running LSP server
    setBaseUrl('http://127.0.0.1:8123');

    // Test direct LSP client functionality
    console.log('Testing LSP client directly...');
    
    try {
      const tools = await lspClient.listTools();
      console.log('LSP tools:', tools);
      expect(Array.isArray(tools)).toBe(true);
    } catch (error) {
      console.error('LSP client error:', error);
      throw error;
    }

    // Test orchestrator startup
    console.log('Testing orchestrator startup...');
    await orchestrator.start();

    // Check if orchestrator discovered LSP tools
    console.log('Orchestrator started successfully');
  }, 10000);

  it('should identify LSP tools correctly', async () => {
    setBaseUrl('http://127.0.0.1:8123');
    
    // Add some debugging to see what happens during startup
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    
    console.log = (...args) => originalConsoleLog('[TEST LOG]', ...args);
    console.error = (...args) => originalConsoleError('[TEST ERROR]', ...args);
    
    try {
      await orchestrator.start();

      // Test if orchestrator recognizes LSP tools
      const isLspTool = (orchestrator as any).lspTools.has('get_symbols_overview');
      console.log('Is get_symbols_overview an LSP tool?', isLspTool);
      console.log('LSP tools discovered:', Array.from((orchestrator as any).lspTools));
      console.log('Native tools discovered:', Array.from((orchestrator as any).nativeTools));
      
      expect(isLspTool).toBe(true);
    } finally {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    }
  }, 10000);
});