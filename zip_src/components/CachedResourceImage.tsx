import React, { useEffect, useState } from 'react';
import ImageLoaderService from '../services/ImageLoaderService';

interface CachedResourceImageProps {
  /** Path to the resource file relative to the resources directory */
  path: string;
  /** Alt text for the image */
  alt: string;
  /** Optional CSS class name(s) */
  className?: string;
  /** Optional width */
  width?: number | string;
  /** Optional height */
  height?: number | string;
  /** MIME type of the resource (default: 'image/png') */
  mimeType?: string;
  /** Fallback URL to use if the resource doesn't load */
  fallbackUrl?: string;
  /** Optional callback when the image is loaded */
  onLoad?: () => void;
  /** Optional callback when there's an error loading the image */
  onError?: (error: Error) => void;
  /** Show a placeholder while loading */
  showPlaceholder?: boolean;
}

/**
 * Component for displaying an image from the bundled resources using the image cache
 */
const CachedResourceImage: React.FC<CachedResourceImageProps> = ({
  path,
  alt,
  className,
  width,
  height,
  mimeType = 'image/png',
  fallbackUrl,
  onLoad,
  onError,
  showPlaceholder = true
}) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    
    async function loadResource() {
      try {
        if (!isMounted) return;
        
        setLoading(true);
        
        // Check if this is an emoji avatar (not a file path)
        if (path.length <= 2 && /\p{Emoji}/u.test(path)) {
          // For emoji avatars, we don't need to load anything
          setImageUrl('');
          setError(null);
          setLoading(false);
          return;
        }
        
        // Use the service to get the image URL - this is non-blocking
        const imageLoader = ImageLoaderService.getInstance();
        const url = await imageLoader.loadImage(path, mimeType);
        
        if (!isMounted) return;
        
        if (url) {
          setImageUrl(url);
          setError(null);
          if (onLoad) onLoad();
        } else if (fallbackUrl) {
          setImageUrl(fallbackUrl);
          setError(null);
          if (onLoad) onLoad();
        } else {
          const err = new Error(`Failed to load resource: ${path}`);
          setError(err);
          if (onError) onError(err);
        }
      } catch (err) {
        if (!isMounted) return;
        
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        
        if (onError) onError(error);
        
        if (fallbackUrl) {
          setImageUrl(fallbackUrl);
        }
      } finally {
        if (isMounted) {
          // Add a small delay before removing the loading state to prevent flickering
          timeoutId = setTimeout(() => {
            if (isMounted) setLoading(false);
          }, 50);
        }
      }
    }
    
    loadResource();
    
    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [path, mimeType, fallbackUrl, onLoad, onError]);

  // Handle emoji avatars directly
  if (path.length <= 2 && /\p{Emoji}/u.test(path)) {
    return (
      <div className={`emoji-avatar flex items-center justify-center ${className || ''}`}>
        <span className="text-3xl">{path}</span>
      </div>
    );
  }
  
  if (loading && showPlaceholder) {
    return (
      <div className={`resource-loading flex items-center justify-center ${className || ''}`}>
        <div className="animate-pulse bg-gray-200 rounded-full h-full w-full"></div>
      </div>
    );
  }

  if (error && !imageUrl) {
    return (
      <div className={`resource-error flex items-center justify-center ${className || ''}`}>
        {/* Simple error icon */}
        <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      width={width}
      height={height}
      onLoad={() => {
        if (onLoad) onLoad();
      }}
      onError={() => {
        if (fallbackUrl && imageUrl !== fallbackUrl) {
          setImageUrl(fallbackUrl);
        } else if (onError) {
          onError(new Error(`Failed to load resource: ${path}`));
        }
      }}
    />
  );
};

export default CachedResourceImage;