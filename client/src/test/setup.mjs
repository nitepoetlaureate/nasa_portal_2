import '@testing-library/jest-dom'
import { vi, beforeEach } from 'vitest'

// Mock NASA API for testing
global.fetch = vi.fn()

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock Web Audio API for sound effects
global.AudioContext = vi.fn().mockImplementation(() => ({
  createBufferSource: vi.fn().mockReturnValue({
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }),
  decodeAudioData: vi.fn().mockResolvedValue({}),
}))

// Mock matchMedia
Object.defineProperty(globalThis, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.sessionStorage = sessionStorageMock

// Mock environment variables
process.env.REACT_APP_API_BASE_URL = 'http://localhost:3001/api'
process.env.REACT_APP_NASA_API_KEY = 'DEMO_KEY'
process.env.REACT_APP_ENABLE_PERFORMANCE_MONITORING = 'false'

// Suppress console errors in tests
global.console = {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
}

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
  if (global.fetch) {
    global.fetch.mockClear()
  }
})