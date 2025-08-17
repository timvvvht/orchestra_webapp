/**
 * NewTaskModal - Grand task creation with mystical minimalism
 * Optimized for velocity and momentum - Linear-inspired, Orchestra-powered
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { X, Send, FolderOpen, Shield, GitBranch, GitCommit, Loader2, ChevronDown, ChevronRight, Sparkles, AlertCircle, Zap, Settings2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useDraftStore } from '@/stores/draftStore';
import { useSelections } from '@/context/SelectionContext';
import { useAgentConfigs } from '@/hooks/useAgentConfigs';
import { useSettingsStore } from '@/stores/settingsStore';
import { isTauri } from '@/utils/environment';
import { open } from '@tauri-apps/plugin-dialog';
import { recentProjectsManager } from '@/utils/projectStorage';
import { SearchMatch } from '@/lib/tauri/fileSelector';
import { useFileSearch } from '@/hooks/useFileSearch';
import { LexicalPillEditor } from './LexicalPillEditor';
import { useMissionControlShortcuts } from '@/hooks/useMissionControlShortcuts';
import { useAuth } from '@/auth/AuthContext';
import { startBackgroundSessionOps } from '@/workers/sessionBackgroundWorker';
import { useMissionControlStore } from '@/stores/missionControlStore';
import { AUTO_MODE_PRESETS } from '@/utils';
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

interface NewTaskModalProps {
  onClose: () => void;
  onSessionCreated?: (sessionId: string, sessionData: Partial<MissionControlAgent>) => void;
  initialCodePath?: string;
}

// Rotating placeholders for inspiration - grander language
const PLACEHOLDERS = [
  "Architect a solution for the navigation regression...",
  "Craft an elegant dark mode experience across the platform",
  "Transform our authentication flow with modern JWT patterns",
  "Investigate the production API anomalies and restore stability",
  "Engineer real-time notifications with WebSocket orchestration",
  "Elevate dashboard performance to sub-second load times",
  "Fortify the payment module with comprehensive test coverage",
  "Resolve the memory leak plaguing our visualization engine"
];

export const NewTaskModal: React.FC<NewTaskModalProps> = ({
  onClose,
  onSessionCreated,
  initialCodePath
}) => {
  const { agentConfigsArray } = useAgentConfigs();
  const selections = useSelections();
  const { settings } = useSettingsStore();
  const auth = useAuth();

  // Core state - minimal and focused
  const [content, setContent] = useState('');
  const [codePath, setCodePath] = useState('');
  const [sending, setSending] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Progressive disclosure state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [enableWorktrees, setEnableWorktrees] = useState(true); // Default to true

  // Project switcher state
  const [showProjectSwitcher, setShowProjectSwitcher] = useState(false);
  const [recentProjects, setRecentProjects] = useState<Array<{ name: string; path: string }>>([]);

  // Dirty repository state management
  const [showDirtyRepoSection, setShowDirtyRepoSection] = useState(false);
  const [showInlineCommit, setShowInlineCommit] = useState(false);
  const [commitMessage, setCommitMessage] = useState('Orchestra snapshot');
  const [isCommitting, setIsCommitting] = useState(false);
  const [dirtyRepoPath, setDirtyRepoPath] = useState('');
  const [dirtyRepoDetails, setDirtyRepoDetails] = useState<RepoStatusEntry[]>([]);
  const [dirtyDetailsLoading, setDirtyDetailsLoading] = useState(false);
  const [showRepoDebug, setShowRepoDebug] = useState(false);
  const [repoDebugLoading, setRepoDebugLoading] = useState(false);

  // Repository status
  const [repoStatus, setRepoStatus] = useState<{
    isGit: boolean;
    isDirty: boolean;
    branch?: string;
  }>({ isGit: false, isDirty: false });

  // Placeholder rotation
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // File search for @ mentions (inline)
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionCursorPos, setMentionCursorPos] = useState(0);

  const { results: fileResults, isLoading: isSearchingFiles } = useFileSearch(mentionQuery, {
    debounceMs: 100,
    limit: 5,
    minQueryLength: 0,
    ...(codePath.trim() ? { codePath: codePath.trim() } : {})
  });

  // Always use the first agent config (General)
  const agentConfigId = agentConfigsArray[0]?.id || '';

  // Initialize smart defaults for codePath
  useEffect(() => {
    if (initialCodePath && initialCodePath.trim()) {
      setCodePath(initialCodePath.trim());
      return;
    }

    const projects = recentProjectsManager.get();
    setRecentProjects(projects);

    if (projects.length > 0) {
      setCodePath(projects[0].path);
    } else {
      setCodePath(settings.vault.path || '');
    }
  }, [settings.vault.path, initialCodePath]);

  // Load worktree preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('orchestra.enableWorktrees');
    if (saved !== null) {
      setEnableWorktrees(saved === 'true');
    }
  }, []);

  // Save worktree preference when changed
  useEffect(() => {
    localStorage.setItem('orchestra.enableWorktrees', String(enableWorktrees));
  }, [enableWorktrees]);

  // Check repository status when codePath changes
  useEffect(() => {
    if (!codePath.trim()) {
      console.log('[NewTaskModal][repoStatusCheck] No codePath, skipping check');
      return;
    }

    console.log('[NewTaskModal][repoStatusCheck] Starting repository status check for:', codePath.trim());

    const checkStatus = async () => {
      try {
        console.log('[NewTaskModal][repoStatusCheck] Calling taskOrchestration.checkRepositoryState...');
        const status = await taskOrchestration.checkRepositoryState(codePath.trim());
        console.log('[NewTaskModal][repoStatusCheck] Repository status result:', status);
        setRepoStatus(status);

        // Only show inline commit if repo is dirty AND Isolation is OFF
        if (status.isGit && status.isDirty) {
          if (!enableWorktrees) {
            console.log('[NewTaskModal][inlineCommit] Direct mode + dirty -> showInlineCommit=true');
            setShowInlineCommit(true);
          } else {
            console.log('[NewTaskModal][inlineCommit] Isolation mode + dirty -> showInlineCommit=false');
            setShowInlineCommit(false);
          }
          setDirtyRepoPath(codePath.trim());
          setCommitMessage(`Orchestra: Save work before task`);
        } else {
          console.log('[NewTaskModal][inlineCommit] Clean or non-git -> showInlineCommit=false');
          setShowInlineCommit(false);
          setDirtyRepoPath('');
        }
      } catch (error) {
        console.warn('[NewTaskModal][repoStatusCheck] Failed to check repository status:', error);
        setRepoStatus({ isGit: false, isDirty: false });
      }
    };

    checkStatus();
  }, [codePath]);

  // Re-evaluate inline commit visibility when Isolation setting changes
  useEffect(() => {
    if (!codePath.trim()) return;
    // Reflect current repoStatus when Isolation is toggled
    if (repoStatus.isGit && repoStatus.isDirty) {
      const nextShowInlineCommit = !enableWorktrees;
      console.log('[NewTaskModal][inlineCommit] Isolation toggled -> setShowInlineCommit', nextShowInlineCommit);
      setShowInlineCommit(nextShowInlineCommit);
      if (!dirtyRepoPath) setDirtyRepoPath(codePath.trim());
    } else {
      setShowInlineCommit(false);
    }
  }, [enableWorktrees, repoStatus.isGit, repoStatus.isDirty, codePath, dirtyRepoPath]);

  // Auto-show gating section when Isolation is ON and repo is dirty
  useEffect(() => {
    console.log('[NewTaskModal][dirtyRepoGating] Effect triggered with:', {
      enableWorktrees,
      codePath: codePath.trim(),
      repoStatus,
      showDirtyRepoSection,
      dirtyRepoPath
    });

    // Hide gating when Isolation is OFF
    if (!enableWorktrees) {
      console.log('[NewTaskModal][dirtyRepoGating] Worktrees disabled, hiding dirty repo section');
      if (showDirtyRepoSection) {
        console.log('[NewTaskModal][dirtyGating] setShowDirtyRepoSection(false) - Isolation OFF');
        setShowDirtyRepoSection(false);
      }
      return;
    }
    if (!codePath.trim()) {
      console.log('[NewTaskModal][dirtyRepoGating] No codePath, skipping');
      return;
    }
    if (!(repoStatus.isGit && repoStatus.isDirty)) {
      console.log('[NewTaskModal][dirtyRepoGating] Repo not git or not dirty, skipping');
      return;
    }

    // If already showing for this path, skip
    if (showDirtyRepoSection && dirtyRepoPath === codePath.trim()) {
      console.log('[NewTaskModal][dirtyRepoGating] Already showing dirty section for this path, skipping');
      return;
    }

    console.log('[NewTaskModal][dirtyRepoGating] Showing dirty repo section and fetching porcelain status');
    console.log('[NewTaskModal][dirtyGating] setShowDirtyRepoSection(true) - Isolation ON + dirty');
    setDirtyRepoPath(codePath.trim());
    setShowDirtyRepoSection(true);
    setDirtyDetailsLoading(true);

    console.log('[NewTaskModal][dirtyRepoGating] About to call getRepoPorcelainStatus for:', codePath.trim());
    getRepoPorcelainStatus(codePath.trim())
      .then((result) => {
        console.log('[NewTaskModal][dirtyRepoGating] getRepoPorcelainStatus success:', result);
        setDirtyRepoDetails(result);
      })
      .catch((error) => {
        console.error('[NewTaskModal][dirtyRepoGating] getRepoPorcelainStatus error:', error);
        setDirtyRepoDetails([]);
      })
      .finally(() => {
        console.log('[NewTaskModal][dirtyRepoGating] getRepoPorcelainStatus finished, setting loading to false');
        setDirtyDetailsLoading(false);
      });
  }, [enableWorktrees, repoStatus.isGit, repoStatus.isDirty, codePath, showDirtyRepoSection, dirtyRepoPath]);

  // Rotate placeholders
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Handle ESC key
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // If project switcher is open, close it first
        if (showProjectSwitcher) {
          setShowProjectSwitcher(false);
          return;
        }
        // If mentions are open, close them first
        if (showMentions) {
          setShowMentions(false);
          return;
        }
        // Otherwise close the modal
        handleClose({ saveDraft: true });
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [showProjectSwitcher, showMentions]);

  const handleClose = (opts?: { saveDraft?: boolean }) => {
    const saveDraft = opts?.saveDraft ?? true;

    // Save draft only when explicitly allowed
    if (saveDraft && content.trim()) {
      useDraftStore.getState().addDraft({
        content: content.trim(),
        codePath: codePath.trim(),
        agentConfigId,
        modelId: selections.selectedModelId || null,
      });
    }

    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  const handleQuickCommit = async () => {
    if (!commitMessage.trim() || !dirtyRepoPath) return;

    setIsCommitting(true);
    try {
      await autoCommitRepo(dirtyRepoPath, commitMessage);

      // Refresh repo status
      const refreshed = await taskOrchestration.checkRepositoryState(dirtyRepoPath);
      setRepoStatus(refreshed);

      if (!refreshed.isDirty) {
        setShowInlineCommit(false);
        setDirtyRepoPath('');
        toast.success('Changes committed', {
          description: 'Repository is now clean'
        });
      }
    } catch (error) {
      console.error('Failed to commit changes:', error);
      toast.error('Failed to commit changes');
    } finally {
      setIsCommitting(false);
    }
  };

  // Repo Debug: refresh porcelain on demand
  const refreshPorcelain = async () => {
    if (!codePath.trim()) {
      console.log('[NewTaskModal][refreshPorcelain] No codePath, skipping');
      return;
    }
    console.log('[NewTaskModal][refreshPorcelain] Starting refresh for:', codePath.trim());
    setRepoDebugLoading(true);
    try {
      console.log('[NewTaskModal][refreshPorcelain] Calling getRepoPorcelainStatus...');
      const entries = await getRepoPorcelainStatus(codePath.trim());
      console.log('[NewTaskModal][refreshPorcelain] Got entries:', entries);
      setDirtyRepoDetails(entries);
    } catch (err) {
      console.warn('[NewTaskModal][refreshPorcelain] Failed to fetch porcelain for debug:', err);
      setDirtyRepoDetails([]);
    } finally {
      console.log('[NewTaskModal][refreshPorcelain] Finished, setting loading to false');
      setRepoDebugLoading(false);
    }
  };

  // Auto-fetch porcelain when opening debug section or when codePath changes while open
  useEffect(() => {
    if (!showRepoDebug) return;
    if (!codePath.trim()) return;
    refreshPorcelain();
  }, [showRepoDebug, codePath]);

  const handleCommitAndContinue = async () => {
    if (!commitMessage.trim() || !dirtyRepoPath) return;

    setIsCommitting(true);
    try {
      console.log('💾 [NewTaskModal] Committing changes with message:', commitMessage);
      await autoCommitRepo(dirtyRepoPath, commitMessage);
      console.log('✅ [NewTaskModal] Successfully committed changes');

      // Check if repo is still dirty after commit
      const refreshed = await taskOrchestration.checkRepositoryState(dirtyRepoPath);
      if (refreshed.isDirty) {
        setDirtyDetailsLoading(true);
        const entries = await getRepoPorcelainStatus(dirtyRepoPath);
        setDirtyRepoDetails(entries);
        setDirtyDetailsLoading(false);
        // Keep section visible and abort send
        return;
      }

      // Hide the dirty repo section and continue with the original send logic
      setShowDirtyRepoSection(false);
      setDirtyRepoPath('');

      // Continue with the original handleSend logic (skip the dirty check since we just committed)
      await sendCore();

    } catch (error) {
      console.error('❌ [NewTaskModal] Failed to commit changes:', error);
      toast.error('Failed to commit changes', {
        description: 'Please try again'
      });
    } finally {
      setIsCommitting(false);
    }
  };

  // Core send logic (extracted to avoid duplication)
  const sendCore = async () => {
    if (!auth.user?.id) {
      toast.error('Please sign in to send messages');
      return;
    }

    setSending(true);

    try {
      const selectedAgentConfig = agentConfigsArray.find(ac => ac.id === agentConfigId);
      const agentConfigName = selectedAgentConfig?.agent.name || 'General';

      // Truncate content for title
      const MAX_TITLE_LENGTH = 60;
      const truncatedContent = content.length > MAX_TITLE_LENGTH
        ? content.slice(0, MAX_TITLE_LENGTH).trimEnd() + '…'
        : content;
      const title = `Issue: ${truncatedContent}`;

      // Create session immediately
      const sessionId = await taskOrchestration.createTaskSession(title, agentConfigId);

      // Create session data for the store
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
        agent_cwd: codePath.trim(),
        base_dir: codePath.trim(),
        archived_at: null,
        backgroundProcessing: true
      };

      // Insert session into store
      const store = useMissionControlStore.getState();
      const currentSessions = store.sessions;
      store.setSessions([sessionData, ...currentSessions]);

      // Notify parent
      if (onSessionCreated) {
        onSessionCreated(sessionId, sessionData);
      }

      // Show success and close immediately
      toast.success('Task created', {
        description: 'Orchestra is preparing your workspace...'
      });

      // Add to recent projects
      try {
        const pathTrim = codePath.trim();
        const name = pathTrim.split(/[\\\/]/).pop() || pathTrim;
        recentProjectsManager.add({ name, path: pathTrim });
      } catch { }

      // Clear any prefill hint
      try {
        useMissionControlStore.getState().setInitialDraftCodePath(null);
      } catch { }

      handleClose({ saveDraft: false });

      // Remap file pills
      const remappedContent = remapFilePills(content.trim(), codePath.trim(), codePath.trim());

      // Start background operations
      startBackgroundSessionOps(sessionId, {
        sessionName: title,
        agentConfigId,
        userId: auth.user.id,
        projectRoot: codePath.trim(),
        originalProjectPath: codePath.trim(),
        firstMessage: remappedContent,
        enableWorktrees: enableWorktrees, // Use user preference
        skipWorkspacePreparation: !enableWorktrees,
        modelMode: 'auto', // Always auto
        autoMode: true,
        modelAutoMode: true,
        roleModelOverrides: AUTO_MODE_PRESETS.best, // Always use best preset
        onProgress: (step, progress) => {
          console.log(`[NewTaskModal] Background progress: ${step} - ${progress}%`);
        },
        onError: (error, step) => {
          console.error(`[NewTaskModal] Background error in ${step}:`, error);
          store.setBackgroundProcessing(sessionId, false);
          store.updateSession(sessionId, { status: 'error' });
          toast.error('Failed to set up task', {
            description: error.message
          });
        },
        onComplete: () => {
          console.log('[NewTaskModal] Background operations completed');
          store.setBackgroundProcessing(sessionId, false);
          store.updateSession(sessionId, { status: 'active' });
          toast.success('Task ready', {
            description: 'Agent is now working on your task'
          });
        }
      });

    } catch (error) {
      console.error('[NewTaskModal] Failed to create session:', error);
      toast.error('Failed to create task', {
        description: 'Please try again'
      });
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    console.log('[NewTaskModal][handleSend] Starting send process');
    console.log('[NewTaskModal][handleSend] Content length:', content.trim().length);
    console.log('[NewTaskModal][handleSend] CodePath:', codePath.trim());
    console.log('[NewTaskModal][handleSend] EnableWorktrees:', enableWorktrees);

    if (!content.trim() || !codePath.trim()) {
      console.log('[NewTaskModal][handleSend] Missing content or codePath, aborting');
      return;
    }

    // Handle repository state based on Isolation setting
    if (!enableWorktrees) {
      // Direct Mode: non-blocking prompt if dirty, always allow send
      console.log('[NewTaskModal][handleSend] Direct mode - checking for dirty prompt...');
      try {
        const status = await taskOrchestration.checkRepositoryState(codePath.trim());
        if (status.isGit && status.isDirty) {
          console.log('[NewTaskModal][handleSend] Direct mode + dirty -> showing inline commit and prompt');
          setShowInlineCommit(true);
          setDirtyRepoPath(codePath.trim());
          toast.message('Uncommitted changes detected', {
            description: 'Consider committing before proceeding. You can use the inline commit bar.',
          });
        }
      } catch (error) {
        console.warn('[NewTaskModal][handleSend] Failed to check repo status in direct mode:', error);
      }
      // Always proceed with send in direct mode
      console.log('[NewTaskModal][handleSend] Direct mode - proceeding to sendCore...');
      await sendCore();
      return;
    }

    // Isolation Mode: block if dirty, show gating
    if (enableWorktrees) {
      console.log('[NewTaskModal][handleSend] Isolation mode - checking repository state...');
      try {
        console.log('[NewTaskModal][handleSend] Calling taskOrchestration.checkRepositoryState...');
        const status = await taskOrchestration.checkRepositoryState(codePath.trim());
        console.log('[NewTaskModal][handleSend] Repository status:', status);

        if (status.isGit && status.isDirty) {
          console.log('[NewTaskModal][handleSend] Isolation mode + dirty -> blocking and showing gating');
          setDirtyRepoPath(codePath.trim());
          setDirtyDetailsLoading(true);

          console.log('[NewTaskModal][handleSend] Fetching porcelain status for dirty repo...');
          getRepoPorcelainStatus(codePath.trim())
            .then((result) => {
              console.log('[NewTaskModal][handleSend] Porcelain status result:', result);
              setDirtyRepoDetails(result);
            })
            .catch((error) => {
              console.error('[NewTaskModal][handleSend] Porcelain status error:', error);
              setDirtyRepoDetails([]);
            })
            .finally(() => {
              console.log('[NewTaskModal][handleSend] Porcelain status fetch completed');
              setDirtyDetailsLoading(false);
            });

          setShowDirtyRepoSection(true);
          toast.error('Repository dirty', {
            description: 'Commit or stash your changes, or disable Isolation.'
          });
          return;
        } else {
          console.log('[NewTaskModal][handleSend] Isolation mode + clean -> proceeding with send');
        }
      } catch (error) {
        console.error('[NewTaskModal][handleSend] Failed to check repository state:', error);
        toast.error('Failed to check repository status', {
          description: 'Please try again or disable Isolation.'
        });
        return;
      }
    }

    console.log('[NewTaskModal][handleSend] Proceeding to sendCore...');
    await sendCore();
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd/Ctrl + Enter to send or commit-and-continue
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (showDirtyRepoSection && !isCommitting) {
        handleCommitAndContinue();
      } else if (showInlineCommit && commitMessage.trim()) {
        handleQuickCommit();
      } else {
        handleSend();
      }
      return;
    }

    // Tab to switch projects (when not in textarea)
    if (e.key === 'Tab' && !e.shiftKey && e.target === document.body) {
      e.preventDefault();
      setShowProjectSwitcher(true);
      return;
    }
  };

  const handleProjectSelect = (projectPath: string) => {
    setCodePath(projectPath);
    setShowProjectSwitcher(false);

    // Move selected project to top of recent list
    const projects = recentProjectsManager.get();
    const selected = projects.find(p => p.path === projectPath);
    if (selected) {
      const filtered = projects.filter(p => p.path !== projectPath);
      setRecentProjects([selected, ...filtered]);
    }
  };

  const handleBrowseProject = async () => {
    if (!isTauri()) return;

    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select project folder'
      });

      if (selected && typeof selected === 'string') {
        setCodePath(selected);
        const name = selected.split(/[\\\/]/).pop() || selected;
        recentProjectsManager.add({ name, path: selected });
        setShowProjectSwitcher(false);
      }
    } catch (error) {
      console.warn('Folder selection cancelled or failed:', error);
    }
  };

  // Compute worktree blocking state
  const worktreeBlocked = enableWorktrees && repoStatus.isGit && (repoStatus.isDirty || showDirtyRepoSection);

  const canSubmit = content.trim() && codePath.trim() && !sending && !isCommitting && !worktreeBlocked;
  const projectName = codePath.split(/[\\\/]/).pop() || 'No project selected';

  // Mission Control shortcuts
  const { getShortcutHint } = useMissionControlShortcuts({
    onSendToAgent: handleSend,
    isModalOpen: true
  });

  return ReactDOM.createPortal(
    <>
      {/* Backdrop with ethereal gradient */}
      <div
        className={cn(
          "fixed inset-0 z-50 transition-opacity duration-300",
          isClosing ? "opacity-0" : "opacity-100"
        )}
        onClick={() => handleClose({ saveDraft: true })}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
        <div className="absolute inset-0 bg-gradient-to-t from-purple-900/10 via-transparent to-blue-900/10" />
      </div>

      {/* Modal - Grand, centered, elevated */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onKeyDown={handleKeyDown}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 40 }}
          transition={{
            duration: 0.3,
            ease: [0.16, 1, 0.3, 1],
            scale: { type: "spring", stiffness: 100, damping: 15 }
          }}
          className={cn(
            "relative w-full max-w-3xl",
            "bg-gradient-to-b from-white/[0.06] to-white/[0.02]",
            "backdrop-blur-2xl backdrop-saturate-200",
            "rounded-3xl shadow-2xl",
            "border border-white/30",
            "overflow-hidden"
          )}
        >
          {/* Subtle gradient overlays for depth */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-white/[0.01] pointer-events-none" />

          {/* Content container */}
          <div className="relative z-10">
            {/* Header - Direct and clear */}
            <div className="relative px-8 pt-7 pb-5">
              {/* Close button - top right */}
              <button
                onClick={() => handleClose({ saveDraft: true })}
                className="absolute top-6 right-6 p-2 rounded-xl hover:bg-white/5 transition-all duration-200 group"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-white/40 group-hover:text-white/60 transition-colors" />
              </button>

              {/* Simple, clear title */}
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10">
                  <Sparkles className="w-5 h-5 text-white/70" />
                </div>
                <div>
                  <h2 className="text-xl font-light text-white/90">
                    New Task
                  </h2>
                  <p className="text-xs text-white/40 mt-0.5">
                    Describe what you need help with
                  </p>
                </div>
              </div>
            </div>

            {/* Main content area */}
            <div className="px-8 pb-6">


              {/* Task input with Lexical editor */}
              <div className="relative rounded-2xl bg-black/20 border border-white/10 focus-within:border-white/20 transition-colors duration-200 overflow-hidden">
                <LexicalPillEditor
                  value={content}
                  onChange={setContent}
                  codePath={codePath}
                  placeholder={PLACEHOLDERS[placeholderIndex]}
                  className="lexical-chat-input lexical-task-input"
                  autoFocus={true}
                  data-testid="task-editor"
                />
              </div>
            </div>

            {/* Inline commit bar (appears when repo is dirty and worktrees disabled) */}
            <AnimatePresence>
              {showInlineCommit && !enableWorktrees && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className=" overflow-hidden"
                >
                  <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20">
                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <input
                      type="text"
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      placeholder="Quick commit message..."
                      className="flex-1 bg-gray-800 text-sm text-white/80 placeholder-white/40 focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          handleQuickCommit();
                        }
                      }}
                    />
                    <button
                      onClick={handleQuickCommit}
                      disabled={!commitMessage.trim() || isCommitting}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                        commitMessage.trim() && !isCommitting
                          ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                          : "bg-white/5 text-white/30 cursor-not-allowed"
                      )}
                    >
                      {isCommitting ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <GitCommit className="w-3 h-3" />
                      )}
                      Commit
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>


            {/* Context bar - Shows project and status with progressive disclosure */}
            <div className="border-t border-white/10">
              {/* Advanced settings - Progressive disclosure */}
              {/* Main context bar */}
              <div className="flex items-center justify-between px-8 py-3 bg-white/[0.02]">
                <div className="flex items-center gap-4 text-xs">
                  {/* Project selector */}
                  <div className="relative">
                    <button
                      onClick={() => setShowProjectSwitcher(!showProjectSwitcher)}
                      className="flex items-center gap-2 text-white/50 hover:text-white/70 transition-colors"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span className="font-mono">{projectName}</span>
                      <ChevronDown className={cn(
                        "w-3 h-3 transition-transform",
                        showProjectSwitcher && "rotate-180"
                      )} />
                    </button>

                    {/* Project switcher dropdown */}
                    <AnimatePresence>
                      {showProjectSwitcher && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute bottom-full left-0 mb-2 w-64 bg-black/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl overflow-hidden"
                        >
                          <div className="p-2">
                            <div className="text-xs text-white/40 px-3 py-2">Recent Projects</div>
                            {recentProjects.slice(0, 5).map((project) => (
                              <button
                                key={project.path}
                                onClick={() => handleProjectSelect(project.path)}
                                className={cn(
                                  "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                                  project.path === codePath
                                    ? "bg-white/10 text-white"
                                    : "text-white/70 hover:bg-white/5 hover:text-white/90"
                                )}
                              >
                                <div className="font-medium">{project.name}</div>
                                <div className="text-xs text-white/40 truncate">{project.path}</div>
                              </button>
                            ))}
                            <div className="border-t border-white/10 mt-2 pt-2">
                              <button
                                onClick={handleBrowseProject}
                                className="w-full text-left px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-white/90 transition-colors"
                              >
                                Browse for project...
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Status indicators */}
                  <div className="flex items-center gap-2">
                    {repoStatus.isGit && (
                      <>
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          repoStatus.isDirty ? "bg-amber-400" : "bg-green-400"
                        )} />
                        <span className="text-white/40">
                          {repoStatus.branch || 'main'}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Isolation indicator */}
                  {enableWorktrees && (
                    <div className="flex items-center gap-1.5 text-white/40">
                      <Shield className="w-3.5 h-3.5" />
                      <span>Worktree enabled</span>
                    </div>
                  )}
                </div>

                {/* Right side - Auto-mode and settings toggle */}
                <div className="flex items-center gap-3">
                  {/* Auto-mode indicator
                <div className="flex items-center gap-1.5 text-xs text-white/40">
                  <Sparkles className="w-3 h-3" />
                  <span>Auto Mode</span>
                </div> */}

                  {/* Settings toggle button */}
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-200",
                      showAdvanced
                        ? "bg-white/10 text-white/70 border border-white/20"
                        : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white/70"
                    )}
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Settings</span>
                    <ChevronRight className={cn(
                      "w-3 h-3 transition-transform duration-200",
                      showAdvanced && "rotate-90"
                    )} />
                  </button>
                </div>
              </div>
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-8 py-4 bg-gradient-to-b from-white/[0.02] to-transparent border-b border-white/5">
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <GitBranch className="w-4 h-4 text-white/60" />
                            <span className="text-sm font-medium text-white/80">Workspace Isolation</span>
                          </div>
                          <p className="text-xs text-white/50 leading-relaxed mb-3">
                            When enabled, Orchestra creates an isolated Git worktree for each task, keeping your main branch pristine and allowing parallel work on multiple features.
                          </p>

                          {/* Worktree toggle */}
                          <label className="flex items-center gap-3 cursor-pointer group">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={enableWorktrees}
                                onChange={(e) => setEnableWorktrees(e.target.checked)}
                                className="sr-only"
                              />
                              <div className={cn(
                                "w-10 h-6 rounded-full transition-all duration-200",
                                enableWorktrees
                                  ? "bg-gradient-to-r from-blue-500 to-purple-500"
                                  : "bg-white/10"
                              )}>
                                <div className={cn(
                                  "absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200",
                                  enableWorktrees && "translate-x-4"
                                )} />
                              </div>
                            </div>
                            <span className="text-sm text-white/70 group-hover:text-white/90 transition-colors">
                              {enableWorktrees ? 'Isolated workspace enabled' : 'Direct editing mode'}
                            </span>
                            {enableWorktrees ? (
                              <Shield className="w-3.5 h-3.5 text-green-400/70" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-amber-400/70" />
                            )}
                          </label>
                        </div>
                      </div>

                      {/* Repository Debug */}
                      <div className="mt-6 pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Info className="w-4 h-4 text-white/60" />
                            <span className="text-sm font-medium text-white/80">Repository Debug</span>
                          </div>
                          <button
                            onClick={() => setShowRepoDebug(!showRepoDebug)}
                            className={cn(
                              "px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                              showRepoDebug
                                ? "bg-white/10 text-white/70 hover:bg-white/15"
                                : "bg-white/5 text-white/50 hover:bg-white/10"
                            )}
                          >
                            {showRepoDebug ? 'Hide' : 'Show'}
                          </button>
                        </div>

                        <AnimatePresence>
                          {showRepoDebug && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/10 space-y-3">
                                <div className="flex flex-wrap items-center gap-3 text-xs">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-white/50">Path:</span>
                                    <span className="font-mono text-white/70">{codePath || '—'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-white/50">isGit:</span>
                                    <span className="text-white/70">{repoStatus.isGit ? 'yes' : 'no'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-white/50">isDirty:</span>
                                    <span className="text-white/70">{repoStatus.isDirty ? 'yes' : 'no'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-white/50">Porcelain:</span>
                                    {repoDebugLoading ? (
                                      <span className="text-white/60">Loading…</span>
                                    ) : (
                                      <span className={cn(
                                        "px-2 py-0.5 rounded-md",
                                        dirtyRepoDetails.length === 0
                                          ? "bg-green-500/15 text-green-300"
                                          : "bg-amber-500/15 text-amber-300"
                                      )}>
                                        {dirtyRepoDetails.length === 0 ? 'Clean' : `Dirty (${dirtyRepoDetails.length})`}
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    onClick={refreshPorcelain}
                                    className="ml-auto px-2.5 py-1 rounded-md text-xs bg-white/10 text-white/70 hover:bg-white/15 transition-colors"
                                  >
                                    Refresh Porcelain
                                  </button>
                                </div>
                                <div className="border-t border-white/10 pt-3">
                                  {repoDebugLoading ? (
                                    <div className="flex justify-center py-4">
                                      <Loader2 className="w-4 h-4 animate-spin text-white/60" />
                                    </div>
                                  ) : (
                                    <GitStatusList entries={dirtyRepoDetails} />
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>


            </div>

            {/* Actions - Grand and purposeful */}
            <div className="relative border-t border-white/10 bg-gradient-to-b from-white/[0.02] to-transparent">
              {/* Subtle shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent animate-shimmer" />

              <div className="relative flex items-center justify-between px-8 py-5">
                <button
                  onClick={() => handleClose({ saveDraft: true })}
                  className="px-5 py-2.5 text-sm text-white/50 hover:text-white/70 transition-all duration-200 hover:bg-white/5 rounded-xl"
                >
                  Cancel
                </button>

                <button
                  onClick={showDirtyRepoSection ? handleCommitAndContinue : handleSend}
                  disabled={!canSubmit && !(showDirtyRepoSection && commitMessage.trim())}
                  className={cn(
                    "group relative px-8 py-3 rounded-2xl text-sm font-medium transition-all duration-300 flex items-center gap-3",
                    (canSubmit || (showDirtyRepoSection && commitMessage.trim()))
                      ? "bg-gradient-to-r from-white to-white/90 text-black hover:scale-105 active:scale-100 shadow-lg hover:shadow-xl"
                      : "bg-white/10 text-white/30 cursor-not-allowed"
                  )}
                >
                  {/* Glow effect on hover */}
                  {(canSubmit || (showDirtyRepoSection && commitMessage.trim())) && (
                    <div className="absolute inset-0 rounded-2xl bg-white/20 blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300" />
                  )}

                  <div className="relative flex items-center gap-2">
                    {(sending || isCommitting) ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full"
                        />
                        <span>{isCommitting ? 'Committing...' : 'Creating task...'}</span>
                      </>
                    ) : showDirtyRepoSection ? (
                      <>
                        <GitCommit className="w-4 h-4" />
                        <span>Checkpoint & Continue</span>
                        <kbd className="ml-2 text-[10px] text-black/40 bg-black/10 px-1.5 py-0.5 rounded">
                          ⌘↵
                        </kbd>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Create Task</span>
                        <kbd className="ml-2 text-[10px] text-black/40 bg-black/10 px-1.5 py-0.5 rounded">
                          {getShortcutHint('send')}
                        </kbd>
                      </>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* CSS animations and custom styles */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 3s ease-in-out infinite;
        }
        
        /* Custom styles for Lexical editor in task modal */
        .lexical-task-input .lexical-editor-root {
          background: transparent !important;
          border: none !important;
          color: rgba(255, 255, 255, 0.9) !important;
          font-size: 15px !important;
          line-height: 1.6 !important;
          padding: 16px 20px !important;
          min-height: 220px !important;
          max-height: 45vh !important;
          overflow-y: auto !important;
        }
        
        .lexical-task-input .lexical-editor-root:focus {
          outline: none !important;
          box-shadow: none !important;
        }
        
        .lexical-task-input [contenteditable]:focus-visible {
          outline: none !important;
        }
        
        .lexical-task-input .lexical-paragraph {
          margin: 0 0 8px 0 !important;
        }
        
        .lexical-task-input .lexical-paragraph:last-child {
          margin-bottom: 0 !important;
        }
        

      `}</style>
    </>,
    document.body
  );
};

// Export with the same name as NewDraftModal for drop-in replacement
export { NewTaskModal as NewDraftModal };