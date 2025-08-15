import { useEffect, createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Utility function to show a temporary notification
export const showNotification = (message: string, duration = 2000) => {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.position = 'fixed';
  notification.style.bottom = '20px';
  notification.style.right = '20px';
  notification.style.padding = '10px 16px';
  notification.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  notification.style.color = 'white';
  notification.style.borderRadius = '4px';
  notification.style.zIndex = '9999';
  notification.style.transition = 'opacity 0.3s ease';
  notification.style.opacity = '0';
  
  document.body.appendChild(notification);
  
  // Fade in
  setTimeout(() => {
    notification.style.opacity = '1';
  }, 10);
  
  // Remove after specified duration
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, duration);
};

// Define the shortcut type
export type KeyboardShortcut = {
  id: string;
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  description: string;
  group?: string;
  handler: () => void;
  global?: boolean; // Whether this shortcut works globally or only in specific contexts
  disabled?: boolean;
};

type KeyboardShortcutsContextType = {
  shortcuts: KeyboardShortcut[];
  registerShortcut: (shortcut: KeyboardShortcut) => void;
  unregisterShortcut: (id: string) => void;
  updateShortcut: (id: string, shortcut: Partial<KeyboardShortcut>) => void;
  disableShortcut: (id: string) => void;
  enableShortcut: (id: string) => void;
  getShortcutById: (id: string) => KeyboardShortcut | undefined;
  getShortcutsByGroup: (group: string) => KeyboardShortcut[];
};

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | undefined>(undefined);

export const useKeyboardShortcuts = () => {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error('useKeyboardShortcuts must be used within a KeyboardShortcutsProvider');
  }
  return context;
};

type KeyboardShortcutsProviderProps = {
  children: ReactNode;
};

export const KeyboardShortcutsProvider = ({ children }: KeyboardShortcutsProviderProps) => {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
  
  // Register a new shortcut - memoized to prevent unnecessary re-renders
  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    setShortcuts(prev => {
      // Check if shortcut with this ID already exists
      const exists = prev.some(s => s.id === shortcut.id);
      if (exists) {
        console.warn(`Shortcut with id ${shortcut.id} already exists. Updating instead.`);
        return prev.map(s => s.id === shortcut.id ? { ...s, ...shortcut } : s);
      }
      return [...prev, shortcut];
    });
  }, []);
  
  // Unregister a shortcut by ID
  const unregisterShortcut = useCallback((id: string) => {
    setShortcuts(prev => prev.filter(s => s.id !== id));
  }, []);
  
  // Update an existing shortcut
  const updateShortcut = useCallback((id: string, shortcut: Partial<KeyboardShortcut>) => {
    setShortcuts(prev => prev.map(s => s.id === id ? { ...s, ...shortcut } : s));
  }, []);
  
  // Disable a shortcut
  const disableShortcut = useCallback((id: string) => {
    updateShortcut(id, { disabled: true });
  }, [updateShortcut]);
  
  // Enable a shortcut
  const enableShortcut = useCallback((id: string) => {
    updateShortcut(id, { disabled: false });
  }, [updateShortcut]);
  
  // Get a shortcut by ID
  const getShortcutById = useCallback((id: string) => {
    return shortcuts.find(s => s.id === id);
  }, [shortcuts]);
  
  // Get shortcuts by group
  const getShortcutsByGroup = useCallback((group: string) => {
    return shortcuts.filter(s => s.group === group);
  }, [shortcuts]);
  
  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // We'll check for global shortcuts even in input fields
      // Only skip for regular text inputs when no modifier keys are pressed
      const hasModifier = event.metaKey || event.ctrlKey || event.altKey;
      const isTextInput = 
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target instanceof HTMLElement && event.target.getAttribute('role') === 'textbox');
      
      // Allow events with modifiers to pass through even in text inputs
      if (isTextInput && !hasModifier) {
        return;
      }
      
        // // Debug keyboard events
        // console.log('Keyboard event:', {
        //   key: event.key,
        //   code: event.code,
        //   metaKey: event.metaKey,
        //   ctrlKey: event.ctrlKey,
        //   altKey: event.altKey,
        //   shiftKey: event.shiftKey
        // });
      
      // Find matching shortcuts - prioritize global shortcuts in CodeMirror
      const isCodeMirrorEditor = 
        event.target instanceof HTMLElement && 
        (event.target.classList.contains('cm-content') || 
         event.target.closest('.cm-editor') !== null);
      
      // First check for global shortcuts
      const matchingShortcuts = shortcuts.filter(shortcut => {
        // Skip disabled shortcuts
        if (shortcut.disabled) return false;
        
        // In CodeMirror, only consider global shortcuts
        if (isCodeMirrorEditor && !shortcut.global) return false;
        
        // More robust key matching that handles different keyboard layouts
        let keyMatch = false;
        
        // Special case for common symbols that might have different representations
        const specialKeys: Record<string, string[]> = {
          '/': ['/', 'Slash'],
          '?': ['?', 'Slash'], // Shift+Slash on many keyboards
          '.': ['.', 'Period'],
          ',': [',', 'Comma'],
          ';': [';', 'Semicolon'],
          "'": ["'", 'Quote'],
          '\\': ['\\', 'Backslash'],
          '-': ['-', 'Minus'],
          '=': ['=', 'Equal'],
          '[': ['[', 'BracketLeft'],
          ']': [']', 'BracketRight'],
          '`': ['`', 'Backquote']
        };
        
        if (shortcut.key in specialKeys) {
          // For special keys, check both the key and the code
          const possibleKeys = specialKeys[shortcut.key];
          keyMatch = possibleKeys.includes(event.key) || possibleKeys.includes(event.code);
        } else if (shortcut.key.length === 1) {
          // For single character keys, compare case-insensitively
          keyMatch = shortcut.key.toLowerCase() === event.key.toLowerCase();
        } else {
          // For named keys (Enter, Escape, etc.), compare directly
          keyMatch = shortcut.key === event.key || shortcut.key === event.code;
        }
        
        const metaMatch = shortcut.metaKey === undefined || shortcut.metaKey === event.metaKey;
        const ctrlMatch = shortcut.ctrlKey === undefined || shortcut.ctrlKey === event.ctrlKey;
        const altMatch = shortcut.altKey === undefined || shortcut.altKey === event.altKey;
        const shiftMatch = shortcut.shiftKey === undefined || shortcut.shiftKey === event.shiftKey;
        
        // Debug matching for important shortcuts
        if ((shortcut.id === 'toggle-theme' || shortcut.id === 'open-settings') && 
            (event.metaKey || event.ctrlKey) && 
            (event.key === '/' || event.key === ',' || event.code === 'Slash' || event.code === 'Comma')) {
          console.log(`${shortcut.id} shortcut match details:`, {
            shortcutKey: shortcut.key,
            eventKey: event.key,
            eventCode: event.code,
            isCodeMirrorEditor,
            keyMatch,
            metaMatch,
            ctrlMatch,
            altMatch,
            shiftMatch
          });
        }
        
        return keyMatch && metaMatch && ctrlMatch && altMatch && shiftMatch;
      });
      
      // Execute matching shortcuts
      if (matchingShortcuts.length > 0) {
        // Stop propagation to prevent other handlers from executing
        event.stopPropagation();
        event.preventDefault();
        
        // Log which shortcut is being executed
        if (matchingShortcuts.some(s => s.id === 'toggle-theme' || s.id === 'open-settings')) {
          console.log('Executing global shortcut:', matchingShortcuts.map(s => s.id));
        }
        
        matchingShortcuts.forEach(shortcut => {
          try {
            shortcut.handler();
          } catch (error) {
            console.error(`Error executing shortcut ${shortcut.id}:`, error);
          }
        });
        
        // Return false to prevent default browser behavior
        return false;
      }
    };
    
    // Use the capture phase to ensure our handler runs before CodeMirror's handlers
    // The third parameter 'true' enables capture phase
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [shortcuts]);
  
  const value = {
    shortcuts,
    registerShortcut,
    unregisterShortcut,
    updateShortcut,
    disableShortcut,
    enableShortcut,
    getShortcutById,
    getShortcutsByGroup,
  };
  
  return (
    <KeyboardShortcutsContext.Provider value={value}>
      {children}
    </KeyboardShortcutsContext.Provider>
  );
};


export const useSettingsShortcut = () => {
  const { registerShortcut } = useKeyboardShortcuts();
  // Use try/catch to handle the case where this hook is used outside of a Router context
  let navigate: any;
  try {
    navigate = useNavigate();
  } catch (error) {
    console.warn('useNavigate hook failed, likely outside Router context');
    // We'll handle this case in the openSettings function
  }
  
  const registeredRef = useRef(false);
  
  useEffect(() => {
    // Function to open settings
    const openSettings = () => {
      console.log('Opening settings panel');
      
      // Only navigate if the navigate function is available
      if (navigate) {
        navigate('/settings');
        showNotification('Opening Settings');
      } else {
        console.warn('Cannot navigate to settings: Router context not available');
        showNotification('Settings shortcut registered (will work when app loads)', 3000);
        // If we can't navigate, we could try other approaches like:
        // 1. Using window.location.href (but this would cause a full page reload)
        // 2. Using a global event system to notify components that need to show settings
      }
    };
    
    // Register the shortcut only once
    if (!registeredRef.current) {
      // Detect platform to use appropriate modifier key
      const isMac = navigator.platform.toLowerCase().includes('mac');
      
      registerShortcut({
        id: 'open-settings',
        key: ',', // Comma key
        metaKey: isMac, // Cmd on Mac
        ctrlKey: !isMac, // Ctrl on Windows/Linux
        description: 'Open settings panel',
        group: 'general',
        global: true,
        handler: openSettings,
      });
      
      console.log(`Registered settings shortcut with ${isMac ? 'Cmd' : 'Ctrl'}+,`);
      registeredRef.current = true;
    }
    
    // No need to unregister as the provider handles cleanup
  }, [registerShortcut, navigate]);
};