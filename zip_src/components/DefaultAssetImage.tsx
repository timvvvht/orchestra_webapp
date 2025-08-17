import React, { useEffect, useState } from 'react';
import { getDefaultAssetUrl, hasDefaultAsset } from '../utils/assetUtils';

interface DefaultAssetImageProps {
  /** Name of the default asset to display */
  name: string;
  /** Alt text for the image */
  alt: string;
  /** Optional CSS class name(s) */
  className?: string;
  /** Optional width */
  width?: number | string;
  /** Optional height */
  height?: number | string;
  /** Fallback URL to use if the asset doesn't exist */
  fallbackUrl?: string;
  /** Optional callback when the image is loaded */
  onLoad?: () => void;
  /** Optional callback when there's an error loading the image */
  onError?: (error: Error) => void;
}

/**
 * Component for displaying a default asset image from the bundled assets
 */
const DefaultAssetImage: React.FC<DefaultAssetImageProps> = ({
  name,
  alt,
  className,
  width,
  height,
  fallbackUrl,
  onLoad,
  onError
}) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    
    async function loadImage() {
      try {
        setLoading(true);
        
        // Check if the asset exists
        const exists = await hasDefaultAsset(name);
        
        if (exists) {
          // Get the asset URL
          const url = await getDefaultAssetUrl(name);
          if (isMounted) {
            setImageUrl(url);
            setError(null);
            if (onLoad) onLoad();
          }
        } else if (fallbackUrl && isMounted) {
          // Use fallback URL if provided
          setImageUrl(fallbackUrl);
          setError(null);
          if (onLoad) onLoad();
        } else if (isMounted) {
          // No fallback, set error
          const err = new Error(`Asset '${name}' not found`);
          setError(err);
          if (onError) onError(err);
        }
      } catch (err) {
        if (isMounted) {
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          if (onError) onError(error);
          
          // Use fallback URL if provided
          if (fallbackUrl) {
            setImageUrl(fallbackUrl);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    
    loadImage();
    
    return () => {
      isMounted = false;
      // Clean up object URL if needed
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [name, fallbackUrl, onLoad, onError]);

  if (loading) {
    return <div className={`default-asset-loading ${className || ''}`}>Loading...</div>;
  }

  if (error && !imageUrl) {
    return (
      <div className={`default-asset-error ${className || ''}`}>
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
          onError(new Error(`Failed to load image: ${name}`));
        }
      }}
    />
  );
};

export default DefaultAssetImage;