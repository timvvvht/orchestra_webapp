/// <reference types="vitest/globals" />
/// <reference types="@testing-library/jest-dom" />

import type { MockedFunction } from 'vitest'

declare global {
  // Vitest globals
  const describe: typeof import('vitest').describe
  const it: typeof import('vitest').it
  const expect: typeof import('vitest').expect
  const beforeEach: typeof import('vitest').beforeEach
  const afterEach: typeof import('vitest').afterEach
  const beforeAll: typeof import('vitest').beforeAll
  const afterAll: typeof import('vitest').afterAll
  const vi: typeof import('vitest').vi

  // Custom test utilities
  const mockTauriInvoke: MockedFunction<any>
  const mockTauriListen: MockedFunction<any>
  const mockTauriEmit: MockedFunction<any>

  // Window extensions for Tauri
  interface Window {
    __TAURI_INTERNALS__?: {
      invoke: MockedFunction<any>
    }
  }
}

export {}