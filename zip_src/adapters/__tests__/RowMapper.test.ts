/**
 * RowMapper Unit Tests
 * 
 * Tests the Supabase row to CanonicalEvent mapping functionality
 */

import { describe, it, expect } from 'vitest';
import { RowMapper } from '../RowMapper';
import { SupabaseDbChatMessage } from '@/types/chatTypes';
import { CanonicalEvent, MessageEvent, ToolCallEvent, ToolResultEvent } from '@/types/events';

describe('RowMapper', () => {
  describe('map', () => {
    it('should map a simple text message', () => {
      const row: SupabaseDbChatMessage = {
        id: 'msg_123',
        session_id: 'session_456',
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Hello, world!'
          }
        ],
        timestamp: '2024-01-15T10:30:00Z'
      };

      const events = RowMapper.map(row);
      
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        id: 'msg_123',
        kind: 'message',
        role: 'user',
        source: 'supabase',
        partial: false,
        content: [
          {
            type: 'text',
            text: 'Hello, world!'
          }
        ]
      });
    });

    it('should map a tool use message', () => {
      const row: SupabaseDbChatMessage = {
        id: 'msg_456',
        session_id: 'session_789',
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            tool_use_id: 'tool_123',
            tool_name: 'search_files',
            tool_input: { pattern: '*.ts' }
          }
        ],
        timestamp: '2024-01-15T10:31:00Z',
        tool_call_id: 'tool_123'
      };

      const events = RowMapper.map(row);
      
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        id: 'msg_456',
        kind: 'tool_call',
        role: 'assistant',
        source: 'supabase',
        toolUseId: 'tool_123',
        name: 'search_files',
        args: { pattern: '*.ts' }
      });
    });

    it('should map a tool result message', () => {
      const row: SupabaseDbChatMessage = {
        id: 'msg_789',
        session_id: 'session_123',
        role: 'assistant',
        content: [
          {
            type: 'tool_output',
            tool_use_id_for_output: 'tool_456',
            output: { files: ['file1.ts', 'file2.ts'] },
            status: 'ok'
          }
        ],
        timestamp: '2024-01-15T10:32:00Z',
        responding_to_tool_use_id: 'tool_456'
      };

      const events = RowMapper.map(row);
      
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        id: 'msg_789',
        kind: 'tool_result',
        role: 'assistant',
        source: 'supabase',
        toolUseId: 'tool_456',
        result: { files: ['file1.ts', 'file2.ts'] }
      });
    });

    it('should handle mixed content types', () => {
      const row: SupabaseDbChatMessage = {
        id: 'msg_mixed',
        session_id: 'session_mixed',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'I will search for files.'
          },
          {
            type: 'tool_use',
            tool_use_id: 'tool_search',
            tool_name: 'search_files',
            tool_input: { pattern: '*.js' }
          }
        ],
        timestamp: '2024-01-15T10:33:00Z'
      };

      const events = RowMapper.map(row);
      
      expect(events).toHaveLength(2);
      expect(events[0].kind).toBe('message');
      expect(events[1].kind).toBe('tool_call');
    });

    it('should handle invalid role gracefully', () => {
      const row: SupabaseDbChatMessage = {
        id: 'msg_invalid',
        session_id: 'session_invalid',
        role: 'invalid_role',
        content: [{ type: 'text', text: 'Test' }],
        timestamp: '2024-01-15T10:34:00Z'
      };

      const events = RowMapper.map(row);
      
      expect(events).toHaveLength(1);
      expect(events[0].role).toBe('system'); // Should default to system
    });

    it('should handle empty content gracefully', () => {
      const row: SupabaseDbChatMessage = {
        id: 'msg_empty',
        session_id: 'session_empty',
        role: 'user',
        content: [],
        timestamp: '2024-01-15T10:35:00Z'
      };

      const events = RowMapper.map(row);
      
      expect(events).toHaveLength(1);
      expect(events[0].kind).toBe('message');
      expect(events[0].content[0].text).toBe('Empty message');
    });
  });

  describe('mapBatch', () => {
    it('should map multiple rows and sort by timestamp', () => {
      const rows: SupabaseDbChatMessage[] = [
        {
          id: 'msg_2',
          session_id: 'session_1',
          role: 'user',
          content: [{ type: 'text', text: 'Second message' }],
          timestamp: '2024-01-15T10:32:00Z'
        },
        {
          id: 'msg_1',
          session_id: 'session_1',
          role: 'user',
          content: [{ type: 'text', text: 'First message' }],
          timestamp: '2024-01-15T10:31:00Z'
        }
      ];

      const events = RowMapper.mapBatch(rows);
      
      expect(events).toHaveLength(2);
      expect(events[0].id).toBe('msg_1'); // Should be sorted by timestamp
      expect(events[1].id).toBe('msg_2');
    });
  });

  describe('canMap', () => {
    it('should return true for valid row', () => {
      const row = {
        id: 'msg_123',
        session_id: 'session_456',
        role: 'user',
        content: [],
        timestamp: '2024-01-15T10:30:00Z'
      };

      expect(RowMapper.canMap(row)).toBe(true);
    });

    it('should return false for invalid row', () => {
      const invalidRow = {
        id: 123, // Should be string
        role: 'user'
        // Missing required fields
      };

      expect(RowMapper.canMap(invalidRow)).toBe(false);
    });
  });
});