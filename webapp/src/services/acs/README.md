# ACS Integration Modules

This directory contains the integration modules for Orchestra Agent Core Service (ACS) endpoints.

## Architecture Overview

```
src/services/acs/
├── core/           # Essential chat functionality
├── auth/           # Authentication and user management
├── sessions/       # Session management
├── streaming/      # Real-time SSE integration
├── models/         # Model API key management
├── forking/        # Conversation forking (advanced)
├── infrastructure/ # Infrastructure management (optional)
├── shared/         # Common utilities and types
└── README.md       # This file
```

## Module Priority

### **Tier 1: Critical (Implement First)**
- ✅ `core/` - Main chat/converse functionality
- ✅ `auth/` - User authentication
- ✅ `sessions/` - Session CRUD operations
- ✅ `streaming/` - Real-time SSE integration
- ✅ `models/` - Model API key management

### **Tier 2: Important (Implement Second)**
- 🔄 `forking/` - Conversation branching
- 🔄 `shared/` - Health monitoring and utilities

### **Tier 3: Optional (Future Enhancement)**
- ⏳ `infrastructure/` - User infrastructure management
- ⏳ Debug and testing utilities

## Integration Strategy

1. **Replace Local Tauri Backend**: Gradually replace Tauri invoke calls with ACS HTTP requests
2. **Maintain Compatibility**: Keep existing interfaces while switching backend
3. **Progressive Enhancement**: Start with core chat, add advanced features incrementally
4. **Fallback Support**: Maintain Tauri backend as fallback during transition

## Usage Pattern

```typescript
// Instead of Tauri invoke
await invoke('send_message', { sid: sessionId, messagesPayload: messages });

// Use ACS client
await acsClient.core.converse({
  user_id: userId,
  agent_config_name: 'default',
  prompt: message,
  session_id: sessionId
});
```

## Environment Configuration

```env
# .env
VITE_ACS_BASE_URL=https://orchestra-acs.fly.dev
VITE_SSE_BASE_URL=https://orchestra-sse-service.fly.dev
VITE_ACS_API_KEY=your_api_key_here
```

## Authentication Flow

1. User logs in via ACS auth endpoints
2. Receive JWT token for authenticated requests
3. Store token securely for subsequent API calls
4. Use token in Authorization header for all ACS requests

## Real-time Integration

1. Establish SSE connection to streaming service
2. Listen for real-time events (chunks, tool calls, etc.)
3. Update UI state based on streaming events
4. Maintain connection health and auto-reconnect

See individual module READMEs for detailed implementation guides.
