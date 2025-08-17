/**
 * EventPlaygroundPanel - Three-pane diff viewer for canonical event testing
 * 
 * Allows engineers to paste Supabase rows and SSE events, see adapter output,
 * and validate with Zod schemas in real-time. Now supports fetching live data from Supabase!
 */

import React, { useState, useEffect, useMemo } from 'react';
import { mapBatch } from '@/adapters/RowMapper';
import { SseParser } from '@/adapters/SseParser';
import { safeValidateCanonicalEvent, CanonicalEvent, EventPatch } from '@/types/events';
import { supabase } from '@/services/supabase/supabaseClient';
import { getCurrentUserId } from '@/lib/userUtils';
import { useACSClient } from '@/hooks/acs-chat/useACSClient';
import type { SessionSummary } from '@/services/acs';
import supabaseSample from '@/__fixtures__/supabase-poker.json';
import sseSampleData from '@/__fixtures__/sse-poker.json';
import { useEventStore } from '@/stores/eventStore'; // Canonical Event Store integration

interface ValidationResult {
  success: boolean;
  data?: CanonicalEvent | EventPatch;
  error?: any;
}

export function EventPlaygroundPanel() {
  // ACS Client for session management
  const { acsClient } = useACSClient();
  
  // Canonical Event Store integration
  const eventStore = useEventStore();
  
  // Input states
  const [supabaseInput, setSupabaseInput] = useState(JSON.stringify(supabaseSample, null, 2));
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [availableSessions, setAvailableSessions] = useState<SessionSummary[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sseInput, setSseInput] = useState(JSON.stringify(sseSampleData, null, 2));
  
  // Fetch available sessions
  const fetchSessions = async () => {
    if (!acsClient) return;
    setLoadingSessions(true);
    try {
      const response = await acsClient.sessions.listSessions({
        limit: 100,
        includeMessageCount: false
      });
      setAvailableSessions(response.data.sessions);
      console.log(`[EventPlayground] Loaded ${response.data.sessions.length} sessions`);
    } catch (error) {
      console.error('[EventPlayground] Error fetching sessions:', error);
      alert('Failed to fetch sessions - check console');
    } finally {
      setLoadingSessions(false);
    }
  };
  
  // Fetch raw messages directly from Supabase for selected session
  const fetchLiveMessages = async () => {
    if (!selectedSessionId) return;
    setLoadingMessages(true);
    try {
      const currentUserId = await getCurrentUserId();
      
      // First verify the session belongs to the current user
      const { data: sessionData, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('user_id')
        .eq('id', selectedSessionId)
        .single();

      if (sessionError || !sessionData) {
        throw new Error('Session not found');
      }

      if (sessionData.user_id !== currentUserId) {
        throw new Error('Unauthorized access to session');
      }

      // Fetch raw messages directly from Supabase
      const { data: rawMessages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', selectedSessionId)
        .order('timestamp', { ascending: true })
        .limit(100);

      if (messagesError) throw messagesError;

      console.log(`[EventPlayground] Fetched ${rawMessages?.length || 0} raw messages for session ${selectedSessionId}`);
      
      setSupabaseInput(JSON.stringify(rawMessages || [], null, 2));
    } catch (error) {
      console.error('[EventPlayground] Error fetching messages:', error);
      alert(`Failed to fetch messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingMessages(false);
    }
  };
  
  // Load sessions on component mount
  useEffect(() => {
    if (acsClient) {
      fetchSessions();
    }
  }, [acsClient]);
  
  // Output states
  const [supabaseOutput, setSupabaseOutput] = useState<any>(null);
  const [sseOutput, setSseOutput] = useState<any>(null);
  
  // Validation states
  const [supabaseValidation, setSupabaseValidation] = useState<ValidationResult[]>([]);
  const [sseValidation, setSseValidation] = useState<ValidationResult>({ success: true });

  // Parser instance for SSE (maintains state)
  const sseParser = useMemo(() => SseParser.create(), []);

  // Load sample data on mount
  useEffect(() => {
    setSupabaseInput(JSON.stringify(supabaseSample, null, 2));
    setSseInput(JSON.stringify(sseSampleData, null, 2)); // Load full SSE array
  }, []);

  // Process Supabase input
  useEffect(() => {
    if (!supabaseInput.trim()) {
      setSupabaseOutput(null);
      setSupabaseValidation([]);
      return;
    }

    try {
      const parsed = JSON.parse(supabaseInput);
      
      // Handle both single row and array of rows
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      const mappedEvents = mapBatch(rows);
      
      setSupabaseOutput(mappedEvents);
      
      // Validate each event
      const validations = mappedEvents.map(event => {
        const result = safeValidateCanonicalEvent(event);
        return {
          success: result.success,
          data: result.data,
          error: result.error,
        };
      });
      
      setSupabaseValidation(validations);
    } catch (error) {
      setSupabaseOutput({ error: error instanceof Error ? error.message : 'Parse error' });
      setSupabaseValidation([{ success: false, error }]);
    }
  }, [supabaseInput]);

  // Process SSE input
  useEffect(() => {
    if (!sseInput.trim()) {
      setSseOutput(null);
      setSseValidation({ success: true });
      return;
    }

    try {
      // Use the new parseSseInput method that handles arrays
      const events = SseParser.parseSseInput(sseInput);
      setSseOutput(events);
      
      // Validate each event
      if (events.length === 0) {
        setSseValidation({ success: false, error: new Error('No valid events parsed') });
      } else if (events.length === 1) {
        // Single event validation (backward compatibility)
        const validation = safeValidateCanonicalEvent(events[0]);
        setSseValidation({
          success: validation.success,
          data: validation.data,
          error: validation.error,
        });
      } else {
        // Multiple events - check if all are valid
        const allValid = events.every(event => {
          const result = safeValidateCanonicalEvent(event);
          return result.success;
        });
        setSseValidation({
          success: allValid,
          data: events,
          error: allValid ? undefined : new Error(`${events.length} events parsed, some failed validation`),
        });
      }
    } catch (error) {
      setSseOutput({ error: error instanceof Error ? error.message : 'Parse error' });
      setSseValidation({ success: false, error });
    }
  }, [sseInput]);

  // Load sample data functions
  const loadSupabaseSample = () => {
    setSupabaseInput(JSON.stringify(supabaseSample, null, 2));
  };

  const loadSseSample = () => {
    // Load the full array to demonstrate array handling
    setSseInput(JSON.stringify(sseSampleData, null, 2));
  };

  const clearAll = () => {
    setSupabaseInput('');
    setSseInput('');
    sseParser.clearAll();
  };

  return (
    <div className="w-full h-full flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Canonical Event Playground</h2>
        <div className="flex gap-2">
          <button
            onClick={fetchSessions}
            disabled={loadingSessions}
            className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50"
          >
            {loadingSessions ? 'Loading...' : 'Refresh Sessions'}
          </button>
          <button
            onClick={loadSupabaseSample}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Load Sample
          </button>
          <button
            onClick={loadSseSample}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
          >
            Load SSE Sample
          </button>
          <button
            onClick={clearAll}
            className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Main content grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Supabase Section */}
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-medium text-white">Supabase Row → CanonicalEvent</h3>
          
          {/* Input */}
          <div className="flex flex-col gap-2">
            {/* Live Session Selection */}
            <div className="flex flex-col gap-2 mb-2 p-3 bg-gray-900 border border-gray-600 rounded">
              <label className="text-sm text-yellow-400 font-medium">🔥 Live Supabase Data (Raw Format)</label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedSessionId}
                  onChange={e => setSelectedSessionId(e.target.value)}
                  className="flex-1 px-2 py-1 bg-gray-700 text-white text-xs rounded"
                  disabled={loadingSessions}
                >
                  <option value="">Select a session...</option>
                  {availableSessions.map(session => (
                    <option key={session.id} value={session.id}>
                      {session.name || `Session ${session.id.slice(0, 8)}`} 
                      {session.messageCount ? ` (${session.messageCount} msgs)` : ''}
                    </option>
                  ))}
                </select>
                <button
                  onClick={fetchLiveMessages}
                  disabled={loadingMessages || !selectedSessionId}
                  className="px-3 py-1 bg-orange-600 text-white text-xs rounded disabled:opacity-50 hover:bg-orange-700"
                >
                  {loadingMessages ? 'Loading…' : 'Fetch Live Messages'}
                </button>
              </div>
              {availableSessions.length === 0 && !loadingSessions && (
                <p className="text-xs text-gray-400">No sessions found. Try refreshing sessions.</p>
              )}
            </div>
            <label className="text-sm text-gray-300">Raw Supabase Row JSON:</label>
            <textarea
              value={supabaseInput}
              onChange={(e) => setSupabaseInput(e.target.value)}
              placeholder="Paste JSON array of Supabase rows or single row: [{...}, {...}] or {...}"
              className="h-32 p-3 bg-gray-800 text-white border border-gray-600 rounded font-mono text-sm resize-none"
            />
          </div>

          {/* Output */}
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-300">Adapter Output:</label>
            <pre className="h-40 p-3 bg-gray-900 text-green-400 border border-gray-600 rounded text-xs overflow-auto">
              {supabaseOutput ? JSON.stringify(supabaseOutput, null, 2) : 'No output'}
            </pre>
          </div>

          {/* Validation */}
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-300">Zod Validation:</label>
            <div className="p-3 bg-gray-900 border border-gray-600 rounded text-xs">
              {supabaseValidation.length === 0 ? (
                <span className="text-gray-500">No validation results</span>
              ) : (
                supabaseValidation.map((validation, index) => (
                  <div key={index} className="mb-2 last:mb-0">
                    <div className={`font-semibold ${validation.success ? 'text-green-400' : 'text-red-400'}`}>
                      Event {index + 1}: {validation.success ? '✅ Valid' : '❌ Invalid'}
                    </div>
                    {!validation.success && validation.error && (
                      <div className="text-red-300 mt-1 text-xs">
                        {validation.error.message || JSON.stringify(validation.error, null, 2)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* SSE Section */}
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-medium text-white">SSE Events → CanonicalEvent</h3>
          
          {/* Input */}
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-300">Raw SSE Event JSON:</label>
            <textarea
              value={sseInput}
              onChange={(e) => setSseInput(e.target.value)}
              placeholder="Paste JSON array of SSE events or single event: [{...}, {...}] or {...}"
              className="h-32 p-3 bg-gray-800 text-white border border-gray-600 rounded font-mono text-sm resize-none"
            />
          </div>

          {/* Output */}
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-300">Adapter Output:</label>
            <pre className="h-40 p-3 bg-gray-900 text-green-400 border border-gray-600 rounded text-xs overflow-auto">
              {sseOutput ? JSON.stringify(sseOutput, null, 2) : 'No output'}
            </pre>
          </div>

          {/* Validation */}
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-300">Zod Validation:</label>
            <div className="p-3 bg-gray-900 border border-gray-600 rounded text-xs">
              <div className={`font-semibold ${sseValidation.success ? 'text-green-400' : 'text-red-400'}`}>
                {sseValidation.success ? '✅ Valid' : '❌ Invalid'}
                {Array.isArray(sseValidation.data) && (
                  <span className="text-gray-400 ml-2">({sseValidation.data.length} events)</span>
                )}
              </div>
              {!sseValidation.success && sseValidation.error && (
                <div className="text-red-300 mt-1 text-xs">
                  {sseValidation.error.message || JSON.stringify(sseValidation.error, null, 2)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Parser State Debug */}
      <div className="mt-4 p-3 bg-gray-900 border border-gray-600 rounded">
        <h4 className="text-sm font-medium text-white mb-2">Debug Info:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-300">
          <div>
            <div className="font-medium text-white mb-1">SSE Parser State:</div>
            <div>Partial messages in buffer: {sseParser.getPartialMessages().size}</div>
            {sseParser.getPartialMessages().size > 0 && (
              <button
                onClick={() => sseParser.clearCompleted()}
                className="mt-1 px-2 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
              >
                Clear Completed
              </button>
            )}
          </div>
          <div>
            <div className="font-medium text-white mb-1">🔥 Live Event Store:</div>
            <div>Total events: {eventStore.order.length}</div>
            <div>Feature flag: {import.meta.env.VITE_CANONICAL_STORE ? '✅ Enabled' : '❌ Disabled'}</div>
            {eventStore.order.length > 0 && (
              <div className="mt-1">
                <div>Sessions: {Object.keys(eventStore.bySession).length}</div>
                <div>Latest: {eventStore.order.length > 0 ? new Date(eventStore.events[eventStore.order[eventStore.order.length - 1]]?.createdAt || 0).toLocaleTimeString() : 'None'}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}