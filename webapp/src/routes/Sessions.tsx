import React, { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase/supabaseClient';
import type { Tables } from '@/types/supabase';

type ChatSession = Tables<'chat_sessions'>;

export default function Sessions() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
                    <th className="text-left p-4 text-white/80 font-medium">Created</th>
                    <th className="text-left p-4 text-white/80 font-medium">Last Message</th>
                    <th className="text-left p-4 text-white/80 font-medium">Display Title</th>
                    <th className="text-left p-4 text-white/80 font-medium">Status</th>
                    <th className="text-left p-4 text-white/80 font-medium">Origin</th>
                    <th className="text-left p-4 text-white/80 font-medium">Shadow</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session, index) => (
                    <tr 
                      key={session.id} 
                      className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                        index % 2 === 0 ? 'bg-white/[0.02]' : ''
                      }`}
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
      </div>
    </div>
  );
}