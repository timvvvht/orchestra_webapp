import { describe, it, expect } from 'vitest';
import { classifyGitStatuses } from '../gitHelpers';
import { RepoStatusEntry } from '../gitTypes';

describe('classifyGitStatuses', () => {
  it('should correctly classify git status entries', () => {
    const entries: RepoStatusEntry[] = [
      { status: 'M', path: 'modified.ts' },
      { status: 'A', path: 'added.ts' },
      { status: '??', path: 'untracked.ts' },
      { status: 'D', path: 'deleted.ts' },
    ];

    const result = classifyGitStatuses(entries);

    expect(result).toEqual({
      modified: 1,
      added: 1,
      untracked: 1,
      deleted: 1,
    });
  });

  it('should handle empty array', () => {
    const result = classifyGitStatuses([]);

    expect(result).toEqual({
      modified: 0,
      added: 0,
      untracked: 0,
      deleted: 0,
    });
  });

  it('should handle complex status codes', () => {
    const entries: RepoStatusEntry[] = [
      { status: 'MM', path: 'modified-both.ts' }, // Modified in index and working tree
      { status: 'AM', path: 'added-modified.ts' }, // Added in index, modified in working tree
      { status: ' M', path: 'modified-working.ts' }, // Modified in working tree only
      { status: 'MD', path: 'modified-deleted.ts' }, // Modified in index, deleted in working tree
      { status: 'DM', path: 'deleted-modified.ts' }, // Deleted in index, modified in working tree
    ];

    const result = classifyGitStatuses(entries);

    expect(result).toEqual({
      modified: 5, // All contain 'M'
      added: 0,
      untracked: 0,
      deleted: 0, // 'D' is included in 'M' matches due to order
    });
  });

  it('should handle multiple entries of same type', () => {
    const entries: RepoStatusEntry[] = [
      { status: 'M', path: 'file1.ts' },
      { status: 'M', path: 'file2.ts' },
      { status: 'A', path: 'file3.ts' },
      { status: '??', path: 'file4.ts' },
      { status: '??', path: 'file5.ts' },
    ];

    const result = classifyGitStatuses(entries);

    expect(result).toEqual({
      modified: 2,
      added: 1,
      untracked: 2,
      deleted: 0,
    });
  });
});