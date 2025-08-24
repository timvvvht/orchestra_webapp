import React, { useState } from "react";
import { usePendingToolsStore } from "@/stores/pendingToolsStore";

import "./ChatMissionControl.css";
import "./styles/apple-dark-theme.css";
import "./styles/water-infinity-theme.css";

// Pending Tools Debug Overlay Component
const PendingToolsDebugOverlay: React.FC = () => {
  const { jobs } = usePendingToolsStore();
  const allJobs = Object.values(jobs);
  const [showFullJSON, setShowFullJSON] = useState(false);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());

  if (allJobs.length === 0) {
    return null; // Don't show overlay if no jobs
  }

  const toggleJobExpansion = (jobId: string) => {
    const newExpanded = new Set(expandedJobs);
    if (newExpanded.has(jobId)) {
      newExpanded.delete(jobId);
    } else {
      newExpanded.add(jobId);
    }
    setExpandedJobs(newExpanded);
  };

  return (
    <div className="fixed top-4 right-4 bg-black/90 border border-white/20 rounded-lg p-4 max-w-lg max-h-[80vh] overflow-y-auto z-[9999]">
      <div className="text-white font-semibold mb-3 flex items-center justify-between">
        <span>🔧 Pending Tools Queue ({allJobs.length})</span>
        <button
          onClick={() => setShowFullJSON(!showFullJSON)}
          className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors"
        >
          {showFullJSON ? "Hide JSON" : "Show JSON"}
        </button>
      </div>

      <div className="space-y-3">
        {allJobs.map((job) => {
          const isExpanded = expandedJobs.has(job.id);
          return (
            <div key={job.id} className="bg-white/5 rounded p-3 text-sm">
              <div className="text-white font-medium mb-2 flex items-center justify-between">
                <span>{job.sse?.ji?.tool_name || "Unknown Tool"}</span>
                {showFullJSON && (
                  <button
                    onClick={() => toggleJobExpansion(job.id)}
                    className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors"
                  >
                    {isExpanded ? "▼" : "▶"}
                  </button>
                )}
              </div>

              <div className="space-y-1 text-white/70">
                <div>
                  <span className="text-white/50">ID:</span> {job.id}
                </div>
                <div>
                  <span className="text-white/50">Status:</span>
                  <span
                    className={`ml-1 px-2 py-0.5 rounded text-xs ${
                      job.status === "waiting"
                        ? "bg-yellow-500/20 text-yellow-300"
                        : job.status === "approved"
                          ? "bg-green-500/20 text-green-300"
                          : job.status === "rejected"
                            ? "bg-red-500/20 text-red-300"
                            : "bg-gray-500/20 text-gray-300"
                    }`}
                  >
                    {job.status}
                  </span>
                </div>
                <div>
                  <span className="text-white/50">Session:</span>{" "}
                  {job.sse?.session_id || "None"}
                </div>
                <div>
                  <span className="text-white/50">Is Test:</span>{" "}
                  {job.id.startsWith("test_") ? "Yes" : "No"}
                </div>
                <div>
                  <span className="text-white/50">Created:</span>{" "}
                  {new Date(job.createdAt).toLocaleTimeString()}
                </div>
                {!showFullJSON && job.sse?.ji && (
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <div className="text-white/50 text-xs mb-1">
                      Job Instruction:
                    </div>
                    <div className="text-white/60 text-xs">
                      <div>Job ID: {job.sse.ji.job_id}</div>
                      <div>Tool Use ID: {job.sse.ji.tool_use_id || "None"}</div>
                      <div>Tool: {job.sse.ji.tool_name}</div>
                      {job.sse.ji.args && (
                        <div>
                          Args:{" "}
                          {JSON.stringify(job.sse.ji.args).substring(0, 50)}...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {showFullJSON && (
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <div className="text-white/50 text-xs mb-1 flex items-center justify-between">
                      <span>Full Job Object:</span>
                    </div>
                    {isExpanded ? (
                      <pre className="text-white/60 text-xs bg-black/30 p-2 rounded overflow-x-auto whitespace-pre-wrap break-words">
                        {JSON.stringify(job, null, 2)}
                      </pre>
                    ) : (
                      <div className="text-white/60 text-xs">
                        Click ▶ to expand full JSON
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-white/10 text-xs text-white/50">
        This overlay shows all jobs in the pending tools store for debugging
        approval workflow.
      </div>
    </div>
  );
};

export default PendingToolsDebugOverlay;
