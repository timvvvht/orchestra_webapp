export interface Plan {
  id: string;
  session_id: string;
  title?: string;
  status?: string;
  markdown: string;
  current_version?: number;
  created_at?: string;
  updated_at: string;
}

export interface PlanProgress {
  total: number;
  checked: number;
  completed: number; // alias for checked - remove after UI migration
  unchecked: number;
  percent: number; // 0-100
  bar: string; // e.g. "████░░░░░░"
  status: "complete" | "in_progress" | "not_started";
  items: PlanItem[];
}

export interface PlanItem {
  id?: string;
  text: string;
  checked: boolean;
  line_number: number;
  indent_level: number;
  raw_line: string;
}

export interface PlansSnapshot {
  plansBySession: Record<string, Plan>;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
