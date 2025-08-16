// @ts-ignore
globalThis.import = { meta: { env: { DEV: false } } };

import { test, expect } from "@playwright/test";
import { sendChatMessage } from "../src/utils/sendChatMessage";

// Ensure your test runner resolves "@/..." aliases properly.
// Also ensure ACS_URL is available to the code under test.
test("sendChatMessage posts to /acs/converse and returns success", async () => {
  // Ensure this env is visible to the test process (e.g., via .env or PW config)
  process.env.ACS_URL = "https://orchestra-acs.fly.dev";

  const res = await sendChatMessage({
    sessionId: "mock_session_123",
    message: "Hello from e2e harness!",
    userId: "f1948b82-7d6a-407e-860d-5a3acea11b8b",
    agentConfigName: "default",
    acsClient: null, // not used by sendChatMessage; it uses httpApi directly
    // Use acsOverrides for agent_cwd_override
    acsOverrides: {
      agent_cwd_override:
        "/Users/dylan/dev/orchestra-interview/orchestra_webapp",
    },
    // Defaults used by code:
    useStoredKeys: true,
    templateVariables: {
      cwd: "/Users/dylan/dev/orchestra-interview/orchestra_webapp",
    },
  });

  expect(res.success).toBeTruthy();
  expect(res.userMessageId).toMatch(/^user-\d+$/);
});
