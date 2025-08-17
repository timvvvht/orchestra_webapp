import React, { useState, useEffect } from 'react';
import { AgentConfigBE, AvailableToolDefinitionBE, ToolDefinitionBE, ToolGroupBE } from '@/types/agent';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

interface EditAgentConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentConfigToEdit: AgentConfigBE | null;
  availableTools: AvailableToolDefinitionBE[];
  onSave: (updatedConfig: AgentConfigBE) => Promise<void>;
  isLoading?: boolean; // Optional: To show loading state on the modal itself if parent is fetching
}

const EditAgentConfigModal: React.FC<EditAgentConfigModalProps> = ({
  isOpen,
  onClose,
  agentConfigToEdit,
  availableTools,
  onSave,
  isLoading = false,
}) => {
  const [editableConfig, setEditableConfig] = useState<AgentConfigBE | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (agentConfigToEdit) {
      // Deep clone to prevent modifying the original object directly
      setEditableConfig(JSON.parse(JSON.stringify(agentConfigToEdit)));
    } else {
      setEditableConfig(null);
    }
  }, [agentConfigToEdit, isOpen]); // Reset/init when prop changes or modal opens

  const handleInputChange = (section: 'agent' | 'ai_config', field: string, value: any) => {
    if (!editableConfig) return;
    setEditableConfig(prevConfig => {
      if (!prevConfig) return null;
      return {
        ...prevConfig,
        [section]: {
          ...prevConfig[section],
          [field]: value,
        },
      };
    });
  };

  const handleSystemPromptChange = (value: string) => {
    if (!editableConfig) return;
    setEditableConfig(prevConfig => {
      if (!prevConfig) return null;
      return {
        ...prevConfig,
        agent: {
          ...prevConfig.agent,
          system_prompt: value,
        },
      };
    });
  };

  const isToolEnabled = (toolName: string): boolean => {
    if (!editableConfig) return false;
    return editableConfig.tool_groups.some(group => 
      group.tools.some(tool => tool.name === toolName)
    ) || false;
  };

  const handleToolToggle = (toolDefinition: AvailableToolDefinitionBE, isChecked: boolean) => {
    if (!editableConfig) return;

    let newToolGroups = JSON.parse(JSON.stringify(editableConfig.tool_groups)) as ToolGroupBE[];
    const defaultGroupName = "custom_enabled_tools";
    const defaultGroupType = "CUSTOM";

    if (isChecked) {
      // Enable tool: Add to the default group
      let defaultGroup = newToolGroups.find(g => g.name === defaultGroupName);
      if (!defaultGroup) {
        defaultGroup = { 
          name: defaultGroupName, 
          group_type: defaultGroupType, 
          tools: [], 
          init_args: {} 
        };
        newToolGroups.push(defaultGroup);
      }
      // Avoid adding duplicates
      if (!defaultGroup.tools.some(t => t.name === toolDefinition.name)) {
        defaultGroup.tools.push({
          name: toolDefinition.name,
          requires_human_approval_to_execute: toolDefinition.default_requires_human_approval ?? false,
        });
      }
    } else {
      // Disable tool: Remove from all groups
      newToolGroups = newToolGroups.map(group => ({
        ...group,
        tools: group.tools.filter(tool => tool.name !== toolDefinition.name),
      })).filter(group => group.tools.length > 0); // Optionally remove empty groups
    }

    setEditableConfig(prevConfig => {
        if (!prevConfig) return null;
        return { ...prevConfig, tool_groups: newToolGroups };
    });
  };

  const handleSave = async () => {
    if (!editableConfig) return;
    try {
      await onSave(editableConfig);
      toast({
        title: "Configuration Saved",
        description: `Agent ${editableConfig.agent.name} has been updated.`,
      });
      onClose(); // Close modal on successful save
    } catch (error) {
      console.error("Failed to save agent configuration:", error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
    }
  };

  if (isLoading || !editableConfig) {
    // Show a loading state or null if no config is provided (parent should handle this)
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Loading Configuration...</DialogTitle>
                </DialogHeader>
                <div className="p-6 text-center">Loading...</div>
            </DialogContent>
        </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Agent: {editableConfig.agent.name}</DialogTitle>
          <DialogDescription>
            Modify the agent's configuration below. Changes will be applied upon saving.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-grow pr-6 -mr-6">
          <div className="grid gap-6 py-4">
            {/* Agent Details */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Agent Details</h3>
              <div className="grid gap-2">
                <Label htmlFor="agentName">Name</Label>
                <Input 
                  id="agentName" 
                  value={editableConfig.agent.name} 
                  onChange={(e) => handleInputChange('agent', 'name', e.target.value)} 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="agentDescription">Description</Label>
                <Textarea 
                  id="agentDescription" 
                  value={editableConfig.agent.description} 
                  onChange={(e) => handleInputChange('agent', 'description', e.target.value)} 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="systemPrompt">System Prompt</Label>
                <Textarea 
                  id="systemPrompt" 
                  rows={6}
                  value={editableConfig.agent.system_prompt} 
                  onChange={(e) => handleSystemPromptChange(e.target.value)} 
                />
              </div>
            </div>

            {/* AI Configuration */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium">AI Configuration</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="modelId">Model ID</Label>
                  <Input 
                    id="modelId" 
                    value={editableConfig.ai_config.model_id} 
                    onChange={(e) => handleInputChange('ai_config', 'model_id', e.target.value)} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="providerName">Provider Name</Label>
                  <Input 
                    id="providerName" 
                    value={editableConfig.ai_config.provider_name} 
                    onChange={(e) => handleInputChange('ai_config', 'provider_name', e.target.value)} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="grid gap-2">
                    <Label htmlFor="temperature">Temperature</Label>
                    <Input 
                        id="temperature"
                        type="number"
                        min={0} max={2} step={0.1}
                        value={editableConfig.ai_config.temperature ?? ''} 
                        onChange={(e) => handleInputChange('ai_config', 'temperature', e.target.value === '' ? null : parseFloat(e.target.value))} 
                    />
                 </div>
                 <div className="grid gap-2">
                    <Label htmlFor="maxTokens">Max Tokens</Label>
                    <Input 
                        id="maxTokens" 
                        type="number"
                        min={1}
                        value={editableConfig.ai_config.max_tokens ?? ''} 
                        onChange={(e) => handleInputChange('ai_config', 'max_tokens', e.target.value === '' ? null : parseInt(e.target.value, 10))} 
                    />
                 </div>
              </div>
            </div>

            {/* Tool Capabilities */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Tool Capabilities</h3>
              <div className="space-y-3">
                {availableTools.length > 0 ? availableTools.map(tool => (
                  <div key={tool.name} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <Label htmlFor={`tool-${tool.name}`} className="font-medium">{tool.name}</Label>
                      <p className="text-sm text-muted-foreground">{tool.description}</p>
                    </div>
                    <Switch
                      id={`tool-${tool.name}`}
                      checked={isToolEnabled(tool.name)}
                      onCheckedChange={(checked) => handleToolToggle(tool, checked)}
                    />
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">No available tools to configure.</p>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={isLoading || !editableConfig}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditAgentConfigModal;
