import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useChatStore } from '@/stores/chatStore';
import { useOptimizedChatData, useOptimizedChatActions } from '@/hooks/useOptimizedChatStore';
import { PerformanceMonitor, useRenderTracker } from './PerformanceMonitor';

/**
 * Performance test component to compare optimized vs unoptimized patterns
 */
const PerformanceTest: React.FC = () => {
  const [testMode, setTestMode] = useState<'optimized' | 'unoptimized'>('optimized');
  const [triggerUpdates, setTriggerUpdates] = useState(false);
  
  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Chat Performance Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              variant={testMode === 'optimized' ? 'default' : 'outline'}
              onClick={() => setTestMode('optimized')}
            >
              Optimized Components
            </Button>
            <Button
              variant={testMode === 'unoptimized' ? 'default' : 'outline'}
              onClick={() => setTestMode('unoptimized')}
            >
              Unoptimized Components
            </Button>
          </div>
          
          <div className="flex gap-4">
            <Button
              variant={triggerUpdates ? 'destructive' : 'outline'}
              onClick={() => setTriggerUpdates(!triggerUpdates)}
            >
              {triggerUpdates ? 'Stop' : 'Start'} Store Updates
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Press Ctrl+Shift+P to view performance overlay
          </div>
        </CardContent>
      </Card>
      
      {testMode === 'optimized' ? (
        <OptimizedTestComponent triggerUpdates={triggerUpdates} />
      ) : (
        <UnoptimizedTestComponent triggerUpdates={triggerUpdates} />
      )}
    </div>
  );
};

/**
 * Optimized test component using selective subscriptions
 */
const OptimizedTestComponent: React.FC<{ triggerUpdates: boolean }> = React.memo(({ triggerUpdates }) => {
  const renderCount = useRenderTracker('OptimizedTestComponent');
  const { chat, currentAgent, messageCount } = useOptimizedChatData('test-session');
  const { sendMessage } = useOptimizedChatActions();
  
  // Simulate store updates
  useEffect(() => {
    if (!triggerUpdates) return;
    
    const interval = setInterval(() => {
      // This would normally trigger re-renders in unoptimized components
      useChatStore.setState(state => ({
        ...state,
        sessions: {
          ...state.sessions,
          'other-session': {
            ...state.sessions['other-session'],
            lastUpdated: Date.now()
          }
        }
      }));
    }, 100);
    
    return () => clearInterval(interval);
  }, [triggerUpdates]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Optimized Component
          <PerformanceMonitor componentName="OptimizedTestComponent" showOverlay />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div>Render Count: <span className="font-mono">{renderCount}</span></div>
          <div>Message Count: <span className="font-mono">{messageCount}</span></div>
          <div>Agent: <span className="font-mono">{currentAgent?.name || 'None'}</span></div>
          <div className="text-green-600">
            ✓ Only re-renders when relevant data changes
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

/**
 * Unoptimized test component subscribing to entire store
 */
const UnoptimizedTestComponent: React.FC<{ triggerUpdates: boolean }> = ({ triggerUpdates }) => {
  const renderCount = useRenderTracker('UnoptimizedTestComponent');
  // This subscribes to the entire store, causing re-renders on any change
  const { chats, sessions, sendMessage } = useChatStore();
  
  const chat = chats['test-session'];
  const currentAgent = sessions['test-session'];
  const messageCount = chat?.messages?.length || 0;
  
  // Simulate store updates
  useEffect(() => {
    if (!triggerUpdates) return;
    
    const interval = setInterval(() => {
      // This triggers re-renders because we're subscribed to the entire store
      useChatStore.setState(state => ({
        ...state,
        sessions: {
          ...state.sessions,
          'other-session': {
            ...state.sessions['other-session'],
            lastUpdated: Date.now()
          }
        }
      }));
    }, 100);
    
    return () => clearInterval(interval);
  }, [triggerUpdates]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Unoptimized Component
          <PerformanceMonitor componentName="UnoptimizedTestComponent" showOverlay />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div>Render Count: <span className="font-mono">{renderCount}</span></div>
          <div>Message Count: <span className="font-mono">{messageCount}</span></div>
          <div>Agent: <span className="font-mono">{currentAgent?.name || 'None'}</span></div>
          <div className="text-red-600">
            ⚠ Re-renders on any store change
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

OptimizedTestComponent.displayName = 'OptimizedTestComponent';

export default PerformanceTest;