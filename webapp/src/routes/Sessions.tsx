import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/services/supabase/supabaseClient';
import type { Tables } from '@/types/supabase';

type ChatSession = Tables<'chat_sessions'>;

export default function Sessions() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100); // Limit to prevent overwhelming the UI

      if (error) {
        throw error;
      }

      setSessions(data || []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatJson = (json: any) => {
    if (!json) return 'null';
    return JSON.stringify(json, null, 2);
  };

  const previewJson = (value: any, maxLen = 120) => {
    if (value == null) return '-';
    try {
      const s = JSON.stringify(value);
      return s.length > maxLen ? s.slice(0, maxLen) + '…' : s;
    } catch {
      return String(value);
    }
  };

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId) || null,
    [sessions, selectedSessionId]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              <span className="text-white/60">Loading sessions...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-400 mb-2">Error</h2>
            <p className="text-red-200">{error}</p>
            <button
              onClick={fetchSessions}
              className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-light text-white mb-2">Chat Sessions</h1>
              <p className="text-white/60">
                Showing {sessions.length} sessions from the database
              </p>
            </div>
            <button
              onClick={fetchSessions}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Sessions Table */}
        {sessions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-white/40 text-lg">No sessions found</div>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-white/80 font-medium">ID</th>
                    <th className="text-left p-4 text-white/80 font-medium">Name</th>
                    <th className="text-left p-4 text-white/80 font-medium">User ID</th>
                    <th className="text-left p-4 text-white/80 font-medium">Agent Config</th>
                    <th className="text-left p-4 text-white/80 font-medium">Repo</th>
                    <th className="text-left p-4 text-white/80 font-medium">Branch</th>
                    <th className="text-left p-4 text-white/80 font-medium">Repo ID</th>
                    <th className="text-left p-4 text-white/80 font-medium">Workspace Key</th>
                    <th className="text-left p-4 text-white/80 font-medium">Created</th>
                    <th className="text-left p-4 text-white/80 font-medium">Last Message</th>
                    <th className="text-left p-4 text-white/80 font-medium">Display Title</th>
                    <th className="text-left p-4 text-white/80 font-medium">Status</th>
                    <th className="text-left p-4 text-white/80 font-medium">Origin</th>
                    <th className="text-left p-4 text-white/80 font-medium">Shadow</th>
                    <th className="text-left p-4 text-white/80 font-medium">Metadata</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session, index) => (
                    <tr 
                      key={session.id}
                      onClick={() => setSelectedSessionId(session.id)}
                      title="Click to view details"
                      className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                        index % 2 === 0 ? 'bg-white/[0.02]' : ''
                      } cursor-pointer`}
                    >
                      <td className="p-4">
                        <div className="font-mono text-sm text-purple-400">
                          {session.id.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-white/90 font-medium">
                          {session.name}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-mono text-sm text-blue-400">
                          {session.user_id ? `${session.user_id.slice(0, 8)}...` : 'null'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-mono text-sm text-green-400">
                          {session.agent_config_id ? `${session.agent_config_id.slice(0, 8)}...` : 'null'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-white/80">
                          {session.repo_full_name || '-'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-white/80">
                          {session.branch || '-'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-mono text-sm text-white/70">
                          {session.repo_id ?? '-'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-mono text-xs text-white/70 break-all">
                          {session.workspace_key || '-'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-white/60">
                          {formatDate(session.created_at)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-white/60">
                          {session.last_message_at ? formatDate(session.last_message_at) : 'Never'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-white/80">
                          {session.display_title || '-'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-white/80">
                          {session.status || 'idle'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-white/60 text-sm">
                          {session.origin || '-'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className={`text-sm px-2 py-1 rounded ${
                          session.is_shadow 
                            ? 'bg-orange-500/20 text-orange-300' 
                            : 'bg-green-500/20 text-green-300'
                        }`}>
                          {session.is_shadow ? 'Shadow' : 'Normal'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-xs text-white/60 font-mono">
                          {previewJson(session.metadata)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Session Details Modal/Expandable Section */}
        <div className="mt-8">
          <details className="bg-white/5 border border-white/10 rounded-lg">
            <summary className="p-4 cursor-pointer text-white/80 hover:text-white transition-colors">
              View Raw Session Data (JSON)
            </summary>
            <div className="p-4 border-t border-white/10">
              <pre className="text-xs text-white/60 font-mono overflow-x-auto bg-black/20 p-4 rounded">
                {formatJson(sessions)}
              </pre>
            </div>
          </details>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="text-2xl font-light text-white mb-1">
              {sessions.length}
            </div>
            <div className="text-sm text-white/60">Total Sessions</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="text-2xl font-light text-white mb-1">
              {sessions.filter(s => s.user_id).length}
            </div>
            <div className="text-sm text-white/60">With User ID</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="text-2xl font-light text-white mb-1">
              {sessions.filter(s => s.agent_config_id).length}
            </div>
            <div className="text-sm text-white/60">With Agent Config</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <div className="text-2xl font-light text-white mb-1">
              {sessions.filter(s => s.last_message_at).length}
            </div>
            <div className="text-sm text-white/60">With Messages</div>
          </div>
        </div>

        {/* Side Panel for Selected Session */}
        {selectedSession && (
          <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] md:w-[560px] lg:w-[720px] bg-[#0b0b0b] border-l border-white/10 shadow-2xl z-50">
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div>
                  <div className="text-sm text-white/60">Session</div>
                  <div className="font-mono text-white/90 text-sm break-all">{selectedSession.id}</div>
                </div>
                <button
                  onClick={() => setSelectedSessionId(null)}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-md text-white/80"
                  aria-label="Close details"
                >
                  Close
                </button>
              </div>

              <div className="p-4 overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white/5 border border-white/10 rounded p-3">
                    <div className="text-white/60">Name</div>
                    <div className="text-white/90 break-words">{selectedSession.name}</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded p-3">
                    <div className="text-white/60">User</div>
                    <div className="font-mono text-blue-400 break-all">{selectedSession.user_id}</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded p-3">
                    <div className="text-white/60">Repo</div>
                    <div className="text-white/90 break-words">{selectedSession.repo_full_name || '-'}</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded p-3">
                    <div className="text-white/60">Branch</div>
                    <div className="text-white/90 break-words">{selectedSession.branch || '-'}</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded p-3">
                    <div className="text-white/60">Repo ID</div>
                    <div className="font-mono text-white/80 break-all">{selectedSession.repo_id ?? '-'}</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded p-3">
                    <div className="text-white/60">Workspace Key</div>
                    <div className="font-mono text-white/80 break-all">{selectedSession.workspace_key || '-'}</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded p-3">
                    <div className="text-white/60">Agent Config</div>
                    <div className="font-mono text-green-400 break-all">{selectedSession.agent_config_id || 'null'}</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded p-3">
                    <div className="text-white/60">Created</div>
                    <div className="text-white/80">{formatDate(selectedSession.created_at)}</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded p-3">
                    <div className="text-white/60">Last Message</div>
                    <div className="text-white/80">{selectedSession.last_message_at ? formatDate(selectedSession.last_message_at) : 'Never'}</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded p-3">
                    <div className="text-white/60">Status</div>
                    <div className="text-white/80">{selectedSession.status || 'idle'}</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded p-3">
                    <div className="text-white/60">Origin</div>
                    <div className="text-white/60">{selectedSession.origin || '-'}</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded p-3">
                    <div className="text-white/60">Shadow</div>
                    <div className="text-white/80">{selectedSession.is_shadow ? 'Shadow' : 'Normal'}</div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded">
                  <div className="p-3 border-b border-white/10 flex items-center justify-between">
                    <div className="text-white/80">Metadata</div>
                    <div className="text-xs text-white/40">JSON</div>
                  </div>
                  <div className="p-3">
                    {selectedSession.metadata ? (
                      <pre className="text-xs text-white/70 font-mono whitespace-pre-wrap break-all bg-black/20 p-3 rounded border border-white/10 overflow-auto max-h-[50vh]">
                        {JSON.stringify(selectedSession.metadata, null, 2)}
                      </pre>
                    ) : (
                      <div className="text-white/40">No metadata</div>
                    )}
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded">
                  <div className="p-3 border-b border-white/10 flex items-center justify-between">
                    <div className="text-white/80">Initial Agent Snapshot</div>
                    <div className="text-xs text-white/40">JSON</div>
                  </div>
                  <div className="p-3">
                    {selectedSession.initial_agent_snapshot ? (
                      <pre className="text-xs text-white/70 font-mono whitespace-pre-wrap break-all bg-black/20 p-3 rounded border border-white/10 overflow-auto max-h-[40vh]">
                        {JSON.stringify(selectedSession.initial_agent_snapshot, null, 2)}
                      </pre>
                    ) : (
                      <div className="text-white/40">No snapshot</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}