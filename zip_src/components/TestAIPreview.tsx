import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BrainIcon } from 'lucide-react';

export default function TestAIPreview() {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'ai'; content: string }>>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  useEffect(() => {
    console.log('TestAIPreview mounted');
    
    // Test immediate message
    setMessages([{ role: 'user', content: "Test message" }]);
    
    // Test delayed message
    setTimeout(() => {
      console.log('Adding AI message');
      setMessages(prev => [...prev, { role: 'ai', content: "AI response" }]);
    }, 1000);
  }, []);
  
  return (
    <div className="bg-black text-white p-8 min-h-screen">
      <h1 className="text-2xl mb-4">AI Preview Test</h1>
      <div className="bg-white/10 rounded-lg p-4 max-w-2xl">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <p className="text-white/50">No messages yet...</p>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <BrainIcon className="w-4 h-4" />
                  </div>
                )}
                <div className={`px-4 py-2 rounded-lg ${msg.role === 'user' ? 'bg-white/20' : 'bg-white/10'}`}>
                  <p>{msg.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}