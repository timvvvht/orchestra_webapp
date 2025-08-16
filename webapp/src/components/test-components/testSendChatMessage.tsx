import React, { useState } from "react";
import { sendChatMessage } from "@/utils/sendChatMessage";

export default function MockTestPage() {
  const [status, setStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("Hello from mock-test!");

  async function handleSend() {
    setStatus("sending");
    setError(null);

    try {
      // Ensure ACS_URL is available (fallback to prod URL)
      if (!import.meta.env.VITE_ACS_BASE_URL && !import.meta.env.VITE_ACS_URL) {
        // If using Vite setup, you can inject via VITE_ACS_URL or VITE_ACS_BASE_URL
        console.warn(
          "No VITE_ACS_* env found; sendChatMessage will fall back to process.env.ACS_URL if provided."
        );
      }

      const result = await sendChatMessage({
        sessionId: "mock_session_123",
        message,
        userId: "f1948b82-7d6a-407e-860d-5a3acea11b8b",
        agentConfigName: "general",
        acsClient: null,
        acsOverrides: {
          agent_cwd_override:
            "/Users/dylan/dev/orchestra-interview/orchestra_webapp",
        },
        useStoredKeys: true,
        templateVariables: {
          cwd: "/Users/dylan/dev/orchestra-interview/orchestra_webapp",
        },
      });

      if (result.success) {
        setStatus("success");
      } else {
        setStatus("error");
        setError(result.error || "Unknown error");
      }
    } catch (e: any) {
      setStatus("error");
      setError(e?.message || String(e));
    }
  }

  return (
    <div className="p-6 space-y-4">
      <h2>Mock Event Testing</h2>

      <div>
        <label htmlFor="msg">Message</label>
        <textarea
          id="msg"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="w-full p-2 bg-white/5 border border-white/10 rounded"
          placeholder="Type your test message"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSend}
          className="px-3 py-2 bg-blue-600 text-white rounded"
        >
          Send via sendChatMessage
        </button>
      </div>

      <div className="mt-4">
        <p>Status: {status}</p>
        {error && <p className="text-red-400">Error: {error}</p>}
      </div>

      <div className="bg-white/5 p-4 rounded">
        <p>
          This page posts to /acs/converse using sendChatMessage and shows a
          quick status.
        </p>
      </div>
    </div>
  );
}
