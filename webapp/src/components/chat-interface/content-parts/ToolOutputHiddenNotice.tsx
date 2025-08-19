import React from "react";
import { EyeOff } from "lucide-react";
import { cn } from "cn-utility";

// Minimal, non-interactive notice shown when tool output is hidden via dev flag
export default function ToolOutputHiddenNotice() {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-md",
        "bg-white/[0.03] border border-white/[0.05]",
        "text-xs text-white/60"
      )}
    >
      <EyeOff className="w-3.5 h-3.5 text-white/50" aria-hidden="true" />
      <span>Tool output hidden (dev feature flag)</span>
    </div>
  );
}
