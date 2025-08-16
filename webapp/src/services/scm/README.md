# Orchestra SCM Manager - Refactored Architecture

The Orchestra SCM Manager has been refactored to use a **backend abstraction pattern** that allows it to work seamlessly across different environments while maintaining a consistent API.

## 🏗️ Architecture Overview

```
┌─────────────────┐
│   SCMManager    │  ← Unified API
├─────────────────┤
│ Backend Factory │  ← Auto-detection & Selection
├─────────────────┤
│   ScmBackend    │  ← Interface
└─────────────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼──┐ ┌──▼──┐
│ Rust  │ │Node │ │Mock │
│Tauri  │ │ JS  │ │     │
└───────┘ └─────┘ └─────┘
```

## 🎯 Key Benefits

- **✅ Real Rust SCM Operations**: When running in Tauri, all operations use your Rust SCM implementation
- **✅ Backward Compatibility**: Existing code continues to work without changes
- **✅ Environment Flexibility**: Automatically selects the best backend for the current environment
- **✅ Testing Support**: Easy to switch to mock backends for testing
- **✅ Type Safety**: Full TypeScript support with proper interfaces

## 🚀 Quick Start

### Basic Usage (Auto-Detection)

```typescript
import { SCMManager } from './services/scm/SCMManager';

const scm = new SCMManager();

// Check what backend is being used
console.log(`Backend: ${scm.getBackendType()}`); // "RustTauri", "NodeJs", or "Mock"
console.log(`Real operations: ${scm.isRealBackend()}`); // true or false

// Use SCM operations
const cwd = '/path/to/your/project';
await scm.checkpoint(cwd, 'My checkpoint message');
const history = await scm.getHistory(cwd);
const diff = await scm.diff(cwd, 'commit1', 'commit2');
```

### Force Specific Backend

```typescript
// Force Rust backend (Tauri only)
const rustScm = new SCMManager({ forceBackend: 'rust' });

// Force Node.js backend
const nodeScm = new SCMManager({ forceBackend: 'nodejs' });

// Force mock backend (for testing)
const mockScm = new SCMManager({ forceBackend: 'mock' });
```

## 🔧 Backend Types

### 1. RustTauriBackend ⭐ **RECOMMENDED**

- **When**: Running in Tauri desktop environment
- **How**: Uses Tauri IPC to call Rust SCM implementation
- **Benefits**: 
  - Real SCM operations using your Rust code
  - Cross-platform compatibility
  - High performance
  - Unified state management

```typescript
// Automatically selected in Tauri environment
const scm = new SCMManager();

// Or force it
const scm = new SCMManager({ forceBackend: 'rust' });
```

### 2. NodeJsBackend

- **When**: Running in Node.js environment (fallback)
- **How**: Uses `child_process` to execute git commands
- **Benefits**: 
  - Works in any Node.js environment
  - Full Git functionality
  - Backward compatibility

```typescript
const scm = new SCMManager({ 
  forceBackend: 'nodejs',
  gitPath: '/usr/bin/git', // Optional custom git path
  userAgent: 'MyApp/1.0.0'  // Optional custom user agent
});
```

### 3. MockBackend

- **When**: Testing, development, or web environments
- **How**: Provides mock responses for all operations
- **Benefits**: 
  - No dependencies
  - Predictable responses
  - Safe for testing

```typescript
const scm = new SCMManager({ forceBackend: 'mock' });
```

## 📋 API Reference

### Core Operations

```typescript
// Repository management
await scm.hasRepository(cwd: string): Promise<boolean>
await scm.initializeRepository(cwd: string): Promise<void>

// Commit operations
await scm.checkpoint(cwd: string, message: string): Promise<string>
await scm.getCurrentCommit(cwd: string): Promise<string | null>
await scm.getHistory(cwd: string, limit?: number): Promise<Commit[]>

// Diff operations
await scm.diff(cwd: string, fromSha: string, toSha?: string): Promise<string>
await scm.diffBetween(cwd: string, baseSha: string, targetSha: string): Promise<string>

// Revert operations
await scm.revert(cwd: string, sha: string): Promise<void>

// File operations
await scm.getFileAtCommit(cwd: string, sha: string, filePath: string): Promise<string>
```

### Utility Methods

```typescript
// Backend information
scm.getBackendType(): string           // "RustTauri", "NodeJs", or "Mock"
scm.isRealBackend(): boolean          // true for real operations, false for mocks
scm.getBackend(): ScmBackend          // Get backend instance

// Backend switching (for testing)
scm.switchBackend(type: 'rust' | 'nodejs' | 'mock'): void

// Cleanup
scm.dispose(): void
```

## 🔄 Migration Guide

### From Old SCMManager

The API is **100% backward compatible**. Existing code will continue to work:

```typescript
// OLD CODE - still works!
const scm = new SCMManager();
await scm.checkpoint(cwd, message);
await scm.diffBetween(cwd, sha1, sha2);
await scm.revert(cwd, sha);

// NEW FEATURES - now available
console.log(`Using: ${scm.getBackendType()}`);
if (!scm.isRealBackend()) {
  console.warn('Using mock backend - operations are not real!');
}
```

### Key Changes

1. **Constructor options expanded**:
   ```typescript
   // Old
   new SCMManager({ gitPath: '...', userAgent: '...' })
   
   // New (backward compatible + new options)
   new SCMManager({ 
     gitPath: '...',           // Still supported
     userAgent: '...',         // Still supported
     forceBackend: 'rust',     // NEW: Force specific backend
     allowMockFallback: false  // NEW: Control fallback behavior
   })
   ```

2. **New methods available**:
   - `hasRepository()` - Check if repo exists
   - `getCurrentCommit()` - Get current commit hash
   - `diff()` - More flexible diff method
   - `initializeRepository()` - Explicit initialization
   - `getBackendType()` - Backend information
   - `isRealBackend()` - Real vs mock detection

## 🧪 Testing

### Unit Testing with Mock Backend

```typescript
import { SCMManager } from './SCMManager';

describe('SCM Operations', () => {
  let scm: SCMManager;
  
  beforeEach(() => {
    scm = new SCMManager({ forceBackend: 'mock' });
  });
  
  afterEach(() => {
    scm.dispose();
  });
  
  it('should create checkpoints', async () => {
    const hash = await scm.checkpoint('/test/path', 'Test commit');
    expect(hash).toBeTruthy();
    expect(scm.getBackendType()).toBe('Mock');
  });
});
```

### Integration Testing with Real Backend

```typescript
describe('SCM Integration', () => {
  let scm: SCMManager;
  
  beforeEach(() => {
    // Use real backend for integration tests
    scm = new SCMManager({ forceBackend: 'rust' });
  });
  
  afterEach(() => {
    scm.dispose();
  });
  
  it('should perform real SCM operations', async () => {
    if (!scm.isRealBackend()) {
      pending('Real backend not available');
    }
    
    const cwd = '/path/to/test/repo';
    const hash = await scm.checkpoint(cwd, 'Integration test');
    expect(hash).toMatch(/^[a-f0-9]{40}$/); // Real Git hash format
  });
});
```

## 🚨 Important Notes

### Environment Detection

The SCMManager automatically detects the environment:

1. **Tauri Environment**: Uses `RustTauriBackend` (⭐ **BEST**)
2. **Node.js Environment**: Uses `NodeJsBackend` (fallback)
3. **Web Environment**: Uses `MockBackend` (safe fallback)

### Real vs Mock Operations

Always check if you're using real operations:

```typescript
const scm = new SCMManager();

if (scm.isRealBackend()) {
  console.log('✅ Real SCM operations available');
  // Safe to perform actual checkpoints, reverts, etc.
} else {
  console.warn('⚠️ Using mock backend - operations are simulated');
  // Show warning to user or disable SCM features
}
```

### Error Handling

```typescript
try {
  const scm = new SCMManager({ 
    forceBackend: 'rust',
    allowMockFallback: false  // Fail if Rust not available
  });
  
  await scm.checkpoint(cwd, 'My checkpoint');
} catch (error) {
  if (error.message.includes('Tauri commands not available')) {
    console.error('Rust backend requires Tauri environment');
  } else {
    console.error('SCM operation failed:', error);
  }
}
```

## 🎉 Success!

You now have a **unified SCM interface** that:
- ✅ Uses **real Rust SCM operations** in Tauri
- ✅ Falls back gracefully in other environments  
- ✅ Maintains **100% backward compatibility**
- ✅ Provides **clear feedback** about backend type
- ✅ Supports **easy testing** with mocks

**In Tauri desktop mode, you get REAL checkpoint, revert, and diff operations powered by your Rust SCM implementation!** 🚀