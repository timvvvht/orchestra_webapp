import React, { useState } from "react";
import { ChevronsDownUp } from "lucide-react";
import { RepoStatusEntry } from "@/utils/gitStatus";

const statusColour: Record<string, string> = {
  M: "text-yellow-400",
  A: "text-green-400",
  D: "text-red-400",
  "??": "text-blue-400",
};

interface Props {
  entries: RepoStatusEntry[];
  loading?: boolean;
}

export default function GitStatusList({ entries, loading }: Props) {
  const [expanded, setExpanded] = useState(false);
  if (loading) return null;
  const visible = expanded ? entries : entries.slice(0, 50);
  return (
    <div className="space-y-1 max-h-60 overflow-y-auto">
      {visible.map((e, idx) => (
        <div
          key={`${e.path}-${idx}`}
          aria-label={`git-status-${e.status}-${e.path}`}
          className="flex items-center gap-2 text-sm font-mono"
        >
          <span className={`${statusColour[e.status] ?? "text-white/70"} w-6`}>
            {e.status}
          </span>
          <span title={e.path} className="truncate flex-1 text-white/80">
            {e.path}
          </span>
        </div>
      ))}
      {entries.length > 50 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-white/60 hover:text-white/80 mt-1"
        >
          <ChevronsDownUp className="w-3 h-3" />
          {expanded ? "Show less" : `Show all ${entries.length}`}
        </button>
      )}
    </div>
  );
}
