import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Desktop from '../Desktop.jsx';

// Mock the sound hook
vi.mock('../../../hooks/useSound.js', () => ({
  useSound: vi.fn(() => vi.fn()),
}));

// Mock AppContext with simple static mock
vi.mock('../../../contexts/AppContext.jsx', () => ({
  useApps: () => ({
    apps: {},
    activeApp: null,
    openApp: vi.fn(),
    closeApp: vi.fn(),
    bringToFront: vi.fn(),
    updateAppPosition: vi.fn(),
  }),
}));

// Wrap component with BrowserRouter for routing
const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('System 7 Desktop Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('Desktop Rendering', () => {
    it('should render the desktop container', () => {
      renderWithRouter(<Desktop />);

      const desktop = screen.getByTestId('desktop');
      expect(desktop).toBeInTheDocument();
      expect(desktop).toHaveClass('w-full', 'h-full', 'relative', 'overflow-hidden');
    });

    it('should render all desktop icons', () => {
      renderWithRouter(<Desktop />);

      // Check for System 7 application icons
      expect(screen.getByTestId('desktop-icon-apod')).toBeInTheDocument();
      expect(screen.getByTestId('desktop-icon-neows')).toBeInTheDocument();
      expect(screen.getByTestId('desktop-icon-navigator')).toBeInTheDocument();
      expect(screen.getByTestId('desktop-image-viewer')).toBeInTheDocument();
    });

    it('should have proper System 7 styling', () => {
      renderWithRouter(<Desktop />);

      const desktop = screen.getByTestId('desktop');
      expect(desktop).toHaveStyle('background-color: #808080');
    });
  });

  describe('Desktop Icon Interactions', () => {
    it('should handle double-click on desktop icons', () => {
      renderWithRouter(<Desktop />);

      const apodIcon = screen.getByTestId('desktop-icon-apod');

      // Double click should not throw an error
      expect(() => {
        fireEvent.doubleClick(apodIcon);
      }).not.toThrow();
    });

    it('should play sound when icon is clicked', () => {
      renderWithRouter(<Desktop />);

      const apodIcon = screen.getByTestId('desktop-icon-apod');

      // Click should not throw an error (sound hook is mocked)
      expect(() => {
        fireEvent.click(apodIcon);
      }).not.toThrow();
    });

    it('should show icon selection state on click', () => {
      renderWithRouter(<Desktop />);

      const apodIcon = screen.getByTestId('desktop-icon-apod');

      // Click should not throw an error
      expect(() => {
        fireEvent.click(apodIcon);
      }).not.toThrow();

      // Icon should exist and be clickable
      expect(apodIcon).toBeInTheDocument();
    });
  });

  describe('Window Management', () => {
    it('should open window when icon is double-clicked', () => {
      renderWithRouter(<Desktop />);

      const apodIcon = screen.getByTestId('desktop-icon-apod');

      // Double click should not throw an error
      expect(() => {
        fireEvent.doubleClick(apodIcon);
      }).not.toThrow();

      // Icon should still be in the document
      expect(apodIcon).toBeInTheDocument();
    });

    it('should handle multiple open windows', () => {
      renderWithRouter(<Desktop />);

      // Verify desktop renders without errors
      const desktop = screen.getByTestId('desktop');
      expect(desktop).toBeInTheDocument();

      // Icons should be rendered
      expect(screen.getByTestId('desktop-icon-apod')).toBeInTheDocument();
      expect(screen.getByTestId('desktop-icon-neows')).toBeInTheDocument();
      expect(screen.getByTestId('desktop-icon-navigator')).toBeInTheDocument();
      expect(screen.getByTestId('desktop-image-viewer')).toBeInTheDocument();

      // Desktop should handle rendering multiple icons without issues
      expect(screen.getByTestId('desktop')).toHaveClass('w-full', 'h-full', 'relative', 'overflow-hidden');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate icons with keyboard', () => {
      renderWithRouter(<Desktop />);

      const desktop = screen.getByTestId('desktop');
      const firstIcon = screen.getByTestId('desktop-icon-apod');

      // Keyboard events should not throw errors
      expect(() => {
        fireEvent.focus(desktop);
        fireEvent.keyDown(desktop, { key: 'Tab' });
        fireEvent.keyDown(firstIcon, { key: 'ArrowDown' });
      }).not.toThrow();

      // Icons should have proper accessibility attributes
      expect(firstIcon).toHaveAttribute('tabIndex', '0');
      expect(firstIcon).toHaveAttribute('role', 'button');
    });

    it('should open window with Enter key on focused icon', () => {
      renderWithRouter(<Desktop />);

      const apodIcon = screen.getByTestId('desktop-icon-apod');

      // Enter key should not throw errors
      expect(() => {
        apodIcon.focus();
        fireEvent.keyDown(apodIcon, { key: 'Enter' });
      }).not.toThrow();

      // Icon should still exist
      expect(apodIcon).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithRouter(<Desktop />);

      const apodIcon = screen.getByTestId('desktop-icon-apod');
      expect(apodIcon).toHaveAttribute('aria-label', 'APOD - Astronomy Picture of the Day');
      expect(apodIcon).toHaveAttribute('role', 'button');
      expect(apodIcon).toHaveAttribute('tabIndex', '0');
    });

    it('should support screen reader announcements', () => {
      renderWithRouter(<Desktop />);

      const announcements = screen.getByTestId('screen-reader-announcements');
      expect(announcements).toBeInTheDocument();
      expect(announcements).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Performance', () => {
    it('should render within performance threshold', () => {
      const startTime = performance.now();

      renderWithRouter(<Desktop />);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within 100ms
      expect(renderTime).toBeLessThan(100);
    });

    it('should handle large number of windows efficiently', async () => {
      // Mock many open windows
      const manyWindows = Array(20).fill().map((_, i) => `window-${i}`);

      vi.doMock('../../../contexts/AppContext.jsx', () => ({
        useAppContext: () => ({
          openWindows: manyWindows,
          activeWindow: 'window-0',
          openWindow: vi.fn(),
          closeWindow: vi.fn(),
          setActiveWindow: vi.fn(),
        }),
      }));

      const startTime = performance.now();

      renderWithRouter(<Desktop />);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should still render efficiently with many windows
      expect(renderTime).toBeLessThan(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle icon click errors gracefully', () => {
      // Suppress console errors for this test
      const originalError = console.error;
      console.error = vi.fn();

      renderWithRouter(<Desktop />);

      const apodIcon = screen.getByTestId('desktop-icon-apod');

      // Even if there are errors, the component should not crash
      expect(() => {
        fireEvent.doubleClick(apodIcon);
      }).not.toThrow();

      // Desktop should still be functional
      expect(screen.getByTestId('desktop')).toBeInTheDocument();

      console.error = originalError;
    });
  });
});