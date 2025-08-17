import React from 'react';
import { render } from '@testing-library/react';
import { AdvancedMonacoDiffViewer } from '../AdvancedMonacoDiffViewer';

describe('AdvancedMonacoDiffViewer', () => {
  it('renders MonacoDiffPane in diff mode', () => {
    const mockFiles = [
      {
        id: 'test-1',
        filename: 'test.ts',
        filepath: '/test/test.ts',
        originalContent: 'const x = 1;',
        modifiedContent: 'const x = 2;',
        currentContent: 'const x = 2;',
        language: 'typescript',
        hasUnsavedChanges: false,
      },
    ];

    render(
      <AdvancedMonacoDiffViewer
        files={mockFiles}
        onClose={() => {}}
      />
    );

    // Should render MonacoDiffPane which creates .monaco-editor elements
    const editors = document.querySelectorAll('.monaco-editor');
    expect(editors.length).toBeGreaterThan(0);
  });
});