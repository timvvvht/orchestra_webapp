import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Sparkles, ChevronDown } from 'lucide-react'
import { ImprovedButton } from '@/components/ui/ImprovedButton'
import { cn } from '@/lib/utils'

// Mock data for demonstration
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

export function LandingExperimental() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<any>(null)
  const [showAgents, setShowAgents] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSend = () => {
    if (!message.trim() || !selectedAgent) return
    
    // Navigate to chat with the selected agent and message
    navigate('/chat/new', { 
      state: { 
        agent: selectedAgent,
        initialMessage: message 
      }
    })
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      {/* Subtle gradient background - less is more */}
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />
      
      <div className="relative z-10 w-full max-w-2xl">
        {/* Minimal branding (Rule #1: Start with a Feature, Not a Layout) */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 mb-6">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-light text-white mb-2">
            What can I help with?
          </h1>
          <p className="text-white/60 text-lg">
            AI assistants for code, research, and analysis
          </p>
        </div>

        {/* Simplified input container (Rule #7: Offset Your Shadows) */}
        <div className="relative bg-gray-900 rounded-2xl border border-white/10 shadow-2xl">
          {/* Agent selector - integrated, not floating */}
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
            <ChevronDown className={cn(
              "w-4 h-4 text-white/40 transition-transform",
              showAgents && "rotate-180"
            )} />
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

          {/* Message input - clean and focused */}
          <div className="relative">
            <textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="w-full p-4 bg-transparent text-white placeholder-white/40 resize-none h-32 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.metaKey) {
                  handleSend()
                }
              }}
            />
            
            {/* Send button - prominent but not overwhelming */}
            <div className="absolute bottom-4 right-4">
              <ImprovedButton
                onClick={handleSend}
                disabled={!message.trim() || !selectedAgent}
                size="sm"
                className="gap-2"
              >
                Send
                <Send className="w-4 h-4" />
              </ImprovedButton>
            </div>
          </div>
        </div>

        {/* Quick examples - subtle suggestions (Rule #15: Use Borders to Create Contrast) */}
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

export default LandingExperimental 