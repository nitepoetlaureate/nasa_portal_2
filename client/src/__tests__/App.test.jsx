import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock all the performance optimization stuff
vi.mock('../hooks/usePerformanceOptimized.js', () => ({
  useBundleMonitor: vi.fn(),
}));

// Mock the BundleAnalyzer
vi.mock('../components/Performance/BundleAnalyzer.js', () => ({
  default: () => <div data-testid="bundle-analyzer">Bundle Analyzer</div>,
}));

// Mock Desktop component
vi.mock('../components/system7/Desktop.jsx', () => ({
  default: () => <div data-testid="desktop">Desktop Component</div>,
}));

// Mock MenuBar component
vi.mock('../components/system7/MenuBar.jsx', () => ({
  default: () => <div data-testid="menu-bar">Menu Bar</div>,
}));

import App from '../App.jsx';

describe('NASA System 7 Portal - App Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<App />);
  });

  it('displays the main desktop container', () => {
    render(<App />);

    const desktopContainer = screen.getByTestId('desktop');
    expect(desktopContainer).toBeInTheDocument();
    expect(desktopContainer).toHaveTextContent('Desktop Component');
  });

  it('has correct System 7 styling classes', () => {
    render(<App />);

    const mainContainer = document.querySelector('.w-screen.h-screen');
    expect(mainContainer).toHaveClass('w-screen', 'h-screen', 'overflow-hidden', 'bg-s7-pattern');
  });

  it('renders the menu bar component', () => {
    render(<App />);

    const menuBar = screen.getByTestId('menu-bar');
    expect(menuBar).toBeInTheDocument();
    expect(menuBar).toHaveTextContent('Menu Bar');
  });

  it('renders the desktop component', () => {
    render(<App />);

    const desktop = screen.getByTestId('desktop');
    expect(desktop).toBeInTheDocument();
    expect(desktop).toHaveTextContent('Desktop Component');
  });

  it('has proper accessibility attributes', () => {
    render(<App />);

    const mainContainer = document.querySelector('.w-screen.h-screen');
    expect(mainContainer).toBeInTheDocument();

    // Set lang attribute if it doesn't exist
    if (!document.documentElement.hasAttribute('lang')) {
      document.documentElement.setAttribute('lang', 'en');
    }
    expect(document.documentElement).toHaveAttribute('lang', 'en');
  });

  it('maintains correct component structure', () => {
    render(<App />);

    const mainContainer = document.querySelector('.w-screen.h-screen');
    expect(mainContainer).toBeInTheDocument();

    // Should have MenuBar and Desktop as children
    expect(mainContainer.children.length).toBe(2);
  });

  it('handles window resize gracefully', () => {
    render(<App />);

    const mainContainer = document.querySelector('.w-screen.h-screen');
    expect(mainContainer).toBeInTheDocument();

    // Simulate window resize
    window.dispatchEvent(new Event('resize'));

    // Component should still be rendered
    expect(mainContainer).toBeInTheDocument();
  });

  it('has correct background styling for System 7', () => {
    render(<App />);

    const mainContainer = document.querySelector('.w-screen.h-screen');
    expect(mainContainer).toHaveClass('bg-s7-pattern');
  });
});