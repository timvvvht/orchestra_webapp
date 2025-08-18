import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/auth/AuthContext";
import { getFirehose } from "@/services/GlobalServiceManager";
import { useCurrentSessionId } from "@/hooks/useCurrentSessionId";
import {
  getChatSession,
  getAllChatMessages,
} from "@/services/supabase/chatService";
import { getPlansBySession } from "@/services/supabase/planService";

type SSEEvent = {
  session_id?: string;
  event_type?: string;
  data?: any;
  received_at: string;
};

const MAX_EVENTS = 200;

const JSONBlock: React.FC<{ label: string; data: any }> = ({
  label,
  data,
}: {
  label: string;
  data: any;
}) => {
  const [expanded, setExpanded] = useState<boolean>(false);
  const pretty = useMemo(() => JSON.stringify(data, null, 2), [data]);

  const truncated = useMemo(() => {
    if (pretty && pretty.length > 1200) {
      return `${pretty.slice(0, 1200)}\n... [truncated]`;
    }
    return pretty;
  }, [pretty]);

  return (
    <div className="bg-[#0b0b0b] border border-[#222] rounded p-3 my-2">
      <div className="flex items-center justify-between">
        <strong>{label}</strong>
        <div className="space-x-2">
          <button
            className="text-xs underline"
            onClick={() => setExpanded((s) => !s)}
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
          <button
            className="text-xs underline"
            onClick={() => navigator.clipboard.writeText(pretty || "")}
          >
            Copy JSON
          </button>
        </div>
      </div>
      <pre className="mt-2 text-xs whitespace-pre-wrap break-all">
        {expanded ? pretty : truncated}
      </pre>
    </div>
  );
};

const Section: React.FC<{
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}> = ({ title, children, right }) => (
  <section className="my-6">
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold">{title}</h2>
      {right}
    </div>
    <div className="mt-3">{children}</div>
  </section>
);

const SessionInspector: React.FC = () => {
  const { user } = useAuth();
  const { sessionId, loading, error } = useCurrentSessionId();

  // Supabase data
  const [sessionMeta, setSessionMeta] = useState<any | null>(null);
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  // SSE
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const unsubRef = useRef<null | (() => void)>(null);

  const refreshSupabase = useCallback(async () => {
    if (!sessionId) return;
    setIsFetching(true);
    setFetchError(null);
    try {
      const s = await getChatSession(sessionId, { messageLimit: 200 });
      setSessionMeta(s);
      // s may already include messages, but to be explicit we fetch full list or recent if needed
      const msgs = await getAllChatMessages(sessionId);
      setRecentMessages(msgs);
      const ps = await getPlansBySession(sessionId);
      setPlans(ps);
    } catch (e: any) {
      setFetchError(e?.message || "Failed to fetch session data");
    } finally {
      setIsFetching(false);
    }
  }, [sessionId]);

  // Load data on session change
  useEffect(() => {
    if (!sessionId) {
      setSessionMeta(null);
      setRecentMessages([]);
      setPlans([]);
      return;
    }
    refreshSupabase();
  }, [sessionId, refreshSupabase]);

  // SSE subscription
  useEffect(() => {
    // Cleanup previous subscription
    if (unsubRef.current) {
      try {
        unsubRef.current();
      } catch {}
      unsubRef.current = null;
    }
    if (!user || !sessionId) return;

    const firehose = getFirehose();
    if (!firehose) {
      console.warn("[SessionInspector] No firehose available");
      return;
    }
    const unsub = firehose.subscribe((raw: any) => {
      const event: SSEEvent = {
        session_id: raw?.session_id,
        event_type: raw?.event_type,
        data: raw?.data,
        received_at: new Date().toISOString(),
      };
      if (event.session_id !== sessionId) return;
      if (event?.data?.user_id && event.data.user_id !== user.id) return;
      setEvents((prev) => {
        const next = [event, ...prev];
        if (next.length > MAX_EVENTS) next.length = MAX_EVENTS;
        return next;
      });
    });
    unsubRef.current = unsub;
    return () => {
      if (unsubRef.current) {
        try {
          unsubRef.current();
        } catch {}
        unsubRef.current = null;
      }
    };
  }, [user, sessionId]);

  const clearEvents = useCallback(() => setEvents([]), []);

  if (loading) {
    return <div className="p-6">Loading most recent session…</div>;
  }
  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Session Inspector</h1>
        <p className="mt-4 text-red-400">
          Error resolving most recent session: {String(error?.message || error)}
        </p>
      </div>
    );
  }
  if (!sessionId) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Session Inspector</h1>
        <p className="mt-4">
          No sessions found. Start a chat to create a session.
        </p>
        <a href="/start" className="underline">
          Go to Start
        </a>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Session Inspector</h1>
      <p className="text-sm text-[#aaa] mt-1">
        Showing Supabase SSE data for the most recent session.
      </p>

      <Section
        title="Session Summary"
        right={
          <div className="space-x-2">
            <button
              className="text-sm underline"
              onClick={refreshSupabase}
              disabled={isFetching}
            >
              {isFetching ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        }
      >
        {!sessionMeta ? (
          <div>Loading session…</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-[#0b0b0b] border border-[#222] rounded p-3">
                <div>
                  <strong>Session ID:</strong> {sessionMeta.id}
                </div>
                <div>
                  <strong>Name:</strong> {sessionMeta.name}
                </div>
                <div>
                  <strong>Display Title:</strong>{" "}
                  {sessionMeta.displayTitle || "—"}
                </div>
                <div>
                  <strong>Agent Config:</strong>{" "}
                  {sessionMeta.agent_config_id || "—"}
                </div>
                <div>
                  <strong>Created:</strong>{" "}
                  {new Date(sessionMeta.createdAt).toLocaleString()}
                </div>
                <div>
                  <strong>Last Updated:</strong>{" "}
                  {new Date(sessionMeta.lastUpdated).toLocaleString()}
                </div>
                <div>
                  <strong>Parent/Fork:</strong>{" "}
                  {sessionMeta.parentSessionId || "—"} /{" "}
                  {sessionMeta.forkMessageId || "—"}
                </div>
              </div>
              <div className="bg-[#0b0b0b] border border-[#222] rounded p-3">
                <JSONBlock label="Metadata" data={sessionMeta.metadata ?? {}} />
              </div>
            </div>
          </>
        )}
        {fetchError && <div className="text-red-400 mt-2">{fetchError}</div>}
      </Section>

      <Section title={`Supabase Plans (${plans.length})`}>
        {plans.length === 0 ? (
          <div className="text-sm text-[#aaa]">
            No plans found for this session.
          </div>
        ) : (
          <div className="space-y-3">
            {plans.map((p: any) => (
              <div
                key={p.id}
                className="bg-[#0b0b0b] border border-[#222] rounded p-3"
              >
                <div className="text-sm">
                  <strong>id:</strong> {p.id} • <strong>updated_at:</strong>{" "}
                  {p.updated_at}
                </div>
                <JSONBlock label="Row" data={p} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={`Recent Chat Messages (${recentMessages.length})`}>
        {recentMessages.length === 0 ? (
          <div className="text-sm text-[#aaa]">No messages yet.</div>
        ) : (
          <div className="space-y-3">
            {recentMessages.map((m: any) => (
              <div
                key={m.id}
                className="bg-[#0b0b0b] border border-[#222] rounded p-3"
              >
                <div className="text-sm">
                  <strong>{m.role}</strong> • {m.id} •{" "}
                  {new Date(
                    m.createdAt ?? m.timestamp ?? Date.now()
                  ).toLocaleString()}
                </div>
                <JSONBlock label="Message" data={m} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        title={`Live SSE Stream (${events.length})`}
        right={
          <button className="text-sm underline" onClick={clearEvents}>
            Clear
          </button>
        }
      >
        {events.length === 0 ? (
          <div className="text-sm text-[#aaa]">
            Waiting for events… trigger activity to see live updates.
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((e, idx) => (
              <div
                key={idx}
                className="bg-[#0b0b0b] border border-[#222] rounded p-3"
              >
                <div className="text-sm">
                  <strong>type:</strong> {e.event_type || "—"} •{" "}
                  <strong>received:</strong> {e.received_at}
                </div>
                <JSONBlock label="Event" data={e} />
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
};

export default SessionInspector;
