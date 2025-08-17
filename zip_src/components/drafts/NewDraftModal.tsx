/**
 * New Draft Modal - Reimagined with Orchestra Design System
 * Dark glassmorphic design with mystical minimalism
 */

import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { X, Send, Save, Sparkles, ChevronDown, Shield, FolderOpen, Plus, Trash2, GitCommit, GitBranch, AlertTriangle, Loader2, Brain, Search, FileText, Code, Bug, Sliders, Check, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useDraftStore } from '@/stores/draftStore';
import { useSelections } from '@/context/SelectionContext';
import { AVAILABLE_MODELS } from '@/utils/modelDefinitions';
import { useAgentConfigs } from '@/hooks/useAgentConfigs';
import { useSettingsStore } from '@/stores/settingsStore';
import { CodebaseSelector } from './CodebaseSelector';
import { isTauri } from '@/utils/environment';
import { open } from '@tauri-apps/plugin-dialog';
import { recentProjectsManager } from '@/utils/projectStorage';
import { FancyFileSelector } from '@/components/ui/fancy-file-selector';
import { SearchMatch } from '@/lib/tauri/fileSelector';
import { useFileSearch } from '@/hooks/useFileSearch';
import { LexicalPillEditor } from './LexicalPillEditor';
import { useMissionControlShortcuts } from '@/hooks/useMissionControlShortcuts';
import { useAuth } from '@/auth/AuthContext';
import { getDefaultACSClient } from '@/services/acs';
import { startBackgroundSessionOps } from '@/workers/sessionBackgroundWorker';
import { useMissionControlStore } from '@/stores/missionControlStore';
import { AUTO_MODE_PRESETS, type AutoModePresetKey } from '@/utils';

import * as taskOrchestration from '@/utils/taskOrchestration';
import { autoCommitRepo } from '@/utils/worktreeApi';
import { remapFilePills } from '@/utils/remapFilePills';
import { getRepoPorcelainStatus, RepoStatusEntry } from '@/utils/gitStatus';
import GitStatusList from './GitStatusList';

interface MissionControlAgent {
  id: string;
  mission_title: string;
  status: string;
  last_message_at: string | null;
  created_at: string;
  agent_config_name: string | null;
  model_id: string | null;
  latest_message_id: string | null;
  latest_message_role: string | null;
  latest_message_content: any | null;
  latest_message_timestamp: string | null;
  agent_cwd: string | null;
  archived_at: string | null;
}

interface AdvancedSettings {
  enableWorktrees: boolean;
  modelMode: 'auto' | 'single';
  autoModePreset: AutoModePresetKey;
  roleModelOverrides: Record<string, string>;
}

interface NewDraftModalProps {
  onClose: () => void;
  onSessionCreated?: (sessionId: string, sessionData: Partial<MissionControlAgent>) => void;
  initialCodePath?: string;
}



export const NewDraftModal: React.FC<NewDraftModalProps> = ({ onClose, onSessionCreated, initialCodePath }) => {
  const { agentConfigsArray } = useAgentConfigs();
  const selections = useSelections();
  const { settings } = useSettingsStore();
  const auth = useAuth();

  const [content, setContent] = useState('');
  const [codePath, setCodePath] = useState('');
  const [agentConfigId, setAgentConfigId] = useState<string>(agentConfigsArray[0]?.id || '');
  const [sending, setSending] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Advanced settings state
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>({
    enableWorktrees: true,
    modelMode: 'auto',
    autoModePreset: 'best',
    roleModelOverrides: AUTO_MODE_PRESETS.best
  });

  const [singleModelOverride, setSingleModelOverride] = useState('');

  // Dirty repository state management
  const [showDirtyRepoSection, setShowDirtyRepoSection] = useState(false);
  const [isCommittingChanges, setIsCommittingChanges] = useState(false);
  const [commitMessage, setCommitMessage] = useState('Orchestra snapshot');
  const [dirtyRepoPath, setDirtyRepoPath] = useState('');
  const [dirtyRepoDetails, setDirtyRepoDetails] = useState<RepoStatusEntry[]>([]);
  const [dirtyDetailsLoading, setDirtyDetailsLoading] = useState(false);



  // Simplified permissions state
  const [allowedDirs, setAllowedDirs] = useState<string[]>([]);
  const [newAllowedDir, setNewAllowedDir] = useState('');

  // File selector state
  const [showFileSelector, setShowFileSelector] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);



  // File search hook - scoped to selected codePath
  const { results: fileResults, isLoading: isSearchingFiles } = useFileSearch(fileSearchQuery, {
    debounceMs: 200,
    limit: 15,
    minQueryLength: 0,
    ...(codePath.trim() ? { codePath: codePath.trim() } : {})
  });



  // Debug logging for codePath changes
  useEffect(() => {
    console.log('🔍 [NewDraftModal] codePath changed:', codePath);
  }, [codePath]);



  // Initialize smart default for codePath with support for prefill
  useEffect(() => {
    if (initialCodePath && initialCodePath.trim()) {
      setCodePath(initialCodePath.trim());
      return;
    }

    // Get the most recently accessed project
    const recentProjects = recentProjectsManager.get();

    if (recentProjects.length > 0) {
      // Use the most recent project as default
      setCodePath(recentProjects[0].path);
    } else {
      // Fall back to settings vault path if no recent projects
      setCodePath(settings.vault.path || '');
    }
  }, [settings.vault.path, initialCodePath]);

  // Load advanced settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('orchestra.advancedSettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);

        // Validate autoModePreset exists in AUTO_MODE_PRESETS
        const validPreset = parsed.autoModePreset in AUTO_MODE_PRESETS ? parsed.autoModePreset : 'best';

        setAdvancedSettings({
          ...parsed,
          autoModePreset: validPreset,
          roleModelOverrides: AUTO_MODE_PRESETS[validPreset]
        });

        if (parsed.modelMode === 'single' && parsed.singleModelOverride) {
          setSingleModelOverride(parsed.singleModelOverride);
        }
      } catch (error) {
        console.warn('Failed to parse advanced settings from localStorage:', error);
      }
    }
  }, []);

  // Save advanced settings to localStorage when changed
  useEffect(() => {
    const settingsToSave = {
      ...advancedSettings,
      singleModelOverride
    };

    // Don't save roleModelOverrides for auto-mode (they will be derived from preset)
    if (advancedSettings.modelMode === 'auto') {
      delete (settingsToSave as any).roleModelOverrides;
    }

    localStorage.setItem('orchestra.advancedSettings', JSON.stringify(settingsToSave));
  }, [advancedSettings, singleModelOverride]);

  // Automatically add codePath to allowedDirs when it changes
  useEffect(() => {
    if (codePath.trim()) {
      setAllowedDirs(prev => {
        // Remove any existing codePath entries to avoid duplicates
        const filtered = prev.filter(dir => dir !== codePath.trim());
        // Add the current codePath at the beginning
        return [codePath.trim(), ...filtered];
      });
    }
  }, [codePath]);



  // Handle ESC key
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  const handleSave = () => {
    if (!content.trim() || !codePath.trim()) return;

    useDraftStore.getState().addDraft({
      content: content.trim(),
      codePath: codePath.trim(),
      agentConfigId,
      modelId: selections.selectedModelId || null,
    });

    toast.success('Draft saved', {
      description: 'Your draft has been saved for later'
    });

    handleClose();
  };

  const handleSend = async () => {
    if (!content.trim() || !codePath.trim()) return;

    // Check repository state only when worktrees are enabled
    if (advancedSettings.enableWorktrees) {
      const repoState = await taskOrchestration.checkRepositoryState(codePath.trim());
      if (repoState.isGit && repoState.isDirty) {
        setDirtyRepoPath(codePath.trim());
        setDirtyDetailsLoading(true);
        getRepoPorcelainStatus(codePath.trim())
          .then(setDirtyRepoDetails)
          .catch(() => setDirtyRepoDetails([]))
          .finally(() => setDirtyDetailsLoading(false));
        setShowDirtyRepoSection(true);
        return;
      }
    }

    if (!auth.user?.id) {
      toast.error('Please sign in to send messages');
      return;
    }

    setSending(true);

    try {
      const selectedAgentConfig = agentConfigsArray.find(ac => ac.id === agentConfigId);
      const agentConfigName = selectedAgentConfig?.agent.name || 'General';

      console.log('[NewDraftModal] Creating session with fast ID...');

      // Step 1: Get real session ID immediately (Fast-ID)
      // Truncate the content for the session title to avoid excessively long titles
      const MAX_TITLE_CONTENT_LENGTH = 60; // adjust as needed for UX
      const truncatedContent = content.length > MAX_TITLE_CONTENT_LENGTH
        ? content.slice(0, MAX_TITLE_CONTENT_LENGTH).trimEnd() + '…'
        : content;
      const title = `Issue: ${truncatedContent}`;
      const sessionId = await taskOrchestration.createTaskSession(title, agentConfigId);

      console.log('[NewDraftModal] ✅ Got real session ID:', sessionId);

      // Step 2: Background worker will handle worktree creation and CWD updates
      console.log('[NewDraftModal] Session created, delegating worktree creation to background worker...');

      // Step 3: Create session data for the store with backgroundProcessing flag
      const sessionData = {
        id: sessionId,
        mission_title: title,
        status: 'processing',
        last_message_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        agent_config_name: agentConfigName,
        model_id: selections.selectedModelId || null,
        latest_message_id: null,
        latest_message_role: null,
        latest_message_content: null,
        latest_message_timestamp: new Date().toISOString(),
        agent_cwd: codePath.trim(), // Placeholder - will be updated by background worker
        base_dir: codePath.trim(), // Use the original project path
        archived_at: null,
        backgroundProcessing: true // Mark as processing in background
      };

      // Step 4: Insert session into store immediately
      const store = useMissionControlStore.getState();
      const currentSessions = store.sessions;
      store.setSessions([sessionData, ...currentSessions]);

      // Step 5: Notify parent component with the real session data
      if (onSessionCreated) {
        onSessionCreated(sessionId, sessionData);
      }

      // Step 6: Show success feedback and close modal immediately
      toast.success('Task created', {
        description: 'Setting up workspace and sending to agent...'
      });

      // Add to recent projects for fast future access
      try {
        const pathTrim = codePath.trim();
        const name = pathTrim.split(/[\\/]/).pop() || pathTrim;
        recentProjectsManager.add({ name, path: pathTrim });
      } catch {}

      // Clear any prefill hint in store
      try { useMissionControlStore.getState().setInitialDraftCodePath(null); } catch {}

      handleClose(); // Close modal immediately after getting UUID

      // Step 7: Remap file pills from original codePath to worktree path (background worker will resolve actual worktree path)
      const remappedContent = remapFilePills(content.trim(), codePath.trim(), codePath.trim());

      // Step 8: Start background operations (fire-and-forget)
      startBackgroundSessionOps(sessionId, {
        sessionName: title,
        agentConfigId,
        userId: auth.user.id,
        projectRoot: codePath.trim(), // Pass original path - background worker will resolve worktree
        originalProjectPath: codePath.trim(), // Pass the original project path for base_dir
        firstMessage: remappedContent,
        // Advanced settings integration
        enableWorktrees: advancedSettings.enableWorktrees,
        skipWorkspacePreparation: !advancedSettings.enableWorktrees,
        modelMode: advancedSettings.modelMode,
        singleModelOverride: advancedSettings.modelMode === 'single' ? singleModelOverride : undefined,
        roleModelOverrides: advancedSettings.modelMode === 'auto' ? AUTO_MODE_PRESETS[advancedSettings.autoModePreset] : undefined,
        // Auto mode boolean flags
        autoMode: advancedSettings.modelMode === 'auto',
        modelAutoMode: advancedSettings.modelMode === 'auto',
        explicitModelId: advancedSettings.modelMode === 'single' ? singleModelOverride : undefined,
        onProgress: (step, progress) => {
          console.log(`[NewDraftModal] Background progress: ${step} - ${progress}%`);
        },
        onError: (error, step) => {
          console.error(`[NewDraftModal] Background error in ${step}:`, error);

          // Mark as failed
          store.setBackgroundProcessing(sessionId, false);
          store.updateSession(sessionId, { status: 'error' });
          toast.error('Failed to set up task', {
            description: error.message
          });
        },
        onComplete: () => {
          console.log('[NewDraftModal] Background operations completed');
          // Mark background processing as complete
          store.setBackgroundProcessing(sessionId, false);
          store.updateSession(sessionId, { status: 'active' });

          toast.success('Task ready', {
            description: 'Agent is now working on your task'
          });
        }
      });

    } catch (error) {
      console.error('[NewDraftModal] Failed to create session:', error);
      toast.error('Failed to create task', {
        description: 'Please try again'
      });
    } finally {
      setSending(false);
    }
  };

  const handleCommitAndContinue = async () => {
    if (!commitMessage.trim() || !dirtyRepoPath) return;

    setIsCommittingChanges(true);

    try {
      console.log('💾 [NewDraftModal] Committing changes with message:', commitMessage);
      await autoCommitRepo(dirtyRepoPath, commitMessage);
      console.log('✅ [NewDraftModal] Successfully committed changes');

      // Check if repo is still dirty after commit
      const refreshed = await taskOrchestration.checkRepositoryState(dirtyRepoPath);
      if (refreshed.isDirty) {
        setDirtyDetailsLoading(true);
        const entries = await getRepoPorcelainStatus(dirtyRepoPath);
        setDirtyRepoDetails(entries);
        setDirtyDetailsLoading(false);
        // keep section visible and abort send
        return;
      }

      // Hide the dirty repo section and continue with the original send logic
      setShowDirtyRepoSection(false);
      setDirtyRepoPath('');

      // Continue with the original handleSend logic (skip the dirty check since we just committed)
      if (!auth.user?.id) {
        toast.error('Please sign in to send messages');
        return;
      }

      setSending(true);

      const selectedAgentConfig = agentConfigsArray.find(ac => ac.id === agentConfigId);
      const agentConfigName = selectedAgentConfig?.agent.name || 'General';

      console.log('[NewDraftModal] Creating session with fast ID...');

      // Step 1: Get real session ID immediately (Fast-ID)
      const sessionId = await taskOrchestration.createTaskSession('Draft Task', agentConfigId);

      console.log('[NewDraftModal] ✅ Got real session ID:', sessionId);

      // Step 2: Background worker will handle worktree creation and CWD updates
      console.log('[NewDraftModal] Session created, delegating worktree creation to background worker...');

      // Step 3: Create session data for the store with backgroundProcessing flag
      const sessionData = {
        id: sessionId,
        mission_title: 'Draft Task',
        status: 'processing',
        last_message_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        agent_config_name: agentConfigName,
        model_id: selections.selectedModelId || null,
        latest_message_id: null,
        latest_message_role: null,
        latest_message_content: null,
        latest_message_timestamp: new Date().toISOString(),
        agent_cwd: codePath.trim(), // Placeholder - will be updated by background worker
        base_dir: codePath.trim(), // Use the original project path
        archived_at: null,
        backgroundProcessing: true // Mark as processing in background
      };

      // Step 4: Insert session into store immediately
      const store = useMissionControlStore.getState();
      const currentSessions = store.sessions;
      store.setSessions([sessionData, ...currentSessions]);

      // Step 5: Notify parent component with the real session data
      if (onSessionCreated) {
        onSessionCreated(sessionId, sessionData);
      }

      // Step 6: Show success feedback and close modal immediately
      toast.success('Task created', {
        description: 'Setting up workspace and sending to agent...'
      });

      handleClose(); // Close modal immediately after getting UUID

      // Step 7: Remap file pills from original codePath to worktree path (background worker will resolve actual worktree path)
      const remappedContent = remapFilePills(content.trim(), codePath.trim(), codePath.trim());
      console.log(`[AdvancedSettings] Remapped content: ${remappedContent}`);
      // Step 8: Start background operations (fire-and-forget)
      startBackgroundSessionOps(sessionId, {
        sessionName: 'Draft Task',
        agentConfigId,
        userId: auth.user.id,
        projectRoot: codePath.trim(), // Pass original path - background worker will resolve worktree
        originalProjectPath: codePath.trim(), // Pass the original project path for base_dir
        firstMessage: remappedContent,
        // Advanced settings integration
        enableWorktrees: advancedSettings.enableWorktrees,
        skipWorkspacePreparation: !advancedSettings.enableWorktrees,
        modelMode: advancedSettings.modelMode,
        singleModelOverride: advancedSettings.modelMode === 'single' ? singleModelOverride : undefined,
        roleModelOverrides: advancedSettings.modelMode === 'auto' ? AUTO_MODE_PRESETS[advancedSettings.autoModePreset] : undefined,
        // Auto mode boolean flags
        autoMode: advancedSettings.modelMode === 'auto',
        modelAutoMode: advancedSettings.modelMode === 'auto',
        explicitModelId: advancedSettings.modelMode === 'single' ? singleModelOverride : undefined,
        onProgress: (step, progress) => {
          console.log(`[NewDraftModal] Background progress: ${step} - ${progress}%`);
        },
        onError: (error, step) => {
          console.error(`[NewDraftModal] Background error in ${step}:`, error);

          // Mark as failed
          store.setBackgroundProcessing(sessionId, false);
          store.updateSession(sessionId, { status: 'error' });
          toast.error('Failed to set up task', {
            description: error.message
          });
        },
        onComplete: () => {
          console.log('[NewDraftModal] Background operations completed');
          // Mark background processing as complete
          store.setBackgroundProcessing(sessionId, false);
          store.updateSession(sessionId, { status: 'active' });

          toast.success('Task ready', {
            description: 'Agent is now working on your task'
          });
        }
      });

    } catch (error) {
      console.error('❌ [NewDraftModal] Failed to commit changes:', error);
      toast.error('Failed to commit changes', {
        description: 'Please try again'
      });
    } finally {
      setIsCommittingChanges(false);
      setSending(false);
    }
  };

  // Permissions helper functions
  const addAllowedDir = (dirPath?: string) => {
    const pathToAdd = dirPath || newAllowedDir.trim();
    if (pathToAdd && !allowedDirs.includes(pathToAdd) && pathToAdd !== codePath.trim()) {
      setAllowedDirs([...allowedDirs, pathToAdd]);
      if (!dirPath) {
        setNewAllowedDir('');
      }
    } else if (pathToAdd === codePath.trim()) {
      // Show a toast or just clear the input since it's already included
      if (!dirPath) {
        setNewAllowedDir('');
      }
    }
  };

  const removeAllowedDir = (index: number) => {
    setAllowedDirs(allowedDirs.filter((_, i) => i !== index));
  };

  const handlePickFolder = async () => {
    if (!isTauri()) return;

    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select folder for Orchestra access'
      });

      if (selected && typeof selected === 'string') {
        addAllowedDir(selected);
      }
    } catch (error) {
      console.warn('Folder selection cancelled or failed:', error);
    }
  };

  // File selector handlers
  const handleFileSelect = (file: SearchMatch) => {
    // Insert the file reference as a markdown link with absolute path
    const fileReference = `[@${file.display}](@file:${file.full_path})`;

    // For Lexical editor, we'll append to the current content
    // The Lexical editor will handle parsing the markdown into pills
    const newContent = content + (content.trim() ? ' ' : '') + fileReference;
    setContent(newContent);

    setShowFileSelector(false);
    setFileSearchQuery('');
  };

  const handleFileSelectorClose = () => {
    setShowFileSelector(false);
    setFileSearchQuery('');
    setSelectedFileIndex(0);
    // Note: Focus will return to Lexical editor automatically
  };

  // Handle content changes
  const handleContentChange = (newValue: string) => {
    setContent(newValue);
  };

  // Mission Control keyboard shortcuts
  const { getShortcutHint } = useMissionControlShortcuts({
    onSaveDraft: handleSave,
    onSendToAgent: handleSend,
    isModalOpen: true
  });

  // Handle keyboard shortcuts for file selector and commit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl/Cmd + Enter for commit and continue (when in dirty repo state)
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && showDirtyRepoSection && !isCommittingChanges) {
      e.preventDefault();
      handleCommitAndContinue();
      return;
    }

    // Ctrl/Cmd + K to open file selector
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      setShowFileSelector(true);
      return;
    }

    // Handle file selector navigation when open
    if (showFileSelector) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedFileIndex(prev => Math.min(prev + 1, fileResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedFileIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (fileResults.length > 0) {
          handleFileSelect(fileResults[selectedFileIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleFileSelectorClose();
      }
    }
  };

  // Animation variants for smooth content transitions
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  // Mobile viewport handling
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle window resize to update mobile state
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const canSubmit = content.trim() && codePath.trim() && !sending && !isCommittingChanges;

  return ReactDOM.createPortal(
    <>
      {/* Backdrop with smooth fade */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-200",
          isClosing ? "opacity-0" : "opacity-100"
        )}
        onClick={handleClose}
      />

      {/* Modal with expanding animation */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          className={cn(
            "relative mx-auto",
            "bg-white/[0.03] backdrop-blur-xl",
            "rounded-2xl shadow-2xl",
            "border border-white/20",
            "overflow-hidden",
            "flex w-full max-w-3xl max-h-[80vh] flex-col",
            isMobile ? "w-full h-full" : "w-[1000px] max-w-[90vw] max-h-[90vh]" // Reasonable size on desktop, full on mobile
          )}
        >
          {/* Mystical gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />

          {/* Ethereal glow when advanced panel is open */}
          {advancedOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="
                absolute right-0 top-1/2 -translate-y-1/2
                w-96 h-96
                bg-purple-500/5
                rounded-full
                blur-3xl
                pointer-events-none
              "
            />
          )}

          {/* Main content container - Flex layout */}
          <motion.div
            className={cn(
              "relative z-10 flex flex-1 min-h-0",
              isMobile ? "flex-col" : "flex-row" // Flex direction based on mobile
            )}
          >
            {/* Left section - existing content */}
            <div className={cn(
              "min-w-0 flex flex-col",
              advancedOpen ? "flex-1" : "w-full"
            )}>
              {/* Header - Mystical and elegant */}
              <div className="shrink-0 border-b border-white/10 px-8 sm:px-10 pt-8 pb-6" data-testid="ndm-header">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-white/[0.05] backdrop-blur-sm flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-white/60" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-2xl font-light text-white tracking-tight">
                        New Task
                      </h2>
                      <p className="text-white/50 mt-1 text-sm font-light">
                        Create a task for Orchestra's agents
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* <button
                      onClick={() => setAdvancedOpen(!advancedOpen)}
                      className={cn(
                        "group flex items-center gap-2",
                        "px-3 py-1.5",
                        "bg-white/5 hover:bg-white/10",
                        "border border-white/10 hover:border-white/20",
                        "rounded-lg",
                        "transition-all duration-200",
                        advancedOpen && "bg-white/10 border-white/20"
                      )}
                      aria-label="Toggle advanced settings"
                      data-testid="ndm-toggle-advanced"
                    >
                      <Sliders className="w-4 h-4 text-white/60 group-hover:text-white/80 transition-colors" />
                      <span className="text-xs text-white/60 group-hover:text-white/80 transition-colors hidden sm:inline">
                        Advanced Settings
                      </span>

                      <ChevronRight className={cn(
                        "w-3 h-3 text-white/40 transition-all duration-200",
                        advancedOpen && "rotate-90"
                      )} />
                    </button> */}

                    <button
                      onClick={handleClose}
                      className="p-2 rounded-lg hover:bg-white/5 transition-colors group"
                    >
                      <X className="w-5 h-5 text-white/40 group-hover:text-white/60 transition-colors" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Main content */}
              <div className="flex-1 min-h-0 overflow-y-auto px-8 sm:px-10 pb-8 space-y-6" data-testid="ndm-main">
                {/* Codebase Selection */}
                <div data-testid="ndm-codebase-wrapper">
                  <CodebaseSelector
                    value={codePath}
                    onChange={setCodePath}
                    placeholder="/absolute/or/relative/path"
                  />

                </div>

                {/* Worktree Checkbox */}
                <div className="flex items-center gap-2 bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2">
                  <input
                    id="ndm-enable-worktrees"
                    type="checkbox"
                    checked={advancedSettings.enableWorktrees}
                    onChange={(e) =>
                      setAdvancedSettings(prev => ({ ...prev, enableWorktrees: e.target.checked }))
                    }
                    className="w-4 h-4 rounded bg-white/5 border-white/20 text-blue-500 focus:ring-2 focus:ring-blue-500/50"
                    data-testid="ndm-enable-worktrees"
                  />
                  <label htmlFor="ndm-enable-worktrees" className="text-sm text-white/80">
                    Use isolated workspace (Git worktree)
                  </label>
                </div>

                {/* Dirty Repository Section */}
                {showDirtyRepoSection && (
                  <div className="space-y-4">
                    {/* Warning Message */}
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-amber-200">
                          <p className="font-medium mb-2">Repository has uncommitted changes</p>
                          <p className="text-amber-300/80">
                            To create a worktree, all changes must be committed first. This ensures the worktree
                            starts from a known state and prevents conflicts.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Commit Message Input */}
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-white/50">
                        Commit Message
                      </label>
                      <input
                        type="text"
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        placeholder="Enter commit message..."
                        disabled={isCommittingChanges}
                        className={cn(
                          "w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl",
                          "text-white placeholder-white/25",
                          "focus:outline-none focus:border-white/20 focus:bg-white/[0.05]",
                          "transition-all duration-200",
                          isCommittingChanges && "opacity-50 cursor-not-allowed"
                        )}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isCommittingChanges) {
                            handleCommitAndContinue();
                          }
                        }}
                      />
                      <p className="text-xs text-white/30">
                        Press ⌘+Enter (or Ctrl+Enter) to commit and continue
                      </p>
                    </div>

                    {/* Project Info */}
                    <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4">
                      <div className="text-sm">
                        <span className="text-white/40">Project:</span>
                        <span className="text-white/70 ml-2 font-mono text-xs">
                          {dirtyRepoPath}
                        </span>
                      </div>
                    </div>

                    {/* Git Status List */}
                    {dirtyDetailsLoading ? (
                      <Loader2 className="w-4 h-4 mx-auto my-4 animate-spin text-amber-300" />
                    ) : (
                      <GitStatusList entries={dirtyRepoDetails} />
                    )}
                  </div>
                )}

                {/* Message Input with Inline Pills */}
                <div data-testid="ndm-editor-wrapper">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-white/50">
                      Message / Request
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowFileSelector(true)}
                      className="flex items-center gap-1.5 px-2 py-1 text-xs text-white/40 hover:text-white/60 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-md transition-all duration-200"
                      title="Search and reference files (Ctrl+K)"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      File Search
                      <kbd className="ml-1 px-1 py-0.5 text-[10px] bg-white/10 rounded">⌘K</kbd>
                    </button>
                  </div>
                  <div className="relative" onKeyDown={handleKeyDown}>
                    {/* Lexical Rich Text Editor with Pills */}
                    <LexicalPillEditor
                      value={content}
                      onChange={handleContentChange}
                      codePath={codePath}
                      placeholder="Describe the bug, feature request, or task you'd like Orchestra to help with...

💡 Tip: Press Ctrl+K (or ⌘K) to search files, or type @ to autocomplete"
                      className="min-h-[200px] max-h-[40vh] overflow-y-auto"
                      autoFocus={true}
                      data-testid="ndm-editor"
                    />

                    {/* File Selector Overlay */}
                    {showFileSelector && (
                      <div className="absolute inset-0 z-50">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-xl" onClick={handleFileSelectorClose} />
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                          <FancyFileSelector
                            isOpen={showFileSelector}
                            query={fileSearchQuery}
                            onQueryChange={setFileSearchQuery}
                            results={fileResults}
                            selectedIndex={selectedFileIndex}
                            onFileSelect={handleFileSelect}
                            onClose={handleFileSelectorClose}
                            isSearching={isSearchingFiles}
                            className="w-[500px] max-w-[90vw]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer - Clean action bar */}
              <div className="shrink-0 border-t border-white/10 bg-black/50 px-8 sm:px-10 py-6" data-testid="ndm-footer">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Current settings indicator */}
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <div className="flex items-center gap-1.5">
                      {advancedSettings.modelMode === 'auto' ? (
                        <>
                          <Sparkles className="w-3 h-3" />
                          <span>Auto Mode</span>
                        </>
                      ) : (
                        <>
                          <Sliders className="w-3 h-3" />
                          <span>{singleModelOverride || 'Manual Mode'}</span>
                        </>
                      )}
                    </div>

                    <span className="text-white/20">·</span>

                    <div className="flex items-center gap-1.5">
                      <GitBranch className="w-3 h-3" />
                      <span>{advancedSettings.enableWorktrees ? 'Isolated' : 'Direct'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                      onClick={handleClose}
                      className="px-4 py-2 text-sm text-white/50 hover:text-white/70 transition-colors font-light"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={handleSave}
                      disabled={!canSubmit}
                      className={cn(
                        "group px-4 py-2 rounded-xl text-sm font-normal transition-all duration-200 flex items-center gap-2",
                        canSubmit
                          ? "bg-white/10 hover:bg-white/20 text-white border border-white/10"
                          : "bg-white/5 text-white/30 cursor-not-allowed border border-white/5"
                      )}
                    >
                      <Save className="w-4 h-4" />
                      Save Draft
                      <kbd className="text-[10px] text-white/40 bg-white/10 px-1 py-0.5 rounded ml-1">
                        {getShortcutHint('save')}
                      </kbd>
                    </button>

                    <button
                      onClick={showDirtyRepoSection ? handleCommitAndContinue : handleSend}
                      disabled={!canSubmit || (showDirtyRepoSection && !commitMessage.trim())}
                      className={cn(
                        "group px-6 py-2 rounded-xl text-sm font-normal transition-all duration-300 flex items-center gap-2",
                        (canSubmit && (!showDirtyRepoSection || commitMessage.trim()))
                          ? "bg-white text-black hover:scale-105 active:scale-100"
                          : "bg-white/10 text-white/30 cursor-not-allowed"
                      )}
                    >
                      {(sending || isCommittingChanges) ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full"
                          />
                          {isCommittingChanges ? 'Committing...' : 'Sending...'}
                        </>
                      ) : showDirtyRepoSection ? (
                        <>
                          <GitCommit className="w-4 h-4" />
                          Commit & Continue
                          <kbd className="text-[10px] text-black/40 bg-black/10 px-1 py-0.5 rounded ml-1">
                            ⌘↵
                          </kbd>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send to Agent
                          <kbd className="text-[10px] text-black/40 bg-black/10 px-1 py-0.5 rounded ml-1">
                            {getShortcutHint('send')}
                          </kbd>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right section - advanced settings - Conditionally rendered */}
            {advancedOpen && (
              <aside
                className={cn(
                  "w-[400px] border-l border-white/10 flex flex-col",
                  isMobile && "absolute inset-0 z-20 bg-black/95 w-full border-l-0" // Full overlay on mobile
                )}
                data-testid="ndm-advanced"
              >
                {/* Panel header with ethereal styling */}
                <div className="px-6 py-5 border-b border-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-white/90 tracking-tight">
                        Advanced Settings
                      </h3>
                      <p className="text-xs text-white/50 mt-1">
                        Fine-tune Orchestra's intelligence
                      </p>
                    </div>

                    {/* Close button with hover glow */}
                    <button
                      onClick={() => setAdvancedOpen(false)}
                      className="
                              group p-2 rounded-lg 
                              hover:bg-white/5 
                              transition-all duration-200
                            "
                      aria-label="Close advanced settings"
                    >
                      <X className="w-4 h-4 text-white/40 group-hover:text-white/60 transition-colors" />
                    </button>
                  </div>
                </div>

                {/* Scrollable content area with sections */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
                  {/* Educational banner with mystical blue glow */}
                  <div className="
                            relative p-4 
                            bg-blue-500/5 
                            border border-blue-500/20 
                            rounded-xl
                            overflow-hidden
                          ">
                    {/* Subtle glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent pointer-events-none" />

                    <div className="relative flex items-start gap-3">
                      <div className="
                                flex items-center justify-center 
                                w-8 h-8 
                                rounded-lg 
                                bg-blue-500/10 
                                border border-blue-500/20
                              ">
                        <Brain className="w-4 h-4 text-blue-400" />
                      </div>

                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-blue-200 mb-1">
                          Orchestra's Intelligent Model Selection
                        </h4>
                        <p className="text-xs text-blue-300/80 leading-relaxed">
                          Orchestra automatically selects specialized AI models for each phase of your task:
                          exploring code structure, planning implementations, writing code, and debugging issues.
                          This ensures optimal results at every step.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Model selection with glass radio cards */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-white/70 mb-3">
                        Model Selection Mode
                      </h4>
                    </div>

                    {/* Auto Mode Card - Recommended */}
                    <label className="
                              group relative block
                              p-4 
                              bg-white/[0.02] hover:bg-white/[0.04]
                              border border-white/10 hover:border-white/20
                              rounded-xl
                              cursor-pointer
                              transition-all duration-200
                            ">
                      {/* Recommended badge glow */}
                      <div className="absolute -top-2 -right-2">
                        <div className="
                                  px-2 py-1 
                                  bg-green-500/20 
                                  border border-green-500/30
                                  rounded-full
                                  text-[10px] font-medium text-green-300
                                  shadow-[0_0_20px_rgba(16,185,129,0.3)]
                                ">
                          RECOMMENDED
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="modelMode"
                          value="auto"
                          checked={advancedSettings.modelMode === 'auto'}
                          onChange={() => setAdvancedSettings(prev => ({ ...prev, modelMode: 'auto' }))}
                          className="
                                    mt-1 w-4 h-4
                                    text-blue-500 
                                    bg-white/5 
                                    border-white/20
                                    focus:ring-2 focus:ring-blue-500/50
                                  "
                        />

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="w-4 h-4 text-white/60" />
                            <span className="text-sm font-medium text-white/90">
                              Auto Mode
                            </span>
                          </div>

                          <p className="text-xs text-white/60 mb-3">
                            Let Orchestra intelligently select the optimal AI model for each task phase
                          </p>

                          {/* Preset selector */}
                          <div className="mb-3">
                            <label className="block text-xs text-white/50 mb-1">
                              Preset Configuration
                            </label>
                            <select
                              value={advancedSettings.autoModePreset}
                              onChange={(e) => {
                                const preset = e.target.value as AutoModePresetKey;
                                setAdvancedSettings(prev => ({
                                  ...prev,
                                  autoModePreset: preset,
                                  roleModelOverrides: AUTO_MODE_PRESETS[preset]
                                }));
                              }}
                              className="
                              w-full px-3 py-2
                              bg-white/[0.03] 
                              border border-white/10
                              rounded-lg
                              text-sm text-white/90
                              focus:outline-none focus:border-white/20
                              transition-all duration-200
                            "
                            >
                              {Object.keys(AUTO_MODE_PRESETS).map((preset) => (
                                <option key={preset} value={preset}>
                                  {preset.charAt(0).toUpperCase() + preset.slice(1)}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Model breakdown - only visible when selected */}
                          <AnimatePresence>
                            {advancedSettings.modelMode === 'auto' && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="
                                          p-3 
                                          bg-black/30 
                                          border border-white/5 
                                          rounded-lg 
                                          space-y-2
                                        ">
                                  {[
                                    { icon: Search, phase: 'explore', desc: 'Understanding codebase' },
                                    { icon: FileText, phase: 'plan', desc: 'Strategic thinking' },
                                    { icon: Code, phase: 'execute', desc: 'Writing code' },
                                    { icon: Bug, phase: 'debug', desc: 'Problem solving' }
                                  ].map(({ icon: Icon, phase, desc }) => {
                                    const model = advancedSettings.roleModelOverrides[phase];
                                    const modelName = model === 'gpt-4.1' ? 'GPT-4' :
                                      model === 'claude-4-sonnet' ? 'Claude' :
                                        model === 'o3' ? 'O3' :
                                          model === 'gemini-2.5-pro-preview-05-06' ? 'Gemini' :
                                            model === 'z-ai/glm-4.5' ? 'GLM' : model;
                                    return (
                                      <div key={phase} className="flex items-center gap-3 text-xs">
                                        <Icon className="w-3 h-3 text-white/40" />
                                        <span className="text-white/50 w-16">{phase.charAt(0).toUpperCase() + phase.slice(1)}:</span>
                                        <span className="text-white/70 font-medium">{modelName}</span>
                                        <span className="text-white/40">· {desc}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </label>

                    {/* Single Model Card */}
                    <label className="
                              group relative block
                              p-4 
                              bg-white/[0.02] hover:bg-white/[0.04]
                              border border-white/10 hover:border-white/20
                              rounded-xl
                              cursor-pointer
                              transition-all duration-200
                            ">
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="modelMode"
                          value="single"
                          checked={advancedSettings.modelMode === 'single'}
                          onChange={() => setAdvancedSettings(prev => ({ ...prev, modelMode: 'single' }))}
                          className="mt-1 w-4 h-4"
                        />

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Sliders className="w-4 h-4 text-white/60" />
                            <span className="text-sm font-medium text-white/90">
                              Single Model
                            </span>
                          </div>

                          <p className="text-xs text-white/60 mb-3">
                            Use one AI model for all task phases
                          </p>

                          {/* Model selector - only visible when selected */}
                          <AnimatePresence>
                            {advancedSettings.modelMode === 'single' && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <select
                                  value={singleModelOverride}
                                  onChange={(e) => setSingleModelOverride(e.target.value)}
                                  className="
                                            w-full mt-2 px-3 py-2
                                            bg-white/[0.03] 
                                            border border-white/10
                                            rounded-lg
                                            text-sm text-white/90
                                            focus:outline-none focus:border-white/20
                                            transition-all duration-200
                                          "
                                >
                                  <option value="">Select a model...</option>
                                  <option value="gpt-4">GPT-4 (Balanced)</option>
                                  <option value="claude-3-sonnet">Claude 3 (Code-focused)</option>
                                  <option value="o3">O3 (Advanced reasoning)</option>
                                </select>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Workspace settings with warning states */}
                  <div className="space-y-4">
                    <div className="pt-6 border-t border-white/5">
                      <h4 className="text-sm font-medium text-white/70 mb-3">
                        Workspace Configuration
                      </h4>
                    </div>

                    <label className="
                              group relative block
                              p-4 
                              bg-white/[0.02] hover:bg-white/[0.04]
                              border border-white/10 hover:border-white/20
                              rounded-xl
                              cursor-pointer
                              transition-all duration-200
                            ">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={advancedSettings.enableWorktrees}
                          onChange={(e) => setAdvancedSettings(prev => ({ ...prev, enableWorktrees: e.target.checked }))}
                          className="
                                    mt-1 w-4 h-4
                                    rounded
                                    bg-white/5 
                                    border-white/20
                                    text-blue-500
                                    focus:ring-2 focus:ring-blue-500/50
                                  "
                        />

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <GitBranch className="w-4 h-4 text-white/60" />
                            <span className="text-sm font-medium text-white/90">
                              Create Isolated Workspaces
                            </span>
                          </div>

                          <p className="text-xs text-white/60 mb-2">
                            Each task runs in its own Git worktree, keeping your main branch safe from changes
                          </p>

                          {/* Status indicator */}
                          <AnimatePresence mode="wait">
                            {advancedSettings.enableWorktrees ? (
                              <motion.div
                                key="enabled"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="flex items-center gap-2 text-xs text-green-400/80"
                              >
                                <Check className="w-3 h-3" />
                                <span>Your main branch is protected</span>
                              </motion.div>
                            ) : (
                              <motion.div
                                key="disabled"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="
                                          flex items-center gap-2 
                                          p-2 mt-2
                                          bg-amber-500/10 
                                          border border-amber-500/20 
                                          rounded-lg
                                          text-xs text-amber-400/80
                                        "
                              >
                                <AlertTriangle className="w-3 h-3" />
                                <span>Changes will be made directly in your current branch</span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </aside>
            )}
          </motion.div>
        </motion.div>
      </div>
    </>,
    document.body
  );
};
