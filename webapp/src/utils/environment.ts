/**
 * Environment detection utilities for Orchestra
 * Supports both Tauri desktop and web browser modes
 */

// Check if running in Tauri environment
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && window.__TAURI__ !== undefined;
};

// Check if running in development mode
export const isDevelopment = (): boolean => {
  return import.meta.env.DEV;
};

// Check if running in production mode
export const isProduction = (): boolean => {
  return import.meta.env.PROD;
};

// Get environment mode
export const getEnvironmentMode = (): string => {
  return import.meta.env.MODE;
};

// Get environment variable with fallback
export const getEnvVar = (name: string, defaultValue: string = ''): string => {
  // For Vite, use import.meta.env for client-side environment variables
  const value = import.meta.env[name];
  return value !== undefined ? value : defaultValue;
};

// Platform detection
export const getPlatform = (): 'tauri' | 'web' => {
  return isTauri() ? 'tauri' : 'web';
};

// Runtime information
export const getRuntimeInfo = () => {
  return {
    platform: getPlatform(),
    isTauri: isTauri(),
    isDevelopment: isDevelopment(),
    isProduction: isProduction(),
    mode: getEnvironmentMode(),
  };
};

// Log runtime info (useful for debugging)
if (isDevelopment()) {
  console.log('🏗️ Orchestra Runtime Info:', getRuntimeInfo());
}

// Global type augmentation for Tauri
declare global {
  interface Window {
    __TAURI__?: any;
  }
}
