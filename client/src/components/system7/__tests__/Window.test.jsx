import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Window from '../Window.jsx';

// Mock the AppContext
const mockUseApps = vi.fn();
vi.mock('../../contexts/AppContext', () => ({
  useApps: () => mockUseApps(),
}));

// Mock the performance hook
vi.mock('../../hooks/usePerformanceOptimized', () => ({
  usePerformanceMonitor: vi.fn(),
}));

// Mock Framer Motion
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }, ref) => (
      <div ref={ref} {...props}>{children}</div>
    )),
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// Wrap component with BrowserRouter
const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('System 7 Window Component', () => {
  const mockApps = {
    'test-app': {
      isOpen: true,
      zIndex: 1,
    }
  };

  const mockCloseApp = vi.fn();
  const mockBringToFront = vi.fn();
  const mockUpdateAppPosition = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseApps.mockReturnValue({
      apps: mockApps,
      closeApp: mockCloseApp,
      bringToFront: mockBringToFront,
      updateAppPosition: mockUpdateAppPosition,
    });
  });

  describe('Window Rendering', () => {
    it('should render window with correct structure', () => {
      renderWithRouter(
        <Window
          title="Test Window"
          appId="test-app"
          initialPos={{ x: 100, y: 100 }}
          data-testid="test-window"
        >
          <div>Test Content</div>
        </Window>
      );

      const window = screen.getByTestId('test-window');
      expect(window).toBeInTheDocument();
      expect(window).toHaveClass('absolute', 'flex', 'flex-col', 'w-[550px]', 'min-w-[300px]');
    });

    it('should have System 7 authentic styling', () => {
      renderWithRouter(
        <Window
          title="Test Window"
          appId="test-app"
          initialPos={{ x: 100, y: 100 }}
          data-testid="test-window"
        >
          <div>Test Content</div>
        </Window>
      );

      const window = screen.getByTestId('test-window');
      expect(window).toHaveClass('bg-s7-gray', 'border-2', 'shadow-s7-window');
    });

    it('should render window title in header', () => {
      renderWithRouter(
        <Window
          title="NASA Portal"
          appId="test-app"
          initialPos={{ x: 100, y: 100 }}
          data-testid="test-window"
        >
          <div>Test Content</div>
        </Window>
      );

      expect(screen.getByText('NASA Portal')).toBeInTheDocument();
    });

    it('should render children content in main area', () => {
      renderWithRouter(
        <Window
          title="Test Window"
          appId="test-app"
          initialPos={{ x: 100, y: 100 }}
          data-testid="test-window"
        >
          <div data-testid="test-content">NASA Data Content</div>
        </Window>
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(screen.getByText('NASA Data Content')).toBeInTheDocument();
    });
  });

  describe('Window Controls', () => {
    it('should have close button with proper styling', () => {
      renderWithRouter(
        <Window
          title="Test Window"
          appId="test-app"
          initialPos={{ x: 100, y: 100 }}
          data-testid="test-window"
        >
          <div>Test Content</div>
        </Window>
      );

      const closeButton = screen.getByRole('button', { name: /close window/i });
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveClass('w-4', 'h-4', 'border-2', 'bg-s7-gray', 'shadow-s7-outset');
    });

    it('should call closeApp when close button is clicked', () => {
      renderWithRouter(
        <Window
          title="Test Window"
          appId="test-app"
          initialPos={{ x: 100, y: 100 }}
          data-testid="test-window"
        >
          <div>Test Content</div>
        </Window>
      );

      const closeButton = screen.getByRole('button', { name: /close window/i });
      fireEvent.click(closeButton);

      expect(mockCloseApp).toHaveBeenCalledWith('test-app');
    });

    it('should have draggable title bar', () => {
      renderWithRouter(
        <Window
          title="Test Window"
          appId="test-app"
          initialPos={{ x: 100, y: 100 }}
          data-testid="test-window"
        >
          <div>Test Content</div>
        </Window>
      );

      const header = screen.getByText('Test Window').closest('header');
      expect(header).toHaveClass('drag-handle', 'cursor-move', 'select-none');
    });

    it('should have resize handle', () => {
      renderWithRouter(
        <Window
          title="Test Window"
          appId="test-app"
          initialPos={{ x: 100, y: 100 }}
          data-testid="test-window"
        >
          <div>Test Content</div>
        </Window>
      );

      const resizeHandle = document.querySelector('.cursor-se-resize');
      expect(resizeHandle).toBeInTheDocument();
      expect(resizeHandle).toHaveClass('absolute', 'bottom-0', 'right-0', 'w-4', 'h-4');
    });
  });

  describe('Window Focus and Z-Index', () => {
    it('should call bringToFront when window is clicked', () => {
      renderWithRouter(
        <Window
          title="Test Window"
          appId="test-app"
          initialPos={{ x: 100, y: 100 }}
          data-testid="test-window"
        >
          <div>Test Content</div>
        </Window>
      );

      const window = screen.getByTestId('test-window');
      fireEvent.mouseDown(window);

      expect(mockBringToFront).toHaveBeenCalledWith('test-app');
    });

    it('should render with correct z-index from app state', () => {
      mockUseApps.mockReturnValue({
        apps: {
          'test-app': {
            isOpen: true,
            zIndex: 5,
          }
        },
        closeApp: mockCloseApp,
        bringToFront: mockBringToFront,
        updateAppPosition: mockUpdateAppPosition,
      });

      renderWithRouter(
        <Window
          title="Test Window"
          appId="test-app"
          initialPos={{ x: 100, y: 100 }}
          data-testid="test-window"
        >
          <div>Test Content</div>
        </Window>
      );

      const window = screen.getByTestId('test-window');
      expect(window).toHaveStyle({ zIndex: 5 });
    });
  });

  describe('Window Dragging', () => {
    it('should handle drag end events', () => {
      renderWithRouter(
        <Window
          title="Test Window"
          appId="test-app"
          initialPos={{ x: 100, y: 100 }}
          data-testid="test-window"
        >
          <div>Test Content</div>
        </Window>
      );

      const window = screen.getByTestId('test-window');

      // Simulate drag end event
      const dragEndEvent = {
        point: { x: 200, y: 300 }
      };

      fireEvent.dragEnd(window, dragEndEvent);

      expect(mockUpdateAppPosition).toHaveBeenCalledWith('test-app', { x: 200, y: 300 });
    });
  });

  describe('Window Performance', () => {
    it('should render within performance threshold', () => {
      const startTime = performance.now();

      renderWithRouter(
        <Window
          title="Test Window"
          appId="test-app"
          initialPos={{ x: 100, y: 100 }}
          data-testid="test-window"
        >
          <div>Test Content</div>
        </Window>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(50);
    });

    it('should have performance optimization attributes', () => {
      renderWithRouter(
        <Window
          title="Test Window"
          appId="test-app"
          initialPos={{ x: 100, y: 100 }}
          data-testid="test-window"
        >
          <div>Test Content</div>
        </Window>
      );

      const window = screen.getByTestId('test-window');
      expect(window).toHaveClass('will-change-transform');
      expect(window).toHaveStyle({ transform: 'translateZ(0)' });
      expect(window).toHaveStyle({ backfaceVisibility: 'hidden' });
    });
  });

  describe('Window Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      renderWithRouter(
        <Window
          title="Test Window"
          appId="test-app"
          initialPos={{ x: 100, y: 100 }}
          data-testid="test-window"
        >
          <div>Test Content</div>
        </Window>
      );

      const closeButton = screen.getByRole('button', { name: /close window/i });
      expect(closeButton).toHaveAttribute('aria-label', 'Close window');
    });

    it('should have semantic HTML structure', () => {
      renderWithRouter(
        <Window
          title="Test Window"
          appId="test-app"
          initialPos={{ x: 100, y: 100 }}
          data-testid="test-window"
        >
          <div>Test Content</div>
        </Window>
      );

      // Check for proper semantic elements
      expect(document.querySelector('header')).toBeInTheDocument();
      expect(document.querySelector('main')).toBeInTheDocument();
    });
  });

  describe('Window Conditional Rendering', () => {
    it('should not render when app is not open', () => {
      mockUseApps.mockReturnValue({
        apps: {
          'test-app': {
            isOpen: false,
            zIndex: 1,
          }
        },
        closeApp: mockCloseApp,
        bringToFront: mockBringToFront,
        updateAppPosition: mockUpdateAppPosition,
      });

      renderWithRouter(
        <Window
          title="Test Window"
          appId="test-app"
          initialPos={{ x: 100, y: 100 }}
          data-testid="test-window"
        >
          <div>Test Content</div>
        </Window>
      );

      expect(screen.queryByTestId('test-window')).not.toBeInTheDocument();
    });

    it('should not render when app state is undefined', () => {
      mockUseApps.mockReturnValue({
        apps: {},
        closeApp: mockCloseApp,
        bringToFront: mockBringToFront,
        updateAppPosition: mockUpdateAppPosition,
      });

      renderWithRouter(
        <Window
          title="Test Window"
          appId="nonexistent-app"
          initialPos={{ x: 100, y: 100 }}
          data-testid="test-window"
        >
          <div>Test Content</div>
        </Window>
      );

      expect(screen.queryByTestId('test-window')).not.toBeInTheDocument();
    });
  });

  describe('Window Content Management', () => {
    it('should handle large content with scrollable area', () => {
      const largeContent = Array(100).fill().map((_, i) =>
        <div key={i}>NASA Data Item {i}</div>
      );

      renderWithRouter(
        <Window
          title="Large Data Window"
          appId="test-app"
          initialPos={{ x: 100, y: 100 }}
          data-testid="test-window"
        >
          <div data-testid="large-content">{largeContent}</div>
        </Window>
      );

      expect(screen.getByTestId('large-content')).toBeInTheDocument();

      // Check that the content area is scrollable
      const scrollableArea = document.querySelector('.overflow-auto');
      expect(scrollableArea).toBeInTheDocument();
    });

    it('should handle NASA API data content', () => {
      const mockNasaData = {
        title: "Mars Rover Image",
        date: "2024-01-15",
        explanation: "A stunning image from the Mars rover."
      };

      renderWithRouter(
        <Window
          title="NASA Data"
          appId="test-app"
          initialPos={{ x: 100, y: 100 }}
          data-testid="nasa-window"
        >
          <div>
            <h1>{mockNasaData.title}</h1>
            <p>{mockNasaData.date}</p>
            <p>{mockNasaData.explanation}</p>
          </div>
        </Window>
      );

      expect(screen.getByText('Mars Rover Image')).toBeInTheDocument();
      expect(screen.getByText('2024-01-15')).toBeInTheDocument();
      expect(screen.getByText('A stunning image from the Mars rover.')).toBeInTheDocument();
    });
  });

  describe('Window Error Handling', () => {
    it('should handle errors gracefully', () => {
      const originalError = console.error;
      console.error = vi.fn();

      mockUseApps.mockImplementation(() => {
        throw new Error('Context error');
      });

      expect(() => {
        renderWithRouter(
          <Window
            title="Test Window"
            appId="test-app"
            initialPos={{ x: 100, y: 100 }}
            data-testid="test-window"
          >
            <div>Test Content</div>
          </Window>
        );
      }).toThrow();

      console.error = originalError;
    });
  });
});