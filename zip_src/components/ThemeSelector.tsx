import React, { useState, useEffect, useRef } from 'react';
import './ThemeSelector.css';
import { useTheme } from './theme-provider';
import { FiSun, FiMoon, FiMonitor, FiUpload } from 'react-icons/fi';
import IconWrapper from './IconWrapper';

interface ThemeSelectorProps {
  // No props needed as we'll use the context
}

interface ThemeGroup {
  name: string;
  themes: {id: string, name: string}[];
}

const ThemeSelector: React.FC<ThemeSelectorProps> = () => {
  const { 
    themeId, 
    setThemeId, 
    mode, 
    setMode,
    availableThemes
  } = useTheme();
  
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [themeGroups, setThemeGroups] = useState<ThemeGroup[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Load and organize available themes
  useEffect(() => {
    console.log('Available themes:', availableThemes);
    
    // Group themes by type (built-in, custom, etc.)
    const builtInThemes = availableThemes.filter(t => 
      t.id.startsWith('default-') || t.id === 'ocean-blue' || t.id === 'sakura'
    );
    
    const customThemes = availableThemes.filter(t => 
      !t.id.startsWith('default-') && t.id !== 'ocean-blue' && t.id !== 'sakura'
    );
    
    const groups: ThemeGroup[] = [
      { name: 'Built-in Themes', themes: builtInThemes }
    ];
    
    if (customThemes.length > 0) {
      groups.push({ name: 'Custom Themes', themes: customThemes });
    }
    
    setThemeGroups(groups);
  }, [availableThemes]);

  // Handle theme changing
  const changeTheme = (newThemeId: string) => {
    console.log('Changing theme to:', newThemeId);
    setThemeId(newThemeId);
    setIsDropdownOpen(false);
  };

  // Handle theme mode changing
  const changeThemeMode = (newMode: 'light' | 'dark' | 'system') => {
    console.log('Changing theme mode to:', newMode);
    setMode(newMode);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Handle importing a theme file
  const handleImportTheme = async () => {
    try {
      // Close the dropdown and navigate to the theme settings page
      setIsDropdownOpen(false);
      window.location.href = '/settings';
    } catch (error) {
      console.error('Error importing theme:', error);
    }
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && isDropdownOpen) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Find current theme name
  const currentThemeName = availableThemes.find(theme => theme.id === themeId)?.name || 'Light';

  return (
    <div className="theme-selector-container" ref={dropdownRef}>
      <button 
        className="theme-selector-button"
        onClick={toggleDropdown}
        title="Change theme"
      >
        <span className="theme-icon">
          {mode === 'light' && <IconWrapper icon={FiSun} />}
          {mode === 'dark' && <IconWrapper icon={FiMoon} />}
          {mode === 'system' && <IconWrapper icon={FiMonitor} />}
        </span>
        <span className="theme-name">{currentThemeName}</span>
      </button>
      
      {isDropdownOpen && (
        <div className="theme-dropdown">
          <div className="theme-dropdown-header">Theme Settings</div>
          
          {/* Theme Mode Switcher */}
          <div className="theme-mode-section">
            <div className="theme-section-title">Mode</div>
            <div className="theme-mode-switcher">
              <button 
                className={`mode-button ${mode === 'light' ? 'active' : ''}`}
                onClick={() => changeThemeMode('light')}
                title="Light Mode"
              >
                <IconWrapper icon={FiSun} />
              </button>
              <button 
                className={`mode-button ${mode === 'dark' ? 'active' : ''}`}
                onClick={() => changeThemeMode('dark')}
                title="Dark Mode"
              >
                <IconWrapper icon={FiMoon} />
              </button>
              <button 
                className={`mode-button ${mode === 'system' ? 'active' : ''}`}
                onClick={() => changeThemeMode('system')}
                title="System Mode"
              >
                <IconWrapper icon={FiMonitor} />
              </button>
            </div>
          </div>
          
          {/* Theme Selection */}
          <div className="theme-selection-section">
            <div className="theme-section-title">Theme</div>
            
            {themeGroups.map((group, index) => (
              <div className="theme-group" key={index}>
                <div className="theme-group-title">{group.name}</div>
                <ul className="theme-list">
                  {group.themes.map((theme) => (
                    <li 
                      key={theme.id}
                      className={`theme-item ${theme.id === themeId ? 'active' : ''}`}
                      onClick={() => changeTheme(theme.id)}
                    >
                      <div className="theme-color-preview" data-theme-id={theme.id}></div>
                      <div className="theme-item-name">{theme.name}</div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            
            {/* Keyboard shortcut hint */}
            <div className="theme-shortcut-hint">
              <small>Tip: Press <kbd>⌘</kbd>+<kbd>T</kbd> to cycle through themes</small>
            </div>
          </div>
          
          {/* Theme Actions */}
          <div className="theme-actions">
            <button className="theme-action" onClick={handleImportTheme}>
              <IconWrapper icon={FiUpload} />
              <span>Import Theme</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSelector;