import React from 'react';
import { Outlet } from 'react-router-dom';
import AppHeader from './AppHeader';
import LeftRail from '@/components/navigation/LeftRail';
import { HeaderProvider, useHeader } from '@/context/HeaderContext';
import { MainLayoutProvider } from './MainLayoutContext';

interface RootLayoutProps {
  // Add any props that might be needed for the header
}

/**
 * RootLayoutContent - The inner component that consumes HeaderContext
 */
const RootLayoutContent: React.FC = () => {
  const { title } = useHeader();

  // For now, we'll use basic window control handlers
  // In a real Tauri app, these would connect to the Tauri API
  const handleMinimize = async () => {
    console.log('Minimize window');
    // TODO: Implement actual window minimize via Tauri API
  };

  const handleMaximize = async () => {
    console.log('Maximize window');
    // TODO: Implement actual window maximize via Tauri API
  };

  const handleClose = async () => {
    console.log('Close window');
    // TODO: Implement actual window close via Tauri API
  };

  const handleTitlebarDoubleClick = async () => {
    console.log('Titlebar double click');
    // TODO: Implement actual window toggle maximize via Tauri API
  };

  // Detect platform for window controls
  const currentPlatform = React.useMemo(() => {
    return navigator.platform.toLowerCase().includes('mac') ? 'macos' : 'windows';
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden min-h-0 bg-gray-100 dark:bg-gray-900">
      {/* LeftRail is now always present */}
      <LeftRail />
      
      {/* Main content area with header and page content */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* AppHeader is now always present with dynamic title */}
        <AppHeader
          title={title}
          currentPlatform={currentPlatform}
          isMaximized={false}
          onMinimize={handleMinimize}
          onMaximize={handleMaximize}
          onClose={handleClose}
          onTitlebarDoubleClick={handleTitlebarDoubleClick}
        />
        
        {/* Content area for nested routes */}
        <div className="flex-1 overflow-hidden min-h-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

/**
 * RootLayout - The top-level layout component that ensures AppHeader 
 * is rendered on every route, including /landing.
 * 
 * This component wraps all routes and provides:
 * - Consistent AppHeader across all pages
 * - Draggable window region functionality
 * - HeaderContext for dynamic title management
 * - Outlet for nested route content
 */
const RootLayout: React.FC<RootLayoutProps> = () => {
  return (
    <HeaderProvider defaultTitle="Orchestra">
      <MainLayoutProvider>
        <RootLayoutContent />
      </MainLayoutProvider>
    </HeaderProvider>
  );
};

export default RootLayout;