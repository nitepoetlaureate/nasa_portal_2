/**
 * NASA System 7 Portal - Comprehensive Test Setup
 *
 * This file sets up the complete testing environment for all NASA System 7 Portal tests.
 * It provides consistent mocking for all dependencies and ensures reliable test execution.
 */

import '@testing-library/jest-dom'
import { vi, beforeEach, afterEach } from 'vitest'

// Import comprehensive test infrastructure
import {
  setupNasaTestEnvironment,
  mockNasaApodData,
  mockNasaNeoData,
  mockNasaEpicData,
  mockNasaMarsData,
  mockNasaDonkiData
} from './testSuiteInfrastructure.jsx'

// Initialize the complete test environment
setupNasaTestEnvironment()

// Setup NASA API mocking with comprehensive responses
global.fetch = vi.fn()

// Mock NASA API endpoints with realistic test data
global.fetch.mockImplementation((url) => {
  // APOD API responses
  if (url.includes('apod.nasa.gov') || url.includes('/api/nasa/apod')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => mockNasaApodData
    })
  }

  // NeoWs API responses
  if (url.includes('neo/rest/v1/feed') || url.includes('/api/nasa/neo')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => mockNasaNeoData
    })
  }

  // EPIC API responses
  if (url.includes('EPIC/api/natural') || url.includes('/api/nasa/epic')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => mockNasaEpicData
    })
  }

  // Mars Rover API responses
  if (url.includes('mars-photos/api/v1/rovers') || url.includes('/api/nasa/mars')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => mockNasaMarsData
    })
  }

  // DONKI API responses
  if (url.includes('DONKI') || url.includes('/api/nasa/donki')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => mockNasaDonkiData
    })
  }

  // Analytics API responses
  if (url.includes('/api/analytics/')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: [] })
    })
  }

  // Default mock response for all other endpoints
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => ({ success: true, data: {} })
  })
})

// Mock browser APIs that are commonly used in NASA System 7 Portal
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

global.AudioContext = vi.fn().mockImplementation(() => ({
  createBufferSource: vi.fn().mockReturnValue({
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn()
  }),
  decodeAudioData: vi.fn().mockResolvedValue({})
}))

global.PerformanceObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn(() => [])
}))

// Match Media mock for responsive design testing
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated but still used
    removeListener: vi.fn(), // deprecated but still used
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})

// Comprehensive storage mocking
const createStorageMock = () => {
  let store = {}
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString()
    }),
    removeItem: vi.fn((key) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    key: vi.fn((index) => Object.keys(store)[index] || null),
    get length() {
      return Object.keys(store).length
    }
  }
}

Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: createStorageMock()
})

Object.defineProperty(window, 'sessionStorage', {
  writable: true,
  value: createStorageMock()
})

// Mock Service Worker for PWA testing
Object.defineProperty(navigator, 'serviceWorker', {
  writable: true,
  value: {
    register: vi.fn().mockResolvedValue({
      scope: '/scope',
      updateViaCache: 'none'
    }),
    addEventListener: vi.fn(),
    ready: Promise.resolve({
      sync: vi.fn().mockResolvedValue({}),
      register: vi.fn().mockResolvedValue({}),
      getRegistrations: vi.fn().mockResolvedValue([])
    })
  }
})

// Performance API mocking for NASA System 7 Portal performance monitoring
Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByType: vi.fn(() => []),
    getEntriesByName: vi.fn(() => []),
    timing: {
      navigationStart: 1000000,
      loadEventEnd: 1001500,
      domContentLoadedEventEnd: 1001000,
      responseStart: 1000500
    },
    navigation: {
      type: 0,
      redirectCount: 0
    },
    memory: {
      usedJSHeapSize: 50 * 1024 * 1024,
      totalJSHeapSize: 100 * 1024 * 1024,
      jsHeapSizeLimit: 2048 * 1024 * 1024
    }
  }
})

// Navigator API mocking for NASA System 7 Portal device detection
Object.defineProperty(window, 'navigator', {
  writable: true,
  value: {
    userAgent: 'NASA System 7 Portal Test Browser',
    language: 'en-US',
    languages: ['en-US', 'en'],
    platform: 'TestPlatform',
    cookieEnabled: true,
    onLine: true,
    hardwareConcurrency: 4,
    deviceMemory: 8,
    maxTouchPoints: 5,
    connection: {
      effectiveType: '4g',
      downlink: 10,
      rtt: 50,
      saveData: false
    },
    geolocation: {
      getCurrentPosition: vi.fn(),
      watchPosition: vi.fn(),
      clearWatch: vi.fn()
    },
    permissions: {
      query: vi.fn().mockResolvedValue({ state: 'granted' })
    },
    share: vi.fn().mockResolvedValue({}),
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
      readText: vi.fn().mockResolvedValue('test text')
    }
  }
})

// Location API mocking
Object.defineProperty(window, 'location', {
  writable: true,
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    protocol: 'http:',
    host: 'localhost:3000',
    hostname: 'localhost',
    port: '3000',
    pathname: '/',
    search: '',
    hash: '',
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn()
  }
})

// Environment variables for NASA System 7 Portal testing
process.env.NODE_ENV = 'test'
process.env.REACT_APP_API_BASE_URL = 'http://localhost:3001/api'
process.env.REACT_APP_NASA_API_KEY = 'DEMO_KEY'
process.env.REACT_APP_ENABLE_PERFORMANCE_MONITORING = 'false'
process.env.REACT_APP_ENABLE_ANALYTICS = 'false'
process.env.VITE_API_BASE_URL = 'http://localhost:3001/api'
process.env.VITE_NASA_API_KEY = 'DEMO_KEY'

// Console setup for NASA System 7 Portal testing
const originalConsole = { ...console }

global.console = {
  ...originalConsole,
  // Keep log and info for debugging test failures
  log: originalConsole.log,
  info: originalConsole.info,
  // Suppress warnings and errors in tests unless specifically testing them
  warn: vi.fn(),
  error: vi.fn(),
  // Preserve debug for detailed debugging
  debug: originalConsole.debug
}

// Mock window dimensions for responsive testing
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024
})

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: 768
})

// Mock scrollTo for scroll testing
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn()
})

// Mock requestAnimationFrame and cancelAnimationFrame for animation testing
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16))
global.cancelAnimationFrame = vi.fn((id) => clearTimeout(id))

// Mock ResizeObserver for layout testing
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// Comprehensive mock reset before each test
beforeEach(() => {
  vi.clearAllMocks()

  // Reset fetch mock to default behavior
  if (global.fetch) {
    global.fetch.mockClear()
  }

  // Reset storage mocks
  if (window.localStorage) {
    window.localStorage.clear()
  }
  if (window.sessionStorage) {
    window.sessionStorage.clear()
  }

  // Reset window dimensions to default
  window.innerWidth = 1024
  window.innerHeight = 768
})

// Cleanup after each test to ensure isolation
afterEach(() => {
  // Reset any global state that might have been modified
  vi.restoreAllMocks()
})

// Export test utilities for use in individual test files
export { mockNasaApodData, mockNasaNeoData, mockNasaEpicData, mockNasaMarsData, mockNasaDonkiData }