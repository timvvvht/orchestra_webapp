/**
 * isTauriEnvironment Tests - Ensure proper Tauri detection
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isTauriEnvironment } from '../backends';

describe('isTauriEnvironment Detection', () => {
  let originalImportMeta: any;
  let originalWindow: any;

  beforeEach(() => {
    // Store originals
    originalImportMeta = (globalThis as any).import?.meta;
    originalWindow = (globalThis as any).window;
  });

  afterEach(() => {
    // Restore originals
    if (originalImportMeta) {
      (globalThis as any).import = { meta: originalImportMeta };
    } else {
      delete (globalThis as any).import;
    }
    
    if (originalWindow) {
      (globalThis as any).window = originalWindow;
    } else {
      delete (globalThis as any).window;
    }
  });

  it('should detect Tauri via TAURI_DEBUG env var', () => {
    (globalThis as any).import = {
      meta: {
        env: {
          TAURI_DEBUG: 'true'
        }
      }
    };

    expect(isTauriEnvironment()).toBe(true);
  });

  it('should detect Tauri via TAURI_PLATFORM env var', () => {
    (globalThis as any).import = {
      meta: {
        env: {
          TAURI_PLATFORM: 'macos'
        }
      }
    };

    expect(isTauriEnvironment()).toBe(true);
  });

  it('should detect Tauri via __TAURI__ global', () => {
    (globalThis as any).window = {
      __TAURI__: {}
    };

    expect(isTauriEnvironment()).toBe(true);
  });

  it('should return false when no Tauri indicators present', () => {
    (globalThis as any).import = {
      meta: {
        env: {}
      }
    };

    expect(isTauriEnvironment()).toBe(false);
  });

  it('should return false when import.meta is undefined', () => {
    delete (globalThis as any).import;
    delete (globalThis as any).window;

    expect(isTauriEnvironment()).toBe(false);
  });

  it('should prioritize env vars over global', () => {
    (globalThis as any).import = {
      meta: {
        env: {
          TAURI_DEBUG: 'true'
        }
      }
    };
    (globalThis as any).window = {}; // No __TAURI__

    expect(isTauriEnvironment()).toBe(true);
  });
});