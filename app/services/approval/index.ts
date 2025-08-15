/**
 * Approval Service Module
 * 
 * Exports the main approval service components for tool execution approval.
 */

export { ApprovalService, getApprovalService } from './ApprovalService';
export { ApprovalAPI, getApprovalAPI } from './ApprovalAPI';
export * from './types';

// Default configuration for development
export const DEFAULT_APPROVAL_CONFIG = {
  required_approval_tools: [
    // Start with potentially dangerous tools
    'execute_in_runner_session',
    'str_replace_editor',
    '/.*delete.*/',
    '/.*remove.*/',
    '/.*rm.*/'
  ],
  default_timeout_minutes: 10,
  fallback_auto_approve: true,
  approval_enabled: false // Disabled by default for gradual rollout
};