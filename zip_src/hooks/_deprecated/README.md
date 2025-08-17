# Deprecated Hooks

This folder contains React hooks that are no longer used in the active application but are kept for reference.

## Files

### useChatSessionSwitcher.ts
- Hook for managing chat session switcher modal state
- Was used by ChatSessionSwitcher component (also deprecated)
- Uses keyboard shortcuts that might be useful elsewhere

### useOptimizedChatStore.ts
- Optimized Zustand store subscriptions
- Used by deprecated ChatSidebarOptimized component
- Contains good patterns for selective subscriptions to prevent re-renders

## Useful Patterns

The `useOptimizedChatStore` hook demonstrates good practices for Zustand performance:
- Selective subscriptions with `shallow` comparison
- Separate hooks for different data slices
- Prevents unnecessary re-renders

These patterns could be applied to components in the active hot path.