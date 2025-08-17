import React, { useEffect, useState } from 'react';
import { readFile } from '@tauri-apps/plugin-fs';
import { BaseDirectory, resolveResource } from '@tauri-apps/api/path';

interface TauriResourceImageProps {
  resourcePath: string;
  alt: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  fallbackContent?: React.ReactNode;
}

const TauriResourceImage: React.FC<TauriResourceImageProps> = ({
  resourcePath,
  alt,
  className,
  width,
  height,
  fallbackContent
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let objectUrl: string | null = null;

    async function loadResource() {
      try {
        console.log(`[TauriResourceImage] Attempting to load resource: ${resourcePath}`);
        
        // First, try to resolve the resource path
        console.log(`[TauriResourceImage] Resolving resource path: ${resourcePath}`);
        const fullPath = await resolveResource(resourcePath);
        console.log(`[TauriResourceImage] Resolved path: ${fullPath}`);
        
        // Read the file as binary
        const data = await readFile(resourcePath, { baseDir: BaseDirectory.Resource });
        console.log(`[TauriResourceImage] Read binary file, size: ${data.length} bytes`);
        
        // Convert to blob URL
        const blob = new Blob([data], { type: 'image/png' });
        objectUrl = URL.createObjectURL(blob);
        
        if (mounted) {
          setImageUrl(objectUrl);
          setError(null);
          console.log(`[TauriResourceImage] Successfully loaded: ${resourcePath}`);
        }
      } catch (err) {
        console.error(`[TauriResourceImage] Error loading resource: ${resourcePath}`, err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadResource();

    return () => {
      mounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [resourcePath]);

  if (loading) {
    return <div className={className}>Loading...</div>;
  }

  if (error || !imageUrl) {
    return fallbackContent ? (
      <>{fallbackContent}</>
    ) : (
      <div className={className}>Failed to load image</div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      width={width}
      height={height}
    />
  );
};

export default TauriResourceImage;