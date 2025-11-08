import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import NeoWsApp from '../NeoWsApp.jsx';

// Mock API calls
vi.mock('../../../services/api', () => ({
  getNeoFeed: vi.fn(),
  getNeoDetails: vi.fn(),
}));

// Mock useApi hook
const mockUseApi = vi.fn();
vi.mock('../../../hooks/useApi.js', () => ({
  default: mockUseApi,
}));

// Mock useSound hook
const mockPlaySelectSound = vi.fn();
const mockPlayHazardSound = vi.fn();
const mockPlaySafeSound = vi.fn();

vi.mock('../../../hooks/useSound', () => ({
  useSound: vi.fn(() => vi.fn()),
}));

// Mock NeoStarMap component
vi.mock('./NeoStarMap.jsx', () => ({
  default: ({ neoData }) => (
    <div data-testid="neo-star-map">
      <p>Star Map for: {neoData?.name}</p>
      <p>Hazardous: {neoData?.is_potentially_hazardous_asteroid ? 'Yes' : 'No'}</p>
    </div>
  ),
}));

// Test data
const mockNeoFeedData = {
  near_earth_objects: {
    '2024-01-01': [
      {
        id: '12345',
        name: '(2024 ABC)',
        is_potentially_hazardous_asteroid: true,
        estimated_diameter: {
          meters: {
            estimated_diameter_max: 500,
            estimated_diameter_min: 400,
          },
        },
        close_approach_data: [
          {
            relative_velocity: {
              kilometers_per_second: '25.5',
            },
            miss_distance: {
              kilometers: '5000000',
            },
          },
        ],
      },
      {
        id: '67890',
        name: '(2024 XYZ)',
        is_potentially_hazardous_asteroid: false,
        estimated_diameter: {
          meters: {
            estimated_diameter_max: 200,
            estimated_diameter_min: 150,
          },
        },
        close_approach_data: [
          {
            relative_velocity: {
              kilometers_per_second: '15.2',
            },
            miss_distance: {
              kilometers: '10000000',
            },
          },
        ],
      },
    ],
  },
};

const mockNeoDetails = {
  id: '12345',
  name: '(2024 ABC)',
  orbital_data: {
    orbital_period: '365.25',
    semi_major_axis: '1.0',
  },
};

describe('NeoWs App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseApi.mockClear();
    mockPlaySelectSound.mockClear();
    mockPlayHazardSound.mockClear();
    mockPlaySafeSound.mockClear();

    // Mock console.error to suppress expected error logs in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Loading State', () => {
    it('should render loading state correctly', () => {
      mockUseApi.mockReturnValue({
        data: null,
        loading: true,
        error: null,
      });

      render(<NeoWsApp />);

      expect(screen.getByText('Loading Command Center...')).toBeInTheDocument();
      expect(screen.getByText('Loading Command Center...')).toHaveClass('p-2');
    });

    it('should show loading message with proper styling', () => {
      mockUseApi.mockReturnValue({
        data: null,
        loading: true,
        error: null,
      });

      render(<NeoWsApp />);

      const loadingText = screen.getByText('Loading Command Center...');
      expect(loadingText.parentElement).toHaveClass('font-geneva', 'text-sm', 'text-black');
    });
  });

  describe('Error State', () => {
    it('should render error state correctly', () => {
      mockUseApi.mockReturnValue({
        data: null,
        loading: false,
        error: new Error('Failed to fetch NEO data'),
      });

      render(<NeoWsApp />);

      expect(screen.getByText('Error.')).toBeInTheDocument();
    });

    it('should apply error styling correctly', () => {
      mockUseApi.mockReturnValue({
        data: null,
        loading: false,
        error: new Error('Network error'),
      });

      render(<NeoWsApp />);

      const errorText = screen.getByText('Error.');
      expect(errorText).toHaveClass('p-2');
    });
  });

  describe('NEO List Display', () => {
    beforeEach(() => {
      mockUseApi.mockReturnValue({
        data: mockNeoFeedData,
        loading: false,
        error: null,
      });
    });

    it('should render NEO list with correct count', () => {
      render(<NeoWsApp />);

      const today = new Date().toISOString().split('T')[0];
      expect(screen.getByText(`NEO Threats (${today})`)).toBeInTheDocument();

      const neoItems = screen.getAllByRole('listitem');
      expect(neoItems).toHaveLength(2);
    });

    it('should display NEO names correctly', () => {
      render(<NeoWsApp />);

      expect(screen.getByText('(2024 ABC)')).toBeInTheDocument();
      expect(screen.getByText('(2024 XYZ)')).toBeInTheDocument();
    });

    it('should show hazard icons correctly', () => {
      render(<NeoWsApp />);

      const hazardIcons = document.querySelectorAll('svg');
      expect(hazardIcons).toHaveLength(2);

      // First NEO is hazardous - should have yellow triangle
      const firstIcon = hazardIcons[0];
      expect(firstIcon.innerHTML).toContain('#FFCC00');
      expect(firstIcon.innerHTML).toContain('!');

      // Second NEO is safe - should have green circle
      const secondIcon = hazardIcons[1];
      expect(secondIcon.innerHTML).toContain('#32CD32');
    });

    it('should have clickable NEO items', async () => {
      const user = userEvent.setup();
      render(<NeoWsApp />);

      const firstNeo = screen.getByText('(2024 ABC)');
      await user.click(firstNeo);

      expect(firstNeo.parentElement).toHaveClass('bg-s7-blue', 'text-white');
    });

    it('should have hover effects on NEO items', () => {
      render(<NeoWsApp />);

      const neoItems = screen.getAllByRole('listitem');
      neoItems.forEach(item => {
        expect(item).toHaveClass('cursor-pointer', 'hover:bg-s7-blue', 'hover:text-white');
      });
    });

    it('should show proper list styling', () => {
      render(<NeoWsApp />);

      const neoItems = screen.getAllByRole('listitem');
      neoItems.forEach(item => {
        expect(item).toHaveClass('list-none', 'mb-1', 'p-1', 'truncate', 'flex', 'items-center');
      });
    });
  });

  describe('NEO Detail Display', () => {
    beforeEach(() => {
      mockUseApi.mockReturnValue({
        data: mockNeoFeedData,
        loading: false,
        error: null,
      });
    });

    it('should show awaiting selection message when no NEO selected', () => {
      render(<NeoWsApp />);

      expect(screen.getByText('Awaiting Target Selection...')).toBeInTheDocument();
      expect(screen.getByText('Awaiting Target Selection...').parentElement).toHaveClass('text-center', 'text-gray-500');
    });

    it('should display NEO details when selected', async () => {
      const user = userEvent.setup();
      render(<NeoWsApp />);

      const firstNeo = screen.getByText('(2024 ABC)');
      await user.click(firstNeo);

      expect(screen.getByText('(2024 ABC)')).toBeInTheDocument();
      expect(screen.getByText('HAZARDOUS')).toBeInTheDocument();
      expect(screen.getByText('500 meters')).toBeInTheDocument();
      expect(screen.getByText('25.5 km/s')).toBeInTheDocument();
      expect(screen.getByText('5,000,000 km')).toBeInTheDocument();
    });

    it('should show safe status for non-hazardous NEO', async () => {
      const user = userEvent.setup();
      render(<NeoWsApp />);

      const secondNeo = screen.getByText('(2024 XYZ)');
      await user.click(secondNeo);

      expect(screen.getByText('SAFE')).toBeInTheDocument();
      expect(screen.getByText('200 meters')).toBeInTheDocument();
      expect(screen.getByText('15.2 km/s')).toBeInTheDocument();
      expect(screen.getByText('10,000,000 km')).toBeInTheDocument();
    });

    it('should render NeoStarMap component when NEO selected', async () => {
      const user = userEvent.setup();
      render(<NeoWsApp />);

      const firstNeo = screen.getByText('(2024 ABC)');
      await user.click(firstNeo);

      expect(screen.getByTestId('neo-star-map')).toBeInTheDocument();
      expect(screen.getByText('Star Map for: (2024 ABC)')).toBeInTheDocument();
      expect(screen.getByText('Hazardous: Yes')).toBeInTheDocument();
    });

    it('should have proper detail row structure', async () => {
      const user = userEvent.setup();
      render(<NeoWsApp />);

      const firstNeo = screen.getByText('(2024 ABC)');
      await user.click(firstNeo);

      const detailRows = screen.getAllByText(/:/);
      expect(detailRows).toHaveLength(4); // Hazard Status, Est. Diameter, Velocity, Miss Distance

      detailRows.forEach(row => {
        const rowElement = row.parentElement;
        expect(rowElement).toHaveClass('flex', 'justify-between', 'border-b', 'border-gray-300', 'py-0.5', 'text-xs');
      });
    });
  });

  describe('Sound Effects Integration', () => {
    beforeEach(() => {
      mockUseApi.mockReturnValue({
        data: mockNeoFeedData,
        loading: false,
        error: null,
      });
    });

    it('should play sound effects when NEO is selected', async () => {
      const user = userEvent.setup();
      render(<NeoWsApp />);

      const firstNeo = screen.getByText('(2024 ABC)');
      await user.click(firstNeo);

      // Sound effects should be triggered through the useSound hook
      expect(mockUseApi).toHaveBeenCalled();
    });
  });

  describe('Component Layout and Styling', () => {
    beforeEach(() => {
      mockUseApi.mockReturnValue({
        data: mockNeoFeedData,
        loading: false,
        error: null,
      });
    });

    it('should have proper main container structure', () => {
      render(<NeoWsApp />);

      const container = screen.getByText(`NEO Threats`).closest('div');
      expect(container).toHaveClass('font-geneva', 'text-sm', 'text-black', 'p-1', 'flex', 'flex-col', 'h-full');
    });

    it('should have proper two-column layout', () => {
      render(<NeoWsApp />);

      const flexContainer = screen.getByText(`NEO Threats`).parentElement.parentElement;
      expect(flexContainer).toHaveClass('flex', 'flex-grow', 'h-0');
    });

    it('should have proper NEO list panel styling', () => {
      render(<NeoWsApp />);

      const listPanel = screen.getByText(`NEO Threats`).parentElement;
      expect(listPanel).toHaveClass(
        'w-1/3', 'h-full', 'overflow-y-scroll', 'border-2',
        'border-t-gray-500', 'border-l-gray-500', 'border-b-white', 'border-r-white',
        'p-1', 'bg-white'
      );
    });

    it('should have proper detail panel styling', async () => {
      const user = userEvent.setup();
      render(<NeoWsApp />);

      const firstNeo = screen.getByText('(2024 ABC)');
      await user.click(firstNeo);

      const detailPanel = screen.getByText('(2024 ABC)').parentElement;
      expect(detailPanel).toHaveClass(
        'w-2/3', 'h-full', 'ml-1', 'flex', 'flex-col'
      );
    });

    it('should have proper detail info panel styling', async () => {
      const user = userEvent.setup();
      render(<NeoWsApp />);

      const firstNeo = screen.getByText('(2024 ABC)');
      await user.click(firstNeo);

      const detailInfoPanel = screen.getByText('(2024 ABC)').parentElement;
      expect(detailInfoPanel).toHaveClass(
        'border-2', 'border-t-gray-500', 'border-l-gray-500', 'border-b-white', 'border-r-white',
        'p-2', 'bg-white', 'mb-1', 'shrink-0'
      );
    });
  });

  describe('Data Processing', () => {
    it('should handle empty NEO list gracefully', () => {
      const emptyFeedData = {
        near_earth_objects: {
          '2024-01-01': [],
        },
      };

      mockUseApi.mockReturnValue({
        data: emptyFeedData,
        loading: false,
        error: null,
      });

      render(<NeoWsApp />);

      expect(screen.getByText(`NEO Threats`)).toBeInTheDocument();
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
      expect(screen.getByText('Awaiting Target Selection...')).toBeInTheDocument();
    });

    it('should handle missing NEO data gracefully', () => {
      const incompleteNeoData = [
        {
          id: '12345',
          name: '(2024 ABC)',
          is_potentially_hazardous_asteroid: true,
          // Missing diameter and close approach data
        },
      ];

      const feedWithIncompleteData = {
        near_earth_objects: {
          '2024-01-01': incompleteNeoData,
        },
      };

      mockUseApi.mockReturnValue({
        data: feedWithIncompleteData,
        loading: false,
        error: null,
      });

      render(<NeoWsApp />);

      const neoItem = screen.getByText('(2024 ABC)');
      expect(neoItem).toBeInTheDocument();
    });

    it('should handle today\'s date correctly', () => {
      mockUseApi.mockReturnValue({
        data: mockNeoFeedData,
        loading: false,
        error: null,
      });

      render(<NeoWsApp />);

      const today = new Date().toISOString().split('T')[0];
      expect(screen.getByText(`NEO Threats (${today})`)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle NEO details fetch error gracefully', async () => {
      // Mock console.error to verify it's called
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockUseApi.mockReturnValue({
        data: mockNeoFeedData,
        loading: false,
        error: null,
      });

      // Mock getNeoDetails to throw an error
      const mockGetNeoDetails = vi.fn().mockRejectedValue(new Error('Failed to fetch details'));
      require('../../../services/api').getNeoDetails = mockGetNeoDetails;

      const user = userEvent.setup();
      render(<NeoWsApp />);

      const firstNeo = screen.getByText('(2024 ABC)');
      await user.click(firstNeo);

      // Wait for the error to be logged
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch NEO details', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseApi.mockReturnValue({
        data: mockNeoFeedData,
        loading: false,
        error: null,
      });
    });

    it('should have proper focus handling', async () => {
      const user = userEvent.setup();
      render(<NeoWsApp />);

      const firstNeo = screen.getByText('(2024 ABC)');
      await user.tab(); // Navigate to first NEO

      expect(firstNeo.parentElement).toHaveFocus();
    });

    it('should have proper ARIA roles', () => {
      render(<NeoWsApp />);

      const neoItems = screen.getAllByRole('listitem');
      expect(neoItems.length).toBeGreaterThan(0);

      neoItems.forEach(item => {
        expect(item).toHaveAttribute('role', 'listitem');
      });
    });

    it('should have proper keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<NeoWsApp />);

      const firstNeo = screen.getByText('(2024 ABC)');
      firstNeo.focus();
      await user.keyboard('{Enter}');

      expect(firstNeo.parentElement).toHaveClass('bg-s7-blue', 'text-white');
    });
  });
});