/**
 * AgentProfile Component - Webapp Stub Implementation
 * 
 * Simplified stub version of the agent profile dialog for webapp migration.
 * Provides the basic interface without complex functionality.
 * 
 * TODO: Implement full agent profile functionality when needed
 */

import React from 'react';

interface AgentProfileProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
}

const AgentProfile: React.FC<AgentProfileProps> = ({ isOpen, onClose, agentId }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Agent Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Agent ID:</p>
            <p className="font-mono text-sm">{agentId}</p>
          </div>
          
          <div className="text-center py-4">
            <p className="text-gray-500 italic">
              Agent profile functionality is not yet implemented in webapp mode.
            </p>
          </div>
        </div>
        
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentProfile;