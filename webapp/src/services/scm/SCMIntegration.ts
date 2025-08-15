/**
 * SCM Integration with Orchestra LocalToolOrchestrator
 * 
 * Demonstrates how to integrate SimpleSCMManager with Orchestra's tool execution workflow
 * This would be integrated into LocalToolOrchestrator for automatic checkpointing
 */

import { SimpleSCMManager } from './SimpleSCMManager';

export interface SCMIntegrationOptions {
  enableAutoCheckpoints?: boolean;
  checkpointPrefix?: string;
}

export class SCMIntegration {
  private scmManager: SimpleSCMManager;
  private options: SCMIntegrationOptions;

  constructor(options: SCMIntegrationOptions = {}) {
    this.scmManager = new SimpleSCMManager();
    this.options = {
      enableAutoCheckpoints: true,
      checkpointPrefix: 'Orchestra Tool',
      ...options
    };
  }

  /**
   * Create checkpoint before tool execution
   */
  async preToolExecution(cwd: string, toolName: string, toolArgs: any): Promise<string | null> {
    if (!this.options.enableAutoCheckpoints) {
      return null;
    }

    try {
      const message = `${this.options.checkpointPrefix}: Before ${toolName}`;
      const hash = await this.scmManager.checkpoint(cwd, message);
      
      if (hash === 'no-changes') {
        console.log(`[SCM Integration] No changes to checkpoint before ${toolName}`);
        return null;
      }

      console.log(`[SCM Integration] Created pre-execution checkpoint ${hash.substring(0, 8)} for ${toolName}`);
      return hash;
    } catch (error) {
      console.error(`[SCM Integration] Failed to create pre-execution checkpoint: ${error}`);
      return null;
    }
  }

  /**
   * Create checkpoint after tool execution
   */
  async postToolExecution(cwd: string, toolName: string, toolResult: any, preCheckpointHash?: string): Promise<string | null> {
    if (!this.options.enableAutoCheckpoints) {
      return null;
    }

    try {
      const message = `${this.options.checkpointPrefix}: After ${toolName}`;
      const hash = await this.scmManager.checkpoint(cwd, message);
      
      if (hash === 'no-changes') {
        console.log(`[SCM Integration] No changes to checkpoint after ${toolName}`);
        return null;
      }

      console.log(`[SCM Integration] Created post-execution checkpoint ${hash.substring(0, 8)} for ${toolName}`);
      
      // Optionally generate diff if we have a pre-checkpoint
      if (preCheckpointHash && preCheckpointHash !== 'no-changes') {
        const diff = await this.scmManager.diff(cwd, preCheckpointHash, hash);
        if (diff.trim()) {
          console.log(`[SCM Integration] Tool ${toolName} changes:\n${diff.substring(0, 500)}...`);
        }
      }

      return hash;
    } catch (error) {
      console.error(`[SCM Integration] Failed to create post-execution checkpoint: ${error}`);
      return null;
    }
  }

  /**
   * Get diff between two checkpoints (for timeline display)
   */
  async getDiffForTimeline(cwd: string, fromHash: string, toHash?: string): Promise<string> {
    try {
      return await this.scmManager.diff(cwd, fromHash, toHash);
    } catch (error) {
      console.error(`[SCM Integration] Failed to get diff for timeline: ${error}`);
      return '';
    }
  }

  /**
   * Revert workspace to a specific checkpoint
   */
  async revertToCheckpoint(cwd: string, hash: string): Promise<boolean> {
    try {
      await this.scmManager.revert(cwd, hash);
      console.log(`[SCM Integration] Successfully reverted workspace to ${hash.substring(0, 8)}`);
      return true;
    } catch (error) {
      console.error(`[SCM Integration] Failed to revert to checkpoint: ${error}`);
      return false;
    }
  }

  /**
   * Get checkpoint history for workspace
   */
  async getCheckpointHistory(cwd: string, limit: number = 20) {
    try {
      return await this.scmManager.getHistory(cwd, limit);
    } catch (error) {
      console.error(`[SCM Integration] Failed to get checkpoint history: ${error}`);
      return [];
    }
  }

  /**
   * Check if workspace has SCM enabled
   */
  hasRepository(cwd: string): boolean {
    return this.scmManager.hasRepository(cwd);
  }

  /**
   * Manual checkpoint creation (for user-initiated checkpoints)
   */
  async createManualCheckpoint(cwd: string, message: string): Promise<string | null> {
    try {
      const hash = await this.scmManager.checkpoint(cwd, `Manual: ${message}`);
      
      if (hash === 'no-changes') {
        console.log(`[SCM Integration] No changes to checkpoint for manual checkpoint: ${message}`);
        return null;
      }

      console.log(`[SCM Integration] Created manual checkpoint ${hash.substring(0, 8)}: ${message}`);
      return hash;
    } catch (error) {
      console.error(`[SCM Integration] Failed to create manual checkpoint: ${error}`);
      return null;
    }
  }
}

/**
 * Example integration with LocalToolOrchestrator workflow
 */
export class LocalToolOrchestratorSCMIntegration {
  private scmIntegration: SCMIntegration;

  constructor() {
    this.scmIntegration = new SCMIntegration({
      enableAutoCheckpoints: true,
      checkpointPrefix: 'Orchestra Tool'
    });
  }

  /**
   * Enhanced tool execution with SCM integration
   */
  async executeToolWithSCM(cwd: string, toolName: string, toolArgs: any, toolExecutor: () => Promise<any>) {
    console.log(`[LocalToolOrchestrator] Executing ${toolName} with SCM integration`);

    // Step 1: Create pre-execution checkpoint
    const preCheckpoint = await this.scmIntegration.preToolExecution(cwd, toolName, toolArgs);

    let toolResult;
    let error;

    try {
      // Step 2: Execute the actual tool
      toolResult = await toolExecutor();
    } catch (err) {
      error = err;
      console.error(`[LocalToolOrchestrator] Tool execution failed: ${err}`);
    }

    // Step 3: Create post-execution checkpoint (even if tool failed)
    const postCheckpoint = await this.scmIntegration.postToolExecution(
      cwd, 
      toolName, 
      toolResult || { error: error?.message }, 
      preCheckpoint || undefined
    );

    // Step 4: Generate timeline data for UI
    const timelineData = {
      toolName,
      preCheckpoint,
      postCheckpoint,
      success: !error,
      timestamp: new Date().toISOString()
    };

    // Step 5: If tool failed and we have a pre-checkpoint, offer revert option
    if (error && preCheckpoint) {
      console.log(`[LocalToolOrchestrator] Tool failed. Pre-execution checkpoint available: ${preCheckpoint.substring(0, 8)}`);
      // In a real implementation, this could trigger a UI prompt to revert
    }

    if (error) {
      throw error;
    }

    return {
      toolResult,
      scmData: timelineData
    };
  }

  /**
   * Get SCM integration instance for direct access
   */
  getSCMIntegration(): SCMIntegration {
    return this.scmIntegration;
  }
}