import { bootstrapOrchestrator } from '@/services/localTool/bootstrapOrchestrator';
import { ensureGSMInitialised } from '@/services/GlobalServiceManager';
import { checkpointService } from '@/services/checkpoints/CheckpointService';

// Synchronously bootstrap orchestrator and GlobalServiceManager before any React code runs
bootstrapOrchestrator();
ensureGSMInitialised();

export function disposeGlobalServices() {
    checkpointService.dispose();
}
