/**
 * Approval Configuration
 * 
 * Configuration for the tool approval system.
 * Defines which tools require approval and system settings.
 */

import { ApprovalConfig } from '@/services/approval/types';

export const APPROVAL_CONFIG: ApprovalConfig = {
  // Tools that require approval (exact names or regex patterns)
  required_approval_tools: [
    // File system operations
    'str_replace_editor',
    'mv',
    'cp',
    
    // Shell execution
    'execute_in_runner_session',
    
    // Potentially dangerous patterns (regex)
    '/.*delete.*/',
    '/.*remove.*/',
    '/.*rm.*/',
    '/.*kill.*/',
    '/.*stop.*/',
    
    // Network operations
    '/.*curl.*/',
    '/.*wget.*/',
    '/.*ssh.*/',
    
    // System operations
    '/.*sudo.*/',
    '/.*chmod.*/',
    '/.*chown.*/'
  ],
  
  // Default timeout for approvals (10 minutes)
  default_timeout_minutes: 10,
  
  // Auto-approve when approval service is down (for reliability)
  fallback_auto_approve: true,
  
  // Global approval toggle (start disabled for gradual rollout)
  approval_enabled: false
};

/**
 * Development configuration with approval enabled for testing
 */
export const DEV_APPROVAL_CONFIG: ApprovalConfig = {
  ...APPROVAL_CONFIG,
  approval_enabled: true,
  required_approval_tools: [
    // Start with safer tools for testing
    'str_replace_editor',
    'execute_in_runner_session'
  ],
  default_timeout_minutes: 5 // Shorter timeout for dev
};

/**
 * Production configuration with comprehensive approval requirements
 */
export const PROD_APPROVAL_CONFIG: ApprovalConfig = {
  ...APPROVAL_CONFIG,
  approval_enabled: true,
  fallback_auto_approve: false, // Stricter in production
  required_approval_tools: [
    ...APPROVAL_CONFIG.required_approval_tools,
    // Additional production-specific tools
    'cargo',
    'parallel_map',
    'spawn_agent_sync'
  ]
};

/**
 * Get approval configuration based on environment
 */
export function getApprovalConfig(): ApprovalConfig {
  const env = import.meta.env.MODE || 'development';
  
  switch (env) {
    case 'development':
      return DEV_APPROVAL_CONFIG;
    case 'production':
      return PROD_APPROVAL_CONFIG;
    default:
      return APPROVAL_CONFIG;
  }
}