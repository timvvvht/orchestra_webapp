/* LocalToolOrchestrator – forwards waiting_local_tool jobs to local TES */
// Auto-enable LocalToolOrchestrator debug logs
(globalThis as any).__DEBUG_LTO = true;

// DEBUG flag – set window.__DEBUG_LTO = true in DevTools for verbose logs
const DEBUG = (globalThis as any).__DEBUG_LTO ?? import.meta.env.VITE_DEBUG_LTO === 'true';
import type { ACSRawEvent, FirehoseMux } from '@/services/acs/streaming/FirehoseMux';
import { requiresApproval } from '@/config/approvalTools';
import { usePendingToolsStore, PendingJob } from '@/stores/pendingToolsStore';
import { sessionPermissionsUtils } from '@/stores/sessionPermissionsStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type { JobInstructionV1, JobOutcomeV1, QueuedJobPayload } from './types';
import { lspClient, getBaseUrl } from './httpLspClient';
import { ensureLspServer } from './lspServerBootstrap';
import { isTauri } from '@/utils/runtime';

// Fallback LSP tools for routing when discovery fails
const FALLBACK_LSP_TOOLS = new Set<string>([
    'ping_language_server',
    'get_symbols_overview',
    'find_symbol',
    'find_referencing_symbols',
    'replace_symbol_body',
    'insert_after_symbol',
    'insert_before_symbol',
    'restart_language_server'
]);

type Options = {
    acsApi?: string; // default VITE_ACS_BASE_URL
};

export class LocalToolOrchestrator {
    private mux: FirehoseMux;
    private acsApi: string;
    private unsubscribe?: () => void;
    private executing: Set<string> = new Set(); // Track executing job IDs to prevent duplicates
    private storeUnsub?: () => void;
    private nativeTools: Set<string> = new Set(); // Cache of Rust-compatible tools
    private lspTools = new Set<string>(); // Cache of LSP HTTP tools
    private started = false; // Guard against duplicate starts

    constructor(firehose: FirehoseMux, opts: Options = {}) {
        this.mux = firehose;
        const DEFAULT_ACS_URL = (import.meta.env.VITE_ACS_BASE_URL as string | undefined) ?? 'https://orchestra-acs.fly.dev';

        this.acsApi = opts.acsApi ?? DEFAULT_ACS_URL;

        void (
            DEBUG &&
            console.log('[LTO] Initialized', {
                acsApi: this.acsApi
            })
        );
    }

    /** Start listening to the global fire-hose stream for waiting_local_tool events. */
    async start() {
        if (this.started) {
            console.log('🔧 [LTO] Already started, skipping duplicate start');
            return;
        }
        this.started = true;

        console.log('🔧 [LTO] 🚀 Starting Local Tool Orchestrator:', {
            acsApi: this.acsApi,
            debugEnabled: DEBUG,
            listeningFor: ['waiting_local_tool', 'agent_status with waiting_local_tool']
        });

        // Bootstrap native tools discovery
        await this.bootstrapNativeTools();

        // Subscribe to events immediately after native tool discovery (prioritized)
        this.unsubscribe = this.mux.subscribe(ev => this.handleRaw(ev));

        // Try to bootstrap LSP server - continue in degraded mode if it fails
        try {
            const lspPort = await ensureLspServer();
            if (!lspPort) throw new Error('Failed to bootstrap LSP');

            // Bootstrap LSP tools discovery
            await this.bootstrapLspTools();
        } catch (err) {
            console.error('[LTO] LSP bootstrap failed, continuing in degraded mode:', err);
        }

        // Subscribe to store changes for approval workflow
        this.storeUnsub = usePendingToolsStore.subscribe(
            state => state.jobs,
            () => {
                console.log('🔧 [LTO] 🔔 Store jobs changed, triggering processStoreQueue');
                this.processStoreQueue();
            },
            { fireImmediately: false }
        );

        console.log('🔧 [LTO] ✅ Now listening for local tool routing events from user-specific SSE stream');
    }

    /**
     * Bootstrap native tools discovery by fetching the list from Tauri
     */
    private async bootstrapNativeTools() {
        try {
            console.log('🔧 [LTO] 🔍 Discovering native Rust tools via Tauri...');

            // Check if we're running in Tauri environment
            if (isTauri()) {
                const { invoke } = (window as any).__TAURI__.core;
                const nativeToolsList: string[] = await invoke('list_native_tools');

                this.nativeTools = new Set(nativeToolsList);
                console.log('🔧 [LTO] ✅ Discovered native tools:', {
                    count: this.nativeTools.size,
                    tools: Array.from(this.nativeTools)
                });
            } else {
                console.log('🔧 [LTO] ⚠️ Not running in Tauri environment, no native tools available');
                this.nativeTools = new Set(); // Explicitly set empty set for web
            }
        } catch (error) {
            console.error('🔧 [LTO] ❌ Failed to discover native tools:', error);
            // Continue with empty native tools set
            this.nativeTools = new Set();
        }
    }

    /**
     * Bootstrap LSP tools discovery by using static fallback list
     */
    private async bootstrapLspTools() {
        // We don't need to hit /tools; use a static, known-good tool set for routing.
        console.log('🔧 [LTO] Skipping LSP /tools discovery; using static fallback list');
        this.lspTools = new Set(FALLBACK_LSP_TOOLS);
        console.log('🔧 [LTO] ✅ Using static LSP tools:', {
            count: this.lspTools.size,
            tools: Array.from(this.lspTools)
        });
    }

    /**
     * Check if a tool should be executed natively via Tauri
     */
    public isNativeTool(toolName: string): boolean {
        return this.nativeTools.has(toolName);
    }

    /**
     * Public method to get the list of native tools
     */
    public getNativeTools(): Set<string> {
        return this.nativeTools;
    }

    /**
     * Public method for direct tool execution (used by NativeToolConsole)
     */
    public async executeToolDirect(
        toolName: string,
        toolInput: any
    ): Promise<{
        success: boolean;
        data?: any;
        error?: string;
        executionTime?: number;
    }> {
        const startTime = Date.now();

        try {
            // Create a deterministic job ID for duplicate prevention
            const toolInputHash = JSON.stringify(toolInput);
            const jobId = `direct-${toolName}-${btoa(toolInputHash).slice(0, 8)}`;

            // Check for duplicate direct execution
            if (this.executing.has(jobId)) {
                console.log(`🔧 [LTO] ⏭️ DUPLICATE DETECTED - Direct execution ${jobId} already running, skipping duplicate`, {
                    jobId,
                    toolName,
                    timestamp: new Date().toISOString(),
                    callSource: 'executeToolDirect',
                    currentlyExecuting: Array.from(this.executing),
                    executingCount: this.executing.size
                });
                return {
                    success: false,
                    error: 'Tool execution already in progress',
                    executionTime: Date.now() - startTime
                };
            }

            // Create a mock job instruction for direct execution
            const mockJobInstruction = {
                schema_version: '1.0.0' as const,
                tool_use_id: `direct-${Date.now()}`,
                job_id: jobId,
                session_id: 'direct-session',
                cwd: toolInput.cwd || '/workspace',
                tool_name: toolName,
                tool_input: toolInput
            };

            // Mark as executing to prevent duplicates
            this.executing.add(jobId);

            try {
                let outcome;
                if (this.isNativeTool(toolName)) {
                    console.log('🔧 [LTO] 🦀 Executing via Tauri (native Rust) - Direct');
                    console.log('🔧 [LTO] 🌍 DIRECT EXECUTION: Using cwd from toolInput:', mockJobInstruction.cwd);
                    outcome = await this.executeNativeTool(mockJobInstruction);
                } else {
                    console.log('🔧 [LTO] 🐍 Tool not available - throwing error');
                    throw new Error('LSP HTTP unavailable');
                }

                const executionTime = Date.now() - startTime;

                return {
                    success: outcome.status === 'success',
                    data: outcome.result_payload,
                    error: outcome.error_message,
                    executionTime
                };
            } finally {
                // Always remove from executing set
                this.executing.delete(jobId);
            }
        } catch (error: any) {
            const executionTime = Date.now() - startTime;
            return {
                success: false,
                error: error.message || 'Unknown error',
                executionTime
            };
        }
    }

    /** stop listening to events */
    stop() {
        this.started = false;
        this.storeUnsub?.();
        if (this.unsubscribe) {
            console.log('[LocalToolOrchestrator] Stopping event listener...');
            this.unsubscribe();
            delete this.unsubscribe;
        }
    }

    private handleRaw(ev: ACSRawEvent) {
        console.log('🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧 [LTO] Processing raw event:', {
            eventType: ev.event_type,
            sessionId: ev.session_id,
            eventId: ev.event_id,
            messageId: ev.message_id,
            hasData: !!ev.data,
            dataKeys: ev.data ? Object.keys(ev.data) : [],
            isWaitingLocalTool: ev.event_type === 'waiting_local_tool',
            isAgentStatus: ev.event_type === 'agent_status',
            agentStatus: ev.event_type === 'agent_status' ? ev.data?.status : undefined,
            userId: ev.data?.user_id,
            timestamp: new Date().toISOString(),
            callSource: 'handleRaw'
        });

        let ji: any | undefined;

        if (ev.event_type === 'waiting_local_tool') {
            console.log('🔧 [LTO] Found waiting_local_tool event!', {
                sessionId: ev.session_id,
                hasJobInstruction: !!ev.data?.job_instruction,
                jobInstructionKeys: ev.data?.job_instruction ? Object.keys(ev.data.job_instruction) : []
            });
            ji = ev.data?.job_instruction;
        } else if (ev.event_type === 'agent_status' && ev.data?.status === 'waiting_local_tool') {
            console.log('🔧 [LTO] Found agent_status with waiting_local_tool status!', {
                sessionId: ev.session_id,
                hasDirectJobInstruction: !!ev.data?.job_instruction,
                hasDetails: !!ev.data?.details,
                detailsType: typeof ev.data?.details
            });

            // Sometimes ACS wraps the job instruction inside agent_status -> details
            if (ev.data?.job_instruction) {
                console.log('🔧 [LTO] Using direct job_instruction from agent_status');
                ji = ev.data.job_instruction;
            } else if (typeof ev.data?.details === 'string') {
                // Check if the string looks like JSON before attempting to parse
                const detailsStr = ev.data.details.trim();
                if (detailsStr.startsWith('{') && detailsStr.endsWith('}')) {
                    try {
                        const parsed = JSON.parse(detailsStr);
                        console.log('🔧 [LTO] Parsed job_instruction from string details:', {
                            hasJobInstruction: !!parsed.job_instruction
                        });
                        ji = parsed.job_instruction;
                    } catch (err) {
                        console.warn('🔧 [LTO] Failed to parse details string as JSON:', err);
                    }
                } else {
                    console.log('🔧 [LTO] Details string is not JSON format, skipping parse:', {
                        detailsPreview: detailsStr.substring(0, 100) + (detailsStr.length > 100 ? '...' : '')
                    });
                }
            } else if (ev.data?.details?.job_instruction) {
                console.log('🔧 [LTO] Using job_instruction from details object');
                ji = ev.data.details.job_instruction;
            }
        } else {
            // Log non-local-tool events for debugging
            if (DEBUG && ['tool_call', 'tool_result', 'agent_status'].includes(ev.event_type)) {
                console.log('🔧 [LTO] Non-local-tool event (for reference):', {
                    eventType: ev.event_type,
                    sessionId: ev.session_id,
                    status: ev.data?.status,
                    toolName: ev.data?.tool_name || ev.data?.name
                });
            }
        }

        if (!ji) {
            // console.warn('🚨 [LTO] No job instruction found in event - DETAILED ANALYSIS:', {
            //     eventType: ev.event_type,
            //     sessionId: ev.session_id,
            //     hasData: !!ev.data,
            //     dataKeys: ev.data ? Object.keys(ev.data) : [],
            //     dataStructure: ev.data ? JSON.stringify(ev.data, null, 2) : 'NO DATA',
            //     hasDetails: !!ev.data?.details,
            //     detailsType: typeof ev.data?.details,
            //     detailsContent: ev.data?.details
            //         ? typeof ev.data.details === 'string'
            //             ? ev.data.details.substring(0, 200)
            //             : JSON.stringify(ev.data.details, null, 2)
            //         : 'NO DETAILS',
            //     hasJobInstruction: !!ev.data?.job_instruction,
            //     possibleIssues: [
            //         'Event type not recognized',
            //         'job_instruction missing from data',
            //         'details field malformed',
            //         'ACS sending different event structure'
            //     ],
            //     recommendation: 'Check ACS event emission format and ensure waiting_local_tool events include job_instruction'
            // });
            return;
        }

        console.log('🔧 [LTO] ✅ Found valid job instruction!', {
            jobId: ji.job_id,
            toolName: ji.tool_name,
            sessionId: ev.session_id,
            hasArgs: !!ji.args,
            argsKeys: ji.args ? Object.keys(ji.args) : [],
            timestamp: new Date().toISOString(),
            callSource: 'handleRaw',
            currentlyExecuting: Array.from(this.executing),
            executingCount: this.executing.size
        });

        // Check if this job is already being executed to prevent duplicates
        if (this.executing.has(ji.job_id)) {
            console.log(`🔧 [LTO] ⏭️ DUPLICATE DETECTED - Job ${ji.job_id} already executing, skipping duplicate`, {
                jobId: ji.job_id,
                toolName: ji.tool_name,
                sessionId: ev.session_id,
                timestamp: new Date().toISOString(),
                callSource: 'handleRaw',
                currentlyExecuting: Array.from(this.executing),
                executingCount: this.executing.size,
                stackTrace: new Error().stack?.split('\n').slice(0, 5)
            });
            return;
        }

        console.log(`🔧 [LTO] 🚀 PROCEEDING WITH EXECUTION - Job ${ji.job_id} not in executing set`, {
            jobId: ji.job_id,
            toolName: ji.tool_name,
            sessionId: ev.session_id,
            timestamp: new Date().toISOString(),
            callSource: 'handleRaw',
            currentlyExecuting: Array.from(this.executing),
            executingCount: this.executing.size
        });

        // Check if tool requires approval
        if (requiresApproval(ji.tool_name)) {
            console.log(`🔧 [LTO] 🔒 Tool ${ji.tool_name} requires approval - checking preferences`, {
                jobId: ji.job_id,
                toolName: ji.tool_name,
                sessionId: ev.session_id,
                timestamp: new Date().toISOString(),
                callSource: 'handleRaw->handleSensitiveTool'
            });
            this.handleSensitiveTool(ev.session_id, ji);
        } else {
            console.log('🔧 [LTO] 🚀 Executing non-sensitive tool job:', {
                jobId: ji.job_id,
                toolName: ji.tool_name,
                sessionId: ev.session_id,
                timestamp: new Date().toISOString(),
                callSource: 'handleRaw->executeJob'
            });
            this.executeJob(ev.session_id, ji);
        }
    }

    /**
     * Handle sensitive tool - check preferences and either execute, reject, or queue for approval
     */
    private async handleSensitiveTool(sessionId: string, ji: JobInstructionV1) {
        const currentState = usePendingToolsStore.getState();
        const pref = currentState.prefs[ji.tool_name as any] || 'ask';

        console.log(`🔧 [LTO] 🔒 Handling sensitive tool ${ji.tool_name} with preference: ${pref}`);
        console.log(`🔧 [LTO] 🔍 DEBUG - All preferences:`, currentState.prefs);
        console.log(`🔧 [LTO] 🔍 DEBUG - Tool name type:`, typeof ji.tool_name, ji.tool_name);

        switch (pref) {
            case 'always':
                console.log(`🔧 [LTO] ✅ Auto-approving ${ji.tool_name} (user preference: always)`, {
                    jobId: ji.job_id,
                    toolName: ji.tool_name,
                    sessionId,
                    timestamp: new Date().toISOString(),
                    callSource: 'handleSensitiveTool->executeJob(auto-approved)'
                });
                try {
                    await this.executeJob(sessionId, ji);
                } catch (error) {
                    console.error(`🔧 [LTO] ❌ Error executing auto-approved job ${ji.job_id}:`, error);
                    this.executing.delete(ji.job_id);
                }
                break;

            case 'never':
                console.log(`🔧 [LTO] ❌ Auto-rejecting ${ji.tool_name} (user preference: never)`);
                await this.sendRejectionOutcome(sessionId, ji, 'User has configured this tool to never execute');
                this.executing.delete(ji.job_id);
                break;

            case 'ask':
            default:
                console.log(`🔧 [LTO] ⏸️ Queuing ${ji.tool_name} for user approval`);
                this.queueForApproval(sessionId, ji);
                break;
        }
    }

    /**
     * Queue job for user approval
     */
    private queueForApproval(sessionId: string, ji: JobInstructionV1) {
        const pendingJob: PendingJob = {
            id: ji.job_id,
            tool: ji.tool_name as any,
            sse: { session_id: sessionId, ji },
            createdAt: Date.now(),
            status: 'waiting'
        };

        usePendingToolsStore.getState().enqueue(pendingJob);
        console.log(`🔧 [LTO] 📋 Queued job ${ji.job_id} for approval`);
    }

    /**
     * Process approved/rejected jobs from store
     */
    private async processStoreQueue() {
        console.log('🔧 [LTO] 🔄 Processing store queue...', {
            timestamp: new Date().toISOString(),
            callSource: 'processStoreQueue',
            currentlyExecuting: Array.from(this.executing),
            executingCount: this.executing.size
        });

        // Check current store state
        const currentState = usePendingToolsStore.getState();
        const allJobs = Object.values(currentState.jobs);
        const approvedJobs = allJobs.filter(job => job.status === 'approved');

        console.log('🔧 [LTO] 📊 Store state:', {
            totalJobs: allJobs.length,
            approvedJobs: approvedJobs.length,
            allJobStatuses: allJobs.map(j => ({ id: j.id, status: j.status }))
        });

        // Process approved jobs
        let approvedJob = usePendingToolsStore.getState().dequeueApproved();
        while (approvedJob) {
            console.log(`🔧 [LTO] ✅ Processing approved job: ${approvedJob.id}`, {
                jobId: approvedJob.id,
                timestamp: new Date().toISOString(),
                callSource: 'processStoreQueue->approved',
                currentlyExecuting: Array.from(this.executing),
                executingCount: this.executing.size
            });
            console.log(`🔧 [LTO] 📋 Job details:`, approvedJob);
            const { session_id, ji } = approvedJob.sse as QueuedJobPayload;

            // Check for duplicate execution before proceeding
            if (this.executing.has(ji.job_id)) {
                console.log(`🔧 [LTO] ⏭️ DUPLICATE DETECTED IN STORE QUEUE - Job ${ji.job_id} already executing, skipping`, {
                    jobId: ji.job_id,
                    toolName: ji.tool_name,
                    sessionId: session_id,
                    timestamp: new Date().toISOString(),
                    callSource: 'processStoreQueue->approved',
                    currentlyExecuting: Array.from(this.executing),
                    executingCount: this.executing.size,
                    stackTrace: new Error().stack?.split('\n').slice(0, 5)
                });
                approvedJob = usePendingToolsStore.getState().dequeueApproved();
                continue;
            }

            try {
                console.log(`🔧 [LTO] 🚀 Executing approved job ${approvedJob.id} for session ${session_id}`, {
                    jobId: ji.job_id,
                    toolName: ji.tool_name,
                    sessionId: session_id,
                    timestamp: new Date().toISOString(),
                    callSource: 'processStoreQueue->executeJob(approved)'
                });
                await this.executeJob(session_id, ji);
            } catch (error) {
                console.error(`🔧 [LTO] ❌ Error executing approved job ${ji.job_id}:`, error);
                this.executing.delete(ji.job_id);
            }

            approvedJob = usePendingToolsStore.getState().dequeueApproved();
        }

        // Process rejected jobs
        let rejectedJob = usePendingToolsStore.getState().dequeueRejected();
        while (rejectedJob) {
            console.log(`🔧 [LTO] ❌ Processing rejected job: ${rejectedJob.id}`);
            console.log(`🔧 [LTO] 📋 Rejected job details:`, rejectedJob);
            const { session_id, ji } = rejectedJob.sse as QueuedJobPayload;

            try {
                console.log(`🔧 [LTO] 📤 Sending rejection outcome for job ${rejectedJob.id} to ACS`);
                await this.sendRejectionOutcome(session_id, ji, 'User rejected the tool execution');
            } catch (error) {
                console.error(`🔧 [LTO] ❌ Error sending rejection outcome for job ${ji.job_id}:`, error);
            }

            rejectedJob = usePendingToolsStore.getState().dequeueRejected();
        }

        console.log('🔧 [LTO] ✅ Store queue processing complete');
    }

    /**
     * Send rejection outcome to ACS
     */
    private async sendRejectionOutcome(sessionId: string, ji: JobInstructionV1, reason: string) {
        const outcome: JobOutcomeV1 = {
            schema_version: '1.0.0',
            job_id: ji.job_id,
            tool_use_id: ji.tool_use_id,
            session_id: sessionId,
            status: 'error',
            result_payload: { error: reason },
            error_message: reason
        };

        console.log(`🔧 [LTO] ❌ Sending rejection outcome for job ${ji.job_id}: ${reason}`);
        await this.postOutcome(sessionId, outcome);
    }

    /**
     * Normalize incoming ACS job instruction to canonical JobInstructionV1 format
     * for 100% compatibility with local TES server
     */
    private async normalizeJobInstruction(rawJi: any, sessionId: string): Promise<JobInstructionV1> {
        // Generate tool_use_id if missing (required field)
        const tool_use_id = rawJi.tool_use_id || rawJi.tool_call_id || crypto.randomUUID();

        // Use tool_input if present, otherwise fall back to args, otherwise empty object
        const tool_input = rawJi.tool_input || rawJi.args || {};

        // Use provided cwd or default to /workspace
        const cwd = rawJi.cwd || '/workspace';

        // 🛡️ CRITICAL SECURITY FIX: Get or create session permissions (includes vault path)
        // rawJi.access_policy is undefined - ACS doesn't send permissions!
        const sessionPermissions = await sessionPermissionsUtils.getOrCreateSessionPermissions(sessionId, cwd);
        const access_policy = sessionPermissions.accessPolicy;

        console.log('🛡️ [LTO] 🔒 SECURITY: Using session permissions (includes vault path):', {
            sessionId,
            hasSessionPermissions: !!sessionPermissions,
            hasAccessPolicy: !!access_policy,
            rawJiAccessPolicy: rawJi.access_policy, // Should be undefined
            sessionPermissionsDetails: {
                isCustomized: sessionPermissions.isCustomized,
                lastModified: new Date(sessionPermissions.lastModified).toISOString(),
                whitelistCount: sessionPermissions.accessPolicy.whitelist?.length || 0,
                blacklistCount: sessionPermissions.accessPolicy.blacklist?.length || 0,
                shellForbiddenCount: sessionPermissions.accessPolicy.shell_forbidden_patterns?.length || 0,
                whitelistPaths: sessionPermissions.accessPolicy.whitelist || []
            }
        });

        const normalized: JobInstructionV1 = {
            schema_version: '1.0.0', // Required literal
            tool_use_id, // Required
            job_id: rawJi.job_id, // Required (should always be present)
            session_id: sessionId, // Optional but we have it
            cwd, // Required
            tool_name: rawJi.tool_name, // Required (should always be present)
            tool_input, // Required
            access_policy: access_policy
                ? {
                      whitelist: access_policy.whitelist,
                      blacklist: access_policy.blacklist
                      // 🛡️ SECURITY: Omit shell_forbidden_patterns - backend handles this
                  }
                : undefined
        };

        console.log('🔧 [LTO] 🔄 Normalized job instruction:', {
            original: {
                hasToolUseId: !!rawJi.tool_use_id,
                hasToolCallId: !!rawJi.tool_call_id,
                hasToolInput: !!rawJi.tool_input,
                hasArgs: !!rawJi.args,
                hasCwd: !!rawJi.cwd,
                hasAccessPolicy: !!rawJi.access_policy, // Should be false
                rawAccessPolicyValue: rawJi.access_policy
            },
            normalized: {
                schema_version: normalized.schema_version,
                tool_use_id: normalized.tool_use_id,
                job_id: normalized.job_id,
                session_id: normalized.session_id,
                cwd: normalized.cwd,
                tool_name: normalized.tool_name,
                hasToolInput: !!normalized.tool_input,
                hasAccessPolicy: !!normalized.access_policy, // Should now be true if permissions exist
                accessPolicySource: 'sessionPermissionsStore'
            }
        });

        // 🚨 SECURITY WARNING: If no session permissions found, log critical warning
        if (!access_policy) {
            console.warn('🚨 [LTO] SECURITY WARNING: No session permissions found!', {
                sessionId,
                toolName: rawJi.tool_name,
                jobId: rawJi.job_id,
                recommendation: 'Tool will execute without access restrictions - this may be unsafe!',
                action: 'Check sessionPermissionsStore and ensure permissions are set for this session'
            });
        }

        return normalized;
    }

    private async executeJob(sessionId: string, rawJi: JobInstructionV1) {
        // Normalize to canonical JobInstructionV1 format for compatibility
        const ji = await this.normalizeJobInstruction(rawJi, sessionId);

        console.log('🔧 [LTO] 🎯 ENTERING executeJob:', {
            jobId: ji.job_id,
            sessionId,
            toolName: ji.tool_name,
            isNative: this.isNativeTool(ji.tool_name),
            acsApi: this.acsApi,
            timestamp: new Date().toISOString(),
            currentlyExecuting: Array.from(this.executing),
            executingCount: this.executing.size,
            stackTrace: new Error().stack?.split('\n').slice(0, 8)
        });

        // CRITICAL: Check one more time before adding to executing set
        if (this.executing.has(ji.job_id)) {
            console.log(`🔧 [LTO] ⚠️ RACE CONDITION DETECTED - Job ${ji.job_id} was added to executing set between checks!`, {
                jobId: ji.job_id,
                toolName: ji.tool_name,
                sessionId,
                timestamp: new Date().toISOString(),
                currentlyExecuting: Array.from(this.executing),
                executingCount: this.executing.size,
                stackTrace: new Error().stack?.split('\n').slice(0, 8)
            });
            return; // Exit early to prevent duplicate execution
        }

        // Mark job as executing to prevent duplicates
        console.log(`🔧 [LTO] ➕ ADDING to executing set: ${ji.job_id}`, {
            jobId: ji.job_id,
            toolName: ji.tool_name,
            sessionId,
            timestamp: new Date().toISOString(),
            beforeAdd: Array.from(this.executing),
            beforeCount: this.executing.size
        });

        this.executing.add(ji.job_id);

        console.log(`🔧 [LTO] ✅ ADDED to executing set: ${ji.job_id}`, {
            jobId: ji.job_id,
            toolName: ji.tool_name,
            sessionId,
            timestamp: new Date().toISOString(),
            afterAdd: Array.from(this.executing),
            afterCount: this.executing.size
        });

        try {
            let outcome: JobOutcomeV1;

            // Route based on tool type
            if (this.isNativeTool(ji.tool_name)) {
                console.log(`🔧 [LTO] 🦀 Executing ${ji.tool_name} via Tauri (native Rust): jid: ${ji.job_id}`);
                outcome = await this.executeNativeTool(ji);
            } else if (this.lspTools.has(ji.tool_name) || (getBaseUrl() && FALLBACK_LSP_TOOLS.has(ji.tool_name))) {
                console.log('🔧 [LTO] 🌐 Executing via LSP HTTP client');
                outcome = await this.executeLspTool(ji);
            } else {
                console.warn('[LTO] LSP unavailable – rejecting job', ji.tool_name);
                await this.sendRejectionOutcome(sessionId, ji, 'LSP HTTP unavailable');
                return; // Exit early, don't continue with posting outcome
            }

            console.log('🔧 [LTO] 📤 Posting outcome to ACS:', {
                jobId: ji.job_id,
                sessionId,
                acsApi: this.acsApi
            });

            // Forward the outcome to ACS
            await this.postOutcome(sessionId, outcome);
            console.log('🔧 [LTO] ✅ Job completed successfully:', {
                jobId: ji.job_id,
                toolName: ji.tool_name,
                timestamp: new Date().toISOString(),
                currentlyExecuting: Array.from(this.executing),
                executingCount: this.executing.size
            });
        } catch (e: any) {
            console.error(`[LTO] ❌ Job ${ji.job_id} err`, e, {
                jobId: ji.job_id,
                toolName: ji.tool_name,
                sessionId,
                timestamp: new Date().toISOString(),
                currentlyExecuting: Array.from(this.executing),
                executingCount: this.executing.size
            });

            // Create error outcome in JobOutcomeV1 format
            const errorOutcome: JobOutcomeV1 = {
                schema_version: '1.0.0',
                job_id: ji.job_id,
                tool_use_id: ji.tool_use_id,
                session_id: sessionId,
                status: 'error',
                result_payload: { error: e?.message || 'Unknown error' },
                error_message: e?.message || 'Unknown error'
            };

            await this.postOutcome(sessionId, errorOutcome);
        } finally {
            // Always remove from executing set when done
            console.log(`🔧 [LTO] ➖ REMOVING from executing set: ${ji.job_id}`, {
                jobId: ji.job_id,
                toolName: ji.tool_name,
                sessionId,
                timestamp: new Date().toISOString(),
                beforeRemove: Array.from(this.executing),
                beforeCount: this.executing.size
            });

            this.executing.delete(ji.job_id);

            console.log(`🔧 [LTO] ✅ REMOVED from executing set: ${ji.job_id}`, {
                jobId: ji.job_id,
                toolName: ji.tool_name,
                sessionId,
                timestamp: new Date().toISOString(),
                afterRemove: Array.from(this.executing),
                afterCount: this.executing.size
            });
        }
    }

    /**
     * Execute a native Rust tool via Tauri invoke
     */
    private async executeNativeTool(ji: JobInstructionV1): Promise<JobOutcomeV1> {
        if (!isTauri()) {
            throw new Error('Tauri environment not available for native tool execution');
        }

        const { invoke } = (window as any).__TAURI__.core;

        try {
            let result: any;

            // Route to specific Tauri command based on tool name
            // GLOBAL FIX: Pass cwd from job instructions to ALL Tauri commands
            console.log('🔧 [LTO] 🌍 GLOBAL CWD: Passing cwd to Tauri command:', {
                tool_name: ji.tool_name,
                cwd: ji.cwd,
                tool_input: ji.tool_input
            });

            switch (ji.tool_name) {
                case 'search_files':
                    const vaultPathSearch = useSettingsStore.getState().settings.vault.path;
                    result = await invoke('tool_search_files', {
                        input: ji.tool_input,
                        cwd: ji.cwd,
                        vault_path: vaultPathSearch
                    });
                    break;
                case 'read_files':
                    const vaultPathRead = useSettingsStore.getState().settings.vault.path;
                    result = await invoke('tool_read_files', {
                        input: ji.tool_input,
                        cwd: ji.cwd,
                        vault_path: vaultPathRead
                    });
                    break;
                case 'cat':
                    const vaultPathCat = useSettingsStore.getState().settings.vault.path;
                    result = await invoke('cat_command', {
                        input: ji.tool_input,
                        cwd: ji.cwd,
                        vault_path: vaultPathCat
                    });
                    break;
                case 'str_replace_editor':
                    const vaultPathEditor = useSettingsStore.getState().settings.vault.path;
                    result = await invoke('str_replace_editor_command', {
                        input: ji.tool_input,
                        cwd: ji.cwd,
                        vault_path: vaultPathEditor
                    });
                    break;
                case 'apply_patch':
                    console.log('🔧 [LTO] 📋 PRE-DISPATCH apply_patch:', {
                        tool_name: ji.tool_name,
                        job_id: ji.job_id,
                        session_id: ji.session_id,
                        cwd: ji.cwd,
                        input_keys: Object.keys(ji.tool_input || {}),
                        input_patch_length: ji.tool_input?.patch?.length || 0
                    });
                    const vaultPathPatch = useSettingsStore.getState().settings.vault.path;
                    result = await invoke('apply_patch_command', {
                        input: ji.tool_input,
                        cwd: ji.cwd,
                        vault_path: vaultPathPatch
                    });
                    console.log('🔧 [LTO] 📋 POST-DISPATCH apply_patch result:', {
                        job_id: ji.job_id,
                        result_type: typeof result,
                        result_keys: result && typeof result === 'object' ? Object.keys(result) : [],
                        status: result?.status,
                        has_error: !!result?.error,
                        has_message: !!result?.message
                    });
                    break;
                case 'initiate_runner_session':
                    console.log('🔧 [LTO] 🌍 GLOBAL CWD: Passing cwd to Tauri command:', {
                        tool_name: ji.tool_name,
                        cwd: ji.cwd,
                        tool_input: ji.tool_input
                    });

                    // Debug: First test what we're sending to Rust
                    try {
                        const debugResult = await invoke('debug_session_runner_input', {
                            args: ji.tool_input
                        });
                        console.log('🔧 [LTO] 🐛 Debug result:', debugResult);
                    } catch (debugError) {
                        console.error('🔧 [LTO] 🐛 Debug command failed:', debugError);
                    }

                    result = await invoke('initiate_runner_session', {
                        args: ji.tool_input
                    });
                    break;
                case 'execute_in_runner_session':
                    result = await invoke('execute_in_runner_session', {
                        args: ji.tool_input
                    });
                    break;
                case 'set_runner_session_cwd':
                    result = await invoke('set_runner_session_cwd', {
                        args: ji.tool_input
                    });
                    break;
                case 'set_runner_session_env_var':
                    result = await invoke('set_runner_session_env_var', {
                        args: ji.tool_input
                    });
                    break;
                case 'unset_runner_session_env_var':
                    result = await invoke('unset_runner_session_env_var', {
                        args: ji.tool_input
                    });
                    break;
                case 'get_runner_session_state':
                    result = await invoke('get_runner_session_state', {
                        args: ji.tool_input
                    });
                    break;
                case 'terminate_runner_session':
                    result = await invoke('terminate_runner_session', {
                        args: ji.tool_input
                    });
                    break;
                case 'start_background_os_job_in_session':
                    result = await invoke('start_background_os_job_in_session', {
                        args: ji.tool_input
                    });
                    break;
                case 'get_background_os_job_status':
                    result = await invoke('get_background_os_job_status', {
                        args: ji.tool_input
                    });
                    break;
                case 'send_signal_to_os_job':
                    result = await invoke('send_signal_to_os_job', {
                        args: ji.tool_input
                    });
                    break;
                case 'agentic_search_background':
                case 'agentic_search_files_persistent':
                    const vaultPathSearchBg = useSettingsStore.getState().settings.vault.path;
                    result = await invoke('agentic_search_background_command', {
                        input: ji.tool_input,
                        cwd: ji.cwd,
                        vault_path: vaultPathSearchBg
                    });
                    break;
                case 'search_notes':
                    const vaultPathSearchNotes = useSettingsStore.getState().settings.vault.path;
                    result = await invoke('search_notes', {
                        input: ji.tool_input,
                        cwd: ji.cwd,
                        vault_path: vaultPathSearchNotes
                    });
                    break;
                case 'my_new_tool':
                    result = await invoke('tool_my_new_tool', { input: ji.tool_input });
                    break;
                case 'tree': {
                    const vaultPathTree = useSettingsStore.getState().settings.vault.path;
                    result = await invoke('tree_command', {
                        input: ji.tool_input,
                        cwd: ji.cwd,
                        vault_path: vaultPathTree
                    });
                    break;
                }
                case 'ls': {
                    const vaultPathLs = useSettingsStore.getState().settings.vault.path;
                    result = await invoke('ls_command', {
                        input: ji.tool_input,
                        cwd: ji.cwd,
                        vault_path: vaultPathLs
                    });
                    break;
                }
                // Add more native tools here as they are implemented
                default:
                    throw new Error(`Native tool ${ji.tool_name} not implemented`);
            }

            // Normalize result_payload to match TES schema (must be an object)
            let result_payload: any;
            if (typeof result === 'string') {
                // Wrap plain string output in an object to satisfy Record<string, unknown>
                result_payload = { output: result };
            } else {
                result_payload = result;
            }

            return {
                schema_version: '1.0.0',
                job_id: ji.job_id,
                tool_use_id: ji.tool_use_id,
                session_id: ji.session_id,
                status: 'success',
                result_payload
            };
        } catch (error: any) {
            // Log the full error for debugging
            console.error('🔧 [LTO] ❌ Native tool execution error:', {
                tool_name: ji.tool_name,
                job_id: ji.job_id,
                error: error,
                error_message: error?.message,
                error_type: typeof error,
                full_error: JSON.stringify(error, null, 2)
            });

            // Special logging for apply_patch failures
            if (ji.tool_name === 'apply_patch') {
                console.error('🔧 [LTO] 📋 APPLY_PATCH INVOKE FAILED:', {
                    job_id: ji.job_id,
                    session_id: ji.session_id,
                    input_patch_length: ji.tool_input?.patch?.length || 0,
                    cwd: ji.cwd,
                    error_details: {
                        name: error?.name,
                        message: error?.message,
                        stack: error?.stack?.substring(0, 500)
                    }
                });
            }

            // Ensure error message is a string, not an object
            const error_message_string =
                typeof error === 'object' && error !== null ? error.message || JSON.stringify(error) : error?.message || 'Native tool execution failed';

            return {
                schema_version: '1.0.0',
                job_id: ji.job_id,
                tool_use_id: ji.tool_use_id,
                session_id: ji.session_id,
                status: 'error',
                result_payload: { error_message: error_message_string },
                error_message: error_message_string
            };
        }
    }

    /**
     * Execute a tool via LSP HTTP client
     */
    private async executeLspTool(ji: JobInstructionV1): Promise<JobOutcomeV1> {
        const successTemplate = {
            schema_version: '1.0.0' as const,
            job_id: ji.job_id,
            tool_use_id: ji.tool_use_id,
            session_id: ji.session_id,
            status: 'success' as const
        };

        const errorTemplate = {
            schema_version: '1.0.0' as const,
            job_id: ji.job_id,
            tool_use_id: ji.tool_use_id,
            session_id: ji.session_id,
            status: 'error' as const
        };

        try {
            const res = await lspClient.callTool(ji.tool_name, {
                project_root: ji.cwd,
                ...(ji.tool_input || {})
            });

            // Normalize result_payload to match ACS schema (must be an object)
            let result_payload: Record<string, unknown>;
            if (Array.isArray(res)) {
                // Wrap arrays in an object to satisfy ACS validation
                result_payload = { result: res };
            } else if (typeof res !== 'object' || res === null) {
                // Wrap primitives/null in an object
                result_payload = { result: res };
            } else {
                // Already an object, use as-is
                result_payload = res as Record<string, unknown>;
            }

            return { ...successTemplate, result_payload };
        } catch (e: any) {
            return { ...errorTemplate, error_message: e.message };
        }
    }

    private async postOutcome(sessionId: string, jobOutcome: any) {
        const outcomePayload = {
            session_id: sessionId,
            job_outcome: jobOutcome
        };

        console.log(`[LTO] → ACS outcome ${jobOutcome.job_id}`, outcomePayload);

        // Special logging for apply_patch outcomes
        if (
            jobOutcome.tool_name === 'apply_patch' ||
            (jobOutcome.result_payload && typeof jobOutcome.result_payload === 'object' && 'patch' in (jobOutcome.result_payload as any))
        ) {
            console.log('🔧 [LTO] 📋 APPLY_PATCH OUTCOME TO ACS:', {
                job_id: jobOutcome.job_id,
                session_id: sessionId,
                status: jobOutcome.status,
                has_result_payload: !!jobOutcome.result_payload,
                has_error_message: !!jobOutcome.error_message,
                acs_endpoint: `${this.acsApi}/acs/local-tool/result`,
                payload_size: JSON.stringify(outcomePayload).length
            });
        }

        const maxAttempts = 10;
        let attempt = 0;
        let delayMs = 500;

        while (attempt < maxAttempts) {
            attempt++;
            const startTime = Date.now();
            try {
                const response = await fetch(`${this.acsApi}/acs/local-tool/result`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify(outcomePayload)
                });

                const duration = Date.now() - startTime;
                console.log(`[LTO] ⏱️ Post outcome attempt ${attempt} took ${duration}ms`);

                if (!response.ok) {
                    const errorText = await response.text();

                    // Special error logging for apply_patch
                    if (
                        jobOutcome.tool_name === 'apply_patch' ||
                        (jobOutcome.result_payload && typeof jobOutcome.result_payload === 'object' && 'patch' in (jobOutcome.result_payload as any))
                    ) {
                        console.error('🔧 [LTO] 📋 APPLY_PATCH ACS POST FAILED:', {
                            job_id: jobOutcome.job_id,
                            session_id: sessionId,
                            http_status: response.status,
                            http_status_text: response.statusText,
                            error_text: errorText,
                            acs_endpoint: `${this.acsApi}/acs/local-tool/result`,
                            attempt,
                            duration_ms: duration
                        });
                    }

                    if (attempt < maxAttempts) {
                        console.warn(`[LTO] Attempt ${attempt}/${maxAttempts} failed with status ${response.status}. Retrying in ${delayMs}ms`);
                        await new Promise(r => setTimeout(r, delayMs));
                        delayMs *= 2;
                        continue;
                    }

                    throw new Error(`ACS HTTP ${response.status}: ${response.statusText} - ${errorText}`);
                }

                const result = await response.json();

                // Special success logging for apply_patch
                if (
                    jobOutcome.tool_name === 'apply_patch' ||
                    (jobOutcome.result_payload && typeof jobOutcome.result_payload === 'object' && 'patch' in (jobOutcome.result_payload as any))
                ) {
                    console.log('🔧 [LTO] 📋 APPLY_PATCH ACS POST SUCCESS:', {
                        job_id: jobOutcome.job_id,
                        session_id: sessionId,
                        acs_response: result,
                        status: jobOutcome.status,
                        attempt,
                        duration_ms: duration
                    });
                }

                // Success – exit the retry loop
                break;
            } catch (error) {
                const duration = Date.now() - startTime;
                console.error(`[LTO] ❌ Post outcome attempt ${attempt} exception after ${duration}ms:`, error);

                // Special error logging for apply_patch
                if (
                    jobOutcome.tool_name === 'apply_patch' ||
                    (jobOutcome.result_payload && typeof jobOutcome.result_payload === 'object' && 'patch' in (jobOutcome.result_payload as any))
                ) {
                    console.error('🔧 [LTO] 📋 APPLY_PATCH ACS POST EXCEPTION:', {
                        job_id: jobOutcome.job_id,
                        session_id: sessionId,
                        error_message: error instanceof Error ? error.message : 'Unknown error',
                        error_type: typeof error,
                        attempt,
                        duration_ms: duration
                    });
                }

                if (attempt < maxAttempts) {
                    console.warn(`[LTO] Attempt ${attempt}/${maxAttempts} threw an exception. Retrying in ${delayMs}ms`);
                    await new Promise(r => setTimeout(r, delayMs));
                    delayMs *= 2;
                    continue;
                }

                console.error(`[LocalToolOrchestrator] Failed to post outcome for job ${jobOutcome.job_id} after ${maxAttempts} attempts.`);
                // No further retries – exit loop
                break;
            }
        }
    }
}
