/**
 * Approval Demo Component
 * 
 * Demo component for testing the approval system functionality.
 * Allows triggering test approvals and viewing the approval flow.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ApprovalPanel } from './ApprovalPanel';
import { useApprovals } from '@/hooks/useApprovals';
import { getApprovalAPI } from '@/services/approval';

interface ApprovalDemoProps {
  sessionId: string;
}

export const ApprovalDemo: React.FC<ApprovalDemoProps> = ({ sessionId }) => {
  const [toolName, setToolName] = useState('str_replace_editor');
  const [toolInput, setToolInput] = useState('{"file": "test.txt", "command": "create"}');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    pendingApprovals,
    isLoading,
    error,
    config,
    refresh,
    updateConfig,
    requiresApproval,
    getPendingCount,
    hasPendingApprovals
  } = useApprovals({ sessionId });

  const approvalAPI = getApprovalAPI();

  // Simulate a tool execution request
  const handleSimulateRequest = async () => {
    setIsSubmitting(true);
    
    try {
      const toolUseId = `demo-${Date.now()}`;
      const jobId = `job-${Date.now()}`;
      
      let parsedInput;
      try {
        parsedInput = JSON.parse(toolInput);
      } catch {
        parsedInput = { raw: toolInput };
      }

      // Create invocation first
      approvalAPI.getService().createInvocation({
        tool_use_id: toolUseId,
        session_id: sessionId,
        tool_name: toolName,
        tool_input: parsedInput
      });

      // Request approval
      await approvalAPI.requestApproval({
        tool_use_id: toolUseId,
        job_id: jobId,
        tool_name: toolName,
        tool_input: parsedInput,
        session_id: sessionId
      });

      console.log(`[ApprovalDemo] Simulated approval request for ${toolName}`);
    } catch (err) {
      console.error('[ApprovalDemo] Error simulating request:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle approval system
  const handleToggleApproval = async (enabled: boolean) => {
    if (config) {
      await updateConfig({ approval_enabled: enabled });
    }
  };

  // Add/remove tool from approval list
  const handleToggleToolApproval = async (tool: string, required: boolean) => {
    if (!config) return;

    const newTools = required
      ? [...config.required_approval_tools, tool]
      : config.required_approval_tools.filter(t => t !== tool);

    await updateConfig({ required_approval_tools: newTools });
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Approval System Demo</CardTitle>
          <CardDescription>
            Test the tool approval system by simulating tool execution requests.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* System Status */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Label>Approval System Status</Label>
              <div className="flex items-center gap-2">
                <Badge variant={config?.approval_enabled ? "default" : "secondary"}>
                  {config?.approval_enabled ? "Enabled" : "Disabled"}
                </Badge>
                <Badge variant="outline">
                  {getPendingCount()} Pending
                </Badge>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={config?.approval_enabled || false}
                onCheckedChange={handleToggleApproval}
              />
              <Label>Enable Approvals</Label>
            </div>
          </div>

          {/* Tool Simulation */}
          <div className="space-y-3">
            <Label>Simulate Tool Request</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="tool-name">Tool Name</Label>
                <Input
                  id="tool-name"
                  value={toolName}
                  onChange={(e) => setToolName(e.target.value)}
                  placeholder="str_replace_editor"
                />
              </div>
              <div>
                <Label>Requires Approval</Label>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant={requiresApproval(toolName) ? "destructive" : "secondary"}>
                    {requiresApproval(toolName) ? "Yes" : "No"}
                  </Badge>
                  <Switch
                    checked={requiresApproval(toolName)}
                    onCheckedChange={(checked) => handleToggleToolApproval(toolName, checked)}
                  />
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="tool-input">Tool Input (JSON)</Label>
              <Textarea
                id="tool-input"
                value={toolInput}
                onChange={(e) => setToolInput(e.target.value)}
                placeholder='{"file": "test.txt", "command": "create"}'
                rows={3}
              />
            </div>
            <Button
              onClick={handleSimulateRequest}
              disabled={isSubmitting || !config?.approval_enabled}
              className="w-full"
            >
              {isSubmitting ? "Simulating..." : "Simulate Tool Request"}
            </Button>
          </div>

          {/* Configuration */}
          <div className="space-y-2">
            <Label>Current Configuration</Label>
            <div className="bg-muted p-3 rounded-md text-sm">
              <pre>{JSON.stringify(config, null, 2)}</pre>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={refresh} disabled={isLoading}>
              {isLoading ? "Refreshing..." : "Refresh"}
            </Button>
            <Button
              variant="outline"
              onClick={() => approvalAPI.getService().cleanup()}
            >
              Cleanup
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Panel */}
      {hasPendingApprovals() && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Pending Approvals</h3>
          <ApprovalPanel sessionId={sessionId} />
        </div>
      )}

      {/* Pending Approvals List */}
      {pendingApprovals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Debug: Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingApprovals.map((approval) => (
                <div key={approval.tool_use_id} className="bg-muted p-2 rounded text-sm">
                  <div><strong>ID:</strong> {approval.tool_use_id}</div>
                  <div><strong>Tool:</strong> {approval.tool_name}</div>
                  <div><strong>Created:</strong> {approval.created_at.toLocaleString()}</div>
                  <div><strong>Expires:</strong> {approval.timeout_at.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};