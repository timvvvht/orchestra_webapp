/**
 * Helper extracted from LandingPageInfinite – creates an ACS session, builds the query string,
 * and navigates to the new chat route.
 * 
 * For Mission Control sessions, also creates a worktree automatically.
 */
import { getDefaultACSClient } from '@/services/acs';
import { useNavigate } from 'react-router-dom';
import { sessionPermissionsUtils, useSessionPermissionsStore } from '@/stores/sessionPermissionsStore';
import type { AccessPolicy } from '@/services/localTool/types';
import { invokeCreateWorktree, isTauriEnvironment } from './worktreeApi';
import { toast } from 'sonner';

export interface StartSessionOptions {
  initialMessage: string;
  agentConfigId: string;
  sessionName?: string;
  codePath: string;           // REQUIRED project path / cwd
  modelId?: string | null;
  customPermissions?: {       // Optional custom permissions
    allowedDirs?: string[];
  };
  createWorktree?: boolean;   // Whether to create a worktree (default: false for backward compatibility)
  skipNavigation?: boolean;   // Whether to skip navigation to chat (default: false for backward compatibility)
}

export function useStartSession() {
  const navigate = useNavigate();

  return async function startSession({
    initialMessage,
    agentConfigId,
    sessionName = 'New Chat',
    codePath,
    modelId,
    customPermissions,
    createWorktree = false,
    skipNavigation = false,
  }: StartSessionOptions) {
    const acsClient = getDefaultACSClient();
    const createRes = await acsClient.sessions.createSession({
      name: sessionName,
      agent_config_id: agentConfigId,
    });
    const realSessionId = createRes.data.data.id;

    // 🌳 WORKTREE: Create isolated workspace if requested (Mission Control sessions)
    let effectiveCwd = codePath; // Default to original codePath
    
    console.log(`🔥🔥🔥 [DEBUG] >>>>>>>>>>>>>>>>> startSession WORKTREE CHECK: createWorktree=${createWorktree}, isTauriEnvironment=${isTauriEnvironment()}`);
    
    if (createWorktree && isTauriEnvironment()) {
      try {
        // Runtime guard: ensure codePath is not empty
        if (!codePath || codePath.trim() === '') {
          console.warn('🚨 [startSession] codePath is empty when createWorktree=true, falling back to current directory');
          toast.error('Invalid Project Path', 'Using current directory as fallback');
          // Use current working directory as fallback
          codePath = '.';
        }
        
        console.log('🔥 [DEBUG] About to call invokeCreateWorktree with:', {
          sessionId: realSessionId,
          codePath: codePath
        });
        console.log('🌳 [startSession] Creating worktree for Mission Control session:', {
          sessionId: realSessionId.slice(0, 8) + '...',
          originalCwd: codePath,
          timestamp: new Date().toISOString()
        });
        
        const worktreeResult = await invokeCreateWorktree(realSessionId, codePath);
        
        console.log('🔥 [DEBUG] invokeCreateWorktree returned:', worktreeResult);
        
        // 🎯 CRITICAL: Use worktree path as the effective CWD for this session
        effectiveCwd = worktreeResult.workspace_path;
        
        // 🔄 CRITICAL: Update ACS session metadata to reflect worktree path
        try {
          console.log('🔄 [startSession] BEFORE updateSession call:', {
            sessionId: realSessionId,
            sessionIdLength: realSessionId.length,
            updatePayload: { agent_cwd: worktreeResult.workspace_path },
            workspacePath: worktreeResult.workspace_path,
            acsClientExists: !!acsClient,
            acsClientSessionsExists: !!acsClient.sessions,
            updateSessionExists: !!acsClient.sessions.updateSession
          });
          
          const updateResult = await acsClient.sessions.updateSession(realSessionId, { agent_cwd: worktreeResult.workspace_path });
          
          console.log('🔄 [startSession] updateSession RESPONSE:', {
            success: true,
            updateResult: updateResult,
            resultData: updateResult?.data,
            resultStatus: updateResult?.status,
            sessionId: realSessionId,
            newAgentCwd: worktreeResult.workspace_path
          });
          
          console.log('✅ [startSession] agent_cwd successfully updated to worktree path:', worktreeResult.workspace_path);
          
          // 🔍 VERIFICATION: Fetch the session to confirm the update worked
          try {
            console.log('🔍 [startSession] Verifying session update by fetching session data...');
            const verificationSession = await acsClient.sessions.getSession(realSessionId);
            console.log('🔍 [startSession] Session verification result:', {
              sessionId: realSessionId,
              fetchedAgentCwd: verificationSession?.data?.agent_cwd,
              expectedAgentCwd: worktreeResult.workspace_path,
              updateSuccessful: verificationSession?.data?.agent_cwd === worktreeResult.workspace_path,
              fullSessionData: verificationSession?.data
            });
          } catch (verificationError) {
            console.warn('⚠️ [startSession] Failed to verify session update:', verificationError);
          }
          
        } catch (updateError) {
          console.error('❌ [startSession] updateSession FAILED with detailed error:', {
            error: updateError,
            errorMessage: updateError?.message,
            errorStack: updateError?.stack,
            errorResponse: updateError?.response,
            errorResponseData: updateError?.response?.data,
            errorStatus: updateError?.response?.status,
            sessionId: realSessionId,
            attemptedAgentCwd: worktreeResult.workspace_path,
            timestamp: new Date().toISOString()
          });
          
          console.warn('⚠️ [startSession] Failed to update agent_cwd in session metadata:', updateError);
          toast.warning('Session created, but path not synced');
          // Continue - this is not critical for functionality
        }
        
        console.log('✅ [startSession] Worktree created successfully:', {
          sessionId: realSessionId.slice(0, 8) + '...',
          workspacePath: worktreeResult.workspace_path,
          effectiveCwd: effectiveCwd
        });
        
        console.log('🎯 [startSession] Session will use worktree as CWD:', effectiveCwd);
        
      } catch (error) {
        console.error('🔥🔥🔥 [DEBUG] >>>>>>>>>>>>>>>>> startSession WORKTREE CREATION FAILED:', error);
        console.error('🚨 [startSession] Failed to create worktree:', error);
        toast.error('Worktree Creation Failed', 'Session will continue without isolated workspace');
        // Continue with session creation - worktree is optional for functionality
        // effectiveCwd remains as original codePath
      }
    } else if (createWorktree && !isTauriEnvironment()) {
      console.warn('🔥 [DEBUG] Worktree creation requested but not in Tauri environment - skipping');
      console.warn('🌐 [startSession] Worktree creation requested but not in Tauri environment - skipping');
    } else {
      console.log('🔥 [DEBUG] Worktree creation not requested or conditions not met:', {
        createWorktree,
        isTauriEnvironment: isTauriEnvironment()
      });
    }

    // 🛡️ CRITICAL: Set up session permissions immediately after session creation
    // This ensures the session has proper access controls from the start
    try {
      console.log('🛡️ [startSession] Setting up session permissions for new session:', {
        sessionId: realSessionId.slice(0, 8) + '...',
        originalCodePath: codePath,
        effectiveCwd: effectiveCwd,
        usingWorktree: effectiveCwd !== codePath,
        customPermissions: customPermissions ? 'provided' : 'default',
        timestamp: new Date().toISOString()
      });
      
      // Create default permissions using the effective CWD (worktree path if created)
      await sessionPermissionsUtils.getOrCreateSessionPermissions(realSessionId, effectiveCwd);
      
      // If custom permissions are provided, update them
      if (customPermissions?.allowedDirs && customPermissions.allowedDirs.length > 0) {
        const store = useSessionPermissionsStore.getState();
        const existingPermissions = store.getSessionPermissions(realSessionId);
        
        if (existingPermissions) {
          // Add custom allowed directories to the whitelist
          const updatedWhitelist = [
            ...(existingPermissions.accessPolicy.whitelist || []),
            ...customPermissions.allowedDirs.map(dir => `${dir}/**`)
          ];
          
          const customAccessPolicy: AccessPolicy = {
            ...existingPermissions.accessPolicy,
            whitelist: updatedWhitelist
          };
          
          store.setSessionPermissions(realSessionId, customAccessPolicy, true);
          
          console.log('✅ [startSession] Custom permissions applied:', {
            additionalDirs: customPermissions.allowedDirs.length,
            totalWhitelist: updatedWhitelist.length
          });
        }
      }
      
      console.log('✅ [startSession] Session permissions successfully established');
    } catch (error) {
      console.error('🚨 [startSession] Failed to set up session permissions:', error);
      // Continue with session creation even if permissions setup fails
      // The permissions will be created later when first tool is used
    }

    // Only navigate if not skipping navigation
    if (!skipNavigation) {
      const qs: Record<string, string> = {
        initialMessage: encodeURIComponent(initialMessage),
        agentConfigId,
        projectPath: encodeURIComponent(effectiveCwd), // Use effective CWD (worktree if created)
      };
      if (modelId) qs.modelId = modelId;

      const query = new URLSearchParams(qs).toString();
      navigate(`/chat/${realSessionId}?${query}`);
    }

    // Return the session ID so caller can use it
    return realSessionId;
  };
}
