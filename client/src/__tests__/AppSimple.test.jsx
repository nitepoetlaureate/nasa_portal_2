import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect } from 'vitest';

// Simple test to verify JSX is working
describe('Basic JSX Test', () => {
  it('should render a simple div', () => {
    const TestComponent = () => <div data-testid="test-div">Hello World</div>;

    render(<TestComponent />);

    const div = screen.getByTestId('test-div');
    expect(div).toBeInTheDocument();
    expect(div).toHaveTextContent('Hello World');
  });
});