import { useEffect, useState } from 'react';
import ImageLoaderService from '../services/ImageLoaderService';

// Global flag to track if preloading has already been done
let preloadingComplete = false;

interface ResourcePreloaderProps {
  /** Optional callback when preloading is complete */
  onComplete?: () => void;
  /** Children to render */
  children: React.ReactNode;
}

/**
 * Component that preloads resources when mounted
 */
const ResourcePreloader: React.FC<ResourcePreloaderProps> = ({ onComplete, children }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadResources() {
      // Skip if preloading is already complete
      if (preloadingComplete) {
        console.log('[ResourcePreloader] Preloading already completed, skipping');
        setIsLoading(false);
        if (onComplete) onComplete();
        return;
      }
      
      try {
        console.log('[ResourcePreloader] Starting preload of robot avatars');
        const imageLoader = ImageLoaderService.getInstance();
        const robotAvatars = imageLoader.getRobotAvatars();
        await imageLoader.preloadImages(robotAvatars);
        preloadingComplete = true;
        console.log('[ResourcePreloader] Preloading complete');
        
        if (isMounted) {
          setIsLoading(false);
          if (onComplete) onComplete();
        }
      } catch (error) {
        console.error('[ResourcePreloader] Error preloading resources:', error);
        if (isMounted) {
          setIsLoading(false);
          if (onComplete) onComplete();
        }
      }
    }

    loadResources();

    return () => {
      isMounted = false;
    };
  }, [onComplete]);

  return <>{children}</>;
};

export default ResourcePreloader;