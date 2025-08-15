/**
 * ScrollTestComponent - Test component to verify scrolling behavior in MissionControlSplitScreen
 */

import React, { useState } from 'react';

const ScrollTestComponent: React.FC = () => {
  const [showWideContent, setShowWideContent] = useState(true);
  const [messageCount, setMessageCount] = useState(100);
  
  // Generate a lot of content to test scrolling and horizontal containment
  const generateTestContent = () => {
    const items = [];
    for (let i = 1; i <= messageCount; i++) {
      const isWideContent = i % 10 === 0; // Every 10th message has wide content
      const isCodeBlock = i % 15 === 0; // Every 15th message has code block
      
      items.push(
        <div key={i} className="p-4 mb-4 bg-white/5 border border-white/10 rounded-lg">
          <h3 className="text-white font-semibold mb-2">Test Message {i}</h3>
          <p className="text-white/70">
            This is test message number {i}. This content is generated to test the scrolling behavior 
            within the MissionControlSplitScreen component. If scrolling is working properly, you should 
            be able to scroll through all 100 of these messages smoothly.
          </p>
          
          {/* Test horizontal containment with wide content */}
          {isWideContent && showWideContent && (
            <div className="mt-3 p-3 bg-blue-500/10 border border-blue-400/30 rounded">
              <h4 className="text-blue-300 text-sm font-medium mb-2">🧪 Wide Content Test</h4>
              <p className="text-white/60 text-xs">
                This is a very long line of text that should wrap properly and not overflow horizontally outside the container boundaries even in the split-screen view where space is more constrained than in full-width mode.
              </p>
              <div className="mt-2 overflow-x-auto">
                <table className="text-xs text-white/60 border-collapse">
                  <tr>
                    <td className="border border-white/20 px-2 py-1">Column 1</td>
                    <td className="border border-white/20 px-2 py-1">Column 2 with longer content</td>
                    <td className="border border-white/20 px-2 py-1">Column 3 with even longer content that might cause horizontal overflow</td>
                  </tr>
                </table>
              </div>
            </div>
          )}
          
          {/* Test code block containment */}
          {isCodeBlock && showWideContent && (
            <div className="mt-3">
              <h4 className="text-green-300 text-sm font-medium mb-2">💻 Code Block Test</h4>
              <pre className="bg-black/30 p-3 rounded text-xs text-green-400 overflow-x-auto">
                <code>{`function testHorizontalContainment() {
  const veryLongVariableName = "This is a very long string that might cause horizontal overflow in narrow containers";
  const anotherLongLine = "Another long line to test how code blocks handle horizontal containment in split-screen view";
  return { veryLongVariableName, anotherLongLine };
}`}</code>
              </pre>
            </div>
          )}
          
          <div className="mt-2 text-xs text-white/50">
            Timestamp: {new Date().toLocaleTimeString()} | Message ID: test-{i}
            {isWideContent && showWideContent && " | 🧪 Wide Content"}
            {isCodeBlock && showWideContent && " | 💻 Code Block"}
          </div>
        </div>
      );
    }
    return items;
  };

  return (
    <div className="flex-1 flex flex-col h-full relative bg-black">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-white/10 bg-black/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold">🧪 Scroll Test Component</h2>
            <p className="text-white/60 text-sm mt-1">
              Testing scrolling behavior - should be able to scroll through 100 messages
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <label className="text-white/60 text-xs">Messages:</label>
              <select
                value={messageCount}
                onChange={(e) => setMessageCount(Number(e.target.value))}
                className="bg-black/30 border border-white/20 rounded px-2 py-1 text-xs text-white"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
                <option value={1000}>1000</option>
              </select>
            </div>
            <button
              onClick={() => setShowWideContent(!showWideContent)}
              className={`
                px-3 py-1.5 text-xs rounded-lg border transition-colors
                ${showWideContent 
                  ? 'bg-orange-500/20 text-orange-300 border-orange-400/30' 
                  : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/20'
                }
              `}
            >
              {showWideContent ? '📏 Hide Wide Content' : '📏 Show Wide Content'}
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {generateTestContent()}
        </div>
      </div>

      {/* Mock Input Area - Test if it gets pushed off screen */}
      <div className="flex-shrink-0 p-4 border-t border-white/10 bg-black/20">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Mock input - should always be visible at bottom"
              className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/50 text-sm"
              disabled
            />
          </div>
          <button className="px-4 py-2 bg-blue-500/20 border border-blue-400/30 rounded-lg text-blue-300 text-sm">
            Send
          </button>
        </div>
        <p className="text-white/60 text-xs mt-2">
          ✅ If you can see this input area, vertical containment is working! 
          Try {messageCount} messages to test if input gets pushed off screen.
        </p>
      </div>
    </div>
  );
};

export default ScrollTestComponent;