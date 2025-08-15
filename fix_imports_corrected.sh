#!/bin/bash

# Fix the double 's' issue from previous script
# Replace @/stores/eventStoress with @/stores/eventStores

echo "🔧 Fixing double 's' in eventStores import paths..."

# Find and replace the incorrect eventStoress with eventStores
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  -not -path "./node_modules/*" \
  -not -path "./.git/*" \
  -exec sed -i '' 's|@/stores/eventStoress|@/stores/eventStores|g' {} +

echo "✅ Fixed double 's' in the following files:"

# Show which files now have the correct import
grep -r "@/stores/eventStores" . \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --exclude-dir=node_modules --exclude-dir=.git \
  | cut -d: -f1 | sort | uniq

echo ""
echo "🎯 Import correction complete!"