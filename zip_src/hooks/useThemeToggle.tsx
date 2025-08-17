import { useEffect, useRef } from 'react';
import { useKeyboardShortcuts, showNotification } from './useKeyboardShortcuts';
import { useTheme } from '@/components/theme/theme-provider';

export const useThemeToggle = () => {
  const { registerShortcut } = useKeyboardShortcuts();
  const { theme, setTheme, availableThemes } = useTheme();
  const registeredRef = useRef(false);

  useEffect(() => {
    // Function to toggle between themes
    const toggleTheme = () => {
      // Find the current theme index
      const currentIndex = availableThemes.findIndex(t => t.id === theme);
      // Calculate the next theme index (cycling through available themes)
      const nextIndex = (currentIndex + 1) % availableThemes.length;
      // Get the next theme
      const nextTheme = availableThemes[nextIndex];
      
      // Set the new theme
      setTheme(nextTheme.id);
      showNotification(`Theme changed to ${nextTheme.name}`);
      console.log(`Theme toggled to: ${nextTheme.name}`);
    };
    
    // Register the shortcut only once
    if (!registeredRef.current) {
      // Detect platform to use appropriate modifier key
      const isMac = navigator.platform.toLowerCase().includes('mac');
      
      registerShortcut({
        id: 'toggle-theme',
        key: '/', // Forward slash key
        metaKey: isMac, // Cmd on Mac
        ctrlKey: !isMac, // Ctrl on Windows/Linux
        description: 'Toggle between themes',
        group: 'appearance',
        global: true,
        handler: toggleTheme,
      });
      
      console.log(`Registered theme toggle shortcut with ${isMac ? 'Cmd' : 'Ctrl'}+/`);
      registeredRef.current = true;
    }
    
    // No need to unregister as the provider handles cleanup
  }, [registerShortcut, theme, setTheme, availableThemes]);
};