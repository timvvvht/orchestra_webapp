import { useSettingsShortcut } from '@/hooks/useKeyboardShortcuts';
import { useSearchShortcut } from '@/hooks/useSearchShortcut';
import { useThemeToggle } from '@/hooks/useThemeToggle';
import { useNavigationShortcuts } from '@/hooks/useNavigationShortcuts';
import KeyboardShortcutsDialog from './KeyboardShortcutsDialog';

// This component sets up keyboard shortcuts and renders the shortcuts dialog
export const KeyboardShortcutsManager = () => {
  // Set up theme toggle shortcut
  useThemeToggle();
  
  // Set up settings panel shortcut
  useSettingsShortcut();
  
  // Set up search shortcut
  useSearchShortcut();
  
  // Set up navigation shortcuts (Cmd+1/2/3 and Cmd+N)
  useNavigationShortcuts();
  
  // You can add more shortcut initializations here
  
  return (
    <KeyboardShortcutsDialog />
  );
};

export default KeyboardShortcutsManager;