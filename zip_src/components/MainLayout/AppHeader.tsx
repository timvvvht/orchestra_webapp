import React from 'react';
import { FiX, FiMinus, FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import IconWrapper from '../IconWrapper';
import { useMainLayout } from './MainLayoutContext';
import { useLocation } from 'react-router-dom';
import { clsx } from 'clsx';

interface AppHeaderProps {
  title?: string;
  isMaximized: boolean;
  currentPlatform: string | null;
  onMinimize: () => Promise<void>;
  onMaximize: () => Promise<void>;
  onClose: () => Promise<void>;
  onTitlebarDoubleClick: () => Promise<void>;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title = '',
  isMaximized,
  currentPlatform,
  onMinimize,
  onMaximize,
  onClose,
  onTitlebarDoubleClick
}) => {
  const { 
    filePath, 
    unsavedChanges, 
    isLoading, 
    showFilePanel,
    toggleFilePanel,
    handleSave 
  } = useMainLayout();
  
  // Determine if we should show window controls based on platform
  const showWindowControls = currentPlatform !== 'macos';
  
  const { pathname } = useLocation();
  const isLandingPage = pathname === '/landing';
  
  return (
    <div 
      className={clsx(
      )}
      style={{ backgroundColor: 'transparent', zIndex: 1 }}
      data-tauri-drag-region
      onDoubleClick={onTitlebarDoubleClick}
    >
      {/* Left section */}
      {/* <HeaderLeft 
        showFilePanel={showFilePanel} 
        toggleFilePanel={toggleFilePanel} 
        filePath={filePath}
      /> */}
      
      {/* Center section */}
      <HeaderCenter title={title} />

      {/* Right section */}
      <HeaderRight 
        filePath={filePath}
        unsavedChanges={unsavedChanges}
        isLoading={isLoading}
        handleSave={handleSave}
        showWindowControls={showWindowControls}
        isMaximized={isMaximized}
        onMinimize={onMinimize}
        onMaximize={onMaximize}
        onClose={onClose}
      />
    </div>
  );
};

interface HeaderLeftProps {
  showFilePanel: boolean;
  toggleFilePanel: () => void;
  filePath: string | undefined;
}


interface HeaderCenterProps {
  title?: string;
}

const HeaderCenter: React.FC<HeaderCenterProps> = ({ title = 'Orchestra' }) => {
  return (
    <div className="header-center" data-tauri-drag-region>
      <span className="app-title" style={{ visibility: 'hidden' }}>{title}</span>
    </div>
  );
};

interface HeaderRightProps {
  filePath: string | undefined;
  unsavedChanges: boolean;
  isLoading: boolean;
  handleSave: () => Promise<boolean>;
  showWindowControls: boolean;
  isMaximized: boolean;
  onMinimize: () => Promise<void>;
  onMaximize: () => Promise<void>;
  onClose: () => Promise<void>;
}

const HeaderRight: React.FC<HeaderRightProps> = ({ 
  filePath, 
  unsavedChanges, 
  isLoading, 
  handleSave,
  showWindowControls,
  isMaximized,
  onMinimize,
  onMaximize,
  onClose
}) => {
  return (
    <div className="header-right" data-tauri-drag-region>
      {unsavedChanges && <div className="save-indicator" title="Unsaved changes"></div>}
      
      {/* Window controls - only shown on Windows/Linux */}
      {showWindowControls && (
        <WindowControls 
          isMaximized={isMaximized}
          onMinimize={onMinimize}
          onMaximize={onMaximize}
          onClose={onClose}
        />
      )}
    </div>
  );
};

interface WindowControlsProps {
  isMaximized: boolean;
  onMinimize: () => Promise<void>;
  onMaximize: () => Promise<void>;
  onClose: () => Promise<void>;
}

const WindowControls: React.FC<WindowControlsProps> = ({ 
  isMaximized, 
  onMinimize, 
  onMaximize, 
  onClose 
}) => {
  return (
    <div className="window-controls">
      <button 
        className="window-button minimize" 
        onClick={onMinimize}
        aria-label="Minimize"
      >
        {/* <IconWrapper 
          icon={FiMinus} 
          size={14} 
          library="feather" 
          color="#aaa" 
        /> */}
      </button>
      <button 
        className="window-button maximize" 
        onClick={onMaximize}
        aria-label="Maximize"
      >
        {isMaximized ? 
          <IconWrapper 
            icon={FiMinimize2} 
            size={14} 
            library="feather" 
            color="#aaa" 
          /> : 
          <IconWrapper 
            icon={FiMaximize2} 
            size={14} 
            library="feather" 
            color="#aaa" 
          />
        }
      </button>
      <button 
        className="window-button close" 
        onClick={onClose}
        aria-label="Close"
      >
        <IconWrapper 
          icon={FiX} 
          size={14} 
          library="feather" 
          color="#aaa" 
        />
      </button>
    </div>
  );
};

export default AppHeader;