import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock API calls
vi.mock('../../../services/api', () => ({
  getApod: vi.fn(),
}));

// Mock useApi hook
const mockUseApi = vi.fn();
vi.mock('../../../hooks/useApi.js', () => ({
  default: mockUseApi,
}));

import ApodApp from '../ApodApp.jsx';

// Mock AppContext
const mockOpenApp = vi.fn();
vi.mock('../../../contexts/AppContext.jsx', () => ({
  useApps: () => ({
    openApp: mockOpenApp,
    closeApp: vi.fn(),
    apps: {},
    activeApp: null,
  }),
}));

// Mock OptimizedImage
vi.mock('../../Performance/OptimizedImage.js', () => ({
  default: ({ src, alt, className, ...props }) => (
    <img data-testid="optimized-image" src={src} alt={alt} className={className} {...props} />
  ),
}));

// Test data
const mockApodImageData = {
  date: '2024-01-01',
  title: 'Test Astronomy Picture',
  explanation: 'This is a test explanation for the astronomy picture.',
  url: 'https://apod.nasa.gov/apod/image/2401/test.jpg',
  hdurl: 'https://apod.nasa.gov/apod/image/2401/test_hd.jpg',
  media_type: 'image',
  service_version: 'v1',
  copyright: 'Test Copyright',
};

const mockApodVideoData = {
  date: '2024-01-02',
  title: 'Test Astronomy Video',
  explanation: 'This is a test explanation for the astronomy video.',
  url: 'https://www.youtube.com/watch?v=test123',
  media_type: 'video',
  service_version: 'v1',
  copyright: 'Video Copyright',
};

describe('APOD App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOpenApp.mockClear();
    mockUseApi.mockClear();
  });

  describe('Loading State', () => {
    it('should render loading state correctly', () => {
      mockUseApi.mockReturnValue({
        data: null,
        loading: true,
        error: null,
      });

      render(<ApodApp />);

      expect(screen.getByText('Loading NASA APOD...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should show loading spinner', () => {
      mockUseApi.mockReturnValue({
        data: null,
        loading: true,
        error: null,
      });

      render(<ApodApp />);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('rounded-full', 'h-8', 'w-8', 'border-b-2', 'border-blue-600');
    });
  });

  describe('Error State', () => {
    it('should render error state correctly', () => {
      const mockError = new Error('Failed to fetch APOD data');
      mockUseApi.mockReturnValue({
        data: null,
        loading: false,
        error: mockError,
      });

      render(<ApodApp />);

      expect(screen.getByText(/Error:/)).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch APOD data')).toBeInTheDocument();
      expect(screen.getByText('Could not load APOD data.')).toBeInTheDocument();
    });

    it('should apply error styling correctly', () => {
      mockUseApi.mockReturnValue({
        data: null,
        loading: false,
        error: new Error('Network error'),
      });

      render(<ApodApp />);

      const errorText = screen.getByText('Network error');
      expect(errorText).toHaveClass('text-red-600');
    });
  });

  describe('Image APOD Display', () => {
    beforeEach(() => {
      mockUseApi.mockReturnValue({
        data: mockApodImageData,
        loading: false,
        error: null,
      });
    });

    it('should render APOD image data correctly', () => {
      render(<ApodApp />);

      expect(screen.getByText('Test Astronomy Picture')).toBeInTheDocument();
      expect(screen.getByText('Date: 2024-01-01')).toBeInTheDocument();
      expect(screen.getByText('This is a test explanation for the astronomy picture.')).toBeInTheDocument();
      expect(screen.getByText('© Test Copyright')).toBeInTheDocument();
    });

    it('should render OptimizedImage component with correct props', () => {
      render(<ApodApp />);

      const optimizedImage = screen.getByTestId('optimized-image');
      expect(optimizedImage).toBeInTheDocument();
      expect(optimizedImage).toHaveAttribute('src', 'https://apod.nasa.gov/apod/image/2401/test.jpg');
      expect(optimizedImage).toHaveAttribute('alt', 'Test Astronomy Picture');
    });

    it('should have clickable image that opens image viewer', async () => {
      const user = userEvent.setup();
      render(<ApodApp />);

      const clickableDiv = screen.getByRole('button', { name: /click to view in high definition/i });
      expect(clickableDiv).toBeInTheDocument();

      await user.click(clickableDiv);

      expect(mockOpenApp).toHaveBeenCalledWith('imageViewer', {
        hdurl: 'https://apod.nasa.gov/apod/image/2401/test_hd.jpg',
        title: 'Test Astronomy Picture',
      });
    });

    it('should render download links correctly', () => {
      render(<ApodApp />);

      const standardDownload = screen.getByText('📥 Standard Quality');
      const hdDownload = screen.getByText('📥 High Definition');

      expect(standardDownload).toBeInTheDocument();
      expect(standardDownload).toHaveAttribute('href', 'https://apod.nasa.gov/apod/image/2401/test.jpg');
      expect(standardDownload).toHaveAttribute('download');

      expect(hdDownload).toBeInTheDocument();
      expect(hdDownload).toHaveAttribute('href', 'https://apod.nasa.gov/apod/image/2401/test_hd.jpg');
      expect(hdDownload).toHaveAttribute('download');
    });

    it('should have proper styling and structure', () => {
      render(<ApodApp />);

      const container = screen.getByText('Test Astronomy Picture').closest('div');
      expect(container).toHaveClass('font-geneva', 'text-sm', 'text-black', 'p-2', 'flex', 'flex-col', 'h-full');

      const title = screen.getByText('Test Astronomy Picture');
      expect(title).toHaveClass('font-bold', 'text-base', 'mb-2', 'shrink-0');

      const downloadsSection = screen.getByText('Downloads:').closest('div');
      expect(downloadsSection).toHaveClass('text-xs', 'border-t', 'border-gray-400', 'pt-2', 'mt-auto', 'shrink-0');
    });
  });

  describe('Video APOD Display', () => {
    beforeEach(() => {
      mockUseApi.mockReturnValue({
        data: mockApodVideoData,
        loading: false,
        error: null,
      });
    });

    it('should render APOD video data correctly', () => {
      render(<ApodApp />);

      expect(screen.getByText('Test Astronomy Video')).toBeInTheDocument();
      expect(screen.getByText("Today's APOD is a video.")).toBeInTheDocument();
      expect(screen.getByText('Watch here →')).toBeInTheDocument();
    });

    it('should render video link correctly', () => {
      render(<ApodApp />);

      const videoLink = screen.getByText('Watch here →');
      expect(videoLink).toHaveAttribute('href', 'https://www.youtube.com/watch?v=test123');
      expect(videoLink).toHaveAttribute('target', '_blank');
      expect(videoLink).toHaveAttribute('rel', 'noopener noreferrer');
      expect(videoLink).toHaveClass('text-blue-700', 'underline', 'hover:text-blue-800');
    });

    it('should not show download section for video APOD', () => {
      render(<ApodApp />);

      expect(screen.queryByText('Downloads:')).not.toBeInTheDocument();
      expect(screen.queryByTestId('optimized-image')).not.toBeInTheDocument();
    });
  });

  describe('No Data State', () => {
    it('should render null when no data is available', () => {
      mockUseApi.mockReturnValue({
        data: null,
        loading: false,
        error: null,
      });

      const { container } = render(<ApodApp />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseApi.mockReturnValue({
        data: mockApodImageData,
        loading: false,
        error: null,
      });
    });

    it('should have proper ARIA labels and roles', () => {
      render(<ApodApp />);

      const clickableImage = screen.getByRole('button', { name: /click to view in high definition/i });
      expect(clickableImage).toBeInTheDocument();

      const image = screen.getByRole('img');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('alt', 'Test Astronomy Picture');
    });

    it('should have proper link accessibility attributes', () => {
      render(<ApodApp />);

      const downloadLinks = screen.getAllByRole('link');
      expect(downloadLinks).toHaveLength(2);

      downloadLinks.forEach(link => {
        expect(link).toHaveAttribute('rel', 'noreferrer');
      });
    });
  });

  describe('Component Behavior', () => {
    it('should handle missing copyright gracefully', () => {
      const dataWithoutCopyright = { ...mockApodImageData, copyright: null };
      mockUseApi.mockReturnValue({
        data: dataWithoutCopyright,
        loading: false,
        error: null,
      });

      render(<ApodApp />);

      expect(screen.queryByText(/©/)).not.toBeInTheDocument();
    });

    it('should handle missing HD URL gracefully', () => {
      const dataWithoutHdUrl = { ...mockApodImageData, hdurl: null };
      mockUseApi.mockReturnValue({
        data: dataWithoutHdUrl,
        loading: false,
        error: null,
      });

      render(<ApodApp />);

      expect(screen.getByText('📥 Standard Quality')).toBeInTheDocument();
      expect(screen.queryByText('📥 High Definition')).not.toBeInTheDocument();
    });

    it('should have hover effects on interactive elements', () => {
      render(<ApodApp />);

      const clickableDiv = screen.getByRole('button', { name: /click to view in high definition/i });
      expect(clickableDiv).toHaveClass('cursor-pointer', 'group');

      const image = screen.getByTestId('optimized-image');
      expect(image).toHaveClass('group-hover:border-blue-400', 'transition-colors');
    });
  });
});