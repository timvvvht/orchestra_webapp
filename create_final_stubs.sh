#!/bin/bash

# Create final batch of missing stubs for webapp migration

echo "🔧 Creating final batch of missing stubs..."

# Create directories
mkdir -p app/hooks
mkdir -p app/components/hooks
mkdir -p app/stores
mkdir -p app/debug
mkdir -p app/constants
mkdir -p app/api
mkdir -p app/adapters
mkdir -p app/components

# useHideMergeConfirm hook
if [ ! -f "app/hooks/useHideMergeConfirm.ts" ]; then
cat > app/hooks/useHideMergeConfirm.ts << 'EOF'
import { useState, useCallback } from 'react';

export function useHideMergeConfirm() {
  const [isHidden, setIsHidden] = useState(false);
  
  const hide = useCallback(() => {
    console.log('🔧 [useHideMergeConfirm] STUB: Would hide merge confirm');
    setIsHidden(true);
  }, []);
  
  const show = useCallback(() => {
    console.log('🔧 [useHideMergeConfirm] STUB: Would show merge confirm');
    setIsHidden(false);
  }, []);
  
  return { isHidden, hide, show };
}
EOF
echo "✅ Created useHideMergeConfirm.ts"
fi

# use-toast hook
if [ ! -f "app/components/hooks/use-toast.ts" ]; then
cat > app/components/hooks/use-toast.ts << 'EOF'
import { useCallback } from 'react';

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const toast = useCallback((props: Omit<Toast, 'id'>) => {
    console.log('🍞 [useToast] STUB: Would show toast:', props);
  }, []);
  
  return { toast };
}
EOF
echo "✅ Created use-toast.ts"
fi

# chat store
if [ ! -f "app/stores/chat.ts" ]; then
cat > app/stores/chat.ts << 'EOF'
import { create } from 'zustand';

interface ChatState {
  messages: any[];
  isLoading: boolean;
}

export const useChatStore = create<ChatState>(() => ({
  messages: [],
  isLoading: false,
}));
EOF
echo "✅ Created chat.ts"
fi

# MockEventSource
if [ ! -f "app/debug/MockEventSource.ts" ]; then
cat > app/debug/MockEventSource.ts << 'EOF'
export class MockEventSource {
  constructor(url: string) {
    console.log('🔧 [MockEventSource] STUB: Created mock event source for:', url);
  }
  
  addEventListener(event: string, handler: Function) {
    console.log('🔧 [MockEventSource] STUB: Added event listener for:', event);
  }
  
  close() {
    console.log('🔧 [MockEventSource] STUB: Closed event source');
  }
}
EOF
echo "✅ Created MockEventSource.ts"
fi

# sessionPermissionsStore
if [ ! -f "app/stores/sessionPermissionsStore.ts" ]; then
cat > app/stores/sessionPermissionsStore.ts << 'EOF'
import { create } from 'zustand';

interface SessionPermissionsState {
  permissions: Record<string, boolean>;
  hasPermission: (permission: string) => boolean;
}

export const useSessionPermissionsStore = create<SessionPermissionsState>(() => ({
  permissions: {},
  hasPermission: (permission: string) => {
    console.log('🔧 [sessionPermissionsStore] STUB: Checking permission:', permission);
    return true; // Allow all permissions in stub
  },
}));
EOF
echo "✅ Created sessionPermissionsStore.ts"
fi

# defaultAgentConfig
if [ ! -f "app/constants/defaultAgentConfig.ts" ]; then
cat > app/constants/defaultAgentConfig.ts << 'EOF'
export const defaultAgentConfig = {
  id: 'default',
  name: 'Default Agent',
  description: 'Default agent configuration',
  ai_config: {
    provider_name: 'openai',
    model_id: 'gpt-4',
    temperature: 0.7,
    max_tokens: 2000,
  },
  agent: {
    name: 'Assistant',
    description: 'A helpful AI assistant',
    system_prompt: 'You are a helpful AI assistant.',
  },
  tool_groups: [],
  version: '1.0.0',
};
EOF
echo "✅ Created defaultAgentConfig.ts"
fi

# fileApi
if [ ! -f "app/api/fileApi.ts" ]; then
cat > app/api/fileApi.ts << 'EOF'
export async function readFile(path: string): Promise<string> {
  console.log('📁 [fileApi] STUB: Would read file:', path);
  return 'File content would be here';
}

export async function writeFile(path: string, content: string): Promise<void> {
  console.log('📁 [fileApi] STUB: Would write file:', path);
}

export async function listFiles(directory: string): Promise<string[]> {
  console.log('📁 [fileApi] STUB: Would list files in:', directory);
  return [];
}
EOF
echo "✅ Created fileApi.ts"
fi

# useReducedMotion hook
if [ ! -f "app/hooks/useReducedMotion.ts" ]; then
cat > app/hooks/useReducedMotion.ts << 'EOF'
import { useState, useEffect } from 'react';

export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
      
      const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, []);

  return prefersReducedMotion;
}
EOF
echo "✅ Created useReducedMotion.ts"
fi

# AdvancedMonacoDiffViewer
if [ ! -f "app/components/AdvancedMonacoDiffViewer.tsx" ]; then
cat > app/components/AdvancedMonacoDiffViewer.tsx << 'EOF'
import React from 'react';

interface AdvancedMonacoDiffViewerProps {
  original: string;
  modified: string;
  language?: string;
  className?: string;
}

const AdvancedMonacoDiffViewer: React.FC<AdvancedMonacoDiffViewerProps> = ({
  original,
  modified,
  language = 'text',
  className = ''
}) => {
  return (
    <div className={`border border-gray-300 dark:border-gray-600 rounded ${className}`}>
      <div className="p-4 bg-gray-50 dark:bg-gray-800">
        <h3 className="text-sm font-medium mb-2">Diff Viewer (Stub)</h3>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="font-medium mb-1">Original</div>
            <pre className="bg-white dark:bg-gray-900 p-2 rounded border overflow-auto max-h-32">
              {original}
            </pre>
          </div>
          <div>
            <div className="font-medium mb-1">Modified</div>
            <pre className="bg-white dark:bg-gray-900 p-2 rounded border overflow-auto max-h-32">
              {modified}
            </pre>
          </div>
        </div>
        <div className="text-xs text-gray-500 italic mt-2">
          Advanced Monaco diff viewer functionality is simplified in webapp mode
        </div>
      </div>
    </div>
  );
};

export default AdvancedMonacoDiffViewer;
EOF
echo "✅ Created AdvancedMonacoDiffViewer.tsx"
fi

# RowMapper
if [ ! -f "app/adapters/RowMapper.ts" ]; then
cat > app/adapters/RowMapper.ts << 'EOF'
export class RowMapper {
  static mapToRow(data: any): any {
    console.log('🔧 [RowMapper] STUB: Would map data to row:', data);
    return data;
  }
  
  static mapFromRow(row: any): any {
    console.log('🔧 [RowMapper] STUB: Would map row to data:', row);
    return row;
  }
}
EOF
echo "✅ Created RowMapper.ts"
fi

echo "🎉 Finished creating final batch of stubs!"