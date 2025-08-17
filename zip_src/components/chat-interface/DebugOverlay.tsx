import React, { useEffect, useState, useRef } from 'react';
import { useChatStore } from '@/stores/chatStore';

interface ElementInfo {
  name: string;
  element: HTMLElement | null;
  dimensions: {
    offsetWidth: number;
    offsetHeight: number;
    clientWidth: number;
    clientHeight: number;
    scrollWidth: number;
    scrollHeight: number;
  };
  computedStyles: {
    height: string;
    maxHeight: string;
    minHeight: string;
    overflow: string;
    overflowY: string;
    position: string;
    display: string;
    flexGrow: string;
    flexShrink: string;
    flexBasis: string;
  };
}

interface DebugOverlayProps {
  scrollAreaRef: React.RefObject<HTMLDivElement>;
  chatInputRef: React.RefObject<HTMLDivElement>;
  mainContainerRef: React.RefObject<HTMLDivElement>;
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({
  scrollAreaRef,
  chatInputRef,
  mainContainerRef,
}) => {
  const { isDebugMode, toggleDebugMode } = useChatStore();
  const [elementInfos, setElementInfos] = useState<ElementInfo[]>([]);
  const [updateCount, setUpdateCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>();

  const getElementInfo = (name: string, element: HTMLElement | null): ElementInfo => {
    if (!element) {
      return {
        name,
        element: null,
        dimensions: {
          offsetWidth: 0,
          offsetHeight: 0,
          clientWidth: 0,
          clientHeight: 0,
          scrollWidth: 0,
          scrollHeight: 0,
        },
        computedStyles: {
          height: 'N/A',
          maxHeight: 'N/A',
          minHeight: 'N/A',
          overflow: 'N/A',
          overflowY: 'N/A',
          position: 'N/A',
          display: 'N/A',
          flexGrow: 'N/A',
          flexShrink: 'N/A',
          flexBasis: 'N/A',
        },
      };
    }

    const computed = window.getComputedStyle(element);
    
    return {
      name,
      element,
      dimensions: {
        offsetWidth: element.offsetWidth,
        offsetHeight: element.offsetHeight,
        clientWidth: element.clientWidth,
        clientHeight: element.clientHeight,
        scrollWidth: element.scrollWidth,
        scrollHeight: element.scrollHeight,
      },
      computedStyles: {
        height: computed.height,
        maxHeight: computed.maxHeight,
        minHeight: computed.minHeight,
        overflow: computed.overflow,
        overflowY: computed.overflowY,
        position: computed.position,
        display: computed.display,
        flexGrow: computed.flexGrow,
        flexShrink: computed.flexShrink,
        flexBasis: computed.flexBasis,
      },
    };
  };

  const updateElementInfos = () => {
    const scrollAreaViewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    const messageList = scrollAreaRef.current?.querySelector('[data-testid="chat-message-list"]') as HTMLElement;
    
    const infos = [
      getElementInfo('Main Container', mainContainerRef.current),
      getElementInfo('ScrollArea Root', scrollAreaRef.current),
      getElementInfo('ScrollArea Viewport', scrollAreaViewport),
      getElementInfo('Message List', messageList),
      getElementInfo('Chat Input', chatInputRef.current),
    ];
    
    setElementInfos(infos);
    setUpdateCount(prev => prev + 1);
  };

  useEffect(() => {
    if (isDebugMode) {
      // Initial update
      updateElementInfos();
      
      // Set up interval for real-time updates
      intervalRef.current = setInterval(updateElementInfos, 500);
      
      // Set up resize observer for more responsive updates
      const resizeObserver = new ResizeObserver(() => {
        updateElementInfos();
      });
      
      if (mainContainerRef.current) resizeObserver.observe(mainContainerRef.current);
      if (scrollAreaRef.current) resizeObserver.observe(scrollAreaRef.current);
      if (chatInputRef.current) resizeObserver.observe(chatInputRef.current);
      
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        resizeObserver.disconnect();
      };
    }
  }, [isDebugMode]);

  if (!isDebugMode) {
    return (
      <button
        onClick={toggleDebugMode}
        className="fixed top-4 right-4 z-50 bg-red-500 text-white px-3 py-1 rounded text-sm font-mono"
      >
        Debug
      </button>
    );
  }

  return (
    <div className="fixed top-0 right-0 w-96 h-full bg-black/90 text-white p-4 z-50 overflow-y-auto font-mono text-xs">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Layout Debug</h2>
        <button
          onClick={toggleDebugMode}
          className="bg-red-500 text-white px-2 py-1 rounded"
        >
          Close
        </button>
      </div>
      
      <div className="mb-2 text-yellow-400">
        Updates: {updateCount} | Time: {new Date().toLocaleTimeString()}
      </div>
      
      {elementInfos.map((info, index) => (
        <div key={index} className="mb-6 border border-gray-600 p-3 rounded">
          <h3 className="text-yellow-400 font-bold mb-2">
            {info.name} {!info.element && '(NOT FOUND)'}
          </h3>
          
          {info.element && (
            <>
              <div className="mb-2">
                <h4 className="text-blue-400 font-semibold">Dimensions:</h4>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div>offset: {info.dimensions.offsetWidth}×{info.dimensions.offsetHeight}</div>
                  <div>client: {info.dimensions.clientWidth}×{info.dimensions.clientHeight}</div>
                  <div>scroll: {info.dimensions.scrollWidth}×{info.dimensions.scrollHeight}</div>
                </div>
              </div>
              
              <div>
                <h4 className="text-green-400 font-semibold">Computed Styles:</h4>
                <div className="space-y-1">
                  <div>height: <span className="text-yellow-300">{info.computedStyles.height}</span></div>
                  <div>max-height: <span className="text-yellow-300">{info.computedStyles.maxHeight}</span></div>
                  <div>min-height: <span className="text-yellow-300">{info.computedStyles.minHeight}</span></div>
                  <div>overflow-y: <span className="text-yellow-300">{info.computedStyles.overflowY}</span></div>
                  <div>position: <span className="text-yellow-300">{info.computedStyles.position}</span></div>
                  <div>display: <span className="text-yellow-300">{info.computedStyles.display}</span></div>
                  <div>flex-grow: <span className="text-yellow-300">{info.computedStyles.flexGrow}</span></div>
                  <div>flex-shrink: <span className="text-yellow-300">{info.computedStyles.flexShrink}</span></div>
                  <div>flex-basis: <span className="text-yellow-300">{info.computedStyles.flexBasis}</span></div>
                </div>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
};