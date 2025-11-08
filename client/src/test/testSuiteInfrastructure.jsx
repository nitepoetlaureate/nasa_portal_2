/**
 * NASA System 7 Portal - Comprehensive Test Suite Infrastructure
 *
 * This file provides a robust testing foundation for the project, including:
 * - Consistent mock configurations for all NASA APIs
 * - Proper test data generators
 * - Standard test utilities and helpers
 * - Mock import consistency fixes
 * - Comprehensive error handling
 */

import { vi, beforeAll, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'

// =============================================================================
// GLOBAL MOCK SETUP
// =============================================================================

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})

// =============================================================================
// NASA API MOCKS
// =============================================================================

// Mock NASA API endpoints with comprehensive test data
export const mockNasaApodData = {
  date: '2025-11-08',
  title: 'Test Astronomy Picture',
  explanation: 'This is a test astronomy picture with detailed explanation for NASA System 7 Portal.',
  url: 'https://apod.nasa.gov/apod/image/2511/test_image.jpg',
  hdurl: 'https://apod.nasa.gov/apod/image/2511/test_image_hd.jpg',
  media_type: 'image',
  service_version: 'v1',
  copyright: 'Test Copyright'
}

export const mockNasaNeoData = {
  element_count: 1,
  links: {},
  near_earth_objects: {
    '2025-11-08': [{
      id: '123456789',
      neo_reference_id: '123456789',
      name: 'Test Asteroid (2025-T1)',
      nasa_jpl_url: 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?ss=123456789',
      absolute_magnitude_h: 20.5,
      estimated_diameter: {
        kilometers: { estimated_diameter_min: 0.5, estimated_diameter_max: 1.2 },
        meters: { estimated_diameter_min: 500, estimated_diameter_max: 1200 },
        miles: { estimated_diameter_min: 0.3, estimated_diameter_max: 0.7 },
        feet: { estimated_diameter_min: 1640, estimated_diameter_max: 3937 }
      },
      is_potentially_hazardous_asteroid: false,
      close_approach_data: [{
        close_approach_date: '2025-11-08',
        close_approach_date_full: '2025-Nov-08 00:00',
        epoch_date_close_approach: 1767993600000,
        relative_velocity: {
          kilometers_per_second: '15.5',
          kilometers_per_hour: '55800',
          miles_per_hour: '34673'
        },
        miss_distance: {
          astronomical: '0.05',
          lunar: '19.4',
          kilometers: '7500000',
          miles: '4660000'
        },
        orbiting_body: 'Earth'
      }],
      is_sentry_object: false
    }]
  }
}

export const mockNasaEpicData = [
  {
    identifier: 'test-epic-image',
    caption: 'Test EPIC image caption',
    image: 'epic_1b_20251108_120000.jpg',
    version: '01',
    centroid_coordinates: { lat: 0.0, lon: 0.0 },
    dscovr_j2000_position: { x: 0.0, y: 0.0, z: 0.0 },
    lunar_j2000_position: { x: 0.0, y: 0.0, z: 0.0 },
    sun_j2000_position: { x: 0.0, y: 0.0, z: 0.0 },
    attitude_quaternions: { q0: 0.0, q1: 0.0, q2: 0.0, q3: 1.0 },
    date: '2025-11-08 12:00:00',
    coordinate_system: 'GSE',
    image_filename: 'epic_1b_20251108_120000.jpg'
  }
]

export const mockNasaMarsData = {
  photos: [
    {
      id: 102693,
      sol: 1000,
      camera: {
        id: 20,
        name: 'FHAZ',
        rover_id: 5,
        full_name: 'Front Hazard Avoidance Camera'
      },
      img_src: 'https://mars.nasa.gov/msl-raw-images/proj/msl/redops/ods/surface/sol/01000/opgs/adr/fhaz/102693/RA_639925842EDR_F0740910FHAZ00323M_.JPG',
      earth_date: '2015-05-30',
      rover: {
        id: 5,
        name: 'Curiosity',
        landing_date: '2012-08-06',
        launch_date: '2011-11-26',
        status: 'active'
      }
    }
  ]
}

export const mockNasaDonkiData = [
  {
    messageID: 'TEST_001',
    messageURL: 'https://api.nasa.gov/DONKI/CMEAnalysis.json?messageID=TEST_001',
    time21_5: '2025-11-08T12:00Z',
    isMostAccurate: true,
    linkedEvents: [
      {
        activityID: '2025-11-08T12:00:00-CME-001'
      }
    ],
    type: 'C',
    speed: 450,
    note: 'Test CME event for NASA System 7 Portal',
    enlilList: [
      {
        enlilID: 'ENLIL_TEST_001',
        estimatedShockArrivalTime: '2025-11-09T12:00Z',
        estimatedSpeed: 400,
        isMostAccurate: true,
        link: 'https://api.nasa.gov/DONKI/ENLIL.json?enlilID=ENLIL_TEST_001',
        cmeAnalyses: [
          {
            time21_5: '2025-11-08T12:00Z',
            isMostAccurate: true,
            type: 'S',
            speed: 400,
            latitude: 15.0,
            longitude: 45.0,
            halfWidth: 45,
            link: 'https://api.nasa.gov/DONKI/CMEAnalysis.json?messageID=TEST_001'
          }
        ]
      }
    ]
  }
]

// Mock NASA API fetch responses
export const setupNasaApiMocks = () => {
  global.fetch = vi.fn()

  // APOD API mock
  global.fetch.mockImplementation((url) => {
    if (url.includes('apod.nasa.gov')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockNasaApodData
      })
    }

    if (url.includes('neo/rest/v1/feed')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockNasaNeoData
      })
    }

    if (url.includes('EPIC/api/natural')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockNasaEpicData
      })
    }

    if (url.includes('mars-photos/api/v1/rovers')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockNasaMarsData
      })
    }

    if (url.includes('DONKI')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockNasaDonkiData
      })
    }

    // Default mock response for other endpoints
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: [] })
    })
  })
}

// =============================================================================
// HOOK MOCKS
// =============================================================================

// Standardize hook imports and mocks
export const mockUseMediaQuery = vi.fn()
export const mockUseTouchGestures = vi.fn(() => ({
  onTouchStart: vi.fn(),
  onTouchMove: vi.fn(),
  onTouchEnd: vi.fn(),
  onTap: vi.fn(),
  onDoubleTap: vi.fn(),
  onSwipe: vi.fn(),
  onPinch: vi.fn()
}))
export const mockUseSound = vi.fn(() => vi.fn())
export const mockUseBundleMonitor = vi.fn()

// Setup consistent hook mocks
export const setupHookMocks = () => {
  // Remove .js extensions from mock paths to fix import inconsistencies
  vi.mock('../hooks/useMediaQuery', () => ({
    useMediaQuery: mockUseMediaQuery
  }))

  vi.mock('../hooks/useTouchGestures', () => ({
    useTouchGestures: mockUseTouchGestures
  }))

  vi.mock('../hooks/useSound', () => ({
    useSound: mockUseSound
  }))

  vi.mock('../hooks/usePerformanceOptimized', () => ({
    useBundleMonitor: mockUseBundleMonitor
  }))
}

// =============================================================================
// CONTEXT MOCKS
// =============================================================================

export const mockAppContext = {
  apps: {},
  openApp: vi.fn(),
  closeApp: vi.fn(),
  bringToFront: vi.fn(),
  minimizeApp: vi.fn(),
  maximizeApp: vi.fn(),
  isAppOpen: vi.fn(() => false),
  getActiveApp: vi.fn(() => null)
}

export const setupContextMocks = () => {
  vi.mock('../contexts/AppContext', () => ({
    useApps: vi.fn(() => mockAppContext)
  }))
}

// =============================================================================
// COMPONENT MOCKS
// =============================================================================

export const setupComponentMocks = () => {
  vi.mock('../components/Performance/BundleAnalyzer', () => ({
    default: () => null
  }))

  vi.mock('../components/Performance/MobilePerformanceMonitor', () => ({
    default: () => null
  }))

  vi.mock('../components/analytics/ConsentManager', () => ({
    default: ({ children, ...props }) => React.createElement('div', {
      'data-testid': 'consent-manager',
      ...props
    }, children)
  }))

  vi.mock('../components/analytics/AnalyticsDashboard', () => ({
    default: () => React.createElement('div', {
      'data-testid': 'analytics-dashboard'
    }, 'Analytics Dashboard')
  }))
}

// =============================================================================
// BROWSER API MOCKS
// =============================================================================

export const setupBrowserMocks = () => {
  // Service Worker mock
  Object.defineProperty(navigator, 'serviceWorker', {
    writable: true,
    value: {
      register: vi.fn().mockResolvedValue({}),
      addEventListener: vi.fn(),
      ready: Promise.resolve({
        sync: vi.fn().mockResolvedValue({}),
        register: vi.fn().mockResolvedValue({})
      })
    }
  })

  // Intersection Observer mock
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }))

  // Resize Observer mock
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }))

  // Audio Context mock
  global.AudioContext = vi.fn().mockImplementation(() => ({
    createBufferSource: vi.fn().mockReturnValue({
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn()
    }),
    decodeAudioData: vi.fn().mockResolvedValue({})
  }))

  // Performance Observer mock
  global.PerformanceObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn(() => [])
  }))

  // Match Media mock
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  })

  // Location mock
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
}

// =============================================================================
// STORAGE MOCKS
// =============================================================================

export const setupStorageMocks = () => {
  const createStorageMock = () => ({
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn()
  })

  Object.defineProperty(window, 'localStorage', {
    writable: true,
    value: createStorageMock()
  })

  Object.defineProperty(window, 'sessionStorage', {
    writable: true,
    value: createStorageMock()
  })
}

// =============================================================================
// PERFORMANCE MOCKS
// =============================================================================

export const setupPerformanceMocks = () => {
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
}

// =============================================================================
// NAVIGATOR MOCKS
// =============================================================================

export const setupNavigatorMocks = () => {
  Object.defineProperty(window, 'navigator', {
    writable: true,
    value: {
      userAgent: 'Test Browser - NASA System 7 Portal',
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
}

// =============================================================================
// ENVIRONMENT MOCKS
// =============================================================================

export const setupEnvironmentMocks = () => {
  process.env.NODE_ENV = 'test'
  process.env.REACT_APP_API_BASE_URL = 'http://localhost:3001/api'
  process.env.REACT_APP_NASA_API_KEY = 'DEMO_KEY'
  process.env.REACT_APP_ENABLE_PERFORMANCE_MONITORING = 'false'
  process.env.REACT_APP_ENABLE_ANALYTICS = 'false'
  process.env.VITE_API_BASE_URL = 'http://localhost:3001/api'
  process.env.VITE_NASA_API_KEY = 'DEMO_KEY'
}

// =============================================================================
// CONSOLE MOCKS
// =============================================================================

export const setupConsoleMocks = () => {
  // Suppress console warnings and errors in tests unless specifically testing them
  const originalConsole = { ...console }

  global.console = {
    ...originalConsole,
    warn: vi.fn(),
    error: vi.fn(),
    // Keep log and info for debugging test failures
    log: originalConsole.log,
    info: originalConsole.info
  }

  return originalConsole
}

// =============================================================================
// COMPREHENSIVE SETUP FUNCTION
// =============================================================================

/**
 * Sets up all mocks and configurations for NASA System 7 Portal tests
 * This function should be called in each test file's setup phase
 */
export const setupNasaTestEnvironment = () => {
  setupNasaApiMocks()
  setupHookMocks()
  setupContextMocks()
  setupComponentMocks()
  setupBrowserMocks()
  setupStorageMocks()
  setupPerformanceMocks()
  setupNavigatorMocks()
  setupEnvironmentMocks()
  setupConsoleMocks()
}

// =============================================================================
// TEST UTILITIES
// =============================================================================

/**
 * Wraps async operations in act() for proper testing of React state updates
 */
export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0))

/**
 * Creates a mock component with props
 */
export const createMockComponent = (name, defaultProps = {}) => {
  const MockComponent = ({ children, ...props }) =>
    React.createElement('div', {
      'data-testid': name.toLowerCase().replace(/\s+/g, '-'),
      ...defaultProps,
      ...props
    }, children)

  MockComponent.displayName = `Mock${name}`
  return MockComponent
}

/**
 * Simulates user interaction with async handling
 */
export const simulateUserInteraction = async (element, eventType, eventData = {}) => {
  await act(async () => {
    fireEvent[elementType](element, eventData)
  })
}

/**
 * Waits for an element to appear and returns it
 */
export const waitForElement = async (getter, timeout = 5000) => {
  return await waitFor(getter, { timeout })
}

/**
 * Tests loading states in components
 */
export const testLoadingState = async (Component, props = {}, expectedText = /loading/i) => {
  render(React.createElement(Component, props))
  await waitFor(() => {
    expect(screen.getByText(expectedText)).toBeInTheDocument()
  })
}

/**
 * Tests error states in components
 */
export const testErrorState = async (Component, props = {}, expectedText = /error/i) => {
  render(React.createElement(Component, props))
  await waitFor(() => {
    expect(screen.getByText(expectedText)).toBeInTheDocument()
  })
}

/**
 * Tests successful data rendering
 */
export const testDataRendering = async (Component, props = {}, expectedElements = {}) => {
  render(React.createElement(Component, props))

  for (const [key, value] of Object.entries(expectedElements)) {
    if (typeof value === 'string') {
      await waitFor(() => {
        expect(screen.getByText(new RegExp(value, 'i'))).toBeInTheDocument()
      })
    } else if (value.role) {
      await waitFor(() => {
        expect(screen.getByRole(value.role, { name: value.name })).toBeInTheDocument()
      })
    }
  }
}

// =============================================================================
// NASA-SPECIFIC TEST HELPERS
// =============================================================================

/**
 * Creates test data for NASA APIs with variations
 */
export const createNasaTestData = {
  apod: (overrides = {}) => ({
    ...mockNasaApodData,
    ...overrides
  }),

  neo: (overrides = {}) => ({
    ...mockNasaNeoData,
    ...overrides
  }),

  epic: (count = 1, overrides = {}) =>
    Array.from({ length: count }, (_, index) => ({
      ...mockNasaEpicData[0],
      identifier: `test-epic-${index}`,
      ...overrides
    })),

  mars: (count = 1, rover = 'curiosity', overrides = {}) => ({
    ...mockNasaMarsData,
    photos: Array.from({ length: count }, (_, index) => ({
      ...mockNasaMarsData.photos[0],
      id: 102693 + index,
      rover: {
        ...mockNasaMarsData.photos[0].rover,
        name: rover
      },
      ...overrides
    }))
  }),

  donki: (count = 1, overrides = {}) =>
    Array.from({ length: count }, (_, index) => ({
      ...mockNasaDonkiData[0],
      messageID: `TEST_00${index + 1}`,
      ...overrides
    }))
}

/**
 * Mock HTTP response helpers
 */
export const mockApiResponse = (data, status = 200, ok = true) => ({
  ok,
  status,
  json: async () => data,
  text: async () => JSON.stringify(data),
  headers: new Headers({ 'content-type': 'application/json' })
})

export const mockApiError = (message = 'API Error', status = 500) => ({
  ok: false,
  status,
  json: async () => ({ error: message }),
  text: async () => JSON.stringify({ error: message })
})

// =============================================================================
// EXPORT ALL UTILITIES
// =============================================================================

// Testing library exports are already available through the imports at the top
// No need to re-export them here as they cause import conflicts

// Default export with the main setup function
export default {
  setupNasaTestEnvironment,
  setupNasaApiMocks,
  setupHookMocks,
  setupContextMocks,
  setupComponentMocks,
  setupBrowserMocks,
  setupStorageMocks,
  setupPerformanceMocks,
  setupNavigatorMocks,
  setupEnvironmentMocks,
  setupConsoleMocks,

  // Test data
  mockNasaApodData,
  mockNasaNeoData,
  mockNasaEpicData,
  mockNasaMarsData,
  mockNasaDonkiData,
  createNasaTestData,

  // Test utilities
  waitForNextTick,
  createMockComponent,
  simulateUserInteraction,
  waitForElement,
  testLoadingState,
  testErrorState,
  testDataRendering,
  mockApiResponse,
  mockApiError,

  // Mock objects
  mockUseMediaQuery,
  mockUseTouchGestures,
  mockUseSound,
  mockUseBundleMonitor,
  mockAppContext
}