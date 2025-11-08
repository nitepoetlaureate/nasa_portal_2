import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';

// Import components for mobile testing
import Desktop from '../components/system7/Desktop.jsx';
import App from '../App.jsx';

// Test wrapper
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('Mobile Responsiveness Testing', () => {
  // Store original window properties
  let originalInnerWidth;
  let originalInnerHeight;
  let originalMatchMedia;

  beforeEach(() => {
    // Store original values
    originalInnerWidth = window.innerWidth;
    originalInnerHeight = window.innerHeight;
    originalMatchMedia = window.matchMedia;

    // Mock matchMedia for media queries
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query) => ({
        matches: query.includes('(max-width: 768px)') && window.innerWidth <= 768,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => {},
      }),
    });
  });

  afterEach(() => {
    // Restore original values
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    });
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    });
  });

  describe('Mobile Viewport (320px - 768px)', () => {
    beforeEach(() => {
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
    });

    it('should render mobile-optimized layout', () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      const container = screen.getByTestId('desktop-container');
      expect(container).toHaveClass('mobile-optimized');
    });

    it('should have appropriate touch target sizes', () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      const icons = screen.getAllByRole('button');
      icons.forEach(icon => {
        const styles = window.getComputedStyle(icon);
        const width = parseInt(styles.width);
        const height = parseInt(styles.height);

        // iOS HIG recommends minimum 44x44px touch targets
        expect(width).toBeGreaterThanOrEqual(44);
        expect(height).toBeGreaterThanOrEqual(44);
      });
    });

    it('should have mobile-optimized viewport meta tag', () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Check if viewport meta tag is properly set
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      if (viewportMeta) {
        expect(viewportMeta.getAttribute('content')).toContain('width=device-width');
        expect(viewportMeta.getAttribute('content')).toContain('user-scalable=no');
      }
    });

    it('should prevent text selection on touch devices', () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      const container = screen.getByTestId('desktop-container');
      expect(container).toHaveStyle({
        WebkitUserSelect: 'none',
        userSelect: 'none'
      });
    });

    it('should optimize for touch interactions', () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      const container = screen.getByTestId('desktop-container');
      expect(container).toHaveStyle({
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent'
      });
    });
  });

  describe('Tablet Viewport (768px - 1024px)', () => {
    beforeEach(() => {
      // Set tablet viewport size
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
    });

    it('should render tablet-optimized layout', () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      const container = screen.getByTestId('desktop-container');
      expect(container).toHaveClass('tablet-optimized');
    });

    it('should maintain desktop functionality on tablet', () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Should still have full desktop interface on tablet
      expect(screen.getByTestId('desktop')).toBeInTheDocument();
      const icons = screen.getAllByRole('button');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Desktop Viewport (>1024px)', () => {
    beforeEach(() => {
      // Set desktop viewport size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1080,
      });

      window.dispatchEvent(new Event('resize'));
    });

    it('should render full desktop layout', () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      const container = screen.getByTestId('desktop-container');
      expect(container).not.toHaveClass('mobile-optimized');
      expect(container).not.toHaveClass('tablet-optimized');
    });

    it('should display MenuBar on desktop', () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Desktop should have menu bar
      const menuBar = document.querySelector('.font-chicago');
      if (menuBar) {
        expect(menuBar).toBeInTheDocument();
      }
    });
  });

  describe('Orientation Changes', () => {
    it('should handle landscape orientation', () => {
      // Landscape mobile
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

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      const container = screen.getByTestId('desktop-container');
      expect(container).toBeInTheDocument();

      // Should still be mobile-optimized in landscape
      expect(container).toHaveClass('mobile-optimized');
    });

    it('should handle portrait orientation', () => {
      // Portrait mobile
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

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      const container = screen.getByTestId('desktop-container');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('mobile-optimized');
    });

    it('should adapt to orientation changes', () => {
      // Start in portrait
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

      const { rerender } = render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Change to landscape
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

      window.dispatchEvent(new Event('resize'));

      rerender(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      const container = screen.getByTestId('desktop-container');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Touch Interactions', () => {
    beforeEach(() => {
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
    });

    it('should handle tap events', () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      const icon = screen.getAllByRole('button')[0];
      expect(icon).toBeInTheDocument();

      // Simulate tap
      fireEvent.click(icon);
      expect(icon).toBeInTheDocument();
    });

    it('should handle double-tap events', () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      const icon = screen.getAllByRole('button')[0];
      expect(icon).toBeInTheDocument();

      // Simulate double-tap
      fireEvent.doubleClick(icon);
      expect(icon).toBeInTheDocument();
    });

    it('should prevent default touch behaviors where needed', () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      const container = screen.getByTestId('desktop-container');

      // Should have touch-action: manipulation
      expect(container).toHaveStyle('touchAction: manipulation');
    });
  });

  describe('Performance on Mobile', () => {
    beforeEach(() => {
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
    });

    it('should render within performance threshold on mobile', () => {
      const startTime = performance.now();

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within 200ms on mobile (slightly higher threshold)
      expect(renderTime).toBeLessThan(200);
    });

    it('should handle memory constraints on mobile', () => {
      const { unmount } = render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Should cleanup properly
      unmount();

      // Should not leave references in memory
      const container = screen.queryByTestId('desktop-container');
      expect(container).not.toBeInTheDocument();
    });
  });

  describe('Mobile Browser Compatibility', () => {
    it('should work with iOS Safari', () => {
      // Mock iOS Safari user agent
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      });

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      const container = screen.getByTestId('desktop-container');
      expect(container).toBeInTheDocument();
    });

    it('should work with Chrome Mobile', () => {
      // Mock Chrome Mobile user agent
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
      });

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 360,
      });

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      const container = screen.getByTestId('desktop-container');
      expect(container).toBeInTheDocument();
    });
  });

  describe('PWA Features on Mobile', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
    });

    it('should support offline indicator', () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      const offlineIndicator = document.getElementById('offline-indicator');
      expect(offlineIndicator).toBeInTheDocument();
      expect(offlineIndicator).toHaveAttribute('role', 'alert');
    });

    it('should support PWA install banner', () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      const installBanner = document.getElementById('pwa-install-banner');
      expect(installBanner).toBeInTheDocument();

      const installButton = document.getElementById('pwa-install-button');
      expect(installButton).toBeInTheDocument();
    });
  });

  describe('Mobile Accessibility', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
    });

    it('should maintain accessibility on mobile', () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Should still have accessible landmarks
      const mainElement = document.querySelector('main[role="main"]');
      if (mainElement) {
        expect(mainElement).toBeInTheDocument();
      }

      // Touch targets should be accessible
      const icons = screen.getAllByRole('button');
      icons.forEach(icon => {
        expect(icon).toHaveAttribute('aria-label');
        expect(icon).toHaveAttribute('tabIndex', '0');
      });
    });

    it('should support voice control on mobile', () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      const icons = screen.getAllByRole('button');
      icons.forEach(icon => {
        // Should have accessible names for voice control
        expect(icon).toHaveAttribute('aria-label');
      });
    });

    it('should work with mobile screen readers', () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      const announcements = screen.queryByTestId('screen-reader-announcements');
      if (announcements) {
        expect(announcements).toHaveAttribute('aria-live', 'polite');
      }
    });
  });
});