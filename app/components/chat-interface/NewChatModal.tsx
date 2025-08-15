/**
 * NewChatModal Component - Webapp Stub Implementation
 * 
 * Simplified stub version of the new chat modal for webapp migration.
 * Provides the basic interface without complex functionality.
 * 
 * TODO: Implement full new chat modal functionality when needed
 */

import React from 'react';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChat?: (config: any) => void;
}

const NewChatModal: React.FC<NewChatModalProps> = ({ 
  isOpen, 
  onClose, 
  onCreateChat 
}) => {
  if (!isOpen) return null;

  const handleCreateChat = () => {
    console.log('🆕 [NewChatModal] STUB: Would create new chat');
    if (onCreateChat) {
      onCreateChat({ agentId: 'default', sessionName: 'New Chat' });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">New Chat</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="text-center py-4">
            <p className="text-gray-500 italic mb-4">
              New chat creation is not yet implemented in webapp mode.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This would normally allow you to:
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside mt-2">
              <li>Select an agent configuration</li>
              <li>Set initial parameters</li>
              <li>Choose tools and capabilities</li>
            </ul>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateChat}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Create (Stub)
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewChatModal;