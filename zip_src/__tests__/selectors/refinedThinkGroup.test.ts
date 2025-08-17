/**
 * Unit tests for consecutive think() block grouping in refined mode
 */

import { groupConsecutiveThinks } from '@/selectors/canonical/_utils';
import type { 
  UnifiedTimelineEvent, 
  ToolCallTimelineEvent, 
  TextTimelineEvent,
  ThinkGroupTimelineEvent 
} from '@/types/unifiedTimeline';

// Helper to create mock events
const createTextEvent = (id: string, role: 'user' | 'assistant', text: string): TextTimelineEvent => ({
  id,
  type: 'text',
  sessionId: 'test-session',
  source: 'sse',
  createdAt: Date.now(),
  role,
  text,
  isStreaming: false
});

const createThinkEvent = (id: string, thought: string): ToolCallTimelineEvent => ({
  id,
  type: 'tool_call',
  sessionId: 'test-session',
  source: 'sse',
  createdAt: Date.now(),
  role: 'assistant',
  toolCall: {
    id: `tool-${id}`,
    name: 'think',
    args: { thought }
  }
});

const createToolEvent = (id: string, toolName: string): ToolCallTimelineEvent => ({
  id,
  type: 'tool_call',
  sessionId: 'test-session',
  source: 'sse',
  createdAt: Date.now(),
  role: 'assistant',
  toolCall: {
    id: `tool-${id}`,
    name: toolName,
    args: {}
  }
});

describe('groupConsecutiveThinks', () => {
  it('should keep single think call as individual event', () => {
    const events: UnifiedTimelineEvent[] = [
      createTextEvent('user1', 'user', 'Hello'),
      createThinkEvent('think1', 'I need to respond'),
      createTextEvent('assistant1', 'assistant', 'Hi there!')
    ];

    const result = groupConsecutiveThinks(events);

    expect(result).toHaveLength(3);
    expect(result[0].type).toBe('text');
    expect(result[1].type).toBe('tool_call');
    expect(result[2].type).toBe('text');
  });

  it('should merge consecutive think calls into a group', () => {
    const events: UnifiedTimelineEvent[] = [
      createTextEvent('user1', 'user', 'Hello'),
      createThinkEvent('think1', 'First thought'),
      createThinkEvent('think2', 'Second thought'),
      createThinkEvent('think3', 'Third thought'),
      createTextEvent('assistant1', 'assistant', 'Hi there!')
    ];

    const result = groupConsecutiveThinks(events);

    expect(result).toHaveLength(3);
    expect(result[0].type).toBe('text');
    expect(result[1].type).toBe('think_group');
    expect(result[2].type).toBe('text');

    const thinkGroup = result[1] as ThinkGroupTimelineEvent;
    expect(thinkGroup.thinkTools).toHaveLength(3);
    expect(thinkGroup.thinkTools[0].toolCall.args.thought).toBe('First thought');
    expect(thinkGroup.thinkTools[1].toolCall.args.thought).toBe('Second thought');
    expect(thinkGroup.thinkTools[2].toolCall.args.thought).toBe('Third thought');
  });

  it('should create separate groups for non-consecutive think calls', () => {
    const events: UnifiedTimelineEvent[] = [
      createTextEvent('user1', 'user', 'Hello'),
      createThinkEvent('think1', 'First thought'),
      createThinkEvent('think2', 'Second thought'),
      createToolEvent('tool1', 'str_replace_editor'),
      createThinkEvent('think3', 'Third thought'),
      createThinkEvent('think4', 'Fourth thought'),
      createTextEvent('assistant1', 'assistant', 'Hi there!')
    ];

    const result = groupConsecutiveThinks(events);

    expect(result).toHaveLength(5);
    expect(result[0].type).toBe('text'); // user message
    expect(result[1].type).toBe('think_group'); // first group (think1, think2)
    expect(result[2].type).toBe('tool_call'); // str_replace_editor
    expect(result[3].type).toBe('think_group'); // second group (think3, think4)
    expect(result[4].type).toBe('text'); // assistant message

    const firstGroup = result[1] as ThinkGroupTimelineEvent;
    expect(firstGroup.thinkTools).toHaveLength(2);

    const secondGroup = result[3] as ThinkGroupTimelineEvent;
    expect(secondGroup.thinkTools).toHaveLength(2);
  });

  it('should handle mixed events correctly', () => {
    const events: UnifiedTimelineEvent[] = [
      createTextEvent('user1', 'user', 'Hello'),
      createThinkEvent('think1', 'Single think'),
      createToolEvent('tool1', 'search_files'),
      createThinkEvent('think2', 'First of group'),
      createThinkEvent('think3', 'Second of group'),
      createTextEvent('assistant1', 'assistant', 'Response')
    ];

    const result = groupConsecutiveThinks(events);

    expect(result).toHaveLength(5);
    expect(result[0].type).toBe('text');
    expect(result[1].type).toBe('tool_call'); // single think stays individual
    expect(result[2].type).toBe('tool_call'); // search_files
    expect(result[3].type).toBe('think_group'); // grouped thinks
    expect(result[4].type).toBe('text');

    const thinkGroup = result[3] as ThinkGroupTimelineEvent;
    expect(thinkGroup.thinkTools).toHaveLength(2);
  });

  it('should preserve event metadata in groups', () => {
    const events: UnifiedTimelineEvent[] = [
      createThinkEvent('think1', 'First thought'),
      createThinkEvent('think2', 'Second thought')
    ];

    const result = groupConsecutiveThinks(events);

    expect(result).toHaveLength(1);
    const thinkGroup = result[0] as ThinkGroupTimelineEvent;
    
    expect(thinkGroup.id).toBe('think-group-think1');
    expect(thinkGroup.sessionId).toBe('test-session');
    expect(thinkGroup.source).toBe('sse');
    expect(thinkGroup.role).toBe('assistant');
    expect(thinkGroup.createdAt).toBe(events[0].createdAt);
  });

  it('should handle empty array', () => {
    const result = groupConsecutiveThinks([]);
    expect(result).toHaveLength(0);
  });

  it('should handle array with no think calls', () => {
    const events: UnifiedTimelineEvent[] = [
      createTextEvent('user1', 'user', 'Hello'),
      createToolEvent('tool1', 'search_files'),
      createTextEvent('assistant1', 'assistant', 'Response')
    ];

    const result = groupConsecutiveThinks(events);

    expect(result).toHaveLength(3);
    expect(result.every(e => e.type !== 'think_group')).toBe(true);
  });
});