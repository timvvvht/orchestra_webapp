import { describe, it, expect } from 'vitest';
import { isTauri } from '../runtime';

describe('isTauri', () => {
  it('returns false in jsdom', () => {
    expect(isTauri()).toBe(false);
  });
});