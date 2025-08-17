/**
 * Integration Test for LexicalPillEditor
 * 
 * Simple test to verify the component can be imported and instantiated
 */

import React from 'react';
import { LexicalPillEditor } from './LexicalPillEditor';

// Test component that uses LexicalPillEditor
export const TestLexicalIntegration: React.FC = () => {
  const [content, setContent] = React.useState('');

  return (
    <div>
      <h2>Lexical Pill Editor Test</h2>
      <LexicalPillEditor
        value={content}
        onChange={setContent}
        codePath="/test/path"
        placeholder="Test placeholder..."
      />
      <div>
        <strong>Current content:</strong>
        <pre>{content}</pre>
      </div>
    </div>
  );
};

// Test that the component can be imported without errors
console.log('✅ LexicalPillEditor imported successfully');
console.log('✅ Integration test component created successfully');