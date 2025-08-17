import React from "react";
import '@/boot/globalInit';
import ReactDOM from "react-dom/client";
import "./themes.css";
import "./minimal.css";
import "./styles/mission-control-enhancements.css";
import "./direct-theme.css";
import "./styles/orchestra-design.css";
import App from "./App";
import {
  QueryClient,
  QueryClientProvider
} from "@tanstack/react-query";

import { globalServiceManager } from '@/services/GlobalServiceManager';
// Auto-start CheckpointService by importing it
import '@/services/checkpoints/CheckpointService';
// Auto-start PostHookListenerService
import '@/hooks/PostHookListenerService';
// Register chat lifecycle hooks
import { registerPreChatHook, registerPostChatHook } from '@/hooks/chatLifecycleHooks';
import { preEnsureStartCheckpoint } from '@/hooks/builtin/preEnsureStartCheckpoint';
import { postChatLogging } from '@/hooks/builtin/postChatLogging';
import { postFirehoseEvent } from '@/hooks/builtin/postFirehoseEvent';
import { postChatCheckpoint } from '@/hooks/builtin/postChatCheckpoint';

// Tauri logging disabled for performance
console.log('Orchestra frontend application starting...');

// Initialize global services BEFORE React app starts
console.log('🚀 [Orchestra] Initializing global services...');
try {
  globalServiceManager.initialize();
  console.log('✅ [Orchestra] Global services initialized successfully');
} catch (error) {
  console.error('❌ [Orchestra] Failed to initialize global services:', error);
}

// Hook registration – keep at top-level
console.log('🔗 [Orchestra] Registering chat lifecycle hooks...');
try {
  registerPreChatHook(preEnsureStartCheckpoint);
  registerPostChatHook(postChatLogging);
  registerPostChatHook(postFirehoseEvent);
  registerPostChatHook(postChatCheckpoint);
  console.log('✅ [Orchestra] Chat lifecycle hooks registered successfully');
} catch (error) {
  console.error('❌ [Orchestra] Failed to register chat lifecycle hooks:', error);
}



// --- END DEVELOPMENT ONLY ---

// Enhanced global error handlers for crash detection
window.addEventListener('error', e => {
  console.error('[GLOBAL-ERROR]', e.error ?? e);
  const errorDetails = {
    message: e.message,
    filename: e.filename,
    lineno: e.lineno,
    colno: e.colno,
    stack: e.error?.stack,
    timestamp: new Date().toISOString()
  };
  console.error('🚨 Error details:', errorDetails);
});

window.addEventListener('unhandledrejection', e => {
  console.error('[UNHANDLED-PROMISE]', e.reason);
  const rejectionDetails = {
    reason: e.reason,
    promise: e.promise,
    timestamp: new Date().toISOString()
  };
  console.error('🚨 Promise rejection details:', rejectionDetails);
});

// Add debugging for React errors
const originalError = console.error;
console.error = (...args) => {
  if (args[0]?.includes?.('Consider adding an error boundary')) {
    console.warn('🚨 React is suggesting an error boundary - an error occurred!');
  }
  originalError.apply(console, args);
};

try {
  // Create QueryClient for TanStack Query
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  // Create root with unmount detection
  const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
  
  // Instrument root for unmount detection
  const originalUnmount = root.unmount.bind(root);
  root.unmount = () => {
    console.warn('%c[ROOT-UNMOUNT] called!', 'background:yellow;color:black');
    console.trace('Root unmount stack trace:');
    originalUnmount();
  };
  
  root.render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
} catch (renderError) {
  console.error('🚨 Failed to render React app:', renderError);
  document.body.innerHTML = `
    <div style="padding: 20px; color: red; font-family: monospace;">
      <h1>Failed to start application</h1>
      <pre>${renderError}</pre>
    </div>
  `;
}