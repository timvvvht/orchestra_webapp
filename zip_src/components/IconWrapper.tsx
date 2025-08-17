import React from 'react';

/**
 * Explicitly type icon libraries to avoid detection issues
 */
type IconLibrary = 'feather' | 'material' | 'fontawesome' | 'ionicons' | 'auto';

interface IconWrapperProps {
  icon: React.ElementType;
  size?: number;
  className?: string;
  color?: string;
  style?: React.CSSProperties;
  library?: IconLibrary;
  [key: string]: any;
}

/**
 * IconWrapper - A consistent wrapper for React icons 
 * Simplified to maximize compatibility
 */
export const IconWrapper: React.FC<IconWrapperProps> = ({ 
  icon: Icon, 
  size = 16, 
  className = '', 
  color = '#aaa',
  style = {},
  library = 'auto',
  ...props 
}) => {
  // Extract library from icon name if set to auto
  let detectedLibrary = library;
  let iconName = '';
  
  if (library === 'auto') {
    // Try to get the display name or function name
    iconName = (Icon as any).displayName || (typeof Icon === 'function' ? (Icon as any).name : '');
    
    if (iconName.startsWith('Fi')) {
      detectedLibrary = 'feather';
    } else if (iconName.startsWith('Md')) {
      detectedLibrary = 'material';
    } else if (iconName.startsWith('Fa')) {
      detectedLibrary = 'fontawesome';
    } else if (iconName.startsWith('Io')) {
      detectedLibrary = 'ionicons';
    } else {
      // Default to feather - this is safer for outlined icons
      detectedLibrary = 'feather';
    }
  }
  
  // Apply library-specific styling - using explicit colors
  let iconStyle: React.CSSProperties = { 
    color: color,
    ...style
  };
  
  // Add data attributes to help with CSS selector targeting
  const dataProps = {
    'data-icon': iconName, // Add the icon name as data attribute
    'data-library': detectedLibrary, // Add the library type
    'data-visible': 'true', // Debug attribute to check visibility
  };
  
  // Apply specific styling based on library
  if (detectedLibrary === 'feather') {
    // Feather icons need stroke and no fill
    iconStyle = {
      ...iconStyle,
      stroke: color,
      fill: 'none',
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      opacity: 1,
      visibility: 'visible',
    };
  } else {
    // Other icon libraries typically use fill
    iconStyle = {
      ...iconStyle,
      fill: color,
      stroke: 'none',
      opacity: 1,
      visibility: 'visible',
    };
  }
  
  // Add the library to the className to enable CSS targeting
  const augmentedClassName = `${className} icon-${detectedLibrary}`.trim();
  
  return (
    <Icon 
      size={size} 
      className={augmentedClassName}
      style={iconStyle} 
      {...dataProps}
      {...props} 
    />
  );
};

export default IconWrapper;