import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '@/stores/chatStore';
import { useAgentConfigStore } from '@/stores/agentConfigStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type { AgentConfigTS, ToolDefinitionTS, ToolGroupTS } from '@/types/agentConfig';
import type { ChatSession } from '@/types/chatTypes';

// Icons
import { Sparkles } from 'lucide-react';

// Custom hook for magnetic hover effect
function useMagneticHover(strength = 0.3) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const distanceX = e.clientX - centerX;
      const distanceY = e.clientY - centerY;
      
      const distance = Math.sqrt(distanceX ** 2 + distanceY ** 2);
      const maxDistance = 100;
      
      if (distance < maxDistance) {
        const force = (1 - distance / maxDistance) * strength;
        setPosition({
          x: distanceX * force,
          y: distanceY * force
        });
      } else {
        setPosition({ x: 0, y: 0 });
      }
    };

    const handleMouseLeave = () => {
      setPosition({ x: 0, y: 0 });
    };

    window.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [strength]);

  return { ref, position };
}

// Typing animation for placeholder
function useTypewriter(text: string, speed = 50) {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!text) return;
    
    setIsTyping(true);
    setDisplayText('');
    let i = 0;
    
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayText(text.slice(0, i + 1));
        i++;
      } else {
        setIsTyping(false);
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  return { displayText, isTyping };
}

export function LandingPageTranscendent() {
  const navigate = useNavigate();
  const { createSession, sendMessage } = useChatStore();
  const { agentConfigs } = useAgentConfigStore();
  const { settings } = useSettingsStore();
  
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [userInput, setUserInput] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Get all available agents
  const availableAgents = useMemo(() => 
    Object.values(agentConfigs).filter(Boolean) as AgentConfigTS[],
    [agentConfigs]
  );

  // Initialize with default agent after a delay for drama
  useEffect(() => {
    const timer = setTimeout(() => {
      const defaultId = settings.defaultAgentId || Object.keys(agentConfigs)[0];
      if (defaultId && agentConfigs[defaultId]) {
        setSelectedAgentId(defaultId);
      }
    }, 800);
    
    return () => clearTimeout(timer);
  }, [agentConfigs, settings.defaultAgentId]);

  // Get selected agent
  const selectedAgent = selectedAgentId ? agentConfigs[selectedAgentId] : null;

  // Dynamic placeholder based on selected agent
  const placeholder = useMemo(() => {
    if (!selectedAgent) return "Choose your guide...";
    
    const name = selectedAgent.agent.name;
    const prompts = [
      `What's on your mind?`,
      `How can ${name} help you today?`,
      `Share your thoughts with ${name}...`,
      `Begin your journey...`
    ];
    
    return prompts[Math.floor(Math.random() * prompts.length)];
  }, [selectedAgent]);

  const { displayText: placeholderText } = useTypewriter(
    isInputFocused ? '' : placeholder,
    30
  );

  // Prepare agent template
  const prepareAgentTemplate = useCallback((config: AgentConfigTS): Partial<ChatSession> => {
    const avatar = config.agent.avatar?.startsWith('/') || config.agent.avatar?.startsWith('http')
      ? config.agent.avatar
      : (config.agent.avatar ? `/assets/avatars/${config.agent.avatar}` : '/assets/avatars/default_avatar.png');

    let template: Partial<ChatSession> = {
      name: config.agent.name || 'New Chat',
      avatar,
      specialty: config.agent.description || 'General Assistant',
      model: config.ai_config.model_id || 'gpt-4o-mini',
      tools: [],
      systemPrompt: config.agent.system_prompt || 'You are a helpful assistant.',
      temperature: config.ai_config.temperature ?? 0.7,
    };

    if (config.tool_groups && config.tool_groups.length > 0) {
      template.tools = config.tool_groups.flatMap(
        (tg: ToolGroupTS) => tg.tools.map((t: ToolDefinitionTS) => t.name)
      );
    }
    
    return template;
  }, []);

  // Handle starting a chat with beautiful transition
  const handleStartChat = async () => {
    if (!userInput.trim() || !selectedAgentId || !selectedAgent || isTransitioning) return;

    setIsTransitioning(true);
    
    // Beautiful exit animation
    if (containerRef.current) {
      containerRef.current.style.transform = 'scale(0.95)';
      containerRef.current.style.opacity = '0';
    }

    try {
      const agentTemplate = prepareAgentTemplate(selectedAgent);
      const sessionId = await createSession(
        selectedAgentId,
        selectedAgent.agent.name,
        agentTemplate
      );

      if (sessionId) {
        await sendMessage(userInput);
        setTimeout(() => {
          navigate(`/chat/${sessionId}`);
        }, 300);
      }
    } catch (error) {
      console.error('Failed to start chat:', error);
      setIsTransitioning(false);
    }
  };

  // Handle agent selection with grace
  const handleAgentSelect = (agentId: string) => {
    if (selectedAgentId === agentId) return;
    
    setHasInteracted(true);
    setSelectedAgentId(agentId);
    
    // Gentle haptic-like feedback (visual)
    if (containerRef.current) {
      containerRef.current.style.transform = 'scale(1.02)';
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.style.transform = 'scale(1)';
        }
      }, 150);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 overflow-hidden">
      {/* Pure gradient background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black" />
        
        {/* Subtle animated gradient orbs */}
        <div className="absolute inset-0">
          <div 
            className="absolute top-1/3 left-1/3 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
            style={{
              animation: 'float 20s ease-in-out infinite',
            }}
          />
          <div 
            className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
            style={{
              animation: 'float 25s ease-in-out infinite reverse',
            }}
          />
        </div>
      </div>

      {/* Main container with transition */}
      <div 
        ref={containerRef}
        className="relative z-10 w-full max-w-2xl transition-all duration-700 ease-out"
        style={{
          transform: 'scale(1)',
          opacity: 1,
        }}
      >
        {/* Ultra minimal header */}
        <div className="text-center mb-12 space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 backdrop-blur-sm mb-4">
            <Sparkles className="w-6 h-6 text-white/60" />
          </div>
          <h1 className="text-4xl md:text-5xl font-light tracking-tight text-white/90">
            {hasInteracted ? 'Perfect choice.' : 'Choose your guide.'}
          </h1>
        </div>

        {/* Agent selection - Larger cards in elegant layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 max-w-4xl mx-auto">
          {availableAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isSelected={selectedAgentId === agent.id}
              onSelect={() => handleAgentSelect(agent.id)}
            />
          ))}
        </div>

        {/* Input area - Only shows after selection */}
        <div 
          className={`transition-all duration-700 ease-out ${
            selectedAgent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          {/* Selected agent ready indicator - minimal and elegant */}
          {selectedAgent && (
            <div className="mb-6 text-center">
              <div className="inline-flex items-center gap-2 text-white/60 text-sm font-light">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                {selectedAgent.agent.name} is ready to assist
              </div>
            </div>
          )}
          
          <div className="relative">
            <textarea
              ref={inputRef}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              placeholder={placeholderText}
              className="w-full p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 text-white placeholder-white/30 resize-none h-32 focus:outline-none focus:border-white/20 transition-all duration-300"
              style={{
                fontSize: '18px',
                lineHeight: '28px',
                fontWeight: 300,
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleStartChat();
                }
              }}
            />
            
            {/* Send button - Appears when typing */}
            <button
              onClick={handleStartChat}
              disabled={!userInput.trim() || isTransitioning}
              className={`absolute bottom-4 right-4 w-12 h-12 rounded-full bg-white text-black flex items-center justify-center transition-all duration-300 ${
                userInput.trim() 
                  ? 'opacity-100 scale-100' 
                  : 'opacity-0 scale-75 pointer-events-none'
              } hover:scale-110 active:scale-95`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
          
          {/* Subtle hint */}
          <p className="text-center text-white/30 text-sm mt-4 font-light">
            Press Enter to begin
          </p>
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// Magnetic Agent Card Component - Redesigned for descriptions
function AgentCard({ agent, isSelected, onSelect }: {
  agent: AgentConfigTS;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { ref, position } = useMagneticHover(0.15);
  const [isHovered, setIsHovered] = useState(false);
  const [descriptionVisible, setDescriptionVisible] = useState(false);
  
  // Show description after a delay when selected or hovered
  useEffect(() => {
    if (isSelected || isHovered) {
      const timer = setTimeout(() => setDescriptionVisible(true), 200);
      return () => clearTimeout(timer);
    } else {
      setDescriptionVisible(false);
    }
  }, [isSelected, isHovered]);

  return (
    <div
      ref={ref}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative cursor-pointer"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        transition: 'transform 0.2s ease-out',
      }}
    >
      <div
        className={`
          relative p-8 rounded-3xl border backdrop-blur-md transition-all duration-700
          ${isSelected 
            ? 'bg-white/10 border-white/30 shadow-2xl shadow-white/10' 
            : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
          }
        `}
        style={{
          transform: isSelected ? 'scale(1.02)' : 'scale(1)',
          minHeight: isSelected || isHovered ? '280px' : '240px',
        }}
      >
        {/* Subtle gradient background */}
        <div 
          className="absolute inset-0 rounded-3xl opacity-30"
          style={{
            background: isSelected 
              ? 'radial-gradient(ellipse at center, rgba(59, 130, 246, 0.1), transparent 70%)'
              : 'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.02), transparent 70%)',
            transition: 'all 0.7s ease-out'
          }}
        />

        {/* Glow effect for selected */}
        {isSelected && (
          <div 
            className="absolute inset-0 rounded-3xl bg-white/10 blur-2xl -z-10"
            style={{
              animation: 'breathe 3s ease-in-out infinite',
            }}
          />
        )}

        {/* Content container */}
        <div className="relative z-10">
          {/* Avatar and name row */}
          <div className="flex items-center gap-4 mb-4">
            <div 
              className="relative w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-white/20 flex-shrink-0"
              style={{
                transform: (isHovered || isSelected) ? 'rotate(-2deg) scale(1.05)' : 'rotate(0deg) scale(1)',
                transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              {agent.agent.avatar ? (
                <img
                  src={agent.agent.avatar.startsWith('/') || agent.agent.avatar.startsWith('http')
                    ? agent.agent.avatar
                    : `/assets/avatars/${agent.agent.avatar}`}
                  alt={agent.agent.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500" />
              )}
              
              {/* Selection indicator on avatar */}
              {isSelected && (
                <div className="absolute inset-0 bg-white/20 flex items-center justify-center">
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex-1 text-left">
              <h3 className="text-white/90 font-light text-xl mb-1">
                {agent.agent.name}
              </h3>
              <p className="text-white/40 text-xs font-light">
                {agent.tool_groups?.length || 0} specialized capabilities
              </p>
            </div>
          </div>

          {/* Description - Beautiful reveal */}
          <div 
            className={`transition-all duration-700 ease-out overflow-hidden ${
              descriptionVisible ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="pt-4 border-t border-white/10">
              <p className="text-white/70 text-sm leading-relaxed font-light">
                {agent.agent.description}
              </p>
            </div>
          </div>

          {/* Subtle hint at bottom */}
          {!isSelected && !isHovered && (
            <div className="absolute bottom-4 left-8 right-8 text-center">
              <p className="text-white/20 text-xs font-light">
                Click to select
              </p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes breathe {
          0%, 100% { 
            opacity: 0.3;
            transform: scale(1);
          }
          50% { 
            opacity: 0.5;
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  );
}

export default LandingPageTranscendent;