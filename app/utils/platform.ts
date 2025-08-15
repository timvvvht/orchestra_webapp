import { platform } from '@tauri-apps/plugin-os';
import type { Settings } from '@/types/settings';

/**
 * Platform type
 */
export type Platform = 'windows' | 'macos' | 'linux' | 'unknown';

/**
 * Get the current platform (linux, macos, ios, freebsd, dragonfly, netbsd, openbsd, solaris, android, windows)
 */
export async function getPlatform(): Promise<string> {
  try {
    // The platform() function returns a string directly
    return platform();
  } catch (error) {
    console.error('Failed to get platform information:', error);
    // Return a default value based on browser detection as fallback
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('win')) return 'windows';
    if (userAgent.includes('mac')) return 'macos';
    if (userAgent.includes('linux')) return 'linux';
    return 'unknown';
  }
}

/**
 * Get the current platform as a normalized Platform type
 */
export async function getCurrentPlatform(): Promise<Platform> {
  const plat = await getPlatform();
  
  if (plat === 'windows') {
    return 'windows';
  } else if (plat === 'macos' || plat === 'darwin') {
    return 'macos';
  } else if (plat === 'linux') {
    return 'linux';
  } else {
    return 'unknown';
  }
}

/**
 * Get platform-specific default settings
 */
export async function getPlatformDefaults(baseDefaults: Settings): Promise<Settings> {
  const platform = await getCurrentPlatform();
  const defaults = { ...baseDefaults };
  
  // Apply platform-specific defaults
  switch (platform) {
    case 'windows':
      // Windows-specific defaults
      defaults.theme.colorScheme = 'system';
      break;
      
    case 'macos':
      // macOS-specific defaults
      defaults.theme.colorScheme = 'system';
      defaults.theme.reducedMotion = false;
      break;
      
    case 'linux':
      // Linux-specific defaults
      defaults.theme.colorScheme = 'dark';
      break;
      
    default:
      // No changes for unknown platforms
      break;
  }
  
  return defaults;
}

// Check if the current platform is macOS
export async function isMacOS(): Promise<boolean> {
  const plat = await getPlatform();
  return plat === 'macos';
}

// Check if the current platform is Windows
export async function isWindows(): Promise<boolean> {
  const plat = await getPlatform();
  return plat === 'windows';
}

// Check if the current platform is Linux
export async function isLinux(): Promise<boolean> {
  const plat = await getPlatform();
  return plat === 'linux';
}