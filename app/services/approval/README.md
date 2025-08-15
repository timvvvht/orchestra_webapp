# Tool Approval System

The Tool Approval System provides human-in-the-loop control over tool executions in the Orchestra application. It allows users to review and approve potentially dangerous or sensitive tool operations before they are executed.

## Architecture Overview

The approval system consists of several key components:

1. **ApprovalService** - Core service managing approval state and logic
2. **ApprovalAPI** - REST API interface for approval operations
3. **LocalToolOrchestrator Integration** - Modified orchestrator that pauses for approvals
4. **UI Components** - React components for displaying and managing approvals
5. **Configuration System** - Flexible configuration for approval requirements

## Key Features

- **ID Correlation**: Maintains mapping between `tool_use_id` (UI), `tool_call_id` (DB), and `job_id` (execution)
- **Real-time Updates**: Uses event system for immediate UI updates
- **Configurable**: Supports exact tool names and regex patterns for approval requirements
- **Timeout Handling**: Automatic timeout and cleanup of stale approvals
- **Fallback Behavior**: Configurable auto-approval when service is unavailable
- **Audit Trail**: Tracks who approved/rejected each tool execution

## Data Flow

```
1. Agent generates tool call with tool_use_id
2. Tool call stored in DB with tool_call_id
3. ACS emits waiting_local_tool event with job_id
4. LocalToolOrchestrator checks if tool requires approval
5. If approval required:
   a. Creates correlation record (tool_use_id ↔ job_id)
   b. Requests approval via ApprovalService
   c. ApprovalService emits approval_requested event
   d. UI displays approval banner
   e. User approves/rejects
   f. ApprovalService emits approval_decided event
   g. LocalToolOrchestrator resumes/cancels execution
6. If no approval required: Execute immediately
```

## Configuration

The approval system is configured via `ApprovalConfig`:

```typescript
interface ApprovalConfig {
  required_approval_tools: string[];     // Tools requiring approval
  default_timeout_minutes: number;       // Default approval timeout
  fallback_auto_approve: boolean;        // Auto-approve when service down
  approval_enabled: boolean;             // Global enable/disable
}
```

### Tool Matching

Tools can be specified for approval in two ways:

1. **Exact Match**: `"str_replace_editor"`
2. **Regex Pattern**: `"/.*delete.*/"`

## API Endpoints

- `POST /api/approval/request` - Request approval for a tool
- `POST /api/approval/decide` - Make approval decision
- `GET /api/approval/invocation/:tool_use_id` - Get invocation details
- `GET /api/approval/pending/:session_id` - Get pending approvals
- `GET /api/approval/config` - Get current configuration
- `PUT /api/approval/config` - Update configuration

## Usage Examples

### Basic Setup

```typescript
import { getApprovalService } from '@/services/approval';

// Initialize with configuration
const approvalService = getApprovalService({
  required_approval_tools: ['str_replace_editor', '/.*delete.*/'],
  approval_enabled: true
});
```

### React Hook Usage

```typescript
import { useApprovals } from '@/hooks/useApprovals';

function MyComponent({ sessionId }) {
  const { 
    pendingApprovals, 
    approve, 
    reject, 
    hasPendingApprovals 
  } = useApprovals({ sessionId });

  return (
    <div>
      {hasPendingApprovals() && (
        <ApprovalPanel sessionId={sessionId} />
      )}
    </div>
  );
}
```

### LocalToolOrchestrator Integration

```typescript
// Check if tool requires approval
if (this.approvalAPI.requiresApproval(ji.tool_name)) {
  // Request approval
  await this.approvalAPI.requestApproval({
    tool_use_id: invocation.tool_use_id,
    job_id: jobId,
    tool_name: ji.tool_name,
    tool_input: ji.tool_input,
    session_id: sessionId
  });

  // Wait for decision
  const decision = await this.approvalAPI.getService().waitForApproval(invocation.tool_use_id);
  
  if (decision !== 'APPROVED') {
    // Handle rejection/timeout
    return;
  }
}

// Proceed with execution
await this.executeJob(sessionId, ji);
```

## UI Components

### ApprovalPanel

Main container component that displays all pending approvals for a session:

```typescript
<ApprovalPanel sessionId={sessionId} />
```

### ToolApprovalBanner

Individual approval request display with approve/reject buttons:

```typescript
<ToolApprovalBanner
  approval={pendingApproval}
  onApprove={handleApprove}
  onReject={handleReject}
/>
```

### Integration with Existing Components

The approval system integrates with existing components:

- **ToolStatusPill**: Shows "waiting for approval" status
- **CombinedToolInteraction**: Displays approval state
- **ChatMessage**: Can show approval banners inline

## Security Considerations

1. **Authentication**: All approval endpoints require valid session authentication
2. **Authorization**: Users can only approve tools in their own sessions
3. **Audit Trail**: All approval decisions are logged with user ID and timestamp
4. **Race Condition Protection**: Database constraints prevent double-approval
5. **Input Validation**: Tool inputs are validated and sanitized for display

## Testing

Run the approval system tests:

```bash
npm test src/services/approval/__tests__/
```

Use the demo component for manual testing:

```typescript
import { ApprovalDemo } from '@/components/approval/ApprovalDemo';

<ApprovalDemo sessionId="test-session" />
```

## Deployment

### Development

```typescript
// Enable approval for testing
const config = {
  approval_enabled: true,
  required_approval_tools: ['str_replace_editor'],
  default_timeout_minutes: 5
};
```

### Production

```typescript
// Comprehensive approval requirements
const config = {
  approval_enabled: true,
  required_approval_tools: [
    'str_replace_editor',
    'execute_in_runner_session',
    '/.*delete.*/',
    '/.*remove.*/',
    '/.*sudo.*/'
  ],
  default_timeout_minutes: 10,
  fallback_auto_approve: false
};
```

## Monitoring

The approval system emits events that can be monitored:

- `approval_requested` - New approval needed
- `approval_decided` - User made decision
- `approval_timed_out` - Approval expired

## Troubleshooting

### Common Issues

1. **Approvals not showing**: Check if `approval_enabled` is true
2. **Tool not requiring approval**: Verify tool name matches configuration
3. **Timeouts**: Check `default_timeout_minutes` setting
4. **UI not updating**: Ensure event listeners are properly set up

### Debug Mode

Enable debug logging:

```typescript
const DEBUG_APPROVAL = true;
```

### Cleanup

The service automatically cleans up expired approvals, but manual cleanup is available:

```typescript
approvalService.cleanup();
```

## Future Enhancements

- Database persistence for approval records
- Role-based approval permissions
- Approval workflows (multiple approvers)
- Integration with external approval systems
- Bulk approval operations
- Approval history and analytics