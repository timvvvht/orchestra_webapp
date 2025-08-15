/**
 * Image Cache Utility
 * 
 * Provides a global cache for images to prevent repeated loading and UI blocking.
 */

import { getResourceUrl, resourceExists } from './assetUtils';

interface CacheEntry {
  url: string;
  loading: boolean;
  error: Error | null;
  timestamp: number;
}

// Global cache object
const imageCache: Record<string, CacheEntry> = {};

// Promises for resources that are currently loading
const loadingPromises: Record<string, Promise<string | null>> = {};

// Resolvers for the loading promises
const loadingResolvers: Record<string, (url: string | null) => void> = {};

// List of known robot avatars for preloading
const ROBOT_AVATARS = [
  'assets/robots/robot1.png',
  'assets/robots/robot2.png',
  'assets/robots/robot3.png',
  'assets/robots/robot4.png',
  'assets/robots/robot5.png',
  'assets/robots/robot6.png',
  'assets/robots/robot7.png',
  'assets/robots/robot8.png',
  'assets/robots/robot9.png',
  'assets/robots/robot10.png',
  'assets/robots/robot11.png',
  'assets/robots/robot12.png',
  'assets/robots/robot13.png',
];

/**
 * Get an image URL from the cache or load it if not cached
 * 
 * @param path The path to the resource
 * @param mimeType The MIME type of the resource
 * @returns A promise that resolves to the image URL or null if loading failed
 */
export async function getCachedImageUrl(path: string, mimeType: string = 'image/png'): Promise<string | null> {
  // Check if the image is already in the cache and loaded
  if (imageCache[path] && !imageCache[path].loading && !imageCache[path].error) {
    console.log(`[ImageCache] Cache hit for ${path}`);
    return imageCache[path].url;
  }
  
  // Check if the image is currently loading
  if (imageCache[path] && imageCache[path].loading) {
    // Create a promise that will resolve when the image is loaded
    // This is more efficient than polling with setInterval
    if (!loadingPromises[path]) {
      loadingPromises[path] = new Promise<string | null>((resolve) => {
        loadingResolvers[path] = (url: string | null) => {
          delete loadingPromises[path];
          delete loadingResolvers[path];
          resolve(url);
        };
      });
    }
    return loadingPromises[path];
  }
  
  // Image is not in cache or loading, load it now
  console.log(`[ImageCache] Cache miss for ${path}, loading resource`);
  
  // Create a loading entry in the cache
  imageCache[path] = {
    url: '',
    loading: true,
    error: null,
    timestamp: Date.now()
  };
  
  try {
    // Skip resource check for emoji avatars
    if (path.length <= 2 && /\p{Emoji}/u.test(path)) {
      // This is an emoji, not a file path
      imageCache[path] = {
        url: '',
        loading: false,
        error: null,
        timestamp: Date.now()
      };
      
      // Resolve any pending promises for this emoji
      if (loadingResolvers[path]) {
        loadingResolvers[path](null);
      }
      
      return null;
    }
    
    // Check if the resource exists
    const exists = await resourceExists(path);
    if (!exists) {
      console.error(`[ImageCache] Resource ${path} does not exist`);
      const errorObj = new Error(`Resource ${path} not found`);
      imageCache[path] = {
        url: '',
        loading: false,
        error: errorObj,
        timestamp: Date.now()
      };
      
      // Resolve any pending promises for this resource with null
      if (loadingResolvers[path]) {
        loadingResolvers[path](null);
      }
      
      return null;
    }
    
    // Load the resource
    const url = await getResourceUrl(path, mimeType);
    
    // Update the cache
    imageCache[path] = {
      url,
      loading: false,
      error: null,
      timestamp: Date.now()
    };
    
    // Resolve any pending promises for this resource
    if (loadingResolvers[path]) {
      loadingResolvers[path](url);
    }
    
    console.log(`[ImageCache] Successfully loaded ${path}`);
    return url;
  } catch (error) {
    console.error(`[ImageCache] Error loading ${path}:`, error);
    
    // Update the cache with the error
    const errorObj = error instanceof Error ? error : new Error(String(error));
    imageCache[path] = {
      url: '',
      loading: false,
      error: errorObj,
      timestamp: Date.now()
    };
    
    // Resolve any pending promises for this resource with null
    if (loadingResolvers[path]) {
      loadingResolvers[path](null);
    }
    
    return null;
  }
}

/**
 * Preload a list of images into the cache
 * 
 * @param paths List of resource paths to preload
 * @param mimeType The MIME type of the resources
 * @returns A promise that resolves when all images are loaded
 */
export async function preloadImages(paths: string[], mimeType: string = 'image/png'): Promise<void> {
  console.log(`[ImageCache] Preloading ${paths.length} images in parallel`);
  
  // Load all images in parallel
  await Promise.all(paths.map(path => getCachedImageUrl(path, mimeType)));
  
  console.log(`[ImageCache] Preloading complete`);
}

/**
 * Preload all robot avatars
 * 
 * @returns A promise that resolves when all robot avatars are loaded
 */
export async function preloadRobotAvatars(): Promise<void> {
  return preloadImages(ROBOT_AVATARS);
}

/**
 * Get a random robot avatar path
 * 
 * @returns A path to a random robot avatar
 */
export function getRandomRobotAvatar(): string {
  const index = Math.floor(Math.random() * ROBOT_AVATARS.length);
  return ROBOT_AVATARS[index];
}

/**
 * Clear the image cache
 */
export function clearImageCache(): void {
  // Revoke all object URLs to prevent memory leaks
  Object.values(imageCache).forEach(entry => {
    if (entry.url && entry.url.startsWith('blob:')) {
      URL.revokeObjectURL(entry.url);
    }
  });
  
  // Clear the cache object
  Object.keys(imageCache).forEach(key => {
    delete imageCache[key];
  });
  
  console.log(`[ImageCache] Cache cleared`);
}