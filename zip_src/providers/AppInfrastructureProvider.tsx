import { ReactNode, useMemo } from 'react';
import { globalServiceManager } from '@/services/GlobalServiceManager';
import { bootstrapOrchestrator } from '@/services/localTool/bootstrapOrchestrator';

interface Props { 
  children: ReactNode;
}

export default function AppInfrastructureProvider({ children }: Props) {
  // Run once, synchronously, before children render
  useMemo(() => {
    // 1) Ensure orchestrator exists before GSM initialization
    if (!window.__orch) {
      console.log('[AppInfrastructureProvider] Bootstrapping orchestrator synchronously...');
      bootstrapOrchestrator().catch(err => {
        console.error('[AppInfrastructureProvider] Failed to bootstrap orchestrator:', err);
      });
    }
    
    // 2) Now initialize GSM (FirehoseMux will be created here)
    globalServiceManager.initialize().catch(err => {
      console.error('[AppInfrastructureProvider] Failed to initialize GSM:', err);
    });
  }, []);
  
  return <>{children}</>;
}