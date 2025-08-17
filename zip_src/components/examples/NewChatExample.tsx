/**
 * Example component demonstrating usage of the newChatHandler
 * 
 * This component shows how to integrate the startNewChat function
 * with React components and state management.
 */

import React, { useState } from 'react';
import { startNewChat, getSessionWorkspacePath, sessionHasWorkspace } from '@/lib/chat/newChatHandler';
import type { StartNewChatOptions } from '@/lib/chat/newChatHandler';

interface NewChatExampleProps {
    onSessionCreated?: (sessionId: string, workspacePath: string) => void;
}

export const NewChatExample: React.FC<NewChatExampleProps> = ({ onSessionCreated }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [lastCreatedSession, setLastCreatedSession] = useState<{
        sessionId: string;
        workspacePath: string;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Form state for custom options
    const [agentConfigId, setAgentConfigId] = useState('General');
    const [sessionName, setSessionName] = useState('');
    const [customWorkspacePath, setCustomWorkspacePath] = useState('');

    const handleCreateNewChat = async () => {
        setIsCreating(true);
        setError(null);

        try {
            const options: StartNewChatOptions = {
                agentConfigId: agentConfigId || 'General',
                sessionName: sessionName || 'New Chat',
            };

            // Use custom workspace path if provided
            if (customWorkspacePath.trim()) {
                options.agentCwd = customWorkspacePath.trim();
            }

            console.log('[NewChatExample] Creating new chat with options:', options);

            const result = await startNewChat(options);

            console.log('[NewChatExample] New chat created:', result);

            setLastCreatedSession(result);
            onSessionCreated?.(result.sessionId, result.workspacePath);

            // Reset form
            setSessionName('');
            setCustomWorkspacePath('');

        } catch (err) {
            console.error('[NewChatExample] Failed to create new chat:', err);
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
        } finally {
            setIsCreating(false);
        }
    };

    const handleCheckWorkspace = () => {
        if (!lastCreatedSession) return;

        const workspacePath = getSessionWorkspacePath(lastCreatedSession.sessionId);
        const hasWorkspace = sessionHasWorkspace(lastCreatedSession.sessionId);

        console.log('[NewChatExample] Workspace check:', {
            sessionId: lastCreatedSession.sessionId,
            workspacePath,
            hasWorkspace
        });

        alert(`Session ${lastCreatedSession.sessionId}:\nWorkspace Path: ${workspacePath}\nHas Workspace: ${hasWorkspace}`);
    };

    return (
        <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">New Chat Handler Example</h2>

            <div className="space-y-4">
                {/* Agent Config Selection */}
                <div>
                    <label htmlFor="agentConfig" className="block text-sm font-medium text-gray-700 mb-1">
                        Agent Configuration
                    </label>
                    <select
                        id="agentConfig"
                        value={agentConfigId}
                        onChange={(e) => setAgentConfigId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isCreating}
                    >
                        <option value="General">General Assistant</option>
                        <option value="CodeAssistant">Code Assistant</option>
                        <option value="DataAnalyst">Data Analyst</option>
                        <option value="Writer">Writing Assistant</option>
                    </select>
                </div>

                {/* Session Name */}
                <div>
                    <label htmlFor="sessionName" className="block text-sm font-medium text-gray-700 mb-1">
                        Session Name (optional)
                    </label>
                    <input
                        id="sessionName"
                        type="text"
                        value={sessionName}
                        onChange={(e) => setSessionName(e.target.value)}
                        placeholder="Enter session name..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isCreating}
                    />
                </div>

                {/* Custom Workspace Path */}
                <div>
                    <label htmlFor="workspacePath" className="block text-sm font-medium text-gray-700 mb-1">
                        Custom Workspace Path (optional)
                    </label>
                    <input
                        id="workspacePath"
                        type="text"
                        value={customWorkspacePath}
                        onChange={(e) => setCustomWorkspacePath(e.target.value)}
                        placeholder="/path/to/existing/workspace"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isCreating}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Leave empty to create a new worktree automatically
                    </p>
                </div>

                {/* Create Button */}
                <button
                    onClick={handleCreateNewChat}
                    disabled={isCreating}
                    className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isCreating ? 'Creating Chat...' : 'Create New Chat'}
                </button>

                {/* Error Display */}
                {error && (
                    <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
                        <strong>Error:</strong> {error}
                    </div>
                )}

                {/* Success Display */}
                {lastCreatedSession && (
                    <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
                        <strong>Success!</strong>
                        <div className="mt-2 text-sm">
                            <div><strong>Session ID:</strong> {lastCreatedSession.sessionId}</div>
                            <div><strong>Workspace:</strong> {lastCreatedSession.workspacePath}</div>
                        </div>
                        <button
                            onClick={handleCheckWorkspace}
                            className="mt-2 text-sm bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                        >
                            Check Workspace Status
                        </button>
                    </div>
                )}
            </div>

            {/* Usage Instructions */}
            <div className="mt-6 p-3 bg-gray-100 rounded-md">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">How it works:</h3>
                <ol className="text-xs text-gray-600 space-y-1">
                    <li>1. Select an agent configuration</li>
                    <li>2. Optionally provide a session name</li>
                    <li>3. Optionally provide a custom workspace path</li>
                    <li>4. Click "Create New Chat" to start the process</li>
                    <li>5. The system will create a worktree (if needed) and chat session</li>
                    <li>6. Both sessionId and workspacePath will be returned</li>
                </ol>
            </div>
        </div>
    );
};

export default NewChatExample;