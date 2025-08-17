/**
 * historyBridge.spec.ts - Tests for Supabase history bridge
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { hydrateSession } from '@/stores/eventBridges/historyBridge';
import { useEventStore } from '@/stores/eventStore';
import { getRecentMessagesForSession } from '@/services/supabase/chatMessageService';
import { mapBatch } from '@/adapters/RowMapper';

// Mock dependencies
vi.mock('@/services/supabase/chatMessageService');
vi.mock('@/adapters/RowMapper');
vi.mock('@/stores/eventStore');

describe('HistoryBridge', () => {
  let mockGetRecentMessages: Mock;
  let mockMapBatch: Mock;
  let mockEventStore: any;

  beforeEach(() => {
    // Reset mocks
    mockGetRecentMessages = getRecentMessagesForSession as Mock;
    mockMapBatch = mapBatch as Mock;
    mockEventStore = {
      addEvents: vi.fn(),
    };
    (useEventStore as any).getState = vi.fn(() => mockEventStore);

    // Mock environment variable
    vi.stubGlobal('import', {
      meta: {
        env: {
          VITE_CANONICAL_STORE: '1',
        },
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  const createMockChatMessage = (id: string, createdAt: number) => ({
    id,
    sessionId: 'session1',
    role: 'user',
    content: [{ type: 'text', text: `Message ${id}` }],
    createdAt,
    model: null,
  });

  const createMockCanonicalEvent = (id: string) => ({
    id,
    sessionId: 'session1',
    userId: 'user1',
    kind: 'message',
    role: 'user',
    content: [{ type: 'text', text: `Message ${id}` }],
    createdAt: '2024-01-01T10:00:00Z',
    source: 'supabase',
  });

  it('should skip hydration when feature flag is disabled', async () => {
    // Mock the environment variable by stubbing import.meta
    const originalEnv = import.meta.env;
    Object.defineProperty(import.meta, 'env', {
      value: { ...originalEnv, VITE_CANONICAL_STORE: '0' },
      configurable: true,
    });

    await hydrateSession('session1');

    expect(mockGetRecentMessages).not.toHaveBeenCalled();
    expect(mockEventStore.addEvents).not.toHaveBeenCalled();

    // Restore original env
    Object.defineProperty(import.meta, 'env', {
      value: originalEnv,
      configurable: true,
    });
  });

  it('should handle empty message list', async () => {
    mockGetRecentMessages.mockResolvedValue([]);

    await hydrateSession('session1');

    expect(mockGetRecentMessages).toHaveBeenCalledWith('session1', 500);
    expect(mockMapBatch).not.toHaveBeenCalled();
    expect(mockEventStore.addEvents).not.toHaveBeenCalled();
  });

  it('should process single page of messages', async () => {
    const messages = [
      createMockChatMessage('msg1', Date.now()),
      createMockChatMessage('msg2', Date.now() + 1000),
    ];
    const canonicalEvents = [
      createMockCanonicalEvent('msg1'),
      createMockCanonicalEvent('msg2'),
    ];

    mockGetRecentMessages.mockResolvedValue(messages);
    mockMapBatch.mockReturnValue(canonicalEvents);

    await hydrateSession('session1');

    expect(mockGetRecentMessages).toHaveBeenCalledWith('session1', 500);
    expect(mockMapBatch).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'msg1',
          session_id: 'session1',
          role: 'user',
        }),
        expect.objectContaining({
          id: 'msg2',
          session_id: 'session1',
          role: 'user',
        }),
      ])
    );
    expect(mockEventStore.addEvents).toHaveBeenCalledWith(canonicalEvents);
  });

  it('should handle pagination with multiple pages', async () => {
    // First page (full page = 500 messages)
    const firstPageMessages = Array.from({ length: 500 }, (_, i) => 
      createMockChatMessage(`msg${i}`, Date.now() + i * 1000)
    );
    
    // Second page (partial page = 200 messages)
    const secondPageMessages = Array.from({ length: 200 }, (_, i) => 
      createMockChatMessage(`msg${i + 500}`, Date.now() + (i + 500) * 1000)
    );

    const firstPageEvents = firstPageMessages.map(msg => createMockCanonicalEvent(msg.id));
    const secondPageEvents = secondPageMessages.map(msg => createMockCanonicalEvent(msg.id));

    mockGetRecentMessages
      .mockResolvedValueOnce(firstPageMessages)
      .mockResolvedValueOnce(secondPageMessages);
    
    mockMapBatch
      .mockReturnValueOnce(firstPageEvents)
      .mockReturnValueOnce(secondPageEvents);

    await hydrateSession('session1');

    // Should have called getRecentMessages twice
    expect(mockGetRecentMessages).toHaveBeenCalledTimes(2);
    expect(mockGetRecentMessages).toHaveBeenNthCalledWith(1, 'session1', 500);
    expect(mockGetRecentMessages).toHaveBeenNthCalledWith(2, 'session1', 500);

    // Should have called addEvents twice
    expect(mockEventStore.addEvents).toHaveBeenCalledTimes(2);
    expect(mockEventStore.addEvents).toHaveBeenNthCalledWith(1, firstPageEvents);
    expect(mockEventStore.addEvents).toHaveBeenNthCalledWith(2, secondPageEvents);
  });

  it('should convert ChatMessage to raw Supabase format correctly', async () => {
    const message = createMockChatMessage('msg1', 1704110400000); // 2024-01-01T10:00:00Z
    mockGetRecentMessages.mockResolvedValue([message]);
    mockMapBatch.mockReturnValue([createMockCanonicalEvent('msg1')]);

    await hydrateSession('session1');

    // Check that mapBatch was called with the correct structure
    expect(mockMapBatch).toHaveBeenCalledWith([
      {
        id: 'msg1',
        session_id: 'session1',
        role: 'user',
        content: {
          role: 'user',
          content: [{ type: 'text', text: 'Message msg1' }],
        },
        timestamp: '2024-01-01T10:00:00.000Z',
        model_used: null,
        tool_call_id: null,
        responding_to_tool_use_id: null,
        metadata: {},
        revision: 1,
        seq_in_revision: 0,
        write_id: 'history_msg1',
      },
    ]);
  });

  it('should handle errors gracefully', async () => {
    const error = new Error('Supabase connection failed');
    mockGetRecentMessages.mockRejectedValue(error);

    await expect(hydrateSession('session1')).rejects.toThrow('Supabase connection failed');
    
    expect(mockEventStore.addEvents).not.toHaveBeenCalled();
  });

  it('should handle mapBatch errors gracefully', async () => {
    const messages = [createMockChatMessage('msg1', Date.now())];
    mockGetRecentMessages.mockResolvedValue(messages);
    mockMapBatch.mockImplementation(() => {
      throw new Error('Mapping failed');
    });

    await expect(hydrateSession('session1')).rejects.toThrow('Mapping failed');
    
    expect(mockEventStore.addEvents).not.toHaveBeenCalled();
  });

  it('should stop pagination when receiving less than page size', async () => {
    // First page: full page (500 messages)
    const firstPageMessages = Array.from({ length: 500 }, (_, i) => 
      createMockChatMessage(`msg${i}`, Date.now() + i * 1000)
    );
    
    // Second page: partial page (100 messages) - should stop here
    const secondPageMessages = Array.from({ length: 100 }, (_, i) => 
      createMockChatMessage(`msg${i + 500}`, Date.now() + (i + 500) * 1000)
    );

    mockGetRecentMessages
      .mockResolvedValueOnce(firstPageMessages)
      .mockResolvedValueOnce(secondPageMessages);
    
    mockMapBatch
      .mockReturnValueOnce(firstPageMessages.map(msg => createMockCanonicalEvent(msg.id)))
      .mockReturnValueOnce(secondPageMessages.map(msg => createMockCanonicalEvent(msg.id)));

    await hydrateSession('session1');

    // Should have called getRecentMessages exactly twice (stopped after partial page)
    expect(mockGetRecentMessages).toHaveBeenCalledTimes(2);
    expect(mockEventStore.addEvents).toHaveBeenCalledTimes(2);
  });

  it('should handle messages with different models', async () => {
    const messages = [
      { ...createMockChatMessage('msg1', Date.now()), model: 'gpt-4' },
      { ...createMockChatMessage('msg2', Date.now()), model: 'claude-3' },
      { ...createMockChatMessage('msg3', Date.now()), model: null },
    ];

    mockGetRecentMessages.mockResolvedValue(messages);
    mockMapBatch.mockReturnValue(messages.map(msg => createMockCanonicalEvent(msg.id)));

    await hydrateSession('session1');

    expect(mockMapBatch).toHaveBeenCalledWith([
      expect.objectContaining({ model_used: 'gpt-4' }),
      expect.objectContaining({ model_used: 'claude-3' }),
      expect.objectContaining({ model_used: null }),
    ]);
  });
});