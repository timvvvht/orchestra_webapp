# RaycastSearchModal Migration Guide

## Overview

This guide will help you migrate from the current RaycastSearchModal to the redesigned version that would make Steve Jobs and Jony Ive proud.

## Prerequisites

1. Install required dependencies:
```bash
npm install framer-motion lucide-react
```

2. Ensure you have the `cn` utility function from shadcn/ui in `@/lib/utils`

## Migration Steps

### Step 1: Backup Current Implementation

First, rename your current files as backups:
```bash
mv src/components/RaycastSearchModal.tsx src/components/RaycastSearchModal.backup.tsx
mv src/hooks/useRaycastSearch.ts src/hooks/useRaycastSearch.backup.ts
```

### Step 2: Implement New Files

1. Copy `RaycastSearchModalRedesigned.tsx` to `RaycastSearchModal.tsx`
2. Copy `useRaycastSearchEnhanced.ts` to `useRaycastSearch.ts`

### Step 3: Update Imports

In the new `RaycastSearchModal.tsx`, update the hook import:
```tsx
// Change from:
import { useRaycastSearch } from '../hooks/useRaycastSearch';

// To:
import { useRaycastSearchEnhanced as useRaycastSearch } from '../hooks/useRaycastSearch';
```

### Step 4: Update CSS

Add these CSS variables to your global CSS file for optimal theming:

```css
/* In your global.css or App.css */
@layer base {
  :root {
    --search-modal-backdrop: 0 0 0 / 0.8;
    --search-modal-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  }
  
  .dark {
    --search-modal-backdrop: 0 0 0 / 0.9;
    --search-modal-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  }
}

/* Smooth scrollbar for search results */
.search-results-scroll {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent;
}

.search-results-scroll::-webkit-scrollbar {
  width: 6px;
}

.search-results-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.search-results-scroll::-webkit-scrollbar-thumb {
  background-color: hsl(var(--muted-foreground) / 0.3);
  border-radius: 3px;
}

.search-results-scroll::-webkit-scrollbar-thumb:hover {
  background-color: hsl(var(--muted-foreground) / 0.5);
}
```

### Step 5: Update the Hook Interface

The enhanced hook has a slightly different interface. Update any components using it:

```tsx
// Old interface
const {
  query,
  setQuery,
  results,
  highlighted,
  moveHighlight,
  selectCurrent,
  updateResults
} = useRaycastSearch(handleFileSelect);

// New interface
const {
  query,
  setQuery,
  results,
  highlighted,
  moveHighlight,
  selectCurrent,
  isLoading,      // New: loading state
  hasMore,        // New: pagination support
  loadMore,       // New: load more results
  clearSearch     // New: clear search state
} = useRaycastSearch(handleFileSelect);
```

### Step 6: Feature Flags (Optional)

If you want to gradually roll out the new design:

```tsx
// In your app configuration
const FEATURE_FLAGS = {
  USE_NEW_SEARCH_MODAL: process.env.REACT_APP_NEW_SEARCH === 'true'
};

// In SearchIntegration.tsx
import RaycastSearchModal from './RaycastSearchModal';
import RaycastSearchModalLegacy from './RaycastSearchModal.backup';

const SearchModal = FEATURE_FLAGS.USE_NEW_SEARCH_MODAL 
  ? RaycastSearchModal 
  : RaycastSearchModalLegacy;
```

### Step 7: Performance Monitoring

Add performance tracking to ensure the new design is faster:

```tsx
// In useRaycastSearchEnhanced.ts
const performSearch = useCallback(async (q: string) => {
  const startTime = performance.now();
  
  // ... search logic ...
  
  const endTime = performance.now();
  console.log(`Search for "${q}" took ${endTime - startTime}ms`);
  
  // Track in analytics
  if (window.analytics) {
    window.analytics.track('Search Performance', {
      query: q,
      duration: endTime - startTime,
      resultCount: results.length
    });
  }
}, []);
```

### Step 8: A/B Testing (Optional)

To measure the impact of the new design:

```tsx
// Track key metrics
const trackSearchEvent = (event: string, data?: any) => {
  if (window.analytics) {
    window.analytics.track(event, {
      version: 'redesigned',
      ...data
    });
  }
};

// In the modal component
useEffect(() => {
  trackSearchEvent('Search Modal Opened');
  return () => {
    trackSearchEvent('Search Modal Closed', {
      duration: Date.now() - openedAt
    });
  };
}, []);
```

## Testing Checklist

- [ ] Search modal opens with Cmd+K
- [ ] Escape key closes the modal
- [ ] Arrow keys navigate results
- [ ] Enter selects the highlighted result
- [ ] Search is fast (<50ms for cached queries)
- [ ] Recent searches appear when query is empty
- [ ] Reindex button works and shows feedback
- [ ] Modal works on mobile/tablet viewports
- [ ] Dark mode looks correct
- [ ] Accessibility: can navigate with screen reader
- [ ] No console errors or warnings

## Rollback Plan

If you need to rollback:

1. Restore backup files:
```bash
mv src/components/RaycastSearchModal.backup.tsx src/components/RaycastSearchModal.tsx
mv src/hooks/useRaycastSearch.backup.ts src/hooks/useRaycastSearch.ts
```

2. Remove new dependencies (if not used elsewhere):
```bash
npm uninstall framer-motion
```

## Common Issues & Solutions

### Issue: Modal appears behind other elements
**Solution**: Ensure z-index is high enough (z-50 or z-[9999])

### Issue: Animations feel sluggish
**Solution**: Check if React StrictMode is causing double renders in development

### Issue: Search feels slow
**Solution**: Ensure the file index is preloaded on app start

### Issue: Keyboard shortcuts conflict
**Solution**: Remove the CommandBar component or change its shortcut

## Next Steps

After successful migration:

1. Remove backup files
2. Update documentation
3. Train users on new features (recent searches, quick actions)
4. Monitor performance metrics
5. Gather user feedback

## Support

If you encounter issues:
1. Check the console for errors
2. Verify all dependencies are installed
3. Ensure your theme variables are properly set
4. Review the Design Philosophy document for intended behavior