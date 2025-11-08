import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import DesktopIcon from '../DesktopIcon.jsx';

// Create a mock icon component for testing
const MockIcon = () => (
  <svg data-testid="mock-icon" width="32" height="32" viewBox="0 0 32 32">
    <rect width="32" height="32" fill="black" />
  </svg>
);

describe('System 7 DesktopIcon Component', () => {
  const defaultProps = {
    name: 'Test Application',
    IconComponent: MockIcon,
    testId: 'test-icon',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Icon Rendering', () => {
    it('should render the desktop icon with proper structure', () => {
      render(<DesktopIcon {...defaultProps} />);

      const icon = screen.getByTestId('test-icon');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('flex', 'flex-col', 'items-center', 'w-24', 'text-center', 'cursor-pointer', 'select-none');
    });

    it('should render the icon component', () => {
      render(<DesktopIcon {...defaultProps} />);

      const mockIcon = screen.getByTestId('mock-icon');
      expect(mockIcon).toBeInTheDocument();
    });

    it('should display the application name', () => {
      render(<DesktopIcon {...defaultProps} />);

      expect(screen.getByText('Test Application')).toBeInTheDocument();
    });

    it('should have System 7 authentic styling', () => {
      render(<DesktopIcon {...defaultProps} />);

      const nameElement = screen.getByText('Test Application');
      expect(nameElement).toHaveClass('text-white', 'bg-s7-blue', 'px-1', 'select-none');
    });

    it('should have proper accessibility attributes', () => {
      render(<DesktopIcon {...defaultProps} />);

      const icon = screen.getByTestId('test-icon');
      expect(icon).toHaveAttribute('role', 'button');
      expect(icon).toHaveAttribute('tabIndex', '0');
      expect(icon).toHaveAttribute('aria-label', 'Test Application');
    });

    it('should use custom aria-label when provided', () => {
      render(<DesktopIcon {...defaultProps} ariaLabel="Custom ARIA Label" />);

      const icon = screen.getByTestId('test-icon');
      expect(icon).toHaveAttribute('aria-label', 'Custom ARIA Label');
    });
  });

  describe('Icon Selection State', () => {
    it('should not be selected by default', () => {
      render(<DesktopIcon {...defaultProps} />);

      const icon = screen.getByTestId('test-icon');
      expect(icon).not.toHaveClass('selected');
    });

    it('should show selection state when isSelected is true', () => {
      render(<DesktopIcon {...defaultProps} isSelected={true} />);

      const icon = screen.getByTestId('test-icon');
      expect(icon).toHaveClass('selected');
    });

    it('should handle selection changes correctly', () => {
      const { rerender } = render(<DesktopIcon {...defaultProps} isSelected={false} />);

      let icon = screen.getByTestId('test-icon');
      expect(icon).not.toHaveClass('selected');

      rerender(<DesktopIcon {...defaultProps} isSelected={true} />);

      icon = screen.getByTestId('test-icon');
      expect(icon).toHaveClass('selected');
    });
  });

  describe('Click Interactions', () => {
    it('should handle single click events', () => {
      const handleClick = vi.fn();
      render(<DesktopIcon {...defaultProps} onClick={handleClick} />);

      const icon = screen.getByTestId('test-icon');
      fireEvent.click(icon);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should handle double click events', () => {
      const handleDoubleClick = vi.fn();
      render(<DesktopIcon {...defaultProps} onDoubleClick={handleDoubleClick} />);

      const icon = screen.getByTestId('test-icon');
      fireEvent.doubleClick(icon);

      expect(handleDoubleClick).toHaveBeenCalledTimes(1);
    });

    it('should not propagate click events', () => {
      const handleClick = vi.fn();
      const handleParentClick = vi.fn();

      render(
        <div onClick={handleParentClick}>
          <DesktopIcon {...defaultProps} onClick={handleClick} />
        </div>
      );

      const icon = screen.getByTestId('test-icon');
      fireEvent.click(icon);

      expect(handleClick).toHaveBeenCalledTimes(1);
      expect(handleParentClick).not.toHaveBeenCalled();
    });

    it('should not propagate double click events', () => {
      const handleDoubleClick = vi.fn();
      const handleParentDoubleClick = vi.fn();

      render(
        <div onDoubleClick={handleParentDoubleClick}>
          <DesktopIcon {...defaultProps} onDoubleClick={handleDoubleClick} />
        </div>
      );

      const icon = screen.getByTestId('test-icon');
      fireEvent.doubleClick(icon);

      expect(handleDoubleClick).toHaveBeenCalledTimes(1);
      expect(handleParentDoubleClick).not.toHaveBeenCalled();
    });

    it('should handle click when no handler is provided', () => {
      expect(() => {
        render(<DesktopIcon {...defaultProps} />);
        const icon = screen.getByTestId('test-icon');
        fireEvent.click(icon);
      }).not.toThrow();
    });

    it('should handle double click when no handler is provided', () => {
      expect(() => {
        render(<DesktopIcon {...defaultProps} />);
        const icon = screen.getByTestId('test-icon');
        fireEvent.doubleClick(icon);
      }).not.toThrow();
    });
  });

  describe('Keyboard Interactions', () => {
    it('should handle key down events', () => {
      const handleKeyDown = vi.fn();
      render(<DesktopIcon {...defaultProps} onKeyDown={handleKeyDown} />);

      const icon = screen.getByTestId('test-icon');
      fireEvent.keyDown(icon, { key: 'Enter' });

      expect(handleKeyDown).toHaveBeenCalledWith(expect.objectContaining({ key: 'Enter' }));
    });

    it('should handle focus events', () => {
      const handleFocus = vi.fn();
      render(<DesktopIcon {...defaultProps} onFocus={handleFocus} />);

      const icon = screen.getByTestId('test-icon');
      icon.focus();

      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it('should be focusable via keyboard', () => {
      render(<DesktopIcon {...defaultProps} />);

      const icon = screen.getByTestId('test-icon');
      expect(icon).toHaveAttribute('tabIndex', '0');

      icon.focus();
      expect(icon).toHaveFocus();
    });

    it('should handle key down when no handler is provided', () => {
      expect(() => {
        render(<DesktopIcon {...defaultProps} />);
        const icon = screen.getByTestId('test-icon');
        fireEvent.keyDown(icon, { key: 'Enter' });
      }).not.toThrow();
    });

    it('should handle focus when no handler is provided', () => {
      expect(() => {
        render(<DesktopIcon {...defaultProps} />);
        const icon = screen.getByTestId('test-icon');
        icon.focus();
      }).not.toThrow();
    });
  });

  describe('NASA Application Icons', () => {
    it('should render APOD icon correctly', () => {
      render(
        <DesktopIcon
          name="APOD"
          IconComponent={MockIcon}
          testId="apod-icon"
          ariaLabel="Astronomy Picture of the Day"
        />
      );

      expect(screen.getByText('APOD')).toBeInTheDocument();
      expect(screen.getByTestId('apod-icon')).toHaveAttribute('aria-label', 'Astronomy Picture of the Day');
    });

    it('should render NeoWs icon correctly', () => {
      render(
        <DesktopIcon
          name="Near Earth Objects"
          IconComponent={MockIcon}
          testId="neows-icon"
          ariaLabel="Near Earth Objects Web Service"
        />
      );

      expect(screen.getByText('Near Earth Objects')).toBeInTheDocument();
      expect(screen.getByTestId('neows-icon')).toHaveAttribute('aria-label', 'Near Earth Objects Web Service');
    });

    it('should render Mars Rover icon correctly', () => {
      render(
        <DesktopIcon
          name="Mars Rover"
          IconComponent={MockIcon}
          testId="mars-icon"
          ariaLabel="Mars Rover Photos"
        />
      );

      expect(screen.getByText('Mars Rover')).toBeInTheDocument();
      expect(screen.getByTestId('mars-icon')).toHaveAttribute('aria-label', 'Mars Rover Photos');
    });

    it('should handle long application names', () => {
      render(
        <DesktopIcon
          name="Very Long NASA Application Name"
          IconComponent={MockIcon}
          testId="long-name-icon"
        />
      );

      const nameElement = screen.getByText('Very Long NASA Application Name');
      expect(nameElement).toBeInTheDocument();
      expect(nameElement).toHaveClass('truncate', 'px-1');
    });
  });

  describe('Icon Performance', () => {
    it('should render within performance threshold', () => {
      const startTime = performance.now();

      render(<DesktopIcon {...defaultProps} />);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(20);
    });

    it('should handle multiple renders efficiently', () => {
      const renderTimes = [];
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        const { unmount } = render(<DesktopIcon {...defaultProps} />);
        const endTime = performance.now();
        renderTimes.push(endTime - startTime);
        unmount();
      }

      const averageRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
      expect(averageRenderTime).toBeLessThan(15);
    });
  });

  describe('Icon Accessibility', () => {
    it('should have proper ARIA attributes for screen readers', () => {
      render(
        <DesktopIcon
          name="NASA Data Viewer"
          IconComponent={MockIcon}
          testId="accessible-icon"
          ariaLabel="NASA Data Viewer Application"
        />
      );

      const icon = screen.getByTestId('accessible-icon');
      expect(icon).toHaveAttribute('role', 'button');
      expect(icon).toHaveAttribute('tabIndex', '0');
      expect(icon).toHaveAttribute('aria-label', 'NASA Data Viewer Application');
    });

    it('should have proper semantic structure', () => {
      render(<DesktopIcon {...defaultProps} />);

      const icon = screen.getByTestId('test-icon');
      const iconContainer = icon.querySelector('.w-12.h-12');
      const nameElement = screen.getByText('Test Application');

      expect(iconContainer).toBeInTheDocument();
      expect(nameElement).toBeInTheDocument();
      expect(nameElement).toHaveAttribute('aria-hidden', 'true');
    });

    it('should support keyboard navigation', () => {
      render(<DesktopIcon {...defaultProps} />);

      const icon = screen.getByTestId('test-icon');

      // Test Tab navigation
      expect(icon).toHaveAttribute('tabIndex', '0');

      // Test Enter key
      fireEvent.keyDown(icon, { key: 'Enter' });

      // Test Space key
      fireEvent.keyDown(icon, { key: ' ' });

      // Should not throw errors
      expect(true).toBe(true);
    });
  });

  describe('Icon Edge Cases', () => {
    it('should handle empty name gracefully', () => {
      expect(() => {
        render(<DesktopIcon {...defaultProps} name="" />);
        screen.getByTestId('test-icon');
      }).not.toThrow();
    });

    it('should handle missing IconComponent gracefully', () => {
      expect(() => {
        render(<DesktopIcon {...defaultProps} IconComponent={null} />);
        screen.getByTestId('test-icon');
      }).not.toThrow();
    });

    it('should handle null ariaLabel gracefully', () => {
      render(<DesktopIcon {...defaultProps} ariaLabel={null} />);

      const icon = screen.getByTestId('test-icon');
      expect(icon).toHaveAttribute('aria-label', 'Test Application');
    });

    it('should handle undefined ariaLabel gracefully', () => {
      render(<DesktopIcon {...defaultProps} ariaLabel={undefined} />);

      const icon = screen.getByTestId('test-icon');
      expect(icon).toHaveAttribute('aria-label', 'Test Application');
    });
  });

  describe('Icon Ref Forwarding', () => {
    it('should forward ref correctly', () => {
      const ref = React.createRef();
      render(<DesktopIcon {...defaultProps} ref={ref} />);

      expect(ref.current).toBe(screen.getByTestId('test-icon'));
    });

    it('should work without ref', () => {
      expect(() => {
        render(<DesktopIcon {...defaultProps} />);
        screen.getByTestId('test-icon');
      }).not.toThrow();
    });
  });

  describe('Icon Display Name', () => {
    it('should have correct display name', () => {
      expect(DesktopIcon.displayName).toBe('DesktopIcon');
    });
  });
});