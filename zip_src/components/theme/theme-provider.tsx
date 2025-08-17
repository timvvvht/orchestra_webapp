import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = {
  id: string;
  name: string;
};

type ThemeContextType = {
  theme: string;
  setTheme: (themeId: string) => void;
  availableThemes: Theme[];
};

const defaultThemes: Theme[] = [
  { id: 'light', name: 'Light' },
  { id: 'dark', name: 'Dark' },
  { id: 'sleek-dark', name: 'Sleek Dark' },
  // Add more themes here as needed
];

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [availableThemes] = useState<Theme[]>(defaultThemes);
  const [theme, setThemeState] = useState<string>('dark');

  // Apply theme when it changes
  useEffect(() => {
    // Set the data-theme attribute on the document element
    document.documentElement.dataset.theme = theme;
    console.log('Theme changed to:', theme);
  }, [theme]);

  const setTheme = (newTheme: string) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      availableThemes
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}