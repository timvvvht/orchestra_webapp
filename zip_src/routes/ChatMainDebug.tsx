import React from 'react';

import { MockACSStreamingService } from '@/services/acs/streaming/MockACSStreamingService';
import { mockOrchestraEvents } from '@/debug/mockMoonBowlSession';
import { defaultACSConfig } from '@/services/acs/shared/client';

export default function ChatMainDebug() {
  console.log('🎭 [ChatMainDebug] Rendering debug chat with mock streaming');

  // Create a streaming service factory that returns a mock service
  const streamingServiceFactory = () => {
    console.log('🎭 [ChatMainDebug] Creating MockACSStreamingService with', mockOrchestraEvents.length, 'events');
    
    const config = {
      baseUrl: 'http://localhost:3000', // Mock URL
      sseUrl: 'http://localhost:3001',  // Mock URL
      ...defaultACSConfig
    };
    
    return new MockACSStreamingService(config, mockOrchestraEvents);
  };

  return null;
}