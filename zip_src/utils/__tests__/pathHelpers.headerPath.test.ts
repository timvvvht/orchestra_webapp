import { formatPathForHeader } from '@/utils/pathHelpers';

describe('formatPathForHeader', () => {
  it('should return empty string for empty input', () => {
    expect(formatPathForHeader('')).toBe('');
    expect(formatPathForHeader('' as any)).toBe('');
  });

  it('should collapse home directory to ~', () => {
    // Mock window.process.env.HOME
    const originalWindow = (global as any).window;
    (global as any).window = { process: { env: { HOME: '/Users/tim' } } };

    expect(formatPathForHeader('/Users/tim/Code/orchestra')).toBe('~/Code/orchestra');
    expect(formatPathForHeader('/Users/tim/.orchestra/worktrees/abc')).toBe('~/.orchestra/worktrees/abc');

    // Restore
    (global as any).window = originalWindow;
  });

  it('should collapse deep paths with ellipsis', () => {
    const deepPath = '/Users/tim/Code/orchestra/.orchestra/worktrees/session-123';
    const result = formatPathForHeader(deepPath);
    expect(result).toBe('~/Code/…/worktrees/session-123');
  });

  it('should leave short paths unchanged', () => {
    expect(formatPathForHeader('/tmp/project')).toBe('/tmp/project');
    expect(formatPathForHeader('/home/user')).toBe('/home/user');
  });

  it('should handle paths without home directory', () => {
    // Mock window.process.env.HOME to different value
    const originalWindow = (global as any).window;
    (global as any).window = { process: { env: { HOME: '/home/user' } } };

    expect(formatPathForHeader('/Users/tim/Code/orchestra')).toBe('/Users/tim/Code/orchestra');

    // Restore
    (global as any).window = originalWindow;
  });
});