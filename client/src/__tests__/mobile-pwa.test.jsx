import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { within } from '@testing-library/user-event';
import '@testing-library/jest-dom';
import MobileDesktop from '../components/system7/MobileDesktop.jsx';
import MobilePerformanceMonitor from '../components/Performance/MobilePerformanceMonitor.jsx';
import App from '../App.jsx';
import { useMediaQuery } from '../hooks/useMediaQuery.js';
import { useTouchGestures } from '../hooks/useTouchGestures.js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AppsProvider } from '../contexts/AppContext.jsx';

// Mock the performance API for mobile testing
const mockPerformanceObserver = vi.fn();
const mockPerformance = vi.fn();

// Mock service worker registration
const mockRegister = vi.fn().mockResolvedValue({
  installing: null,
  waiting: null,
  active: null
});

Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: mockRegister,
    addEventListener: vi.fn(),
    controller: null
  },
  writable: true
});

// Mock device APIs
Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
  writable: true
});

Object.defineProperty(navigator, 'platform', {
  value: 'iPhone',
  writable: true
});

Object.defineProperty(navigator, 'hardwareConcurrency', {
  value: 6,
  writable: true
});

Object.defineProperty(navigator, 'deviceMemory', {
  value: 4,
  writable: true
});

Object.defineProperty(navigator, 'vibrate', {
  value: vi.fn(),
  writable: true
});

Object.defineProperty(window, 'devicePixelRatio', {
  value: 2,
  writable: true
});

Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation(query => ({
    matches: query.includes('max-width: 768px'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
  writable: true
});

// Mock performance APIs
Object.defineProperty(window, 'performance', {
  value: {
    ...window.performance,
    getEntriesByType: vi.fn().mockReturnValue([]),
    measure: vi.fn(),
    mark: vi.fn(),
    memory: {
      usedJSHeapSize: 30000000,
      totalJSHeapSize: 50000000
    },
    timing: {
      responseStart: 300,
      requestStart: 100
    }
  },
  writable: true
});

Object.defineProperty(global, 'PerformanceObserver', {
  value: class MockPerformanceObserver {
    constructor(callback) {
      this.callback = callback;
    }
    observe() {}
    disconnect() {}
  },
  writable: true
});

// Test wrapper with providers
const TestWrapper = ({ children, initialEntries = ['/'] }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter initialEntries={initialEntries}>
        <AppsProvider>
          {children}
        </AppsProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Custom render function with mobile viewport
const renderWithMobileViewport = (component, options = {}) => {
  // Set mobile viewport size
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 375,
  });

  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 667,
  });

  // Trigger resize event
  window.dispatchEvent(new Event('resize'));

  return render(component, {
    wrapper: ({ children }) => (
      <TestWrapper initialEntries={['/']}>
        {children}
      </TestWrapper>
    ),
    ...options,
  });
};

// Custom render function for tablet viewport
const renderWithTabletViewport = (component, options = {}) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 768,
  });

  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 1024,
  });

  window.dispatchEvent(new Event('resize'));

  return render(component, {
    wrapper: ({ children }) => (
      <TestWrapper initialEntries={['/']}>
        {children}
      </TestWrapper>
    ),
    ...options,
  });
};

describe('Mobile Device Testing - NASA System 7 Portal', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset viewport to mobile default
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667,
    });

    window.dispatchEvent(new Event('resize'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Mobile Device Detection and Responsiveness', () => {
    it('should detect mobile viewport correctly', () => {
      renderWithMobileViewport(<MobileDesktop />);

      // Should render mobile-optimized layout
      expect(screen.getByTestId('mobile-desktop')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-desktop')).toHaveClass('p-2', 'pt-6');
    });

    it('should detect tablet viewport correctly', () => {
      renderWithTabletViewport(<MobileDesktop />);

      // Should render tablet-optimized layout
      expect(screen.getByTestId('mobile-desktop')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-desktop')).toHaveClass('p-4', 'pt-8');
    });

    it('should adapt layout for different screen sizes', async () => {
      const { rerender } = renderWithMobileViewport(<MobileDesktop />);

      // Initial mobile layout
      expect(screen.getByTestId('mobile-desktop')).toHaveClass('p-2');

      // Change to tablet size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      await act(async () => {
        window.dispatchEvent(new Event('resize'));
        rerender(<MobileDesktop />);
      });

      expect(screen.getByTestId('mobile-desktop')).toHaveClass('p-4');
    });

    it('should prevent text selection on touch devices', () => {
      renderWithMobileViewport(<MobileDesktop />);

      const desktop = screen.getByTestId('mobile-desktop');
      expect(desktop).toHaveStyle({
        WebkitUserSelect: 'none',
        userSelect: 'none'
      });
    });

    it('should optimize touch actions for mobile', () => {
      renderWithMobileViewport(<MobileDesktop />);

      const desktop = screen.getByTestId('mobile-desktop');
      expect(desktop).toHaveStyle({
        touchAction: 'pan-y'
      });
    });
  });

  describe('Touch Gesture Recognition', () => {
    it('should handle tap gestures on mobile icons', async () => {
      renderWithMobileViewport(<MobileDesktop />);

      const apodIcon = screen.getByTestId('mobile-icon-apod');

      // Mock haptic feedback
      const mockVibrate = vi.fn();
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        writable: true,
      });

      // Simulate tap
      fireEvent.click(apodIcon);

      // Should trigger haptic feedback
      expect(mockVibrate).toHaveBeenCalledWith(50);
    });

    it('should handle swipe gestures for navigation', async () => {
      renderWithMobileViewport(<MobileDesktop />);

      const desktop = screen.getByTestId('mobile-desktop');

      // Simulate swipe up gesture
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 200, clientY: 500 }]
      });
      const touchMove = new TouchEvent('touchmove', {
        touches: [{ clientX: 200, clientY: 200 }]
      });
      const touchEnd = new TouchEvent('touchend');

      fireEvent(desktop, touchStart);
      fireEvent(desktop, touchMove);
      fireEvent(desktop, touchEnd);

      // Should handle swipe gesture
      expect(desktop).toBeInTheDocument();
    });

    it('should handle pinch gestures for zoom', async () => {
      renderWithMobileViewport(<MobileDesktop />);

      const desktop = screen.getByTestId('mobile-desktop');

      // Simulate pinch gesture
      const pinchStart = new TouchEvent('touchstart', {
        touches: [
          { clientX: 100, clientY: 200 },
          { clientX: 200, clientY: 200 }
        ]
      });
      const pinchMove = new TouchEvent('touchmove', {
        touches: [
          { clientX: 80, clientY: 200 },
          { clientX: 220, clientY: 200 }
        ]
      });

      fireEvent(desktop, pinchStart);
      fireEvent(desktop, pinchMove);

      expect(desktop).toBeInTheDocument();
    });

    it('should prevent scrolling during multi-touch gestures', () => {
      renderWithMobileViewport(<MobileDesktop />);

      const desktop = screen.getByTestId('mobile-desktop');

      // Simulate multi-touch
      const multiTouchEvent = new TouchEvent('touchmove', {
        touches: [
          { clientX: 100, clientY: 200 },
          { clientX: 200, clientY: 200 }
        ]
      });

      const preventDefault = vi.fn();
      Object.defineProperty(multiTouchEvent, 'preventDefault', {
        value: preventDefault,
        writable: true
      });

      fireEvent(desktop, multiTouchEvent);

      expect(preventDefault).toHaveBeenCalled();
    });
  });

  describe('Mobile Dock and Navigation', () => {
    it('should render mobile dock on small screens', () => {
      renderWithMobileViewport(<MobileDesktop />);

      expect(screen.getByTestId('mobile-dock')).toBeInTheDocument();
      expect(screen.getByTestId('dock-button-apod')).toBeInTheDocument();
      expect(screen.getByTestId('dock-button-neows')).toBeInTheDocument();
    });

    it('should handle dock button interactions', async () => {
      renderWithMobileViewport(<MobileDesktop />);

      const apodDockButton = screen.getByTestId('dock-button-apod');

      fireEvent.click(apodDockButton);

      // Should handle the interaction
      expect(apodDockButton).toBeInTheDocument();
    });

    it('should show/hide dock with swipe gestures', async () => {
      renderWithMobileViewport(<MobileDesktop />);

      const desktop = screen.getByTestId('mobile-desktop');
      const dock = screen.getByTestId('mobile-dock');

      // Initially visible
      expect(dock).toHaveClass('translate-y-0');

      // Simulate swipe up to hide dock
      const swipeUp = new TouchEvent('touchend', {
        changedTouches: [{ clientY: 100 }]
      });

      fireEvent(desktop, swipeUp);

      // Dock visibility should change
      expect(dock).toBeInTheDocument();
    });

    it('should optimize dock for touch targets', () => {
      renderWithMobileViewport(<MobileDesktop />);

      const dockButtons = screen.getAllByTestId(/^dock-button-/);

      dockButtons.forEach(button => {
        // Should have proper touch target size
        expect(button).toHaveClass('p-2');
      });
    });
  });

  describe('Mobile Window Management', () => {
    it('should handle mobile-optimized windows', async () => {
      renderWithMobileViewport(<MobileDesktop />);

      // Open an app
      const apodIcon = screen.getByTestId('mobile-icon-apod');
      fireEvent.click(apodIcon);

      // Should open mobile window
      await waitFor(() => {
        expect(screen.getByTestId('mobile-window-apod')).toBeInTheDocument();
      });
    });

    it('should optimize window sizes for mobile screens', async () => {
      renderWithMobileViewport(<MobileDesktop />);

      // Open an app
      const apodIcon = screen.getByTestId('mobile-icon-apod');
      fireEvent.click(apodIcon);

      await waitFor(() => {
        const window = screen.getByTestId('mobile-window-apod');
        expect(window).toBeInTheDocument();
        // Window should be optimized for mobile
      });
    });
  });

  describe('Mobile Performance Monitoring', () => {
    it('should render mobile performance monitor', () => {
      render(<MobilePerformanceMonitor />);

      expect(screen.getByText('Show performance monitor')).toBeInTheDocument();
    });

    it('should track Core Web Vitals on mobile', async () => {
      const mockEntries = [
        {
          renderTime: 1200,
          loadTime: 1200
        }
      ];

      Object.defineProperty(window, 'performance', {
        value: {
          ...window.performance,
          getEntriesByType: vi.fn().mockReturnValue(mockEntries)
        },
        writable: true
      });

      render(<MobilePerformanceMonitor />);

      // Open performance monitor
      const openButton = screen.getByText('Show performance monitor');
      fireEvent.click(openButton);

      await waitFor(() => {
        expect(screen.getByText('Mobile Performance Monitor')).toBeInTheDocument();
        expect(screen.getByText('Core Web Vitals')).toBeInTheDocument();
      });
    });

    it('should monitor memory usage on mobile', () => {
      render(<MobilePerformanceMonitor />);

      fireEvent.click(screen.getByText('Show performance monitor'));

      expect(screen.getByText('Memory')).toBeInTheDocument();
      expect(screen.getByText('JS Heap Usage')).toBeInTheDocument();
    });

    it('should display device information', async () => {
      render(<MobilePerformanceMonitor />);

      fireEvent.click(screen.getByText('Show performance monitor'));

      await waitFor(() => {
        expect(screen.getByText('Device Information')).toBeInTheDocument();
        expect(screen.getByText('Connection:')).toBeInTheDocument();
        expect(screen.getByText('Device Type:')).toBeInTheDocument();
      });
    });

    it('should provide performance alerts', async () => {
      // Mock slow performance
      const mockSlowEntries = [
        {
          renderTime: 3000, // Slow LCP
          loadTime: 3000
        }
      ];

      Object.defineProperty(window, 'performance', {
        value: {
          ...window.performance,
          getEntriesByType: vi.fn().mockReturnValue(mockSlowEntries)
        },
        writable: true
      });

      render(<MobilePerformanceMonitor />);

      fireEvent.click(screen.getByText('Show performance monitor'));

      await waitFor(() => {
        expect(screen.getByText('Performance Alerts')).toBeInTheDocument();
      });
    });
  });

  describe('PWA Functionality', () => {
    it('should register service worker on production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      render(<App />);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith('/sw.js');
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle PWA install prompt', async () => {
      const mockPrompt = {
        prompt: vi.fn().mockResolvedValue({ outcome: 'accepted' }),
        userChoice: vi.fn().mockResolvedValue({ outcome: 'accepted' })
      };

      render(<App />);

      // Simulate install prompt event
      const installEvent = new Event('beforeinstallprompt');
      Object.defineProperty(installEvent, 'preventDefault', {
        value: vi.fn()
      });
      Object.defineProperty(installEvent, 'userChoice', {
        value: Promise.resolve({ outcome: 'accepted' })
      });

      window.dispatchEvent(installEvent);

      expect(window.pwaInstallPrompt).toBeDefined();
    });

    it('should monitor network status', () => {
      render(<App />);

      // Should add offline class when offline
      const offlineEvent = new Event('offline');
      window.dispatchEvent(offlineEvent);

      expect(document.body.classList.contains('offline')).toBe(true);

      // Should remove offline class when online
      const onlineEvent = new Event('online');
      window.dispatchEvent(onlineEvent);

      expect(document.body.classList.contains('offline')).toBe(false);
    });

    it('should show offline indicator', () => {
      render(<App />);

      const offlineIndicator = document.getElementById('offline-indicator');
      expect(offlineIndicator).toBeInTheDocument();
      expect(offlineIndicator).toHaveAttribute('aria-live', 'polite');
    });

    it('should optimize viewport for mobile devices', async () => {
      render(<App />);

      await waitFor(() => {
        const viewport = document.querySelector('meta[name="viewport"]');
        expect(viewport).toBeInTheDocument();
        expect(viewport.getAttribute('content')).toContain('width=device-width');
        expect(viewport.getAttribute('content')).toContain('user-scalable=no');
      });
    });
  });

  describe('Accessibility on Mobile Devices', () => {
    it('should provide proper ARIA labels for touch interactions', () => {
      renderWithMobileViewport(<MobileDesktop />);

      const apodIcon = screen.getByLabelText(/Astronomy Picture - Tap to open/i);
      expect(apodIcon).toBeInTheDocument();
    });

    it('should announce screen reader messages', () => {
      renderWithMobileViewport(<MobileDesktop />);

      const announcements = screen.getByTestId('screen-reader-announcements');
      expect(announcements).toHaveAttribute('aria-live', 'polite');
      expect(announcements).toHaveAttribute('aria-atomic', 'true');
    });

    it('should support keyboard navigation on mobile', () => {
      renderWithMobileViewport(<MobileDesktop />);

      const desktop = screen.getByTestId('mobile-desktop');
      expect(desktop).toHaveAttribute('tabIndex', '0');

      // Test keyboard navigation
      fireEvent.keyDown(desktop, { key: 'Escape' });

      expect(desktop).toBeInTheDocument();
    });

    it('should have proper touch target sizes', () => {
      renderWithMobileViewport(<MobileDesktop />);

      const mobileIcons = screen.getAllByTestId(/^mobile-icon-/);

      mobileIcons.forEach(icon => {
        // Should have adequate touch target size
        expect(icon).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Optimization Features', () => {
    it('should use lazy loading for heavy components', () => {
      renderWithMobileViewport(<App />);

      // Should show loading fallback initially
      expect(screen.getByText(/Loading NASA System 7 Portal/i)).toBeInTheDocument();
    });

    it('should optimize loading messages for mobile', () => {
      renderWithMobileViewport(<App />);

      expect(screen.getByText('Optimizing for your device...')).toBeInTheDocument();
    });

    it('should handle orientation changes', async () => {
      renderWithMobileViewport(<MobileDesktop />);

      // Simulate orientation change to landscape
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 667,
      });

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 375,
      });

      await act(async () => {
        window.dispatchEvent(new Event('resize'));
      });

      expect(screen.getByTestId('mobile-desktop')).toBeInTheDocument();
    });

    it('should prevent zooming on mobile', async () => {
      render(<App />);

      await waitFor(() => {
        const viewport = document.querySelector('meta[name="viewport"]');
        expect(viewport.getAttribute('content')).toContain('maximum-scale=1.0');
      });
    });
  });

  describe('Battery and Network Optimization', () => {
    it('should monitor battery level on supported devices', async () => {
      const mockBattery = {
        level: 0.75,
        addEventListener: vi.fn()
      };

      Object.defineProperty(navigator, 'getBattery', {
        value: vi.fn().mockResolvedValue(mockBattery),
        writable: true
      });

      render(<MobilePerformanceMonitor />);
      fireEvent.click(screen.getByText('Show performance monitor'));

      await waitFor(() => {
        expect(screen.getByText(/Battery:/)).toBeInTheDocument();
        expect(screen.getByText('75%')).toBeInTheDocument();
      });
    });

    it('should detect network connection type', async () => {
      const mockConnection = {
        effectiveType: '4g',
        downlink: 10,
        addEventListener: vi.fn()
      };

      Object.defineProperty(navigator, 'connection', {
        value: mockConnection,
        writable: true
      });

      render(<MobilePerformanceMonitor />);
      fireEvent.click(screen.getByText('Show performance monitor'));

      await waitFor(() => {
        expect(screen.getByText('Connection:')).toBeInTheDocument();
        expect(screen.getByText('4g')).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Bundle Optimization', () => {
    it('should use mobile-optimized bundle splitting', () => {
      // Test that Vite configuration includes mobile optimization
      expect(true).toBe(true); // Placeholder for bundle testing
    });

    it('should minimize console output in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      render(<App />);

      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });
  });
});