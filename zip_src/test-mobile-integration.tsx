/**
 * Mobile Integration Test Component
 * Tests all mobile responsive features in isolation
 */
import React from 'react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useDataSaver } from '@/hooks/useNetworkDataSaver';
import { SidebarDrawer } from '@/components/chat-interface/SidebarDrawer';
import { MobileChatInput } from '@/components/chat-interface/MobileChatInput';
import { TouchMessage } from '@/components/chat-interface/TouchMessage';
import { ChatResponsiveLayout } from '@/layouts/ChatResponsiveLayout';

export function MobileIntegrationTest() {
  const isDesktop = useBreakpoint();
  const prefersReducedMotion = useReducedMotion();
  const hasDataSaver = useDataSaver();

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold text-white">Mobile Integration Test</h1>
      
      {/* Responsive Status */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h2 className="text-lg font-semibold text-white mb-2">Responsive Status</h2>
        <div className="space-y-1 text-sm">
          <div>Device Type: <span className="text-blue-400">{isDesktop ? 'Desktop' : 'Mobile/Tablet'}</span></div>
          <div>Reduced Motion: <span className="text-blue-400">{prefersReducedMotion ? 'Enabled' : 'Disabled'}</span></div>
          <div>Data Saver: <span className="text-blue-400">{hasDataSaver ? 'Enabled' : 'Disabled'}</span></div>
        </div>
      </div>

      {/* Touch Message Test */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h2 className="text-lg font-semibold text-white mb-2">Touch Message Test</h2>
        <TouchMessage
          onReply={() => alert('Reply action')}
          onCopy={() => alert('Copy action')}
          onShare={() => alert('Share action')}
        >
          <div className="bg-gray-700 p-3 rounded text-white">
            Swipe left on mobile to reveal actions, or long press if reduced motion is enabled.
          </div>
        </TouchMessage>
      </div>

      {/* Mobile Input Test */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h2 className="text-lg font-semibold text-white mb-2">Mobile Input Test</h2>
        <div className="relative h-32">
          {!isDesktop && (
            <MobileChatInput
              onSubmit={(text) => alert(`Submitted: ${text}`)}
              placeholder="Test mobile input..."
            />
          )}
          {isDesktop && (
            <div className="text-gray-400 text-center py-8">
              Mobile input only shows on mobile devices
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Drawer Test */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h2 className="text-lg font-semibold text-white mb-2">Sidebar Drawer Test</h2>
        {!isDesktop ? (
          <div>
            <SidebarDrawer />
            <div className="text-gray-400 text-sm">
              Hamburger menu should be visible in top-left corner on mobile
            </div>
          </div>
        ) : (
          <div className="text-gray-400 text-center py-4">
            Sidebar drawer only shows on mobile devices
          </div>
        )}
      </div>

      {/* CSS Test */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h2 className="text-lg font-semibold text-white mb-2">CSS & Safe Area Test</h2>
        <div className="space-y-2 text-sm text-gray-300">
          <div>Safe area bottom: <span className="font-mono">env(safe-area-inset-bottom)</span></div>
          <div>Overflow behavior: <span className="text-blue-400">{isDesktop ? 'Hidden (desktop)' : 'Auto (mobile)'}</span></div>
          <div className="pb-safe bg-blue-500/20 p-2 rounded">
            This div has safe area padding
          </div>
        </div>
      </div>
    </div>
  );
}