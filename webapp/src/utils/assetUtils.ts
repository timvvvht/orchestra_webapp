/**
 * Utility functions for working with bundled assets in Orchestra
 */

import { invoke } from '@tauri-apps/api/core';
import { resolveResource } from '@tauri-apps/api/path';

/**
 * Get a default asset as a data URL
 *
 * @param name The name of the default asset (e.g., 'avatar', 'icon')
 * @returns A Promise resolving to a data URL for the asset
 */
export async function getDefaultAssetUrl(name: string): Promise<string> {
    try {
        // Invoke the Rust command to get the asset data
        const assetData = await invoke<number[]>('get_default_asset', { name });

        // Convert the byte array to a data URL
        const blob = new Blob([new Uint8Array(assetData)], { type: 'image/png' });
        const url = URL.createObjectURL(blob);
        return url;
    } catch (error) {
        console.error(`Failed to load default asset '${name}':`, error);
        throw error;
    }
}

/**
 * Get a resource file as a data URL
 *
 * @param path The path to the resource file relative to the resources directory
 * @param mimeType The MIME type of the resource (default: 'image/png')
 * @returns A Promise resolving to a data URL for the resource
 */
export async function getResourceUrl(path: string, mimeType: string = 'image/png'): Promise<string> {
    try {
        // Invoke the Rust command to get the resource data
        const resourceData = await invoke<number[]>('get_resource_file', { path });

        // Convert the byte array to a data URL
        const blob = new Blob([new Uint8Array(resourceData)], { type: mimeType });
        const url = URL.createObjectURL(blob);
        return url;
    } catch (error) {
        console.error(`Failed to load resource '${path}':`, error);
        throw error;
    }
}

/**
 * Resolve a resource path to a full filesystem path
 *
 * @param path The path to the resource file relative to the resources directory
 * @returns A Promise resolving to the full filesystem path
 */
export async function resolveResourcePath(path: string): Promise<string> {
    try {
        return await resolveResource(path);
    } catch (error) {
        console.error(`Failed to resolve resource path '${path}':`, error);
        throw error;
    }
}

/**
 * Get a list of all available default assets
 *
 * @returns A Promise resolving to an array of asset names
 */
export async function listDefaultAssets(): Promise<string[]> {
    try {
        return await invoke<string[]>('list_default_assets');
    } catch (error) {
        console.error('Failed to list default assets:', error);
        return [];
    }
}

/**
 * Check if a default asset exists
 *
 * @param name The name of the asset to check
 * @returns A Promise resolving to true if the asset exists, false otherwise
 */
export async function hasDefaultAsset(name: string): Promise<boolean> {
    try {
        return await invoke<boolean>('has_default_asset', { name });
    } catch (error) {
        console.error(`Failed to check if default asset '${name}' exists:`, error);
        return false;
    }
}

/**
 * Check if a resource file exists
 *
 * @param path The path to the resource file relative to the resources directory
 * @returns A Promise resolving to true if the file exists, false otherwise
 */
export async function resourceExists(path: string): Promise<boolean> {
    try {
        return await invoke<boolean>('resource_file_exists', { path });
    } catch (error) {
        console.error(`Failed to check if resource '${path}' exists:`, error);
        return false;
    }
}

/**
 * Create an img element with a default asset
 *
 * @param name The name of the default asset
 * @param alt Alt text for the image
 * @param className Optional CSS class name(s)
 * @returns A Promise resolving to an HTMLImageElement
 */
export async function createDefaultAssetImage(name: string, alt: string, className?: string): Promise<HTMLImageElement> {
    const url = await getDefaultAssetUrl(name);
    const img = document.createElement('img');
    img.src = url;
    img.alt = alt;
    if (className) {
        img.className = className;
    }
    return img;
}
