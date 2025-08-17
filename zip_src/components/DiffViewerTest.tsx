import React, { useState } from 'react';
import { DiffViewer } from './DiffViewer';

export const DiffViewerTest: React.FC = () => {
  const [showDiff, setShowDiff] = useState(false);

  const originalContent = `function hello() {
  console.log("Hello World");
  return "old version";
}

const data = {
  name: "John",
  age: 30
};`;

  const modifiedContent = `function hello() {
  console.log("Hello Universe!");
  console.log("This is a new line");
  return "new version";
}

const data = {
  name: "Jane",
  age: 25,
  city: "New York"
};`;

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Monaco Editor Diff Viewer Test</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test the Diff Viewer</h2>
          <p className="text-gray-600 mb-4">
            Click the button below to see a side-by-side diff comparison using Monaco Editor.
            This replaces the basic alert() dialog with a proper VS Code-style diff viewer.
          </p>
          
          <button
            onClick={() => setShowDiff(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            📄 Show Diff Viewer
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-3 text-red-600">Original Content</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
              <code>{originalContent}</code>
            </pre>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-3 text-green-600">Modified Content</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
              <code>{modifiedContent}</code>
            </pre>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-3">Features</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>Side-by-side diff comparison</li>
            <li>Syntax highlighting</li>
            <li>Line numbers</li>
            <li>Minimap for navigation</li>
            <li>Search functionality (Ctrl+F)</li>
            <li>Resizable panels</li>
            <li>Dark theme</li>
            <li>Added/removed/modified line indicators</li>
          </ul>
        </div>
      </div>

      {showDiff && (
        <DiffViewer
          originalContent={originalContent}
          modifiedContent={modifiedContent}
          originalTitle="Original File"
          modifiedTitle="Modified File"
          language="javascript"
          onClose={() => setShowDiff(false)}
        />
      )}
    </div>
  );
};