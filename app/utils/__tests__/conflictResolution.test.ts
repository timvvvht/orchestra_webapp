/**
 * Tests for conflict resolution utilities
 */

import { describe, it, expect } from 'vitest';
import { stripGitConflictMarkers, stripGitConflictMarkersKeepTheirs } from '../conflictResolution';

describe('Conflict Resolution Utilities', () => {
  describe('stripGitConflictMarkers', () => {
    it('should remove conflict markers and keep HEAD side by default', () => {
      const content = `<<<<<<< HEAD
This is the HEAD version
=======
This is the incoming version
>>>>>>> branch-name`;

      const result = stripGitConflictMarkers(content);

      expect(result.cleaned).toBe('This is the HEAD version');
      expect(result.hadMarkers).toBe(true);
    });

    it('should handle content without conflict markers', () => {
      const content = `This is normal content
No conflicts here
Just regular code`;

      const result = stripGitConflictMarkers(content);

      expect(result.cleaned).toBe(content);
      expect(result.hadMarkers).toBe(false);
    });

    it('should handle multiple conflict blocks', () => {
      const content = `<<<<<<< HEAD
First HEAD content
=======
First incoming content
>>>>>>> branch1

Some normal content in between

<<<<<<< HEAD
Second HEAD content
=======
Second incoming content
>>>>>>> branch2`;

      const result = stripGitConflictMarkers(content);

      expect(result.cleaned).toBe(`First HEAD content

Some normal content in between

Second HEAD content`);
      expect(result.hadMarkers).toBe(true);
    });

    it('should handle incomplete conflict blocks', () => {
      const content = `<<<<<<< HEAD
This is incomplete
=======
Incoming content`;

      const result = stripGitConflictMarkers(content);

      // Should include remaining lines after the start marker
      expect(result.cleaned).toBe('This is incomplete\nIncoming content');
      expect(result.hadMarkers).toBe(true);
    });

    it('should preserve content outside conflict blocks', () => {
      const content = `Before conflict
<<<<<<< HEAD
Head content
=======
Incoming content
>>>>>>> branch
After conflict`;

      const result = stripGitConflictMarkers(content);

      expect(result.cleaned).toBe(`Before conflict
Head content
After conflict`);
      expect(result.hadMarkers).toBe(true);
    });

    it('should handle empty conflict blocks', () => {
      const content = `<<<<<<< HEAD
=======
>>>>>>> branch`;

      const result = stripGitConflictMarkers(content);

      expect(result.cleaned).toBe('');
      expect(result.hadMarkers).toBe(true);
    });
  });

  describe('stripGitConflictMarkersKeepTheirs', () => {
    it('should remove conflict markers and keep incoming side', () => {
      const content = `<<<<<<< HEAD
This is the HEAD version
=======
This is the incoming version
>>>>>>> branch-name`;

      const result = stripGitConflictMarkersKeepTheirs(content);

      expect(result.cleaned).toBe('This is the incoming version');
      expect(result.hadMarkers).toBe(true);
    });

    it('should handle multiple conflict blocks keeping incoming side', () => {
      const content = `<<<<<<< HEAD
First HEAD content
=======
First incoming content
>>>>>>> branch1

Some normal content in between

<<<<<<< HEAD
Second HEAD content
=======
Second incoming content
>>>>>>> branch2`;

      const result = stripGitConflictMarkersKeepTheirs(content);

      expect(result.cleaned).toBe(`First incoming content

Some normal content in between

Second incoming content`);
      expect(result.hadMarkers).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const result = stripGitConflictMarkers('');
      expect(result.cleaned).toBe('');
      expect(result.hadMarkers).toBe(false);
    });

    it('should handle only conflict markers', () => {
      const content = `<<<<<<< HEAD
=======
>>>>>>> branch`;

      const result = stripGitConflictMarkers(content);

      expect(result.cleaned).toBe('');
      expect(result.hadMarkers).toBe(true);
    });

    it('should handle conflict markers with different spacing', () => {
      const content = `<<<<<<< HEAD
Content
=======
Incoming
>>>>>>> some-branch-name`;

      const result = stripGitConflictMarkers(content);

      expect(result.cleaned).toBe('Content');
      expect(result.hadMarkers).toBe(true);
    });
  });
});