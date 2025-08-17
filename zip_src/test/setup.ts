import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Tauri API
const mockInvoke = vi.fn()
const mockListen = vi.fn()
const mockEmit = vi.fn()

vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockInvoke,
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: mockListen,
  emit: mockEmit,
}))

// Mock window.__TAURI_INTERNALS__
Object.defineProperty(window, '__TAURI_INTERNALS__', {
  value: {
    invoke: mockInvoke,
  },
  writable: true,
})

// Global test utilities
global.mockTauriInvoke = mockInvoke
global.mockTauriListen = mockListen
global.mockTauriEmit = mockEmit

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
  mockInvoke.mockClear()
  mockListen.mockClear()
  mockEmit.mockClear()
})

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}