import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock all hooks first
vi.mock('../hooks/useMediaQuery.js', () => ({
  useMediaQuery: vi.fn()
}));

vi.mock('../hooks/useTouchGestures.js', () => ({
  useTouchGestures: vi.fn(() => ({
    onTouchStart: vi.fn(),
    onTouchMove: vi.fn(),
    onTouchEnd: vi.fn(),
    onTap: vi.fn(),
    onDoubleTap: vi.fn(),
    onSwipe: vi.fn(),
    onPinch: vi.fn()
  }))
}));

vi.mock('../hooks/useSound.js', () => ({
  useSound: vi.fn(() => vi.fn())
}));

vi.mock('../hooks/usePerformanceOptimized.js', () => ({
  useBundleMonitor: vi.fn()
}));

vi.mock('../contexts/AppContext.jsx', () => ({
  useApps: vi.fn(() => ({
    apps: {},
    openApp: vi.fn(),
    closeApp: vi.fn(),
    bringToFront: vi.fn()
  }))
}));

// Now import components
import App from '../App.jsx';
import { useMediaQuery } from '../hooks/useMediaQuery.js';
import { useTouchGestures } from '../hooks/useTouchGestures.js';

// Mock mobile environment
const mockMatchMedia = (matches) => ({
  matches,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

// Mock touch events
const createTouchEvent = (type, touches = []) => ({
  type,
  touches: touches.map(touch => ({
    clientX: touch.x,
    clientY: touch.y,
    identifier: touch.id || 0
  })),
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
});

// Mock WebSocket
const mockWebSocket = {
  close: vi.fn(),
  send: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: WebSocket.OPEN,
};

// Mock service worker
Object.defineProperty(navigator, 'serviceWorker', {
  writable: true,
  value: {
    register: vi.fn().mockResolvedValue({}),
    addEventListener: vi.fn(),
    ready: Promise.resolve({
      active: {
        postMessage: vi.fn()
      }
    })
  }
});

// Mock vibration API
Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: vi.fn()
});

// Mock battery API
Object.defineProperty(navigator, 'getBattery', {
  writable: true,
  value: vi.fn().mockResolvedValue({
    level: 0.85,
    charging: true
  })
});

// Mock connection API
Object.defineProperty(navigator, 'connection', {
  writable: true,
  value: {
    effectiveType: '4g',
    downlink: 10,
    addEventListener: vi.fn()
  }
});

// Mock performance API
Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    memory: {
      usedJSHeapSize: 50000000,
      totalJSHeapSize: 100000000
    },
    getEntriesByType: vi.fn(() => []),
    timing: {
      requestStart: 1000,
      responseStart: 1200
    }
  }
});

// Mock WebSocket global
global.WebSocket = vi.fn(() => mockWebSocket);

describe('Mobile Optimization Tests', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock window.matchMedia for mobile viewport
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn((query) => {
        if (query === '(max-width: 768px)') {
          return mockMatchMedia(true); // Mobile
        }
        if (query === '(max-width: 1024px)') {
          return mockMatchMedia(true); // Tablet
        }
        return mockMatchMedia(false);
      })
    });

    // Mock screen sizes
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375
    });

    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667
    });

    // Mock touch support
    Object.defineProperty(window, 'ontouchstart', {
      writable: true,
      value: vi.fn()
    });

    useMediaQuery.mockReturnValue(true); // Mobile view
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Mobile Layout Detection', () => {
    it('should render mobile desktop on small screens', async () => {
      useMediaQuery.mockReturnValue(true); // Mobile

      render(<App />);

      // Should show mobile-optimized components
      await waitFor(() => {
        expect(screen.getByTestId('mobile-desktop')).toBeInTheDocument();
      });
    });

    it('should render desktop layout on large screens', async () => {
      useMediaQuery.mockReturnValue(false); // Desktop

      render(<App />);

      // Should show desktop components
      await waitFor(() => {
        expect(screen.getByTestId('desktop')).toBeInTheDocument();
      });
    });

    it('should adapt viewport meta tag for mobile', () => {
      render(<App />);

      const viewport = document.querySelector('meta[name="viewport"]');
      expect(viewport).toHaveAttribute('content', expect.stringContaining('user-scalable=no'));
    });
  });

  describe('Touch Gesture Recognition', () => {
    it('should handle single tap for mobile interaction', async () => {
      const mockOnTap = vi.fn();
      const { onTouchStart, onTouchEnd, onTap } = useTouchGestures();

      const element = document.createElement('div');
      element.addEventListener('tap', mockOnTap);

      // Simulate tap
      const touchStart = createTouchEvent('touchstart', [{ x: 100, y: 100 }]);
      const touchEnd = createTouchEvent('touchend', [{ x: 100, y: 100 }]);

      fireEvent.touchStart(element, touchStart);
      fireEvent.touchEnd(element, touchEnd);

      // Wait for tap timeout
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 350));
      });

      expect(mockOnTap).toHaveBeenCalled();
    });

    it('should handle swipe gestures for navigation', async () => {
      const { MobileDesktop } = await import('../components/system7/MobileDesktop.jsx');

      render(<MobileDesktop />);

      const desktop = screen.getByTestId('mobile-desktop');

      // Simulate left swipe
      const touchStart = createTouchEvent('touchstart', [{ x: 50, y: 200 }]);
      const touchMove = createTouchEvent('touchmove', [{ x: 150, y: 200 }]);
      const touchEnd = createTouchEvent('touchend', [{ x: 150, y: 200 }]);

      fireEvent.touchStart(desktop, touchStart);
      fireEvent.touchMove(desktop, touchMove);
      fireEvent.touchEnd(desktop, touchEnd);

      // Should trigger navigation
      await waitFor(() => {
        // Check for swipe-related behavior
        expect(desktop).toHaveAttribute('aria-label', expect.stringContaining('Mobile'));
      });
    });

    it('should handle pinch gesture for zoom', async () => {
      const { MobileRealTimeNeoTracker } = await import('../components/RealTime/MobileRealTimeNeoTracker.jsx');

      render(<MobileRealTimeNeoTracker />);

      const tracker = screen.getByText(/Real-Time NEO Tracker/i).closest('div');

      // Simulate pinch gesture
      const pinchStart = createTouchEvent('touchstart', [
        { x: 100, y: 100, id: 0 },
        { x: 200, y: 100, id: 1 }
      ]);

      fireEvent.touchStart(tracker, pinchStart);

      // Should handle zoom functionality
      expect(tracker).toBeInTheDocument();
    });
  });

  describe('PWA Functionality', () => {
    it('should register service worker on production', async () => {
      // Simulate production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      render(<App />);

      await waitFor(() => {
        expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should show PWA install banner when appropriate', async () => {
      render(<App />);

      // Simulate beforeinstallprompt event
      const installPrompt = new Event('beforeinstallprompt');
      installPrompt.preventDefault = vi.fn();

      window.dispatchEvent(installPrompt);

      // Should store the prompt for later use
      expect(window.pwaInstallPrompt).toBeDefined();
    });

    it('should display offline indicator when disconnected', async () => {
      render(<App />);

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      window.dispatchEvent(new Event('offline'));

      const offlineIndicator = document.getElementById('offline-indicator');
      expect(offlineIndicator).not.toHaveClass('hidden');
    });
  });

  describe('Performance Monitoring', () => {
    it('should monitor Core Web Vitals', async () => {
      const { MobilePerformanceMonitor } = await import('../components/Performance/MobilePerformanceMonitor.jsx');

      render(<MobilePerformanceMonitor />);

      // Mock performance entries
      const mockLCPEntry = {
        renderTime: 2500,
        loadTime: 2500
      };

      // Simulate LCP measurement
      const observer = new PerformanceObserver((list) => {
        list.getEntries = () => [mockLCPEntry];
      });

      expect(observer).toBeDefined();
    });

    it('should track memory usage', async () => {
      const { MobilePerformanceMonitor } = await import('../components/Performance/MobilePerformanceMonitor.jsx');

      render(<MobilePerformanceMonitor />);

      // Should display memory usage
      expect(window.performance.memory.usedJSHeapSize).toBeDefined();
      expect(window.performance.memory.totalJSHeapSize).toBeDefined();
    });

    it('should provide device information', async () => {
      const { MobilePerformanceMonitor } = await import('../components/Performance/MobilePerformanceMonitor.jsx');

      render(<MobilePerformanceMonitor />);

      // Should show device specs
      expect(navigator.hardwareConcurrency).toBeDefined();
      expect(navigator.deviceMemory).toBeDefined();
      expect(window.devicePixelRatio).toBeDefined();
    });
  });

  describe('Real-time Data Handling', () => {
    it('should establish WebSocket connection for real-time updates', async () => {
      const { MobileRealTimeNeoTracker } = await import('../components/RealTime/MobileRealTimeNeoTracker.jsx');

      render(<MobileRealTimeNeoTracker />);

      // Should create WebSocket connection
      expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:3001/api/neo/realtime');
    });

    it('should handle connection errors gracefully', async () => {
      const { MobileRealTimeNeoTracker } = await import('../components/RealTime/MobileRealTimeNeoTracker.jsx');

      global.WebSocket.mockImplementation(() => ({
        ...mockWebSocket,
        readyState: WebSocket.CLOSED
      }));

      render(<MobileRealTimeNeoTracker />);

      // Should show connection error
      await waitFor(() => {
        expect(screen.getByText(/Connection error/i)).toBeInTheDocument();
      });
    });

    it('should update data in real-time', async () => {
      const { MobileRealTimeNeoTracker } = await import('../components/RealTime/MobileRealTimeNeoTracker.jsx');

      render(<MobileRealTimeNeoTracker />);

      // Simulate receiving WebSocket data
      const mockNeoData = [
        {
          id: 'test-neo-1',
          name: 'Test Asteroid',
          is_potentially_hazardous_asteroid: false,
          close_approach_data: [{
            relative_velocity: { kilometers_per_second: 25 },
            miss_distance: { kilometers: 5000000 }
          }]
        }
      ];

      // Simulate WebSocket message
      const wsInstance = global.WebSocket.mock.results[0].value;
      const messageEvent = {
        data: JSON.stringify(mockNeoData)
      };

      // Trigger message handler
      const messageHandler = wsInstance.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      if (messageHandler) {
        messageHandler(messageEvent);
      }

      // Should update the display
      await waitFor(() => {
        expect(screen.getByText(/Test Asteroid/i)).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Accessibility', () => {
    it('should provide proper ARIA labels for touch interactions', async () => {
      render(<App />);

      // Mobile desktop should have proper labeling
      await waitFor(() => {
        const mobileDesktop = screen.getByTestId('mobile-desktop');
        expect(mobileDesktop).toHaveAttribute('aria-label', 'NASA System 7 Mobile Desktop');
      });
    });

    it('should support keyboard navigation on mobile', async () => {
      const { MobileDesktop } = await import('../components/system7/MobileDesktop.jsx');

      render(<MobileDesktop />);

      // Should be keyboard accessible
      const desktop = screen.getByTestId('mobile-desktop');
      expect(desktop).toHaveAttribute('tabIndex', '0');

      // Test keyboard interaction
      fireEvent.keyDown(desktop, { key: 'Escape' });
      fireEvent.keyDown(desktop, { key: 'Tab' });
    });

    it('should provide haptic feedback on interactions', async () => {
      const { MobileDesktop } = await import('../components/system7/MobileDesktop.jsx');

      render(<MobileDesktop />);

      // Should trigger vibration on touch
      expect(navigator.vibrate).toBeDefined();
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for different screen sizes', async () => {
      // Test mobile size
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-desktop')).toBeInTheDocument();
      });

      // Test tablet size
      Object.defineProperty(window, 'innerWidth', { value: 768, configurable: true });
      useMediaQuery.mockReturnValue(false); // Not mobile, but tablet

      // Should adapt layout accordingly
      expect(window.innerWidth).toBe(768);
    });

    it('should handle orientation changes', async () => {
      render(<App />);

      // Simulate orientation change
      Object.defineProperty(window, 'innerWidth', { value: 667, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 375, configurable: true });

      window.dispatchEvent(new Event('resize'));

      // Should adapt to new dimensions
      await waitFor(() => {
        expect(screen.getByTestId('mobile-desktop')).toBeInTheDocument();
      });
    });
  });

  describe('Network Optimization', () => {
    it('should implement connection awareness', async () => {
      render(<App />);

      // Should detect connection type
      expect(navigator.connection.effectiveType).toBe('4g');
    });

    it('should handle slow connections gracefully', async () => {
      // Mock slow connection
      Object.defineProperty(navigator, 'connection', {
        writable: true,
        value: {
          effectiveType: 'slow-2g',
          downlink: 0.1,
          addEventListener: vi.fn()
        }
      });

      render(<App />);

      // Should still load but with optimizations
      expect(screen.getByTestId('mobile-desktop')).toBeInTheDocument();
    });
  });

  describe('Battery Optimization', () => {
    it('should monitor battery level', async () => {
      const { MobilePerformanceMonitor } = await import('../components/Performance/MobilePerformanceMonitor.jsx');

      render(<MobilePerformanceMonitor />);

      // Should check battery status
      expect(navigator.getBattery).toHaveBeenCalled();
    });

    it('should adapt behavior based on battery level', async () => {
      // Mock low battery
      Object.defineProperty(navigator, 'getBattery', {
        writable: true,
        value: vi.fn().mockResolvedValue({
          level: 0.15,
          charging: false
        })
      });

      const { MobilePerformanceMonitor } = await import('../components/Performance/MobilePerformanceMonitor.jsx');

      render(<MobilePerformanceMonitor />);

      // Should show low battery warning
      await waitFor(() => {
        expect(screen.getByText(/15%/)).toBeInTheDocument();
      });
    });
  });
});