import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import MermaidExtension from '../components/Editor/extensions/MermaidExtension';

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
A-->B
B-->C</div>
      <p>The diagram above should render as an SVG.</p>
    `,
    editable: true,
  });

  return (
    <div className="test-mermaid-page">
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Mermaid Test Page</h1>
        <p className="mb-4">
          This page tests the Mermaid extension integration with Tiptap editor.
        </p>
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
    </div>
  );
};

export default TestMermaidPage;