/**
 * SCMManager Tests - Ensure Rust backend is always used in Tauri environment
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SCMManager } from '../SCMManager';

describe('SCMManager Backend Selection', () => {
  let originalImportMeta: any;

  beforeEach(() => {
    // Store original import.meta
    originalImportMeta = (globalThis as any).import?.meta;
  });

  afterEach(() => {
    // Restore original import.meta
    if (originalImportMeta) {
      (globalThis as any).import = { meta: originalImportMeta };
    }
    vi.clearAllMocks();
  });

  it('should use RustTauriBackend when TAURI_DEBUG is set', () => {
    // Mock Tauri environment
    (globalThis as any).import = {
      meta: {
        env: {
          TAURI_DEBUG: 'true'
        }
      }
    };

    const manager = new SCMManager();
    expect(manager.getBackendType()).toBe('RustTauri');
  });

  it('should use RustTauriBackend when TAURI_PLATFORM is set', () => {
    // Mock Tauri environment
    (globalThis as any).import = {
      meta: {
        env: {
          TAURI_PLATFORM: 'macos'
        }
      }
    };

    const manager = new SCMManager();
    expect(manager.getBackendType()).toBe('RustTauri');
  });

  it('should use RustTauriBackend when __TAURI__ global is present', () => {
    // Mock Tauri global
    (globalThis as any).window = {
      __TAURI__: {}
    };

    const manager = new SCMManager();
    expect(manager.getBackendType()).toBe('RustTauri');

    // Cleanup
    delete (globalThis as any).window;
  });

  it('should use RustTauriBackend when forceBackend is rust', () => {
    const manager = new SCMManager({ forceBackend: 'rust' });
    expect(manager.getBackendType()).toBe('RustTauri');
  });

  it('should throw error when not in Tauri environment and no backend forced', () => {
    // Clear any Tauri environment indicators
    (globalThis as any).import = {
      meta: {
        env: {}
      }
    };

    expect(() => {
      new SCMManager({ allowMockFallback: false });
    }).toThrow('Tauri environment not detected and no backend forced');
  });

  it('should throw error when trying to force deprecated nodejs backend', () => {
    expect(() => {
      new SCMManager({ forceBackend: 'nodejs' as any });
    }).toThrow('SimpleNodeJsBackend has been deprecated');
  });

  it('should use MockBackend when allowMockFallback is true and not in Tauri', () => {
    // Clear any Tauri environment indicators
    (globalThis as any).import = {
      meta: {
        env: {}
      }
    };

    const manager = new SCMManager({ allowMockFallback: true });
    expect(manager.getBackendType()).toBe('Mock');
  });

  it('should confirm real backend when using Rust', () => {
    const manager = new SCMManager({ forceBackend: 'rust' });
    expect(manager.isRealBackend()).toBe(true);
  });
});