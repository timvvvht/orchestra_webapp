import React from 'react';
import { render, screen } from '@testing-library/react';
import MonacoDiffPane from '../MonacoDiffPane';

describe('MonacoDiffPane', () => {
  it('renders side-by-side diff editor', () => {
    render(
      <MonacoDiffPane
        original="const x = 1;"
        modified="const x = 2;"
        language="typescript"
        onChange={() => {}}
      />
    );

    // Monaco editor containers should be present
    const editors = document.querySelectorAll('.monaco-editor');
    expect(editors.length).toBe(2);
  });

  it('renders with custom dimensions', () => {
    render(
      <MonacoDiffPane
        original="line1"
        modified="line2"
        language="plaintext"
        height="500px"
        width="80%"
        onChange={() => {}}
      />
    );

    const container = document.querySelector('.monaco-diff-editor');
    expect(container).toBeInTheDocument();
  });
});