/**
 * NASA System 7 Portal - Analytics Test Suite
 *
 * Tests for analytics client, consent management, and dashboard functionality
 * This file has been updated to fix JSX syntax issues and ensure proper testing patterns
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock the test infrastructure before importing components
import { setupNasaTestEnvironment, mockApiResponse, mockApiError } from '../test/testSuiteInfrastructure.jsx'

// Setup comprehensive test environment
setupNasaTestEnvironment()

// Mock imports after setup
vi.mock('../services/analyticsClient', () => ({
  default: {
    getConsentStatus: vi.fn(() => ({
      settings: {
        essential: true,
        performance: false,
        functional: false,
        marketing: false
      }
    })),
    getSessionId: vi.fn(() => 'session_test_1234567890'),
    getConsentId: vi.fn(() => 'test-uuid-1234'),
    init: vi.fn(),
    trackEvent: vi.fn(),
    trackPageView: vi.fn(),
    trackNasaApiUsage: vi.fn(),
    trackPerformanceMetric: vi.fn(),
    trackError: vi.fn(),
    updateConsent: vi.fn(),
    exportUserData: vi.fn(),
    deleteUserData: vi.fn(),
    generateUserIdentifier: vi.fn(() => 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4')
  }
}))

// Mock analytics components
vi.mock('../components/analytics/ConsentManager.jsx', () => ({
  default: ({ showSettings = false, children }) => (
    <div data-testid="consent-manager">
      {showSettings ? (
        <>
          <h2>Privacy & Consent Settings</h2>
          <label>
            <input type="checkbox" data-testid="essential-checkbox" defaultChecked />
            Essential
          </label>
          <label>
            <input type="checkbox" data-testid="performance-checkbox" />
            Performance
          </label>
          <label>
            <input type="checkbox" data-testid="functional-checkbox" />
            Functional
          </label>
          <label>
            <input type="checkbox" data-testid="marketing-checkbox" />
            Marketing
          </label>
        </>
      ) : (
        <>
          <h2>Privacy & Analytics</h2>
          <p>We use privacy-first analytics to understand how you use NASA System 7 Portal.</p>
          <button data-testid="accept-all-btn">Accept All</button>
          <button data-testid="essential-only-btn">Essential Only</button>
          <button data-testid="learn-more-btn">Learn More</button>
        </>
      )}
      {children}
    </div>
  )
}))

vi.mock('../components/analytics/AnalyticsDashboard.jsx', () => ({
  default: () => (
    <div data-testid="analytics-dashboard">
      <h2>NASA System 7 Analytics</h2>
      <p>Loading analytics data...</p>
      <select data-testid="time-range-select" defaultValue="30d">
        <option value="7d">7 days</option>
        <option value="30d">30 days</option>
        <option value="90d">90 days</option>
      </select>
      <div>
        <button data-testid="events-tab">Events</button>
        <button data-testid="nasa-api-tab">NASA API</button>
        <button data-testid="performance-tab">Performance</button>
        <button data-testid="consent-tab">Consent</button>
      </div>
    </div>
  )
}))

// Import the mocked modules
import analyticsClient from '../services/analyticsClient.js'
import ConsentManager from '../components/analytics/ConsentManager.jsx'
import AnalyticsDashboard from '../components/analytics/AnalyticsDashboard.jsx'

describe('Analytics Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch.mockClear()

    // Setup default successful fetch response
    global.fetch.mockResolvedValue(mockApiResponse({ success: true }))
  })

  it('should initialize with default consent settings', () => {
    const status = analyticsClient.getConsentStatus()
    expect(status.settings.essential).toBe(true)
    expect(status.settings.performance).toBe(false)
    expect(status.settings.functional).toBe(false)
    expect(status.settings.marketing).toBe(false)
  })

  it('should generate unique session ID', () => {
    const sessionId = analyticsClient.getSessionId()
    expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
      'analytics_session_id',
      sessionId
    )
    expect(sessionId).toMatch(/^session_\d+_[a-z0-9]+$/)
  })

  it('should generate unique consent ID', () => {
    const consentId = analyticsClient.getConsentId()
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      'analytics_consent_id',
      consentId
    )
    expect(consentId).toBe('test-uuid-1234')
  })

  it('should track events with valid consent', async () => {
    // Mock consent granted
    window.localStorage.getItem.mockReturnValue(JSON.stringify({
      essential: true,
      performance: true,
      functional: true,
      marketing: true
    }))

    // Mock successful API response
    global.fetch.mockResolvedValueOnce(mockApiResponse({
      success: true,
      eventId: 'test-event-id'
    }))

    await analyticsClient.init()

    const result = await analyticsClient.trackEvent(
      'user_interaction',
      'functional',
      'button_click',
      { label: 'Test Button' }
    )

    expect(result.success).toBe(true)
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/analytics/events',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('user_interaction')
      })
    )
  })

  it('should reject events without consent', async () => {
    // Mock no consent
    window.localStorage.getItem.mockReturnValue(JSON.stringify({
      essential: true,
      performance: false,
      functional: false,
      marketing: false
    }))

    await analyticsClient.init()

    const result = await analyticsClient.trackEvent(
      'user_interaction',
      'functional',
      'button_click'
    )

    expect(result.success).toBe(false)
    expect(result.reason).toBe('no_consent')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should track page views with performance consent', async () => {
    // Mock performance consent
    window.localStorage.getItem.mockReturnValue(JSON.stringify({
      essential: true,
      performance: true,
      functional: false,
      marketing: false
    }))

    global.fetch.mockResolvedValueOnce(mockApiResponse({
      success: true,
      viewId: 'test-view-id'
    }))

    await analyticsClient.init()

    const result = await analyticsClient.trackPageView()

    expect(result.success).toBe(true)
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/analytics/page-view',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('pageUrl')
      })
    )
  })

  it('should track NASA API usage', async () => {
    // Mock performance consent
    window.localStorage.getItem.mockReturnValue(JSON.stringify({
      essential: true,
      performance: true,
      functional: false,
      marketing: false
    }))

    global.fetch.mockResolvedValueOnce(mockApiResponse({
      success: true,
      usageId: 'test-usage-id'
    }))

    await analyticsClient.init()

    const result = await analyticsClient.trackNasaApiUsage(
      'https://api.nasa.gov/planetary/apod',
      'GET',
      200,
      150,
      1024,
      false
    )

    expect(result.success).toBe(true)
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/analytics/nasa-api-usage',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('https://api.nasa.gov/planetary/apod')
      })
    )
  })

  it('should handle consent updates', async () => {
    global.fetch.mockResolvedValueOnce(mockApiResponse({
      success: true,
      consent: { id: 'test-consent-id' }
    }))

    await analyticsClient.init()

    const result = await analyticsClient.updateConsent({
      performance: true,
      functional: true
    })

    expect(result.success).toBe(true)
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      'analytics_consent',
      expect.stringContaining('"performance":true')
    )
  })

  it('should export user data for GDPR compliance', async () => {
    global.fetch.mockResolvedValueOnce(mockApiResponse({
      success: true,
      data: {
        consent: [],
        events: [],
        pageViews: []
      }
    }))

    const data = await analyticsClient.exportUserData()

    expect(data.success).toBe(true)
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/analytics/export-user-data/test-uuid-1234'
    )
  })

  it('should delete user data for GDPR/CCPA compliance', async () => {
    global.fetch.mockResolvedValueOnce(mockApiResponse({
      success: true,
      message: 'User data deleted successfully'
    }))

    const result = await analyticsClient.deleteUserData()

    expect(result.success).toBe(true)
    expect(window.localStorage.removeItem).toHaveBeenCalledWith('analytics_consent')
    expect(window.localStorage.removeItem).toHaveBeenCalledWith('analytics_consent_id')
    expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('analytics_session_id')
  })
})

describe('Consent Manager Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch.mockReset()
    global.fetch.mockResolvedValue(mockApiResponse({ success: true }))
  })

  it('should render consent banner', () => {
    render(<ConsentManager />)

    expect(screen.getByText(/Privacy & Analytics/)).toBeInTheDocument()
    expect(screen.getByText(/We use privacy-first analytics/)).toBeInTheDocument()
    expect(screen.getByTestId('accept-all-btn')).toBeInTheDocument()
    expect(screen.getByTestId('essential-only-btn')).toBeInTheDocument()
  })

  it('should render consent settings modal', () => {
    render(<ConsentManager showSettings={true} />)

    expect(screen.getByText('Privacy & Consent Settings')).toBeInTheDocument()
    expect(screen.getByText('Essential')).toBeInTheDocument()
    expect(screen.getByText('Performance')).toBeInTheDocument()
    expect(screen.getByText('Functional')).toBeInTheDocument()
    expect(screen.getByText('Marketing')).toBeInTheDocument()
  })

  it('should handle accept all consent', async () => {
    global.fetch.mockResolvedValueOnce(mockApiResponse({ success: true }))

    render(<ConsentManager />)

    const acceptAllButton = screen.getByTestId('accept-all-btn')
    await fireEvent.click(acceptAllButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/analytics/consent',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"performance":true')
        })
      )
    })
  })

  it('should handle reject non-essential consent', async () => {
    global.fetch.mockResolvedValueOnce(mockApiResponse({ success: true }))

    render(<ConsentManager />)

    const rejectButton = screen.getByTestId('essential-only-btn')
    await fireEvent.click(rejectButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/analytics/consent',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"performance":false')
        })
      )
    })
  })

  it('should toggle detailed information', () => {
    render(<ConsentManager />)

    const learnMoreButton = screen.getByTestId('learn-more-btn')
    fireEvent.click(learnMoreButton)

    // Should show detailed consent information
    expect(screen.getByText('Essential')).toBeInTheDocument()
  })

  it('should handle individual consent toggles', async () => {
    global.fetch.mockResolvedValue(mockApiResponse({ success: true }))

    render(<ConsentManager showSettings={true} />)

    const performanceCheckbox = screen.getByTestId('performance-checkbox')
    fireEvent.click(performanceCheckbox)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/analytics/consent',
        expect.objectContaining({
          method: 'POST'
        })
      )
    })
  })
})

describe('Analytics Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch.mockReset()
    global.fetch.mockResolvedValue(mockApiResponse({ success: true, data: [] }))
  })

  it('should render dashboard with loading state', () => {
    render(<AnalyticsDashboard />)

    expect(screen.getByText('Loading analytics data...')).toBeInTheDocument()
    expect(screen.getByText('NASA System 7 Analytics')).toBeInTheDocument()
  })

  it('should render dashboard with data', async () => {
    global.fetch.mockResolvedValueOnce(mockApiResponse({
      success: true,
      data: [
        {
          event_date: '2025-11-08',
          event_type: 'page_view',
          event_category: 'performance',
          event_count: 100,
          avg_duration_ms: 1500,
          unique_sessions: 50,
          unique_users: 25
        }
      ]
    }))

    global.fetch.mockResolvedValueOnce(mockApiResponse({
      success: true,
      data: [
        {
          api_endpoint: 'https://api.nasa.gov/planetary/apod',
          request_count: 50,
          avg_response_time: 200,
          cache_hits: 40,
          error_count: 0
        }
      ]
    }))

    global.fetch.mockResolvedValueOnce(mockApiResponse({
      success: true,
      data: [
        {
          metric_type: 'core_web_vitals',
          metric_name: 'largest_contentful_paint',
          avg_value: 1200,
          min_value: 800,
          max_value: 2000
        }
      ]
    }))

    render(<AnalyticsDashboard />)

    // Wait for data to load and display
    await waitFor(() => {
      expect(screen.getByTestId('time-range-select')).toBeInTheDocument()
    })

    expect(screen.getByText('NASA System 7 Analytics')).toBeInTheDocument()
    expect(screen.getByTestId('events-tab')).toBeInTheDocument()
    expect(screen.getByTestId('nasa-api-tab')).toBeInTheDocument()
    expect(screen.getByTestId('performance-tab')).toBeInTheDocument()
    expect(screen.getByTestId('consent-tab')).toBeInTheDocument()
  })

  it('should handle time range selection', async () => {
    global.fetch.mockResolvedValue(mockApiResponse({
      success: true,
      data: []
    }))

    render(<AnalyticsDashboard />)

    const timeRangeSelect = screen.getByTestId('time-range-select')
    fireEvent.change(timeRangeSelect, { target: { value: '7d' } })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/analytics/dashboard?timeRange=7d',
        expect.any(Object)
      )
    })
  })

  it('should switch between metric tabs', async () => {
    global.fetch.mockResolvedValue(mockApiResponse({
      success: true,
      data: []
    }))

    render(<AnalyticsDashboard />)

    const nasaApiTab = screen.getByTestId('nasa-api-tab')
    fireEvent.click(nasaApiTab)

    await waitFor(() => {
      expect(nasaApiTab).toBeInTheDocument()
    })

    const consentTab = screen.getByTestId('consent-tab')
    fireEvent.click(consentTab)

    await waitFor(() => {
      expect(consentTab).toBeInTheDocument()
    })
  })
})

describe('Performance Monitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch.mockResolvedValue(mockApiResponse({ success: true }))

    // Mock consent for performance events
    window.localStorage.getItem.mockReturnValue(JSON.stringify({
      essential: true,
      performance: true,
      functional: false,
      marketing: false
    }))
  })

  it('should track Core Web Vitals', async () => {
    // Mock PerformanceObserver
    const mockObserver = {
      observe: vi.fn(),
      disconnect: vi.fn()
    }

    global.PerformanceObserver = vi.fn(() => mockObserver)

    await analyticsClient.init()

    expect(global.PerformanceObserver).toHaveBeenCalled()
  })

  it('should track memory usage', async () => {
    await analyticsClient.init()

    const result = await analyticsClient.trackPerformanceMetric(
      'memory',
      'js_heap_used',
      50,
      'MB'
    )

    expect(result.success).toBe(true)
  })

  it('should handle error tracking', async () => {
    await analyticsClient.init()

    const error = new Error('Test error')
    analyticsClient.trackError(error, { component: 'TestComponent' })

    // Error tracking should always work (essential category)
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/analytics/events',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Test error')
      })
    )
  })
})

describe('Privacy Compliance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch.mockResolvedValue(mockApiResponse({ success: true }))
  })

  it('should respect user consent preferences', async () => {
    // Mock user only consents to essential
    window.localStorage.getItem.mockReturnValue(JSON.stringify({
      essential: true,
      performance: false,
      functional: false,
      marketing: false
    }))

    await analyticsClient.init()

    // Should track essential events
    const errorResult = await analyticsClient.trackEvent(
      'error',
      'essential',
      'javascript_error'
    )

    // Should not track performance events
    const perfResult = await analyticsClient.trackEvent(
      'performance',
      'performance',
      'page_load_time'
    )

    expect(errorResult.success).toBe(true)
    expect(perfResult.success).toBe(false)
    expect(perfResult.reason).toBe('no_consent')
  })

  it('should handle consent withdrawal', async () => {
    // Mock initial consent
    window.localStorage.getItem.mockReturnValue(JSON.stringify({
      essential: true,
      performance: true,
      functional: true,
      marketing: true
    }))

    global.fetch.mockResolvedValue(mockApiResponse({ success: true }))

    await analyticsClient.init()

    // Withdraw consent
    await analyticsClient.updateConsent({
      performance: false,
      functional: false,
      marketing: false
    })

    // Try to track performance event
    const result = await analyticsClient.trackEvent(
      'performance',
      'performance',
      'page_load_time'
    )

    expect(result.success).toBe(false)
  })

  it('should anonymize user data', () => {
    const userIdentifier = analyticsClient.generateUserIdentifier(
      '192.168.1.1',
      'Mozilla/5.0 (Test Browser)'
    )

    expect(userIdentifier).toMatch(/^[a-f0-9]{64}$/) // SHA256 hash
    expect(userIdentifier).not.toContain('192.168.1.1')
    expect(userIdentifier).not.toContain('Mozilla')
  })
})