/* eslint-env browser */
/* Debug panel that connects to the user-specific SSE stream **exactly** the
 * same way production code does: via OrchestACSClient.firehose.
 */
import { useEffect, useState, useRef } from 'react';
import { getDefaultACSClient } from '@/services/acs';
import type { ACSRawEvent } from '@/services/acs/streaming/firehose';

export default function UserFirehoseTestPanel() {
  const acs = getDefaultACSClient();
  const fh = acs ? (acs as any).firehose : undefined;

  // Simple state & refs
  const [userIdInput, setUserIdInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<ACSRawEvent[]>([]);
  const unsubRef = useRef<() => void>();

  const connect = () => {
    if (!userIdInput) {
      setError('Please enter a userId');
      return;
    }
    try {
      // Dummy token – backend currently ignores JWT for user pipe
      fh?.connectPrivate(userIdInput, '');
      // Subscribe once
      unsubRef.current = fh?.subscribe((ev: ACSRawEvent) => {
        setEvents(prev => [...prev.slice(-99), ev]);
      });
      setConnected(true);
      setError(null);
    } catch (e: any) {
      setError(`Connect failed: ${e.message || e}`);
      setConnected(false);
    }
  };

  const disconnect = () => {
    try {
      fh?.disconnectUser();
    } catch {/* ignore */}
    unsubRef.current?.();
    unsubRef.current = undefined;
    setConnected(false);
  };

  // Clean up on unmount
  useEffect(() => () => disconnect(), []);

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white space-y-6">
      <h1 className="text-2xl font-bold">User Firehose Test Panel</h1>

      <div className="space-y-4">
        <label className="block text-sm font-medium">User Id</label>
        <input
          className="px-3 py-2 bg-gray-700 rounded w-full"
          value={userIdInput}
          onChange={e => setUserIdInput(e.target.value)}
          disabled={connected}
          placeholder="uuid-1234…"
        />
        <div className="flex gap-3">
          <button
            onClick={connect}
            disabled={connected}
            className="px-4 py-2 bg-emerald-600 rounded disabled:opacity-50"
          >Connect</button>
          <button
            onClick={disconnect}
            disabled={!connected}
            className="px-4 py-2 bg-red-600 rounded disabled:opacity-50"
          >Disconnect</button>
        </div>
        {error && <div className="text-red-400">{error}</div>}
        {connected && (
          <div className="text-green-400">Connected via FirehoseMux</div>
        )}
      </div>

      <div className="bg-black/60 p-4 rounded h-96 overflow-y-auto font-mono text-sm">
        {events.length === 0 && <div className="text-gray-500">No events yet…</div>}
        {events.map(ev => (
          <div key={ev.event_id} className="mb-2 border-b border-gray-700 pb-1">
            <div className="text-gray-400 text-xs mb-1">{ev.event_type} • sess {ev.session_id.slice(-6)} • {ev.timestamp}</div>
            <pre className="whitespace-pre-wrap break-all">{JSON.stringify(ev.data, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}
