import React, { useState, useEffect } from 'react';
import ResourceImage from './AssetImage'; // Note: This is the renamed component from earlier
import { resourceExists } from '../utils/assetUtils';

interface RobotGalleryProps {
  /** Optional CSS class name(s) */
  className?: string;
  /** Number of robots to display */
  count?: number;
}

/**
 * Component for displaying a gallery of robot images from the bundled resources
 */
const RobotGallery: React.FC<RobotGalleryProps> = ({ 
  className = '',
  count = 13 // Default to all 13 robots
}) => {
  const [availableRobots, setAvailableRobots] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkRobots() {
      setLoading(true);
      const available: number[] = [];
      
      // Check which robot images exist
      for (let i = 1; i <= count; i++) {
        const exists = await resourceExists(`assets/robots/robot${i}.png`);
        if (exists) {
          available.push(i);
        }
      }
      
      setAvailableRobots(available);
      setLoading(false);
    }
    
    checkRobots();
  }, [count]);

  if (loading) {
    return <div className="p-4 text-center">Loading robot gallery...</div>;
  }

  if (availableRobots.length === 0) {
    return <div className="p-4 text-center">No robot images found</div>;
  }

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 ${className}`}>
      {availableRobots.map(robotNumber => (
        <div key={robotNumber} className="border rounded-lg p-2 flex flex-col items-center">
          <ResourceImage
            path={`assets/robots/robot${robotNumber}.png`}
            alt={`Robot ${robotNumber}`}
            className="w-full h-auto object-contain mb-2"
            fallbackUrl="https://via.placeholder.com/200?text=Robot"
          />
          <span className="text-sm font-medium">Robot {robotNumber}</span>
        </div>
      ))}
    </div>
  );
};

export default RobotGallery;