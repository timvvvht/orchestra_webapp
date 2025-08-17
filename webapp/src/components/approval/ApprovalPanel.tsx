/**
 * Approval Panel
 *
 * Container component that manages and displays all pending tool approvals for a session.
 * Handles approval/rejection actions and real-time updates.
 */

import React, { useState, useEffect, useCallback } from "react";
import { ToolApprovalBanner } from "./ToolApprovalBanner";
import { PendingApproval, ApprovalEvent } from "@/services/approval/types";
import { getApprovalAPI } from "@/services/approval";

interface ApprovalPanelProps {
  sessionId: string;
  className?: string;
}

export const ApprovalPanel: React.FC<ApprovalPanelProps> = ({
  sessionId,
  className = "",
}) => {
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>(
    []
  );
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const approvalAPI = getApprovalAPI();

  // Load pending approvals
  const loadPendingApprovals = useCallback(async () => {
    console.log(
      `🔧 [ApprovalPanel] Loading pending approvals for session: ${sessionId}`
    );
    try {
      const result = await approvalAPI.getPendingApprovals(sessionId);
      console.log(`🔧 [ApprovalPanel] getPendingApprovals result:`, {
        sessionId,
        success: result.success,
        dataLength: result.data?.length || 0,
        data: result.data,
        message: result.message,
        fullResult: result,
      });

      if (result.success) {
        setPendingApprovals(result.data || []);
        setError(null);
        console.log(
          `🔧 [ApprovalPanel] Set ${result.data?.length || 0} pending approvals for session ${sessionId}`
        );
      } else {
        console.error(
          `🔧 [ApprovalPanel] Failed to load approvals:`,
          result.message
        );
        setError(result.message || "Failed to load pending approvals");
      }
    } catch (err) {
      console.error("[ApprovalPanel] Error loading pending approvals:", err);
      setError("Failed to load pending approvals");
    }
  }, [sessionId, approvalAPI]);

  // Handle approval events
  const handleApprovalEvent = useCallback(
    (event: ApprovalEvent) => {
      if (event.session_id !== sessionId) {
        return;
      }

      console.log("[ApprovalPanel] Received approval event:", event);

      switch (event.type) {
        case "APPROVAL_REQUESTED":
          // Reload pending approvals to include the new request
          loadPendingApprovals();
          break;

        case "APPROVAL_DECIDED":
        case "APPROVAL_TIMED_OUT":
          // Remove the approval from pending list
          setPendingApprovals((prev) =>
            prev.filter(
              (approval) => approval.tool_use_id !== event.tool_use_id
            )
          );
          // Remove from processing set
          setProcessingIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(event.tool_use_id);
            return newSet;
          });
          break;
      }
    },
    [sessionId, loadPendingApprovals]
  );

  // Set up event listeners
  useEffect(() => {
    const service = approvalAPI.getService();
    service.on("approval_event", handleApprovalEvent);

    // Load initial pending approvals
    loadPendingApprovals();

    return () => {
      service.removeListener("approval_event", handleApprovalEvent);
    };
  }, [approvalAPI, handleApprovalEvent, loadPendingApprovals]);

  // Handle approve action
  const handleApprove = async (toolUseId: string) => {
    setProcessingIds((prev) => new Set(prev).add(toolUseId));

    try {
      const result = await approvalAPI.makeDecision({
        tool_use_id: toolUseId,
        decision: "APPROVED",
        user_id: "current_user", // TODO: Get actual user ID from auth context
      });

      if (!result.success) {
        console.error("[ApprovalPanel] Failed to approve:", result.message);
        setError(result.message || "Failed to approve tool execution");
        setProcessingIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(toolUseId);
          return newSet;
        });
      }
    } catch (err) {
      console.error("[ApprovalPanel] Error approving tool:", err);
      setError("Failed to approve tool execution");
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(toolUseId);
        return newSet;
      });
    }
  };

  // Handle reject action
  const handleReject = async (toolUseId: string) => {
    setProcessingIds((prev) => new Set(prev).add(toolUseId));

    try {
      const result = await approvalAPI.makeDecision({
        tool_use_id: toolUseId,
        decision: "REJECTED",
        user_id: "current_user", // TODO: Get actual user ID from auth context
      });

      if (!result.success) {
        console.error("[ApprovalPanel] Failed to reject:", result.message);
        setError(result.message || "Failed to reject tool execution");
        setProcessingIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(toolUseId);
          return newSet;
        });
      }
    } catch (err) {
      console.error("[ApprovalPanel] Error rejecting tool:", err);
      setError("Failed to reject tool execution");
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(toolUseId);
        return newSet;
      });
    }
  };

  // Debug logging for Mission Control context
  useEffect(() => {
    console.log(`🔧 [ApprovalPanel] Debug info for session ${sessionId}:`, {
      pendingApprovalsCount: pendingApprovals.length,
      pendingApprovals,
      error,
      approvalAPIExists: !!approvalAPI,
      timestamp: new Date().toISOString(),
    });
  }, [sessionId, pendingApprovals, error, approvalAPI]);

  if (pendingApprovals.length === 0 && !error) {
    // Always render a debug indicator in development to verify the component is being called
    // if (process.env.NODE_ENV === 'development') {
    //   return (
    //     <div className="text-xs text-white/30 px-4 py-2">
    //       🔧 ApprovalPanel: No pending approvals for session {sessionId}
    //     </div>
    //   );
    // }
    return null; // Don't render anything if no pending approvals
  }

  return (
    <div className={`space-y-4 ${className}`} id="ApprovalPannel">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <p className="text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-xs underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {pendingApprovals.map((approval) => (
        <ToolApprovalBanner
          key={approval.tool_use_id}
          approval={approval}
          onApprove={handleApprove}
          onReject={handleReject}
          isProcessing={processingIds.has(approval.tool_use_id)}
        />
      ))}
    </div>
  );
};
