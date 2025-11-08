import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import analyticsClient from '../services/analyticsClient';
import ConsentManager from '../components/analytics/ConsentManager';
import AnalyticsDashboard from '../components/analytics/AnalyticsDashboard';

// Mock fetch API
global.fetch = vi.fn();

// Mock UUID generation
vi.mock('uuid', () => ({
  v4: () => 'test-uuid-1234'
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
    timing: {
      navigationStart: 1000000,
      loadEventEnd: 1001500
    },
    getEntriesByType: vi.fn(() => []),
    memory: {
      usedJSHeapSize: 50 * 1024 * 1024, // 50MB
      totalJSHeapSize: 100 * 1024 * 1024, // 100MB
      jsHeapSizeLimit: 2048 * 1024 * 1024 // 2GB
    }
  }
});

// Mock navigator
Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'Test Browser',
    language: 'en-US',
    onLine: true,
    connection: {
      effectiveType: '4g',
      downlink: 10,
      rtt: 50
    }
  }
});

describe('Analytics Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    sessionStorageMock.getItem.mockReturnValue(null);
  });

  it('should initialize with default consent settings', () => {
    const status = analyticsClient.getConsentStatus();
    expect(status.settings.essential).toBe(true);
    expect(status.settings.performance).toBe(false);
    expect(status.settings.functional).toBe(false);
    expect(status.settings.marketing).toBe(false);
  });

  it('should generate unique session ID', () => {
    const sessionId = analyticsClient.getSessionId();
    expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
      'analytics_session_id',
      sessionId
    );
    expect(sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
  });

  it('should generate unique consent ID', () => {
    const consentId = analyticsClient.getConsentId();
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'analytics_consent_id',
      consentId
    );
    expect(consentId).toBe('test-uuid-1234');
  });

  it('should track events with valid consent', async () => {
    // Mock consent granted
    localStorageMock.getItem.mockReturnValue(JSON.stringify({
      essential: true,
      performance: true,
      functional: true,
      marketing: true
    }));

    // Mock successful API response
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, eventId: 'test-event-id' })
    });

    await analyticsClient.init();

    const result = await analyticsClient.trackEvent(
      'user_interaction',
      'functional',
      'button_click',
      { label: 'Test Button' }
    );

    expect(result.success).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      '/api/analytics/events',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('user_interaction')
      })
    );
  });

  it('should reject events without consent', async () => {
    // Mock no consent
    localStorageMock.getItem.mockReturnValue(JSON.stringify({
      essential: true,
      performance: false,
      functional: false,
      marketing: false
    }));

    await analyticsClient.init();

    const result = await analyticsClient.trackEvent(
      'user_interaction',
      'functional',
      'button_click'
    );

    expect(result.success).toBe(false);
    expect(result.reason).toBe('no_consent');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should track page views with performance consent', async () => {
    // Mock performance consent
    localStorageMock.getItem.mockReturnValue(JSON.stringify({
      essential: true,
      performance: true,
      functional: false,
      marketing: false
    }));

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, viewId: 'test-view-id' })
    });

    await analyticsClient.init();

    const result = await analyticsClient.trackPageView();

    expect(result.success).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      '/api/analytics/page-view',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('pageUrl')
      })
    );
  });

  it('should track NASA API usage', async () => {
    // Mock performance consent
    localStorageMock.getItem.mockReturnValue(JSON.stringify({
      essential: true,
      performance: true,
      functional: false,
      marketing: false
    }));

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, usageId: 'test-usage-id' })
    });

    await analyticsClient.init();

    const result = await analyticsClient.trackNasaApiUsage(
      'https://api.nasa.gov/planetary/apod',
      'GET',
      200,
      150,
      1024,
      false
    );

    expect(result.success).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      '/api/analytics/nasa-api-usage',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('https://api.nasa.gov/planetary/apod')
      })
    );
  });

  it('should handle consent updates', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, consent: { id: 'test-consent-id' } })
    });

    await analyticsClient.init();

    const result = await analyticsClient.updateConsent({
      performance: true,
      functional: true
    });

    expect(result.success).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'analytics_consent',
      expect.stringContaining('"performance":true')
    );
  });

  it('should export user data for GDPR compliance', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          consent: [],
          events: [],
          pageViews: []
        }
      })
    });

    const data = await analyticsClient.exportUserData();

    expect(data.success).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      '/api/analytics/export-user-data/test-uuid-1234'
    );
  });

  it('should delete user data for GDPR/CCPA compliance', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'User data deleted successfully'
      })
    });

    const result = await analyticsClient.deleteUserData();

    expect(result.success).toBe(true);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('analytics_consent');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('analytics_consent_id');
    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('analytics_session_id');
  });
});

describe('Consent Manager Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetch.mockReset();
  });

  it('should render consent banner', () => {
    render(<ConsentManager />);

    expect(screen.getByText(/Privacy & Analytics/)).toBeInTheDocument();
    expect(screen.getByText(/We use privacy-first analytics/)).toBeInTheDocument();
    expect(screen.getByText('Accept All')).toBeInTheDocument();
    expect(screen.getByText('Essential Only')).toBeInTheDocument();
  });

  it('should render consent settings modal', () => {
    render(<ConsentManager showSettings={true} />);

    expect(screen.getByText('Privacy & Consent Settings')).toBeInTheDocument();
    expect(screen.getByText('Essential')).toBeInTheDocument();
    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.getByText('Functional')).toBeInTheDocument();
    expect(screen.getByText('Marketing')).toBeInTheDocument();
  });

  it('should handle accept all consent', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    render(<ConsentManager />);

    const acceptAllButton = screen.getByText('Accept All');
    fireEvent.click(acceptAllButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/analytics/consent',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"performance":true')
        })
      );
    });
  });

  it('should handle reject non-essential consent', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    render(<ConsentManager />);

    const rejectButton = screen.getByText('Essential Only');
    fireEvent.click(rejectButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/analytics/consent',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"performance":false')
        })
      );
    });
  });

  it('should toggle detailed information', () => {
    render(<ConsentManager />);

    const learnMoreButton = screen.getByText('Learn More');
    fireEvent.click(learnMoreButton);

    expect(screen.getByText(/Essential Cookies/)).toBeInTheDocument();
    expect(screen.getByText(/Performance Cookies/)).toBeInTheDocument();
  });

  it('should handle individual consent toggles', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });

    render(<ConsentManager showSettings={true} />);

    const performanceCheckbox = screen.getByLabelText('Performance');
    fireEvent.click(performanceCheckbox);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/analytics/consent',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });
});

describe('Analytics Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetch.mockReset();
  });

  it('should render dashboard with loading state', () => {
    render(<AnalyticsDashboard />);

    expect(screen.getByText('Loading analytics data...')).toBeInTheDocument();
    expect(screen.getByText('NASA System 7 Analytics')).toBeInTheDocument();
  });

  it('should render dashboard with data', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            event_date: '2024-01-01',
            event_type: 'page_view',
            event_category: 'performance',
            event_count: 100,
            avg_duration_ms: 1500,
            unique_sessions: 50,
            unique_users: 25
          }
        ]
      })
    });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
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
      })
    });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
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
      })
    });

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument(); // Total Events
      expect(screen.getByText('25')).toBeInTheDocument(); // Unique Users
      expect(screen.getByText('50')).toBeInTheDocument(); // Sessions
    });

    expect(screen.getByText('NASA API Usage')).toBeInTheDocument();
    expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
  });

  it('should handle time range selection', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: []
      })
    });

    render(<AnalyticsDashboard />);

    const timeRangeSelect = screen.getByDisplayValue('30d');
    fireEvent.change(timeRangeSelect, { target: { value: '7d' } });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/analytics/dashboard?timeRange=7d',
        expect.any(Object)
      );
    });
  });

  it('should switch between metric tabs', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: []
      })
    });

    render(<AnalyticsDashboard />);

    const nasaApiTab = screen.getByText('Nasa Api');
    fireEvent.click(nasaApiTab);

    await waitFor(() => {
      expect(screen.getByText('NASA API Usage')).toBeInTheDocument();
    });
  });

  it('should render consent manager in dashboard', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: []
      })
    });

    render(<AnalyticsDashboard />);

    const consentTab = screen.getByText('Consent');
    fireEvent.click(consentTab);

    await waitFor(() => {
      expect(screen.getByText('Privacy & Consent Settings')).toBeInTheDocument();
    });
  });
});

describe('Performance Monitoring', () => {
  it('should track Core Web Vitals', async () => {
    // Mock PerformanceObserver
    const mockObserver = {
      observe: vi.fn(),
      disconnect: vi.fn()
    };

    global.PerformanceObserver = vi.fn(() => mockObserver);

    // Mock consent
    localStorageMock.getItem.mockReturnValue(JSON.stringify({
      essential: true,
      performance: true,
      functional: false,
      marketing: false
    }));

    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });

    await analyticsClient.init();

    expect(global.PerformanceObserver).toHaveBeenCalled();
  });

  it('should track memory usage', async () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify({
      essential: true,
      performance: true,
      functional: false,
      marketing: false
    }));

    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });

    await analyticsClient.init();

    const result = await analyticsClient.trackPerformanceMetric(
      'memory',
      'js_heap_used',
      50,
      'MB'
    );

    expect(result.success).toBe(true);
  });

  it('should handle error tracking', async () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify({
      essential: true,
      performance: true,
      functional: false,
      marketing: false
    }));

    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });

    await analyticsClient.init();

    const error = new Error('Test error');
    analyticsClient.trackError(error, { component: 'TestComponent' });

    // Error tracking should always work (essential category)
    expect(fetch).toHaveBeenCalledWith(
      '/api/analytics/events',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Test error')
      })
    );
  });
});

describe('Privacy Compliance', () => {
  it('should respect user consent preferences', async () => {
    // Mock user only consents to essential
    localStorageMock.getItem.mockReturnValue(JSON.stringify({
      essential: true,
      performance: false,
      functional: false,
      marketing: false
    }));

    await analyticsClient.init();

    // Should track essential events
    const errorResult = await analyticsClient.trackEvent(
      'error',
      'essential',
      'javascript_error'
    );

    // Should not track performance events
    const perfResult = await analyticsClient.trackEvent(
      'performance',
      'performance',
      'page_load_time'
    );

    expect(errorResult.success).toBe(true);
    expect(perfResult.success).toBe(false);
    expect(perfResult.reason).toBe('no_consent');
  });

  it('should handle consent withdrawal', async () => {
    // Mock initial consent
    localStorageMock.getItem.mockReturnValue(JSON.stringify({
      essential: true,
      performance: true,
      functional: true,
      marketing: true
    }));

    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });

    await analyticsClient.init();

    // Withdraw consent
    await analyticsClient.updateConsent({
      performance: false,
      functional: false,
      marketing: false
    });

    // Try to track performance event
    const result = await analyticsClient.trackEvent(
      'performance',
      'performance',
      'page_load_time'
    );

    expect(result.success).toBe(false);
  });

  it('should anonymize user data', async () => {
    const userIdentifier = analyticsClient.generateUserIdentifier(
      '192.168.1.1',
      'Mozilla/5.0 (Test Browser)'
    );

    expect(userIdentifier).toMatch(/^[a-f0-9]{64}$/); // SHA256 hash
    expect(userIdentifier).not.toContain('192.168.1.1');
    expect(userIdentifier).not.toContain('Mozilla');
  });
});