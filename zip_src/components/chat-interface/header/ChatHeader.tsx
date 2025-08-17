import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useParams } from 'react-router-dom';
import { Shield, GitBranch } from 'lucide-react';

// Hooks
import { useChatUI } from '@/context/ChatUIContext';
import { useSelections } from '@/context/SelectionContext';
import { useAgentConfigs } from '@/hooks/useAgentConfigs';
import { useSessionStatusStore } from '@/stores/sessionStatusStore';

// Utils
import { AVAILABLE_MODELS, type ModelDefinition } from '@/utils/modelDefinitions';
import type { AgentConfigTS } from '@/types/agentConfig';

// Subcomponents
import AgentSelector from './AgentSelector';
import ModelSelector from './ModelSelector';
import SessionMetadata from './SessionMetadata';
import PermissionsModal from './PermissionsModal';
import SessionDataDebugOverlay from '@/components/debug/SessionDataDebugOverlay';
import SCMInfoModal from '@/components/scm/SCMInfoModal';


interface ChatHeaderProps {
  sessionId?: string | null;
  onOpenAgentSelector?: () => void;
  className?: string;
  // Refined mode props
  refinedMode?: boolean;
  onToggleRefinedMode?: (enabled: boolean) => void;
  hasMessages?: boolean;
  // Stream debug overlay props
  streamDebugOverlayOpen?: boolean;
  onToggleStreamDebugOverlay?: (open: boolean) => void;
  // Hydration debug overlay props
  hydrationDebugOverlayOpen?: boolean;
  onToggleHydrationDebugOverlay?: (open: boolean) => void;
  // Tool debug panel props
  toolDebugOpen?: boolean;
  onToggleToolDebug?: (open: boolean) => void;
}

/**
 * ChatHeader - Main chat header component with agent/model selection and session info
 * 
 * Features:
 * - Agent selection dropdown
 * - Model selection dropdown
 * - Session metadata display
 * - Agent capabilities display
 * - Header actions (new chat, refined mode, debug)
 * - Debug panel with comprehensive information
 * - Responsive design
 * - Selection context integration
 */
export const ChatHeader: React.FC<ChatHeaderProps> = ({ 
  className,
  refinedMode = true,
  onToggleRefinedMode,
  toolDebugOpen = false,
  onToggleToolDebug,
}) => {
  const chatUI = useChatUI();
  const selections = useSelections();
  const { agentConfigsArray, isLoading: agentConfigsLoading } = useAgentConfigs();
  // Approval settings are now handled by the ApprovalSettingsDropdown component
  
  // Session status for idle/receiving indicator
  const { sessionId } = useParams<{ sessionId: string }>();
  const status = useSessionStatusStore(s => (sessionId ? s.getStatus(sessionId) : 'idle'));
  const isIdle = status === 'idle';
  
  // Local state for dropdowns and panels
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [scmInfoModalOpen, setSCMInfoModalOpen] = useState(false);
  const [debugOverlayOpen, setDebugOverlayOpen] = useState(false);
  
  // Get current session and data
  const currentSession = chatUI.currentSession;
  const currentAgentConfig = chatUI.currentAgentConfig;
  const isSessionLoading = chatUI.isLoading;
  
  // Get current and available models
  const currentModel = AVAILABLE_MODELS.find(m => 
    m.id === (selections.effectiveModelId || currentSession?.model_id)
  ) || AVAILABLE_MODELS[0];
  
  const availableModels = AVAILABLE_MODELS;
  
  // Get agent tools for capabilities display - commented out as currently unused
  // Uncomment when CapabilitiesDisplay is enabled again
  /* 
  const agentTools = React.useMemo(() => {
    if (!currentAgentConfig?.tools) return [];
    
    return currentAgentConfig.tools.map(tool => ({
      name: tool.name || 'Unknown Tool',
      description: tool.description,
      category: tool.category
    }));
  }, [currentAgentConfig?.tools]);
  */
  
  // Event handlers
  const handleAgentSelect = useCallback(async (agent: AgentConfigTS) => {
    try {
      selections.setSelectedAgentConfigId(agent.id);
      setAgentDropdownOpen(false);
      toast.success(`Switched to ${agent.agent.name}`);
    } catch (error) {
      console.error('Error selecting agent:', error);
      toast.error('Failed to select agent');
    }
  }, [selections]);
  
  const handleModelSelect = useCallback(async (model: ModelDefinition) => {
    try {
      selections.setSelectedModelId(model.id);
      setModelDropdownOpen(false);
      toast.success(`Switched to ${model.name}`);
    } catch (error) {
      console.error('Error selecting model:', error);
      toast.error('Failed to select model');
    }
  }, [selections]);
  
  // Close all dropdowns
  const closeAllDropdowns = useCallback(() => {
    setAgentDropdownOpen(false);
    setModelDropdownOpen(false);
  }, []);

  // Handle permissions modal
  const handleOpenPermissions = useCallback(() => {
    closeAllDropdowns();
    setPermissionsModalOpen(true);
  }, [closeAllDropdowns]);

  // Handle SCM info modal
  const handleOpenSCMInfo = useCallback(() => {
    closeAllDropdowns();
    setSCMInfoModalOpen(true);
  }, [closeAllDropdowns]);
  
  // Get display name for current agent
  const agentDisplayName = React.useMemo(() => {
    if (selections.selectedAgentConfigId) {
      const selectedAgent = agentConfigsArray.find(a => a.id === selections.selectedAgentConfigId);
      if (selectedAgent) return selectedAgent.name;
    }
    return currentAgentConfig?.name || 'General';
  }, [selections.selectedAgentConfigId, agentConfigsArray, currentAgentConfig]);
  
  // StatusBadge component for idle/receiving indicator
  const StatusBadge = React.useMemo(() => {
    if (!refinedMode) return null;
    
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all",
        isIdle ? [
          "bg-gray-500/10 border-gray-500/30 text-gray-400"
        ] : [
          "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
        ]
      )}>
        <div className={cn(
          "w-2 h-2 rounded-full",
          isIdle ? "bg-gray-500" : "bg-emerald-500"
        )} />
        <span className="text-[13px] font-medium">
          {isIdle ? 'Idle' : 'Working'}
        </span>
        {!isIdle && (
          <div className="flex gap-1">
            <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
            <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
          </div>
        )}
      </div>
    );
  }, [refinedMode, isIdle]);
  
  return (
    <div
      className={cn(
        /* push header above modals / scroll-area */
        "relative z-[120]",
        "flex items-center justify-between px-4 py-3",
        "bg-gradient-to-r from-black/40 to-black/20",
        "backdrop-blur-xl border-b border-white/[0.08]",
        className
      )}
    >
      {/* Left Section - Session Metadata + Agent & Model Selection */}
      <div className="flex items-center gap-3">

        {/* Session Metadata (moved to first position) */}
        {isSessionLoading && !currentSession ? (
          <div className="flex items-center gap-2 px-3 py-1">
            <div className="w-3.5 h-3.5 rounded-full bg-white/30 animate-pulse" />
            <span className="text-[13px] text-white/50">Loading session...</span>
          </div>
        ) : (
          <SessionMetadata
            {...(currentSession?.name ? { sessionName: currentSession.name } : {})}
            cwd={currentSession?.agent_cwd || ''}
            messageCount={currentSession?.messages?.length || 0}
            showCwd={true}
            showMessageCount={false}
            showName={true}
            className="gap-2"
          />
        )}
        
        {/* Border separator */}
        <div className="border-r border-white/[0.08] h-6" />
        
        {/* Agent Selector */}
        <AgentSelector
          currentAgentConfigId={selections.effectiveAgentConfigId || currentSession?.agent_config_id}
          agentConfigsArray={agentConfigsArray}
          isLoading={agentConfigsLoading}
          displayName={agentDisplayName}
          isOpen={agentDropdownOpen}
          onToggle={() => {
            closeAllDropdowns();
            setAgentDropdownOpen(!agentDropdownOpen);
          }}
          onClose={() => setAgentDropdownOpen(false)}
          onAgentSelect={handleAgentSelect}
        />
        
        {/* Model Selector */}
        <ModelSelector
          currentModelId={selections.effectiveModelId || currentSession?.model_id}
          availableModels={availableModels}
          currentModel={currentModel}
          isOpen={modelDropdownOpen}
          onToggle={() => {
            closeAllDropdowns();
            setModelDropdownOpen(!modelDropdownOpen);
          }}
          onClose={() => setModelDropdownOpen(false)}
          onModelSelect={handleModelSelect}
        />
{/*         
        <CapabilitiesDisplay
          tools={agentTools}
          agentName={currentAgentConfig?.name}
          showCount={true}
          expandable={true}
          maxVisible={5}
        /> */}
      </div>
      
      {/* Right Section - Status & Debug Controls */}
      <div className="flex items-center gap-3">
        {/* SCM Info Button */}
        {sessionId && (
          <button
            onClick={handleOpenSCMInfo}
            title="View SCM information and checkpoints"
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full",
              "border transition-all",
              "bg-white/[0.06] border-white/[0.08]",
              "hover:bg-white/[0.1] hover:border-white/[0.12]",
              "text-white/70 hover:text-white/90"
            )}
          >
            <GitBranch className="w-4 h-4" />
            <span className="text-[13px] font-medium">SCM</span>
          </button>
        )}

        {/* Permissions Button */}
        {sessionId && (
          <button
            onClick={handleOpenPermissions}
            title="Manage session permissions"
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full",
              "border transition-all",
              "bg-white/[0.06] border-white/[0.08]",
              "hover:bg-white/[0.1] hover:border-white/[0.12]",
              "text-white/70 hover:text-white/90"
            )}
          >
            <Shield className="w-4 h-4" />
            <span className="text-[13px] font-medium">Permissions</span>
          </button>
        )}

        {/* Status Badge - only in refined mode */}
        {StatusBadge}

        {/* Session Data Debug Button */}
        {/* <button
          onClick={() => setDebugOverlayOpen(!debugOverlayOpen)}
          title="Session Data Debug"
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full",
            "border transition-all",
            debugOverlayOpen ? [
              "bg-red-500/10 border-red-500/30",
              "hover:bg-red-500/15 hover:border-red-500/40"
            ] : [
              "bg-white/[0.06] border-white/[0.08]",
              "hover:bg-white/[0.1] hover:border-white/[0.12]"
            ]
          )}
        >
          <span className={cn(
            "text-[13px] font-medium",
            debugOverlayOpen ? "text-red-400" : "text-white/70"
          )}>
            🎯 DEBUG
          </span>
        </button> */}

      </div>

      {/* SCM Info Modal */}
      <SCMInfoModal
        isOpen={scmInfoModalOpen}
        onClose={() => setSCMInfoModalOpen(false)}
        sessionId={sessionId}
      />

      {/* Permissions Modal */}
      <PermissionsModal
        isOpen={permissionsModalOpen}
        onClose={() => setPermissionsModalOpen(false)}
        sessionId={sessionId || ''}
        currentCwd={chatUI.currentSession?.agent_cwd || '/workspace'}
      />

      {/* Session Data Debug Overlay */}
      {/* <SessionDataDebugOverlay
        isOpen={debugOverlayOpen}
        onToggle={() => setDebugOverlayOpen(!debugOverlayOpen)}
      /> */}
    </div>
  );
};

export default ChatHeader;