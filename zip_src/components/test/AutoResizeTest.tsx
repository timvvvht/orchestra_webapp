import React, { useState } from 'react';
import { useAutoResize } from '@/hooks/useAutoResize';

export function AutoResizeTest() {
  const [value, setValue] = useState('');
  const textareaRef = useAutoResize({ 
    minHeight: 48, 
    maxLines: 4, // Grow up to 4 lines then scroll
    value 
  });

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Auto-Resize Textarea Test</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Test Input (grows up to 4 lines, then scrolls):
          </label>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Type here to test line-based auto-resize behavior..."
            className="w-full min-h-12 bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 leading-relaxed resize-none"
          />
        </div>
        
        <div className="text-sm text-gray-600">
          <p><strong>Current value length:</strong> {value.length}</p>
          <p><strong>Line count:</strong> {value.split('\n').length}</p>
          <p><strong>Current height:</strong> {textareaRef.current?.style.height || 'auto'}</p>
        </div>
        
        <div className="space-y-2">
          <h3 className="font-medium">Test Cases:</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setValue('')}
              className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300"
            >
              Empty
            </button>
            <button
              onClick={() => setValue('Short text')}
              className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300"
            >
              Short
            </button>
            <button
              onClick={() => setValue('This is a longer single line of text that should still be handled conservatively')}
              className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300"
            >
              Long Single Line
            </button>
            <button
              onClick={() => setValue('Line 1\nLine 2\nLine 3')}
              className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300"
            >
              3 Lines
            </button>
            <button
              onClick={() => setValue('Line 1\nLine 2\nLine 3\nLine 4')}
              className="px-3 py-1 bg-blue-200 rounded text-sm hover:bg-blue-300"
            >
              4 Lines (Max)
            </button>
            <button
              onClick={() => setValue('Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8')}
              className="px-3 py-1 bg-red-200 rounded text-sm hover:bg-red-300"
            >
              8 Lines (Should Scroll)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}