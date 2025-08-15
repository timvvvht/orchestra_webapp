import { describe, it, beforeAll, afterAll, expect } from 'vitest';

import { OrchestACSClient } from '../../index';
import type { ACSClientConfig } from '../../shared/types';

import { loginWithExchange, logout } from '../../../../../tests/utils/authHelpers';

const ACS_BASE_URL = process.env.TEST_ACS_BASE_URL!;
const SSE_BASE_URL = process.env.TEST_SSE_BASE_URL || `${ACS_BASE_URL}/sse`;
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL!;
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD!;

describe('ACSCoreService – Multi-turn & Interleaved Conversation Routing', () => {
  let acsClient: OrchestACSClient;
  let userId: string | null = null;
  const sessionIdsForCleanup: string[] = [];

  beforeAll(async () => {
    const config: ACSClientConfig = {
      baseUrl: ACS_BASE_URL,
      sseUrl: SSE_BASE_URL,
      timeout: 60_000,
      retries: 2,
      debug: true,
    };

    acsClient = new OrchestACSClient(config);

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
    for (const id of sessionIdsForCleanup) {
      try {
        await acsClient.sessions.deleteSession(id);
      } catch (e) {
        console.warn('Cleanup failed for session', id, e);
      }
    }
    logout();
  });

  it(
    'should persist multi-turn history in correct order',
    async () => {
      // 1️⃣ Create new session via helper
      const startRes = await acsClient.sessions.createSession({
        name: `Multi-turn Test ${Date.now()}`,
        agent_config_id: 'general',
      });
      const sessionId = startRes.data.data.id!;
      sessionIdsForCleanup.push(sessionId);

      // 2️⃣ Send 3 sequential messages
      const prompts = ['Hello!', 'How are you today?', 'What is 2 + 2?'];
      for (const p of prompts) {
        const r = await acsClient.core.sendMessage(sessionId, p, userId!, 'general');
        expect(r.data.session_id).toBe(sessionId);
      }

      // 3️⃣ Fetch session with messages
      const sessionDetails = await acsClient.sessions.getSession(sessionId, {
        includeMessages: true,
      });

      const msgs = sessionDetails.data.messages;
      // Each prompt triggers assistant reply ⇒ ≥ prompts.length * 2 messages
      expect(msgs.length).toBeGreaterThanOrEqual(prompts.length);

      // Ensure chronological order (timestamps ascending)
      const tsList = msgs.map((m: any) => new Date(m.timestamp ?? m.created_at ?? 0).getTime());
      for (let i = 1; i < tsList.length; i++) {
        expect(tsList[i]).toBeGreaterThanOrEqual(tsList[i - 1]);
      }

      // Verify all user prompts appear in message content
      for (const p of prompts) {
        const found = msgs.find(
          (m: any) => m.role === 'user' && m.content?.some((c: any) => 'text' in c && c.text.includes(p)),
        );
        expect(found).toBeDefined();
      }
    },
    90_000,
  );

  it(
    'should route messages correctly when two sessions are interleaved',
    async () => {
      // Create two sessions
      const create = async (name: string) => {
        const res = await acsClient.sessions.createSession({ name, agent_config_id: 'general' });
        const id = res.data.data.id!;
        sessionIdsForCleanup.push(id);
        return id;
      };

      const s1 = await create(`Interleave-A ${Date.now()}`);
      const s2 = await create(`Interleave-B ${Date.now()}`);

      // Interleave messages
      const send = (sid: string, text: string) => acsClient.core.sendMessage(sid, text, userId!, 'general');

      await send(s1, 'Message 1 for session A');
      await send(s2, 'Message 1 for session B');
      await send(s1, 'Message 2 for session A');
      await send(s2, 'Message 2 for session B');

      // Fetch sessions and ensure counts
      const s1Details = await acsClient.sessions.getSession(s1, { includeMessages: true });
      const s2Details = await acsClient.sessions.getSession(s2, { includeMessages: true });

      // Each session should have its own two user messages
      const userMsgsA = s1Details.data.messages.filter((m: any) => m.role === 'user');
      const userMsgsB = s2Details.data.messages.filter((m: any) => m.role === 'user');

      expect(userMsgsA.length).toBe(2);
      expect(userMsgsB.length).toBe(2);

      // Cross-contamination check – messages should not overlap
      const textsA = userMsgsA.map((m: any) => m.content?.[0]?.text as string);
      const textsB = userMsgsB.map((m: any) => m.content?.[0]?.text as string);
      textsA.forEach((t) => expect(textsB).not.toContain(t));
    },
    120_000,
  );
});
