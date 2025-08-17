/**
 * Mission Control Status Constants
 * Simplified 3-state model for better UX
 */

export const MC_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active', 
  IDLE: 'idle'
} as const;

export type MCStatus = typeof MC_STATUS[keyof typeof MC_STATUS];

/**
 * Maps legacy/complex statuses to simplified 3-state model
 */
export const mapToMCStatus = (status: string, messageRole?: string): MCStatus => {
  // Handle drafts (these come from useDraftStore, not agents)
  if (status === 'draft') return MC_STATUS.DRAFT;
  
  // Handle active/working states
  if (status === 'creating' || 
      status === 'working' || 
      status === 'active' || 
      status === 'awaiting' ||
      messageRole === 'tool_call') {
    return MC_STATUS.ACTIVE;
  }
  
  // Everything else is idle (completed, error, paused, idle, etc.)
  return MC_STATUS.IDLE;
};

/**
 * Status display configuration for UI
 */
export const MC_STATUS_CONFIG = {
  [MC_STATUS.DRAFT]: {
    label: 'Drafts',
    icon: 'Edit3',
    color: 'yellow',
    description: 'Tasks ready to send'
  },
  [MC_STATUS.ACTIVE]: {
    label: 'Active',
    icon: 'Loader2',
    color: 'blue', 
    description: 'Tasks in progress'
  },
  [MC_STATUS.IDLE]: {
    label: 'Idle',
    icon: 'CheckCircle2',
    color: 'green',
    description: 'Tasks awaiting review'
  }
} as const;