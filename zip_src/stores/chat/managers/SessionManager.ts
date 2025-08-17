import * as ChatService from '@/services/supabase/chatService';
import * as ChatApi from '@/api/chatApi';
import { useAgentConfigStore } from '@/stores/agentConfigStore';
import { getUserName } from '@/utils/userPreferences';
// import { OrchestraSCM } from '@/services/scm/trimmed/OrchestraSCM';
import type { 
    ChatSession, 
    SessionMeta, 
    DbNewChatSession,
    ChatMessage,
    ChatRole
} from '@/types/chatTypes';
import type { AgentConfigBE } from '@/types/agent';
import type { ChatStoreState, StateSetter } from '../state/chatState';

export class SessionManager {
    constructor(
        private getState: () => ChatStoreState,
        private setState: StateSetter
    ) {}

    async createSession(
        agentIdentifierForACS: string,    // Will now receive the human-readable name from LandingPage.tsx
        sessionDisplayName = 'New Chat', // Will now receive "Chat with {AgentName}" from LandingPage.tsx
        templateOverrides = {}
    ): Promise<string> {
        console.log(`[SessionManager] Creating session with agent identifier (name) "${agentIdentifierForACS}" and display name "${sessionDisplayName}"`);
        
        try {
            // 1. Create session in backend (which also creates it in Supabase)
// 2. Restore session context in backend  
// 3. Update session with additional metadata
// 4. Update store state
            const liveSession = await ChatApi.startChatSession({
                name: sessionDisplayName,       // Now "Chat with {AgentName}"
                agentId: agentIdentifierForACS, // Now human-readable name, e.g., "General"
                avatar: templateOverrides.avatar || 'assets/robots/robot1.png'
            });
            
            const sessionId = liveSession.id;
            console.log(`[SessionManager] Backend session created with ID: ${sessionId}`);

            // 2. Restore session context in backend
            try {
                await this.restoreBackendSession(sessionId, agentIdentifierForACS, true); // Pass true for isNewSession
                console.log(`[SessionManager] Session ${sessionId} context restoration attempt (with isNewSession=true) finished.`);
            } catch (restoreError) {
                console.error(`[SessionManager] Failed to restore session ${sessionId} context in backend:`, restoreError);
                // Don't throw here - session was created successfully, restoration can be retried later
            }

            // 3. Prepare session data for Supabase
            const now = Date.now();
            const userId = getUserName();
            
            const baseSessionDetails = {
                name: sessionDisplayName,
                avatar: 'assets/robots/robot1.png',
                specialty: 'General Assistant',
                model: 'gpt-4o-mini',
                tools: [],
                systemPrompt: 'You are a helpful assistant.',
                temperature: 0.7,
                ...templateOverrides
            };

            const supabaseSessionData: DbNewChatSession = {
                id: sessionId,
                name: baseSessionDetails.name!,
                avatar_url: baseSessionDetails.avatar!,
                agent_config_id: agentIdentifierForACS,
                user_id: userId,
                metadata: {
                    specialty: baseSessionDetails.specialty,
                    model: baseSessionDetails.model,
                    tools: baseSessionDetails.tools,
                    systemPrompt: baseSessionDetails.systemPrompt,
                    temperature: baseSessionDetails.temperature
                }
            };



            // 3. Update session with additional metadata
            try {
                await ChatService.updateChatSession(sessionId, {
                    name: baseSessionDetails.name!,
                    avatar: baseSessionDetails.avatar!,
                    specialty: baseSessionDetails.specialty!,
                    model: baseSessionDetails.model!,
                    tools: baseSessionDetails.tools!,
                    systemPrompt: baseSessionDetails.systemPrompt,
                    temperature: baseSessionDetails.temperature,
                    lastUpdated: now
                });
                console.log(`[SessionManager] Session ${sessionId} metadata updated in Supabase`);
            } catch (updateError) {
                console.error(`[SessionManager] Failed to update session ${sessionId} metadata:`, updateError);
                // Don't throw here - session was created successfully, metadata update is secondary
            }

            // 4. Update store state
            const sessionMeta: SessionMeta = {
                id: sessionId,
                name: baseSessionDetails.name!,
                avatar: baseSessionDetails.avatar!,
                lastUpdated: now,
                unreadCount: 0
            };

            const chatSession: ChatSession = {
                id: sessionId,
                name: baseSessionDetails.name!,
                avatar: baseSessionDetails.avatar!,
                specialty: baseSessionDetails.specialty!,
                messages: [],
                model: baseSessionDetails.model!,
                tools: baseSessionDetails.tools!,
                createdAt: now,
                lastUpdated: now,
                systemPrompt: baseSessionDetails.systemPrompt,
                temperature: baseSessionDetails.temperature,
                agent_config_id: agentIdentifierForACS,
                user_id: userId
            };

            this.setState(state => ({
                sessions: { ...state.sessions, [sessionId]: sessionMeta },
                chats: { ...state.chats, [sessionId]: chatSession },
                currentSessionId: sessionId
            }));

            // 5. Create SCM checkpoint if non-default CWD is provided in template
            if (templateOverrides.agent_cwd && templateOverrides.agent_cwd.trim() !== '') {
                try {
                    console.log(`[SessionManager] Creating SCM checkpoint for session ${sessionId} with CWD: ${templateOverrides.agent_cwd}`);
                    // const scm = await OrchestraSCM.create();
                    // const checkpointHash = await scm.checkpoint(templateOverrides.agent_cwd, `Session created: ${baseSessionDetails.name}`);
                    const checkpointHash = 'mock-checkpoint-hash';
                    
                    if (checkpointHash !== 'no-changes') {
                        console.log(`[SessionManager] ✅ Created SCM checkpoint ${checkpointHash.substring(0, 8)} for session ${sessionId}`);
                    } else {
                        console.log(`[SessionManager] No changes to checkpoint for session ${sessionId}`);
                    }
                } catch (scmError) {
                    console.error(`[SessionManager] Failed to create SCM checkpoint for session ${sessionId}:`, scmError);
                    // Don't throw here - session was created successfully, SCM checkpoint is optional
                }
            } else {
                console.log(`[SessionManager] Skipping SCM checkpoint for session ${sessionId} - no agent_cwd provided in template`);
            }

            console.log(`[SessionManager] Session ${sessionId} created successfully`);
            return sessionId;

        } catch (error) {
            console.error(`[SessionManager] Failed to create session:`, error);
            throw error;
        }
    }

    async deleteSession(sessionId: string): Promise<void> {
        console.log(`[SessionManager] Deleting session ${sessionId}`);
        
        try {
            // 1. Delete from Supabase
            await ChatService.deleteChatSession(sessionId);
            console.log(`[SessionManager] Session ${sessionId} deleted from Supabase`);

            // 2. Update store state
            this.setState(state => {
                const { [sessionId]: _, ...remainingSessions } = state.sessions;
                const { [sessionId]: __, ...remainingChats } = state.chats;
                
                let newCurrentSessionId = state.currentSessionId;
                if (newCurrentSessionId === sessionId) {
                    const sessionIds = Object.keys(remainingSessions);
                    newCurrentSessionId = sessionIds.length > 0 ? sessionIds[0] : undefined;
                }
                
                return {
                    sessions: remainingSessions,
                    chats: remainingChats,
                    currentSessionId: newCurrentSessionId
                };
            });

            console.log(`[SessionManager] Session ${sessionId} deleted successfully`);
        } catch (error) {
            console.error(`[SessionManager] Failed to delete session ${sessionId}:`, error);
            throw error;
        }
    }

    async restoreBackendSession(sessionId: string, agentIdentifierForACS: string, isNewSession: boolean = false): Promise<void> { // Signature updated
        // Use isNewSession flag to skip for new sessions.
        if (isNewSession) {
            console.warn(`[SessionManager] restoreBackendSession: Skipped legacy backend restore for new session ${sessionId} (isNewSession: true). Context will be sent with the first stateless message.`);
            return; // Prevent calling the problematic sendChatMessageWithMetadata
        }

        // --- Existing restoreBackendSession logic below this line in SessionManager.ts remains unchanged ---
        console.log(`[SessionManager] restoreBackendSession: Proceeding with legacy restore for session ${sessionId} (isNewSession: false).`);
        console.log(`[SessionManager] Restoring backend session ${sessionId} with agent identifier ${agentIdentifierForACS}`);
        
        try {
            // Get the agent config by name (since we now receive human-readable names)
            const agentConfig = useAgentConfigStore.getState().getAgentConfigByName(agentIdentifierForACS);
            if (!agentConfig) {
                throw new Error(`Agent config with name "${agentIdentifierForACS}" not found`);
            }

            // Original normalizedAgentConfig logic (commented out for diagnostic)
            // const normalizedAgentConfig = {
            //     ...agentConfig,
            //     tool_groups: (agentConfig.tool_groups || []).map(tg => ({
            //         ...tg,
            //         type: (tg as any).type ?? (tg as any).group_type ?? 'CUSTOM',
            //         // Ensure init_args are handled, potentially simplified if they are very complex
            //         init_args: tg.init_args || {}
            //     }))
            // };

            const SUSPECT_TOOL_GROUPS_FOR_INIT_ARGS = ["git", "webscraping", "exa"];

            // --- DIAGNOSTIC STEP: Create a simplified agent config ---
            const simplifiedAgentConfig = {
                id: agentConfig.id,
                version: agentConfig.version || '1.0.0-diag',
                name: agentConfig.name, 
                ai_config: {
                    model_id: agentConfig.ai_config?.model_id || 'unknown-model',
                    provider_name: agentConfig.ai_config?.provider_name || 'unknown-provider',
                    temperature: agentConfig.ai_config?.temperature ?? 0.7,
                },
                agent: {
                    name: agentConfig.agent?.name || agentConfig.name || 'Unknown Agent Name',
                    specialty: agentConfig.agent?.specialty || 'Unknown Specialty',
                    description: agentConfig.agent?.description?.substring(0,100) || 'Default description...',
                    system_prompt: agentConfig.agent?.system_prompt?.substring(0, 100) || 'Default prompt...',
                },
                // const SUSPECT_TOOL_GROUPS_FOR_INIT_ARGS = ["git", "webscraping", "exa"]; // Remove or comment out if not needed for this revert

                // --- DIAGNOSTIC STEP: Revert to ENHANCED simplified agent config ---
                tool_groups: (agentConfig.tool_groups || []).map(tg => {
                    // Logic for selectively overriding init_args can be kept or removed.
                    // For a full revert to the "ENHANCED" state before selective nullification, ensure original init_args are used.
                    // let currentInitArgs = tg.init_args || null;
                    // if (SUSPECT_TOOL_GROUPS_FOR_INIT_ARGS.includes(tg.name)) {
                    //    console.log(`[SessionManager] DIAGNOSTIC: Overriding init_args for suspect tool group: ${tg.name} to {}`);
                    //    currentInitArgs = {};
                    // }
                    return {
                        name: tg.name,
                        type: (tg as any).type ?? tg.group_type ?? 'CUSTOM',
                        init_args: tg.init_args || null, // Send original init_args or null
                        tools: (tg.tools || []).map(t => ({
                            name: t.name,
                            description: t.description || '',
                            input_schema: t.input_schema || null,
                            requires_human_approval_to_execute: t.requires_human_approval_to_execute ?? false,
                        })),
                    };
                }),
            };
            console.log(`[SessionManager] DIAGNOSTIC: Using REVERTED ENHANCED agent_config for restoration:`, JSON.stringify(simplifiedAgentConfig, null, 2));
            // --- END DIAGNOSTIC STEP ---

            const restorationMetadata = {
                restore_session: {
                    session_id: sessionId,
                    // agent_config: normalizedAgentConfig // Original
                    agent_config: simplifiedAgentConfig // DIAGNOSTIC: Use simplified version
                }
            };
            
            console.log(`[SessionManager] Prepared restorationMetadata for session ${sessionId}. Payload keys: ${Object.keys(restorationMetadata.restore_session.agent_config).join(', ')}`);
            console.log(`[SessionManager] Size of simplified agent_config (JSON string): ${JSON.stringify(simplifiedAgentConfig).length}`);
            console.log(`[SessionManager] Calling ChatApi.sendChatMessageWithMetadata for session ${sessionId}...`);

            await ChatApi.sendChatMessageWithMetadata(sessionId, [], restorationMetadata);
            
            console.log(`[SessionManager] Session ${sessionId} restoration request successfully sent to backend`);
            
        } catch (error) {
            console.error(`[SessionManager] Failed to restore backend session ${sessionId}:`, error);
            console.error(`[SessionManager] Restore error details:`, {
                message: (error as Error).message,
                stack: (error as Error).stack,
                name: (error as Error).name
            });
            throw error; // Re-throw to be caught by createSession's try/catch if it exists there
        }
    }

    async loadSessionFromSupabase(sessionId: string): Promise<ChatSession | null> {
        console.log(`[SessionManager] Loading session ${sessionId} from Supabase`);
        
        try {
            const fullSession = await ChatService.getChatSession(sessionId, { messageLimit: 20 });
            
            if (fullSession && fullSession.agent_config_id) {
                // Add session to store
                const sessionMeta: SessionMeta = {
                    id: fullSession.id,
                    name: fullSession.name,
                    avatar: fullSession.avatar,
                    lastUpdated: fullSession.lastUpdated,
                    unreadCount: 0
                };
                
                this.setState(state => ({
                    sessions: { ...state.sessions, [sessionId]: sessionMeta },
                    chats: { ...state.chats, [sessionId]: fullSession }
                }));
                
                console.log(`[SessionManager] Session ${sessionId} loaded from Supabase`);
                return fullSession;
            }
            
            return null;
        } catch (error) {
            console.error(`[SessionManager] Failed to load session ${sessionId} from Supabase:`, error);
            throw error;
        }
    }

    setCurrentSession(sessionId: string): void {
        this.setState({ currentSessionId: sessionId });
    }

    getCurrentSession(): ChatSession | undefined {
        const state = this.getState();
        return state.currentSessionId ? state.chats[state.currentSessionId] : undefined;
    }

    getSession(sessionId: string): ChatSession | undefined {
        return this.getState().chats[sessionId];
    }

    getAllSessions(): Record<string, ChatSession> {
        return this.getState().chats;
    }

    getSessionMetas(): Record<string, SessionMeta> {
        return this.getState().sessions;
    }

    /**
     * Create SCM checkpoint for session if it has a non-default CWD
     * This should be called when a session's agent_cwd is set or updated
     */
    async createSessionCheckpoint(sessionId: string, message: string): Promise<void> {
        const session = this.getState().chats[sessionId];
        if (!session) {
            console.warn(`[SessionManager] Cannot create checkpoint - session ${sessionId} not found`);
            return;
        }

        if (session.agent_cwd && session.agent_cwd.trim() !== '') {
            try {
                console.log(`[SessionManager] Creating SCM checkpoint for session ${sessionId} with CWD: ${session.agent_cwd}`);
                // const scm = await OrchestraSCM.create();
                // const checkpointHash = await scm.checkpoint(session.agent_cwd, message);
                const checkpointHash = 'mock-checkpoint-hash';
                
                if (checkpointHash !== 'no-changes') {
                    console.log(`[SessionManager] ✅ Created SCM checkpoint ${checkpointHash.substring(0, 8)} for session ${sessionId}`);
                } else {
                    console.log(`[SessionManager] No changes to checkpoint for session ${sessionId}`);
                }
            } catch (scmError) {
                console.error(`[SessionManager] Failed to create SCM checkpoint for session ${sessionId}:`, scmError);
                // Don't throw here - SCM checkpoint is optional
            }
        } else {
            console.log(`[SessionManager] Skipping SCM checkpoint for session ${sessionId} - no agent_cwd set`);
        }
    }
}