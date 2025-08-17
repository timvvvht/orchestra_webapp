import React, { useState } from 'react';
import { registerToolsByNames, getAllToolNames, getToolSpec } from '@/utils/toolSpecRegistry';
import { prettyPrintJson } from '@/utils/prettyPrintJson';
import { toast } from 'sonner';

/**
 * Tool Schema Test Component
 * 
 * Allows users to browse and copy JSON schemas for all registered tools,
 * while preserving the original tool registration demo functionality.
 */
const ToolSchemaTest: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState('test-session-id');
  
  // Tool browsing state
  const toolNames = getAllToolNames();
  const [selectedTool, setSelectedTool] = useState<string | null>(toolNames[0] || null);
  const selectedSpec = selectedTool ? getToolSpec(selectedTool) : null;

  const handleRegisterTools = async () => {
    setIsRegistering(true);
    setRegistrationResult(null);
    
    try {
      // Register a predefined list of tools including search_notes
      const toolNames = ['search_notes', 'apply_patch', 'cat', 'tree'];
      
      await registerToolsByNames(sessionId, toolNames);
      
      setRegistrationResult(`Successfully registered tools: ${toolNames.join(', ')}`);
      toast.success('Tools registered successfully');
    } catch (error) {
      console.error('Error registering tools:', error);
      setRegistrationResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error('Failed to register tools');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleCopySchema = async () => {
    if (!selectedSpec) return;
    
    try {
      await navigator.clipboard.writeText(prettyPrintJson(selectedSpec));
      toast.success('Schema copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy schema');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Tool Schema Browser</h1>
      
      {/* Tool Selection Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Select a Tool</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {toolNames.map((toolName) => (
            <button
              key={toolName}
              data-testid={`tool-btn-${toolName}`}
              onClick={() => setSelectedTool(toolName)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                selectedTool === toolName
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              {toolName}
            </button>
          ))}
        </div>
        
        {toolNames.length === 0 && (
          <p className="text-gray-500 italic">No tools found in registry.</p>
        )}
      </div>
      
      {/* Schema Viewer Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {selectedTool ? `Schema: ${selectedTool}` : 'Tool Schema'}
          </h2>
          {selectedSpec && (
            <button
              onClick={handleCopySchema}
              className="px-3 py-1.5 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Copy Schema
            </button>
          )}
        </div>
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <pre 
            data-testid="schema-viewer"
            className="text-sm text-gray-800 whitespace-pre-wrap overflow-x-auto"
          >
            {selectedSpec 
              ? prettyPrintJson(selectedSpec)
              : 'Select a tool to view its JSON schema'
            }
          </pre>
        </div>
      </div>
      
      {/* Legacy Registration Section */}
      <details className="mb-8">
        <summary className="cursor-pointer text-lg font-semibold mb-4 hover:text-blue-600 transition-colors">
          Register tools (legacy demo)
        </summary>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Session ID
            </label>
        <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter session ID"
            />
          </div>
          
          <button
            onClick={handleRegisterTools}
            disabled={isRegistering}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRegistering ? 'Registering...' : 'Register Tools'}
          </button>
          
          {registrationResult && (
            <div className={`mt-4 p-4 rounded-md ${registrationResult.startsWith('Error') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
              <p className="font-medium">Result:</p>
              <p>{registrationResult}</p>
            </div>
          )}
          
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">How it works</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>This component tests the <code className="bg-gray-100 px-1 rounded">registerToolsByNames</code> function</li>
              <li>Click the button to register a predefined list of tools including <code className="bg-gray-100 px-1 rounded">search_notes</code></li>
              <li>The registration happens for the specified session ID</li>
              <li>Results are displayed below the button</li>
            </ul>
          </div>
        </div>
      </details>
    </div>
  );
};

export default ToolSchemaTest;