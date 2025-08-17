/**
 * Row mapper for converting database rows to canonical events
 * Handles mapping between Supabase chat message format and event store format
 */

import type { CanonicalEvent } from "@/types/events";

export interface DatabaseRow {
  id: string;
  session_id: string;
  role: string;
  content: any;
  created_at: string;
  updated_at?: string;
  is_streaming?: boolean;
  message_id?: string;
}

/**
 * Maps a single database row to a canonical event
 */
export function mapRow(row: DatabaseRow): CanonicalEvent {
  return {
    id: row.id,
    kind: "message",
    role: row.role as "user" | "assistant",
    content: Array.isArray(row.content)
      ? row.content
      : [{ type: "text", text: row.content || "" }],
    createdAt: row.created_at,
    sessionId: row.session_id,
    partial: row.is_streaming || false,
    source: "supabase" as const,
  };
}

/**
 * Maps a batch of database rows to canonical events
 */
export function mapBatch(rows: DatabaseRow[]): CanonicalEvent[] {
  return rows.map(mapRow);
}

/**
 * Maps a canonical event back to database row format
 */
export function mapToRow(event: CanonicalEvent): Partial<DatabaseRow> {
  return {
    id: event.id,
session_id: event.sessionId,
    role: event.role,
    created_at: event.createdAt,
    is_streaming: event.partial,
  };
}
