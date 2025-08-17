import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
// uuid no longer needed - using real session IDs
// import { v4 as uuidv4 } from 'uuid';

import { useAgentConfigs } from '@/hooks/useAgentConfigs';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuth } from '@/auth/AuthContext';
import { getDefaultACSClient } from '@/services/acs';
import { useSelections } from '@/context/SelectionContext';
import type { AgentConfigTS } from '@/types/agentConfig';
import { AVAILABLE_MODELS } from '@/utils/modelDefinitions';
import '@/styles/orchestra-transitions.css';

// Session permissions integration
import { sessionPermissionsUtils } from '@/stores/sessionPermissionsStore';

// Tool registration utilities
// import { registerToolsByNames } from '@/utils/toolSpecRegistry';

// Fire-and-forget message sending
import { sendChatMessage } from '@/utils/sendChatMessage';

// Tool registration utilities
// import { registerToolsByNames } from '@/utils/toolSpecRegistry';

// Icons
import { Sparkles, Search, FileUp, FolderOpen } from 'lucide-react';

// Types
import { ProjectContext } from '@/types/landingTypes';
import { LexicalPillEditor } from '@/components/drafts/LexicalPillEditor';

// Enhanced model selector component - Matches the sophisticated design language
const ModelTinySelect = ({
  current,
  onChange,
}: {
  current: string;
  onChange: (id: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const currentModel = AVAILABLE_MODELS.find(m => m.id === current);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Calculate dropdown position when opening - Always drop down
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      
      setDropdownPosition({
        top: rect.bottom + 8, // Always show below trigger
        left: rect.right - 240, // Right-align with trigger (240px is dropdown width)
      });
    }
  }, [isOpen]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current && 
        !triggerRef.current.contains(event.target as Node) &&
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);
  
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);
  
  return (
    <>
      {/* Trigger button - Enhanced styling */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-light text-white/70 hover:text-white/90 focus:outline-none transition-all duration-200"
      >
        {/* Subtle background on hover */}
        <div className="absolute inset-0 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* Model icon */}
        <div className="relative w-4 h-4 rounded-md bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
          <div className="w-2 h-2 rounded-sm bg-white/60" />
        </div>
        
        <span className="relative">{currentModel?.shortName || 'Select Model'}</span>
        
        {/* Chevron with smooth rotation */}
        <svg
          className={`relative w-3 h-3 transition-all duration-300 ${isOpen ? 'rotate-180 text-white/90' : 'text-white/50'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown - Rendered via Portal */}
      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed z-[100]"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            animation: 'dropdownSlideUp 0.2s cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        >
          {/* Dropdown container with gradient border */}
          <div className="relative group">
            {/* Gradient border effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-xl blur-sm" />
            
            {/* Main dropdown content */}
            <div className="relative w-[240px] bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl py-2 shadow-2xl">
              {/* Header */}
              <div className="px-4 py-2 border-b border-white/5">
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Select Model</p>
              </div>
              
              {/* Model options - Limited to ~5 items visible */}
              <div className="py-1 max-h-[200px] overflow-y-auto">
                {(() => {
                  // Custom tier ordering
                  const tierOrder = [
                    'gemini-2.5-pro',
                    'claude-3-5-sonnet-20241022', 
                    'gpt-4o',
                    'o3-mini'
                  ];
                  
                  // Sort models: current selection first, then by tier order, then alphabetically
                  const sortedModels = [...AVAILABLE_MODELS].sort((a, b) => {
                    // Current selection always first
                    if (a.id === current) return -1;
                    if (b.id === current) return 1;
                    
                    // Then by tier order
                    const aTierIndex = tierOrder.indexOf(a.id);
                    const bTierIndex = tierOrder.indexOf(b.id);
                    
                    if (aTierIndex !== -1 && bTierIndex !== -1) {
                      return aTierIndex - bTierIndex;
                    }
                    if (aTierIndex !== -1) return -1;
                    if (bTierIndex !== -1) return 1;
                    
                    // Alphabetical for everything else
                    return a.shortName.localeCompare(b.shortName);
                  });
                  
                  return sortedModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      onChange(model.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-all duration-150 relative group/item ${
                      model.id === current 
                        ? 'text-white bg-white/10' 
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="block truncate">{model.shortName}</span>
                        {/* Optional: Add model description */}
                        {model.id === current && (
                          <span className="text-xs text-white/40 mt-0.5 block">Currently selected</span>
                        )}
                      </div>
                      
                      {/* Selection indicator */}
                      {model.id === current && (
                        <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    
                    {/* Hover accent line */}
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-400 to-purple-400 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                  </button>
                  ));
                })()}
              </div>
              
              {/* Footer tip */}
              <div className="px-4 py-2 border-t border-white/5">
                <p className="text-xs text-white/30">Model affects response style and capabilities</p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      
      {/* Animation styles */}
      <style jsx>{`
        @keyframes dropdownSlideUp {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
};

interface LandingPageInfiniteProps {
  projectContext?: ProjectContext | undefined;
  onProjectChange?: (() => void) | undefined;
}

// The interface that disappears
export function LandingPageInfinite({ 
  projectContext, 
  onProjectChange 
}: LandingPageInfiniteProps = {}) {
  const navigate = useNavigate();
  const auth = useAuth();
  const selections = useSelections();
  const [isLoading, setIsLoading] = useState(false);
  const { agentConfigs, agentConfigsArray, isLoading: configsLoading, error: configsError } = useAgentConfigs();
  const { settings } = useSettingsStore();
  
  const [editorContent, setEditorContent] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<AgentConfigTS | null>(null);
  const [showAgentBrowser, setShowAgentBrowser] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const searchRef = useRef<HTMLInputElement>(null);
  
  // Get all agents as array (now provided directly by the hook)
  const allAgents = useMemo(() => 
    agentConfigsArray,
    [agentConfigsArray]
  );

  // Get current model (from context selection, agent default, or fallback)
  const currentModelId = useMemo(() => {
    if (selections.selectedModelId) {
      return selections.selectedModelId; // User override from context
    }
    if (selectedAgent?.ai_config?.model_id) {
      return selectedAgent.ai_config.model_id; // Agent default
    }
    return 'gpt-4'; // Fallback
  }, [selections.selectedModelId, selectedAgent]);

  // We don't need to compute model display info as we're only using the ID
  // and the select component now handles displaying the proper name

  // Initialize with default agent
  useEffect(() => {
    const defaultId = settings.defaultAgentId || Object.keys(agentConfigs)[0];
    if (defaultId && agentConfigs[defaultId]) {
      setSelectedAgent(agentConfigs[defaultId] as AgentConfigTS);
    } else if (allAgents.length > 0 && !selectedAgent) {
      // If no default ID matches, use the first available agent
      setSelectedAgent(allAgents[0]);
    }
  }, [agentConfigs, settings.defaultAgentId, allAgents, selectedAgent]);

  // Focus is handled by LexicalPillEditor's autoFocus prop





  // Handle starting conversation
  const handleStart = async () => {
    if (!editorContent.trim() || !selectedAgent) {
      console.log('[LandingPage] handleStart: Missing editorContent or selectedAgent', { editorContent: editorContent.trim(), selectedAgent: !!selectedAgent });
      return;
    }

    // Check authentication before allowing message sending
    if (!auth.isAuthenticated) {
      console.log('[LandingPage] handleStart: User not authenticated, showing auth modal');
      auth.setShowModal(true);
      return;
    }

    console.log('[LandingPage] handleStart: Starting conversation with real session-first:', { 
      editorContent: editorContent.trim(), 
      agentId: selectedAgent.id, 
      agentName: selectedAgent.agent.name,
      strategy: 'real-session-first'
    });

    try {
      setIsLoading(true);

      console.log('🚀 [LandingPage] REAL_SESSION_FIRST FLOW:', {
        editorContent: `"${editorContent.trim()}"`,
        editorContentLength: editorContent.trim().length,
        agentConfigId: selectedAgent.id,
        agentName: selectedAgent.agent.name,
        projectContext: projectContext ? {
          name: projectContext.name,
          path: projectContext.path
        } : null,
      });

      // 🔍 Determine path *before* using it anywhere
      const settingsStore = useSettingsStore.getState();
      const pathForQuery: string | undefined =
          projectContext?.path ||
          settingsStore.settings.vault.path ||
          undefined; // ⚠ no fallback!

      // 🛡️ CRITICAL: Check if we have a valid working directory
      if (!pathForQuery) {
        console.error('[LandingPage] No working directory available');
        alert('No working directory (vault path) configured – cannot start chat');
        setIsLoading(false);
        return; // abort handleStart
      }

      // 1️⃣ Create the real ACS session first
      const acsClient = getDefaultACSClient();
      const createReq = {
        name: `Chat with ${selectedAgent.agent.name}`,
        agent_config_id: selectedAgent.id,
        agent_cwd: pathForQuery,   // REQUIRED
        base_dir: pathForQuery
      };
      
      console.log('🏗️ [LandingPage] Creating real ACS session:', createReq);
      const createRes = await acsClient.sessions.createSession(createReq);
      const realSessionId = createRes.data.data.id;  // ← Fixed: correct path to session ID
      console.log('✅ [LandingPage] Real session created:', realSessionId);

      // 🛡️ CRITICAL: Set up session permissions immediately after session creation
      // This ensures the session has proper access controls from the start
      try {
        console.log('🛡️ [LandingPage] Setting up session permissions for new session:', {
          sessionId: realSessionId.slice(0, 8) + '...',
          codePath: pathForQuery,
          timestamp: new Date().toISOString()
        });
        
        await sessionPermissionsUtils.getOrCreateSessionPermissions(realSessionId, pathForQuery || process.cwd());
        
        console.log('✅ [LandingPage] Session permissions successfully established');
      } catch (error) {
        console.error('🚨 [LandingPage] Failed to set up session permissions:', error);
        // Continue with session creation even if permissions setup fails
        // The permissions will be created later when first tool is used
      }

      // 🔧 Register apply_patch tool for the session
      try {
        console.log('🔧 [LandingPage] Registering apply_patch tool for session:', {
          sessionId: realSessionId.slice(0, 8) + '...',
          timestamp: new Date().toISOString()
        });
        
        
        console.log('✅ [LandingPage] apply_patch tool successfully registered');
      } catch (error) {
        console.error('🚨 [LandingPage] Failed to register apply_patch tool:', error);
        // Continue with session creation even if tool registration fails
        // The tool can be registered later if needed
      }

      // 2️⃣ Fire-and-forget send of the initial message
      const trimmedMessage = editorContent.trim();
      sendChatMessage({
        sessionId: realSessionId,
        message: trimmedMessage,
        userId: auth.user.id!, // auth guaranteed earlier
        agentConfigName: selectedAgent.id,
        acsClient: acsClient,
        acsOverrides: { agent_cwd_override: pathForQuery, base_dir_override: pathForQuery },
        overrides: selections.selectedModelId ? { model_id: selections.selectedModelId } : {},
      }).catch(err => {
        console.error('[LandingPage] Fire-and-forget initial message failed:', err);
        // Non-blocking: user can manually retry in chat UI
      });

      // 3️⃣ Build query string (extras only, no initialMessage)
      const queryParams: Record<string, string> = {
        agentConfigId: selectedAgent.id,
        sessionName: `Chat with ${selectedAgent.agent.name}`
      };
      
      // Include model override if user selected one
      if (selections.selectedModelId) {
        queryParams.modelId = selections.selectedModelId;
      }
      
      // Add project path if available
      if (pathForQuery) {
        queryParams.projectPath = encodeURIComponent(pathForQuery);
      }
      
      const qs = new URLSearchParams(queryParams).toString();

      // 4️⃣ Navigate – ChatRoute will connect to **real** session
      const targetUrl = `/chat/${realSessionId}?${qs}`;
      console.log('🧭 [LandingPage] Navigating to:', targetUrl);
      console.log('🔍 [LandingPage] Session ID check:', { realSessionId, type: typeof realSessionId });
      
      if (!realSessionId || realSessionId === 'undefined') {
        throw new Error(`Invalid session ID: ${realSessionId}`);
      }
      
      navigate(targetUrl);
    } catch (error) {
      console.error('[LandingPage] handleStart: Failed to navigate:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('[LandingPage] handleStart: Error details:', {
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'Unknown'
      });
      // Add user-facing error feedback
      alert(`Failed to start chat: ${errorMessage}`);
      setIsLoading(false);
    }
  };

  // Handle agent selection from browser
  const handleAgentSelect = (agent: AgentConfigTS) => {
    setSelectedAgent(agent);
    setShowAgentBrowser(false);
    // Clear model override when switching agents to use agent's default
    selections.setSelectedModelId(null);
  };



  // Filter agents for search
  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) return allAgents;
    
    const query = searchQuery.toLowerCase();
    return allAgents.filter(agent => 
      agent.agent.name.toLowerCase().includes(query) ||
      agent.agent.description.toLowerCase().includes(query)
    );
  }, [allAgents, searchQuery]);

  // Extract last referenced file from editor content for display
  const lastFilePath = useMemo(() => {
    const regex = /\[@[^\]]+\]\(@file:([^)]+)\)/g;
    const matches = [...editorContent.matchAll(regex)];
    if (!matches.length) return null;
    return matches[matches.length - 1][1]; // capture group #1 = full path
  }, [editorContent]);

  return (
    <div className="orchestra-page min-h-screen bg-black text-white overflow-hidden">
      {/* Subtle animated background */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-black to-slate-950" />
        <div 
          className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"
          style={{ animation: 'float 30s ease-in-out infinite' }}
        />
        <div 
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"
          style={{ animation: 'float 35s ease-in-out infinite reverse' }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 -mt-20">
        <div className="w-full max-w-3xl">
          {/* Project Context Bar */}
          {projectContext && (
            <div className="mb-4 flex items-center justify-between p-3 bg-white/[0.02] backdrop-blur-sm rounded-lg border border-white/[0.05]">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-white/50" />
                <span className="text-sm font-mono text-white/50">
                  {projectContext.name}
                </span>
                <span className="text-xs text-white/30">
                  {projectContext.path.replace(/^.*\/(?=.*\/)/, '.../')}
                </span>
              </div>
              {onProjectChange && (
                <button
                  onClick={onProjectChange}
                  className="text-xs text-white/50 hover:text-white/70 transition-colors"
                >
                  change
                </button>
              )}
            </div>
          )}

          {/* Minimal branding */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/5 backdrop-blur-sm mb-5">
              <Sparkles className="w-7 h-7 text-white/60" />
            </div>
            <h1 className="text-5xl md:text-6xl font-extralight tracking-tight mb-3">
              What can I do for you today?
            </h1>
            {/* <p className="text-white/50 font-light text-lg mb-2">
              AI assistants that write code, research topics, analyze data, and more
            </p>
            <p className="text-white/30 font-light text-sm">
              Choose your expert → Type your request → Get instant help
            </p> */}
          </div>

          {/* Unified Input Container */}
          <div className="relative group">
            {/* Gradient border - always visible */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl blur"></div>
            {/* White glow on hover */}
            <div className="absolute -inset-1 bg-white/10 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div className="relative bg-white/[0.03] backdrop-blur-md rounded-3xl border border-white/20 overflow-hidden transition-all duration-500">
              {/* Embedded Agent Selector */}
              {configsLoading ? (
                <div className="w-full flex items-center justify-between p-6 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-white/40 text-sm font-light">To:</div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/10 animate-pulse" />
                      <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              ) : configsError ? (
                <div className="w-full flex items-center justify-between p-6 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-white/40 text-sm font-light">To:</div>
                    <div className="text-red-400 text-sm">Failed to load agents</div>
                  </div>
                </div>
              ) : selectedAgent ? (
                <button
                  onClick={() => setShowAgentBrowser(true)}
                  className="w-full flex items-center justify-between p-6 pb-4 hover:bg-white/[0.02] transition-colors duration-200"
                >
                <div className="flex items-center gap-3">
                  <div className="text-white/40 text-sm font-light">To:</div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg overflow-hidden ring-1 ring-white/20">
                      {selectedAgent.agent.avatar ? (
                        <img
                          src={selectedAgent.agent.avatar.startsWith('/') || selectedAgent.agent.avatar.startsWith('http')
                            ? selectedAgent.agent.avatar
                            : `/assets/avatars/${selectedAgent.agent.avatar}`}
                          alt={selectedAgent.agent.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500" />
                      )}
                    </div>
                    <div className="text-white font-light">{selectedAgent.agent.name}</div>
                    {/* Show first few skills inline with subtle colors */}
                    {selectedAgent.agent.metadata?.skills && selectedAgent.agent.metadata.skills.length > 0 && (
                      <div className="flex items-center gap-1 mt-0.5">
                        {selectedAgent.agent.metadata.skills.slice(0, 2).map((skill, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-300/70 border border-blue-500/10"
                          >
                            {skill}
                          </span>
                        ))}
                        {selectedAgent.agent.metadata.skills.length > 2 && (
                          <span className="text-[10px] text-white/40">
                            +{selectedAgent.agent.metadata.skills.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <svg className="w-4 h-4 text-white/40 group-hover:text-white/60 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              ) : (
                <div className="w-full flex items-center justify-between p-6 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-white/40 text-sm font-light">To:</div>
                    <div className="text-white/60 text-sm">No agents available</div>
                  </div>
                </div>
              )}
            

            
            {/* Separator line */}
            <div className="h-px bg-white/10 mx-6" />
            
            {/* The Input Area */}
            <div className="relative">
              <LexicalPillEditor
                value={editorContent}
                onChange={setEditorContent}
                codePath={projectContext?.path}
                placeholder="Type your message...

💡 Tip: Type @ to reference files"
                className="lexical-chat-input w-full min-h-[128px] bg-transparent text-lg font-light text-white/90"
                autoFocus
              />

              {/* Display last referenced file/folder path */}
              {lastFilePath && (
                <div className="absolute bottom-10 right-4 text-xs text-white/50 flex items-center gap-1">
                  {lastFilePath.includes('.') ? (
                    <FileUp className="w-3 h-3" />
                  ) : (
                    <FolderOpen className="w-3 h-3" />
                  )}
                  <span>{lastFilePath.split('/').pop()?.substring(0, 20)}{lastFilePath.split('/').pop()?.length > 20 && '...'}</span>
                </div>
              )}



              {/* Bottom action bar with model selector and send button */}
              <div className="absolute bottom-4 right-4 flex items-center gap-3">
                {/* Enhanced model picker */}
                <div className="relative">
                  <ModelTinySelect
                    current={currentModelId}
                    onChange={val => {
                      // Use context to store the model selection
                      const agentDefault = selectedAgent?.ai_config?.model_id ?? 'gpt-4';
                      selections.setSelectedModelId(val === agentDefault ? null : val);
                    }}
                  />
                </div>

                {/* Separator */}
                <div className="h-6 w-px bg-white/10" />

                {/* Send button - Enhanced with gradient on active state */}
                <button
                  onClick={handleStart}
                  disabled={!editorContent.trim() || configsLoading || isLoading || !selectedAgent}
                  className={`group relative px-5 py-2 rounded-xl font-normal transition-all duration-300 text-sm ${
                    editorContent.trim() && !configsLoading && !isLoading && selectedAgent
                      ? 'bg-white text-black hover:scale-105 active:scale-100'
                      : 'bg-white/10 text-white/30 cursor-not-allowed'
                  }`}
                >
                  {/* Gradient overlay on hover */}
                  {editorContent.trim() && !configsLoading && !isLoading && selectedAgent && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                  
                  <div className="relative flex items-center gap-2">
                    <span className="font-medium">{isLoading ? 'Starting...' : 'Send'}</span>
                    <svg 
                      className={`w-4 h-4 transition-all ${
                        editorContent.trim() && !configsLoading && !isLoading && selectedAgent 
                          ? 'text-black/70 group-hover:translate-x-0.5' 
                          : 'text-white/20'
                      }`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </button>
              </div>
            </div>
          </div>
          </div>

        </div>
      </div>

      {/* Agent Browser Modal - True Apple design */}
      {showAgentBrowser && (
        <div 
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          onClick={() => setShowAgentBrowser(false)}
        >
          {/* Backdrop - Light mode style */}
          <div 
            className="absolute inset-0"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'saturate(180%) blur(20px)',
              WebkitBackdropFilter: 'saturate(180%) blur(20px)',
            }}
          />
          
          <div 
            className="relative w-full md:max-w-2xl bg-white dark:bg-[#1c1c1e] md:rounded-[2rem] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{ 
              animation: 'slideUp 0.5s cubic-bezier(0.32, 0.72, 0, 1)',
              maxHeight: '90vh',
              boxShadow: '0 30px 60px rgba(0, 0, 0, 0.12)',
            }}
          >
            {/* Modal content wrapper with Apple's signature gradient */}
            <div className="relative bg-gradient-to-b from-gray-50 to-white dark:from-[#1c1c1e] dark:to-[#1c1c1e]">
              {/* Drag handle for mobile */}
              <div className="md:hidden flex justify-center pt-3 pb-2">
                <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
              </div>
              
              {/* Header */}
              <div className="px-6 pt-6 pb-4">
                <h2 className="text-[28px] font-semibold text-gray-900 dark:text-white text-center tracking-tight">
                  All Experts
                </h2>
                <p className="text-center text-gray-500 dark:text-gray-400 text-[15px] mt-1">
                  {allAgents.length} specialized assistants
                </p>
                
                {/* Close button - macOS style */}
                <button
                  onClick={() => setShowAgentBrowser(false)}
                  className="hidden md:flex absolute top-6 left-6 w-7 h-7 rounded-full bg-gray-200/80 hover:bg-gray-300/80 dark:bg-gray-700/80 dark:hover:bg-gray-600/80 items-center justify-center transition-colors group"
                >
                  <svg className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Search bar - iOS 15+ style */}
              <div className="px-6 pb-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search"
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-100 dark:bg-gray-800/60 rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-[3px] focus:ring-blue-500/25 transition-all text-[16px]"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    >
                      <div className="w-5 h-5 bg-gray-400/30 dark:bg-gray-600/50 rounded-full flex items-center justify-center hover:bg-gray-400/50 dark:hover:bg-gray-600/70 transition-colors">
                        <svg className="w-3 h-3 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Separator - iOS style */}
            <div className="h-[0.5px] bg-gray-200 dark:bg-gray-700/50" />
            
            {/* Agent list */}
            <div className="overflow-y-auto bg-white dark:bg-[#1c1c1e]" style={{ maxHeight: 'calc(90vh - 200px)' }}>
              {filteredAgents.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <p className="text-gray-400 dark:text-gray-500 text-[17px]">No experts found</p>
                </div>
              ) : (
                <div className="px-6 py-2">
                  {/* Group agents by first letter */}
                  {Object.entries(
                    filteredAgents.reduce((groups, agent) => {
                      const letter = agent.agent.name[0].toUpperCase();
                      if (!groups[letter]) groups[letter] = [];
                      groups[letter].push(agent);
                      return groups;
                    }, {} as Record<string, AgentConfigTS[]>)
                  )
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([letter, agents]) => (
                      <div key={letter} className="mb-6 last:mb-2">
                        <h3 className="text-[13px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 px-4">
                          {letter}
                        </h3>
                        <div className="space-y-0.5">
                          {agents.map((agent) => (
                            <button
                              key={agent.id}
                              onClick={() => handleAgentSelect(agent)}
                              className="w-full flex items-center gap-4 p-4 -mx-4 rounded-2xl hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-800/50 dark:active:bg-gray-800 transition-colors group"
                            >
                              {/* Avatar with Apple-style colors */}
                              <div className="relative flex-shrink-0">
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                                  {agent.agent.avatar ? (
                                    <img
                                      src={agent.agent.avatar.startsWith('/') || agent.agent.avatar.startsWith('http')
                                        ? agent.agent.avatar
                                        : `/assets/avatars/${agent.agent.avatar}`}
                                      alt={agent.agent.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600" />
                                  )}
                                </div>
                              </div>
                              
                              {/* Content */}
                              <div className="flex-1 text-left">
                                <h4 className="text-[17px] font-normal text-gray-900 dark:text-white leading-tight">
                                  {agent.agent.name}
                                </h4>
                                <p className="text-[15px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                                  {agent.agent.description}
                                </p>
                                {/* Skills display */}
                                {agent.agent.metadata?.skills && agent.agent.metadata.skills.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {agent.agent.metadata.skills.slice(0, 3).map((skill, idx) => (
                                      <span
                                        key={idx}
                                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                      >
                                        {skill}
                                      </span>
                                    ))}
                                    {agent.agent.metadata.skills.length > 3 && (
                                      <span className="text-[11px] text-gray-500 dark:text-gray-400 ml-1">
                                        +{agent.agent.metadata.skills.length - 3} more
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              {/* Chevron - iOS style */}
                              <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}



      {/* CSS animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @media (min-width: 768px) {
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(40px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        }
      `}</style>
    </div>
  );
}

export default LandingPageInfinite;