/**
 * Types for the Plans table and related functionality
 */

/**
 * Interface representing a row from the plans table
 */
export interface PlanRow {
  id: string;
  title: string | null;
  status: string | null;
  markdown: string;
  current_version: number | null;
  created_at: string | null;
  updated_at: string | null;
  session_id: string | null;
}