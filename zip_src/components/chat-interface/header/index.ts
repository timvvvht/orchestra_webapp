// Main ChatHeader component
export { default as ChatHeader } from './ChatHeader';

// Subcomponents
export { default as AgentSelector } from './AgentSelector';
export { default as ModelSelector } from './ModelSelector';
export { default as SessionMetadata } from './SessionMetadata';
export { default as CapabilitiesDisplay } from './CapabilitiesDisplay';
export { default as HeaderActions } from './HeaderActions';
export { default as DebugPanel } from './DebugPanel';

// Re-export for backward compatibility
export { ChatHeader as default } from './ChatHeader';