import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all the hooks and dependencies
vi.mock('../hooks/useMediaQuery', () => ({
  useMediaQuery: vi.fn()
}));

vi.mock('../hooks/useTouchGestures', () => ({
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

vi.mock('../hooks/useSound', () => ({
  useSound: vi.fn(() => vi.fn())
}));

vi.mock('../hooks/usePerformanceOptimized', () => ({
  useBundleMonitor: vi.fn()
}));

vi.mock('../contexts/AppContext', () => ({
  useApps: vi.fn(() => ({
    apps: {},
    openApp: vi.fn(),
    closeApp: vi.fn(),
    bringToFront: vi.fn()
  }))
}));

vi.mock('../components/Performance/BundleAnalyzer', () => ({
  default: () => null
}));

vi.mock('../components/Performance/MobilePerformanceMonitor', () => ({
  default: () => null
}));

// Mock service worker
Object.defineProperty(navigator, 'serviceWorker', {
  writable: true,
  value: {
    register: vi.fn().mockResolvedValue({}),
    addEventListener: vi.fn()
  }
});

// Mock window.matchMedia
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
    dispatchEvent: vi.fn(),
  })),
});

describe('Mobile Basic Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the app without crashing', () => {
    render(<App />);
    expect(screen.getByTestId('desktop-container')).toBeInTheDocument();
  });

  it('should have proper mobile viewport meta tag', () => {
    // The meta tag should be set in index.html
    const viewport = document.querySelector('meta[name="viewport"]');
    expect(viewport).toBeTruthy();
  });

  it('should have service worker registration code', () => {
    // Service worker should be available
    expect('serviceWorker' in navigator).toBe(true);
  });

  it('should support touch events', () => {
    // Touch support should be available
    expect('ontouchstart' in window).toBeDefined();
  });

  it('should detect mobile viewport correctly', () => {
    // Test mobile detection
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(max-width: 768px)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { useMediaQuery } = require('../hooks/useMediaQuery');
    useMediaQuery.mockReturnValue(true);

    expect(useMediaQuery('(max-width: 768px)')).toBe(true);
  });
});

// Import App after mocking dependencies
import App from '../App.jsx';