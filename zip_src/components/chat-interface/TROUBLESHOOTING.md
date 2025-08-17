# Troubleshooting Guide - Apple-Inspired Chat Interface

## Common Issues and Solutions

### 1. "ReferenceError: Can't find variable: cn"
**Solution**: The `cn` utility function import was missing. This has been fixed by adding:
```typescript
import { cn } from '@/lib/utils';
```

### 2. Framer Motion not found
**Solution**: Install Framer Motion:
```bash
bun add framer-motion
```

### 3. Syntax highlighter styles not found
**Solution**: We've switched from `atomDark` to `vscDarkPlus` which is more commonly available.

### 4. Dark mode not applying correctly
**Solution**: 
1. Ensure your app is set to dark mode
2. Import the custom CSS file in your main app:
```typescript
import '@/components/chat-interface/styles/apple-dark-theme.css';
```

### 5. Components not rendering properly
**Solution**: Clear your browser cache and restart the development server:
```bash
# Stop the server (Ctrl+C)
bun run dev
```

## Verification Steps

1. **Check all imports are correct**:
   - `cn` from '@/lib/utils'
   - `motion` from 'framer-motion'
   - Component paths are correct

2. **Verify dependencies**:
   ```bash
   bun pm ls | grep framer-motion
   ```

3. **Check console for errors**:
   - Open browser DevTools
   - Look for any remaining import errors
   - Check for missing dependencies

4. **Test the interface**:
   - Navigate to a chat
   - Check animations work
   - Verify dark mode styling
   - Test hover effects

## Quick Fixes

### Reset and reinstall:
```bash
rm -rf node_modules
rm bun.lockb
bun install
bun add framer-motion
```

### Clear all caches:
```bash
# Clear Vite cache
rm -rf node_modules/.vite

# Clear browser cache
# Chrome: Cmd+Shift+Delete (Mac) or Ctrl+Shift+Delete (Windows)
```

## Still having issues?

1. Check that your `@/lib/utils` file exports the `cn` function
2. Ensure all file paths match your project structure
3. Verify TypeScript types are properly imported
4. Check for any custom theme providers that might conflict

The interface should now work with all the Apple-inspired design improvements!