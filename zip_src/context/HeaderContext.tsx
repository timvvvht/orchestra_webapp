import React, { createContext, useContext, useState, ReactNode } from 'react';

interface HeaderContextType {
  title: string;
  setTitle: (title: string) => void;
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

interface HeaderProviderProps {
  children: ReactNode;
  defaultTitle?: string;
}

export const HeaderProvider: React.FC<HeaderProviderProps> = ({ 
  children, 
  defaultTitle = "Orchestra" 
}) => {
  const [title, setTitle] = useState(defaultTitle);

  return (
    <HeaderContext.Provider value={{ title, setTitle }}>
      {children}
    </HeaderContext.Provider>
  );
};

export const useHeader = (): HeaderContextType => {
  const context = useContext(HeaderContext);
  if (context === undefined) {
    throw new Error('useHeader must be used within a HeaderProvider');
  }
  return context;
};

export default HeaderContext;