'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
// import CosmicTypingIndicator from '@/components/chat-interface/CosmicTypingIndicator'; // Moved to .bak
import RunicPulseIndicator from '@/components/chat-interface/RunicPulseIndicator';
import QuantumWaveIndicator from '@/components/chat-interface/QuantumWaveIndicator';
import NeuralFlowIndicator from '@/components/chat-interface/NeuralFlowIndicator';
import ThinkingRunicIndicator from '@/components/chat-interface/ThinkingRunicIndicator';
import ThinkingTextIndicator from '@/components/chat-interface/ThinkingTextIndicator';

export default function AnimationsPage() {
  const [showThinkingState, setShowThinkingState] = useState(false);

  const animations = [
    {
      name: 'Quantum Wave',
      component: QuantumWaveIndicator,
      description: 'Wave functions and probability clouds with quantum collapse (Default)'
    },
    {
      name: 'Runic Pulse',
      component: RunicPulseIndicator,
      description: 'Ancient runic symbols that draw themselves with mystical energy'
    },
    {
      name: 'Thinking Runes',
      component: ThinkingRunicIndicator,
      description: 'The word "THINKING" spelled out in runic-style letters with energy'
    },
    {
      name: 'Thinking Text',
      component: ThinkingTextIndicator,
      description: 'Clear, readable "THINKING" text with ceremonial energy effects'
    },
    {
      name: 'Neural Flow',
      component: NeuralFlowIndicator,
      description: 'Neural network with flowing synaptic signals'
    }
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Background layers */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-black to-slate-950" />
        
        {/* Floating orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-float-reverse" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="mb-12"
        >
          <h1 className="text-4xl font-extralight text-white/90 mb-4 tracking-tight">
            Typing Indicators
          </h1>
          <p className="text-lg text-white/60 max-w-2xl leading-relaxed">
            Explore different animation styles for the cosmic typing indicator. Each embodies the mystical minimalism of Orchestra's design system.
          </p>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
          className="mb-12"
        >
          <div className="flex items-center gap-4">
            <label className="text-sm text-white/50 uppercase tracking-wide">
              State
            </label>
            <button
              onClick={() => setShowThinkingState(!showThinkingState)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${showThinkingState 
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }
                hover:scale-105 active:scale-100
              `}
            >
              {showThinkingState ? 'Thinking' : 'Typing'}
            </button>
          </div>
        </motion.div>

        {/* Animation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {animations.map((animation, index) => {
            const Component = animation.component;
            
            return (
              <motion.div
                key={animation.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.6, 
                  delay: 0.2 + index * 0.1, 
                  ease: [0.23, 1, 0.32, 1] 
                }}
                className="
                  relative
                  bg-white/[0.03]
                  backdrop-blur-xl
                  border border-white/10
                  rounded-xl
                  overflow-hidden
                  p-8
                  hover:bg-white/[0.05]
                  transition-all duration-300
                "
              >
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
                
                {/* Content */}
                <div className="relative z-10">
                  {/* Animation showcase */}
                  <div className="flex items-center justify-center h-32 mb-6 overflow-hidden">
                    <Component 
                      showThinkingState={showThinkingState}
                      className={
                        animation.name === 'Thinking Runes' || animation.name === 'Thinking Text' 
                          ? 'scale-75' 
                          : 'scale-150'
                      }
                    />
                  </div>
                  
                  {/* Details */}
                  <div className="text-center">
                    <h3 className="text-xl font-medium text-white/90 mb-2">
                      {animation.name}
                    </h3>
                    <p className="text-sm text-white/60 leading-relaxed">
                      {animation.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Technical Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="mt-16"
        >
          <div className="
            bg-white/[0.03]
            backdrop-blur-xl
            border border-white/10
            rounded-xl
            p-8
          ">
            <h2 className="text-2xl font-medium text-white/90 mb-4">
              Design Principles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-white/70">
              <div>
                <h3 className="text-white/90 font-medium mb-2">Motion Philosophy</h3>
                <ul className="space-y-1">
                  <li>• Slower, gentler animations (3-6 second cycles)</li>
                  <li>• Water-inspired easing functions</li>
                  <li>• Organic, non-linear movement patterns</li>
                  <li>• Mystical minimalism aesthetic</li>
                </ul>
              </div>
              <div>
                <h3 className="text-white/90 font-medium mb-2">Visual Elements</h3>
                <ul className="space-y-1">
                  <li>• Sacred geometry and ethereal forms</li>
                  <li>• Subtle glow effects and transparency</li>
                  <li>• Purple gradients for thinking state</li>
                  <li>• Blue gradients for typing state</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}