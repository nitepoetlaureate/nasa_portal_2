import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Desktop from '../Desktop.jsx';
import Window from '../Window.jsx';
import DesktopIcon from '../DesktopIcon.jsx';
import MenuBar from '../MenuBar.jsx';

// Mock NASA application components
const MockApodApp = () => (
  <div data-testid="apod-app">
    <h1>Astronomy Picture of the Day</h1>
    <p>Today's amazing space image</p>
  </div>
);

const MockNeoApp = () => (
  <div data-testid="neo-app">
    <h1>Near Earth Objects</h1>
    <p>Tracking asteroids and comets</p>
  </div>
);

// Mock icons
const MockApodIcon = () => <div data-testid="apod-icon">APOD</div>;
const MockNeoIcon = () => <div data-testid="neo-icon">NEO</div>;

// Mock AppContext for integration testing
const mockAppContext = {
  apps: {},
  activeApp: null,
  openApp: vi.fn(),
  closeApp: vi.fn(),
  bringToFront: vi.fn(),
  updateAppPosition: vi.fn(),
};

vi.mock('../../../contexts/AppContext.jsx', () => ({
  useApps: () => mockAppContext,
}));

// Mock sound hook
vi.mock('../../../hooks/useSound.js', () => ({
  useSound: vi.fn(() => vi.fn()),
}));

// Mock performance hook
vi.mock('../../../hooks/usePerformanceOptimized', () => ({
  usePerformanceMonitor: vi.fn(),
}));

// Wrap component with BrowserRouter
const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('System 7 Interface Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppContext.apps = {};
  });

  describe('Complete System 7 Desktop Experience', () => {
    it('should render authentic System 7 desktop environment', () => {
      renderWithRouter(<Desktop />);

      // Check desktop container
      const desktop = screen.getByTestId('desktop');
      expect(desktop).toBeInTheDocument();
      expect(desktop).toHaveStyle('background-color: #808080');

      // Check desktop icons
      expect(screen.getByTestId('desktop-icon-apod')).toBeInTheDocument();
      expect(screen.getByTestId('desktop-icon-neows')).toBeInTheDocument();

      // Check accessibility features
      const announcements = screen.getByTestId('screen-reader-announcements');
      expect(announcements).toBeInTheDocument();
      expect(announcements).toHaveAttribute('aria-live', 'polite');
    });

    it('should provide consistent System 7 visual experience', () => {
      renderWithRouter(
        <div>
          <MenuBar />
          <Desktop />
        </div>
      );

      // Check for System 7 consistency
      const menuBar = document.querySelector('.bg-s7-gray');
      const desktop = screen.getByTestId('desktop');

      expect(menuBar).toBeInTheDocument();
      expect(desktop).toBeInTheDocument();

      // Both should use consistent System 7 gray color
      expect(menuBar).toHaveClass('bg-s7-gray');
      expect(desktop).toHaveStyle('background-color: #808080');
    });
  });

  describe('Window Management Integration', () => {
    it('should open NASA application windows correctly', async () => {
      mockAppContext.openApp.mockResolvedValue(true);

      renderWithRouter(<Desktop />);

      const apodIcon = screen.getByTestId('desktop-icon-apod');
      fireEvent.doubleClick(apodIcon);

      expect(mockAppContext.openApp).toHaveBeenCalledWith('apod');
    });

    it('should handle multiple NASA application windows', async () => {
      mockAppContext.apps = {
        'apod': {
          id: 'apod',
          name: 'APOD - Astronomy Picture of the Day',
          isOpen: true,
          component: MockApodApp,
          pos: { x: 100, y: 100 },
          zIndex: 1
        },
        'neows': {
          id: 'neows',
          name: 'Near Earth Objects',
          isOpen: true,
          component: MockNeoApp,
          pos: { x: 200, y: 200 },
          zIndex: 2
        }
      };

      renderWithRouter(
        <div>
          <Desktop />
          <Window
            appId="apod"
            title="APOD"
            initialPos={{ x: 100, y: 100 }}
            data-testid="window-apod"
          >
            <MockApodApp />
          </Window>
          <Window
            appId="neows"
            title="Near Earth Objects"
            initialPos={{ x: 200, y: 200 }}
            data-testid="window-neows"
          >
            <MockNeoApp />
          </Window>
        </div>
      );

      expect(screen.getByTestId('window-apod')).toBeInTheDocument();
      expect(screen.getByTestId('window-neows')).toBeInTheDocument();
      expect(screen.getByTestId('apod-app')).toBeInTheDocument();
      expect(screen.getByTestId('neo-app')).toBeInTheDocument();
    });

    it('should manage window focus and z-index correctly', () => {
      mockAppContext.apps = {
        'apod': {
          id: 'apod',
          name: 'APOD',
          isOpen: true,
          component: MockApodApp,
          pos: { x: 100, y: 100 },
          zIndex: 1
        }
      };

      const { rerender } = renderWithRouter(
        <Window
          appId="apod"
          title="APOD"
          initialPos={{ x: 100, y: 100 }}
          data-testid="window-apod"
        >
          <MockApodApp />
        </Window>
      );

      const window = screen.getByTestId('window-apod');
      expect(window).toHaveStyle({ zIndex: 1 });

      // Simulate bringing to front
      mockAppContext.apps.apod.zIndex = 3;

      rerender(
        <Window
          appId="apod"
          title="APOD"
          initialPos={{ x: 100, y: 100 }}
          data-testid="window-apod"
        >
          <MockApodApp />
        </Window>
      );

      expect(window).toHaveStyle({ zIndex: 3 });
    });
  });

  describe('NASA Data Integration with System 7 Interface', () => {
    it('should display NASA data within System 7 windows', () => {
      const NasaDataApp = () => (
        <div data-testid="nasa-data">
          <h2>Mars Rover Images</h2>
          <div data-testid="image-gallery">
            <img src="mars.jpg" alt="Mars surface" />
            <p>Date: 2024-01-15</p>
            <p>Sol: 1234</p>
          </div>
        </div>
      );

      renderWithRouter(
        <Window
          appId="mars-rover"
          title="Mars Rover"
          initialPos={{ x: 50, y: 50 }}
          data-testid="mars-window"
        >
          <NasaDataApp />
        </Window>
      );

      expect(screen.getByTestId('nasa-data')).toBeInTheDocument();
      expect(screen.getByText('Mars Rover Images')).toBeInTheDocument();
      expect(screen.getByText('Date: 2024-01-15')).toBeInTheDocument();
      expect(screen.getByText('Sol: 1234')).toBeInTheDocument();
    });

    it('should handle large NASA datasets in System 7 interface', () => {
      const LargeNasaDataset = () => (
        <div data-testid="large-dataset">
          <h2>Asteroid Database</h2>
          {Array.from({ length: 100 }, (_, i) => (
            <div key={i} data-testid={`asteroid-${i}`}>
              Asteroid {i}: Diameter {i * 10}m
            </div>
          ))}
        </div>
      );

      renderWithRouter(
        <Window
          appId="asteroid-db"
          title="Asteroid Database"
          initialPos={{ x: 0, y: 0 }}
          data-testid="asteroid-window"
        >
          <LargeNasaDataset />
        </Window>
      );

      expect(screen.getByTestId('large-dataset')).toBeInTheDocument();
      expect(screen.getByTestId('asteroid-0')).toBeInTheDocument();
      expect(screen.getByTestId('asteroid-99')).toBeInTheDocument();

      // Check scrolling is available
      const scrollableArea = document.querySelector('.overflow-auto');
      expect(scrollableArea).toBeInTheDocument();
    });

    it('should handle NASA API errors within System 7 interface', () => {
      const NasaErrorApp = () => (
        <div data-testid="nasa-error">
          <h2>NASA API Error</h2>
          <p>Failed to fetch data from NASA API</p>
          <p>Please try again later</p>
        </div>
      );

      renderWithRouter(
        <Window
          appId="error-app"
          title="NASA API Error"
          initialPos={{ x: 100, y: 100 }}
          data-testid="error-window"
        >
          <NasaErrorApp />
        </Window>
      );

      expect(screen.getByTestId('nasa-error')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch data from NASA API')).toBeInTheDocument();
    });
  });

  describe('Mobile System 7 Adaptation', () => {
    it('should be responsive on mobile devices', () => {
      // Mock mobile viewport
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

      renderWithRouter(<Desktop />);

      const desktop = screen.getByTestId('desktop');
      expect(desktop).toBeInTheDocument();

      // Should still be functional on mobile
      const apodIcon = screen.getByTestId('desktop-icon-apod');
      expect(apodIcon).toBeInTheDocument();

      expect(() => {
        fireEvent.click(apodIcon);
      }).not.toThrow();
    });

    it('should handle touch interactions', () => {
      renderWithRouter(<Desktop />);

      const apodIcon = screen.getByTestId('desktop-icon-apod');

      // Simulate touch events
      expect(() => {
        fireEvent.touchStart(apodIcon);
        fireEvent.touchEnd(apodIcon);
        fireEvent.doubleClick(apodIcon);
      }).not.toThrow();
    });

    it('should adapt window layout for mobile', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      mockAppContext.apps = {
        'apod': {
          id: 'apod',
          name: 'APOD',
          isOpen: true,
          component: MockApodApp,
          pos: { x: 0, y: 0 },
          zIndex: 1
        }
      };

      renderWithRouter(
        <Window
          appId="apod"
          title="APOD"
          initialPos={{ x: 0, y: 0 }}
          data-testid="mobile-window"
        >
          <MockApodApp />
        </Window>
      );

      const window = screen.getByTestId('mobile-window');
      expect(window).toBeInTheDocument();

      // Window should adapt to mobile screen size
      expect(window).toHaveClass('min-w-[300px]');
    });
  });

  describe('Performance with NASA Data', () => {
    it('should render NASA applications efficiently', () => {
      const startTime = performance.now();

      mockAppContext.apps = {
        'apod': {
          id: 'apod',
          name: 'APOD',
          isOpen: true,
          component: MockApodApp,
          pos: { x: 100, y: 100 },
          zIndex: 1
        }
      };

      renderWithRouter(
        <Window
          appId="apod"
          title="APOD"
          initialPos={{ x: 100, y: 100 }}
          data-testid="performance-window"
        >
          <MockApodApp />
        </Window>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(50);
      expect(screen.getByTestId('performance-window')).toBeInTheDocument();
    });

    it('should handle multiple NASA applications without performance degradation', () => {
      const renderTimes = [];

      // Test rendering multiple NASA apps
      const nasaApps = ['APOD', 'NeoWs', 'Mars Rover', 'EPIC', 'DONKI'];

      nasaApps.forEach((appName, index) => {
        const startTime = performance.now();

        const AppComponent = () => (
          <div data-testid={`app-${index}`}>
            <h1>{appName}</h1>
            <p>NASA Data Content</p>
          </div>
        );

        renderWithRouter(
          <Window
            appId={`app-${index}`}
            title={appName}
            initialPos={{ x: index * 20, y: index * 20 }}
            data-testid={`window-${index}`}
          >
            <AppComponent />
          </Window>
        );

        const endTime = performance.now();
        renderTimes.push(endTime - startTime);
      });

      const averageRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
      expect(averageRenderTime).toBeLessThan(40);
    });
  });

  describe('Accessibility Integration', () => {
    it('should provide comprehensive accessibility for NASA applications', () => {
      mockAppContext.apps = {
        'apod': {
          id: 'apod',
          name: 'APOD - Astronomy Picture of the Day',
          isOpen: true,
          component: MockApodApp,
          pos: { x: 100, y: 100 },
          zIndex: 1
        }
      };

      renderWithRouter(
        <div>
          <Desktop />
          <Window
            appId="apod"
            title="APOD - Astronomy Picture of the Day"
            initialPos={{ x: 100, y: 100 }}
            data-testid="accessible-window"
          >
            <MockApodApp />
          </Window>
        </div>
      );

      // Check desktop accessibility
      const desktop = screen.getByTestId('desktop');
      expect(desktop).toHaveAttribute('role', 'main');
      expect(desktop).toHaveAttribute('aria-label', 'System 7 Desktop');

      // Check icon accessibility
      const apodIcon = screen.getByTestId('desktop-icon-apod');
      expect(apodIcon).toHaveAttribute('aria-label', 'APOD - Astronomy Picture of the Day');
      expect(apodIcon).toHaveAttribute('role', 'button');

      // Check window accessibility
      const window = screen.getByTestId('accessible-window');
      const closeButton = screen.getByRole('button', { name: /close window/i });
      expect(closeButton).toHaveAttribute('aria-label', 'Close window');
    });

    it('should support keyboard navigation throughout System 7 interface', () => {
      renderWithRouter(<Desktop />);

      const desktop = screen.getByTestId('desktop');
      const apodIcon = screen.getByTestId('desktop-icon-apod');

      // Test keyboard navigation
      expect(() => {
        desktop.focus();
        fireEvent.keyDown(desktop, { key: 'Tab' });

        apodIcon.focus();
        fireEvent.keyDown(apodIcon, { key: 'Enter' });
        fireEvent.keyDown(apodIcon, { key: 'Escape' });
      }).not.toThrow();
    });

    it('should provide screen reader support for NASA data', () => {
      const NasaAccessibleApp = () => (
        <div role="region" aria-label="NASA Image Gallery">
          <h2>Mars Rover Images</h2>
          <img
            src="mars.jpg"
            alt="Mars surface showing rocks and dust"
            aria-describedby="image-description"
          />
          <p id="image-description">
            Image captured by Perseverance rover on Sol 1234 showing geological formations
          </p>
        </div>
      );

      renderWithRouter(
        <Window
          appId="accessible-nasa"
          title="NASA Image Gallery"
          initialPos={{ x: 0, y: 0 }}
          data-testid="accessible-nasa-window"
        >
          <NasaAccessibleApp />
        </Window>
      );

      expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'NASA Image Gallery');
      expect(screen.getByAltText('Mars surface showing rocks and dust')).toBeInTheDocument();
      expect(screen.getByText('Image captured by Perseverance rover on Sol 1234 showing geological formations')).toBeInTheDocument();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle NASA app loading errors gracefully', async () => {
      mockAppContext.openApp.mockRejectedValue(new Error('Failed to load NASA app'));

      renderWithRouter(<Desktop />);

      const apodIcon = screen.getByTestId('desktop-icon-apod');

      expect(() => {
        fireEvent.doubleClick(apodIcon);
      }).not.toThrow();

      // Should show error message
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });
    });

    it('should maintain System 7 interface during errors', async () => {
      mockAppContext.openApp.mockRejectedValue(new Error('NASA API Error'));

      renderWithRouter(<Desktop />);

      const apodIcon = screen.getByTestId('desktop-icon-apod');
      fireEvent.doubleClick(apodIcon);

      // Desktop should still be functional
      expect(screen.getByTestId('desktop')).toBeInTheDocument();
      expect(screen.getByTestId('desktop-icon-neows')).toBeInTheDocument();

      // Should be able to interact with other icons
      expect(() => {
        fireEvent.click(screen.getByTestId('desktop-icon-neows'));
      }).not.toThrow();
    });
  });

  describe('System 7 Authenticity Validation', () => {
    it('should maintain authentic System 7 visual fidelity', () => {
      renderWithRouter(
        <div>
          <MenuBar />
          <Desktop />
        </div>
      );

      // Check for authentic System 7 elements
      const menuBar = document.querySelector('.font-chicago');
      const desktop = screen.getByTestId('desktop');

      expect(menuBar).toBeInTheDocument();
      expect(desktop).toHaveStyle('background-color: #808080');

      // Check for proper System 7 border styles
      const iconElements = document.querySelectorAll('.bg-s7-blue');
      expect(iconElements.length).toBeGreaterThan(0);
    });

    it('should provide authentic System 7 interaction patterns', () => {
      renderWithRouter(<Desktop />);

      const apodIcon = screen.getByTestId('desktop-icon-apod');

      // Test authentic Mac OS interaction patterns
      expect(() => {
        // Single click to select
        fireEvent.click(apodIcon);

        // Double click to open
        fireEvent.doubleClick(apodIcon);

        // Keyboard navigation
        apodIcon.focus();
        fireEvent.keyDown(apodIcon, { key: 'Enter' });
      }).not.toThrow();
    });

    it('should maintain retro aesthetic while displaying modern NASA data', () => {
      const ModernNasaApp = () => (
        <div>
          <h1>Real-time Space Data</h1>
          <div className="modern-data-grid">
            <div>Satellite: ISS</div>
            <div>Speed: 17,500 mph</div>
            <div>Altitude: 250 miles</div>
            <div>Crew: 7 astronauts</div>
          </div>
        </div>
      );

      renderWithRouter(
        <Window
          appId="modern-nasa"
          title="Live Space Data"
          initialPos={{ x: 0, y: 0 }}
          data-testid="retro-modern-window"
        >
          <ModernNasaApp />
        </Window>
      );

      const window = screen.getByTestId('retro-modern-window');

      // Should have System 7 styling
      expect(window).toHaveClass('bg-s7-gray', 'border-2', 'shadow-s7-window');

      // Should display modern NASA data
      expect(screen.getByText('Real-time Space Data')).toBeInTheDocument();
      expect(screen.getByText('Speed: 17,500 mph')).toBeInTheDocument();
    });
  });
});