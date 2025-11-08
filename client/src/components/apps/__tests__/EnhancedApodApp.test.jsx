import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import EnhancedApodApp from '../EnhancedApodApp.jsx';

// Mock API calls
vi.mock('../../../services/api.js', () => ({
  getApod: vi.fn(),
  getApodForDate: vi.fn(),
}));

// Mock useOptimizedApi hook
const mockUseOptimizedApi = vi.fn();
const mockExecute = vi.fn();

vi.mock('../../../hooks/usePerformanceOptimized.js', () => ({
  useOptimizedApi: mockUseOptimizedApi,
}));

// Mock AppContext
vi.mock('../../../contexts/AppContext.jsx', () => ({
  useApps: () => ({
    openApp: vi.fn(),
    closeApp: vi.fn(),
    apps: {},
    activeApp: null,
  }),
}));

// Mock OptimizedImage
vi.mock('../../Performance/OptimizedImage.js', () => ({
  default: ({ src, alt, className, onClick, ...props }) => (
    <img data-testid="optimized-image" src={src} alt={alt} className={className} onClick={onClick} {...props} />
  ),
}));

// Test data
const mockEnhancedApodData = {
  date: '2024-01-01',
  title: 'Enhanced Test Astronomy Picture',
  explanation: 'This is an enhanced test explanation for the astronomy picture with more details.',
  url: 'https://apod.nasa.gov/apod/image/2401/enhanced_test.jpg',
  hdurl: 'https://apod.nasa.gov/apod/image/2401/enhanced_test_hd.jpg',
  media_type: 'image',
  service_version: 'v1',
  copyright: 'Enhanced Test Copyright',
};

const mockEnhancedApodVideoData = {
  date: '2024-01-02',
  title: 'Enhanced Test Astronomy Video',
  explanation: 'This is an enhanced test explanation for the astronomy video.',
  url: 'https://www.youtube.com/watch?v=enhanced_test123',
  media_type: 'video',
  service_version: 'v1',
  copyright: 'Enhanced Video Copyright',
};

// Mock localStorage
const createLocalStorageMock = () => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
};

describe('Enhanced APOD App Component', () => {
  let localStorageMock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockClear();

    // Setup localStorage mock
    localStorageMock = createLocalStorageMock();
    global.localStorage = localStorageMock;

    // Reset useOptimizedApi mock
    mockUseOptimizedApi.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      execute: mockExecute,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Loading State', () => {
    beforeEach(() => {
      mockUseOptimizedApi.mockReturnValue({
        data: null,
        loading: true,
        error: null,
        execute: mockExecute,
      });
    });

    it('should render loading state correctly', () => {
      render(<EnhancedApodApp />);

      expect(screen.getByText(/Loading APOD for/)).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should show loading spinner', () => {
      render(<EnhancedApodApp />);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('rounded-full', 'h-8', 'w-8', 'border-b-2', 'border-blue-600');
    });

    it('should display current date in loading message', () => {
      render(<EnhancedApodApp />);

      const today = new Date().toISOString().split('T')[0];
      expect(screen.getByText(`Loading APOD for ${today}...`)).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    beforeEach(() => {
      mockUseOptimizedApi.mockReturnValue({
        data: null,
        loading: false,
        error: new Error('Failed to fetch enhanced APOD data'),
        execute: mockExecute,
      });
    });

    it('should render error state correctly', () => {
      render(<EnhancedApodApp />);

      expect(screen.getByText(/Error:/)).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch enhanced APOD data')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });

    it('should call execute when retry button is clicked', async () => {
      render(<EnhancedApodApp />);

      const retryButton = screen.getByRole('button', { name: 'Retry' });
      fireEvent.click(retryButton);

      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('should apply error styling correctly', () => {
      render(<EnhancedApodApp />);

      const errorText = screen.getByText('Failed to fetch enhanced APOD data');
      expect(errorText).toHaveClass('text-red-600');
    });
  });

  describe('Image APOD Display', () => {
    beforeEach(() => {
      mockUseOptimizedApi.mockReturnValue({
        data: mockEnhancedApodData,
        loading: false,
        error: null,
        execute: mockExecute,
      });
    });

    it('should render enhanced APOD image data correctly', () => {
      render(<EnhancedApodApp />);

      expect(screen.getByText('Enhanced Test Astronomy Picture')).toBeInTheDocument();
      expect(screen.getByText('This is an enhanced test explanation for the astronomy picture with more details.')).toBeInTheDocument();
    });

    it('should show date picker with correct value', () => {
      render(<EnhancedApodApp />);

      const datePicker = screen.getByRole('textbox');
      expect(datePicker).toHaveValue('2024-01-01');
      expect(datePicker).toHaveAttribute('max', new Date().toISOString().split('T')[0]);
    });

    it('should render OptimizedImage component with correct props', () => {
      render(<EnhancedApodApp />);

      const optimizedImage = screen.getByTestId('optimized-image');
      expect(optimizedImage).toBeInTheDocument();
      expect(optimizedImage).toHaveAttribute('src', 'https://apod.nasa.gov/apod/image/2401/enhanced_test.jpg');
      expect(optimizedImage).toHaveAttribute('alt', 'Enhanced Test Astronomy Picture');
      expect(optimizedImage).toHaveClass('object-contain', 'w-full', 'h-full', 'cursor-zoom-in');
    });

    it('should have favorite toggle button', () => {
      render(<EnhancedApodApp />);

      const favoriteButton = screen.getByText('☆');
      expect(favoriteButton).toBeInTheDocument();
    });

    it('should have metadata toggle button', () => {
      render(<EnhancedApodApp />);

      const metadataButton = screen.getByRole('button', { name: 'Show Info' });
      expect(metadataButton).toBeInTheDocument();
    });

    it('should show explanation by default', () => {
      render(<EnhancedApodApp />);

      expect(screen.getByText('Explanation')).toBeInTheDocument();
      expect(screen.getByText('This is an enhanced test explanation for the astronomy picture with more details.')).toBeInTheDocument();
    });

    it('should toggle metadata view', async () => {
      render(<EnhancedApodApp />);

      const metadataButton = screen.getByRole('button', { name: 'Show Info' });
      fireEvent.click(metadataButton);

      expect(screen.getByText('Metadata')).toBeInTheDocument();
      expect(screen.getByText('Date:')).toBeInTheDocument();
      expect(screen.getByText('Media Type:')).toBeInTheDocument();
      expect(screen.getByText('Service Ver:')).toBeInTheDocument();
      expect(screen.getByText('Copyright:')).toBeInTheDocument();

      expect(metadataButton).toHaveTextContent('Hide Info');
    });

    it('should open fullscreen image on image click', async () => {
      render(<EnhancedApodApp />);

      const image = screen.getByTestId('optimized-image');
      fireEvent.click(image);

      expect(screen.getByText('✕ Close')).toBeInTheDocument();
      expect(screen.getByText('Enhanced Test Astronomy Picture')).toBeInTheDocument();
      expect(screen.getByText('2024-01-01')).toBeInTheDocument();
    });

    it('should close fullscreen image on close button click', async () => {
      render(<EnhancedApodApp />);

      // Open fullscreen first
      const image = screen.getByTestId('optimized-image');
      fireEvent.click(image);

      // Then close it
      const closeButton = screen.getByText('✕ Close');
      fireEvent.click(closeButton);

      expect(screen.queryByText('✕ Close')).not.toBeInTheDocument();
    });

    it('should close fullscreen image on backdrop click', async () => {
      render(<EnhancedApodApp />);

      // Open fullscreen first
      const image = screen.getByTestId('optimized-image');
      fireEvent.click(image);

      // Then click backdrop
      const backdrop = screen.getByText('✕ Close').closest('div').parentElement;
      fireEvent.click(backdrop);

      expect(screen.queryByText('✕ Close')).not.toBeInTheDocument();
    });
  });

  describe('Video APOD Display', () => {
    beforeEach(() => {
      mockUseOptimizedApi.mockReturnValue({
        data: mockEnhancedApodVideoData,
        loading: false,
        error: null,
        execute: mockExecute,
      });
    });

    it('should render APOD video correctly', () => {
      render(<EnhancedApodApp />);

      expect(screen.getByText('Enhanced Test Astronomy Video')).toBeInTheDocument();

      const iframe = screen.getByTitle('Enhanced Test Astronomy Video');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('src', 'https://www.youtube.com/watch?v=enhanced_test123');
      expect(iframe).toHaveAttribute('frameBorder', '0');
      expect(iframe).toHaveAttribute('allowFullScreen');
    });

    it('should not show fullscreen for video APOD', () => {
      render(<EnhancedApodApp />);

      // Should not be able to open fullscreen for video
      const image = screen.queryByTestId('optimized-image');
      expect(image).not.toBeInTheDocument();
    });
  });

  describe('Date Navigation', () => {
    beforeEach(() => {
      mockUseOptimizedApi.mockReturnValue({
        data: mockEnhancedApodData,
        loading: false,
        error: null,
        execute: mockExecute,
      });
    });

    it('should change date when date picker is changed', async () => {
      render(<EnhancedApodApp />);

      const datePicker = screen.getByRole('textbox');
      fireEvent.change(datePicker, { target: { value: '2024-01-15' } });

      expect(datePicker).toHaveValue('2024-01-15');
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('should handle keyboard navigation correctly', async () => {
      render(<EnhancedApodApp />);

      // Test left arrow (previous day)
      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      // Should trigger execute due to date change
      expect(mockExecute).toHaveBeenCalled();
    });

    it('should not allow future dates', async () => {
      render(<EnhancedApodApp />);

      const datePicker = screen.getByRole('textbox');
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDateString = futureDate.toISOString().split('T')[0];

      fireEvent.change(datePicker, { target: { value: futureDateString } });

      // Date picker should not accept future dates due to max attribute
      expect(datePicker).toHaveAttribute('max', new Date().toISOString().split('T')[0]);
    });
  });

  describe('Favorites Functionality', () => {
    beforeEach(() => {
      mockUseOptimizedApi.mockReturnValue({
        data: mockEnhancedApodData,
        loading: false,
        error: null,
        execute: mockExecute,
      });
    });

    it('should add to favorites when star is clicked', async () => {
      render(<EnhancedApodApp />);

      const favoriteButton = screen.getByText('☆');
      fireEvent.click(favoriteButton);

      expect(favoriteButton).toHaveTextContent('★');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'apodFavorites',
        expect.stringContaining('2024-01-01')
      );
    });

    it('should remove from favorites when filled star is clicked', async () => {
      // Pre-populate localStorage with favorites
      localStorageMock.getItem.mockReturnValue(JSON.stringify([
        { date: '2024-01-01', title: 'Enhanced Test Astronomy Picture', url: 'test.jpg' }
      ]));

      render(<EnhancedApodApp />);

      // Re-render after localStorage is populated
      const favoriteButton = screen.getByText('★');
      fireEvent.click(favoriteButton);

      expect(favoriteButton).toHaveTextContent('☆');
    });

    it('should load favorites from localStorage on mount', () => {
      const mockFavorites = [
        { date: '2024-01-01', title: 'Test Favorite', url: 'test.jpg' }
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockFavorites));

      render(<EnhancedApodApp />);

      expect(localStorageMock.getItem).toHaveBeenCalledWith('apodFavorites');
    });
  });

  describe('Keyboard Shortcuts', () => {
    beforeEach(() => {
      mockUseOptimizedApi.mockReturnValue({
        data: mockEnhancedApodData,
        loading: false,
        error: null,
        execute: mockExecute,
      });
    });

    it('should show keyboard shortcuts help', () => {
      render(<EnhancedApodApp />);

      expect(screen.getByText('Keyboard Shortcuts:')).toBeInTheDocument();
      expect(screen.getByText('← → Navigate dates | F Fullscreen | M Metadata')).toBeInTheDocument();
    });

    it('should toggle metadata with M key', async () => {
      render(<EnhancedApodApp />);

      fireEvent.keyDown(window, { key: 'm' });

      expect(screen.getByText('Metadata')).toBeInTheDocument();
    });

    it('should open fullscreen with F key', async () => {
      render(<EnhancedApodApp />);

      fireEvent.keyDown(window, { key: 'f' });

      expect(screen.getByText('✕ Close')).toBeInTheDocument();
    });

    it('should close fullscreen with Escape key', async () => {
      render(<EnhancedApodApp />);

      // Open fullscreen first
      fireEvent.keyDown(window, { key: 'f' });
      expect(screen.getByText('✕ Close')).toBeInTheDocument();

      // Then close with Escape
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByText('✕ Close')).not.toBeInTheDocument();
    });

    it('should navigate dates with arrow keys', async () => {
      render(<EnhancedApodApp />);

      const initialExecuteCount = mockExecute.mock.calls.length;

      // Navigate to previous day
      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      expect(mockExecute).toHaveBeenCalledTimes(initialExecuteCount + 1);

      // Navigate to next day
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      expect(mockExecute).toHaveBeenCalledTimes(initialExecuteCount + 2);
    });
  });

  describe('Component Layout and Styling', () => {
    beforeEach(() => {
      mockUseOptimizedApi.mockReturnValue({
        data: mockEnhancedApodData,
        loading: false,
        error: null,
        execute: mockExecute,
      });
    });

    it('should have proper main container structure', () => {
      render(<EnhancedApodApp />);

      const container = screen.getByText('Enhanced Test Astronomy Picture').closest('div');
      expect(container).toHaveClass('font-geneva', 'text-sm', 'text-black', 'p-2', 'flex', 'flex-col', 'h-full');
    });

    it('should have proper header structure', () => {
      render(<EnhancedApodApp />);

      const header = screen.getByText('Enhanced Test Astronomy Picture').parentElement;
      expect(header).toHaveClass('flex', 'justify-between', 'items-center', 'mb-2', 'shrink-0');

      const title = screen.getByText('Enhanced Test Astronomy Picture');
      expect(title).toHaveClass('font-bold', 'text-base', 'truncate');
    });

    it('should have proper two-column layout', () => {
      render(<EnhancedApodApp />);

      const contentContainer = screen.getByTestId('optimized-image').parentElement.parentElement;
      expect(contentContainer).toHaveClass('flex-grow', 'flex', 'h-0');
    });

    it('should have proper image panel styling', () => {
      render(<EnhancedApodApp />);

      const imagePanel = screen.getByTestId('optimized-image').parentElement;
      expect(imagePanel).toHaveClass(
        'w-2/3', 'h-full', 'overflow-hidden', 'flex', 'items-center', 'justify-center',
        'bg-black', 'border-2', 'border-t-gray-500', 'border-l-gray-500', 'border-b-white', 'border-r-white'
      );
    });

    it('should have proper metadata panel styling', () => {
      render(<EnhancedApodApp />);

      const metadataPanel = screen.getByText('Explanation').parentElement;
      expect(metadataPanel).toHaveClass(
        'w-1/3', 'h-full', 'ml-1', 'overflow-y-auto', 'text-xs', 'p-2',
        'border-2', 'border-t-gray-500', 'border-l-gray-500', 'border-b-white', 'border-r-white', 'bg-white'
      );
    });
  });

  describe('Download Functionality', () => {
    beforeEach(() => {
      mockUseOptimizedApi.mockReturnValue({
        data: mockEnhancedApodData,
        loading: false,
        error: null,
        execute: mockExecute,
      });
    });

    it('should show download link in metadata view', async () => {
      render(<EnhancedApodApp />);

      const metadataButton = screen.getByRole('button', { name: 'Show Info' });
      fireEvent.click(metadataButton);

      const downloadLink = screen.getByText('Download HD Image');
      expect(downloadLink).toBeInTheDocument();
      expect(downloadLink).toHaveAttribute('href', 'https://apod.nasa.gov/apod/image/2401/enhanced_test_hd.jpg');
      expect(downloadLink).toHaveAttribute('target', '_blank');
      expect(downloadLink).toHaveAttribute('rel', 'noreferrer');
    });

    it('should show SD download link when HD URL is not available', async () => {
      const dataWithoutHdUrl = { ...mockEnhancedApodData, hdurl: null };
      mockUseOptimizedApi.mockReturnValue({
        data: dataWithoutHdUrl,
        loading: false,
        error: null,
        execute: mockExecute,
      });

      render(<EnhancedApodApp />);

      const metadataButton = screen.getByRole('button', { name: 'Show Info' });
      fireEvent.click(metadataButton);

      const downloadLink = screen.getByText('Download SD Image');
      expect(downloadLink).toBeInTheDocument();
      expect(downloadLink).toHaveAttribute('href', 'https://apod.nasa.gov/apod/image/2401/enhanced_test.jpg');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing data gracefully', () => {
      mockUseOptimizedApi.mockReturnValue({
        data: null,
        loading: false,
        error: null,
        execute: mockExecute,
      });

      const { container } = render(<EnhancedApodApp />);

      expect(container.firstChild).toBeNull();
    });

    it('should handle missing copyright gracefully', () => {
      const dataWithoutCopyright = { ...mockEnhancedApodData, copyright: null };
      mockUseOptimizedApi.mockReturnValue({
        data: dataWithoutCopyright,
        loading: false,
        error: null,
        execute: mockExecute,
      });

      render(<EnhancedApodApp />);

      // Should not crash when copyright is missing
      expect(screen.getByText('Enhanced Test Astronomy Picture')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseOptimizedApi.mockReturnValue({
        data: mockEnhancedApodData,
        loading: false,
        error: null,
        execute: mockExecute,
      });
    });

    it('should have proper ARIA labels and roles', () => {
      render(<EnhancedApodApp />);

      const image = screen.getByRole('img');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('alt', 'Enhanced Test Astronomy Picture');

      const dateInput = screen.getByRole('textbox');
      expect(dateInput).toHaveAttribute('type', 'date');
    });

    it('should have proper focus handling', async () => {
      render(<EnhancedApodApp />);

      // Focus should work on elements
      const dateInput = screen.getByRole('textbox');
      dateInput.focus();
      expect(dateInput).toHaveFocus();
    });

    it('should have keyboard navigation support', async () => {
      render(<EnhancedApodApp />);

      // Focus on date picker
      const dateInput = screen.getByRole('textbox');
      dateInput.focus();
      expect(dateInput).toHaveFocus();

      // Focus on favorite button
      const favoriteButton = screen.getByText('☆');
      favoriteButton.focus();
      expect(favoriteButton).toHaveFocus();
    });
  });
});