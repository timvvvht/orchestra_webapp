import React, { useEffect, useState, useRef, useMemo } from 'react';
import { FolderOpen, Loader2, AlertCircle, Check, Edit3, X, Download, KeyRound, Eye, EyeOff, Copy, Plus, Shield, Search, Settings, Palette, Bell, Zap, Globe, Wrench } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { toast } from 'sonner';
import { open } from '@tauri-apps/plugin-dialog';
import { ensureDirectoryExists } from '@/api/settingsApi';
import { checkForAppUpdates } from '@/utils/updater';
import { useBYOKStore } from '@/stores/byokStore';
import { useAuth } from '@/auth/AuthContext';
import { storeApiKey, deleteApiKey } from '@/services/byokApi';
import ToolApprovalSettings from './ToolApprovalSettings';

const SimpleVaultSettings: React.FC = () => {
  // Get auth context
  const auth = useAuth();
  
  // Get settings from the store
  const { 
    settings, 
    isLoading, 
    error, 
    setVaultSetting,
    initSettings 
  } = useSettingsStore();
  
  // Get BYOK store for ACS server-only storage
  const {
    storedKeyProviders,
    isLoadingKeyProviders,
    keyProvidersError,
    fetchStoredKeyProviders,
    addStoredKeyProvider,
    removeStoredKeyProvider
  } = useBYOKStore();
  
  // Local state for editing and validation
  const [isEditing, setIsEditing] = useState(false);
  const [editedPath, setEditedPath] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [activeTab, setActiveTab] = useState('vault');
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  // BYOK state
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [newApiKey, setNewApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isStoringKey, setIsStoringKey] = useState(false);
  const [isDeletingKey, setIsDeletingKey] = useState<string | null>(null);
  
  // Available providers for BYOK
  const availableProviders = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'google', label: 'Google' },
    { value: 'azure', label: 'Azure' },
  ];

  // Sidebar navigation configuration
  const sidebarSections = [
    {
      title: 'Core',
      items: [
        { id: 'vault', label: 'Knowledge Vault', icon: FolderOpen, description: 'Local storage and sync' },
        { id: 'api-keys', label: 'API Keys', icon: KeyRound, description: 'Secure key management' },
        { id: 'security', label: 'Security', icon: Shield, description: 'Privacy and permissions' },
      ]
    },
    {
      title: 'Interface',
      items: [
        { id: 'appearance', label: 'Appearance', icon: Palette, description: 'Theme and display' },
        { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Alerts and updates' },
      ]
    },
    {
      title: 'Advanced',
      items: [
        { id: 'performance', label: 'Performance', icon: Zap, description: 'Speed and optimization' },
        { id: 'integrations', label: 'Integrations', icon: Globe, description: 'External services' },
        { id: 'tool-approval', label: 'Tool Approval', icon: Wrench, description: 'Permission management' },
      ]
    }
  ];

  // Simple fuzzy search function
  const fuzzyMatch = (text: string, query: string): boolean => {
    if (!query) return true;
    if (!text) return false;
    
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Exact match check - return true immediately
    if (textLower.includes(queryLower)) return true;
    
    // Fuzzy match - allow for one character difference
    // This is a simple implementation that checks if removing one character from the query
    // would result in a match
    if (queryLower.length <= 1) return false;
    
    for (let i = 0; i < queryLower.length; i++) {
      const fuzzyQuery = queryLower.slice(0, i) + queryLower.slice(i + 1);
      if (textLower.includes(fuzzyQuery)) return true;
    }
    
    // Also check for character transposition (swapped adjacent characters)
    for (let i = 0; i < queryLower.length - 1; i++) {
      const fuzzyQuery = queryLower.slice(0, i) + 
                         queryLower.charAt(i + 1) + 
                         queryLower.charAt(i) + 
                         queryLower.slice(i + 2);
      if (textLower.includes(fuzzyQuery)) return true;
    }
    
    return false;
  };
  
  // Filter sidebar items based on search - with fuzzy search fallback
  const filteredSections = useMemo(() => {
    // First try exact matching
    const exactMatches = sidebarSections.map(section => ({
      ...section,
      items: section.items.filter(item => 
        searchQuery === '' || 
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(section => section.items.length > 0);
    
    // If we have results, return them
    if (exactMatches.length > 0 || searchQuery === '') {
      return exactMatches;
    }
    
    // Otherwise fall back to fuzzy search
    return sidebarSections.map(section => ({
      ...section,
      items: section.items.filter(item => 
        fuzzyMatch(item.label, searchQuery) ||
        fuzzyMatch(item.description, searchQuery)
      )
    })).filter(section => section.items.length > 0);
  }, [searchQuery]);
  
  // Extract vault path and connection status
  const { path: vaultPath, isConnected } = settings.vault;
  
  // Initialize settings on component mount
  useEffect(() => {
    initSettings();
  }, [initSettings]);
  
  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Initialize BYOK data when authenticated
  useEffect(() => {
    if (auth.isAuthenticated) {
      // Add a small delay to ensure auth context has fully initialized
      const timer = setTimeout(() => {
        fetchStoredKeyProviders();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [auth.isAuthenticated, fetchStoredKeyProviders]);

  // Handle manual update check
  const handleCheckForUpdates = async () => {
    setIsCheckingUpdates(true);
    try {
      await checkForAppUpdates(true); // true = user initiated
    } catch (error) {
      console.error('Update check failed:', error);
    } finally {
      setIsCheckingUpdates(false);
    }
  };
  
  // Handle entering edit mode
  const handleEdit = () => {
    setEditedPath(vaultPath);
    setIsEditing(true);
    setValidationError(null);
  };
  
  // Handle canceling edit
  const handleCancel = () => {
    setIsEditing(false);
    setEditedPath('');
    setValidationError(null);
    setHasUnsavedChanges(false);
  };
  
  // Handle folder selection via dialog
  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Knowledge Vault Location'
      });
      
      if (selected && !Array.isArray(selected)) {
        if (isEditing) {
          setEditedPath(selected);
          setHasUnsavedChanges(true);
        } else {
          await validateAndSetPath(selected);
        }
      }
    } catch (error) {
      toast.error(`Failed to select folder: ${error}`);
    }
  };

  // Validate and set the vault path
  const validateAndSetPath = async (path: string) => {
    console.log('[VaultSettings] Attempting to save vault path:', path);
    if (!path.trim()) {
      setValidationError('Path cannot be empty');
      return;
    }
    
    setIsValidating(true);
    setValidationError(null);
    
    try {
      // Ensure the directory exists or create it
      console.log('[VaultSettings] Ensuring directory exists:', path);
      await ensureDirectoryExists(path);
      console.log('[VaultSettings] Directory exists or created:', path);
      
      // Update the setting
      console.log('[VaultSettings] Calling setVaultSetting("path"):', path);
      await setVaultSetting('path', path);
      console.log('[VaultSettings] setVaultSetting("path") completed:', path);
      toast.success('Knowledge vault updated', {
        description: `Now storing your knowledge at: ${path}`,
        icon: <Check className="w-4 h-4" />
      });
      
      setIsEditing(false);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('[VaultSettings] Failed to set vault path:', { path, error });
      setValidationError(`Invalid path: ${error}`);
      toast.error(`Failed to set vault path: ${error}`);
    } finally {
      setIsValidating(false);
    }
  };
  
  // Handle saving the edited path
  const handleSave = async () => {
    await validateAndSetPath(editedPath);
  };
  
  // Handle path input change
  const handlePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedPath(e.target.value);
    setHasUnsavedChanges(e.target.value !== vaultPath);
    if (validationError) {
      setValidationError(null);
    }
  };
  
  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // BYOK Handler Functions
  const handleStoreApiKey = async () => {
    if (!newApiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    if (!auth.isAuthenticated) {
      toast.error('Please sign in to store API keys');
      return;
    }

    setIsStoringKey(true);
    try {
      const success = await storeApiKey(selectedProvider, newApiKey.trim());
      
      if (success) {
        // Update local state
        addStoredKeyProvider(selectedProvider);
        setNewApiKey('');
        toast.success(`${selectedProvider} API key stored successfully`);
      } else {
        toast.error(`Failed to store API key for ${selectedProvider}`);
      }
    } catch (error) {
      console.error('Failed to store API key for ' + selectedProvider + ':', error);
      const errorMessage = (error as any)?.response?.data?.detail || 
                           (error as any)?.response?.data?.error ||
                           (error as any)?.response?.data?.message ||
                           (error as any)?.message ||
                           (error instanceof Error ? error.message : 'Unknown error');
      toast.error(`Failed to store API key for ${selectedProvider}: ${errorMessage}`);
    } finally {
      setIsStoringKey(false);
    }
  };

  const handleDeleteApiKey = async (provider: string) => {
    if (!auth.isAuthenticated) {
      toast.error('Please sign in to delete API keys');
      return;
    }

    setIsDeletingKey(provider);
    try {
      const success = await deleteApiKey(provider);
      
      if (success) {
        // Update local state
        removeStoredKeyProvider(provider);
        toast.success(`${provider} API key deleted successfully`);
      } else {
        toast.error(`Failed to delete API key for ${provider}`);
      }
    } catch (error) {
      console.error('Failed to delete API key for ' + provider + ':', error);
      const errorMessage = (error as any)?.response?.data?.detail ||
                           (error as any)?.response?.data?.error ||
                           (error as any)?.response?.data?.message ||
                           (error as any)?.message ||
                           (error instanceof Error ? error.message : 'Unknown error');
      toast.error(`Failed to delete API key for ${provider}: ${errorMessage}`);
    } finally {
      setIsDeletingKey(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };


  
  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black/95 backdrop-blur-2xl">
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-white/40" />
            <p className="text-sm text-white/70 font-light">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-black/95 backdrop-blur-2xl">
        <div className="flex items-center justify-center min-h-screen p-8">
          <div className="max-w-md w-full">
            <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/20 p-8 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none rounded-2xl" />
              <div className="relative flex items-start gap-4">
                <AlertCircle className="w-5 h-5 text-white/70 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-white/90 mb-2">Error loading settings</h3>
                  <p className="text-sm text-white/70 font-light mb-6">{error}</p>
                  <button 
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-200 font-medium text-sm"
                    onClick={() => initSettings()}
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black/95 backdrop-blur-2xl">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
      
      {/* Main Layout - Sidebar + Content */}
      <div className="flex h-screen overflow-hidden">
        {/* Sophisticated Sidebar */}
        <div className="w-72 bg-white/[0.03] backdrop-blur-xl border-r border-white/20 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
          
          {/* Sidebar Header */}
          <div className="relative p-8 border-b border-white/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Settings className="w-5 h-5 text-white/70" />
              </div>
              <div>
                <h1 className="text-xl font-medium text-white/90">Settings</h1>
                <p className="text-sm text-white/50 font-light">Configure Orchestra</p>
              </div>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                name="search-no-autofill"
                data-form-type="other"
                className="w-full pl-10 pr-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-white placeholder-white/40 focus:border-white/30 focus:bg-white/[0.05] transition-all duration-200 outline-none text-sm font-light"
              />
            </div>
          </div>

          {/* Sidebar Navigation */}
          <div className="relative p-6 space-y-8 overflow-y-auto">
            {filteredSections.map((section) => (
              <div key={section.title} className="space-y-3">
                <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider px-3">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = activeTab === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 text-left group ${
                          isActive 
                            ? 'bg-white/10 text-white/90 shadow-lg' 
                            : 'text-white/70 hover:text-white/90 hover:bg-white/5'
                        }`}
                      >
                        <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white/90' : 'text-white/50 group-hover:text-white/70'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{item.label}</div>
                          <div className={`text-xs font-light ${isActive ? 'text-white/70' : 'text-white/40 group-hover:text-white/50'}`}>
                            {item.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Content Header */}
          <div className="border-b border-white/10 bg-white/[0.02] backdrop-blur-lg">
            <div className="px-8 py-8">
              {(() => {
                const currentItem = sidebarSections.flatMap(s => s.items).find(item => item.id === activeTab);
                return (
                  <div className="flex items-center gap-4">
                    {currentItem && (
                      <>
                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                          <currentItem.icon className="w-6 h-6 text-white/70" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-medium text-white/90">{currentItem.label}</h2>
                          <p className="text-white/70 font-light">{currentItem.description}</p>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Content Body */}
          <div className="p-8 h-full">
            <div className="w-full h-full">
              {/* Tab Content */}
              {activeTab === 'vault' && (
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Vault Path Section */}
                    <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none rounded-2xl" />
                {/* Section Header */}
                <div className="relative px-8 py-6 border-b border-white/10 bg-white/[0.02]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                        <FolderOpen className="w-6 h-6 text-white/70" />
                      </div>
                      <div>
                        <h2 className="font-medium text-white/90">Knowledge Vault</h2>
                        <p className="text-sm text-white/70 font-light">
                          {isConnected ? 'Active & Ready' : 'Not configured'}
                        </p>
                      </div>
                    </div>
                    {isConnected && (
                      <div className="flex items-center gap-2 text-white/70">
                        <div className="w-2 h-2 rounded-full bg-white/70 animate-pulse" />
                        <span className="text-sm font-light">Syncing</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Path Configuration */}
                <div className="relative p-8 space-y-6">
                  <div className="space-y-3">
                    <label htmlFor="vault-path" className="text-sm font-medium text-white/90">
                      Vault Directory
                    </label>
                
                    {!isEditing ? (
                      // View Mode
                      <div className="flex items-center gap-3">
                        <div className="flex-1 px-4 py-3 rounded-xl border border-white/10 bg-white/[0.02] min-h-[48px] flex items-center">
                          {vaultPath ? (
                            <span className="text-sm font-mono text-white/90 truncate">{vaultPath}</span>
                          ) : (
                            <span className="text-sm text-white/50 font-light italic">Choose where to store your knowledge</span>
                          )}
                        </div>
                        <button
                          onClick={handleEdit}
                          className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-200 font-medium text-sm flex items-center gap-2"
                        >
                          <Edit3 className="w-4 h-4" />
                          Edit
                        </button>
                      </div>
                    ) : (
                      // Edit Mode
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <input
                            ref={inputRef}
                            id="vault-path"
                            value={editedPath}
                            onChange={handlePathChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Enter directory path or browse..."
                            className="flex-1 px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-white placeholder-white/40 focus:border-white/30 focus:bg-white/[0.05] transition-all duration-200 outline-none font-mono text-sm"
                            disabled={isValidating}
                          />
                          <button
                            onClick={handleSelectFolder}
                            disabled={isValidating}
                            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-200 disabled:opacity-50"
                            title="Browse folders"
                          >
                            <FolderOpen className="w-4 h-4" />
                          </button>
                        </div>
                    
                        {/* Action Buttons */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={handleSave}
                              disabled={isValidating || !hasUnsavedChanges}
                              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-200 font-medium text-sm flex items-center gap-2 disabled:opacity-50"
                            >
                              {isValidating ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Validating...
                                </>
                              ) : (
                                <>
                                  <Check className="w-4 h-4" />
                                  Save
                                </>
                              )}
                            </button>
                            <button
                              onClick={handleCancel}
                              disabled={isValidating}
                              className="px-4 py-2 text-white/70 hover:text-white/90 hover:bg-white/5 rounded-xl transition-all duration-200 font-light text-sm flex items-center gap-2 disabled:opacity-50"
                            >
                              <X className="w-4 h-4" />
                              Cancel
                            </button>
                          </div>
                          {hasUnsavedChanges && (
                            <span className="text-xs text-white/50 font-light">Unsaved changes</span>
                          )}
                        </div>
                      </div>
                    )}
                
                    {/* Validation Error */}
                    {validationError && (
                      <div className="flex items-center gap-3 text-sm text-white/70 bg-white/[0.02] border border-white/10 rounded-xl p-4">
                        <AlertCircle className="w-4 h-4 text-white/70" />
                        {validationError}
                      </div>
                    )}
                    
                    {/* Help Text */}
                    {!isEditing && !validationError && (
                      <p className="text-sm text-white/70 font-light">
                        Your personal knowledge repository—where Orchestra organizes your notes, documents, and ideas.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* App Updates Section */}
              <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none rounded-2xl" />
                
                {/* Section Header */}
                <div className="relative px-8 py-6 border-b border-white/10 bg-white/[0.02]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                        <Download className="w-6 h-6 text-white/70" />
                      </div>
                      <div>
                        <h2 className="font-medium text-white/90">App Updates</h2>
                        <p className="text-sm text-white/70 font-light">
                          Keep Orchestra up to date
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Update Controls */}
                <div className="relative p-8">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-white/90">Check for Updates</p>
                      <p className="text-sm text-white/70 font-light">
                        Orchestra automatically checks for updates, or check manually
                      </p>
                    </div>
                    <button
                      onClick={handleCheckForUpdates}
                      disabled={isCheckingUpdates}
                      className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-200 font-medium text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      {isCheckingUpdates ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      {isCheckingUpdates ? 'Checking...' : 'Check Now'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="bg-white/[0.02] backdrop-blur-lg rounded-2xl border border-white/10 p-8">
                <h3 className="font-medium text-white/90 mb-4">About Your Knowledge Vault</h3>
                <div className="space-y-3 text-sm text-white/70 font-light">
                  <p>
                    • Your vault is a secure, local directory where Orchestra stores all your knowledge
                  </p>
                  <p>
                    • Everything stays on your device—complete privacy, zero cloud dependency
                  </p>
                  <p>
                    • Instant access to notes, documents, and files with intelligent organization
                  </p>
                  <p>
                    • Switch vault locations anytime—your knowledge moves with you
                  </p>
                </div>
                  </div>
                </div>
              )}

          {activeTab === 'api-keys' && (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* API Keys Management Section */}
              <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none rounded-2xl" />
                {/* Section Header */}
                <div className="relative px-8 py-6 border-b border-white/10 bg-white/[0.02]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                        <KeyRound className="w-6 h-6 text-white/70" />
                      </div>
                      <div>
                        <h2 className="font-medium text-white/90">API Key Management</h2>
                        <p className="text-sm text-white/70 font-light">
                          {auth.isAuthenticated ? 'Securely store your API keys on the server' : 'Sign in to manage API keys'}
                        </p>
                      </div>
                    </div>
                    {storedKeyProviders.length > 0 && (
                      <div className="flex items-center gap-2 text-white/70">
                        <div className="w-2 h-2 rounded-full bg-white/70" />
                        <span className="text-sm font-light">{storedKeyProviders.length} stored</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* API Keys Content */}
                <div className="relative p-8 space-y-8">
                  {!auth.isAuthenticated ? (
                    <div className="text-center py-12">
                      <KeyRound className="w-16 h-16 text-white/40 mx-auto mb-6" />
                      <h3 className="font-medium text-white/90 mb-3">Authentication Required</h3>
                      <p className="text-sm text-white/70 font-light mb-8">
                        Please sign in to manage your API keys securely
                      </p>
                      <button 
                        onClick={() => auth.setShowModal(true)}
                        className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-200 font-medium"
                      >
                        Sign In
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Add New API Key */}
                      <div className="space-y-6">
                        <h3 className="font-medium text-white/90">Add New API Key</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-3">
                            <label htmlFor="provider" className="text-sm font-medium text-white/90">Provider</label>
                            <select
                              id="provider"
                              value={selectedProvider}
                              onChange={(e) => setSelectedProvider(e.target.value)}
                              className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-white focus:border-white/30 focus:bg-white/[0.05] transition-all duration-200 outline-none"
                            >
                              {availableProviders.map((provider) => (
                                <option key={provider.value} value={provider.value} className="bg-black text-white">
                                  {provider.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-3">
                            <label htmlFor="api-key" className="text-sm font-medium text-white/90">API Key</label>
                            <div className="relative">
                              <input
                                id="api-key"
                                type={showApiKey ? 'text' : 'password'}
                                value={newApiKey}
                                onChange={(e) => setNewApiKey(e.target.value)}
                                placeholder="Enter your API key"
                                autoComplete="new-password"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck="false"
                                data-form-type="other"
                                name={`api-key-${Math.random().toString(36).substring(2)}`}
                                className="w-full px-4 py-3 pr-12 bg-white/[0.02] border border-white/10 rounded-xl text-white placeholder-white/40 focus:border-white/30 focus:bg-white/[0.05] transition-all duration-200 outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/50 hover:text-white/70 transition-colors"
                              >
                                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <label className="text-sm font-medium text-transparent">Action</label>
                            <button
                              onClick={handleStoreApiKey}
                              disabled={!newApiKey.trim() || isStoringKey}
                              className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-200 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {isStoringKey ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Plus className="w-4 h-4" />
                              )}
                              {isStoringKey ? 'Storing...' : 'Store Key'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Stored API Keys */}
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-white/90">Stored API Keys</h3>
                          <button
                            onClick={fetchStoredKeyProviders}
                            disabled={isLoadingKeyProviders}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-200 font-medium text-sm flex items-center gap-2 disabled:opacity-50"
                          >
                            {isLoadingKeyProviders ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                            Refresh
                          </button>
                        </div>

                        {keyProvidersError && (
                          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                            <div className="flex items-start gap-4">
                              <AlertCircle className="w-5 h-5 text-white/70 flex-shrink-0 mt-0.5" />
                              <div>
                                <h4 className="font-medium text-white/90">Error loading API keys</h4>
                                <p className="text-sm text-white/70 font-light mt-2">{keyProvidersError}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {storedKeyProviders.length === 0 ? (
                          <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                            <KeyRound className="w-12 h-12 text-white/40 mx-auto mb-4" />
                            <p className="text-sm text-white/70 font-light">No API keys stored yet</p>
                            <p className="text-xs text-white/50 font-light mt-2">Add your first API key above</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {storedKeyProviders.map((provider) => (
                              <div
                                key={provider}
                                className="flex items-center justify-between p-6 bg-white/[0.02] border border-white/10 rounded-xl"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                    <KeyRound className="w-5 h-5 text-white/70" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-white/90 capitalize">{provider}</p>
                                    <p className="text-sm text-white/70 font-light">API key stored securely</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => copyToClipboard(provider)}
                                    className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-200"
                                    title="Copy provider name"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteApiKey(provider)}
                                    disabled={isDeletingKey === provider}
                                    className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-200 disabled:opacity-50"
                                  >
                                    {isDeletingKey === provider ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <X className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Information */}
                      <div className="bg-white/[0.02] backdrop-blur-lg rounded-2xl border border-white/10 p-8">
                        <h3 className="font-medium text-white/90 mb-4">About API Key Storage</h3>
                        <div className="space-y-3 text-sm text-white/70 font-light">
                          <p>
                            • API keys are encrypted and stored securely on Orchestra's servers
                          </p>
                          <p>
                            • Keys are tied to your account and only accessible when you're signed in
                          </p>
                          <p>
                            • You can delete stored keys at any time from this interface
                          </p>
                          <p>
                            • Stored keys are automatically used in conversations when available
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
            </div>
          )}

              {activeTab === 'tool-approval' && (
                <div className="max-w-4xl mx-auto">
                  {/* Tool Approval Settings */}
                  <ToolApprovalSettings />
                </div>
              )}

              {/* Security Section */}
              {activeTab === 'security' && (
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-8">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none rounded-2xl" />
                    <div className="relative">
                      <h3 className="text-lg font-medium text-white/90 mb-4">Security Settings</h3>
                      <p className="text-white/70 font-light">Security and privacy controls will be available here.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Appearance Section */}
              {activeTab === 'appearance' && (
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-8">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none rounded-2xl" />
                    <div className="relative">
                      <h3 className="text-lg font-medium text-white/90 mb-4">Appearance Settings</h3>
                      <p className="text-white/70 font-light">Theme and display customization will be available here.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Section */}
              {activeTab === 'notifications' && (
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-8">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none rounded-2xl" />
                    <div className="relative">
                      <h3 className="text-lg font-medium text-white/90 mb-4">Notification Settings</h3>
                      <p className="text-white/70 font-light">Alert and notification preferences will be available here.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Performance Section */}
              {activeTab === 'performance' && (
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-8">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none rounded-2xl" />
                    <div className="relative">
                      <h3 className="text-lg font-medium text-white/90 mb-4">Performance Settings</h3>
                      <p className="text-white/70 font-light">Speed and optimization controls will be available here.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Integrations Section */}
              {activeTab === 'integrations' && (
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-8">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none rounded-2xl" />
                    <div className="relative">
                      <h3 className="text-lg font-medium text-white/90 mb-4">Integration Settings</h3>
                      <p className="text-white/70 font-light">External service connections will be available here.</p>
                      <p className="text-white/70 font-light">MCPs, ACA, bespoke tools. You name it.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleVaultSettings;