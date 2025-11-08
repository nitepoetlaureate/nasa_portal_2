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

describe('NASA System 7 Portal - App Component (Minimal)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<App />);
  });

  it('renders Desktop and MenuBar components', () => {
    render(<App />);

    // Check if mocked components are rendered
    expect(screen.getByTestId('menu-bar')).toBeInTheDocument();
    expect(screen.getByTestId('desktop')).toBeInTheDocument();
  });
});