import React, { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { onOpenUrl, getCurrent } from '@tauri-apps/plugin-deep-link';
import { isTauri } from '@/lib/isTauri';

interface DebugEvent {
  timestamp: string;
  type: string;
  source: string;
  url?: string;
  data?: any;
  error?: string;
}

export const DeepLinkDebugOverlay: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);

  const addEvent = (event: Omit<DebugEvent, 'timestamp'>) => {
    const newEvent: DebugEvent = {
      ...event,
      timestamp: new Date().toLocaleTimeString()
    };
    setEvents(prev => [newEvent, ...prev].slice(0, 50)); // Keep last 50 events
  };

  useEffect(() => {
    if (!isTauri()) {
      addEvent({
        type: 'INIT',
        source: 'DEBUG',
        error: 'Not running in Tauri environment'
      });
      return;
    }

    addEvent({
      type: 'INIT',
      source: 'DEBUG',
      data: 'Starting deep link debug overlay...'
    });

    const setupDebugListeners = async () => {
      try {
        // Check for initial deep links
        try {
          const initialUrls = await getCurrent();
          addEvent({
            type: 'INITIAL_CHECK',
            source: 'getCurrent',
            data: initialUrls,
            url: initialUrls?.[0]
          });
        } catch (err) {
          addEvent({
            type: 'INITIAL_CHECK',
            source: 'getCurrent',
            error: String(err)
          });
        }

        // Listen for onOpenUrl events
        try {
          const unlistenOnOpenUrl = await onOpenUrl((urls) => {
            addEvent({
              type: 'DEEP_LINK',
              source: 'onOpenUrl',
              data: urls,
              url: urls?.[0]
            });
          });

          addEvent({
            type: 'LISTENER_SETUP',
            source: 'onOpenUrl',
            data: 'Successfully registered onOpenUrl listener'
          });
        } catch (err) {
          addEvent({
            type: 'LISTENER_SETUP',
            source: 'onOpenUrl',
            error: String(err)
          });
        }

        // Listen for all possible event types
        const eventTypes = [
          'deep-link-received',
          'oauth-callback', 
          'deep-link',
          'tauri://url',
          'orchestra'
        ];

        for (const eventType of eventTypes) {
          try {
            const unlisten = await listen<string>(eventType, ({ payload: url }) => {
              addEvent({
                type: 'EVENT',
                source: eventType,
                url: url,
                data: `Received ${eventType} event`
              });
            });

            addEvent({
              type: 'LISTENER_SETUP',
              source: eventType,
              data: `Successfully registered ${eventType} listener`
            });
          } catch (err) {
            addEvent({
              type: 'LISTENER_SETUP',
              source: eventType,
              error: String(err)
            });
          }
        }

      } catch (err) {
        addEvent({
          type: 'SETUP_ERROR',
          source: 'DEBUG',
          error: String(err)
        });
      }
    };

    setupDebugListeners();
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] bg-black/90 text-white rounded-lg shadow-2xl border border-gray-600 max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-600">
        <h3 className="text-sm font-semibold text-green-400">🔗 Deep Link Debug</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded"
          >
            {isMinimized ? '▲' : '▼'}
          </button>
          <button
            onClick={() => setEvents([])}
            className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded"
          >
            Clear
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="p-3">
          {/* Stats */}
          <div className="mb-3 text-xs text-gray-300">
            <div>Events: {events.length}</div>
            <div>Tauri: {isTauri() ? '✅' : '❌'}</div>
            <div>Time: {new Date().toLocaleTimeString()}</div>
          </div>

          {/* Manual Test Button */}
          <div className="mb-3">
            <button
              onClick={() => {
                addEvent({
                  type: 'MANUAL_TEST',
                  source: 'DEBUG',
                  data: 'Manual test button clicked'
                });
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded"
            >
              Test Event
            </button>
          </div>

          {/* Events List */}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {events.length === 0 ? (
              <div className="text-gray-400 text-xs">No events yet...</div>
            ) : (
              events.map((event, index) => (
                <div
                  key={index}
                  className={`text-xs p-2 rounded border-l-2 ${
                    event.error
                      ? 'bg-red-900/30 border-red-500'
                      : event.type === 'DEEP_LINK' || event.type === 'EVENT'
                      ? 'bg-green-900/30 border-green-500'
                      : event.type === 'LISTENER_SETUP'
                      ? 'bg-blue-900/30 border-blue-500'
                      : 'bg-gray-800/30 border-gray-500'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-mono text-yellow-400">{event.timestamp}</span>
                    <span className="text-gray-300">{event.source}</span>
                  </div>
                  <div className="font-semibold">{event.type}</div>
                  {event.url && (
                    <div className="text-green-300 break-all">URL: {event.url}</div>
                  )}
                  {event.data && (
                    <div className="text-gray-300">
                      {typeof event.data === 'string' 
                        ? event.data 
                        : JSON.stringify(event.data, null, 2)
                      }
                    </div>
                  )}
                  {event.error && (
                    <div className="text-red-300">Error: {event.error}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};