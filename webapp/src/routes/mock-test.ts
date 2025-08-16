/*
curl -X POST https://orchestra-acs.fly.dev/acs/converse/mock \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "mock_session_123",
    "user_id": "f1948b82-7d6a-407e-860d-5a3acea11b8b",
    "scenario": "tool_execution",
    "delay_ms": 300
  }'*/

import { sendChatMessage } from "@/utils/sendChatMessage";

// Function to emulate the mock ACS request
async function mockAcsRequest() {
  const response = await sendChatMessage({
    sessionId: "mock_session_123",
    userId: "f1948b82-7d6a-407e-860d-5a3acea11b8b",
    message: "mock message",
    agentConfigName: "mock_config",
    acsClient: {
      // Mock ACS client
      POST: async (url: string, options: any) => {
        console.log("ACS Request:", url, options);
        return {
          ok: true,
          data: {
            // Mock ACS response
            conversation_suspended: false,
            current_agent_cwd: "/path/to/cwd",
            session_id: "XXXXXXXXXXXXXXXX",
            user_message: {
              id: "mock_user_message_id",
              content: "mock message",
              role: "user",
              kind: "text",
              createdAt: new Date().toISOString(),
            },
          },
        };
      },
    },
  });

  console.log("ACS Response:", response);
}

// Execute the mock request
mockAcsRequest().catch((error) => {
  console.error("Error making ACS request:", error);
});
