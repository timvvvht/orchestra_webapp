/**
 * Timeline Helper Utilities
 *
 * Utilities for processing and transforming timeline events,
 * including pairing tool calls with their results.
 */

import type { UnifiedTimelineEvent, ToolInteractionTimelineEvent, UnifiedToolCall, UnifiedToolResult } from '@/types/unifiedTimeline';
import type { ChatMessage as ChatMessageType } from '@/types/chatTypes';
import { convertChatMessageToTimeline } from './timelineParser';

/**
 * Pairs tool_call and tool_result events into unified tool_interaction events.
 * This collapses the separate call/result events into a single interactive component.
 *
 * @param events - Array of timeline events that may contain tool calls and results
 * @returns Array with tool_call/tool_result pairs replaced by tool_interaction events
 */
export function pairToolEvents(events: UnifiedTimelineEvent[]): UnifiedTimelineEvent[] {
    const pairs = new Map<string, ToolInteractionTimelineEvent>();
    const nonToolEvents: UnifiedTimelineEvent[] = [];
    const thinkToolIds = new Set<string>(); // Track think tool IDs

    // Deduplicate events - tool_interaction events by tool_call_id, others by event.id
    const uniqueEvents = new Map<string, UnifiedTimelineEvent>();
    const uniqueToolInteractions = new Map<string, UnifiedTimelineEvent>();

    events.forEach(event => {
        if (event.type === 'tool_interaction') {
            // For tool_interaction events, dedupe by tool_call_id (the logical operation)
            const toolCallId = event.data?.call?.id;
            if (toolCallId && !uniqueToolInteractions.has(toolCallId)) {
                uniqueToolInteractions.set(toolCallId, event);
            }
        } else {
            // For other events, dedupe by event.id as before
            if (!uniqueEvents.has(event.id)) {
                uniqueEvents.set(event.id, event);
            }
        }
    });

    const deduplicatedEvents = [...Array.from(uniqueEvents.values()), ...Array.from(uniqueToolInteractions.values())];
    console.log(
        `[pairToolEvents] Deduplicated ${events.length} -> ${deduplicatedEvents.length} events (${uniqueToolInteractions.size} tool_interactions, ${uniqueEvents.size} others)`
    );

    // First pass: create skeletons for each call
    deduplicatedEvents.forEach(event => {
        if (event.type === 'tool_call') {
            const toolCallEvent = event;

            // Handle both old format (toolCall property) and new format (data property)
            const toolCallData = (toolCallEvent as any).toolCall || (toolCallEvent as any).data;

            // Defensive checks for undefined properties
            if (!toolCallData) {
                console.warn('[timelineHelpers] Tool call missing toolCall/data property:', toolCallEvent);
                return;
            }

            if (!toolCallData.id) {
                console.warn('[timelineHelpers] Tool call missing id:', toolCallEvent);
                return;
            }

            // Don't pair think tools - they should remain as separate tool_call events
            if (toolCallData.name === 'think') {
                thinkToolIds.add(toolCallData.id); // Track this think tool ID
                nonToolEvents.push(event);
                return;
            }

            // Convert the timeline event data to UnifiedToolCall format
            const call: UnifiedToolCall = {
                id: toolCallData.id,
                name: toolCallData.name || 'unknown',
                parameters: toolCallData.args || toolCallData.parameters || {},
                timestamp: toolCallEvent.createdAt || toolCallData.timestamp,
                source: toolCallEvent.source || toolCallData.source,
                messageId: toolCallEvent.sessionId || toolCallData.messageId, // Using sessionId as messageId for now
                rawData: toolCallEvent
            };

            // Ensure we always create a valid tool_interaction event with proper data structure
            const toolInteraction: ToolInteractionTimelineEvent = {
                id: call.id,
                type: 'tool_interaction',
                sessionId: toolCallEvent.sessionId,
                source: toolCallEvent.source,
                createdAt: toolCallEvent.createdAt,
                role: 'assistant',
                data: { call }
            };

            pairs.set(call.id, toolInteraction);
        } else if (event.type === 'tool_result') {
            const toolResultEvent = event;

            // Extract tool result data, prioritizing `toolResult` then `data`, always defaulting to an empty object
            const toolResultData = (toolResultEvent as any).toolResult || (toolResultEvent as any).data || {};

            const toolCallId = toolResultData.toolCallId;

            if (!toolCallId) {
                // Skip results without a valid toolCallId
                console.warn('[timelineHelpers] Tool result missing toolCallId:', toolResultEvent);
                return;
            }

            // Convert the timeline event data to UnifiedToolResult format
            const result: UnifiedToolResult = {
                id: toolResultEvent.id || toolResultData.id,
                toolCallId: toolCallId,
                toolName: toolResultData.toolName || '', // Will be filled from the call if available
                result: toolResultData.result,
                success: toolResultData.success !== false && toolResultData.ok !== false,
                error: toolResultData.error,
                timestamp: toolResultEvent.createdAt || toolResultData.timestamp,
                source: toolResultEvent.source || toolResultData.source,
                messageId: toolResultEvent.sessionId || toolResultData.messageId,
                rawData: toolResultEvent
            };

            const existing = pairs.get(toolCallId);
            if (existing) {
                // Don't pair think tool results - they should remain as separate events
                if (existing.data.call.name === 'think') {
                    nonToolEvents.push(event);
                    return;
                }

                // Attach result to existing call
                existing.data.result = result;
                result.toolName = existing.data.call.name;
            } else {
                // Check if this is a think tool result
                if (thinkToolIds.has(toolCallId)) {
                    // This is a think tool result - add as separate event
                    nonToolEvents.push(event);
                } else {
                    // Fallback: result came before call (shouldn't happen but be safe)
                    console.warn('[timelineHelpers] Tool result arrived before call:', toolResultEvent);

                    // Create a stub call entry for orphaned results
                    const stubCall: UnifiedToolCall = {
                        id: toolCallId,
                        name: 'unknown',
                        parameters: {},
                        timestamp: toolResultEvent.createdAt || toolResultData.timestamp,
                        source: toolResultEvent.source || toolResultData.source,
                        messageId: toolResultEvent.sessionId || toolResultData.messageId,
                        rawData: null
                    };

                    // Create a valid tool_interaction event for orphaned results
                    const stubInteraction: ToolInteractionTimelineEvent = {
                        id: toolCallId,
                        type: 'tool_interaction',
                        sessionId: toolResultEvent.sessionId,
                        source: toolResultEvent.source,
                        createdAt: toolResultEvent.createdAt,
                        role: 'assistant',
                        data: { call: stubCall, result }
                    };

                    pairs.set(toolCallId, stubInteraction);
                }
            }
        } else {
            // Keep non-tool events as-is
            nonToolEvents.push(event);
        }
    });

    // Combine paired tool interactions with other events
    const pairedInteractions = Array.from(pairs.values());

    // Defensive check: ensure all tool_interaction events have valid data
    const validPairedInteractions = pairedInteractions.filter(interaction => {
        if (!interaction.data || !interaction.data.call) {
            console.warn('[timelineHelpers] Invalid tool_interaction event missing data/call:', interaction);
            return false;
        }
        return true;
    });

    const allEvents = [...nonToolEvents, ...validPairedInteractions];
    console.log(
        `[pairToolEvents] Final result: ${allEvents.length} events (${validPairedInteractions.length} tool_interactions, ${nonToolEvents.length} other)`
    );

    // Sort by timestamp to preserve original ordering
    return allEvents.sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Extracts tool display name from tool name
 */
export function getToolDisplayName(toolName: string): string {
    const TOOL_DISPLAY_NAMES: Record<string, string> = {
        // Web search and scraping
        exa_search: 'Searching the web',
        exa_get_contents: 'Reading web content',
        exa_find_similar: 'Finding similar pages',
        agentic_web_search: 'Searching the web',
        scrape_url: 'Reading web content',

        // File operations
        str_replace_editor: 'Editing files',
        apply_patch: 'Editing files',
        read_file: 'Reading files',
        read_files: 'Reading files',
        search_files: 'Searching files',
        agentic_search_files_persistent: 'Searching files',
        create_file: 'Creating files',
        write_file: 'Writing files',
        cat: 'Reading files',
        grep: 'Searching files',
        find: 'Finding files',
        tree: 'Exploring files',

        // planning
        plan_create_structure: 'Planning',
        plan_add_tasks: 'Planning',
        plan_finalize: 'Planning',

        // File system operations
        mv: 'Managing files',
        cp: 'Managing files',
        mkdir: 'Managing files',
        touch: 'Managing files',
        pwd: 'Navigating filesystem',

        // Shell session management
        initiate_runner_session: 'Setting up environment',
        execute_in_runner_session: 'Running commands',
        terminate_runner_session: 'Cleaning up environment',
        execute_bash: 'Running commands',
        execute_remote_command: 'Running commands',
        set_runner_session_cwd: 'Navigating filesystem',
        set_runner_session_env_var: 'Configuring environment',
        unset_runner_session_env_var: 'Configuring environment',
        get_runner_session_state: 'Checking environment',

        // Analysis and reasoning
        think: 'Thought Process',
        decompose_problem_recursively: 'Analyzing problem',
        log_hypothesis_test_cycle: 'Testing approach',
        analyze_root_cause: 'Investigating issue',
        agentic_debug: 'Debugging issue',
        ask_oracle: 'Consulting experts',

        // Development tools
        run_command: 'Running commands',
        bun: 'Running build tools',
        bunx: 'Running build tools',
        spawn_agent_sync: 'Running specialized task'
    };

    return TOOL_DISPLAY_NAMES[toolName] || toolName.replace(/_/g, ' ');
}

/**
 * Checks if a tool should be visible to users (vs internal/technical tools)
 */
export function isUserFacingTool(toolName: string): boolean {
    const userFacingTools = [
        'think',
        'exa_search',
        'str_replace_editor',
        'read_files',
        'search_files',
        'create_file',
        'write_file',
        'agentic_web_search',
        'spawn_agent_sync',
        'execute_in_runner_session'
    ];
    return userFacingTools.includes(toolName.toLowerCase());
}

/**
 * Pairs tool events across multiple messages.
 * This is needed because in real data, tool_use and tool_result often appear in separate messages.
 *
 * @param messages - Array of chat messages
 * @returns Array of timeline events with cross-message tool pairing
 */
export function pairToolEventsAcrossMessages(messages: ChatMessageType[]): UnifiedTimelineEvent[] {
    // Convert all messages to timeline events
    const allEvents: UnifiedTimelineEvent[] = [];

    messages.forEach((message, index) => {
        const messageEvents = convertChatMessageToTimeline(message, index);
        allEvents.push(...messageEvents);
    });

    // Now pair the events across all messages
    const pairedEvents = pairToolEvents(allEvents);
    console.log(`[pairToolEventsAcrossMessages] unpaired count: ${allEvents.length - pairedEvents.length}`);
    // for (let i = 0; i < allEvents.length; i++) {
    //     console.log(`[pairToolEventsAcrossMessages] - ${JSON.stringify(allEvents[i])}`);
    // }
    return pairedEvents;
}
