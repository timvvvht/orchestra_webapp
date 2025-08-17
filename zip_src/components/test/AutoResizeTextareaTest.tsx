import React, { useState } from 'react';
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea';

/**
 * Test component for AutoResizeTextarea functionality
 * This can be temporarily added to test the new input behavior
 */
const AutoResizeTextareaTest: React.FC = () => {
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState<string[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow shift+enter for new lines
        return;
      } else {
        // Enter without shift submits
        e.preventDefault();
        if (value.trim()) {
          setSubmitted(prev => [...prev, value]);
          setValue('');
        }
      }
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">AutoResizeTextarea Test</h2>
        <p className="text-white/60">
          Test the new chat input functionality:
        </p>
        <ul className="text-sm text-white/60 space-y-1">
          <li>• Type normally and press Enter to submit</li>
          <li>• Press Shift+Enter to create new lines</li>
          <li>• Click to see expansion behavior</li>
          <li>• Watch auto-resize as you type</li>
        </ul>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <AutoResizeTextarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Shift+Enter for new line)"
            minRows={1}
            maxRows={8}
            expandOnFocus={true}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={() => {
              if (value.trim()) {
                setSubmitted(prev => [...prev, value]);
                setValue('');
              }
            }}
            className="absolute right-2 bottom-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
          >
            Send
          </button>
        </div>

        {submitted.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">Submitted Messages:</h3>
            <div className="space-y-2">
              {submitted.map((msg, index) => (
                <div
                  key={index}
                  className="bg-white/5 border border-white/10 rounded-lg p-3"
                >
                  <pre className="text-white/80 whitespace-pre-wrap text-sm">
                    {msg}
                  </pre>
                </div>
              ))}
            </div>
            <button
              onClick={() => setSubmitted([])}
              className="px-3 py-1 bg-red-500/20 text-red-300 rounded text-sm hover:bg-red-500/30 transition-colors"
            >
              Clear Messages
            </button>
          </div>
        )}
      </div>

      <div className="text-xs text-white/40 space-y-1">
        <p>Current value length: {value.length}</p>
        <p>Lines in current value: {value.split('\n').length}</p>
      </div>
    </div>
  );
};

export default AutoResizeTextareaTest;