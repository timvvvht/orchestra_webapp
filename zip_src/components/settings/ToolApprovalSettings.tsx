// /Users/tim/Code/orchestra/src/components/settings/ToolApprovalSettings.tsx
// -----------------------------------------------------------------------------
// Tool Approval Preferences Component (Browser-Only MVP)
// -----------------------------------------------------------------------------
// Provides UI for users to configure per-tool approval preferences:
//   - always: Auto-approve this tool (no prompt)
//   - never: Auto-reject this tool (no prompt) 
//   - ask: Prompt user each time (default)
// -----------------------------------------------------------------------------

import React, { useState } from 'react';
import { Shield, Check, X, HelpCircle, Wrench, FileEdit, Copy, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SENSITIVE_TOOLS, type SensitiveTool } from '@/config/approvalTools';
import { usePendingToolsStore, type Preference } from '@/stores/pendingToolsStore';

interface ToolApprovalSettingsProps {
  className?: string;
}

export default function ToolApprovalSettings({ className }: ToolApprovalSettingsProps) {
  const { prefs, setPref } = usePendingToolsStore();
  const [recentlyChanged, setRecentlyChanged] = useState<string | null>(null);

  const getPreferenceIcon = (pref: Preference) => {
    switch (pref) {
      case 'always': return <Check className="w-4 h-4 text-white/90" />;
      case 'never': return <X className="w-4 h-4 text-white/90" />;
      case 'ask': return <HelpCircle className="w-4 h-4 text-white/70" />;
    }
  };

  const getToolIcon = (tool: SensitiveTool) => {
    switch (tool) {
      case 'str_replace_editor': return <FileEdit className="w-5 h-5 text-white/70" />;
      case 'cp': return <Copy className="w-5 h-5 text-white/70" />;
      case 'mv': return <RotateCcw className="w-5 h-5 text-white/70" />;
      case 'execute_in_runner_session': return <Wrench className="w-5 h-5 text-white/70" />;
      default: return <Shield className="w-5 h-5 text-white/70" />;
    }
  };

  const getToolDisplayName = (tool: SensitiveTool): string => {
    switch (tool) {
      case 'str_replace_editor': return 'File Editor';
      case 'cp': return 'Copy Files';
      case 'mv': return 'Move/Rename Files';
      case 'execute_in_runner_session': return 'Shell Commands';
      default: return tool;
    }
  };

  const getToolDescription = (tool: SensitiveTool): string => {
    switch (tool) {
      case 'str_replace_editor': return 'Create, modify, or delete files';
      case 'cp': return 'Copy files and directories';
      case 'mv': return 'Move or rename files and directories';
      case 'execute_in_runner_session': return 'Execute shell commands and scripts';
      default: return 'Sensitive tool operation';
    }
  };

  const getPreferenceLabel = (pref: Preference): string => {
    switch (pref) {
      case 'always': return 'Always Allow';
      case 'never': return 'Always Block';
      case 'ask': return 'Ask Each Time';
    }
  };

  const handlePreferenceChange = (tool: SensitiveTool, pref: Preference) => {
    setPref(tool, pref);
    
    // Visual feedback
    const changeKey = `${tool}-${pref}`;
    setRecentlyChanged(changeKey);
    
    // Clear the visual feedback after animation
    setTimeout(() => {
      setRecentlyChanged(null);
    }, 600);
    
    // Subtle toast notification
    const toolName = getToolDisplayName(tool);
    const prefLabel = getPreferenceLabel(pref);
    
    toast.success(`${toolName} set to "${prefLabel}"`, {
      duration: 2000,
      style: {
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.20)',
        color: 'rgba(255, 255, 255, 0.90)',
        fontSize: '14px',
        fontWeight: '300',
      },
    });
  };

  return (
    <div className={cn("w-full h-full", className)}>
      {/* Single Column Layout */}
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none rounded-2xl" />
          <div className="relative">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white/70" />
              </div>
              <div>
                <h2 className="text-xl font-medium text-white/90">Tool Permissions</h2>
                <p className="text-sm text-white/70 font-light">
                  Configure how sensitive operations are handled
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tools List */}
        <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none rounded-2xl" />

          {/* Section Header */}
          <div className="relative px-8 py-6 border-b border-white/10 bg-white/[0.02]">
            <h3 className="text-lg font-medium text-white/90">Sensitive Tools</h3>
            <p className="text-sm text-white/70 font-light mt-1">
              Configure approval preferences for each tool
            </p>
          </div>

          {/* Tools Grid */}
          <div className="relative p-8 space-y-6">
            {SENSITIVE_TOOLS.map((tool, index) => {
              const currentPref = prefs[tool] || 'ask';

              return (
                <div
                  key={tool}
                  className="group"
                  style={{
                    animationDelay: `${index * 100}ms`
                  }}
                >
                  <div className="bg-white/[0.02] backdrop-blur-lg rounded-xl border border-white/10 p-6 hover:bg-white/[0.05] hover:border-white/20 transition-all duration-300">
                    <div className="flex items-start justify-between gap-6">
                      {/* Tool Info */}
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                          {getToolIcon(tool)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base font-medium text-white/90 mb-1">
                            {getToolDisplayName(tool)}
                          </h4>
                          <p className="text-sm text-white/70 font-light mb-3">
                            {getToolDescription(tool)}
                          </p>
                          <div className="inline-flex items-center px-3 py-1 rounded-lg bg-white/5 border border-white/10">
                            <code className="text-xs text-white/60 font-mono">
                              {tool}
                            </code>
                          </div>
                        </div>
                      </div>

                      {/* Preference Controls */}
                      <div className="flex gap-2 flex-shrink-0">
                        {(['always', 'ask', 'never'] as const).map((pref) => {
                          const isActive = currentPref === pref;
                          const changeKey = `${tool}-${pref}`;
                          const isRecentlyChanged = recentlyChanged === changeKey;
                          
                          return (
                            <button
                              key={pref}
                              onClick={() => handlePreferenceChange(tool, pref)}
                              className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 text-sm font-medium",
                                isActive
                                  ? "bg-white/10 border border-white/20 text-white/90 shadow-lg"
                                  : "bg-white/[0.02] border border-white/10 text-white/70 hover:bg-white/5 hover:border-white/15 hover:text-white/90"
                              )}
                              style={{
                                transform: isRecentlyChanged ? 'scale(1.02)' : 'scale(1)',
                                boxShadow: isRecentlyChanged 
                                  ? '0 0 20px rgba(255, 255, 255, 0.1), 0 0 40px rgba(255, 255, 255, 0.05)' 
                                  : undefined,
                              }}
                            >
                              {getPreferenceIcon(pref)}
                              <span>{getPreferenceLabel(pref)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}