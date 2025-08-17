// /Users/tim/Code/orchestra/src/pages/ToolApprovalTest.tsx
// -----------------------------------------------------------------------------
// Test Page for Tool Approval Workflow (Development Only)
// -----------------------------------------------------------------------------
// This page allows developers to test the approval workflow by:
//   1. Viewing current store state
//   2. Manually adding test jobs to the queue
//   3. Testing the approval UI components
//   4. Verifying cross-tab synchronization
// -----------------------------------------------------------------------------

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Plus, Trash2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePendingToolsStore, type PendingJob } from '@/stores/pendingToolsStore';
import { SENSITIVE_TOOLS, type SensitiveTool } from '@/config/approvalTools';
import ToolApprovalSettings from '@/components/settings/ToolApprovalSettings';

export default function ToolApprovalTest() {
  const { jobs, prefs, enqueue, approve, reject, setPref, _pruneExpired } = usePendingToolsStore();
  const [selectedTool, setSelectedTool] = useState<SensitiveTool>('str_replace_editor');

  // Create a test job
  const createTestJob = () => {
    const testJob: PendingJob = {
      id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tool: selectedTool,
      sse: {
        ji: {
          job_id: `job_${Date.now()}`,
          tool_name: selectedTool,
          args: {
            path: '/test/file.txt',
            content: 'Test content for approval workflow'
          }
        }
      },
      createdAt: Date.now(),
      status: 'waiting'
    };
    
    enqueue(testJob);
  };

  const clearAllJobs = () => {
    Object.keys(jobs).forEach(id => reject(id));
  };

  const jobsArray = Object.values(jobs);
  const waitingJobs = jobsArray.filter(job => job.status === 'waiting');
  const processedJobs = jobsArray.filter(job => job.status !== 'waiting');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">
            Tool Approval Workflow Test
          </h1>
          <p className="text-white/60">
            Test the local tool approval system and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Controls & State */}
          <div className="space-y-6">
            {/* Test Controls */}
            <div className="p-6 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Test Controls
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Tool to Test
                  </label>
                  <select
                    value={selectedTool}
                    onChange={(e) => setSelectedTool(e.target.value as SensitiveTool)}
                    className="w-full p-3 rounded-lg bg-black/20 border border-white/20 text-white"
                  >
                    {SENSITIVE_TOOLS.map(tool => (
                      <option key={tool} value={tool}>{tool}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex gap-3">
                  <motion.button
                    onClick={createTestJob}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg",
                      "bg-blue-600/20 hover:bg-blue-600/30",
                      "border border-blue-500/30 hover:border-blue-500/50",
                      "text-blue-400 hover:text-blue-300",
                      "transition-all duration-200 font-medium"
                    )}
                  >
                    <Plus className="w-4 h-4" />
                    Add Test Job
                  </motion.button>
                  
                  <motion.button
                    onClick={clearAllJobs}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg",
                      "bg-red-600/20 hover:bg-red-600/30",
                      "border border-red-500/30 hover:border-red-500/50",
                      "text-red-400 hover:text-red-300",
                      "transition-all duration-200 font-medium"
                    )}
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear All
                  </motion.button>
                  
                  <motion.button
                    onClick={() => _pruneExpired()}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg",
                      "bg-amber-600/20 hover:bg-amber-600/30",
                      "border border-amber-500/30 hover:border-amber-500/50",
                      "text-amber-400 hover:text-amber-300",
                      "transition-all duration-200 font-medium"
                    )}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Prune Expired
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Current State */}
            <div className="p-6 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-white mb-4">Store State</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-white/80 mb-2">
                    Waiting Jobs ({waitingJobs.length})
                  </h3>
                  {waitingJobs.length === 0 ? (
                    <p className="text-white/40 text-sm">No jobs waiting for approval</p>
                  ) : (
                    <div className="space-y-2">
                      {waitingJobs.map(job => (
                        <div key={job.id} className="p-3 rounded bg-amber-600/10 border border-amber-500/20">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-amber-400">{job.tool}</p>
                              <p className="text-xs text-white/60">ID: {job.id}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => approve(job.id)}
                                className="px-2 py-1 text-xs bg-green-600/20 text-green-400 rounded"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => reject(job.id)}
                                className="px-2 py-1 text-xs bg-red-600/20 text-red-400 rounded"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-white/80 mb-2">
                    Processed Jobs ({processedJobs.length})
                  </h3>
                  {processedJobs.length === 0 ? (
                    <p className="text-white/40 text-sm">No processed jobs</p>
                  ) : (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {processedJobs.map(job => (
                        <div key={job.id} className="p-2 rounded bg-white/5 text-xs">
                          <span className="text-white/60">{job.tool}</span>
                          <span className={cn(
                            "ml-2 px-2 py-0.5 rounded",
                            job.status === 'approved' 
                              ? "bg-green-600/20 text-green-400"
                              : "bg-red-600/20 text-red-400"
                          )}>
                            {job.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-white/80 mb-2">Preferences</h3>
                  <div className="text-xs space-y-1">
                    {SENSITIVE_TOOLS.map(tool => (
                      <div key={tool} className="flex justify-between">
                        <span className="text-white/60">{tool}</span>
                        <span className="text-white/80">{prefs[tool] || 'ask'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Settings */}
          <div>
            <ToolApprovalSettings />
          </div>
        </div>
      </div>
    </div>
  );
}