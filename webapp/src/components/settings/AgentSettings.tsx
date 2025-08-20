import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/Label';
import { AgentSelectorButton } from '@/components/chat-interface/AgentSelectorButton';
import { useAgentConfigStore } from '@/stores/agentConfigStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type { AgentConfigTS } from '@/types/agentConfig';

/**
 * AgentSettings - Settings component for managing agent configurations
 * 
 * Features:
 * - Select default agent configuration
 * - View current agent settings
 * - Manage agent preferences
 */
export function AgentSettings() {
  const { agentConfigs } = useAgentConfigStore();
  const { settings, updateSettings } = useSettingsStore();

  // Get current default agent
  const defaultAgentId = settings.defaultAgentId || 'fac79f2c-b312-4ea9-a88a-751ae2be9169';
  const defaultAgent = agentConfigs[defaultAgentId];

  // Handle default agent change
  const handleDefaultAgentChange = async (agentConfig: AgentConfigTS) => {
    try {
      await updateSettings({ defaultAgentId: agentConfig.id });
      console.log('Default agent updated to:', agentConfig.agent.name);
    } catch (error) {
      console.error('Failed to update default agent:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Default Agent Configuration</CardTitle>
          <CardDescription>
            Choose which AI assistant to use by default when starting new conversations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="default-agent">Default Agent</Label>
            <AgentSelectorButton
              currentAgentId={defaultAgentId}
              onAgentSelect={handleDefaultAgentChange}
              variant="default"
              className="w-full"
            />
          </div>
          
          {defaultAgent && (
            <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
              <h4 className="font-medium mb-2">Current Default Agent</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium">Name:</span> {defaultAgent.agent.name}
                </div>
                <div>
                  <span className="font-medium">Description:</span> {defaultAgent.agent.description}
                </div>
                <div>
                  <span className="font-medium">Model:</span> {defaultAgent.ai_config.model_id}
                </div>
                <div>
                  <span className="font-medium">Provider:</span> {defaultAgent.ai_config.provider_name}
                </div>
                {defaultAgent.tool_groups && defaultAgent.tool_groups.length > 0 && (
                  <div>
                    <span className="font-medium">Tool Groups:</span>{' '}
                    {defaultAgent.tool_groups.map(tg => tg.name).join(', ')}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agent Preferences</CardTitle>
          <CardDescription>
            Configure how agents behave in your conversations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>Additional agent preferences will be available in future updates.</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Custom system prompts</li>
              <li>Temperature and response settings</li>
              <li>Tool execution preferences</li>
              <li>Context window management</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AgentSettings;