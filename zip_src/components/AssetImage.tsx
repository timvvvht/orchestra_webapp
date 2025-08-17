import React, { useEffect, useState } from 'react';
import { getResourceUrl, resourceExists } from '../utils/assetUtils';

interface ResourceImageProps {
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
}

/**
 * Component for displaying an image from the bundled resources
 */
const ResourceImage: React.FC<ResourceImageProps> = ({
  path,
  alt,
  className,
  width,
  height,
  mimeType = 'image/png',
  fallbackUrl,
  onLoad,
  onError
}) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    
    async function loadResource() {
      try {
        setLoading(true);
        console.log(`[ResourceImage] Loading resource: ${path}`);
        
        // Check if the resource exists
        console.log(`[ResourceImage] Checking if resource exists: ${path}`);
        const exists = await resourceExists(path);
        console.log(`[ResourceImage] Resource exists check result: ${exists} for ${path}`);
        
        if (exists) {
          // Get the resource URL
          console.log(`[ResourceImage] Getting resource URL for: ${path}`);
          const url = await getResourceUrl(path, mimeType);
          console.log(`[ResourceImage] Got resource URL: ${url.substring(0, 30)}... for ${path}`);
          
          if (isMounted) {
            setImageUrl(url);
            setError(null);
            console.log(`[ResourceImage] Successfully set image URL for: ${path}`);
            if (onLoad) {
              console.log(`[ResourceImage] Calling onLoad callback for: ${path}`);
              onLoad();
            }
          }
        } else if (fallbackUrl && isMounted) {
          // Use fallback URL if provided
          console.log(`[ResourceImage] Resource not found, using fallback URL: ${fallbackUrl} for ${path}`);
          setImageUrl(fallbackUrl);
          setError(null);
          if (onLoad) onLoad();
        } else if (isMounted) {
          // No fallback, set error
          console.error(`[ResourceImage] Resource not found and no fallback URL provided: ${path}`);
          const err = new Error(`Resource '${path}' not found`);
          setError(err);
          if (onError) {
            console.log(`[ResourceImage] Calling onError callback for: ${path}`);
            onError(err);
          }
        }
      } catch (err) {
        console.error(`[ResourceImage] Error loading resource: ${path}`, err);
        if (isMounted) {
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          if (onError) {
            console.log(`[ResourceImage] Calling onError callback for: ${path}`);
            onError(error);
          }
          
          // Use fallback URL if provided
          if (fallbackUrl) {
            console.log(`[ResourceImage] Using fallback URL after error: ${fallbackUrl} for ${path}`);
            setImageUrl(fallbackUrl);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          console.log(`[ResourceImage] Loading state set to false for: ${path}`);
        }
      }
    }
    
    loadResource();
    
    return () => {
      isMounted = false;
      // Clean up object URL if needed
      if (imageUrl && imageUrl.startsWith('blob:')) {
        console.log(`[ResourceImage] Cleaning up object URL for: ${path}`);
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [path, mimeType, fallbackUrl, onLoad, onError]);

  if (loading) {
    return <div className={`resource-loading ${className || ''}`}>Loading...</div>;
  }

  if (error && !imageUrl) {
    return (
      <div className={`resource-error ${className || ''}`}>
        Failed to load image
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

export default ResourceImage;