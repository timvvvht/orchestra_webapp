import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { OrchestACSClient } from '../../index';
import type { ACSClientConfig } from '../../shared/types';

import { loginWithExchange, logout } from '../../../../../tests/utils/authHelpers';

// Environment variables injected by vitest.setup or CI
const ACS_BASE_URL = process.env.TEST_ACS_BASE_URL!;
const SSE_BASE_URL = process.env.TEST_SSE_BASE_URL || `${ACS_BASE_URL}/sse`;
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL!;
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD!;

/**
 * This test verifies that a conversation (messages) persists after the first chat
 * round-trip.  It starts a brand-new conversation using the high-level
 * `startConversation` helper, then immediately retrieves the session with
 * `includeMessages=true` and asserts that the user’s prompt is present in the
 * persisted message list.
 *
 * We wire this into the **Converse smoke pillar** so that any regression in
 * message persistence will show up alongside other conversational tests.
 */

describe('ACSCoreService – Conversation Persistence', () => {
  let acsClient: OrchestACSClient;
  let sessionId: string | null = null;
  let userId: string | null = null;

  beforeAll(async () => {
    // Minimal client config – reuse same base URL + SSE used in other tests
    const config: ACSClientConfig = {
      baseUrl: ACS_BASE_URL,
      sseUrl: SSE_BASE_URL,
      timeout: 60_000,
      retries: 2,
      debug: true,
    };

    acsClient = new OrchestACSClient(config);

    // Session-cookie authentication (mirrors other integration tests)
    await loginWithExchange();

    // Login to authenticate the client and get user ID
    const loginRes = await acsClient.auth.login(TEST_USER_EMAIL, TEST_USER_PASSWORD);
    
    // Extract user ID with envelope format support
    const user = loginRes.data?.data?.user ?? loginRes.data?.user;
    if (!user?.id) {
      throw new Error(`Login response missing user.id. Response: ${JSON.stringify(loginRes.data)}`);
    }
    userId = user.id;
  });

  afterAll(async () => {
    // Clean up the test session if it was created
    if (sessionId) {
      try {
        await acsClient.sessions.deleteSession(sessionId);
      } catch (err) {
        // Non-fatal – cleanup best-effort
        console.warn('Conversation persistence test – cleanup failed:', err);
      }
    }

    logout();
  });

  it(
    'should persist messages after starting a new conversation',
    async () => {
      // Unique prompt so we can find it later
      const prompt = `Persistence test – ${Date.now()}`;

      // 1️⃣  Start the conversation (creates session + returns assistant reply)
      const startConvRes = await acsClient.core.startConversation(
        prompt,
        userId!,
        'general',
      );

      expect(startConvRes.data).toBeDefined();
      sessionId = startConvRes.data.session_id;
      expect(sessionId).toBeDefined();

      // 2️⃣  Immediately fetch the session details including messages
      const sessionDetailsRes = await acsClient.sessions.getSession(sessionId!, {
        includeMessages: true,
      });

      const msgs = sessionDetailsRes.data.messages;
      expect(Array.isArray(msgs)).toBe(true);
      expect(msgs.length).toBeGreaterThan(0);

      // 3️⃣  Assert that our user prompt is among the persisted messages
      const userPromptMsg = msgs.find(
        (m: any) => m.role === 'user' &&
          m.content?.some((c: any) => 'text' in c && c.text.includes(prompt)),
      );

      expect(userPromptMsg).toBeDefined();
    },
    90_000, // 90-second timeout (covers LLM latency)
  );
});
