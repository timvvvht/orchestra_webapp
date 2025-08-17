/**
 * Service for loading images in a background thread
 */

import { v4 as uuidv4 } from 'uuid';
import { getResourceUrl, resourceExists } from '../utils/assetUtils';

// Define the message types
type WorkerMessage =
    | {
          type: 'LOAD_IMAGE';
          id: string;
          path: string;
          mimeType: string;
      }
    | {
          type: 'PRELOAD_IMAGES';
          id: string;
          paths: string[];
          mimeType: string;
      };

type WorkerResponse =
    | {
          type: 'IMAGE_LOADED';
          id: string;
          path: string;
          success: boolean;
          url?: string;
          error?: string;
      }
    | {
          type: 'PRELOAD_COMPLETE';
          id: string;
          results: Array<{ path: string; success: boolean; error?: string }>;
      };

interface CacheEntry {
    url: string;
    loading: boolean;
    error: Error | null;
    timestamp: number;
}

type ImageLoadCallback = (url: string | null, error?: Error) => void;

class ImageLoaderService {
    private static instance: ImageLoaderService;
    private worker: Worker | null = null;
    private callbacks: Record<string, ImageLoadCallback> = {};
    private cache: Record<string, CacheEntry> = {};
    private preloadCallbacks: Record<string, () => void> = {};
    private isInitialized = false;

    private constructor() {
        // Private constructor to enforce singleton
    }

    public static getInstance(): ImageLoaderService {
        if (!ImageLoaderService.instance) {
            ImageLoaderService.instance = new ImageLoaderService();
        }
        return ImageLoaderService.instance;
    }

    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // In a real implementation, we'd use a Web Worker
            // this.worker = new Worker(new URL('../workers/imageLoader.worker.ts', import.meta.url), { type: 'module' });
            // this.worker.onmessage = this.handleWorkerMessage.bind(this);

            // For now, we'll use a direct implementation without a worker
            // but with non-blocking behavior

            this.isInitialized = true;
            // console.log('[ImageLoaderService] Initialized');
        } catch (error) {
            console.error('[ImageLoaderService] Failed to initialize:', error);
        }
    }

    private handleWorkerMessage(event: MessageEvent<WorkerResponse>): void {
        const message = event.data;

        switch (message.type) {
            case 'IMAGE_LOADED':
                this.handleImageLoaded(message);
                break;
            case 'PRELOAD_COMPLETE':
                this.handlePreloadComplete(message);
                break;
        }
    }

    private handleImageLoaded(message: WorkerResponse & { type: 'IMAGE_LOADED' }): void {
        const callback = this.callbacks[message.id];
        if (callback) {
            if (message.success && message.url) {
                // Update cache
                this.cache[message.path] = {
                    url: message.url,
                    loading: false,
                    error: null,
                    timestamp: Date.now()
                };
                callback(message.url);
            } else {
                const error = new Error(message.error || 'Unknown error');
                this.cache[message.path] = {
                    url: '',
                    loading: false,
                    error,
                    timestamp: Date.now()
                };
                callback(null, error);
            }
            delete this.callbacks[message.id];
        }
    }

    private handlePreloadComplete(message: WorkerResponse & { type: 'PRELOAD_COMPLETE' }): void {
        const callback = this.preloadCallbacks[message.id];
        if (callback) {
            callback();
            delete this.preloadCallbacks[message.id];
        }
    }

    /**
     * Load an image in the background
     *
     * @param path Path to the image
     * @param mimeType MIME type of the image
     * @returns A promise that resolves to the image URL or null if loading failed
     */
    public async loadImage(path: string, mimeType: string = 'image/png'): Promise<string | null> {
        await this.initialize();

        // Skip emoji avatars
        if (path.length <= 2 && /\p{Emoji}/u.test(path)) {
            return null;
        }

        // Check cache first
        if (this.cache[path] && !this.cache[path].loading) {
            // console.log(`[ImageLoaderService] Cache hit for ${path}`);
            return this.cache[path].error ? null : this.cache[path].url;
        }

        // Set loading state in cache
        this.cache[path] = this.cache[path] || {
            url: '',
            loading: true,
            error: null,
            timestamp: Date.now()
        };

        // If we're using a worker, send a message
        if (this.worker) {
            return new Promise<string | null>(resolve => {
                const id = uuidv4();
                this.callbacks[id] = (url, error) => {
                    resolve(url);
                };

                const message: WorkerMessage = {
                    type: 'LOAD_IMAGE',
                    id,
                    path,
                    mimeType
                };
                this.worker!.postMessage(message);
            });
        } else {
            // Direct implementation without a worker
            return this.loadImageDirect(path, mimeType);
        }
    }

    /**
     * Direct implementation of image loading without a worker
     * This uses setTimeout to avoid blocking the main thread
     */
    private loadImageDirect(path: string, mimeType: string): Promise<string | null> {
        return new Promise<string | null>(resolve => {
            // Use setTimeout to make this non-blocking
            setTimeout(async () => {
                try {
                    // Check if the resource exists
                    const exists = await resourceExists(path);

                    if (!exists) {
                        console.error(`[ImageLoaderService] Resource ${path} does not exist`);
                        this.cache[path] = {
                            url: '',
                            loading: false,
                            error: new Error(`Resource ${path} not found`),
                            timestamp: Date.now()
                        };
                        resolve(null);
                        return;
                    }

                    // Get the resource URL
                    const url = await getResourceUrl(path, mimeType);

                    // Update cache
                    this.cache[path] = {
                        url,
                        loading: false,
                        error: null,
                        timestamp: Date.now()
                    };

                    // console.log(`[ImageLoaderService] Successfully loaded ${path}`);
                    resolve(url);
                } catch (error) {
                    console.error(`[ImageLoaderService] Error loading ${path}:`, error);

                    this.cache[path] = {
                        url: '',
                        loading: false,
                        error: error instanceof Error ? error : new Error(String(error)),
                        timestamp: Date.now()
                    };

                    resolve(null);
                }
            }, 0); // 0ms timeout to push to the next event loop iteration
        });
    }

    /**
     * Preload multiple images in the background
     *
     * @param paths Paths to the images
     * @param mimeType MIME type of the images
     * @returns A promise that resolves when all images are loaded
     */
    public async preloadImages(paths: string[], mimeType: string = 'image/png'): Promise<void> {
        await this.initialize();

        // console.log(`[ImageLoaderService] Preloading ${paths.length} images`);

        // Filter out emoji avatars and already loaded images
        const pathsToLoad = paths.filter(path => {
            // Skip emoji avatars
            if (path.length <= 2 && /\p{Emoji}/u.test(path)) {
                return false;
            }

            // Skip already loaded images
            if (this.cache[path] && !this.cache[path].loading) {
                return false;
            }

            return true;
        });

        if (pathsToLoad.length === 0) {
            // console.log('[ImageLoaderService] No images to preload');
            return;
        }

        // If we're using a worker, send a message
        if (this.worker) {
            return new Promise<void>(resolve => {
                const id = uuidv4();
                this.preloadCallbacks[id] = () => {
                    resolve();
                };

                const message: WorkerMessage = {
                    type: 'PRELOAD_IMAGES',
                    id,
                    paths: pathsToLoad,
                    mimeType
                };
                this.worker!.postMessage(message);
            });
        } else {
            // Direct implementation without a worker
            // Load images in parallel using Promise.all and setTimeout
            const promises = pathsToLoad.map(path => this.loadImage(path, mimeType));
            await Promise.all(promises);
            // console.log('[ImageLoaderService] Preloading complete');
        }
    }

    /**
     * Get a list of all robot avatars
     */
    public getRobotAvatars(): string[] {
        return [
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
            'assets/robots/robot13.png'
        ];
    }

    /**
     * Get a random robot avatar
     */
    public getRandomRobotAvatar(): string {
        const avatars = this.getRobotAvatars();
        const index = Math.floor(Math.random() * avatars.length);
        return avatars[index];
    }

    /**
     * Clear the image cache
     */
    public clearCache(): void {
        Object.keys(this.cache).forEach(key => {
            delete this.cache[key];
        });
        // console.log('[ImageLoaderService] Cache cleared');
    }
}

export default ImageLoaderService;
