/**
 * Job instruction types for local tool orchestration
 * Stub implementation for web app - job processing is handled differently
 */

export interface JobInstructionV1 {
  id: string;
  sessionId: string;
  toolName: string;
  args: Record<string, any>;
  timestamp: number;
  priority?: number;
  timeout?: number;
}

export interface JobOutcomeV1 {
  id: string;
  sessionId: string;
  toolName: string;
  success: boolean;
  result?: any;
  error?: string;
  timestamp: number;
  duration?: number;
}

export interface QueuedJobPayload {
  instruction: JobInstructionV1;
  retryCount?: number;
  maxRetries?: number;
}

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface JobStatusUpdate {
  id: string;
  status: JobStatus;
  progress?: number;
  message?: string;
  timestamp: number;
}