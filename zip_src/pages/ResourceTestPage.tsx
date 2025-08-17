import React from 'react';
import TauriResourceTest from '@/components/TauriResourceTest';

const ResourceTestPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-black dark:text-white">Tauri Resource Test Page</h1>
        <p className="mb-8 text-gray-700 dark:text-gray-300">
          This page tests the loading of resources from the Tauri bundle. It checks if resources exist
          and attempts to load and display them.
        </p>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <TauriResourceTest />
        </div>
      </div>
    </div>
  );
};

export default ResourceTestPage;