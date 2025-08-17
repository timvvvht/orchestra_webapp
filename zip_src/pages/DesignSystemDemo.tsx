import React, { useState } from 'react'
import { ImprovedButton } from '@/components/ui/ImprovedButton'

import { cn } from '@/lib/utils'
import '../styles/improved-theme.css'

export function DesignSystemDemo() {
  const [currentView, setCurrentView] = useState<'landing' | 'chat' | 'components'>('components')

  return (
    <div className="min-h-screen bg-black">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-white font-medium">Design System Demo</h1>
            <div className="flex gap-2">
              <ImprovedButton
                variant={currentView === 'components' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setCurrentView('components')}
              >
                Components
              </ImprovedButton>
              <ImprovedButton
                variant={currentView === 'landing' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setCurrentView('landing')}
              >
                Landing
              </ImprovedButton>
              
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="pt-16">
        {currentView === 'components' && <ComponentsShowcase />}
        {currentView === 'landing' && <LandingShowcase />}
        
      </div>
    </div>
  )
}

function ComponentsShowcase() {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="space-y-12">
        {/* Typography */}
        <section>
          <h2 className="text-2xl font-medium text-white mb-6">Typography</h2>
          <div className="space-y-4">
            <h1 className="improved-heading-1">Heading 1 - Light & Large</h1>
            <h2 className="improved-heading-2">Heading 2 - Balanced Weight</h2>
            <p className="improved-body">Body text with good line height and contrast for readability.</p>
            <p className="improved-caption">Caption text for secondary information.</p>
          </div>
        </section>

        {/* Buttons */}
        <section>
          <h2 className="text-2xl font-medium text-white mb-6">Buttons</h2>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <ImprovedButton variant="primary" size="sm">Primary Small</ImprovedButton>
              <ImprovedButton variant="primary" size="md">Primary Medium</ImprovedButton>
              <ImprovedButton variant="primary" size="lg">Primary Large</ImprovedButton>
            </div>
            <div className="flex flex-wrap gap-4">
              <ImprovedButton variant="secondary" size="sm">Secondary Small</ImprovedButton>
              <ImprovedButton variant="secondary" size="md">Secondary Medium</ImprovedButton>
              <ImprovedButton variant="secondary" size="lg">Secondary Large</ImprovedButton>
            </div>
            <div className="flex flex-wrap gap-4">
              <ImprovedButton variant="ghost" size="sm">Ghost Small</ImprovedButton>
              <ImprovedButton variant="ghost" size="md">Ghost Medium</ImprovedButton>
              <ImprovedButton variant="ghost" size="lg">Ghost Large</ImprovedButton>
            </div>
            <div className="flex flex-wrap gap-4">
              <ImprovedButton variant="danger" size="sm">Danger Small</ImprovedButton>
              <ImprovedButton variant="danger" size="md">Danger Medium</ImprovedButton>
              <ImprovedButton variant="danger" size="lg">Danger Large</ImprovedButton>
            </div>
            <div className="flex flex-wrap gap-4">
              <ImprovedButton variant="primary" size="md" disabled>Disabled</ImprovedButton>
            </div>
          </div>
        </section>

        {/* Cards */}
        <section>
          <h2 className="text-2xl font-medium text-white mb-6">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="improved-card">
              <h3 className="text-white font-medium mb-2">Card Title</h3>
              <p className="text-white/60 text-sm">This is a card with improved styling and proper contrast.</p>
            </div>
            <div className="improved-card">
              <h3 className="text-white font-medium mb-2">Another Card</h3>
              <p className="text-white/60 text-sm">Cards provide clear content separation and visual hierarchy.</p>
            </div>
          </div>
        </section>

        {/* Inputs */}
        <section>
          <h2 className="text-2xl font-medium text-white mb-6">Inputs</h2>
          <div className="space-y-4 max-w-md">
            <input
              type="text"
              placeholder="Enter your name"
              className="improved-input w-full"
            />
            <textarea
              placeholder="Enter your message"
              rows={4}
              className="improved-input w-full resize-none"
            />
          </div>
        </section>

        {/* Spacing */}
        <section>
          <h2 className="text-2xl font-medium text-white mb-6">Spacing System</h2>
          <div className="space-y-4">
            <div className="improved-stack-2">
              <div className="bg-white/10 p-2 rounded">Stack 2 spacing</div>
              <div className="bg-white/10 p-2 rounded">Stack 2 spacing</div>
              <div className="bg-white/10 p-2 rounded">Stack 2 spacing</div>
            </div>
            <div className="improved-stack-4">
              <div className="bg-white/10 p-2 rounded">Stack 4 spacing</div>
              <div className="bg-white/10 p-2 rounded">Stack 4 spacing</div>
              <div className="bg-white/10 p-2 rounded">Stack 4 spacing</div>
            </div>
            <div className="improved-stack-6">
              <div className="bg-white/10 p-2 rounded">Stack 6 spacing</div>
              <div className="bg-white/10 p-2 rounded">Stack 6 spacing</div>
              <div className="bg-white/10 p-2 rounded">Stack 6 spacing</div>
            </div>
          </div>
        </section>

        {/* Glass Effect */}
        <section>
          <h2 className="text-2xl font-medium text-white mb-6">Glass Effect</h2>
          <div className="improved-glass p-6 rounded-2xl">
            <h3 className="text-white font-medium mb-2">Glass Card</h3>
            <p className="text-white/60 text-sm">This card uses backdrop blur and transparency for a modern glass effect.</p>
          </div>
        </section>
      </div>
    </div>
  )
}

function LandingShowcase() {
  const [message, setMessage] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<any>(null)
  const [showAgents, setShowAgents] = useState(false)

  const mockAgents = [
    {
      id: '1',
      name: 'Code Assistant',
      avatar: 'https://via.placeholder.com/24x24/3B82F6/FFFFFF?text=C',
      description: 'Helps with debugging and code analysis'
    },
    {
      id: '2', 
      name: 'Data Analyst',
      avatar: 'https://via.placeholder.com/24x24/10B981/FFFFFF?text=D',
      description: 'Analyzes CSV data and creates insights'
    },
    {
      id: '3',
      name: 'React Expert',
      avatar: 'https://via.placeholder.com/24x24/8B5CF6/FFFFFF?text=R', 
      description: 'Specializes in React components and patterns'
    }
  ]

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />
      
      <div className="relative z-10 w-full max-w-2xl">
        {/* Minimal branding */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 mb-6">
            <div className="w-6 h-6 text-white">✨</div>
          </div>
          <h1 className="text-4xl md:text-5xl font-light text-white mb-2">
            What can I help with?
          </h1>
          <p className="text-white/60 text-lg">
            AI assistants for code, research, and analysis
          </p>
        </div>

        {/* Input container */}
        <div className="relative bg-gray-900 rounded-2xl border border-white/10 shadow-2xl">
          {/* Agent selector */}
          <button
            onClick={() => setShowAgents(!showAgents)}
            className="w-full flex items-center justify-between p-4 border-b border-white/10 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-white/60 text-sm">To:</span>
              {selectedAgent ? (
                <div className="flex items-center gap-2">
                  <img 
                    src={selectedAgent.avatar} 
                    className="w-6 h-6 rounded-lg"
                    alt=""
                  />
                  <span className="text-white">{selectedAgent.name}</span>
                </div>
              ) : (
                <span className="text-white/60">Select an assistant</span>
              )}
            </div>
            <div className={cn(
              "w-4 h-4 text-white/40 transition-transform",
              showAgents && "rotate-180"
            )}>
              ▼
            </div>
          </button>

          {/* Agent dropdown */}
          {showAgents && (
            <div className="border-b border-white/10">
              {mockAgents.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => {
                    setSelectedAgent(agent)
                    setShowAgents(false)
                  }}
                  className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors"
                >
                  <img 
                    src={agent.avatar} 
                    className="w-6 h-6 rounded-lg"
                    alt=""
                  />
                  <div className="text-left">
                    <div className="text-white font-medium">{agent.name}</div>
                    <div className="text-white/40 text-sm">{agent.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Message input */}
          <div className="relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="w-full p-4 bg-transparent text-white placeholder-white/40 resize-none h-32 focus:outline-none"
            />
            
            {/* Send button */}
            <div className="absolute bottom-4 right-4">
              <ImprovedButton
                onClick={() => console.log('Send message')}
                disabled={!message.trim() || !selectedAgent}
                size="sm"
                className="gap-2"
              >
                Send
                <div className="w-4 h-4">→</div>
              </ImprovedButton>
            </div>
          </div>
        </div>

        {/* Quick examples */}
        <div className="mt-6 flex flex-wrap gap-2 justify-center">
          {['Debug Python code', 'Analyze CSV data', 'Write React component'].map(example => (
            <button
              key={example}
              onClick={() => setMessage(example)}
              className="px-3 py-1.5 text-sm text-white/60 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-all"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default DesignSystemDemo 