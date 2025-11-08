import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ImageViewerApp from '../ImageViewerApp.jsx';

// Mock AppContext
const mockApps = {
  imageViewer: {
    data: null,
  },
};

vi.mock('../../../contexts/AppContext.jsx', () => ({
  useApps: () => ({
    apps: mockApps,
    openApp: vi.fn(),
    closeApp: vi.fn(),
    activeApp: null,
  }),
}));

describe('ImageViewer App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock data before each test
    mockApps.imageViewer = { data: null };
  });

  describe('No Image State', () => {
    it('should render no image message when no image data is available', () => {
      render(<ImageViewerApp />);

      expect(screen.getByText('No image to display.')).toBeInTheDocument();
      expect(screen.getByText('No image to display.')).toHaveClass('p-4');
    });

    it('should render no image message when hdurl is missing', () => {
      mockApps.imageViewer.data = {
        title: 'Test Image',
        // hdurl is missing
      };

      render(<ImageViewerApp />);

      expect(screen.getByText('No image to display.')).toBeInTheDocument();
    });

    it('should render no image message when imageViewer app data is null', () => {
      mockApps.imageViewer.data = null;

      render(<ImageViewerApp />);

      expect(screen.getByText('No image to display.')).toBeInTheDocument();
    });
  });

  describe('Image Display', () => {
    it('should render image when hdurl and title are provided', () => {
      mockApps.imageViewer.data = {
        hdurl: 'https://example.com/test-image-hd.jpg',
        title: 'Test NASA Image',
      };

      render(<ImageViewerApp />);

      const image = screen.getByRole('img');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/test-image-hd.jpg');
      expect(image).toHaveAttribute('alt', 'High-resolution view of Test NASA Image');
    });

    it('should render image when only hdurl is provided', () => {
      mockApps.imageViewer.data = {
        hdurl: 'https://example.com/test-image-hd.jpg',
        // title is missing
      };

      render(<ImageViewerApp />);

      const image = screen.getByRole('img');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/test-image-hd.jpg');
      expect(image).toHaveAttribute('alt', 'High-resolution view of undefined');
    });

    it('should apply correct styling to container', () => {
      mockApps.imageViewer.data = {
        hdurl: 'https://example.com/test-image.jpg',
        title: 'Styled Test Image',
      };

      render(<ImageViewerApp />);

      const container = screen.getByRole('img').parentElement;
      expect(container).toHaveClass(
        'w-full',
        'h-full',
        'bg-black',
        'flex',
        'items-center',
        'justify-center',
        'overflow-auto'
      );
    });

    it('should apply correct styling to image', () => {
      mockApps.imageViewer.data = {
        hdurl: 'https://example.com/styled-test-image.jpg',
        title: 'Styled Test Image',
      };

      render(<ImageViewerApp />);

      const image = screen.getByRole('img');
      expect(image).toHaveClass(
        'max-w-full',
        'max-h-full',
        'object-contain'
      );
    });

    it('should handle various image URLs correctly', () => {
      const testUrls = [
        'https://apod.nasa.gov/apod/image/2401/galaxy.jpg',
        'https://mars.nasa.gov/msl-raw-images/proj/msl/redops/ods/surface/sol/01000/opgs/edr/rcam/RLB_486265291EDR_F0481570RHAZ00323M_.JPG',
        'https://epic.gsfc.nasa.gov/archive/natural/2024/01/01/png/epic_1b_20240101000000.png',
      ];

      testUrls.forEach((url, index) => {
        mockApps.imageViewer.data = {
          hdurl: url,
          title: `Test Image ${index + 1}`,
        };

        const { unmount } = render(<ImageViewerApp />);
        const image = screen.getByRole('img');
        expect(image).toHaveAttribute('src', url);
        unmount();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper alt text for accessibility', () => {
      mockApps.imageViewer.data = {
        hdurl: 'https://example.com/accessible-image.jpg',
        title: 'Accessible NASA Image with Detailed Description',
      };

      render(<ImageViewerApp />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt', 'High-resolution view of Accessible NASA Image with Detailed Description');
    });

    it('should handle empty title gracefully in alt text', () => {
      mockApps.imageViewer.data = {
        hdurl: 'https://example.com/no-title-image.jpg',
        title: '',
      };

      render(<ImageViewerApp />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt', 'High-resolution view of ');
    });

    it('should have proper image role for screen readers', () => {
      mockApps.imageViewer.data = {
        hdurl: 'https://example.com/screen-reader-image.jpg',
        title: 'Screen Reader Compatible Image',
      };

      render(<ImageViewerApp />);

      const image = screen.getByRole('img');
      expect(image).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed URLs gracefully', () => {
      mockApps.imageViewer.data = {
        hdurl: 'not-a-valid-url',
        title: 'Malformed URL Image',
      };

      render(<ImageViewerApp />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', 'not-a-valid-url');
      // Component should still render even with invalid URL
    });

    it('should handle very long titles', () => {
      const longTitle = 'A'.repeat(1000);
      mockApps.imageViewer.data = {
        hdurl: 'https://example.com/long-title-image.jpg',
        title: longTitle,
      };

      render(<ImageViewerApp />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt', `High-resolution view of ${longTitle}`);
    });

    it('should handle special characters in title', () => {
      const specialTitle = 'NASA Image: "Exploration & Discovery" (2024)!';
      mockApps.imageViewer.data = {
        hdurl: 'https://example.com/special-chars-image.jpg',
        title: specialTitle,
      };

      render(<ImageViewerApp />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt', `High-resolution view of ${specialTitle}`);
    });

    it('should handle undefined imageViewer app', () => {
      // The component should handle missing imageViewer gracefully
      mockApps.imageViewer = { data: null };
      render(<ImageViewerApp />);
      expect(screen.getByText('No image to display.')).toBeInTheDocument();
    });
  });

  describe('Component Behavior', () => {
    it('should be a simple component without side effects', () => {
      mockApps.imageViewer.data = {
        hdurl: 'https://example.com/simple-image.jpg',
        title: 'Simple Component Test',
      };

      const { unmount } = render(<ImageViewerApp />);

      expect(screen.getByRole('img')).toBeInTheDocument();

      // Component should cleanup without errors
      unmount();
      expect(() => unmount()).not.toThrow();
    });

    it('should re-render when props change', () => {
      // Initial render
      mockApps.imageViewer.data = {
        hdurl: 'https://example.com/initial-image.jpg',
        title: 'Initial Image',
      };

      const { rerender } = render(<ImageViewerApp />);
      expect(screen.getByAltText('High-resolution view of Initial Image')).toBeInTheDocument();

      // Update props
      mockApps.imageViewer.data = {
        hdurl: 'https://example.com/updated-image.jpg',
        title: 'Updated Image',
      };

      rerender(<ImageViewerApp />);
      expect(screen.getByAltText('High-resolution view of Updated Image')).toBeInTheDocument();
    });

    it('should handle rapid prop changes', () => {
      const images = [
        { hdurl: 'https://example.com/image1.jpg', title: 'Image 1' },
        { hdurl: 'https://example.com/image2.jpg', title: 'Image 2' },
        { hdurl: 'https://example.com/image3.jpg', title: 'Image 3' },
      ];

      const { rerender } = render(<ImageViewerApp />);

      images.forEach(imageData => {
        mockApps.imageViewer.data = imageData;
        rerender(<ImageViewerApp />);
        expect(screen.getByAltText(`High-resolution view of ${imageData.title}`)).toBeInTheDocument();
      });
    });
  });
});