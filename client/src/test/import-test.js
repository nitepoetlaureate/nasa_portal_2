// Test basic App import
import { describe, it, expect } from 'vitest';

describe('Import test', () => {
  it('should be able to import React', async () => {
    const React = await import('react');
    expect(React).toBeDefined();
  });
});