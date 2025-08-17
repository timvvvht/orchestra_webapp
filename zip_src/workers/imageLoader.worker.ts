// Web Worker for loading images in the background

// Define the message types
type WorkerMessage = {
  type: 'LOAD_IMAGE';
  id: string;
  path: string;
  mimeType: string;
} | {
  type: 'PRELOAD_IMAGES';
  id: string;
  paths: string[];
  mimeType: string;
};

type WorkerResponse = {
  type: 'IMAGE_LOADED';
  id: string;
  path: string;
  success: boolean;
  url?: string;
  error?: string;
} | {
  type: 'PRELOAD_COMPLETE';
  id: string;
  results: Array<{ path: string; success: boolean; error?: string }>;
};

// Import Tauri API
// Note: Web Workers can't directly use Tauri APIs, so we'll need to proxy the calls
// through the main thread. For now, we'll just simulate the behavior.

// This is a mock implementation - in a real app, you'd need to proxy these calls
// through the main thread using postMessage
async function mockResourceExists(path: string): Promise<boolean> {
  // Simulate a delay
  await new Promise(resolve => setTimeout(resolve, 10));
  
  // Emoji check
  if (path.length <= 2 && /\p{Emoji}/u.test(path)) {
    return false;
  }
  
  // Assume all paths with 'robot' exist
  return path.includes('robot');
}

async function mockGetResourceUrl(path: string): Promise<string> {
  // Simulate a delay
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Return a data URL (in a real app, this would be the actual resource)
  return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==`;
}

// Handle messages from the main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  
  switch (message.type) {
    case 'LOAD_IMAGE':
      await handleLoadImage(message);
      break;
    case 'PRELOAD_IMAGES':
      await handlePreloadImages(message);
      break;
  }
};

async function handleLoadImage(message: WorkerMessage & { type: 'LOAD_IMAGE' }) {
  try {
    // Check if the resource exists
    const exists = await mockResourceExists(message.path);
    
    if (!exists) {
      const response: WorkerResponse = {
        type: 'IMAGE_LOADED',
        id: message.id,
        path: message.path,
        success: false,
        error: `Resource ${message.path} not found`
      };
      self.postMessage(response);
      return;
    }
    
    // Get the resource URL
    const url = await mockGetResourceUrl(message.path);
    
    // Send the result back to the main thread
    const response: WorkerResponse = {
      type: 'IMAGE_LOADED',
      id: message.id,
      path: message.path,
      success: true,
      url
    };
    self.postMessage(response);
  } catch (error) {
    // Send the error back to the main thread
    const response: WorkerResponse = {
      type: 'IMAGE_LOADED',
      id: message.id,
      path: message.path,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
    self.postMessage(response);
  }
}

async function handlePreloadImages(message: WorkerMessage & { type: 'PRELOAD_IMAGES' }) {
  const results: Array<{ path: string; success: boolean; error?: string }> = [];
  
  // Process all images in parallel
  await Promise.all(message.paths.map(async (path) => {
    try {
      // Check if the resource exists
      const exists = await mockResourceExists(path);
      
      if (!exists) {
        results.push({
          path,
          success: false,
          error: `Resource ${path} not found`
        });
        return;
      }
      
      // Get the resource URL
      const url = await mockGetResourceUrl(path);
      
      // Send individual result immediately
      const response: WorkerResponse = {
        type: 'IMAGE_LOADED',
        id: `${message.id}-${path}`,
        path,
        success: true,
        url
      };
      self.postMessage(response);
      
      // Add to results
      results.push({
        path,
        success: true
      });
    } catch (error) {
      results.push({
        path,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }));
  
  // Send the complete result back to the main thread
  const response: WorkerResponse = {
    type: 'PRELOAD_COMPLETE',
    id: message.id,
    results
  };
  self.postMessage(response);
}

// Export an empty object to make TypeScript happy
export {};