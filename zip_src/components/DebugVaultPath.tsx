import React, { useEffect, useState } from 'react';
import { getAllStoredPreferences, getPreference } from '@/api/settingsApi';
import { getVaultPath } from '@/api/vaultApi';
import { useSettingsStore } from '@/stores/settingsStore';

export const DebugVaultPath: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const vaultPathFromStore = useSettingsStore((state) => state.settings.vault.path);
  
  useEffect(() => {
    const fetchDebugInfo = async () => {
      try {
        // Get all preferences from Tauri
        const allPrefs = await getAllStoredPreferences();
        
        // Get vault.path directly
        const vaultPathDirect = await getPreference('vault.path', '');
        
        // Get vault object
        const vaultObject = await getPreference('vault', {});
        
        // Get vault path from vault API
        const vaultPathFromApi = await getVaultPath();
        
        setDebugInfo({
          allPreferences: allPrefs,
          vaultPathDirect,
          vaultObject,
          vaultPathFromApi,
          vaultPathFromStore,
          vaultKeys: Object.keys(allPrefs).filter(k => k.includes('vault'))
        });
      } catch (error) {
        console.error('Debug error:', error);
      }
    };
    
    fetchDebugInfo();
  }, [vaultPathFromStore]);
  
  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <h3 className="text-lg font-bold mb-2">Vault Path Debug Info</h3>
      <pre className="text-xs overflow-auto">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  );
};