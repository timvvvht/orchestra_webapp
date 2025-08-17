import React, { useEffect, useState } from 'react';
import ResourceImage from './AssetImage';
import DefaultAssetImage from './DefaultAssetImage';
import RobotGallery from './RobotGallery';
import { listDefaultAssets } from '../utils/assetUtils';

/**
 * Example component demonstrating how to use bundled assets in Orchestra
 */
const ExampleAssetUsage: React.FC = () => {
  const [defaultAssets, setDefaultAssets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAssetList() {
      try {
        setLoading(true);
        const assets = await listDefaultAssets();
        setDefaultAssets(assets);
      } catch (error) {
        console.error('Failed to load asset list:', error);
      } finally {
        setLoading(false);
      }
    }

    loadAssetList();
  }, []);

  return (
    <div className="p-6 space-y-8">
      <section>
        <h2 className="text-2xl font-bold mb-4">Robot Gallery</h2>
        <RobotGallery />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Using Resource Files</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="border p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Resource Image Component</h3>
            <ResourceImage 
              path="assets/images/example.png" 
              alt="Example resource" 
              className="w-32 h-32 object-contain"
              fallbackUrl="https://via.placeholder.com/128"
            />
            <p className="mt-2 text-sm text-gray-600">
              Using bundled resources with fallback to placeholder
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Using Embedded Assets</h2>
        {loading ? (
          <p>Loading available assets...</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {defaultAssets.map(asset => (
              <div key={asset} className="border p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-2">{asset}</h3>
                <DefaultAssetImage 
                  name={asset} 
                  alt={`${asset} asset`} 
                  className="w-32 h-32 object-contain"
                  fallbackUrl="https://via.placeholder.com/128"
                />
                <p className="mt-2 text-sm text-gray-600">
                  Embedded asset loaded from Rust binary
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default ExampleAssetUsage;