/**
 * Orchestra SCM Service - Main exports
 * 
 * Git-based Source Control Management layer for Orchestra
 * MVP Implementation with 3 core functions: checkpoint, diff, revert
 */

// MVP Implementation (Recommended)
export { SimpleSCMManager } from './SimpleSCMManager';
export { SCMIntegration, LocalToolOrchestratorSCMIntegration } from './SCMIntegration';

// VS Code Port (For Future Reference)
export { SCMManager } from './SCMManager';
export { getWorktreeBaseCommit } from './SCMManager';
// Note: Repository and Git exports commented out due to missing ./api/git dependency
// These are legacy VS Code port files not currently used in the application
// export { Repository } from './repository';
// export { Git } from './git';
export * from './types';
export { memoize, throttle, sequentialize, debounce } from './decorators';
export * from './util';