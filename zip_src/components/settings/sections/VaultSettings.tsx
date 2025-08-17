
import React, { useEffect } from 'react';
import { Book, FolderPlus, RefreshCcw, Info, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSettingsStore } from '@/stores/settingsStore';
import { toast } from 'sonner';
import { open } from '@tauri-apps/plugin-dialog';

const VaultSettings = () => {
  // Get settings from the store
  const { 
    settings, 
    isLoading, 
    error, 
    setVaultSetting,
    initSettings 
  } = useSettingsStore();
  
  // Extract vault settings for easier access
  const { 
    path: vaultPath, 
    isConnected,
    autoSyncOnStartup,
    syncInterval 
  } = settings.vault;
  
  // Initialize settings on component mount
  useEffect(() => {
    initSettings();
  }, [initSettings]);
  
  // Handle settings update
  const handleVaultSettingChange = <K extends keyof typeof settings.vault>(
    key: K, 
    value: typeof settings.vault[K]
  ) => {
    setVaultSetting(key, value);
    toast.success(`${key} updated successfully`);
  };
  
  // Handle folder selection
  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Obsidian Vault Folder'
      });
      
      if (selected && !Array.isArray(selected)) {
        handleVaultSettingChange('path', selected);
      }
    } catch (error) {
      toast.error(`Failed to select folder: ${error}`);
    }
  };
  
  // Handle connect/disconnect
  const handleConnect = () => {
    // Would connect to the Obsidian vault
    handleVaultSettingChange('isConnected', true);
    toast.success('Connected to vault successfully');
  };

  const handleDisconnect = () => {
    // Would disconnect from the Obsidian vault
    handleVaultSettingChange('isConnected', false);
    toast.success('Disconnected from vault');
  };
  
  // Handle sync
  const handleSync = () => {
    // Would sync the vault
    toast.success('Vault sync started');
    // Simulate sync completion
    setTimeout(() => {
      toast.success('Vault sync completed');
    }, 2000);
  };
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading vault settings...</span>
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className="p-4 border border-red-500/20 bg-red-500/10 rounded-md">
        <h3 className="text-lg font-medium text-red-500 mb-2">Error loading settings</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
        <button 
          className="mt-4 px-4 py-2 bg-primary rounded-md text-sm font-medium text-primary-foreground"
          onClick={() => initSettings()}
        >
          Retry
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">Obsidian Vault</h2>
        <p className="text-muted-foreground">Connect to your Obsidian vault to access your notes and knowledge base.</p>
      </div>

      <Card className="border border-border bg-surface-1">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Book className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground">Vault Connection</h3>
                <p className="text-sm text-muted-foreground">
                  {isConnected ? 'Your vault is connected and syncing' : 'Connect to your Obsidian vault'}
                </p>
              </div>
              <div className="ml-auto">
                {isConnected ? (
                  <div className="flex items-center">
                    <span className="mr-2 h-2 w-2 rounded-full bg-green-500"></span>
                    <span className="text-sm text-green-500">Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <span className="mr-2 h-2 w-2 rounded-full bg-amber-500"></span>
                    <span className="text-sm text-amber-500">Disconnected</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="vault-path" className="block text-sm font-medium text-foreground">
                  Vault Path
                </label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="inline-flex text-muted-foreground hover:text-foreground">
                        <Info className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>This is the location of your Obsidian vault on your computer.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex gap-2">
                <Input
                  id="vault-path"
                  value={vaultPath}
                  onChange={(e) => handleVaultSettingChange('path', e.target.value)}
                  className="flex-1 bg-surface-0 border-border focus:border-primary"
                />
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="border-border bg-surface-0 hover:bg-surface-2"
                  onClick={handleSelectFolder}
                >
                  <FolderPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              {isConnected ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleDisconnect}
                    className="border-border hover:bg-surface-2 text-muted-foreground"
                  >
                    Disconnect
                  </Button>
                  <Button
                    onClick={handleSync} 
                    className="bg-primary hover:bg-primary-hover text-primary-foreground"
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Sync Now
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleConnect}
                  className="ml-auto bg-primary hover:bg-primary-hover text-primary-foreground"
                >
                  Connect Vault
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border bg-surface-1">
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium text-foreground mb-4">Sync Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-foreground">Auto-sync on startup</h4>
                <p className="text-xs text-muted-foreground">Automatically sync your vault when the app starts</p>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Switch 
                      checked={autoSyncOnStartup} 
                      onCheckedChange={(checked) => handleVaultSettingChange('autoSyncOnStartup', checked)} 
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Toggle auto-sync on startup</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-foreground">Sync interval</h4>
                <p className="text-xs text-muted-foreground">How often to sync your vault</p>
              </div>
              <Select 
                value={syncInterval} 
                onValueChange={(value) => handleVaultSettingChange('syncInterval', value)}
              >
                <SelectTrigger className="w-[180px] bg-surface-0 border-border">
                  <SelectValue placeholder="Select interval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Every 5 minutes">Every 5 minutes</SelectItem>
                  <SelectItem value="Every 15 minutes">Every 15 minutes</SelectItem>
                  <SelectItem value="Every 30 minutes">Every 30 minutes</SelectItem>
                  <SelectItem value="Every hour">Every hour</SelectItem>
                  <SelectItem value="Manual only">Manual only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VaultSettings;
