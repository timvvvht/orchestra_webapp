import { useEffect, useState } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { supabase } from "@/auth/SupabaseClient";

export default function UserSSEPanel() {
  const [rows, setRows] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const jwt = session.access_token;
      const uid = session.user.id;
      const url = `${import.meta.env.VITE_SSE_BASE_URL}/sse/user/${uid}`;

      fetchEventSource(url, {
        headers: { Authorization: `Bearer ${jwt}` },
        onmessage(ev) {
          setRows(r => [...r, ev.data].slice(-200)); // keep last 200 lines
        },
      });
    })();
  }, []);

  return (
    <pre style={{ maxHeight: 300, overflow: "auto", background: "#111", color: "#0f0" }}>
      {rows.map((l,i) => <div key={i}>{l}</div>)}
    </pre>
  );
}