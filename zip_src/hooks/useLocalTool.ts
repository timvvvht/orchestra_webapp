import { useEffect, useCallback, useRef } from 'react';
import type { SSEEvent } from '@/services/acs/shared/types';
import { postResultToACS, type JobInstruction, type JobOutcome } from '@/services/localTool';
import type { JobInstructionV1, AccessPolicy } from '@/services/localTool/types';
import { useSessionPermissionsStore, sessionPermissionsUtils } from '@/stores/sessionPermissionsStore';

/**
 * LocalStorage utilities for session working directories
 */
const SESSION_CWD_STORAGE_KEY = 'orchestra_session_cwd';

const saveSessionCwdToStorage = (sessionId: string, cwd: string) => {
    try {
        const stored = JSON.parse(localStorage.getItem(SESSION_CWD_STORAGE_KEY) || '{}');
        stored[sessionId] = {
            cwd,
            timestamp: Date.now()
        };
        localStorage.setItem(SESSION_CWD_STORAGE_KEY, JSON.stringify(stored));
        console.log('💾 [useLocalTool] Saved session CWD to localStorage:', { sessionId, cwd });
    } catch (error) {
        console.warn('⚠️ [useLocalTool] Failed to save session CWD to localStorage:', error);
    }
};

const getSessionCwdFromStorage = (sessionId: string): string | null => {
    try {
        const stored = JSON.parse(localStorage.getItem(SESSION_CWD_STORAGE_KEY) || '{}');
        const sessionData = stored[sessionId];
        if (sessionData?.cwd) {
            console.log('📂 [useLocalTool] Retrieved session CWD from localStorage:', { sessionId, cwd: sessionData.cwd });
            return sessionData.cwd;
        }
    } catch (error) {
        console.warn('⚠️ [useLocalTool] Failed to retrieve session CWD from localStorage:', error);
    }
    return null;
};

const cleanupOldSessionCwds = () => {
    try {
        const stored = JSON.parse(localStorage.getItem(SESSION_CWD_STORAGE_KEY) || '{}');
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
        let cleaned = false;
        
        for (const [sessionId, data] of Object.entries(stored)) {
            if ((data as any)?.timestamp < oneWeekAgo) {
                delete stored[sessionId];
                cleaned = true;
            }
        }
        
        if (cleaned) {
            localStorage.setItem(SESSION_CWD_STORAGE_KEY, JSON.stringify(stored));
            console.log('🧹 [useLocalTool] Cleaned up old session CWDs from localStorage');
        }
    } catch (error) {
        console.warn('⚠️ [useLocalTool] Failed to cleanup old session CWDs:', error);
    }
};

/**
 * Local Tool Execution Service (TES) Configuration
 */
export interface LocalTESConfig {
    /** Port for local TES daemon */
    port: number;
    /** Base URL for local TES daemon */
    baseUrl: string;
    /** Timeout for tool execution requests */
    timeout: number;
    /** Automatically whitelist the CWD when no explicit whitelist is provided */
    autoWhitelistCwd: boolean;
}

// JobInstruction and JobOutcome types are now imported from @/services/localTool

/**
 * Default configuration for Local TES
 */
const DEFAULT_LOCAL_TES_CONFIG: LocalTESConfig = {
    port: 12345,
    baseUrl: 'http://localhost:12345',
    timeout: 30000, // 30 seconds
    autoWhitelistCwd: true // Enable automatic CWD whitelisting by default
};

/**
 * Enhance access policy with session-based permissions and automatic CWD whitelisting
 */
const enhanceAccessPolicy = (
    originalPolicy: AccessPolicy | undefined,
    cwd: string,
    autoWhitelistCwd: boolean,
    sessionId?: string
): AccessPolicy | undefined => {
    // First, check if there are session-specific permissions
    if (sessionId) {
        const sessionPermissions = useSessionPermissionsStore.getState().getSessionPermissions(sessionId);
        if (sessionPermissions && sessionPermissions.isCustomized) {
            console.log('🔒 [useLocalTool] Using session-specific permissions:', {
                sessionId: sessionId.slice(0, 8) + '...',
                accessPolicy: sessionPermissions.accessPolicy,
                lastModified: new Date(sessionPermissions.lastModified).toISOString()
            });
            return sessionPermissions.accessPolicy;
        }
    }

    // If auto-whitelisting is disabled, return original policy
    if (!autoWhitelistCwd) {
        return originalPolicy;
    }

    // If no policy exists, create one with CWD whitelist
    if (!originalPolicy) {
        const cwdPattern = `${cwd}/**`;
        console.log('🔒 [useLocalTool] Auto-creating access policy with CWD whitelist:', { cwd, pattern: cwdPattern });
        return {
            whitelist: [cwdPattern]
        };
    }

    // If policy exists but has no whitelist, add CWD to whitelist
    if (!originalPolicy.whitelist || originalPolicy.whitelist.length === 0) {
        const cwdPattern = `${cwd}/**`;
        console.log('🔒 [useLocalTool] Auto-adding CWD to existing access policy whitelist:', { cwd, pattern: cwdPattern });
        return {
            ...originalPolicy,
            whitelist: [cwdPattern]
        };
    }

    // If whitelist already exists, check if CWD is already covered
    const cwdPattern = `${cwd}/**`;
    const isAlreadyCovered = originalPolicy.whitelist.some(pattern => {
        // Check if CWD is already whitelisted (exact match or parent directory)
        return pattern === cwdPattern || 
               pattern === `${cwd}` ||
               (pattern.endsWith('/**') && cwd.startsWith(pattern.slice(0, -3)));
    });

    if (!isAlreadyCovered) {
        console.log('🔒 [useLocalTool] Auto-adding CWD to existing whitelist:', { 
            cwd, 
            pattern: cwdPattern, 
            existingWhitelist: originalPolicy.whitelist 
        });
        return {
            ...originalPolicy,
            whitelist: [...originalPolicy.whitelist, cwdPattern]
        };
    }

    console.log('🔒 [useLocalTool] CWD already covered by existing whitelist:', { 
        cwd, 
        existingWhitelist: originalPolicy.whitelist 
    });
    return originalPolicy;
};

/**
 * Hook for handling local tool execution via SSE v2 architecture
 *
 * This hook:
 * 1. Listens for 'local_tool_job' SSE events
 * 2. Forwards job instructions to local TES daemon
 * 3. Posts results back to ACS via HTTP
 * 4. Enhances job instructions with session-specific working directory
 */
export const useLocalTool = (
    sessionId: string | undefined, 
    config: Partial<LocalTESConfig> = {},
    sessionAgentCwd?: string | null // 👈 ADD SESSION WORKING DIRECTORY
) => {
    const tesConfig = { ...DEFAULT_LOCAL_TES_CONFIG, ...config };
    const activeJobsRef = useRef<Set<string>>(new Set());

    // 💾 Save session CWD to localStorage when it changes
    useEffect(() => {
        if (sessionId && sessionAgentCwd) {
            saveSessionCwdToStorage(sessionId, sessionAgentCwd);
        }
    }, [sessionId, sessionAgentCwd]);

    // 🧹 Cleanup old session CWDs on mount
    useEffect(() => {
        cleanupOldSessionCwds();
    }, []);

    /**
     * Execute a tool locally via TES daemon
     */
    const executeToolLocally = useCallback(
        async (jobInstruction: JobInstruction): Promise<JobOutcome> => {
            // 🎯 ENHANCE JOB INSTRUCTION WITH SESSION-SPECIFIC WORKING DIRECTORY
            const originalCwd = jobInstruction.cwd;
            const storageFallbackCwd = sessionId ? getSessionCwdFromStorage(sessionId) : null;
            
            // Priority: sessionAgentCwd → localStorage fallback → original → default
            const enhancedCwd = sessionAgentCwd || storageFallbackCwd || originalCwd || '/workspace';
            
            // Determine the source for logging
            let cwdSource: string;
            if (sessionAgentCwd) {
                cwdSource = 'session';
            } else if (storageFallbackCwd) {
                cwdSource = 'localStorage';
            } else if (originalCwd) {
                cwdSource = 'original';
            } else {
                cwdSource = 'default';
            }
            
            // 🔒 ENHANCE ACCESS POLICY WITH SESSION-BASED PERMISSIONS AND AUTOMATIC CWD WHITELISTING
            const originalAccessPolicy = (jobInstruction as any).access_policy as AccessPolicy | undefined;
            const enhancedAccessPolicy = enhanceAccessPolicy(
                originalAccessPolicy,
                enhancedCwd,
                tesConfig.autoWhitelistCwd,
                sessionId
            );
            
            const enhancedJobInstruction: JobInstruction & { access_policy?: AccessPolicy } = {
                ...jobInstruction,
                cwd: enhancedCwd,
                ...(enhancedAccessPolicy && { access_policy: enhancedAccessPolicy })
            };

            console.log('🔄 [useLocalTool] 🛠️ Executing tool locally with enhanced context:', {
                toolName: jobInstruction.tool_name,
                jobId: jobInstruction.job_id,
                sessionId: jobInstruction.session_id,
                originalCwd,
                sessionAgentCwd,
                storageFallbackCwd,
                enhancedCwd,
                cwdSource,
                fallbackChain: `${sessionAgentCwd ? '✅' : '❌'} session → ${storageFallbackCwd ? '✅' : '❌'} localStorage → ${originalCwd ? '✅' : '❌'} original → ✅ default`,
                accessPolicy: {
                    original: originalAccessPolicy,
                    enhanced: enhancedAccessPolicy,
                    autoWhitelistEnabled: tesConfig.autoWhitelistCwd
                },
                instructionPreview: JSON.stringify(enhancedJobInstruction).substring(0, 100) + '...'
            });

            try {
                console.log('📤 [useLocalTool] 🛠️ Sending request to local TES daemon:', {
                    url: `${tesConfig.baseUrl}/execute_job`,
                    toolName: jobInstruction.tool_name,
                    jobId: jobInstruction.job_id
                });

                const response = await fetch(`${tesConfig.baseUrl}/execute_job`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(enhancedJobInstruction), // 👈 USE ENHANCED INSTRUCTION
                    signal: AbortSignal.timeout(tesConfig.timeout)
                });

                if (!response.ok) {
                    throw new Error(`TES daemon responded with ${response.status}: ${response.statusText}`);
                }

                const jobOutcome: JobOutcome = await response.json();
                console.log('✅ [useLocalTool] 🛠️ Local TES daemon execution completed:', {
                    jobId: jobOutcome.job_id,
                    status: jobOutcome.status,
                    hasResultPayload: !!jobOutcome.result_payload,
                    errorMessage: jobOutcome.error_message,
                    resultPreview: jobOutcome.result_payload ? JSON.stringify(jobOutcome.result_payload).substring(0, 100) + '...' : 'null'
                });

                return jobOutcome;
            } catch (error) {
                console.error('❌ [useLocalTool] 🛠️ Local TES daemon execution failed:', {
                    toolName: jobInstruction.tool_name,
                    jobId: jobInstruction.job_id,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });

                // Return error outcome
                return {
                    job_id: jobInstruction.job_id,
                    status: 'error',
                    result_payload: null,
                    error_message: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        },
        [tesConfig, sessionAgentCwd, sessionId] // 👈 ADD SESSION ID AND AGENT CWD TO DEPENDENCIES
    );

    /**
     * Post job result back to ACS using the shared utility
     */
    const postJobResultToACS = useCallback(async (sessionId: string, jobOutcome: JobOutcome): Promise<void> => {
        console.log('📤 [useLocalTool] 🚀 SENDING TOOL RESULT BACK TO ACS:', {
            sessionId,
            jobId: jobOutcome.job_id,
            status: jobOutcome.status,
            hasResultPayload: !!jobOutcome.result_payload,
            errorMessage: jobOutcome.error_message,
            resultPreview: jobOutcome.result_payload ? JSON.stringify(jobOutcome.result_payload).substring(0, 100) + '...' : 'null'
        });

        // Post to the ACS service at fly.dev
        await postResultToACS('https://orchestra-acs.fly.dev', sessionId, jobOutcome);

        console.log('✅ [useLocalTool] 🚀 Tool result sent to ACS successfully:', {
            sessionId,
            jobId: jobOutcome.job_id,
            status: jobOutcome.status
        });
    }, []);

    /**
     * Handle local tool job SSE event
     */
    const handleLocalToolJob = useCallback(
        async (event: SSEEvent) => {
            if (!sessionId) {
                console.log('⚠️ [useLocalTool] 🚫 No session ID available for local tool job');
                return;
            }

            const jobId = event.data?.job_id || event.data?.job_instruction?.job_id;
            if (!jobId) {
                console.log('⚠️ [useLocalTool] 🚫 No job ID found in local tool event:', event);
                return;
            }

            // Prevent duplicate job processing
            if (activeJobsRef.current.has(jobId)) {
                console.log('⚠️ [useLocalTool] 🚫 Job already in progress, skipping:', jobId);
                return;
            }

            activeJobsRef.current.add(jobId);
            console.log('🆕 [useLocalTool] 🛠️ Starting local tool job:', {
                jobId,
                sessionId,
                eventType: event.type,
                hasJobInstruction: !!event.data?.job_instruction
            });

            const job_instruction = event.data?.job_instruction;
            if (!job_instruction) {
                console.log('⚠️ [useLocalTool] 🚫 No job instruction found in event:', event);
                activeJobsRef.current.delete(jobId);
                return;
            }

            try {
                console.log('🔄 [useLocalTool] 🛠️ Processing local tool job:', {
                    jobId,
                    toolName: job_instruction.tool_name,
                    sessionId,
                    instructionPreview: JSON.stringify(job_instruction).substring(0, 100) + '...'
                });

                // Execute tool locally
                const jobOutcome = await executeToolLocally(job_instruction);

                console.log('✅ [useLocalTool] 🛠️ Local tool execution completed:', {
                    jobId,
                    status: jobOutcome.status,
                    hasResult: !!jobOutcome.result_payload,
                    errorMessage: jobOutcome.error_message
                });

                // Post result back to ACS
                await postJobResultToACS(sessionId, jobOutcome);

                console.log('🎉 [useLocalTool] 🛠️ Successfully processed job:', {
                    jobId,
                    sessionId,
                    finalStatus: jobOutcome.status
                });
            } catch (error) {
                console.error('❌ [useLocalTool] 🛠️ Failed to process job:', {
                    jobId,
                    sessionId,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });

                // Try to post error result to ACS
                try {
                    const errorOutcome: JobOutcome = {
                        job_id: jobId,
                        status: 'error',
                        result_payload: null,
                        error_message: error instanceof Error ? error.message : 'Processing failed'
                    };

                    console.log('📤 [useLocalTool] 🚀 Sending error result to ACS:', {
                        jobId,
                        errorMessage: errorOutcome.error_message
                    });

                    await postJobResultToACS(sessionId, errorOutcome);

                    console.log('✅ [useLocalTool] 🚀 Error result sent to ACS successfully');
                } catch (postError) {
                    console.error('❌ [useLocalTool] 🚀 Failed to post error result to ACS:', {
                        jobId,
                        postError: postError instanceof Error ? postError.message : 'Unknown error'
                    });
                }
            } finally {
                activeJobsRef.current.delete(jobId);
                console.log('🧹 [useLocalTool] 🛠️ Cleaned up job tracking:', jobId);
            }
        },
        [sessionId, executeToolLocally, postJobResultToACS]
    );

    /**
     * Check if local TES daemon is available
     */
    const checkTESAvailability = useCallback(async (): Promise<boolean> => {
        try {
            const response = await fetch(`${tesConfig.baseUrl}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000) // 5 second timeout
            });
            return response.ok;
        } catch (error) {
            console.warn('[useLocalTool] Local TES daemon not available:', error);
            return false;
        }
    }, [tesConfig.baseUrl]);

    return {
        handleLocalToolJob,
        executeToolLocally,
        postResultToACS: postJobResultToACS,
        checkTESAvailability,
        config: tesConfig,
        activeJobs: activeJobsRef.current,
        // 💾 Expose localStorage utilities for external use
        saveSessionCwd: (cwd: string) => sessionId && saveSessionCwdToStorage(sessionId, cwd),
        getStoredSessionCwd: () => sessionId ? getSessionCwdFromStorage(sessionId) : null
    };
};

/**
 * Attach local tool listener to an existing SSE streaming service
 *
 * This function should be called once per active chat session to enable
 * local tool execution via SSE v2 architecture.
 */
export const attachLocalToolListener = (
    sessionId: string, 
    onEvent: (handler: (event: SSEEvent) => void) => () => void, 
    config?: Partial<LocalTESConfig>,
    sessionAgentCwd?: string | null // 👈 ADD OPTIONAL SESSION CONTEXT
) => {
    const { handleLocalToolJob } = useLocalTool(sessionId, config, sessionAgentCwd);

    // Subscribe to SSE events and filter for local_tool_job
    const unsubscribe = onEvent((event: SSEEvent) => {
        // Check for agent_status events with local_tool_job status
        if (event.type === 'agent_status') {
            // Parse the data to check the status
            let eventData = event.data;
            if (typeof eventData === 'string') {
                try {
                    eventData = JSON.parse(eventData);
                } catch (e) {
                    return; // Skip if can't parse
                }
            }

            // Check if this is a local tool job event
            if (eventData && (eventData.status === 'local_tool_job' || eventData.job_instruction)) {
                console.log(`[attachLocalToolListener] Received local tool job event for session ${sessionId}`);
                handleLocalToolJob(event);
            }
        }
    });

    console.log(`[attachLocalToolListener] Local tool listener attached for session ${sessionId}`);

    return unsubscribe;
};

export default useLocalTool;

// 💾 Export localStorage utilities for external use
export const sessionCwdStorage = {
    save: saveSessionCwdToStorage,
    get: getSessionCwdFromStorage,
    cleanup: cleanupOldSessionCwds,
    key: SESSION_CWD_STORAGE_KEY
};
