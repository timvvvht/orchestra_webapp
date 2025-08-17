/**
 * Barrel export for Mission Control components.
 * Provides a clean interface for importing all mission control UI components.
 */

// Header components
export { default as MissionControlHeader } from './header/MissionControlHeader';

// Panel components
export { default as AgentListPanel } from './panels/AgentListPanel';
export { default as ChatPanel } from './panels/ChatPanel';

// Card components
export { default as AgentCard } from './cards/AgentCard';
export { default as DraftCard } from './cards/DraftCard';

// Section components (use the ones in sections/ subdirectory)
export { default as MCSection } from './sections/MCSection';
export { default as MCSectionHeader } from './sections/MCSectionHeader';

// Shared components
export { default as StatusDot } from './StatusDot';

// Re-export types for convenience
export type {
  Agent,
  Draft,
  ViewMode,
  AgentCardProps,
  DraftCardProps,
  StatusDotProps,
} from '../../../types/missionControl';