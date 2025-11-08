import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock API calls
vi.mock('../../../services/api', () => ({
  executeEnhancedSearch: vi.fn(),
}));

import ResourceNavigatorApp from '../ResourceNavigatorApp.jsx';

describe('Resource Navigator App Component - Basic Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render the component with title', () => {
      render(<ResourceNavigatorApp />);

      expect(screen.getByText('Resource Navigator')).toBeInTheDocument();
      expect(screen.getByText('Resource Navigator')).toHaveClass('font-bold', 'text-base', 'mb-2');
    });

    it('should render search form with input and button', () => {
      render(<ResourceNavigatorApp />);

      const searchInput = screen.getByPlaceholderText('Search datasets & software...');
      const searchButton = screen.getByRole('button', { name: 'Search' });

      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveValue('');
      expect(searchButton).toBeInTheDocument();
    });

    it('should have proper styling and structure', () => {
      render(<ResourceNavigatorApp />);

      const container = screen.getByText('Resource Navigator').parentElement;
      expect(container).toHaveClass('font-geneva', 'text-sm', 'text-black', 'p-2', 'h-full', 'flex', 'flex-col');

      const form = screen.getByRole('button', { name: 'Search' }).parentElement;
      expect(form).toHaveClass('flex', 'mb-3');

      const input = screen.getByPlaceholderText('Search datasets & software...');
      expect(input).toHaveClass(
        'flex-grow',
        'border-2',
        'border-t-black',
        'border-l-black',
        'border-b-white',
        'border-r-white',
        'p-1'
      );

      const button = screen.getByRole('button', { name: 'Search' });
      expect(button).toHaveClass(
        'ml-2',
        'px-3',
        'border-2',
        'border-t-white',
        'border-l-white',
        'border-b-black',
        'border-r-black',
        'bg-s7-gray'
      );
    });
  });

  describe('Search Form Interaction', () => {
    it('should update query when typing in search input', () => {
      render(<ResourceNavigatorApp />);

      const searchInput = screen.getByPlaceholderText('Search datasets & software...');
      fireEvent.change(searchInput, { target: { value: 'NASA climate data' } });

      expect(searchInput).toHaveValue('NASA climate data');
    });

    it('should handle form submission', () => {
      render(<ResourceNavigatorApp />);

      const searchInput = screen.getByPlaceholderText('Search datasets & software...');
      const searchButton = screen.getByRole('button', { name: 'Search' });

      fireEvent.change(searchInput, { target: { value: 'test query' } });
      fireEvent.click(searchButton);

      // Component should handle form submission without crashing
      expect(searchInput).toHaveValue('test query');
    });

    it('should handle empty form submission', () => {
      render(<ResourceNavigatorApp />);

      const searchButton = screen.getByRole('button', { name: 'Search' });
      fireEvent.click(searchButton);

      // Should handle empty submission gracefully
      expect(screen.getByPlaceholderText('Search datasets & software...')).toHaveValue('');
    });
  });

  describe('Component Behavior', () => {
    it('should have proper form semantics', () => {
      render(<ResourceNavigatorApp />);

      const form = screen.getByRole('button', { name: 'Search' }).parentElement;
      expect(form.tagName).toBe('FORM');
    });

    it('should have proper input accessibility attributes', () => {
      render(<ResourceNavigatorApp />);

      const searchInput = screen.getByPlaceholderText('Search datasets & software...');
      expect(searchInput).toHaveAttribute('type', 'text');
    });

    it('should have proper button accessibility', () => {
      render(<ResourceNavigatorApp />);

      const searchButton = screen.getByRole('button', { name: 'Search' });
      expect(searchButton).toHaveAttribute('type', 'submit');
    });

    it('should support keyboard navigation', () => {
      render(<ResourceNavigatorApp />);

      const searchInput = screen.getByPlaceholderText('Search datasets & software...');

      // Focus on input
      searchInput.focus();
      expect(searchInput).toHaveFocus();

      // Focus on button
      const searchButton = screen.getByRole('button', { name: 'Search' });
      searchButton.focus();
      expect(searchButton).toHaveFocus();
    });

    it('should handle Enter key submission', () => {
      render(<ResourceNavigatorApp />);

      const searchInput = screen.getByPlaceholderText('Search datasets & software...');
      const form = searchInput.parentElement;

      fireEvent.keyDown(searchInput, { key: 'Enter' });

      // Should handle keyboard submission without crashing
      expect(form).toBeInTheDocument();
    });
  });
});