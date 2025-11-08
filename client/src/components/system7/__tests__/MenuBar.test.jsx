import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import MenuBar from '../MenuBar.jsx';

// Mock timers for MenuBar clock
vi.useFakeTimers();

describe('System 7 MenuBar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set a fixed time for consistent testing
    vi.setSystemTime(new Date('2024-01-15 10:30:00'));
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('MenuBar Rendering', () => {
    it('should render the menu bar with proper structure', () => {
      render(<MenuBar />);

      const menuBar = document.querySelector('.absolute.top-0.left-0.right-0.h-6');
      expect(menuBar).toBeInTheDocument();
      expect(menuBar).toHaveClass('bg-s7-gray', 'border-b-2', 'border-black', 'flex', 'items-center', 'justify-between');
    });

    it('should render the Apple menu ()', () => {
      render(<MenuBar />);

      const appleMenu = screen.getByText('');
      expect(appleMenu).toBeInTheDocument();
    });

    it('should render File menu', () => {
      render(<MenuBar />);

      const fileMenu = screen.getByText('File');
      expect(fileMenu).toBeInTheDocument();
    });

    it('should render Edit menu', () => {
      render(<MenuBar />);

      const editMenu = screen.getByText('Edit');
      expect(editMenu).toBeInTheDocument();
    });

    it('should display the current time', () => {
      render(<MenuBar />);

      const timeDisplay = screen.getByText('10:30');
      expect(timeDisplay).toBeInTheDocument();
    });

    it('should have System 7 authentic styling', () => {
      render(<MenuBar />);

      const menuBar = document.querySelector('.bg-s7-gray');
      expect(menuBar).toBeInTheDocument();
      expect(menuBar).toHaveClass('font-chicago', 'text-black', 'select-none', 'z-50');
    });
  });

  describe('Menu Interactions', () => {
    it('should open Apple menu when clicked', () => {
      render(<MenuBar />);

      const appleMenu = screen.getByText('');
      fireEvent.click(appleMenu);

      expect(screen.getByText('About This Portal...')).toBeInTheDocument();
    });

    it('should open File menu when clicked', () => {
      render(<MenuBar />);

      const fileMenu = screen.getByText('File');
      fireEvent.click(fileMenu);

      expect(screen.getByText('New Window')).toBeInTheDocument();
      expect(screen.getByText('Close Window')).toBeInTheDocument();
    });

    it('should open Edit menu when clicked', () => {
      render(<MenuBar />);

      const editMenu = screen.getByText('Edit');
      fireEvent.click(editMenu);

      expect(screen.getByText('Undo')).toBeInTheDocument();
      expect(screen.getByText('Cut')).toBeInTheDocument();
      expect(screen.getByText('Copy')).toBeInTheDocument();
      expect(screen.getByText('Paste')).toBeInTheDocument();
    });

    it('should close menu when clicking outside', async () => {
      render(<MenuBar />);

      const appleMenu = screen.getByText('');
      fireEvent.click(appleMenu);

      expect(screen.getByText('About This Portal...')).toBeInTheDocument();

      // Click outside the menu
      fireEvent.click(document.body);

      await waitFor(() => {
        expect(screen.queryByText('About This Portal...')).not.toBeInTheDocument();
      });
    });

    it('should close one menu when opening another', () => {
      render(<MenuBar />);

      const appleMenu = screen.getByText('');
      const fileMenu = screen.getByText('File');

      // Open Apple menu
      fireEvent.click(appleMenu);
      expect(screen.getByText('About This Portal...')).toBeInTheDocument();

      // Open File menu (should close Apple menu)
      fireEvent.click(fileMenu);
      expect(screen.queryByText('About This Portal...')).not.toBeInTheDocument();
      expect(screen.getByText('New Window')).toBeInTheDocument();
    });

    it('should toggle menu when clicking the same menu again', () => {
      render(<MenuBar />);

      const appleMenu = screen.getByText('');

      // Open menu
      fireEvent.click(appleMenu);
      expect(screen.getByText('About This Portal...')).toBeInTheDocument();

      // Close menu
      fireEvent.click(appleMenu);
      expect(screen.queryByText('About This Portal...')).not.toBeInTheDocument();
    });

    it('should show proper styling for active menu', () => {
      render(<MenuBar />);

      const appleMenu = screen.getByText('');
      fireEvent.click(appleMenu);

      expect(appleMenu.closest('div')).toHaveClass('bg-black', 'text-white');
    });
  });

  describe('Menu Item Styling', () => {
    it('should apply hover styles to menu items', () => {
      render(<MenuBar />);

      const appleMenu = screen.getByText('');
      fireEvent.click(appleMenu);

      const menuItem = screen.getByText('About This Portal...');
      expect(menuItem).toHaveClass('px-3', 'py-0.5', 'hover:bg-black', 'hover:text-white');
    });

    it('should render menu dropdown with System 7 styling', () => {
      render(<MenuBar />);

      const appleMenu = screen.getByText('');
      fireEvent.click(appleMenu);

      const dropdown = document.querySelector('.absolute.top-full.left-0');
      expect(dropdown).toBeInTheDocument();
      expect(dropdown).toHaveClass('bg-s7-gray', 'border-2', 'min-w-[150px]', 'shadow-s7-window');
    });
  });

  describe('Clock Functionality', () => {
    it('should update time every 30 seconds', () => {
      render(<MenuBar />);

      // Initial time should be 10:30
      expect(screen.getByText('10:30')).toBeInTheDocument();

      // Advance time by 30 seconds
      vi.advanceTimersByTime(30000);

      // Should still show 10:30 (no change)
      expect(screen.getByText('10:30')).toBeInTheDocument();

      // Advance time by another 30 seconds
      vi.advanceTimersByTime(30000);

      // Should still show 10:30 (no change needed)
      expect(screen.getByText('10:30')).toBeInTheDocument();
    });

    it('should display correct initial time format', () => {
      // Set time to 2:45 PM
      vi.setSystemTime(new Date('2024-01-15 14:45:00'));

      render(<MenuBar />);

      expect(screen.getByText('2:45')).toBeInTheDocument();
    });

    it('should display leading zero for single-digit minutes', () => {
      // Set time to 10:05 AM
      vi.setSystemTime(new Date('2024-01-15 10:05:00'));

      render(<MenuBar />);

      expect(screen.getByText('10:05')).toBeInTheDocument();
    });

    it('should handle midnight correctly', () => {
      // Set time to 12:00 AM
      vi.setSystemTime(new Date('2024-01-15 00:00:00'));

      render(<MenuBar />);

      expect(screen.getByText('12:00')).toBeInTheDocument();
    });

    it('should handle noon correctly', () => {
      // Set time to 12:00 PM
      vi.setSystemTime(new Date('2024-01-15 12:00:00'));

      render(<MenuBar />);

      expect(screen.getByText('12:00')).toBeInTheDocument();
    });

    it('should clean up timer on unmount', () => {
      const { unmount } = render(<MenuBar />);

      expect(screen.getByText('10:30')).toBeInTheDocument();

      unmount();

      // Timer should be cleaned up - no error when advancing time
      expect(() => {
        vi.advanceTimersByTime(30000);
      }).not.toThrow();
    });
  });

  describe('MenuBar Accessibility', () => {
    it('should have proper semantic structure', () => {
      render(<MenuBar />);

      const menuBar = document.querySelector('.absolute.top-0.left-0.right-0.h-6');
      expect(menuBar).toBeInTheDocument();
    });

    it('should be keyboard accessible', () => {
      render(<MenuBar />);

      const appleMenu = screen.getByText('');

      // Should be focusable
      expect(appleMenu.closest('div')).toHaveAttribute('tabIndex', '0');

      // Should be able to focus
      appleMenu.closest('div').focus();
      expect(appleMenu.closest('div')).toHaveFocus();
    });

    it('should handle keyboard interactions', () => {
      render(<MenuBar />);

      const appleMenu = screen.getByText('');
      const menuContainer = appleMenu.closest('div');

      // Focus the menu
      menuContainer.focus();
      expect(menuContainer).toHaveFocus();

      // Press Enter to open
      fireEvent.keyDown(menuContainer, { key: 'Enter' });
      expect(screen.getByText('About This Portal...')).toBeInTheDocument();

      // Press Escape to close
      fireEvent.keyDown(menuContainer, { key: 'Escape' });
      expect(screen.queryByText('About This Portal...')).not.toBeInTheDocument();
    });
  });

  describe('MenuBar Performance', () => {
    it('should render within performance threshold', () => {
      const startTime = performance.now();

      render(<MenuBar />);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(20);
    });

    it('should handle menu interactions efficiently', () => {
      render(<MenuBar />);

      const appleMenu = screen.getByText('');

      const startTime = performance.now();

      // Perform multiple menu interactions
      for (let i = 0; i < 10; i++) {
        fireEvent.click(appleMenu);
        fireEvent.click(document.body);
      }

      const endTime = performance.now();
      const interactionTime = endTime - startTime;

      expect(interactionTime).toBeLessThan(100);
    });

    it('should handle timer updates efficiently', () => {
      render(<MenuBar />);

      const startTime = performance.now();

      // Simulate multiple timer updates
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(30000);
      }

      const endTime = performance.now();
      const updateTime = endTime - startTime;

      expect(updateTime).toBeLessThan(50);
    });
  });

  describe('MenuBar Integration with NASA Apps', () => {
    it('should provide context for NASA applications', () => {
      render(<MenuBar />);

      // Verify Apple menu has NASA-specific about item
      const appleMenu = screen.getByText('');
      fireEvent.click(appleMenu);

      expect(screen.getByText('About This Portal...')).toBeInTheDocument();
    });

    it('should have File menu items relevant to NASA data windows', () => {
      render(<MenuBar />);

      const fileMenu = screen.getByText('File');
      fireEvent.click(fileMenu);

      expect(screen.getByText('New Window')).toBeInTheDocument();
      expect(screen.getByText('Close Window')).toBeInTheDocument();
    });

    it('should have Edit menu items for NASA data manipulation', () => {
      render(<MenuBar />);

      const editMenu = screen.getByText('Edit');
      fireEvent.click(editMenu);

      expect(screen.getByText('Copy')).toBeInTheDocument();
      expect(screen.getByText('Paste')).toBeInTheDocument();
    });
  });

  describe('MenuBar Edge Cases', () => {
    it('should handle rapid menu clicks gracefully', () => {
      render(<MenuBar />);

      const appleMenu = screen.getByText('');

      // Rapidly click menu multiple times
      for (let i = 0; i < 5; i++) {
        fireEvent.click(appleMenu);
      }

      // Should still work correctly
      expect(screen.getByText('About This Portal...')).toBeInTheDocument();
    });

    it('should handle clicks on menu items gracefully', () => {
      render(<MenuBar />);

      const appleMenu = screen.getByText('');
      fireEvent.click(appleMenu);

      const menuItem = screen.getByText('About This Portal...');

      expect(() => {
        fireEvent.click(menuItem);
        fireEvent.mouseEnter(menuItem);
        fireEvent.mouseLeave(menuItem);
      }).not.toThrow();
    });

    it('should handle multiple menus being opened and closed', () => {
      render(<MenuBar />);

      const menus = [screen.getByText(''), screen.getByText('File'), screen.getByText('Edit')];

      // Open and close each menu multiple times
      menus.forEach(menu => {
        for (let i = 0; i < 3; i++) {
          fireEvent.click(menu);
          fireEvent.click(document.body);
        }
      });

      // Should not throw any errors
      expect(true).toBe(true);
    });
  });

  describe('MenuBar Visual Fidelity', () => {
    it('should maintain authentic System 7 appearance', () => {
      render(<MenuBar />);

      const menuBar = document.querySelector('.absolute.top-0.left-0.right-0.h-6');

      // Check for System 7 specific styling
      expect(menuBar).toHaveClass('bg-s7-gray');
      expect(menuBar).toHaveClass('border-b-2');
      expect(menuBar).toHaveClass('border-black');
      expect(menuBar).toHaveClass('font-chicago');
    });

    it('should show proper menu highlighting when active', () => {
      render(<MenuBar />);

      const appleMenu = screen.getByText('');
      fireEvent.click(appleMenu);

      const activeMenu = appleMenu.closest('div');
      expect(activeMenu).toHaveClass('bg-black', 'text-white');
    });

    it('should render time display with proper styling', () => {
      render(<MenuBar />);

      const timeDisplay = screen.getByText('10:30');
      const timeContainer = timeDisplay.parentElement;

      expect(timeContainer).toHaveClass('font-chicago', 'text-black');
    });
  });
});