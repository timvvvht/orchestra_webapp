// src/components/Editor/CleanCodeMirrorEditor/utils/devLogger.ts
/**
 * Outputs debug messages to the console only during development.
 * Prepends a [CodeBlockDebug] tag to all messages.
 */
export const codeBlockDebugLog = (...args: unknown[]): void => {
  if (import.meta.env.DEV) { // Vite's boolean flag for development mode
    console.debug('[CodeBlockDebug]', ...args);
  }
};
