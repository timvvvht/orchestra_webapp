import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { isOnboardingCompleted, setOnboardingCompleted } from '@/utils/userPreferences';
import { getAllStoredPreferences } from '@/api/settingsApi';
import { toast } from 'sonner';

const DebugPage: React.FC = () => {
  const [localStorageItems, setLocalStorageItems] = useState<{ key: string; value: string }[]>([]);
  const [onboardingStatus, setOnboardingStatus] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ key: string; value: string } | null>(null);
  const [editedValue, setEditedValue] = useState('');
  const [tauriStoreData, setTauriStoreData] = useState<Record<string, any>>({});
  const [tauriStoreLoading, setTauriStoreLoading] = useState(false);

  // Load localStorage items, onboarding status, and Tauri store data
  useEffect(() => {
    refreshLocalStorageItems();
    setOnboardingStatus(isOnboardingCompleted());
    refreshTauriStoreData();
  }, []);

  const refreshLocalStorageItems = () => {
    const items: { key: string; value: string }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || '';
        items.push({ key, value });
      }
    }
    setLocalStorageItems(items);
  };

  const refreshTauriStoreData = async () => {
    setTauriStoreLoading(true);
    try {
      const data = await getAllStoredPreferences();
      setTauriStoreData(data);
    } catch (error) {
      console.error('Error refreshing Tauri store data:', error);
      toast.error('Failed to load Tauri store data');
    } finally {
      setTauriStoreLoading(false);
    }
  };

  const handleToggleOnboarding = () => {
    if (onboardingStatus) {
      // If onboarding is completed, reset it
      localStorage.removeItem('onboardingCompleted');
      toast.success('Onboarding Reset', {
        description: 'Onboarding will be shown on next app start',
      });
    } else {
      // If onboarding is not completed, mark it as completed
      setOnboardingCompleted();
      toast.success('Onboarding Completed', {
        description: 'Onboarding will not be shown on next app start',
      });
    }
    setOnboardingStatus(!onboardingStatus);
    refreshLocalStorageItems();
  };

  const handleClearLocalStorage = () => {
    if (confirm('Are you sure you want to clear all localStorage items? This will reset all app preferences.')) {
      localStorage.clear();
      toast.success('localStorage Cleared', {
        description: 'All app preferences have been reset',
      });
      refreshLocalStorageItems();
      setOnboardingStatus(false);
    }
  };

  const handleItemClick = (item: { key: string; value: string }) => {
    setSelectedItem(item);
    setEditedValue(item.value);
  };

  const handleSaveItem = () => {
    if (selectedItem) {
      localStorage.setItem(selectedItem.key, editedValue);
      toast.success('Item Updated', {
        description: `${selectedItem.key} has been updated`,
      });
      refreshLocalStorageItems();
      setSelectedItem(null);
    }
  };

  const handleDeleteItem = () => {
    if (selectedItem && confirm(`Are you sure you want to delete ${selectedItem.key}?`)) {
      localStorage.removeItem(selectedItem.key);
      toast.success('Item Deleted', {
        description: `${selectedItem.key} has been removed from localStorage`,
      });
      refreshLocalStorageItems();
      setSelectedItem(null);
      
      // Update onboarding status if we deleted that item
      if (selectedItem.key === 'onboardingCompleted') {
        setOnboardingStatus(false);
      }
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Debug Tools</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Onboarding Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Onboarding Controls</CardTitle>
            <CardDescription>
              Toggle onboarding flow visibility for testing purposes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Switch 
                id="onboarding-toggle" 
                checked={onboardingStatus} 
                onCheckedChange={handleToggleOnboarding}
              />
              <Label htmlFor="onboarding-toggle">
                Onboarding is {onboardingStatus ? 'completed' : 'not completed'}
              </Label>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {onboardingStatus 
                ? 'Onboarding will not be shown on next app start' 
                : 'Onboarding will be shown on next app start'}
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              variant="destructive" 
              onClick={handleClearLocalStorage}
            >
              Clear All localStorage
            </Button>
          </CardFooter>
        </Card>

        {/* localStorage Inspector */}
        <Card>
          <CardHeader>
            <CardTitle>localStorage Inspector</CardTitle>
            <CardDescription>
              View and edit localStorage items
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="list">
              <TabsList className="w-full">
                <TabsTrigger value="list" className="flex-1">List View</TabsTrigger>
                <TabsTrigger value="json" className="flex-1">JSON View</TabsTrigger>
              </TabsList>
              
              <TabsContent value="list" className="p-4 max-h-[400px] overflow-auto">
                {localStorageItems.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No items in localStorage</p>
                ) : (
                  <ul className="space-y-2">
                    {localStorageItems.map((item) => (
                      <li 
                        key={item.key} 
                        className={`p-2 rounded cursor-pointer hover:bg-muted ${selectedItem?.key === item.key ? 'bg-muted' : ''}`}
                        onClick={() => handleItemClick(item)}
                      >
                        <div className="font-medium">{item.key}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {item.value.length > 50 ? `${item.value.substring(0, 50)}...` : item.value}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
              
              <TabsContent value="json" className="p-4">
                <pre className="text-xs bg-muted p-4 rounded-md overflow-auto max-h-[400px]">
                  {JSON.stringify(Object.fromEntries(localStorageItems.map(item => [item.key, item.value])), null, 2)}
                </pre>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Tauri Plugin Store Inspector */}
        <Card>
          <CardHeader>
            <CardTitle>Tauri Plugin Store</CardTitle>
            <CardDescription>
              View data stored in the Tauri plugin store (settings.json)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button 
                onClick={refreshTauriStoreData} 
                disabled={tauriStoreLoading}
                size="sm"
              >
                {tauriStoreLoading ? 'Refreshing...' : 'Refresh Store Data'}
              </Button>
              
              <div className="max-h-[400px] overflow-auto">
                {Object.keys(tauriStoreData).length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    {tauriStoreLoading ? 'Loading...' : 'No data in Tauri store'}
                  </p>
                ) : (
                  <pre className="text-xs bg-muted p-4 rounded-md">
                    {JSON.stringify(tauriStoreData, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Item Editor */}
      {selectedItem && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Edit Item: {selectedItem.key}</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea 
              value={editedValue} 
              onChange={(e) => setEditedValue(e.target.value)} 
              rows={5}
              className="font-mono text-sm"
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="destructive" onClick={handleDeleteItem}>
              Delete Item
            </Button>
            <div className="space-x-2">
              <Button variant="outline" onClick={() => setSelectedItem(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveItem}>
                Save Changes
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default DebugPage;