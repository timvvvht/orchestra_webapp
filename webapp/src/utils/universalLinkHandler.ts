import { fileNavigationService } from './fileNavigation';
import { handleLinkClick } from '@/utils/tauriLinks';

export interface LinkHandlerOptions {
  showErrorToast?: boolean;
  validateExists?: boolean;
  preventDefault?: boolean;
}

/**
 * Universal link handler that processes all link types
 * @param href - Link URL
 * @param event - Optional click event
 * @param options - Handler options
 */
export const handleUniversalLink = async (
  href: string, 
  event?: React.MouseEvent, 
  options: LinkHandlerOptions = {}
): Promise<void> => {
  const { showErrorToast = true, validateExists = false, preventDefault = true } = options;
  
  console.log('[UniversalLinkHandler] Processing link:', href);
  
  if (!href) {
    console.warn('[UniversalLinkHandler] No href provided');
    return;
  }

  // Handle vault:// links
  if (href.startsWith('vault://')) {
    if (preventDefault && event) {
      event.preventDefault();
    }
    
    try {
      const identifier = fileNavigationService.extractFromVaultLink(href);
      console.log('[UniversalLinkHandler] Extracted vault identifier:', identifier);
      
      await fileNavigationService.navigateToFile(identifier, {
        showErrorToast,
        validateExists
      });
    } catch (error) {
      console.error('[UniversalLinkHandler] Failed to handle vault link:', error);
      
      if (showErrorToast) {
        const { toast } = await import('sonner');
        toast.error('Navigation failed', {
          description: 'Could not open the requested file',
          duration: 4000,
        });
      }
    }
    return;
  }

  // Handle other link types using existing Tauri handler
  try {
    console.log('[UniversalLinkHandler] Delegating to Tauri link handler');
    handleLinkClick(event, href);
  } catch (error) {
    console.error('[UniversalLinkHandler] Tauri link handler failed:', error);
    
    if (showErrorToast) {
      const { toast } = await import('sonner');
      toast.error('Link failed', {
        description: 'Could not open the requested link',
        duration: 4000,
      });
    }
  }
};

/**
 * Creates a click handler function for use in React components
 * @param href - Link URL
 * @param options - Handler options
 * @returns Click handler function
 */
export const createLinkClickHandler = (
  href: string, 
  options: LinkHandlerOptions = {}
) => {
  return (event: React.MouseEvent) => {
    handleUniversalLink(href, event, options);
  };
};

/**
 * Determines if a link should be handled by the universal handler
 * @param href - Link URL
 * @returns true if it should be handled universally
 */
export const shouldHandleUniversally = (href: string): boolean => {
  if (!href) return false;
  
  return href.startsWith('vault://') ||
         href.startsWith('http://') ||
         href.startsWith('https://') ||
         href.startsWith('file://') ||
         href.startsWith('mailto:');
};