import React, { useState, useEffect } from 'react';
import { Bug, RefreshCw, Download, Copy, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSettingsStore } from '@/stores/settingsStore';
import { toast } from 'sonner';
import { invoke } from '@tauri-apps/api/core';

const DebugSettings = () => {
  const { settings, isLoading, error, initSettings, resetSettings } = useSettingsStore();
  const [activeTab, setActiveTab] = useState('current');
  const [rawPreferences, setRawPreferences] = useState<Record<string, any>>({});
  const [isLoadingRaw, setIsLoadingRaw] = useState(false);
  
  // Function to load raw preferences from the backend
  const loadRawPreferences = async () => {
    setIsLoadingRaw(true);
    try {
      const rawDataStr = await invoke<string>('get_all_prefs');
      // Parse the JSON string into an object
      const rawData = JSON.parse(rawDataStr);
      setRawPreferences(rawData as Record<string, any>);
    } catch (error) {
      console.error('Failed to load raw preferences:', error);
      toast.error('Failed to load raw preferences');
      setRawPreferences({});
    } finally {
      setIsLoadingRaw(false);
    }
  };
  
  // Load raw preferences on component mount
  useEffect(() => {
    loadRawPreferences();
  }, []);
  
  // Function to refresh settings
  const handleRefresh = async () => {
    await initSettings();
    await loadRawPreferences();
    toast.success('Settings refreshed');
  };
  
  // Function to reset all settings
  const handleResetAll = async () => {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      await resetSettings();
      await loadRawPreferences();
      toast.success('All settings reset to defaults');
    }
  };
  
  // Function to export settings as JSON
  const handleExport = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const exportFileDefaultName = `orchestra-settings-${new Date().toISOString().slice(0, 10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success('Settings exported');
  };
  
  // Function to copy settings to clipboard
  const handleCopy = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast.success('Copied to clipboard');
  };
  
  // Format JSON for display
  const formatJson = (data: any) => {
    return JSON.stringify(data, null, 2);
  };
  
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">Debug Settings</h2>
        <p className="text-muted-foreground">View and manage all settings data for debugging purposes.</p>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bug className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-medium text-foreground">Settings Inspector</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="text-xs gap-1 border-border hover:bg-surface-2"
            onClick={handleRefresh}
            disabled={isLoading || isLoadingRaw}
          >
            <RefreshCw className={`h-3 w-3 ${isLoading || isLoadingRaw ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button 
            size="sm" 
            variant="outline" 
            className="text-xs gap-1 border-border hover:bg-surface-2"
            onClick={handleExport}
          >
            <Download className="h-3 w-3" />
            Export
          </Button>
          
          <Button 
            size="sm" 
            variant="destructive" 
            className="text-xs gap-1"
            onClick={handleResetAll}
          >
            <Trash2 className="h-3 w-3" />
            Reset All
          </Button>
        </div>
      </div>
      
      <Card className="border border-border bg-surface-1">
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="current">Current Settings</TabsTrigger>
              <TabsTrigger value="raw">Raw Storage</TabsTrigger>
            </TabsList>
            
            <TabsContent value="current" className="space-y-4">
              <div className="flex justify-end">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs gap-1 border-border hover:bg-surface-2"
                  onClick={() => handleCopy(settings)}
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </Button>
              </div>
              
              <div className="bg-surface-2 p-4 rounded-md overflow-auto max-h-[600px]">
                <pre className="text-xs text-muted-foreground font-mono whitespace-pre">
                  {formatJson(settings)}
                </pre>
              </div>
              
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-md">
                  <h4 className="text-sm font-medium text-red-500 mb-1">Error</h4>
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="raw" className="space-y-4">
              <div className="flex justify-end">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs gap-1 border-border hover:bg-surface-2"
                  onClick={() => handleCopy(rawPreferences)}
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </Button>
              </div>
              
              <div className="bg-surface-2 p-4 rounded-md overflow-auto max-h-[600px]">
                {isLoadingRaw ? (
                  <div className="flex items-center justify-center p-4">
                    <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                    <span className="ml-2 text-xs text-muted-foreground">Loading raw preferences...</span>
                  </div>
                ) : (
                  <pre className="text-xs text-muted-foreground font-mono whitespace-pre">
                    {formatJson(rawPreferences)}
                  </pre>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default DebugSettings;