import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import MermaidExtension from '../components/Editor/extensions/MermaidExtension';

/**
 * Standalone test page for Tiptap Mermaid functionality
 * No authentication required - designed for E2E testing
 */
const TestMermaidPage: React.FC = () => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      MermaidExtension,
    ],
    content: `
      <h1>Mermaid Test Page</h1>
      <p>This page demonstrates Mermaid diagram rendering in Tiptap.</p>
      <div data-type="mermaid" class="mermaid">graph TD
A[Start] --> B{Decision}
B -->|Yes| C[Action 1]
B -->|No| D[Action 2]
C --> E[End]
D --> E</div>
      <p>The diagram above should render as an SVG.</p>
    `,
    editable: true,
  });

  return (
    <div className="test-mermaid-page" style={{ 
      padding: '20px', 
      maxWidth: '800px', 
      margin: '0 auto',
      minHeight: '100vh',
      backgroundColor: 'var(--color-background)',
      color: 'var(--color-text-primary)'
    }}>
      <h1>Mermaid Test Page</h1>
      <p>This page is designed for testing Mermaid diagram rendering with the new MermaidExtension.</p>
      
      <div className="tiptap-editor border border-gray-300 rounded p-4 min-h-96">
        <EditorContent editor={editor} />
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>Expected behavior:</p>
        <ul className="list-disc list-inside">
          <li>The Mermaid diagram should render as an SVG</li>
          <li>The diagram should be interactive and properly styled</li>
          <li>The editor should be editable</li>
        </ul>
      </div>
    </div>
  );
};

export default TestMermaidPage;