#!/bin/bash

# Fix eventStore import paths in webapp migration
# Replace @/stores/eventStore with @/stores/eventStores

echo "🔧 Fixing eventStore import paths..."

# Find and replace in all TypeScript/JavaScript files
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  -not -path "./node_modules/*" \
  -not -path "./.git/*" \
  -exec sed -i '' 's|@/stores/eventStore|@/stores/eventStores|g' {} +

echo "✅ Fixed imports in the following files:"

# Show which files were affected
grep -r "@/stores/eventStores" . \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --exclude-dir=node_modules --exclude-dir=.git \
  | cut -d: -f1 | sort | uniq

echo ""
echo "🎯 Import fix complete! Run your build to check for remaining issues."