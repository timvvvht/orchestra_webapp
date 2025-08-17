import { describe, it, expect } from 'vitest';

describe('Polyfills - Integration Tests', () => {
  it('should have EventSource available globally', () => {
    expect(typeof EventSource).toBe('function');
    expect(EventSource).toBeDefined();
  });

  it('should be able to create an EventSource instance', () => {
    // This won't actually connect, but it should not throw an error
    expect(() => {
      const eventSource = new EventSource('http://example.com/events');
      eventSource.close(); // Close immediately to avoid connection
    }).not.toThrow();
  });

  it('should have localStorage available', () => {
    expect(typeof localStorage).toBe('object');
    expect(localStorage).toBeDefined();
    expect(typeof localStorage.getItem).toBe('function');
    expect(typeof localStorage.setItem).toBe('function');
  });
});