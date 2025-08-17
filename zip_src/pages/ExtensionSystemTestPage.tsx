/**
 * Test page for the extension system
 * 
 * This page demonstrates how to use the extension system
 * with a simple editor instance.
 */

import React from 'react';
// import ExtensionSystemTest from '../components/Editor/CleanCodeMirrorEditor/tests/ExtensionSystemTest'; // Removed - migrated to Tiptap
import TiptapEditor from '../components/Editor/TiptapEditor';

/**
 * Test page for the extension system
 */
const ExtensionSystemTestPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Extension System Test Page</h1>
      <p className="mb-4">
        This page demonstrates the new extension system for the CodeMirror editor.
        It shows how extensions can be registered and used to provide formatting
        and other features to the editor.
      </p>
      <div className="border border-gray-300 rounded-md p-4 bg-white dark:bg-gray-800">
        <TiptapEditor
          content="# Extension System Test\n\nThis page now uses the new Tiptap editor with all extensions enabled."
          onChange={() => {}}
          onSave={() => Promise.resolve(true)}
          filePath={null}
          isLoading={false}
        />
      </div>
    </div>
  );
};

export default ExtensionSystemTestPage;