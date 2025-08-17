/**
 * Permissions Modal - Reimagined with Apple-level sophistication
 * Dark glassmorphic design with emotional intelligence
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { X, Plus, Trash2, Shield, FolderOpen, Lock, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { AccessPolicy } from '@/services/localTool/types';
import { useSessionPermissionsStore, sessionPermissionsUtils } from '@/stores/sessionPermissionsStore';
import { isTauri } from '@/utils/environment';
import { open } from '@tauri-apps/plugin-dialog';

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  currentCwd: string;
}

interface EditableAccessPolicy {
  whitelist: string[];
  blacklist: string[];
}

const PermissionsModal: React.FC<PermissionsModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  currentCwd
}) => {
  const {
    getSessionPermissions,
    setSessionPermissions,
    getDefaultPermissions,
    hasCustomPermissions
  } = useSessionPermissionsStore();

  const [editablePolicy, setEditablePolicy] = useState<EditableAccessPolicy>({
    whitelist: [],
    blacklist: []
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeSection, setActiveSection] = useState<'whitelist' | 'blacklist'>('whitelist');
  const [isClosing, setIsClosing] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // Load current permissions when modal opens (includes vault path + /tmp defaults)
  useEffect(() => {
    if (isOpen && sessionId) {
      const loadPermissions = async () => {
        try {
          const permissions = await sessionPermissionsUtils.getOrCreateSessionPermissions(sessionId, currentCwd);
          const policy = permissions.accessPolicy;
          
          console.log('🔍 [DEBUG] PermissionsModal loading policy:', {
            policy,
            whitelist: policy.whitelist,
            whitelistTypes: policy.whitelist?.map(item => ({ item, type: typeof item }))
          });
          
          setEditablePolicy({
            whitelist: policy.whitelist || [],
            blacklist: policy.blacklist || []
          });
          
          setHasUnsavedChanges(false);
        } catch (error) {
          console.error('Failed to load session permissions:', error);
          // Fallback to basic permissions
          const basicPermissions = getDefaultPermissions(currentCwd);
          setEditablePolicy({
            whitelist: basicPermissions.whitelist || [],
            blacklist: basicPermissions.blacklist || []
          });
        }
      };
      
      loadPermissions();
    }
  }, [isOpen, sessionId, currentCwd, getDefaultPermissions]);

  // Track changes
  const handlePolicyChange = useCallback((newPolicy: EditableAccessPolicy) => {
    setEditablePolicy(newPolicy);
    setHasUnsavedChanges(true);
  }, []);

  // Add item to array
  const addItem = useCallback((field: keyof EditableAccessPolicy, value: string) => {
    if (!value.trim()) return;
    
    const newPolicy = {
      ...editablePolicy,
      [field]: [...editablePolicy[field], value.trim()]
    };
    handlePolicyChange(newPolicy);
  }, [editablePolicy, handlePolicyChange]);

  // Remove item from array
  const removeItem = useCallback((field: keyof EditableAccessPolicy, index: number) => {
    const newPolicy = {
      ...editablePolicy,
      [field]: editablePolicy[field].filter((_, i) => i !== index)
    };
    handlePolicyChange(newPolicy);
  }, [editablePolicy, handlePolicyChange]);

  // Save permissions
  const handleSave = useCallback(() => {
    const accessPolicy: AccessPolicy = {
      whitelist: editablePolicy.whitelist.length > 0 ? editablePolicy.whitelist : undefined,
      blacklist: editablePolicy.blacklist.length > 0 ? editablePolicy.blacklist : undefined
    };

    setSessionPermissions(sessionId, accessPolicy, true);
    setHasUnsavedChanges(false);
    
    toast.success('Orchestra permissions updated', {
      description: 'Your agent access controls are now active'
    });
    
    handleClose();
  }, [editablePolicy, sessionId, setSessionPermissions]);

  // Handle close with unsaved changes check
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges && !showUnsavedWarning) {
      setShowUnsavedWarning(true);
      return;
    }
    
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setShowUnsavedWarning(false);
    }, 200);
  }, [hasUnsavedChanges, showUnsavedWarning, onClose]);

  // Force close without saving
  const handleDiscardChanges = useCallback(() => {
    setShowUnsavedWarning(false);
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  }, [onClose]);

  // Handle ESC key
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      return () => document.removeEventListener('keydown', handleEscKey);
    }
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

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
      
      {/* Modal with scale animation */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className={cn(
            "relative w-full max-w-2xl transition-all duration-200",
            isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"
          )}
        >
          {/* Dark modal matching your theme */}
          <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
            
            {/* Subtle unsaved changes warning */}
            {showUnsavedWarning && (
              <div className="relative px-8 py-3 bg-white/[0.02] border-b border-white/10 animate-in slide-in-from-top duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70 font-light">
                    You have unsaved changes
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleDiscardChanges}
                      className="text-xs text-white/50 hover:text-white/70 transition-colors font-light"
                    >
                      Discard
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-3 py-1 text-xs bg-white/10 hover:bg-white/20 text-white rounded transition-colors font-medium"
                    >
                      Save & Close
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Header - Minimal and elegant */}
            <div className="relative px-8 pt-8 pb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-light text-white tracking-tight">
                    Orchestra Agent Permissions
                  </h2>
                  <p className="text-white/50 mt-1 text-sm font-light">
                    Control which folders Orchestra's agents can access on your computer
                  </p>
                </div>
                
                {/* Close button - subtle */}
                <button
                  onClick={handleClose}
                  className="p-2 -mr-2 rounded-lg hover:bg-white/5 transition-colors group"
                >
                  <X className="w-5 h-5 text-white/40 group-hover:text-white/60 transition-colors" />
                </button>
              </div>
            </div>

            {/* Main content area */}
            <div className="px-8 pb-8">
              {/* Primary action - Allow directories */}
              <div className="mb-6">
                <AllowedDirectories
                  directories={editablePolicy.whitelist}
                  onAdd={(dir) => addItem('whitelist', dir)}
                  onRemove={(index) => removeItem('whitelist', index)}
                  currentCwd={currentCwd}
                />
              </div>

              {/* Advanced options - Collapsed by default */}
              <AdvancedOptions
                blacklist={editablePolicy.blacklist}
                onAddBlacklist={(pattern) => addItem('blacklist', pattern)}
                onRemoveBlacklist={(index) => removeItem('blacklist', index)}
              />
            </div>

            {/* Footer - Clean action bar */}
            <div className="px-8 py-4 bg-black/50 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="text-xs text-white/30 font-light">
                  {editablePolicy.whitelist.length === 0 ? (
                    "Orchestra agents have no file access"
                  ) : (
                    `Orchestra agents can access ${editablePolicy.whitelist.length} ${editablePolicy.whitelist.length === 1 ? 'folder' : 'folders'}`
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-sm text-white/50 hover:text-white/70 transition-colors font-light"
                  >
                    Cancel
                  </button>
                  
                  <button
                    onClick={handleSave}
                    disabled={!hasUnsavedChanges}
                    className={cn(
                      "px-6 py-2 rounded-xl text-sm font-normal transition-all duration-300",
                      hasUnsavedChanges
                        ? "bg-white text-black hover:scale-105 active:scale-100"
                        : "bg-white/10 text-white/30 cursor-not-allowed"
                    )}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


    </>,
    document.body
  );
};

// Primary component - Allowed Directories
const AllowedDirectories: React.FC<{
  directories: string[];
  onAdd: (dir: string) => void;
  onRemove: (index: number) => void;
  currentCwd: string;
}> = ({ directories, onAdd, onRemove, currentCwd }) => {
  const [newDir, setNewDir] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    if (newDir.trim()) {
      onAdd(newDir.trim());
      setNewDir('');
      inputRef.current?.focus();
    }
  };

  const handlePickFolder = async () => {
    if (!isTauri()) {
      // Fail gracefully - no error message needed as this will only run in Tauri
      return;
    }
    
    try {
      const selected = await open({ 
        directory: true, 
        multiple: false,
        title: 'Select folder for Orchestra access'
      });
      
      if (selected && typeof selected === 'string') {
        onAdd(selected);
      }
    } catch (error) {
      // Fail gracefully - no error message needed
      console.warn('Folder selection cancelled or failed:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  return (
    <div>
      {/* Input with integrated buttons */}
      <div className="flex gap-2">
        <div className="relative group flex-1">
          <input
            ref={inputRef}
            type="text"
            value={newDir}
            onChange={(e) => setNewDir(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={currentCwd || "/path/to/your/project"}
            className="w-full px-4 py-3 pr-12 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all duration-200"
          />
          
          <button
            onClick={handleAdd}
            disabled={!newDir.trim()}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all duration-200",
              newDir.trim()
                ? "bg-white/10 hover:bg-white/20 text-white"
                : "bg-transparent text-white/20 cursor-not-allowed"
            )}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        {/* Folder picker button - only show in Tauri */}
        {isTauri() && (
          <button
            onClick={handlePickFolder}
            className="px-4 py-3 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-xl text-white/70 hover:text-white transition-all duration-200 flex items-center gap-2"
            title="Browse for folder"
          >
            <FolderOpen className="w-4 h-4" />
            <span className="text-sm font-light">Browse</span>
          </button>
        )}
      </div>

      {/* Directory list */}
      <div className="mt-3 space-y-2">
        {directories.map((dir, index) => (
          <div
            key={`${dir}-${index}`}
            className="group flex items-center gap-3 px-4 py-3 bg-white/[0.02] hover:bg-white/[0.05] rounded-lg transition-all duration-200 border border-white/10"
          >
            <FolderOpen className="w-4 h-4 text-white/40" />
            <span className="flex-1 font-mono text-sm text-white/70">{dir}</span>
            <button
              onClick={() => onRemove(index)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/60 transition-all duration-200"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        
        {/* Empty state */}
        {directories.length === 0 && (
          <div className="py-12 text-center">
            <Shield className="w-12 h-12 mx-auto text-white/20 mb-3" />
            <p className="text-white/50 text-sm font-light">Orchestra agents have no file access</p>
            <p className="text-white/30 text-xs mt-1 font-light">Add folders above to grant Orchestra access</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Advanced options - Collapsed by default
const AdvancedOptions: React.FC<{
  blacklist: string[];
  onAddBlacklist: (pattern: string) => void;
  onRemoveBlacklist: (index: number) => void;
}> = ({ blacklist, onAddBlacklist, onRemoveBlacklist }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newBlacklist, setNewBlacklist] = useState('');

  return (
    <div className="border-t border-white/10 pt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-white/40 hover:text-white/60 transition-colors font-light"
      >
        <ChevronDown className={cn(
          "w-4 h-4 transition-transform duration-200",
          isExpanded ? "rotate-180" : ""
        )} />
        Prevent Orchestra from accessing specific files
      </button>
      
      {/* Smooth expand/collapse */}
      <div className={cn(
        "overflow-hidden transition-all duration-300",
        isExpanded ? "max-h-96 opacity-100 mt-4" : "max-h-0 opacity-0"
      )}>
        <div>
          {/* Note about .gitignore */}
          <div className="mb-3 p-3 rounded-lg bg-white/[0.02] border border-white/10">
            <p className="text-sm text-white/60 font-light flex items-start gap-2">
              <span className="text-white/40 mt-0.5">
                <Shield className="w-4 h-4" />
              </span>
              <span>
                By default, Orchestra respects your <span className="font-mono text-white/70">.gitignore</span> files and won't access any files that are ignored by Git.
              </span>
            </p>
          </div>
          {/* Blacklist patterns */}
          <div>
            <label className="text-xs text-white/30 uppercase tracking-wider font-light">Files Orchestra cannot access</label>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={newBlacklist}
                onChange={(e) => setNewBlacklist(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newBlacklist.trim()) {
                    onAddBlacklist(newBlacklist.trim());
                    setNewBlacklist('');
                  }
                }}
                placeholder="**/*.env"
                className="flex-1 px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/20"
              />
              <button
                onClick={() => {
                  if (newBlacklist.trim()) {
                    onAddBlacklist(newBlacklist.trim());
                    setNewBlacklist('');
                  }
                }}
                disabled={!newBlacklist.trim()}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4 text-white/60" />
              </button>
            </div>
            
            {/* Blacklist items */}
            <div className="mt-2 space-y-1">
              {blacklist.map((pattern, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <Lock className="w-3 h-3 text-white/30" />
                  <span className="flex-1 font-mono text-white/50">{pattern}</span>
                  <button
                    onClick={() => onRemoveBlacklist(index)}
                    className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white/50 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionsModal;