import React, { useEffect, useState } from 'react';
import { exists } from '@tauri-apps/plugin-fs';
import { resolveResource } from '@tauri-apps/api/path';
import TauriResourceImage from './TauriResourceImage';

const TauriResourceTest: React.FC = () => {
  const [resourcePaths, setResourcePaths] = useState<{ path: string; exists: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  const testPaths = [
    'assets/robots/robot1.png',
    'assets/robots/robot5.png',
    'assets/robots/robot9.png',
    'assets/robots/robot8.png',
    'assets/robots/robot2.png',
    'assets/robots/robot3.png'
  ];

  useEffect(() => {
    async function checkResources() {
      const results = [];

      for (const path of testPaths) {
        try {
          console.log(`[TauriResourceTest] Checking path: ${path}`);
          const fullPath = await resolveResource(path).catch(err => {
            console.error(`[TauriResourceTest] Error resolving path: ${path}`, err);
            return null;
          });

          if (fullPath) {
            console.log(`[TauriResourceTest] Resolved path: ${fullPath}`);
            const fileExists = await exists(fullPath).catch(err => {
              console.error(`[TauriResourceTest] Error checking if file exists: ${fullPath}`, err);
              return false;
            });
            console.log(`[TauriResourceTest] File exists: ${fileExists} for ${path}`);
            results.push({ path, exists: fileExists });
          } else {
            console.log(`[TauriResourceTest] Could not resolve path: ${path}`);
            results.push({ path, exists: false });
          }
        } catch (error) {
          console.error(`[TauriResourceTest] Error checking resource: ${path}`, error);
          results.push({ path, exists: false });
        }
      }

      setResourcePaths(results);
      setLoading(false);
    }

    checkResources();
  }, []);

  return (
    <div className="p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Tauri Resource Test</h2>

      {loading ? (
        <p>Checking resources...</p>
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="font-medium mb-2">Resource Existence Check:</h3>
            <ul className="space-y-1">
              {resourcePaths.map((resource) => (
                <li key={resource.path} className="flex items-center">
                  <span
                    className={`w-4 h-4 rounded-full mr-2 ${resource.exists ? 'bg-green-500' : 'bg-red-500'}`}
                  />
                  <span>{resource.path}: {resource.exists ? 'Exists' : 'Not Found'}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-medium mb-2">Resource Image Rendering Test:</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {resourcePaths.map((resource) => (
                <div key={resource.path} className="border rounded p-2 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full overflow-hidden mb-2 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    {resource.exists ? (
                      <TauriResourceImage
                        resourcePath={resource.path}
                        alt={resource.path}
                        className="w-full h-full object-cover"
                        fallbackContent={<span className="text-2xl">❓</span>}
                      />
                    ) : (
                      <span className="text-2xl">❌</span>
                    )}
                  </div>
                  <span className="text-xs text-center">{resource.path}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TauriResourceTest;