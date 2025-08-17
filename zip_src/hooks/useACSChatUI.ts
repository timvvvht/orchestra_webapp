/**
 * ⚠️ DEPRECATED: This hook has been refactored into smaller, modular hooks
 *
 * 🚀 USE INSTEAD: import { useACSChatUIRefactored as useACSChatUI } from '@/hooks/acs-chat'
 *
 * This monolithic hook (1,958 lines) has been broken down into:
 * - useACSClient (client management)
 * - useACSChatSessions (session CRUD)
 * - useACSChatMessages (message handling + SSE)
 * - useACSChatStreaming (real-time communication)
 * - useACSChatUIRefactored (orchestrator - drop-in replacement)
 *
 * Benefits of new architecture:
 * - 66% reduction in code size (1,958 → 670 lines total)
 * - 90% reduction in dependencies (50+ → 3-5 per hook)
 * - Individual hooks are testable in isolation
 * - Better performance with focused memoization
 * - Easier maintenance and debugging
 *
 * Migration: Simply change the import - it's 100% backward compatible!
 *
 * @deprecated Use useACSChatUIRefactored from @/hooks/acs-chat instead
 */

import { useEffect, useCallback, useMemo, useState, useRef } from 'react';
/* eslint-disable react-hooks/exhaustive-deps */
import { eventBus } from '@/services/acs/eventBus';
import { useNavigate, useParams } from 'react-router-dom';
import { createOrchestACSClient, getDefaultACSClient } from '@/services/acs';
import { useBYOKStore } from '@/stores/byokStore';
import type { OrchestACSClient, SSEEvent, SessionSummary, SessionDetails } from '@/services/acs';
import type { ACSAgentConfig } from '@/services/acs/agent-configs';
import type { ChatMessage } from '@/types/chatTypes';
import { ChatRole } from '@/types/chatTypes';
import type { AgentConfigTS } from '@/types/agentTypes';
import type { UnifiedTimelineEvent } from '@/types/unifiedTimeline';
import { useAuth } from '@/auth/AuthContext';
import { supabase } from '@/auth/SupabaseClient';
import { useLocalTool } from '@/hooks/useLocalTool';
import { mergeSSEEventIntoMessages, clearEventMergerSeenIds } from '@/utils/eventMerger';
import { useMessagesStore } from '@/store/messagesStore';
import { useChatCoreStore } from '@/store/chatCoreStore';

// Helper function to safely parse JSON content or return if already an object
function getSafelyParsedJson(content: any, contextLabel: string = 'JSON content'): object {
    if (content === null || content === undefined) {
        return {}; // Return empty object if content is null or undefined
    }
    if (typeof content === 'string') {
        if (content.trim() === '') {
            return {}; // Return empty object for empty strings
        }
        try {
            return JSON.parse(content);
        } catch (e) {
            console.error(`Failed to parse JSON string for ${contextLabel}:`, content, e);
            return { parse_error: `Invalid JSON content in ${contextLabel}`, original_content: content };
        }
    } else if (typeof content === 'object') {
        return content; // It's already an object
    }
    console.warn(`Unexpected type for ${contextLabel} (expected string or object, got ${typeof content}):`, content);
    return { unexpected_type_error: `Unexpected content type in ${contextLabel}`, original_content: content };
}

/**
 * Converts ACS agent config format to Orchestra format
 */
function convertACSToOrchestra(acsConfig: ACSAgentConfig): AgentConfigTS {
    return {
        id: acsConfig.id || acsConfig.name, // Use ID or name as fallback
        name: acsConfig.display_name || acsConfig.name,
        description: acsConfig.description || '',
        agent: {
            name: acsConfig.name,
            system_prompt: acsConfig.system_prompt || '',
            model: acsConfig.model_id || 'gpt-4',
            temperature: acsConfig.temperature || 0.7,
            max_tokens: acsConfig.max_tokens || 2000
        },
        ai_config: {
            model: acsConfig.model_id || 'gpt-4',
            provider_name: acsConfig.provider_name || 'openai',
            temperature: acsConfig.temperature || 0.7,
            max_tokens: acsConfig.max_tokens || 2000
        },
        tool_groups: [], // ACS doesn't have tool groups in the same format
        userId: acsConfig.user_id || 'system', // Use user_id if available
        createdAt: acsConfig.created_at || new Date().toISOString(),
        updatedAt: acsConfig.updated_at || new Date().toISOString(),
        isPublic: acsConfig.is_public !== undefined ? acsConfig.is_public : true,
        publisher: 'ACS',
        publisherId: 'acs-system'
    };
}

/**
 * Configuration options for the ACS Chat UI hook
 */
export interface UseACSChatUIOptions {
    /** Auto-initialize the ACS client on mount */
    autoInitialize?: boolean;
    /** Auto-connect to streaming for the current session */
    autoConnectStreaming?: boolean;
    /** Default agent configuration to use */
    defaultAgentConfigName?: string;
    /** Default agent configuration ID to use */
    defaultAgentConfigId?: string;
    /** User ID for session management */
    userId?: string;
    /** Custom ACS client instance */
    acsClient?: OrchestACSClient;
    /** Enable debug logging */
    debug?: boolean;
    /** Custom streaming service factory for debug/testing */
    streamingServiceFactory?: () => any;
}

/**
 * Return type for the ACS Chat UI hook
 */
export interface UseACSChatUIReturn {
    // Client state
    isInitialized: boolean;
    isAuthenticated: boolean;
    isConnected: boolean;
    connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';

    // Session state
    currentSessionId: string | undefined;
    currentSession: SessionDetails | undefined;
    sessions: SessionSummary[];

    // Message state
    messages: ChatMessage[];
    isLoading: boolean;
    hasStreamingMessage: boolean;

    // Agent config state
    agentConfigs: AgentConfigTS[];
    currentAgentConfigId: string | undefined;
    currentAgentConfig: AgentConfigTS | undefined;

    // User state
    user: any;

    // Actions
    initialize: () => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;

    // Session actions
    createSession: (name?: string, agentConfigId?: string) => Promise<string>;
    switchToSession: (sessionId: string) => Promise<void>;
    deleteSession: (sessionId: string) => Promise<void>;
    renameSession: (sessionId: string, newName: string) => Promise<void>;

    // Message actions
    sendMessage: (
        message: string,
        options?: {
            agentConfigName?: string;
            agentConfigId?: string;
            modelApiKeys?: Record<string, string>;
        }
    ) => Promise<void>;
    startConversation: (
        message: string,
        options?: {
            sessionName?: string;
            agentConfigName?: string;
            agentConfigId?: string;
            modelApiKeys?: Record<string, string>;
            /**
             * Fast mode (default: true) - Returns sessionId immediately after creation,
             * allowing UI to navigate while SSE connection and session loading happen in background.
             * Set to false for synchronous behavior where all operations complete before returning.
             */
            fast?: boolean;
            /**
             * Optimistic mode - Shows user message immediately and creates placeholder session
             * before real ACS call completes. Used for instant UI feedback.
             */
            optimistic?: boolean;
            /**
             * Temp session ID - Only used when optimistic=true. The temporary session ID
             * that will be replaced with the real session ID after ACS responds.
             */
            tempSessionId?: string;
        }
    ) => Promise<string>;

    // Agent config actions
    loadAgentConfigs: () => Promise<void>;
    setCurrentAgentConfig: (agentConfigId: string) => void;
    createAgentConfig: (config: Omit<ACSAgentConfig, 'id' | 'created_at' | 'updated_at'>) => Promise<string>;
    updateAgentConfig: (id: string, updates: Partial<ACSAgentConfig>) => Promise<void>;
    deleteAgentConfig: (id: string) => Promise<void>;

    // Streaming actions
    connectStreaming: (sessionId: string) => Promise<void>;
    disconnectStreaming: () => Promise<void>;

    // Navigation helpers
    navigateToSession: (sessionId: string) => void;
    navigateToChat: () => void;

    // Utility
    refresh: () => Promise<void>;
    getHealthStatus: () => Promise<any>;

    // Error state
    error: string | null;
    clearError: () => void;

    // ACS Client access (for debug purposes)
    acsClient: OrchestACSClient;

    // SSE Events for debug panel
    sseEvents: SSEEvent[];
    
    // Conversation cancellation
    cancelCurrentConversation: () => Promise<void>;
}

/**
 * React hook for ACS-powered chat UI
 * Provides a complete interface for chat functionality using ACS endpoints
 */
export const useACSChatUI = (options: UseACSChatUIOptions = {}): UseACSChatUIReturn => {
    const {
        autoInitialize = true,
        autoConnectStreaming = true,
        defaultAgentConfigName = 'general',
        defaultAgentConfigId,
        userId,
        acsClient: customClient,
        debug = false,
        streamingServiceFactory
    } = options;

    // 🚨 DEBUG: Generate unique instance ID to track multiple instances
    const instanceId = useMemo(() => Math.random().toString(36).substr(2, 9), []);
    console.log(`🆔 [useACSChatUI] Instance created: ${instanceId}`, { autoInitialize, autoConnectStreaming, userId });

    const navigate = useNavigate();
    const { sessionId: urlSessionId } = useParams<{ sessionId?: string }>();

    // Get auth context for Supabase OAuth integration
    const auth = useAuth();

    // Determine effective user ID (Supabase user ID takes precedence)
    const effectiveUserId = auth.user?.id || userId;

    // Get or create ACS client
    const acsClient = useMemo(() => {
        if (customClient) {
            return customClient;
        }

        // If we have a custom streaming service factory, create a custom client
        if (streamingServiceFactory) {
            console.log('🎭 [useACSChatUI] Creating custom ACS client with streaming service factory');
            return createOrchestACSClient({}, streamingServiceFactory);
            // SSE events from Zustand store
            const sseEvents = useMessagesStore(state => state.sseEvents);
        }

        return getDefaultACSClient();
    }, [customClient, streamingServiceFactory]);

    // State from Zustand stores
    const isInitialized = useChatCoreStore(state => state.isInitialized);
    const setIsInitialized = useChatCoreStore(state => state.setInitialized);
    const isConnected = useChatCoreStore(state => state.isConnected);
    const setIsConnected = useChatCoreStore(state => state.setConnected);
    const connectionStatus = useChatCoreStore(state => state.connectionStatus);
    const setConnectionStatus = useChatCoreStore(state => state.setConnectionStatus);

    // Keep isAuthenticated as local state for now (not in store yet)
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Session state from Zustand store
    const currentSessionId = useChatCoreStore(state => state.currentSessionId);
    const setCurrentSessionId = useChatCoreStore(state => state.setCurrentSessionId);
    const currentSession = useChatCoreStore(state => state.currentSession);
    const setCurrentSession = useChatCoreStore(state => state.setCurrentSession);
    const sessions = useChatCoreStore(state => state.sessions);
    const setSessions = useChatCoreStore(state => state.setSessions);

    console.log(`🚨 [SESSION] Instance ${instanceId} - Session state:`, {
        urlSessionId,
        currentSessionId,
        isAuthenticated,
        effectiveUserId,
        timestamp: new Date().toISOString()
    });

    // Initialize local tool execution hook with session context
    const { handleLocalToolJob } = useLocalTool(
        currentSessionId,
        {}, // default config
        currentSession?.agent_cwd // 👈 PASS SESSION'S WORKING DIRECTORY
    );
    // Session state moved to Zustand store above
    // Messages state now from Zustand store
    const messages = useMessagesStore(state => state.messages);
    const setMessages = useMessagesStore(state => state.setMessages);
    const isLoading = useMessagesStore(state => state.isLoading);
    const setIsLoading = useMessagesStore(state => state.setLoading);
    const hasStreamingMessage = useMessagesStore(state => state.hasStreamingMessage);
    const setHasStreamingMessage = useMessagesStore(state => state.setStreamingMessage);
    // Agent config state from Zustand store
    const agentConfigs = useChatCoreStore(state => state.agentConfigs);
    const setAgentConfigs = useChatCoreStore(state => state.setAgentConfigs);
    const currentAgentConfigId = useChatCoreStore(state => state.currentAgentConfigId);
    const setCurrentAgentConfigId = useChatCoreStore(state => state.setCurrentAgentConfigId);
    const currentAgentConfig = useChatCoreStore(state => state.currentAgentConfig);
    const setCurrentAgentConfig = useChatCoreStore(state => state.setCurrentAgentConfig);

    // Initialize store with URL session ID
    useEffect(() => {
        if (urlSessionId && currentSessionId !== urlSessionId) {
            setCurrentSessionId(urlSessionId);
        }
    }, [urlSessionId, currentSessionId, setCurrentSessionId]);

    // Initialize store with default agent config ID
    useEffect(() => {
        if (defaultAgentConfigId && !currentAgentConfigId) {
            setCurrentAgentConfigId(defaultAgentConfigId);
        }
    }, [defaultAgentConfigId, currentAgentConfigId, setCurrentAgentConfigId]);

    const [user, setUser] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    // SSE events now from Zustand store
    const sseEvents = useMessagesStore(state => state.sseEvents);
    const pushSseEvent = useMessagesStore(state => state.pushSseEvent);

    // Debug: Log SSE events state changes (development only)
    useEffect(() => {
        if (debug) {
            console.log('🔍 [useACSChatUI] SSE events state changed:', {
                count: sseEvents.length,
                events: sseEvents,
                timestamp: new Date().toISOString()
            });
        }
    }, [sseEvents, debug]);

    // Computed values (currentAgentConfig now comes from store)

    // Helper function to ensure firehose connection
    const ensureFirehose = useCallback(async () => {
        if (!auth.user) return;
        const {
            data: { session }
        } = await supabase.auth.getSession();
        const jwt = session?.access_token;
        if (!jwt) return;
        acsClient.streaming.connectPrivate(auth.user.id, jwt); // idempotent
    }, [auth.user, acsClient.streaming]);

    // Initialize the client with Supabase OAuth integration
    const initialize = useCallback(async () => {
        console.log('🚀 [useACSChatUI] Starting initialization...');
        console.log('🔐 [useACSChatUI] Auth state:', {
            authAuthenticated: auth.isAuthenticated,
            authUser: auth.user?.email,
            effectiveUserId,
            userId
        });

        try {
            setIsLoading(true);
            setError(null);
            setConnectionStatus('connecting');

            console.log('🔧 [useACSChatUI] Initializing ACS client with Supabase OAuth integration...');

            // Check if user is authenticated via Supabase OAuth
            if (auth.isAuthenticated && auth.user) {
                console.log('✅ [useACSChatUI] User authenticated via Supabase OAuth:', auth.user.email);

                // AuthContext now handles token setting centrally, so we just verify the client has a token
                const currentToken = acsClient.getAuthToken();
                console.log('🔑 [useACSChatUI] Checking ACS client auth status:', {
                    hasToken: !!currentToken,
                    tokenLength: currentToken?.length,
                    userId: auth.user.id
                });

                if (currentToken) {
                    console.log('✅ [useACSChatUI] ACS client already authenticated via AuthContext');

                    setIsAuthenticated(true);
                    setUser({
                        id: auth.user.id,
                        email: auth.user.email,
                        name: auth.user.user_metadata?.full_name || auth.user.email
                    });

                    console.log('✅ [useACSChatUI] ACS client authenticated with Supabase token');

                    // Connect user-specific streaming for local tool events
                    await ensureFirehose();

                    // Load sessions and agent configs
                    console.log('📂 [useACSChatUI] Loading sessions and agent configs...');
                    await Promise.all([loadSessions(), loadAgentConfigs()]);
                } else {
                    console.warn('⚠️ [useACSChatUI] No auth token available in ACS client - AuthContext may not have set it yet');
                    setIsAuthenticated(false);
                }
            } else {
                console.log('🔄 [useACSChatUI] No Supabase authentication found, trying legacy ACS auth...');

                // Fallback to legacy ACS authentication
                const result = await acsClient.initialize();

                console.log('🔄 [useACSChatUI] Legacy ACS auth result:', {
                    authenticated: result.authenticated,
                    hasUser: !!result.user,
                    userId: result.user?.id
                });

                setIsAuthenticated(result.authenticated);
                if (result.user) {
                    setUser(result.user);
                }

                if (result.authenticated) {
                    console.log('📂 [useACSChatUI] Loading sessions and agent configs (legacy auth)...');
                    // Load sessions and agent configs
                    await Promise.all([loadSessions(), loadAgentConfigs()]);
                }
            }

            setIsInitialized(true);
            setIsConnected(true);
            setConnectionStatus('connected');

            console.log('🎉 [useACSChatUI] Initialization complete!', {
                isAuthenticated,
                hasUser: !!user,
                sessionsCount: sessions.length,
                agentConfigsCount: agentConfigs.length
            });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Initialization failed';
            setError(errorMessage);
            setConnectionStatus('error');
            console.error('❌ [useACSChatUI] Initialization error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [acsClient, auth.isAuthenticated, auth.user, debug]);

    // Load sessions
    const loadSessions = useCallback(async () => {
        console.log('📂 [useACSChatUI] Loading sessions...');
        try {
            const response = await acsClient.sessions.listSessions({
                limit: 100,
                includeMessageCount: false
            });
            console.log('📂 [useACSChatUI] Sessions loaded:', response.data.sessions.length);
            setSessions(response.data.sessions);
        } catch (err) {
            console.error('❌ [useACSChatUI] Failed to load sessions:', err);
        }
    }, [acsClient]);

    // Load agent configurations
    const loadAgentConfigs = useCallback(async () => {
        console.log('🤖 [useACSChatUI] Loading agent configurations...');
        try {
            const acsConfigs = await acsClient.agentConfigs.getAgentConfigs();

            console.log('🤖 [useACSChatUI] Raw ACS configs:', acsConfigs);

            // Handle case where ACS server doesn't return configs properly yet
            if (!acsConfigs || !Array.isArray(acsConfigs)) {
                console.warn('🤖 [useACSChatUI] ACS server returned invalid agent configs, using fallback');
                // Use a basic fallback config
                const fallbackConfigs = [
                    {
                        id: 'general',
                        name: 'General Assistant',
                        description: 'A helpful AI assistant for general tasks',
                        agent: {
                            name: 'general',
                            model: 'gpt-4',
                            tools: [],
                            systemPrompt: 'You are a helpful AI assistant.'
                        }
                    }
                ];
                setAgentConfigs(fallbackConfigs);
                if (!currentAgentConfigId) {
                    setCurrentAgentConfigId('general');
                }
                console.log('🤖 [useACSChatUI] Using fallback agent configuration');
                return;
            }

            // Convert ACS agent configs to Orchestra format
            const orchestraConfigs = acsConfigs.map(convertACSToOrchestra);

            setAgentConfigs(orchestraConfigs);

            // Set default agent config if none is selected
            if (!currentAgentConfigId && orchestraConfigs.length > 0) {
                // Prefer 'general' config if available
                const generalConfig = orchestraConfigs.find(config => config.agent.name.toLowerCase() === 'general' || config.id.toLowerCase() === 'general');
                const defaultConfig = generalConfig || orchestraConfigs[0];
                setCurrentAgentConfigId(defaultConfig.id);
                console.log('🤖 [useACSChatUI] Set default agent config:', defaultConfig.id);
            }

            console.log('🤖 [useACSChatUI] Loaded agent configurations:', orchestraConfigs.length);
        } catch (err) {
            console.error('[useACSChatUI] Failed to load agent configurations:', err);
            // Don't set error here as this is not critical for basic functionality
        }
    }, [acsClient, debug, currentAgentConfigId]);

    // Load session details
    const loadSessionDetails = useCallback(
        async (sessionId: string | undefined) => {
            // 🚨 CRITICAL: Guard against undefined/null session IDs
            if (!sessionId) {
                console.warn('⚠️ [useACSChatUI] loadSessionDetails called with undefined or null sessionId. Aborting API call.');
                setIsLoading(false); // Ensure loading state is reset
                return;
            }

            // 🔧 ORACLE FIX: Guard against temp session IDs reaching backend
            if (sessionId.startsWith('temp-')) {
                console.log('🚨 [MSG-FLOW] 📚 HISTORICAL: Skipping loadSessionDetails for temp session:', sessionId);
                setIsLoading(false); // Ensure loading state is reset
                return;
            }

            try {
                setIsLoading(true);
                console.log('🚨 [MSG-FLOW] 📚 HISTORICAL: Starting to load session details for:', sessionId);

                // Retry configuration
                const MAX_RETRY_ATTEMPTS = 3;
                const INITIAL_RETRY_DELAY = 1000; // 1 second
                
                // Retry function with exponential backoff
                const fetchWithRetry = async (attempt = 1): Promise<any> => {
                    try {
                        return await acsClient.sessions.getSession(sessionId, {
                            includeMessages: true
                        });
                    } catch (error) {
                        // If we've reached max retries, throw the error
                        if (attempt >= MAX_RETRY_ATTEMPTS) {
                            console.error(`🔄 [RETRY] Max retries (${MAX_RETRY_ATTEMPTS}) reached for session ${sessionId}. Giving up.`, error);
                            throw error;
                        }

                        // Calculate backoff delay with exponential increase and some jitter
                        const backoffDelay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1) * (0.9 + Math.random() * 0.2);
                        console.warn(`🔄 [RETRY] Attempt ${attempt} failed for session ${sessionId}. Retrying in ${Math.round(backoffDelay)}ms...`, error);
                        
                        // Wait for the calculated delay
                        await new Promise(resolve => setTimeout(resolve, backoffDelay));
                        
                        // Recursive retry with incremented attempt counter
                        console.log(`🔄 [RETRY] Starting attempt ${attempt + 1} for session ${sessionId}...`);
                        return fetchWithRetry(attempt + 1);
                    }
                };

                const response = await fetchWithRetry();

                console.log('🚨 [MSG-FLOW] 📚 HISTORICAL: Session details loaded from ACS:', {
                    sessionId: response.data.id,
                    messageCount: response.data.messages?.length || 0,
                    agentConfigId: response.data.agent_config_id,
                    rawMessages: response.data.messages
                });

                setCurrentSession(response.data);

                // Set the current agent config based on the session's agent_config_id
                if (response.data.agent_config_id) {
                    console.log('🚨 [MSG-FLOW] 📚 HISTORICAL: Setting current agent config from session:', response.data.agent_config_id);
                    setCurrentAgentConfigId(response.data.agent_config_id);
                }

                // Convert ACS messages to ChatMessage format using EventMerger for consistency
                let chatMessagesAccumulator: ChatMessage[] = [];

                console.log('🚨 [MSG-FLOW] 📚 HISTORICAL: Starting to process', response.data.messages.length, 'historical messages through EventMerger...');

                for (const [msgIndex, msg] of response.data.messages.entries()) {
                    const messageId = msg.id || `msg-${Date.now()}-${Math.random()}`;

                    console.log('🚨 [MSG-FLOW] 📚 HISTORICAL: Processing message', msgIndex + 1, 'of', response.data.messages.length, ':', {
                        messageId,
                        role: msg.role,
                        contentType: Array.isArray(msg.content) ? 'array' : typeof msg.content,
                        contentLength: Array.isArray(msg.content) ? msg.content.length : msg.text?.length || 0,
                        timestamp: msg.timestamp || msg.created_at,
                        model: msg.model
                    });

                    // Create base message first
                    const baseMessage: ChatMessage = {
                        id: messageId,
                        sessionId: sessionId,
                        role: msg.role,
                        content: [],
                        createdAt: new Date(msg.timestamp || msg.created_at).getTime(),
                        model: msg.model,
                        isStreaming: false,
                        thinking: false,
                        delivered: true,
                        read: true
                    };

                    console.log('🚨 [MSG-FLOW] 📚 HISTORICAL: Created base message structure:', {
                        id: baseMessage.id,
                        role: baseMessage.role,
                        createdAt: baseMessage.createdAt,
                        contentLength: baseMessage.content.length
                    });

                    // Add base message to accumulator
                    chatMessagesAccumulator = [...chatMessagesAccumulator, baseMessage];
                    console.log('🚨 [MSG-FLOW] 📚 HISTORICAL: Added base message to accumulator, total messages:', chatMessagesAccumulator.length);

                    // Process message content through EventMerger for consistency
                    if (msg.content && Array.isArray(msg.content)) {
                        console.log('🚨 [MSG-FLOW] 📚 HISTORICAL: Processing array content with', msg.content.length, 'parts');

                        for (const [partIndex, part] of msg.content.entries()) {
                            console.log('🚨 [MSG-FLOW] 📚 HISTORICAL: Processing content part', partIndex + 1, ':', {
                                type: part.type,
                                hasText: !!part.text,
                                textLength: part.text?.length || 0,
                                hasToolData: !!(part.id || part.name || part.input || part.tool_use_id)
                            });

                            if (part.type === 'text' && part.text) {
                                // Handle text content as chunk events
                                console.log('🚨 [MSG-FLOW] 📚 HISTORICAL: Creating chunk event for text part');
                                const chunkEvent = {
                                    type: 'chunk',
                                    messageId: messageId,
                                    sessionId: sessionId,
                                    delta: part.text
                                } as any;
                                const prevCount = chatMessagesAccumulator.length;
                                chatMessagesAccumulator = mergeSSEEventIntoMessages(chunkEvent, chatMessagesAccumulator);
                                console.log('🚨 [MSG-FLOW] 📚 HISTORICAL: Chunk event processed, messages:', prevCount, '→', chatMessagesAccumulator.length);
                            } else if (part.type === 'tool_use') {
                                // Handle tool_use as tool_call events
                                console.log('🚨 [MSG-FLOW] 📚 HISTORICAL: Creating tool_call event for tool_use part');
                                const toolCallEvent = {
                                    type: 'tool_call',
                                    messageId: messageId,
                                    sessionId: sessionId,
                                    toolCall: {
                                        id: part.id,
                                        name: part.name,
                                        arguments: part.input
                                    }
                                } as any;
                                const prevCount = chatMessagesAccumulator.length;
                                chatMessagesAccumulator = mergeSSEEventIntoMessages(toolCallEvent, chatMessagesAccumulator);
                                console.log(
                                    '🚨 [MSG-FLOW] 📚 HISTORICAL: Tool call event processed, messages:',
                                    prevCount,
                                    '→',
                                    chatMessagesAccumulator.length
                                );
                            } else if (part.type === 'tool_result') {
                                // Handle tool_result as tool_result events
                                console.log('🚨 [MSG-FLOW] 📚 HISTORICAL: Creating tool_result event for tool_result part');
                                const toolResultEvent = {
                                    type: 'tool_result',
                                    messageId: messageId,
                                    sessionId: sessionId,
                                    result: {
                                        tool_use_id: part.tool_use_id,
                                        ...getSafelyParsedJson(part.content, `tool_result content for ${part.tool_use_id}`),
                                        is_error: part.is_error
                                    }
                                } as any;
                                const prevCount = chatMessagesAccumulator.length;
                                chatMessagesAccumulator = mergeSSEEventIntoMessages(toolResultEvent, chatMessagesAccumulator);
                                console.log(
                                    '🚨 [MSG-FLOW] 📚 HISTORICAL: Tool result event processed, messages:',
                                    prevCount,
                                    '→',
                                    chatMessagesAccumulator.length
                                );
                            }
                        }
                    } else if (msg.text) {
                        // Fallback for legacy text format
                        console.log('🚨 [MSG-FLOW] 📚 HISTORICAL: Processing legacy text content, length:', msg.text.length);
                        const chunkEvent = {
                            type: 'chunk',
                            messageId: messageId,
                            sessionId: sessionId,
                            delta: msg.text
                        } as any;
                        const prevCount = chatMessagesAccumulator.length;
                        chatMessagesAccumulator = mergeSSEEventIntoMessages(chunkEvent, chatMessagesAccumulator);
                        console.log('🚨 [MSG-FLOW] 📚 HISTORICAL: Legacy chunk event processed, messages:', prevCount, '→', chatMessagesAccumulator.length);
                    }

                    // Mark message as done
                    console.log('🚨 [MSG-FLOW] 📚 HISTORICAL: Creating done event for message');
                    const doneEvent = {
                        type: 'done',
                        messageId: messageId,
                        sessionId: sessionId
                    } as any;
                    const prevCount = chatMessagesAccumulator.length;
                    chatMessagesAccumulator = mergeSSEEventIntoMessages(doneEvent, chatMessagesAccumulator);
                    console.log('🚨 [MSG-FLOW] 📚 HISTORICAL: Done event processed, messages:', prevCount, '→', chatMessagesAccumulator.length);
                }

                console.log('🚨 [MSG-FLOW] 📚 HISTORICAL: Finished processing all historical messages:', {
                    originalCount: response.data.messages.length,
                    processedCount: chatMessagesAccumulator.length,
                    finalMessages: chatMessagesAccumulator.map(m => ({
                        id: m.id,
                        role: m.role,
                        contentLength: m.content.length,
                        isStreaming: m.isStreaming,
                        delivered: m.delivered
                    }))
                });

                console.log('🚨 [MSG-FLOW] 📚 HISTORICAL: About to merge historical messages into existing state');
                console.log(`🚨 [MSG-FLOW] 📚 HISTORICAL: About to call setMessages with ${chatMessagesAccumulator.length} historical messages`);
                console.log('🚨 [MSG-FLOW] 📚 HISTORICAL: setMessages function reference:', setMessages);
                console.log('🚨 [MSG-FLOW] 📚 HISTORICAL: chatMessagesAccumulator:', chatMessagesAccumulator);

                try {
                    setMessages(draft => {
                        const currentMessages = useMessagesStore.getState().messages;
                        console.log(`🚨 [MSG-FLOW] 📚 HISTORICAL: setMessages callback called with current messages (Instance: ${instanceId}):`, {
                            currentCount: currentMessages.length,
                            historicalCount: chatMessagesAccumulator.length,
                            currentMessageIds: currentMessages.map(m => ({ id: m.id, role: m.role })),
                            historicalMessageIds: chatMessagesAccumulator.map(m => ({ id: m.id, role: m.role })),
                            timestamp: new Date().toISOString()
                        });

                        // Build a map for quick lookup of existing messages by id
                        const existingMap = new Map(currentMessages.map(m => [m.id, m]));
                        let changed = false;

                        for (const histMsg of chatMessagesAccumulator) {
                            const existing = existingMap.get(histMsg.id);
                            if (!existing) {
                                // New message – append
                                draft.push(histMsg);
                                changed = true;
                            } else {
                                // Compare content/delivered flags, etc.
                                const isDifferent =
                                    existing.content.length !== histMsg.content.length ||
                                    existing.isStreaming !== histMsg.isStreaming ||
                                    existing.delivered !== histMsg.delivered ||
                                    existing.read !== histMsg.read;
                                if (isDifferent) {
                                    const index = draft.findIndex(m => m.id === histMsg.id);
                                    if (index !== -1) {
                                        draft[index] = { ...histMsg };
                                        changed = true;
                                    }
                                }
                            }
                        }

                        if (changed) {
                            console.log('🚨 [MSG-FLOW] 📚 HISTORICAL: Merged messages – state updated');
                        } else {
                            console.log('🚨 [MSG-FLOW] 📚 HISTORICAL: No changes from historical merge');
                        }
                    });
                    console.log('🚨 [MSG-FLOW] 📚 HISTORICAL: setMessages call completed successfully');
                } catch (setMessagesError) {
                    console.error('🚨 [MSG-FLOW] 📚 HISTORICAL: Error in setMessages call:', setMessagesError);
                    throw setMessagesError;
                }
                console.log('🚨 [MSG-FLOW] 📚 HISTORICAL: Historical merge completed');
            } catch (err) {
                console.error('🚨 [MSG-FLOW] 📚 HISTORICAL: Error loading session details:', err);
                setError('Failed to load session details');
            } finally {
                setIsLoading(false);
                console.log('🚨 [MSG-FLOW] 📚 HISTORICAL: loadSessionDetails completed');
            }
        },
        [acsClient]
    );

    // Auto-initialization
    useEffect(() => {
        if (autoInitialize && !isInitialized) {
            initialize();
        }
    }, [autoInitialize, isInitialized, initialize]);

    // Re-initialize when Supabase auth state changes
    useEffect(() => {
        if (isInitialized) {
            // Re-initialize when Supabase auth state changes
            initialize();
        }
    }, [auth.isAuthenticated, auth.user, initialize]);

    // Handle URL session changes
    useEffect(() => {
        if (urlSessionId && urlSessionId !== currentSessionId && isAuthenticated) {
            setCurrentSessionId(urlSessionId);
            loadSessionDetails(urlSessionId);

            if (autoConnectStreaming) {
                connectStreaming(urlSessionId).catch(err => {
                    console.error('[useACSChatUI] Auto-connect streaming failed:', err);
                });
            }
        }
    }, [urlSessionId, currentSessionId, isAuthenticated, autoConnectStreaming, loadSessionDetails]);

    // Global logger effect (one-time) - Universal SSE event logging
    useEffect(() => {
        const handler = (ev: SSEEvent) => {
            console.log('[ALL-SSE]', ev.type, ev.sessionId || 'firehose', ev);
        };

        eventBus.on('sse', handler);

        return () => eventBus.off('sse', handler);
    }, []);

    // Track messages state changes for debugging (development only)
    useEffect(() => {
        if (debug) {
            console.log('🚨 [MSG-FLOW] 🎯 REACT: Messages state changed in useACSChatUI!', {
                messagesCount: messages.length,
                messageIds: messages.map(m => ({ id: m.id, role: m.role, contentLength: m.content.length, isStreaming: m.isStreaming })),
                timestamp: new Date().toISOString()
            });

            if (messages.length > 0) {
                console.log('🚨 [MSG-FLOW] 🎯 REACT: Last message details:', {
                    lastMessage: messages[messages.length - 1],
                    lastMessageContent: messages[messages.length - 1].content,
                    lastMessageText: messages[messages.length - 1].content
                        .filter(part => part.type === 'text')
                        .map(part => (part as any).text)
                        .join('')
                });
            }
        }
    }, [messages, debug]);

    // Define event handlers before the useEffect that uses them
    const handleStreamingError = useCallback((event: SSEEvent) => {
        console.log('❌ [useACSChatUI] 💥 Processing streaming error event:', {
            error: event.error,
            sessionId: event.sessionId,
            messageId: event.messageId
        });

        if (event.error) {
            setError(event.error);
            console.log('❌ [useACSChatUI] 💥 Error set in state:', event.error);
        }
        setHasStreamingMessage(false);
        console.log('✅ [useACSChatUI] 💥 Streaming error processed');
    }, []);

    const handleAgentStatus = useCallback(
        (event: SSEEvent) => {
            console.log('🤖 [useACSChatUI] 📊 Processing agent status event:', {
                data: event.data,
                sessionId: event.sessionId,
                messageId: event.messageId
            });

            if (debug) {
                console.log('[useACSChatUI] Agent status event:', event);
            }

            // Handle local tool job events
            if (event.data?.status === 'local_tool_job') {
                console.log('🔧 [useACSChatUI] 🛠️ Local tool job detected, delegating to useLocalTool:', {
                    data: event.data,
                    sessionId: event.sessionId
                });
                handleLocalToolJob(event);
            }

            // Handle other agent status events (conversation_suspended, etc.)
            // These could be used to update UI state in the future
            console.log('✅ [useACSChatUI] 📊 Agent status processed successfully');
        },
        [debug, handleLocalToolJob]
    );

    // Setup streaming event handlers
    useEffect(() => {
        if (!acsClient.streaming) {
            console.log('🐛 [DEBUG] No acsClient.streaming available, skipping event handler setup');
            return;
        }

        console.log(`🎧 [useACSChatUI] Setting up streaming event handlers... (Instance: ${instanceId})`);
        console.log('🐛 [DEBUG] Setting up SSE event handler for debug panel collection');

        const unsubscribeConnection = acsClient.streaming.onConnectionChange(connected => {
            setIsConnected(connected);
            console.log(connected ? '🟢 [useACSChatUI] Streaming CONNECTED!' : '🔴 [useACSChatUI] Streaming DISCONNECTED!');
            if (debug) {
                console.log('[useACSChatUI] Streaming connection:', connected);
            }
        });

        // 🔄 Subscribe via global eventBus
        function sseHandler(event: SSEEvent) {
            console.log('📡 [useACSChatUI] 🎯 SSE EVENT RECEIVED:', {
                type: event.type,
                sessionId: event.sessionId,
                messageId: event.messageId,
                hasDelta: !!event.delta,
                hasToolCall: !!event.toolCall,
                hasResult: !!event.result,
                hasError: !!event.error,
                data: event.data
            });

            if (debug) {
                console.log('[useACSChatUI] SSE Event:', event);
            }

            // Collect SSE events for debug panel (always collect in development)
            console.log('🐛 [DEBUG] Event collection check:', {
                nodeEnv: process.env.NODE_ENV,
                eventType: event.type,
                acsDebug: (window as any).__ACS_DEBUG__,
                shouldCollect: process.env.NODE_ENV !== 'production'
            });

            if (process.env.NODE_ENV !== 'production') {
                const eventWithTimestamp = {
                    ...event,
                    _receivedAt: Date.now()
                };
                console.log('🐛 [DEBUG] Collecting SSE event for debug panel:', {
                    type: event.type,
                    sessionId: event.sessionId,
                    timestamp: eventWithTimestamp._receivedAt
                });
                pushSseEvent(eventWithTimestamp);
                console.log('🐛 [DEBUG] SSE events state updated, total count:', sseEvents.length + 1);
            }

            // 🔍 DEBUG: Log ALL events regardless of type to see what's actually coming through
            console.log('🔍 [useACSChatUI] 📋 RAW EVENT RECEIVED (no filtering):', {
                type: event.type,
                sessionId: event.sessionId,
                messageId: event.messageId,
                hasDelta: !!event.delta,
                hasToolCall: !!event.toolCall,
                hasResult: !!event.result,
                hasError: !!event.error,
                hasData: !!event.data,
                fullEvent: event
            });

            // Handle different event types using unified EventMerger
            // Special handling for non-message events
            if (event.type === 'error') {
                console.log('❌ [useACSChatUI] 💥 Processing ERROR event:', {
                    error: event.error,
                    sessionId: event.sessionId,
                    messageId: event.messageId
                });
                handleStreamingError(event);
            } else if (event.type === 'agent_status') {
                console.log('🤖 [useACSChatUI] 📊 Processing AGENT_STATUS event:', {
                    data: event.data,
                    sessionId: event.sessionId,
                    messageId: event.messageId
                });
                handleAgentStatus(event);
            } else {
                // Push to SSE debug buffer
                pushSseEvent(event);

                // Use EventMerger for all message-related events (chunk, token, tool_call, tool_result, done)
                console.log('🚨 [MSG-FLOW] 🎯 HOOK: About to call EventMerger for message event:', {
                    type: event.type,
                    messageId: event.messageId,
                    sessionId: event.sessionId,
                    hasDelta: !!event.delta,
                    hasToolCall: !!event.toolCall,
                    hasResult: !!event.result,
                    timestamp: new Date().toISOString()
                });

                setMessages(draft => {
                    const currentMessages = useMessagesStore.getState().messages;
                    console.log(`🚨 [MSG-FLOW] 🎯 HOOK: setMessages callback called with current messages (Instance: ${instanceId}):`, {
                        currentCount: currentMessages.length,
                        currentMessageIds: currentMessages.map(m => ({ id: m.id, role: m.role, contentLength: m.content.length })),
                        timestamp: new Date().toISOString()
                    });

                    console.log('🚨 [MSG-FLOW] 🎯 HOOK: Calling mergeSSEEventIntoMessages...');
                    const newMessages = mergeSSEEventIntoMessages(event, currentMessages);

                    console.log('🚨 [MSG-FLOW] 🎯 HOOK: EventMerger returned:', {
                        currentCount: currentMessages.length,
                        newCount: newMessages.length,
                        changed: currentMessages !== newMessages,
                        newMessageIds: newMessages.map(m => ({ id: m.id, role: m.role, contentLength: m.content.length, isStreaming: m.isStreaming })),
                        timestamp: new Date().toISOString()
                    });

                    if (currentMessages !== newMessages) {
                        console.log('🚨 [MSG-FLOW] ✅ HOOK: Messages state WILL CHANGE - React will re-render!');
                        if (newMessages.length > currentMessages.length) {
                            console.log('🚨 [MSG-FLOW] ✅ HOOK: NEW MESSAGE ADDED!');
                        }
                        if (newMessages.length === currentMessages.length) {
                            console.log('🚨 [MSG-FLOW] ✅ HOOK: EXISTING MESSAGE UPDATED!');
                        }

                        // Replace the entire array with the new messages
                        draft.length = 0;
                        draft.push(...newMessages);
                    } else {
                        console.log('🚨 [MSG-FLOW] ❌ HOOK: Messages state UNCHANGED - no update needed');
                    }

                    console.log(`🚨 [MSG-FLOW] 🎯 HOOK: Completed setMessages callback (Instance: ${instanceId}):`, {
                        finalCount: draft.length,
                        timestamp: new Date().toISOString()
                    });
                });
            }

            // Streaming flag management
            if (event.type === 'chunk' || event.type === 'token') {
                setHasStreamingMessage(true);
            }
            if (event.type === 'done') {
                setHasStreamingMessage(false);
            }
        }

        // Subscribe to the eventBus
        eventBus.on('sse', sseHandler);

        console.log('🎧 [useACSChatUI] Streaming event handlers set up successfully!');

        return () => {
            console.log('🧹 [useACSChatUI] Cleaning up streaming event handlers...');
            if (unsubscribeConnection) {
                unsubscribeConnection();
            }
            eventBus.off('sse', sseHandler);
        };
    }, [acsClient.streaming, debug, handleStreamingError, handleAgentStatus]);

    // Note: Message-related event handlers (chunk, tool_call, tool_result, done)
    // have been replaced by the unified EventMerger utility

    // Helper to ensure streaming is connected
    const ensureStreaming = useCallback(
        async (sessionId: string) => {
            if (!sessionId) {
                console.log('🐛 [DEBUG] ensureStreaming: No sessionId provided');
                return;
            }
            console.log('🐛 [DEBUG] ensureStreaming: Attempting to connect SSE for session:', {
                sessionId,
                timestamp: new Date().toISOString()
            });
            try {
                console.log('[useACSChatUI] 📡 Opening SSE connection for session', sessionId);
                await acsClient.streaming.connect(sessionId); // safe-idempotent now
                console.log('🐛 [DEBUG] ensureStreaming: SSE connected successfully for session:', {
                    sessionId,
                    timestamp: new Date().toISOString()
                });
            } catch (err) {
                console.error('🐛 [DEBUG] ensureStreaming: SSE connect failed for session:', {
                    sessionId,
                    error: err,
                    timestamp: new Date().toISOString()
                });
            }
        },
        [acsClient.streaming]
    );

    // Authentication actions
    const login = useCallback(
        async (email: string, password: string) => {
            try {
                setIsLoading(true);
                setError(null);

                const res = await acsClient.auth.login(email, password);
                if (!acsClient.isAuthenticated()) throw new Error('Login failed');

                const userPayload: any = res?.data?.data?.user ?? res?.data?.user;
                setIsAuthenticated(true);
                setUser(userPayload);

                if (currentSessionId) await ensureStreaming(currentSessionId);
                await loadSessions();
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Login failed';
                setError(errorMessage);
                throw err;
            } finally {
                setIsLoading(false);
            }
        },
        [acsClient, currentSessionId, loadSessions, ensureStreaming]
    );

    const logout = useCallback(async () => {
        try {
            await acsClient.streaming.disconnect();
            await acsClient.auth.logout();
            setIsAuthenticated(false);
            setUser(null);
            setSessions([]);
            useMessagesStore.getState().clearMessages();
            setCurrentSessionId(undefined); // This will also clear currentSession
            setIsConnected(false);
            navigate('/whatsapp');
        } catch (err) {
            console.error('[useACSChatUI] Logout error:', err);
        }
    }, [acsClient, navigate]);

    // Session actions
    const createSession = useCallback(
        async (name?: string, agentConfigId?: string) => {
            try {
                console.log('[useACSChatUI] createSession called with:', { name, agentConfigId, defaultAgentConfigName });
                console.log('[useACSChatUI] ACS client state:', { isInitialized, isAuthenticated, effectiveUserId });

                if (!effectiveUserId) {
                    throw new Error('User not authenticated - effectiveUserId is missing');
                }

                // Resolve the YAML agent name that ACS expects (fallback to default)
                const agentConfigNameResolved = agentConfigId
                    ? agentConfigs.find(c => c.id === agentConfigId)?.agent.name || defaultAgentConfigName
                    : defaultAgentConfigName;

                console.log('[createSession] sending to ACS:', {
                    agentConfigIdSent: agentConfigId,
                    agentConfigNameResolved
                });

                const response = await acsClient.sessions.createDefaultSession(name, agentConfigNameResolved);

                console.log('[useACSChatUI] createDefaultSession response:', response);
                console.log('[useACSChatUI] response.data:', response.data);
                console.log('[useACSChatUI] response.data.data:', response.data?.data);

                // The API returns session_id nested in response.data.data
                const sessionId = response.data?.data?.session_id || response.data?.data?.id;
                console.log('[useACSChatUI] extracted sessionId:', sessionId);

                if (sessionId) {
                    await loadSessions();
                    return sessionId;
                }

                throw new Error(`Failed to create session - no session_id in response: ${JSON.stringify(response.data)}`);
            } catch (err) {
                console.error('[useACSChatUI] createSession error:', err);
                const errorMessage = err instanceof Error ? err.message : 'Failed to create session';
                setError(errorMessage);
                throw err;
            }
        },
        [acsClient, defaultAgentConfigName, loadSessions, isInitialized, isAuthenticated, effectiveUserId]
    );

    const switchToSession = useCallback(
        async (sessionId: string) => {
            // Clear seen event IDs when switching sessions to prevent cross-session duplicates
            clearEventMergerSeenIds();

            setCurrentSessionId(sessionId);
            await loadSessionDetails(sessionId);

            if (autoConnectStreaming) {
                try {
                    await connectStreaming(sessionId);
                } catch (err) {
                    console.error('[useACSChatUI] Failed to connect streaming in switchToSession:', err);
                }
            }
        },
        [loadSessionDetails, autoConnectStreaming]
    );

    const deleteSession = useCallback(
        async (sessionId: string) => {
            try {
                await acsClient.sessions.deleteSession(sessionId);
                await loadSessions();

                if (sessionId === currentSessionId) {
                    setCurrentSessionId(undefined); // This will also clear currentSession
                    useMessagesStore.getState().clearMessages();
                    navigate('/whatsapp');
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to delete session';
                setError(errorMessage);
                throw err;
            }
        },
        [acsClient, currentSessionId, loadSessions, navigate]
    );

    const renameSession = useCallback(
        async (sessionId: string, newName: string) => {
            try {
                await acsClient.sessions.renameSession(sessionId, newName);
                await loadSessions();

                if (sessionId === currentSessionId) {
                    await loadSessionDetails(sessionId);
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to rename session';
                setError(errorMessage);
                throw err;
            }
        },
        [acsClient, currentSessionId, loadSessions, loadSessionDetails]
    );

    // Agent config actions
    const selectAgentConfig = useCallback(
        (agentConfigId: string) => {
            setCurrentAgentConfigId(agentConfigId);

            if (debug) {
                console.log('[useACSChatUI] Set current agent config:', agentConfigId);
            }
        },
        [debug]
    );

    const createAgentConfig = useCallback(
        async (config: Omit<ACSAgentConfig, 'id' | 'created_at' | 'updated_at'>) => {
            try {
                const newConfig = await acsClient.agentConfigs.createAgentConfig(config);
                await loadAgentConfigs(); // Reload to get the new config
                return newConfig.id;
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to create agent config';
                setError(errorMessage);
                throw err;
            }
        },
        [acsClient, loadAgentConfigs]
    );

    const updateAgentConfig = useCallback(
        async (id: string, updates: Partial<ACSAgentConfig>) => {
            try {
                await acsClient.agentConfigs.updateAgentConfig(id, updates);
                await loadAgentConfigs(); // Reload to get the updated config
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to update agent config';
                setError(errorMessage);
                throw err;
            }
        },
        [acsClient, loadAgentConfigs]
    );

    const deleteAgentConfig = useCallback(
        async (id: string) => {
            try {
                await acsClient.agentConfigs.deleteAgentConfig(id);
                await loadAgentConfigs(); // Reload to remove the deleted config

                // If the deleted config was the current one, switch to another
                if (id === currentAgentConfigId) {
                    const remainingConfigs = agentConfigs.filter(config => config.id !== id);
                    if (remainingConfigs.length > 0) {
                        setCurrentAgentConfigId(remainingConfigs[0].id);
                    } else {
                        setCurrentAgentConfigId(undefined);
                    }
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to delete agent config';
                setError(errorMessage);
                throw err;
            }
        },
        [acsClient, loadAgentConfigs, currentAgentConfigId, agentConfigs]
    );

    // Message actions
    const sendMessage = useCallback(
        async (
            message: string,
            options: {
                agentConfigName?: string;
                agentConfigId?: string;
                modelApiKeys?: Record<string, string>;
            } = {}
        ) => {
            if (!currentSessionId || !effectiveUserId) {
                throw new Error('No active session or user ID');
            }

            try {
                setIsLoading(true);

                // Ensure streaming is connected
                await ensureStreaming(currentSessionId);

                // Add user message optimistically
                const userMessage: ChatMessage = {
                    id: `user-${Date.now()}`,
                    sessionId: currentSessionId,
                    role: ChatRole.User,
                    content: [{ type: 'text', text: message }],
                    createdAt: Date.now(),
                    isStreaming: false,
                    thinking: false,
                    delivered: true,
                    read: true
                };

                useMessagesStore.getState().addMessage(userMessage);

                // Resolve the YAML agent name that ACS expects
                let agentConfigToUse = options.agentConfigId || defaultAgentConfigName;

                if (options.agentConfigId) {
                    const config = agentConfigs.find(c => c.id === options.agentConfigId);
                    if (config) {
                        agentConfigToUse = config.agent.name;
                    }
                } else if (currentAgentConfig) {
                    agentConfigToUse = currentAgentConfig.agent.name;
                }

                console.log('[sendMessage] sending to ACS:', {
                    sessionId: currentSessionId,
                    agentConfigIdSent: options.agentConfigId,
                    agentConfigNameResolved: agentConfigToUse
                });

                // Send message via ACS (BYOK aware)
                const useStoredKeys = useBYOKStore.getState().useStoredKeysPreference;
                await acsClient.core.sendMessage(currentSessionId, message, effectiveUserId, agentConfigToUse, {
                    modelApiKeys: options.modelApiKeys,
                    useStoredKeys
                });
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
                setError(errorMessage);
                throw err;
            } finally {
                setIsLoading(false);
            }
        },
        [currentSessionId, effectiveUserId, acsClient, defaultAgentConfigName, agentConfigs, currentAgentConfig, ensureStreaming]
    );

    // 🔧 ORACLE FIX: Add concurrency guard to prevent multiple calls
    const inFlightRef = useRef<Promise<string> | null>(null);

    const startConversation = useCallback(
        async (
            message: string,
            options: {
                sessionName?: string;
                agentConfigName?: string;
                agentConfigId?: string;
                modelApiKeys?: Record<string, string>;
                modelId?: string;
                projectPath?: string;
                /**
                 * Fast mode (default: true) - Returns sessionId immediately after creation,
                 * allowing UI to navigate while SSE connection and session loading happen in background.
                 * Set to false for synchronous behavior where all operations complete before returning.
                 */
                fast?: boolean;
                /**
                 * Optimistic mode - Shows user message immediately and creates placeholder session
                 * before real ACS call completes. Used for instant UI feedback.
                 */
                optimistic?: boolean;
                /**
                 * Session ID - Real UUID provided by caller to be used as the session ID.
                 * When provided, ACS will create a session with this specific ID.
                 */
                sessionId?: string;
                /**
                 * Temp session ID - Only used when optimistic=true. The temporary session ID
                 * that will be replaced with the real session ID after ACS responds.
                 */
                tempSessionId?: string;
            } = {}
        ) => {
            console.log('🎯 [useACSChatUI] startConversation called:', {
                message: `"${message}"`,
                messageLength: message.length,
                options,
                effectiveUserId,
                isOptimistic: options.optimistic ?? false,
                inFlight: !!inFlightRef.current
            });

            // 🔧 ORACLE FIX: Concurrency guard - prevent multiple simultaneous calls
            if (inFlightRef.current) {
                console.warn('⚠️ [useACSChatUI] startConversation already in flight, returning existing promise');
                return inFlightRef.current;
            }

            if (!effectiveUserId) {
                throw new Error('User ID is required');
            }

            // 🔧 ORACLE FIX: Create promise and store in inFlightRef
            const conversationPromise = (async () => {
                const optimistic = options.optimistic ?? false;

                // 🚨 CRITICAL: Validate sessionId to prevent string "undefined"
                let requestedId = options.sessionId || (optimistic ? options.tempSessionId : undefined);
                if (requestedId === 'undefined' || requestedId === 'null') {
                    console.warn('⚠️ [useACSChatUI] Detected string "undefined" or "null" as sessionId, converting to undefined');
                    requestedId = undefined;
                }

                const tempId = optimistic ? requestedId || `temp-${Date.now()}-${Math.random()}` : undefined;

                console.log('🔧 [useACSChatUI] Configuration:', {
                    optimistic,
                    tempId,
                    requestedId,
                    requestedIdType: typeof requestedId,
                    originalSessionId: options.sessionId,
                    originalSessionIdType: typeof options.sessionId,
                    agentConfigName: options.agentConfigId || defaultAgentConfigName,
                    agentConfigId: options.agentConfigId
                });

                try {
                    setIsLoading(true);

                    /* ------------------------- optimistic pre-writes ------------------- */
                    if (optimistic && tempId) {
                        console.log('⚡ [useACSChatUI] OPTIMISTIC MODE: Creating placeholder state');

                        /* 1. push placeholder session   */
                        const placeholderSession = {
                            id: tempId,
                            name: options.sessionName ?? 'New Chat',
                            message_count: 1,
                            created_at: new Date().toISOString(),
                            agent_config_id: options.agentConfigId || defaultAgentConfigName,
                            agent_cwd: '/tmp'
                        };

                        console.log('📁 [useACSChatUI] Creating placeholder session:', placeholderSession);
                        // Add placeholder session to store
                        console.log(
                            '📁 [useACSChatUI] Sessions before:',
                            sessions.map(s => ({ id: s.id, name: s.name }))
                        );
                        useChatCoreStore.getState().addSession(placeholderSession);
                        console.log(
                            '📁 [useACSChatUI] Sessions after:',
                            [...sessions, placeholderSession].map(s => ({ id: s.id, name: s.name }))
                        );

                        /* 2. push user message locally  */
                        const userMsg: ChatMessage = {
                            id: `user-${Date.now()}`,
                            sessionId: tempId,
                            role: ChatRole.User,
                            content: [{ type: 'text', text: message }],
                            createdAt: Date.now(),
                            isStreaming: false,
                            delivered: false,
                            read: true,
                            thinking: false
                        };

                        console.log('💬 [useACSChatUI] Creating optimistic user message:', {
                            id: userMsg.id,
                            sessionId: userMsg.sessionId,
                            text: message,
                            delivered: userMsg.delivered
                        });

                        const currentMessages = useMessagesStore.getState().messages;
                        console.log(
                            '💬 [useACSChatUI] Messages before:',
                            currentMessages.map(msg => ({
                                id: msg.id,
                                sessionId: msg.sessionId,
                                role: msg.role,
                                text: msg.content[0]?.type === 'text' ? msg.content[0].text.substring(0, 50) + '...' : 'non-text'
                            }))
                        );
                        useMessagesStore.getState().addMessage(userMsg);
                        console.log(
                            '💬 [useACSChatUI] Messages after:',
                            [...currentMessages, userMsg].map(msg => ({
                                id: msg.id,
                                sessionId: msg.sessionId,
                                role: msg.role,
                                text: msg.content[0]?.type === 'text' ? msg.content[0].text.substring(0, 50) + '...' : 'non-text'
                            }))
                        );

                        /* 3. set current session id so UI renders immediately */
                        console.log('🎯 [useACSChatUI] Setting current session ID:', { from: currentSessionId, to: tempId });
                        setCurrentSessionId(tempId);

                        console.log('✅ [useACSChatUI] Optimistic state created successfully:', {
                            tempId,
                            messageCount: 1,
                            sessionName: options.sessionName
                        });
                    }

                    const useStoredKeys = useBYOKStore.getState().useStoredKeysPreference;

                    /* ---------------------------- real network call ------------------- */
                    console.log('🌐 [useACSChatUI] Starting real ACS conversation...');

                    const acsRequestPayload = {
                        message,
                        effectiveUserId,
                        agentConfigName: options.agentConfigId || defaultAgentConfigName,
                        options: {
                            ...(options.modelApiKeys && { modelApiKeys: options.modelApiKeys }),
                            useStoredKeys,
                            agentCwd: options.projectPath || '/tmp',
                            ...((options.modelId || options.projectPath) && { overrides: { 
                                ...(options.modelId && { model_id: options.modelId }),
                                ...(options.projectPath && { agent_cwd_override: options.projectPath })
                            } })
                        }
                    };

                    console.log('📤 [useACSChatUI] ACS request payload:', acsRequestPayload);

                    const res = await acsClient.core.startConversation(message, effectiveUserId, options.agentConfigId || defaultAgentConfigName, {
                        ...(options.modelApiKeys && { modelApiKeys: options.modelApiKeys }),
                        useStoredKeys,
                        agentCwd: options.projectPath || '/tmp',
                        ...(requestedId && { sessionId: requestedId }), // <- NEW: conditionally pass the requested session ID
                        ...((options.modelId || options.projectPath) && { overrides: { 
                            ...(options.modelId && { model_id: options.modelId }),
                            ...(options.projectPath && { agent_cwd_override: options.projectPath })
                        } })
                    });

                    console.log('📥 [useACSChatUI] ACS response received:', {
                        status: res.status,
                        data: res.data,
                        sessionId: res.data.session_id
                    });

                    const realId = res.data.session_id!;
                    console.log('🆔 [useACSChatUI] Real session ID extracted:', realId);

                    // 🔧 CRITICAL FIX: Connect SSE IMMEDIATELY to catch conversation events
                    console.log('📡 [useACSChatUI] IMMEDIATE: Connecting streaming for conversation events...', {
                        sessionId: realId,
                        timestamp: new Date().toISOString()
                    });
                    try {
                        await acsClient.streaming.connect(realId);
                        console.log('✅ [useACSChatUI] IMMEDIATE: Streaming connected successfully', {
                            sessionId: realId,
                            timestamp: new Date().toISOString()
                        });
                    } catch (error) {
                        console.warn('⚠️ [useACSChatUI] IMMEDIATE: Failed to connect streaming:', {
                            sessionId: realId,
                            error: error,
                            timestamp: new Date().toISOString()
                        });
                    }

                    /* ------------------ reconcile temp -> real ------------------------ */
                    if (optimistic && tempId && tempId !== realId) {
                        console.log('🔄 [useACSChatUI] RECONCILIATION: Swapping temp → real IDs:', { tempId, realId });

                        // swap ids in sessions
                        console.log('📁 [useACSChatUI] Reconciling sessions...');
                        console.log(
                            '📁 [useACSChatUI] Sessions before reconciliation:',
                            sessions.map(s => ({ id: s.id, name: s.name }))
                        );
                        const reconciled = sessions.map(s => (s.id === tempId ? { ...s, id: realId } : s));
                        setSessions(reconciled);
                        console.log(
                            '📁 [useACSChatUI] Sessions after reconciliation:',
                            reconciled.map(s => ({ id: s.id, name: s.name }))
                        );

                        // swap ids in messages and mark as delivered
                        useMessagesStore.getState().setMessages(draft => {
                            console.log('💬 [useACSChatUI] Reconciling messages...');
                            const currentMessages = useMessagesStore.getState().messages;
                            console.log(
                                '💬 [useACSChatUI] Messages before reconciliation:',
                                currentMessages.map(m => ({
                                    id: m.id,
                                    sessionId: m.sessionId,
                                    delivered: m.delivered
                                }))
                            );

                            draft.forEach(m => {
                                if (m.sessionId === tempId) {
                                    m.sessionId = realId;
                                    m.delivered = true;
                                }
                            });

                            console.log(
                                '💬 [useACSChatUI] Messages after reconciliation:',
                                draft.map(m => ({
                                    id: m.id,
                                    sessionId: m.sessionId,
                                    delivered: m.delivered
                                }))
                            );
                        });

                        console.log('🎯 [useACSChatUI] Setting current session ID to real ID:', { from: tempId, to: realId });

                        // ---------------------------
                        // 🔄 NEW STREAMING HANDLER SETUP (rewritten 2025-08-30)
                        // ---------------------------
                        // The original implementation subscribed to the event bus *inside* the
                        // `sseHandler` itself, causing an exponential explosion of handlers and
                        // runaway memory usage.  We now:
                        //   1.   Define the handler *once* (useCallback ensures stable reference)
                        //   2.   Subscribe exactly once per mount (`eventBus.on('sse', …)`).
                        //   3.   Clean up on unmount.
                        // This completely fixes duplicate-event processing and the
                        // "Cannot update a component while rendering a different component" React
                        // warning that was occurring under heavy traffic.
                        //-------------------------------------------------------------------
                        setCurrentSessionId(realId);

                        console.log('✅ [useACSChatUI] Optimistic reconciliation complete!');
                    } else if (optimistic && tempId && tempId === realId) {
                        console.log('✅ [useACSChatUI] RECONCILIATION: IDs match, no swapping needed:', { tempId, realId });
                        // Just mark messages as delivered since IDs already match
                        useMessagesStore.getState().setMessages(draft => {
                            draft.forEach(m => {
                                if (m.sessionId === tempId) {
                                    m.delivered = true;
                                }
                            });
                        });
                    } else {
                        // Non-optimistic: set current session immediately so UI can navigate
                        console.log('🎯 [useACSChatUI] Non-optimistic: Setting current session ID:', realId);
                        setCurrentSessionId(realId);
                    }

                    // 3️⃣ Fire-and-forget heavy operations unless fast === false
                    const backgroundLoader = async () => {
                        console.log('🔄 [useACSChatUI] BACKGROUND LOADER: Starting background operations for session:', realId);
                        try {
                            // SSE already connected immediately above, skip duplicate connection

                            // Load sessions and details in background
                            console.log('📂 [useACSChatUI] Background: Loading sessions...');
                            await loadSessions().catch(error => {
                                console.warn('⚠️ [useACSChatUI] Background: Failed to load sessions:', error);
                            });
                            console.log('✅ [useACSChatUI] Background: Sessions loaded');

                            console.log('📄 [useACSChatUI] Background: Loading session details...');
                            await loadSessionDetails(realId).catch(error => {
                                console.warn('⚠️ [useACSChatUI] Background: Failed to load session details:', error);
                            });
                            console.log('✅ [useACSChatUI] Background: Session details loaded');

                            // Rename session if name provided
                            if (options.sessionName) {
                                console.log('🏷️ [useACSChatUI] Background: Renaming session to:', options.sessionName);
                                await renameSession(realId, options.sessionName).catch(error => {
                                    console.warn('⚠️ [useACSChatUI] Background: Failed to rename session:', error);
                                });
                                console.log('✅ [useACSChatUI] Background: Session renamed');
                            }

                            console.log('🎉 [useACSChatUI] Background: All background operations completed successfully');
                        } catch (error) {
                            console.warn('❌ [useACSChatUI] Background loader error:', error);
                        }
                    };

                    // Default behavior is fast (fire-and-forget)
                    if (options.fast !== false) {
                        console.log('🚀 [useACSChatUI] FAST MODE: Starting background operations (fire-and-forget)');
                        // Fire-and-forget: start background operations but don't wait
                        void backgroundLoader();
                    } else {
                        console.log('⏳ [useACSChatUI] SYNC MODE: Waiting for all background operations to complete');
                        // Synchronous: wait for all operations to complete
                        await backgroundLoader();
                    }

                    console.log('🎯 [useACSChatUI] startConversation returning session ID:', realId);
                    return realId;
                } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : 'Failed to start conversation';
                    console.error('❌ [useACSChatUI] startConversation FAILED:', {
                        error: errorMessage,
                        stack: err instanceof Error ? err.stack : undefined,
                        optimistic,
                        tempId,
                        message: `"${message}"`
                    });
                    setError(errorMessage);
                    throw err;
                } finally {
                    console.log('🏁 [useACSChatUI] startConversation FINISHED (setting isLoading = false)');
                    setIsLoading(false);
                }
            })(); // Close the async IIFE

            // 🔧 ORACLE FIX: Store promise and clear on completion
            inFlightRef.current = conversationPromise;

            try {
                return await conversationPromise;
            } finally {
                inFlightRef.current = null;
            }
        },
        [effectiveUserId, acsClient, defaultAgentConfigName, loadSessions, loadSessionDetails, renameSession]
    );

    // Streaming actions
    const connectStreaming = useCallback(
        async (sessionId: string) => {
            // 🔧 ORACLE FIX: Guard against temp session IDs reaching backend
            if (sessionId.startsWith('temp-')) {
                console.log('🚫 [useACSChatUI] Skipping connectStreaming for temp session:', sessionId);
                return;
            }

            try {
                console.log('[useACSChatUI] Attempting to connect streaming for session:', {
                    sessionId,
                    timestamp: new Date().toISOString()
                });
                await acsClient.streaming.connect(sessionId);
                console.log('[useACSChatUI] Streaming connected successfully', {
                    sessionId,
                    timestamp: new Date().toISOString()
                });
            } catch (err) {
                console.error('[useACSChatUI] Failed to connect streaming:', {
                    sessionId,
                    error: err,
                    timestamp: new Date().toISOString()
                });
                setError(`Failed to connect to real-time updates: ${err instanceof Error ? err.message : String(err)}`);
                throw err; // Re-throw to ensure calling code knows about the failure
            }
        },
        [acsClient]
    );

    const disconnectStreaming = useCallback(async () => {
        try {
            await acsClient.streaming.disconnect();
        } catch (err) {
            console.warn('[useACSChatUI] Failed to disconnect streaming:', err);
        }
    }, [acsClient]);

    // Navigation helpers
    const navigateToSession = useCallback(
        (sessionId: string) => {
            navigate(`/chat/${sessionId}`);
        },
        [navigate]
    );

    const navigateToChat = useCallback(() => {
        navigate('/whatsapp');
    }, [navigate]);

    // Utility actions
    const refresh = useCallback(async () => {
        try {
            await loadSessions();
            if (currentSessionId) {
                await loadSessionDetails(currentSessionId);
            }
        } catch (err) {
            console.error('[useACSChatUI] Refresh failed:', err);
        }
    }, [loadSessions, currentSessionId, loadSessionDetails]);

    const getHealthStatus = useCallback(async () => {
        return acsClient.getHealthStatus();
    }, [acsClient]);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // Conversation cancellation
    const cancelCurrentConversation = useCallback(async () => {
        if (!currentSessionId) {
            console.warn('[useACSChatUI] No current session to cancel');
            return;
        }

        try {
            console.log('[useACSChatUI] Cancelling current conversation:', currentSessionId);
            await acsClient.core.cancelConversation(currentSessionId);
            console.log('[useACSChatUI] Conversation cancelled successfully');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to cancel conversation';
            console.error('[useACSChatUI] Failed to cancel conversation:', err);
            setError(errorMessage);
            throw err;
        }
    }, [currentSessionId, acsClient]);

    // 🚨 CRITICAL: useEffect blocks for initialization and session handling

    // Handle URL session changes
    useEffect(() => {
        console.log(`🚨 [SESSION] Instance ${instanceId} - URL session effect triggered:`, {
            urlSessionId,
            currentSessionId,
            isAuthenticated,
            condition: urlSessionId && urlSessionId !== currentSessionId && isAuthenticated
        });

        if (urlSessionId && urlSessionId !== currentSessionId && isAuthenticated) {
            console.log(`🚨 [SESSION] Instance ${instanceId} - Loading session from URL:`, urlSessionId);
            setCurrentSessionId(urlSessionId);
            loadSessionDetails(urlSessionId);
        }
    }, [urlSessionId, currentSessionId, isAuthenticated, autoConnectStreaming, loadSessionDetails, instanceId]);

    // Auto-initialization
    useEffect(() => {
        console.log(`🚨 [SESSION] Instance ${instanceId} - Auto-init effect:`, {
            autoInitialize,
            isInitialized,
            shouldInit: autoInitialize && !isInitialized
        });

        if (autoInitialize && !isInitialized) {
            console.log(`🚨 [SESSION] Instance ${instanceId} - Triggering initialize()`);
            initialize();
        }
    }, [autoInitialize, isInitialized, initialize, instanceId]);

    // SSE Event Handler Setup
    useEffect(() => {
        console.log(`🚨 [SESSION] Instance ${instanceId} - SSE setup effect triggered`);

        if (!acsClient.streaming) {
            console.log('🐛 [DEBUG] No acsClient.streaming available, skipping event handler setup');
            return;
        }

        console.log(`🎧 [useACSChatUI] Setting up streaming event handlers... (Instance: ${instanceId})`);

        // SSE Event Handler
        function sseHandler(event: SSEEvent) {
            console.log(`📡 [useACSChatUI] Instance ${instanceId} - SSE EVENT RECEIVED:`, {
                type: event.type,
                sessionId: event.sessionId,
                messageId: event.messageId,
                timestamp: new Date().toISOString()
            });

            // Store event for debug panel
            pushSseEvent(event);

            // Only process events for current session
            if (event.sessionId && event.sessionId !== currentSessionId) {
                console.log(`🚫 [useACSChatUI] Instance ${instanceId} - Ignoring event for different session:`, {
                    eventSession: event.sessionId,
                    currentSession: currentSessionId
                });
                return;
            }

            console.log(`🚨 [MSG-FLOW] 🎯 HOOK: About to call EventMerger for message event (Instance: ${instanceId}):`, {
                type: event.type,
                messageId: event.messageId,
                sessionId: event.sessionId,
                hasDelta: !!event.delta,
                hasToolCall: !!event.toolCall,
                hasResult: !!event.result,
                timestamp: new Date().toISOString()
            });

            useMessagesStore.getState().setMessages(draft => {
                const currentMessages = useMessagesStore.getState().messages;
                console.log(`🚨 [MSG-FLOW] 🎯 HOOK: setMessages callback called with current messages (Instance: ${instanceId}):`, {
                    prevCount: currentMessages.length,
                    prevMessageIds: currentMessages.map(m => ({ id: m.id, role: m.role, contentLength: m.content.length })),
                    timestamp: new Date().toISOString()
                });

                console.log('🚨 [MSG-FLOW] 🎯 HOOK: Calling mergeSSEEventIntoMessages...');
                const newMessages = mergeSSEEventIntoMessages(event, currentMessages);

                console.log('🚨 [MSG-FLOW] 🎯 HOOK: EventMerger returned:', {
                    prevCount: currentMessages.length,
                    newCount: newMessages.length,
                    changed: currentMessages !== newMessages,
                    arrayRefChanged: currentMessages !== newMessages,
                    newMessageIds: newMessages.map(m => ({ id: m.id, role: m.role, contentLength: m.content.length, isStreaming: m.isStreaming })),
                    timestamp: new Date().toISOString()
                });

                if (currentMessages !== newMessages) {
                    console.log('🚨 [MSG-FLOW] ✅ HOOK: Messages state WILL CHANGE - React will re-render!');
                    console.log('🚨 [MSG-FLOW] ✅ HOOK: Previous array reference:', currentMessages);
                    console.log('🚨 [MSG-FLOW] ✅ HOOK: New array reference:', newMessages);
                    if (newMessages.length > currentMessages.length) {
                        console.log('🚨 [MSG-FLOW] ✅ HOOK: NEW MESSAGE ADDED!');
                    }
                    if (newMessages.length === currentMessages.length) {
                        console.log('🚨 [MSG-FLOW] ✅ HOOK: EXISTING MESSAGE UPDATED!');
                    }

                    // Replace the draft array with new messages
                    draft.length = 0;
                    draft.push(...newMessages);
                } else {
                    console.log('🚨 [MSG-FLOW] ❌ HOOK: Messages state UNCHANGED - React will NOT re-render');
                    console.log('🚨 [MSG-FLOW] ❌ HOOK: Same array reference returned - this is the problem!');
                }

                console.log(`🚨 [MSG-FLOW] 🎯 HOOK: Returning from setMessages callback (Instance: ${instanceId}):`, {
                    returnedCount: draft.length,
                    returnedMessageIds: draft.map(m => ({ id: m.id, role: m.role, contentLength: m.content.length })),
                    timestamp: new Date().toISOString()
                });
            });
        }

        // Subscribe to SSE events
        console.log(`🚨 [SESSION] Instance ${instanceId} - Subscribing to SSE events`);
        eventBus.on('sse', sseHandler);

        // Cleanup
        return () => {
            console.log(`🚨 [SESSION] Instance ${instanceId} - Cleaning up SSE subscription`);
            eventBus.off('sse', sseHandler);
        };
    }, [acsClient, currentSessionId, instanceId]);

    // Memoized return value
    return useMemo(
        () => ({
            // Client state
            isInitialized,
            isAuthenticated,
            isConnected,
            connectionStatus,

            // Session state
            currentSessionId,
            currentSession,
            sessions,

            // Message state
            messages,
            isLoading,
            hasStreamingMessage,

            // Agent config state
            agentConfigs,
            currentAgentConfigId,
            currentAgentConfig,

            // User state
            user,

            // Actions
            initialize,
            login,
            logout,

            // Session actions
            createSession,
            switchToSession,
            deleteSession,
            renameSession,

            // Message actions
            sendMessage,
            startConversation,

            // Agent config actions
            loadAgentConfigs,
            setCurrentAgentConfig: selectAgentConfig,
            createAgentConfig,
            updateAgentConfig,
            deleteAgentConfig,

            // Streaming actions
            connectStreaming,
            disconnectStreaming,

            // Navigation helpers
            navigateToSession,
            navigateToChat,

            // Utility
            refresh,
            getHealthStatus,

            // Error state
            error,
            clearError,

            // ACS Client access (for debug purposes)
            acsClient,

            // SSE Events for debug panel
            sseEvents,

            // Conversation cancellation
            cancelCurrentConversation
        }),
        [
            isInitialized,
            isAuthenticated,
            isConnected,
            connectionStatus,
            currentSessionId,
            currentSession,
            sessions,
            messages,
            isLoading,
            hasStreamingMessage,
            agentConfigs,
            currentAgentConfigId,
            currentAgentConfig,
            user,
            initialize,
            login,
            logout,
            createSession,
            switchToSession,
            deleteSession,
            renameSession,
            sendMessage,
            startConversation,
            loadAgentConfigs,
            setCurrentAgentConfig,
            createAgentConfig,
            updateAgentConfig,
            deleteAgentConfig,
            connectStreaming,
            disconnectStreaming,
            navigateToSession,
            navigateToChat,
            refresh,
            getHealthStatus,
            error,
            clearError,
            acsClient,
            sseEvents,
            cancelCurrentConversation
        ]
    );
};

export default useACSChatUI;
