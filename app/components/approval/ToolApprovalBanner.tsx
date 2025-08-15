/**
 * Tool Approval Banner
 * 
 * Displays pending tool approvals that require user decision.
 * Shows tool details and provides approve/reject buttons.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { PendingApproval } from '@/services/approval/types';

interface ToolApprovalBannerProps {
  approval: PendingApproval;
  onApprove: (toolUseId: string) => void;
  onReject: (toolUseId: string) => void;
  isProcessing?: boolean;
}

export const ToolApprovalBanner: React.FC<ToolApprovalBannerProps> = ({
  approval,
  onApprove,
  onReject,
  isProcessing = false
}) => {
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null);

  const handleApprove = () => {
    setDecision('approved');
    onApprove(approval.tool_use_id);
  };

  const handleReject = () => {
    setDecision('rejected');
    onReject(approval.tool_use_id);
  };

  const formatTimeRemaining = (timeoutAt: Date): string => {
    const now = new Date();
    const remaining = timeoutAt.getTime() - now.getTime();
    
    if (remaining <= 0) {
      return 'Expired';
    }
    
    const minutes = Math.floor(remaining / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const formatToolInput = (input: Record<string, any>): string => {
    // Format tool input for display, truncating if too long
    const str = JSON.stringify(input, null, 2);
    if (str.length > 200) {
      return str.substring(0, 200) + '...';
    }
    return str;
  };

  const getToolIcon = (toolName: string) => {
    // Return appropriate icon based on tool name
    if (toolName.includes('delete') || toolName.includes('remove') || toolName.includes('rm')) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  };

  const isExpired = new Date() >= approval.timeout_at;

  return (
    <Card className="border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getToolIcon(approval.tool_name)}
            <CardTitle className="text-lg">Tool Approval Required</CardTitle>
            <Badge variant="outline" className="text-xs">
              {approval.tool_name}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            {isExpired ? (
              <span className="text-red-500">Expired</span>
            ) : (
              <span>Expires in {formatTimeRemaining(approval.timeout_at)}</span>
            )}
          </div>
        </div>
        <CardDescription>
          The agent wants to execute <code className="bg-muted px-1 py-0.5 rounded text-sm">{approval.tool_name}</code>.
          Please review and approve or reject this action.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Tool Input Details */}
        <div>
          <h4 className="text-sm font-medium mb-2">Tool Parameters:</h4>
          <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
            {formatToolInput(approval.tool_input)}
          </pre>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {decision === null && !isExpired && (
            <>
              <Button
                onClick={handleApprove}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                onClick={handleReject}
                disabled={isProcessing}
                variant="destructive"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </>
          )}
          
          {decision === 'approved' && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Approved - Executing...</span>
            </div>
          )}
          
          {decision === 'rejected' && (
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Rejected</span>
            </div>
          )}
          
          {isExpired && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm">This approval request has expired</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};