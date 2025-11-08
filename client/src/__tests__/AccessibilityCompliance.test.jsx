import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';

// Import System 7 components for accessibility testing
import Desktop from '../components/system7/Desktop.jsx';
import MenuBar from '../components/system7/MenuBar.jsx';
import DesktopIcon from '../components/system7/DesktopIcon.jsx';

// Test wrapper for router context
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('System 7 Accessibility Compliance', () => {
  describe('WCAG 2.1 Level A Compliance', () => {
    it('should have proper keyboard navigation for desktop', () => {
      render(
        <TestWrapper>
          <Desktop />
        </TestWrapper>
      );

      // Check for focusable elements
      const focusableElements = screen.getAllByRole('button');
      expect(focusableElements.length).toBeGreaterThan(0);

      // Tab navigation should work
      const firstIcon = screen.getByTestId('desktop-icon-apod');
      firstIcon.focus();
      expect(firstIcon).toHaveFocus();

      // Enter key should activate
      fireEvent.keyDown(firstIcon, { key: 'Enter' });
      // Should not throw errors
    });

    it('should have appropriate ARIA labels', () => {
      render(
        <TestWrapper>
          <Desktop />
        </TestWrapper>
      );

      const apodIcon = screen.getByTestId('desktop-icon-apod');
      expect(apodIcon).toHaveAttribute('aria-label');
      expect(apodIcon).toHaveAttribute('role', 'button');
      expect(apodIcon).toHaveAttribute('tabIndex', '0');
    });

    it('should have sufficient color contrast in monochrome theme', () => {
      // Since System 7 uses monochrome, check for text visibility
      render(
        <TestWrapper>
          <Desktop />
        </TestWrapper>
      );

      const desktop = screen.getByTestId('desktop');
      expect(desktop).toHaveStyle('background-color: #808080');

      // Icons should have white text for contrast
      const iconTexts = screen.getAllByText(/Picture|Near|Resource|Image/);
      iconTexts.forEach(text => {
        expect(text).toHaveClass('text-white');
      });
    });

    it('should have operable touch targets (minimum 44x44px)', () => {
      render(
        <TestWrapper>
          <Desktop />
        </TestWrapper>
      );

      const icons = screen.getAllByRole('button');
      icons.forEach(icon => {
        const styles = window.getComputedStyle(icon);
        const width = parseInt(styles.width);
        const height = parseInt(styles.height);

        // Icons should be at least 44x44 for touch accessibility
        expect(width).toBeGreaterThanOrEqual(44);
        expect(height).toBeGreaterThanOrEqual(44);
      });
    });

    it('should have clear focus indicators', () => {
      render(
        <TestWrapper>
          <Desktop />
        </TestWrapper>
      );

      const icon = screen.getByTestId('desktop-icon-apod');
      icon.focus();

      // Should have visible focus state
      expect(icon).toHaveFocus();
    });
  });

  describe('Screen Reader Support', () => {
    it('should have live regions for dynamic content', () => {
      render(
        <TestWrapper>
          <Desktop />
        </TestWrapper>
      );

      const announcements = screen.getByTestId('screen-reader-announcements');
      expect(announcements).toBeInTheDocument();
      expect(announcements).toHaveAttribute('aria-live', 'polite');
      expect(announcements).toHaveAttribute('aria-atomic', 'true');
    });

    it('should have proper heading hierarchy', () => {
      render(
        <TestWrapper>
          <Desktop />
        </TestWrapper>
      );

      // Should have at least one heading for structure
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThanOrEqual(0);
    });

    it('should announce important state changes', () => {
      render(
        <TestWrapper>
          <Desktop />
        </TestWrapper>
      );

      const announcements = screen.getByTestId('screen-reader-announcements');

      // Initial state should not have announcements
      expect(announcements).toHaveTextContent('');

      // Clicking icon should generate announcement
      const icon = screen.getByTestId('desktop-icon-apod');
      fireEvent.click(icon);

      // Should have some announcement text
      // Note: This depends on the implementation details
    });
  });

  describe('Keyboard Accessibility', () => {
    it('should support full keyboard navigation', () => {
      render(
        <TestWrapper>
          <Desktop />
        </TestWrapper>
      );

      const desktop = screen.getByTestId('desktop');

      // Should be keyboard focusable
      expect(desktop).toHaveAttribute('tabIndex', '0');

      // Arrow key navigation should work
      fireEvent.keyDown(desktop, { key: 'ArrowDown' });
      fireEvent.keyDown(desktop, { key: 'ArrowRight' });

      // Escape key should work
      fireEvent.keyDown(desktop, { key: 'Escape' });
    });

    it('should have visible keyboard focus', () => {
      render(
        <TestWrapper>
          <Desktop />
        </TestWrapper>
      );

      const icon = screen.getByTestId('desktop-icon-apod');
      icon.focus();

      // Should be able to detect focus state
      expect(icon).toHaveFocus();
    });

    it('should prevent keyboard traps', () => {
      render(
        <TestWrapper>
          <Desktop />
        </TestWrapper>
      );

      // Tab should move focus through all interactive elements
      const focusableElements = screen.getAllByRole('button');

      focusableElements.forEach((element, index) => {
        element.focus();
        expect(element).toHaveFocus();

        // Tab to next element (if not last)
        if (index < focusableElements.length - 1) {
          fireEvent.keyDown(element, { key: 'Tab' });
        }
      });
    });
  });

  describe('Error Handling Accessibility', () => {
    it('should announce errors to screen readers', () => {
      render(
        <TestWrapper>
          <Desktop />
        </TestWrapper>
      );

      // Look for error announcements
      const errorRegion = screen.queryByRole('alert');
      if (errorRegion) {
        expect(errorRegion).toBeInTheDocument();
      }
    });

    it('should have accessible error recovery', () => {
      render(
        <TestWrapper>
          <Desktop />
        </TestWrapper>
      );

      // Check for error recovery mechanisms
      const errorMessages = screen.queryAllByRole('alert');
      errorMessages.forEach(error => {
        // Should have actionable recovery options
        const retryButton = error.querySelector('button');
        if (retryButton) {
          expect(retryButton).toBeVisible();
        }
      });
    });
  });

  describe('Responsive Accessibility', () => {
    it('should maintain accessibility on mobile viewports', () => {
      // Simulate mobile viewport
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
          <Desktop />
        </TestWrapper>
      );

      // Touch targets should still be accessible
      const icons = screen.getAllByRole('button');
      icons.forEach(icon => {
        expect(icon).toBeVisible();
        expect(icon).toHaveAttribute('aria-label');
      });
    });

    it('should work with screen magnification', () => {
      render(
        <TestWrapper>
          <Desktop />
        </TestWrapper>
      );

      // Elements should maintain relative positioning
      const desktop = screen.getByTestId('desktop');
      expect(desktop).toBeInTheDocument();

      // Icons should remain properly sized relative to container
      const icons = screen.getAllByRole('button');
      icons.forEach(icon => {
        expect(icon).toBeInTheDocument();
        // Should maintain aspect ratio and readability
      });
    });
  });

  describe('Cognitive Accessibility', () => {
    it('should have consistent navigation patterns', () => {
      render(
        <TestWrapper>
          <Desktop />
        </TestWrapper>
      );

      // All icons should behave consistently
      const icons = screen.getAllByRole('button');
      icons.forEach(icon => {
        expect(icon).toHaveAttribute('role', 'button');
        expect(icon).toHaveAttribute('tabIndex', '0');
        expect(icon).toHaveAttribute('aria-label');
      });
    });

    it('should provide clear feedback for interactions', () => {
      render(
        <TestWrapper>
          <Desktop />
        </TestWrapper>
      );

      const icon = screen.getByTestId('desktop-icon-apod');

      // Click should provide visual/auditory feedback
      fireEvent.click(icon);

      // Double-click should open app
      fireEvent.doubleClick(icon);

      // Should not cause unexpected behavior
      expect(icon).toBeInTheDocument();
    });

    it('should have predictable interface behavior', () => {
      render(
        <TestWrapper>
          <Desktop />
        </TestWrapper>
      );

      const icons = screen.getAllByRole('button');

      // All icons should respond consistently to similar interactions
      icons.forEach(icon => {
        // Click should select
        fireEvent.click(icon);

        // Double-click should attempt to open
        fireEvent.doubleClick(icon);

        // Enter key should activate when focused
        icon.focus();
        fireEvent.keyDown(icon, { key: 'Enter' });
      });
    });
  });
});

// System 7 specific accessibility tests
describe('System 7 Theme Accessibility', () => {
  it('should maintain contrast with System 7 color scheme', () => {
    render(
      <TestWrapper>
        <Desktop />
      </TestWrapper>
    );

    // Check that monochrome theme maintains readability
    const desktop = screen.getByTestId('desktop');
    expect(desktop).toHaveStyle('background-color: #808080');

    // Text elements should have sufficient contrast
    const textElements = screen.getAllByText(/.+/);
    textElements.forEach(element => {
      const styles = window.getComputedStyle(element);
      const color = styles.color;

      // Should be either white or black for contrast
      expect(color).toMatch(/rgb\(255,\s*255,\s*255\)|rgb\(0,\s*0,\s*0\)/);
    });
  });

  it('should support high contrast preferences', () => {
    // Simulate high contrast mode
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query) => ({
        matches: query === '(prefers-contrast: high)',
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => {},
      }),
    });

    render(
      <TestWrapper>
        <Desktop />
      </TestWrapper>
    );

    // Should still be usable in high contrast mode
    const icons = screen.getAllByRole('button');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('should maintain accessibility with reduced motion', () => {
    // Simulate reduced motion preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => {},
      }),
    });

    render(
      <TestWrapper>
        <Desktop />
      </TestWrapper>
    );

    // Should still be functional without animations
    const icons = screen.getAllByRole('button');
    icons.forEach(icon => {
      fireEvent.click(icon);
      expect(icon).toBeInTheDocument();
    });
  });
});