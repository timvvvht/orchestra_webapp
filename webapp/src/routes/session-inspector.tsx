import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/auth/AuthContext";
import { getFirehose } from "@/services/GlobalServiceManager";
import { useParams } from "react-router-dom";
import {
  getChatSession,
  getAllChatMessages,
  getAllChatSessions,
} from "@/services/supabase/chatService";
import { getPlansBySession } from "@/services/supabase/planService";
import { useMissionControlStore } from "@/stores/missionControlStore";
import { fetchAcsSessions } from "@/components/mission-control/MissionControl";
import { ChatSession } from "@/types/chatTypes";
import { hydrateSession } from "@/stores/eventBridges/historyBridge";
import { useEventStore } from "@/stores/eventStore";
import { useChatStore } from "@/stores/chatStore";

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
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();
  const [sessionId, setSessionId] = useState<string | undefined>(urlSessionId);
  const [loadingSession, setLoadingSession] = useState(!urlSessionId);

  // Supabase data
  const [sessionMeta, setSessionMeta] = useState<any | null>(null);
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [chatSession, setChatSession] = useState<ChatSession | null>();

  const [chats, setChats] = useState<any>([]);

  // SSE
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const unsubRef = useRef<null | (() => void)>(null);

  // Get most recent session if no sessionId in URL
  useEffect(() => {
    if (!urlSessionId) {
      console.log("[Session Inspector] Fetching all chat sessions...");
      getAllChatSessions()
        .then((sessions) => {
          console.log("[Session Inspector] Retrieved sessions:", sessions.length);
          const mostRecent = sessions[0];
          console.log("[Session Inspector] Session Selected: ", mostRecent);
          if (mostRecent) {
            setSessionId(mostRecent.id);
            setSessionMeta(mostRecent);
            console.log("[Session Inspector] Hydrating session:", mostRecent.id);
            hydrateSession(mostRecent.id);

            const state = useEventStore.getState();
            console.log("[Session Inspector] Event store state:", {
              totalSessions: state.bySession.size,
              sessionIds: Array.from(state.bySession.keys())
            });

            // Try session ID first, then 'unknown'
            let eventIds = state.bySession.get(mostRecent.id) || [];
            console.log("[Session Inspector] Events for session", mostRecent.id, ":", eventIds.length);
            if (eventIds.length === 0 && state.bySession.has("unknown")) {
              eventIds = state.bySession.get("unknown") || [];
              console.log("[Session Inspector] Using 'unknown' session events:", eventIds.length);
            }

            const events = eventIds
              .map((id) => state.byId.get(id))
              .filter(Boolean);
            console.log("[Session Inspector] Filtered events:", events.length);

            setChats(events);
          }
        })
        .catch((err) => {
          console.error("[Session Inspector] Failed to fetch sessions:", err);
        })
        .finally(() => {
          setLoadingSession(false);
        });
    } else {
      console.log("[Session Inspector] Using URL session ID:", urlSessionId);
      setSessionId(urlSessionId);
      setLoadingSession(false);
    }
  }, [sessionId]);

  // Get historical chats when the sessionId changes
  useEffect(() => {
    if (!sessionId) return;
    console.log("[Session Inspector] Fetching chat session for ID:", sessionId);
    setIsFetching(true);
    
    // Fetch chat session
    getChatSession(sessionId)
      .then((chatSession) => {
        console.log("[Session Inspector] Retrieved chat session:", chatSession);
        setChatSession(chatSession);
      })
      .catch((err) => {
        console.error("[Session Inspector] Failed to fetch chat session:", err);
      });
    
    // Fetch recent messages
    console.log("[Session Inspector] Fetching recent messages for session:", sessionId);
    getAllChatMessages(sessionId)
      .then((messages) => {
        console.log("[Session Inspector] Retrieved messages:", messages.length);
        setRecentMessages(messages);
      })
      .catch((err) => {
        console.error("[Session Inspector] Failed to fetch messages:", err);
      })
      .finally(() => {
        setIsFetching(false);
      });
  }, [sessionId]);

  return (
    <div className="p-6" id="session-inspector">
      <h1 className="text-xl font-semibold">Session Inspector</h1>
      <p className="text-sm text-[#aaa] mt-1">
        Showing Supabase SSE data for{" "}
        {urlSessionId ? `session ${urlSessionId}` : "the most recent session"}.
      </p>

      <Section
        title="Session Summary"
        right={
          <div className="space-x-2">
            <button className="text-sm underline" disabled={isFetching}>
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
              <div className="bg-[#0b0b0b] min-h-[50vh] border border-[#222] rounded p-3">
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
          <div className="space-y-3">{JSON.stringify(chats, null, 2)}</div>
        )}
      </Section>

      <Section
        title={`Live SSE Stream (${events.length})`}
        right={<button className="text-sm underline">Clear</button>}
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
