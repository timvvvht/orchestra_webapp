import React, { useState, useEffect } from 'react';
import { Bell, RefreshCw, Smartphone, Mail, MessageSquare, Loader2, AlertCircle, BellOff, Clock, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettingsStore } from '@/stores/settingsStore';
import { toast } from 'sonner';

// Define allowed sound values
type SoundOption = "default" | "gentle" | "none";

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  channels: {
    inApp: boolean;
    email: boolean;
    mobile: boolean;
  };
}

const NotificationSettings = () => {
  // Get settings from the store
  const { 
    settings, 
    isLoading, 
    error, 
    setNotificationSetting,
    initSettings 
  } = useSettingsStore();
  
  // Extract notification settings for easier access
  const { 
    enabled, 
    channels
  } = settings.notifications || { enabled: {}, channels: {} };
  
  // Local state for email preferences
  const [emailPreferences, setEmailPreferences] = useState({
    weeklySummary: settings.notifications?.emailPreferences?.weeklySummary ?? true,
    productUpdates: settings.notifications?.emailPreferences?.productUpdates ?? true,
    marketing: settings.notifications?.emailPreferences?.marketing ?? false
  });
  
  // Local state for delivery preferences
  const [deliveryPreferences, setDeliveryPreferences] = useState({
    batching: settings.notifications?.deliveryPreferences?.batching ?? true,
    doNotDisturb: settings.notifications?.deliveryPreferences?.doNotDisturb ?? false,
    sound: (settings.notifications?.deliveryPreferences?.sound as SoundOption) ?? "default"
  });
  
  // Update local state when settings change
  useEffect(() => {
    if (settings.notifications?.emailPreferences) {
      setEmailPreferences({
        weeklySummary: settings.notifications.emailPreferences.weeklySummary ?? true,
        productUpdates: settings.notifications.emailPreferences.productUpdates ?? true,
        marketing: settings.notifications.emailPreferences.marketing ?? false
      });
    }
    
    if (settings.notifications?.deliveryPreferences) {
      setDeliveryPreferences({
        batching: settings.notifications.deliveryPreferences.batching ?? true,
        doNotDisturb: settings.notifications.deliveryPreferences.doNotDisturb ?? false,
        sound: (settings.notifications.deliveryPreferences.sound as SoundOption) ?? "default"
      });
    }
  }, [settings.notifications]);
  
  // Toggle handlers for email preferences
  const toggleEmailPreference = (key: keyof typeof emailPreferences) => {
    const newValue = !emailPreferences[key];
    setEmailPreferences({ ...emailPreferences, [key]: newValue });
    
    // Update the store
    setNotificationSetting(['emailPreferences', key], newValue)
      .then(() => {
        toast.success(`Email preference updated`);
      })
      .catch(() => {
        // Revert local state on error
        setEmailPreferences({ ...emailPreferences, [key]: !newValue });
        toast.error(`Failed to update email preference`);
      });
  };
  
  // Toggle handlers for delivery preferences
  const toggleDeliveryPreference = (key: keyof typeof deliveryPreferences) => {
    if (typeof deliveryPreferences[key] === 'boolean') {
      const newValue = !deliveryPreferences[key];
      setDeliveryPreferences({ ...deliveryPreferences, [key]: newValue });
      
      // Update the store
      setNotificationSetting(['deliveryPreferences', key], newValue)
        .then(() => {
          toast.success(`Delivery preference updated`);
        })
        .catch(() => {
          // Revert local state on error
          setDeliveryPreferences({ ...deliveryPreferences, [key]: !newValue });
          toast.error(`Failed to update delivery preference`);
        });
    }
  };
  
  // Update sound preference
  const updateSoundPreference = (value: SoundOption) => {
    setDeliveryPreferences({ ...deliveryPreferences, sound: value });
    
    // Update the store
    setNotificationSetting(['deliveryPreferences', 'sound'], value)
      .then(() => {
        toast.success(`Sound preference updated`);
      })
      .catch(() => {
        // Revert local state on error
        setDeliveryPreferences({ ...deliveryPreferences, sound: deliveryPreferences.sound });
        toast.error(`Failed to update sound preference`);
      });
  };
  
  // Local UI state
  const [openItems, setOpenItems] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("notifications");
  
  // Initialize settings on component mount
  useEffect(() => {
    initSettings();
  }, [initSettings]);
  
  // Convert the settings data structure to the UI data structure
  const notificationSettings: NotificationSetting[] = [
    {
      id: 'mission_complete',
      label: 'Mission Complete',
      description: 'Get notified when a mission is completed',
      enabled: enabled.mission_complete,
      channels: channels.mission_complete
    },
    {
      id: 'agent_approval',
      label: 'Agent Approval Required',
      description: 'Get notified when an agent requires your approval',
      enabled: enabled.agent_approval,
      channels: channels.agent_approval
    },
    {
      id: 'system_update',
      label: 'System Updates',
      description: 'Get notified about system updates and new features',
      enabled: enabled.system_update,
      channels: channels.system_update
    },
    {
      id: 'api_limit',
      label: 'API Usage Limits',
      description: 'Get notified when you approach API usage limits',
      enabled: enabled.api_limit,
      channels: channels.api_limit
    }
  ];

  // Loading and error states are now handled inline with the component
  // rather than replacing the entire component
  
  // Handle settings update
  const toggleSetting = (id: string) => {
    // Create a copy of the current enabled state
    const newEnabled = { ...enabled };
    const newValue = !enabled[id];
    newEnabled[id] = newValue;
    
    // Update the store with optimistic UI update
    setNotificationSetting('enabled', newEnabled)
      .then(() => {
        toast.success(`${id} notification ${newValue ? 'enabled' : 'disabled'}`);
      })
      .catch((error) => {
        // Revert on error
        toast.error(`Failed to update notification setting: ${error}`);
      });
  };

  const toggleChannel = (id: string, channel: keyof NotificationSetting['channels']) => {
    // Create a copy of the current channels state
    const newChannels = { ...channels };
    const newValue = !newChannels[id][channel];
    newChannels[id] = { 
      ...newChannels[id], 
      [channel]: newValue 
    };
    
    // Update the store with optimistic UI update
    setNotificationSetting('channels', newChannels)
      .then(() => {
        toast.success(`${channel} notifications for ${id} ${newValue ? 'enabled' : 'disabled'}`);
      })
      .catch((error) => {
        // Revert on error
        toast.error(`Failed to update channel setting: ${error}`);
      });
  };

  const toggleCollapsible = (id: string) => {
    setOpenItems(prev => prev.includes(id) 
      ? prev.filter(item => item !== id) 
      : [...prev, id]
    );
  };
  
  const handleResetDefaults = () => {
    // Default values for notification settings
    const defaultEnabled = {
      mission_complete: true,
      agent_approval: true,
      system_update: false,
      api_limit: true,
    };
    
    const defaultChannels = {
      mission_complete: { inApp: true, email: true, mobile: true },
      agent_approval: { inApp: true, email: false, mobile: true },
      system_update: { inApp: true, email: false, mobile: false },
      api_limit: { inApp: true, email: true, mobile: false },
    };
    
    const defaultEmailPreferences = {
      weeklySummary: true,
      productUpdates: true,
      marketing: false,
    };
    
    const defaultDeliveryPreferences = {
      batching: true,
      doNotDisturb: false,
      sound: 'default' as SoundOption,
    };
    
    // Reset all notification settings to defaults
    Promise.all([
      setNotificationSetting('enabled', defaultEnabled),
      setNotificationSetting('channels', defaultChannels),
      setNotificationSetting('emailPreferences', defaultEmailPreferences),
      setNotificationSetting('deliveryPreferences', defaultDeliveryPreferences),
    ])
      .then(() => {
        // Update local state
        setEmailPreferences(defaultEmailPreferences);
        setDeliveryPreferences(defaultDeliveryPreferences as any); // Type assertion to avoid TypeScript error
        toast.success('Notification preferences reset to defaults');
      })
      .catch((error) => {
        toast.error(`Failed to reset preferences: ${error}`);
      });
  };

  // Loading indicator component
  const LoadingIndicator = () => (
    <div className="flex items-center justify-center p-2 bg-surface-1 rounded-md border border-border">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      <span className="ml-2 text-xs text-muted-foreground">Saving settings...</span>
    </div>
  );

  // Error indicator component
  const ErrorIndicator = ({ message }: { message: string }) => (
    <div className="flex items-center p-2 bg-red-500/10 rounded-md border border-red-500/20">
      <AlertCircle className="h-4 w-4 text-red-500" />
      <span className="ml-2 text-xs text-red-500">{message}</span>
    </div>
  );
  
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">Notifications</h2>
        <p className="text-muted-foreground">Manage how and when you receive alerts and notifications.</p>
      </div>
      
      {isLoading && <LoadingIndicator />}
      {error && <ErrorIndicator message={error} />}

      <Card className="border border-border bg-surface-1">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-medium text-foreground">Notification Preferences</h3>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="text-xs gap-1 border-border hover:bg-surface-2"
              onClick={handleResetDefaults}
            >
              <RefreshCw className="h-3 w-3" />
              Reset Defaults
            </Button>
          </div>

          <div className="space-y-4 divide-y divide-border">
            {notificationSettings.map((setting) => (
              <Collapsible
                key={setting.id}
                open={openItems.includes(setting.id)}
                onOpenChange={() => toggleCollapsible(setting.id)}
                className="pt-4 first:pt-0"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-medium text-foreground">{setting.label}</h4>
                    <p className="text-xs text-muted-foreground">{setting.description}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Switch
                      checked={setting.enabled}
                      onCheckedChange={() => toggleSetting(setting.id)}
                    />
                    {setting.enabled && (
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 text-xs">
                          Channels
                        </Button>
                      </CollapsibleTrigger>
                    )}
                  </div>
                </div>
                
                <CollapsibleContent className="mt-4">
                  <div className="bg-surface-0 rounded-md p-4 space-y-3 border border-border">
                    <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Notification Channels
                    </h5>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">In-app</span>
                        </div>
                        <Switch
                          checked={setting.channels.inApp}
                          onCheckedChange={() => toggleChannel(setting.id, 'inApp')}
                          disabled={!setting.enabled}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">Email</span>
                        </div>
                        <Switch
                          checked={setting.channels.email}
                          onCheckedChange={() => toggleChannel(setting.id, 'email')}
                          disabled={!setting.enabled}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">Mobile</span>
                        </div>
                        <Switch
                          checked={setting.channels.mobile}
                          onCheckedChange={() => toggleChannel(setting.id, 'mobile')}
                          disabled={!setting.enabled}
                        />
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border bg-surface-1">
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium text-foreground mb-4">Email Preferences</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-foreground">Weekly Summary</h4>
                <p className="text-xs text-muted-foreground">Receive a weekly summary of your activity</p>
              </div>
              <Switch 
                checked={emailPreferences.weeklySummary} 
                onCheckedChange={() => toggleEmailPreference('weeklySummary')} 
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-foreground">Product Updates</h4>
                <p className="text-xs text-muted-foreground">Receive emails about new features and updates</p>
              </div>
              <Switch 
                checked={emailPreferences.productUpdates} 
                onCheckedChange={() => toggleEmailPreference('productUpdates')} 
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-foreground">Marketing</h4>
                <p className="text-xs text-muted-foreground">Receive marketing and promotional emails</p>
              </div>
              <Switch 
                checked={emailPreferences.marketing} 
                onCheckedChange={() => toggleEmailPreference('marketing')} 
              />
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-border">
            <Button variant="outline" className="w-full border-border hover:bg-surface-2">
              Unsubscribe from all emails
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border bg-surface-1">
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium text-foreground mb-4">Delivery Preferences</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-foreground">Notification Batching</h4>
                <p className="text-xs text-muted-foreground">Group multiple notifications together</p>
              </div>
              <Switch 
                checked={deliveryPreferences.batching} 
                onCheckedChange={() => toggleDeliveryPreference('batching')} 
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-foreground">Do Not Disturb</h4>
                <p className="text-xs text-muted-foreground">Pause all notifications during specific hours</p>
              </div>
              <Switch 
                checked={deliveryPreferences.doNotDisturb} 
                onCheckedChange={() => toggleDeliveryPreference('doNotDisturb')} 
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-foreground">Sound</h4>
                <p className="text-xs text-muted-foreground">Play a sound when receiving notifications</p>
              </div>
              <div className="flex items-center gap-2">
                <select 
                  className="bg-surface-0 border border-border rounded-md text-xs px-2 py-1 text-foreground"
                  value={deliveryPreferences.sound}
                  onChange={(e) => updateSoundPreference(e.target.value as SoundOption)}
                >
                  <option value="default">Default</option>
                  <option value="gentle">Gentle</option>
                  <option value="none">None</option>
                </select>
                <Switch 
                  checked={deliveryPreferences.sound !== "none"} 
                  onCheckedChange={(checked) => updateSoundPreference(checked ? "default" : "none")} 
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationSettings;
