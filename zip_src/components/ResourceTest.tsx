import React, { useEffect, useState } from 'react';
import ResourceImage from './AssetImage';
import { resourceExists, getResourceUrl } from '../utils/assetUtils';
import { resourceDir } from '@tauri-apps/api/path';
import { readDir } from '@tauri-apps/plugin-fs';

const ResourceTest: React.FC = () => {
  const [resources, setResources] = useState<{path: string, exists: boolean}[]>([]);
  const [loading, setLoading] = useState(true);
  const [allResources, setAllResources] = useState<string[]>([]);
  const [loadingAllResources, setLoadingAllResources] = useState(true);
  
  // Test paths to check
  const testPaths = [
    'assets/robots/robot1.png',
    'assets/robots/robot5.png',
    'assets/robots/robot9.png',
    'assets/default_avatar.png',
    'assets/default_icon.png'
  ];
  
  useEffect(() => {
    async function checkResources() {
      const results = [];
      
      for (const path of testPaths) {
        try {
          console.log(`[ResourceTest] Checking if resource exists: ${path}`);
          const exists = await resourceExists(path);
          console.log(`[ResourceTest] Resource exists check result: ${exists} for ${path}`);
          
          results.push({ path, exists });
          
          if (exists) {
            try {
              const url = await getResourceUrl(path);
              console.log(`[ResourceTest] Successfully got URL for ${path}: ${url.substring(0, 30)}...`);
            } catch (error) {
              console.error(`[ResourceTest] Error getting URL for ${path}:`, error);
            }
          }
        } catch (error) {
          console.error(`[ResourceTest] Error checking resource ${path}:`, error);
          results.push({ path, exists: false });
        }
      }
      
      setResources(results);
      setLoading(false);
    }
    
    checkResources();
  }, []);

  // Function to list all PNG resources
  useEffect(() => {
    async function listAllResources() {
      try {
        setLoadingAllResources(true);
        // Get the path to the resources directory
        const resDir = await resourceDir();
        console.log(`[ResourceTest] Resources directory: ${resDir}`);
        
        // Read all files in the resources directory
        const entries = await readDir(resDir);
        console.log(`[ResourceTest] Found ${entries.length} top-level entries`);
        
        // Process entries recursively and extract all PNG paths
        const paths: string[] = [];
        
        async function processEntries(entries: any[], basePath: string = '') {
          for (const entry of entries) {
            const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
            
            // Only add files with .png extension to the list
            if (relativePath.toLowerCase().endsWith('.png')) {
              paths.push(relativePath);
            }
            
            // If it's a directory, read its contents (regardless of filter)
            if (entry.children) {
              await processEntries(entry.children, relativePath);
            } else if (entry.isDirectory) {
              try {
                const subEntries = await readDir(`${resDir}/${relativePath}`);
                await processEntries(subEntries, relativePath);
              } catch (error) {
                console.error(`[ResourceTest] Error reading subdirectory ${relativePath}:`, error);
              }
            }
          }
        }
        
        await processEntries(entries);
        console.log(`[ResourceTest] Processed ${paths.length} total PNG resources`);
        
        setAllResources(paths);
      } catch (error) {
        console.error('[ResourceTest] Error listing PNG resources:', error);
        setAllResources([`Error: ${error instanceof Error ? error.message : String(error)}`]);
      } finally {
        setLoadingAllResources(false);
      }
    }
    
    listAllResources();
  }, []);
  
  return (
    <div className="p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Resource Test</h2>
      
      {loading ? (
        <p>Checking resources...</p>
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="font-medium mb-2">Resource Existence Check:</h3>
            <ul className="space-y-1">
              {resources.map((resource) => (
                <li key={resource.path} className="flex items-center">
                  <span className={`w-4 h-4 rounded-full mr-2 ${resource.exists ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span>{resource.path}: {resource.exists ? 'Exists' : 'Not Found'}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Resource Image Rendering Test:</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {testPaths.map((path) => (
                <div key={path} className="border rounded p-2 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full overflow-hidden mb-2 bg-gray-100 dark:bg-gray-700">
                    <ResourceImage 
                      path={path}
                      alt={path}
                      className="w-full h-full object-cover"
                      onLoad={() => {}}
                      onError={(error) => {}}
                    />
                  </div>
                  <span className="text-xs text-center">{path}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">All PNG Resources:</h3>
            {loadingAllResources ? (
              <p>Loading PNG resources...</p>
            ) : (
              <div className="mt-2 max-h-60 overflow-y-auto border rounded p-2 bg-gray-50 dark:bg-gray-900">
                <p className="mb-2 text-sm text-gray-500">Found {allResources.length} PNG resources</p>
                <ul className="text-xs space-y-1">
                  {allResources.map((path, index) => (
                    <li key={index} className="font-mono">
                      {path}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceTest;