import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  SparklesIcon,
  BrainIcon,
  HeartIcon,
  RocketIcon,
  StarIcon,
  ZapIcon,
  WandIcon,
  CommandIcon,
  MessageSquareIcon,
  SearchIcon,
  PenToolIcon,
  BookOpenIcon,
  InfinityIcon,
  ChevronRightIcon,
  MousePointerClickIcon,
  SparkleIcon,
  FolderOpenIcon,
  HomeIcon,
  LightbulbIcon
} from 'lucide-react';
import { setUserName, setUserGoals, setOnboardingCompleted } from '@/utils/userPreferences';
import { setPreference, getDefaultVaultPath, ensureDirectoryExists } from '@/api/settingsApi';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAgentConfigStore } from '@/stores/agentConfigStore';
import type { AgentConfigTS } from '@/types/agentTypes';
import { enrichAgentMetadata } from '@/utils/agentMetadataEnricher';

interface OnboardingRevolutionRefinedProps {
  isOpen: boolean;
  onComplete: () => void;
}

// Subtle particle system with monochrome palette
const SubtleParticle: React.FC<{ delay: number; index: number }> = ({ delay, index }) => {
  const startX = useMemo(() => Math.random() * 400 - 200, []);
  const endX = useMemo(() => startX + (Math.random() * 50 - 25), [startX]);
  
  return (
    <motion.div
      className="absolute w-0.5 h-0.5 bg-white/20 rounded-full will-change-transform"
      initial={{ x: startX, y: 200, scale: 0, opacity: 0 }}
      animate={{ 
        y: -200,
        scale: [0, 1, 0],
        x: endX,
        opacity: [0, 0.6, 0]
      }}
      transition={{ 
        duration: 6,
        delay: delay + (index * 0.5),
        repeat: Infinity,
        ease: "linear"
      }}
    />
  );
};

// Refined typewriter with subtle cursor
const TypewriterText: React.FC<{ text: string; delay?: number; onComplete?: () => void }> = ({ 
  text, 
  delay = 0,
  onComplete 
}) => {
  const [displayText, setDisplayText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  
  useEffect(() => {
    let currentIndex = 0;
    const startTime = Date.now() + delay;
    
    const interval = setInterval(() => {
      if (Date.now() < startTime) return;
      
      if (currentIndex < text.length) {
        setDisplayText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setShowCursor(false);
          if (onComplete) onComplete();
        }, 500);
      }
    }, 40);
    
    return () => clearInterval(interval);
  }, [text, delay, onComplete]);
  
  return (
    <span className="inline-block">
      {displayText}
      {showCursor && (
        <span className="inline-block w-0.5 h-5 bg-white/50 ml-0.5 animate-pulse" />
      )}
    </span>
  );
};

// Interactive AI preview - the magic moment
const AIPreview: React.FC<{ onInteract: () => void }> = ({ onInteract }) => {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'ai'; content: string }>>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showMagicMoment, setShowMagicMoment] = useState(false);
  
  useEffect(() => {
    // Start the conversation simulation
    const timer1 = setTimeout(() => {
      setMessages([{ role: 'user', content: "What can you help me with?" }]);
      setIsTyping(true);
    }, 500);
    
    // AI starts responding
    const timer2 = setTimeout(() => {
      setIsTyping(false);
      setMessages([
        { role: 'user', content: "What can you help me with?" },
        { 
          role: 'ai', 
          content: "I can help you organize knowledge, automate tasks, research any topic, and so much more. But here's something special..." 
        }
      ]);
      setShowMagicMoment(true);
    }, 2000);
    
    // The magic moment
    const timer3 = setTimeout(() => {
      setMessages(prev => [
        ...prev,
        { 
          role: 'ai', 
          content: "✨ I'm already learning about you and adapting to your needs. Let me show you how we can work together." 
        }
      ]);
    }, 3500);
    
    // Trigger phase transition
    const timer4 = setTimeout(() => {
      onInteract();
    }, 5500);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onInteract]);
  
  return (
    <motion.div 
      className="bg-white/[0.02] backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-2xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="space-y-4 min-h-[250px]">
        {messages.length === 0 && !isTyping && (
          <div className="text-white/30 text-sm text-center py-8">
            Initializing conversation...
          </div>
        )}
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ x: msg.role === 'user' ? 20 : -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: idx * 0.1 }}
            className={cn(
              "flex gap-3",
              msg.role === 'user' ? "justify-end" : "justify-start"
            )}
          >
            {msg.role === 'ai' && (
              <motion.div 
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
              >
                <BrainIcon className="w-4 h-4 text-white/70" />
              </motion.div>
            )}
            <motion.div 
              className={cn(
                "px-4 py-2.5 rounded-2xl max-w-[80%]",
                msg.role === 'user' 
                  ? "bg-white/10 text-white/90" 
                  : "bg-white/[0.05] text-white/80 border border-white/5"
              )}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-sm leading-relaxed">{msg.content}</p>
            </motion.div>
          </motion.div>
        ))}
        
        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <BrainIcon className="w-4 h-4 text-white/70" />
            </div>
            <div className="bg-white/[0.05] px-4 py-2.5 rounded-2xl">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 bg-white/40 rounded-full"
                    animate={{ 
                      y: [0, -4, 0],
                      opacity: [0.4, 1, 0.4]
                    }}
                    transition={{ 
                      duration: 1.2, 
                      repeat: Infinity,
                      delay: i * 0.2 
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
        
        {showMagicMoment && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
            className="flex justify-center mt-6"
          >
            <p className="text-xs text-white/40 flex items-center gap-2">
              <MousePointerClickIcon className="w-3 h-3" />
              This is just the beginning...
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

const OnboardingRevolutionRefined: React.FC<OnboardingRevolutionRefinedProps> = ({ isOpen, onComplete }) => {
  const [phase, setPhase] = useState<'intro' | 'name' | 'demo' | 'customize' | 'vault' | 'agents' | 'finale'>('intro');
  const [userName, setUserNameState] = useState('');
  const [selectedPowers, setSelectedPowers] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [proposedVaultPath, setProposedVaultPath] = useState('');
  const [selectedVaultPath, setSelectedVaultPath] = useState('');
  const [pathError, setPathError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const setVaultSetting = useSettingsStore((state) => state.setVaultSetting);
  const vaultPathFromStore = useSettingsStore((state) => state.settings.vault.path);
  
  // Agent store hooks
  const { agentConfigs, fetchAgentConfigs } = useAgentConfigStore();
  const [agents, setAgents] = useState<AgentConfigTS[]>([]);
  
  // Refined color palette - more sophisticated
  const powers = [
    { 
      id: 'research', 
      label: 'Research Assistant',
      icon: <SearchIcon className="w-5 h-5" />,
      description: 'Deep dive into any topic',
      gradient: 'from-slate-400 to-slate-600'
    },
    { 
      id: 'writing', 
      label: 'Writing Companion',
      icon: <PenToolIcon className="w-5 h-5" />,
      description: 'Craft beautiful prose',
      gradient: 'from-slate-500 to-slate-700'
    },
    { 
      id: 'knowledge', 
      label: 'Knowledge Architect',
      icon: <BookOpenIcon className="w-5 h-5" />,
      description: 'Build your second brain',
      gradient: 'from-zinc-400 to-zinc-600'
    },
    { 
      id: 'automation', 
      label: 'Automation Wizard',
      icon: <ZapIcon className="w-5 h-5" />,
      description: 'Automate the mundane',
      gradient: 'from-neutral-400 to-neutral-600'
    }
  ];
  
  const handleNameSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim()) {
      setPhase('demo');
    }
  }, [userName]);
  
  const handlePowerToggle = useCallback((powerId: string) => {
    setSelectedPowers(prev => 
      prev.includes(powerId) 
        ? prev.filter(id => id !== powerId)
        : [...prev, powerId]
    );
  }, []);
  
  // Load default vault path
  useEffect(() => {
    if (isOpen && phase === 'vault') {
      setIsLoading(true);
      getDefaultVaultPath()
        .then((path) => {
          setProposedVaultPath(path);
          if (!vaultPathFromStore) {
            setSelectedVaultPath(path);
          } else {
            setSelectedVaultPath(vaultPathFromStore);
          }
        })
        .catch((error) => {
          console.error('Failed to fetch default vault path:', error);
          setProposedVaultPath('');
          setSelectedVaultPath('');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, phase, vaultPathFromStore]);
  
  // Fetch agents when entering agents phase
  useEffect(() => {
    if (phase === 'agents' && Object.keys(agentConfigs).length === 0) {
      fetchAgentConfigs();
    }
  }, [phase, fetchAgentConfigs, agentConfigs]);
  
  // Update agents when agentConfigs changes
  useEffect(() => {
    if (Object.keys(agentConfigs).length > 0) {
      const enrichedAgents = Object.values(agentConfigs).map(enrichAgentMetadata);
      setAgents(enrichedAgents.slice(0, 3)); // Show only first 3 agents
    }
  }, [agentConfigs]);
  
  const handleUseDefaultPath = async () => {
    if (proposedVaultPath) {
      setSelectedVaultPath(proposedVaultPath);
      if (pathError) setPathError(null);
    }
  };
  
  const handleVaultNext = async () => {
    if (!selectedVaultPath || selectedVaultPath.trim() === '') {
      setPathError('Please enter a valid path for your vault');
      return;
    }
    
    setIsLoading(true);
    setPathError(null);
    
    try {
      // Ensure the directory exists
      await ensureDirectoryExists(selectedVaultPath);
      
      // Save the vault path
      await setVaultSetting('path', selectedVaultPath);
      console.log('Vault path set successfully:', selectedVaultPath);
      
      // Move to agents phase
      setPhase('agents');
    } catch (error) {
      console.error('Error processing vault path:', error);
      setPathError(`Error creating directory: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const completeOnboarding = useCallback(async () => {
    setIsProcessing(true);
    try {
      // Save preferences
      setOnboardingCompleted();
      setUserName(userName);
      setUserGoals(selectedPowers);
      
      // Save to Tauri store
      await setPreference('onboarding.userName', userName);
      await setPreference('onboarding.userGoals', selectedPowers);
      await setPreference('onboarding.completed', true);
      
      setTimeout(() => {
        onComplete();
      }, 1000);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setIsProcessing(false);
    }
  }, [userName, selectedPowers, onComplete]);
  
  // Render different phases
  const renderPhase = () => {
    switch (phase) {
      case 'intro':
        return (
          <motion.div
            key="intro"
            className="relative flex flex-col items-center justify-center min-h-[600px] text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Subtle particle effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <SubtleParticle key={i} delay={i * 0.3} index={i} />
              ))}
            </div>
            
            {/* Refined logo */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 200,
                damping: 20,
                duration: 0.8 
              }}
              className="relative mb-8"
            >
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-white/10 to-white/5 p-0.5">
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                  <InfinityIcon className="w-14 h-14 text-white/80" />
                </div>
              </div>
              {/* Subtle glow */}
              <div className="absolute inset-0 rounded-full bg-white/5 blur-xl scale-150" />
            </motion.div>
            
            <motion.h1
              className="text-5xl font-light tracking-wide text-white/90 mb-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Orchestra
            </motion.h1>
            
            <motion.p
              className="text-lg text-white/60 mb-12 max-w-md font-light"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <TypewriterText 
                text="Where human creativity meets infinite intelligence" 
                delay={800}
              />
            </motion.p>
            
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 2.5, type: "spring" }}
            >
              <Button
                size="lg"
                onClick={() => setPhase('name')}
                className="bg-white text-black hover:bg-white/90 px-8 py-6 text-base rounded-full transition-all duration-300 font-medium"
              >
                Begin
                <ChevronRightIcon className="ml-2 w-4 h-4" />
              </Button>
            </motion.div>
          </motion.div>
        );
        
      case 'name':
        return (
          <motion.div
            key="name"
            className="flex flex-col items-center justify-center min-h-[600px] text-center px-8"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1 }}
              className="mb-8"
            >
              <div className="w-20 h-20 rounded-full bg-white/5 backdrop-blur-sm flex items-center justify-center">
                <HeartIcon className="w-10 h-10 text-white/70" />
              </div>
            </motion.div>
            
            <h2 className="text-3xl font-light text-white/90 mb-4">Let's get acquainted</h2>
            <p className="text-base text-white/60 mb-8 max-w-md font-light">
              I'm Orchestra, your creative companion. What should I call you?
            </p>
            
            <form onSubmit={handleNameSubmit} className="w-full max-w-sm">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Input
                  type="text"
                  placeholder="Your name"
                  value={userName}
                  onChange={(e) => setUserNameState(e.target.value)}
                  className="text-center text-xl h-12 mb-6 bg-white/5 border-white/20 focus:border-white/40 transition-all placeholder:text-white/30"
                  autoFocus
                />
              </motion.div>
              
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  type="submit"
                  size="lg"
                  disabled={!userName.trim()}
                  className="w-full bg-white text-black hover:bg-white/90 font-medium disabled:bg-white/20 disabled:text-white/50"
                >
                  Continue
                  <ChevronRightIcon className="ml-2 w-4 h-4" />
                </Button>
              </motion.div>
            </form>
          </motion.div>
        );
        
      case 'demo':
        return (
          <motion.div
            key="demo"
            className="flex flex-col items-center justify-center min-h-[600px] px-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.h2
              className="text-2xl font-light text-white/90 mb-2 text-center"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              Nice to meet you, {userName}
            </motion.h2>
            
            <motion.p
              className="text-base text-white/60 mb-8 text-center font-light"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Watch what happens next
            </motion.p>
            
            <motion.div
              className="w-full max-w-2xl"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <AIPreview key="ai-preview-demo" onInteract={() => {
                setTimeout(() => setPhase('customize'), 500);
              }} />
            </motion.div>
          </motion.div>
        );
        
      case 'customize':
        return (
          <motion.div
            key="customize"
            className="flex flex-col items-center justify-center min-h-[600px] px-8 py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="mb-6">
              <div className="w-16 h-16 rounded-full bg-white/5 backdrop-blur-sm flex items-center justify-center">
                <WandIcon className="w-8 h-8 text-white/70" />
              </div>
            </div>
            
            <h2 className="text-2xl font-light text-white/90 mb-2 text-center">
              Choose your focus areas
            </h2>
            <p className="text-base text-white/60 mb-8 text-center max-w-md font-light">
              Select what interests you most. Everything else is always available.
            </p>
            
            <div className="grid grid-cols-2 gap-4 w-full max-w-2xl mb-10">
              {powers.map((power) => (
                <button
                  key={power.id}
                  onClick={() => handlePowerToggle(power.id)}
                  className={cn(
                    "relative text-left p-6 rounded-2xl border transition-all duration-200",
                    selectedPowers.includes(power.id)
                      ? "border-white/40 bg-white/[0.08] shadow-lg"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                  )}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      selectedPowers.includes(power.id)
                        ? "bg-white/20"
                        : "bg-white/10"
                    )}>
                      <span className={cn(
                        "transition-colors duration-200",
                        selectedPowers.includes(power.id)
                          ? "text-white"
                          : "text-white/70"
                      )}>
                        {power.icon}
                      </span>
                    </div>
                    
                    {selectedPowers.includes(power.id) && (
                      <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  <h3 className={cn(
                    "font-medium mb-2 text-base transition-colors duration-200",
                    selectedPowers.includes(power.id)
                      ? "text-white"
                      : "text-white/80"
                  )}>
                    {power.label}
                  </h3>
                  <p className={cn(
                    "text-sm leading-relaxed transition-colors duration-200",
                    selectedPowers.includes(power.id)
                      ? "text-white/70"
                      : "text-white/50"
                  )}>
                    {power.description}
                  </p>
                </button>
              ))}
            </div>
            
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Button
                size="lg"
                onClick={() => setPhase('vault')}
                disabled={selectedPowers.length === 0}
                className="bg-white text-black hover:bg-white/90 font-medium disabled:bg-white/20 disabled:text-white/50"
              >
                Continue
                <ChevronRightIcon className="ml-2 w-4 h-4" />
              </Button>
            </motion.div>
          </motion.div>
        );
        
      case 'vault':
        return (
          <motion.div
            key="vault"
            className="flex flex-col items-center justify-center min-h-[600px] px-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring" }}
              className="mb-6"
            >
              <div className="w-16 h-16 rounded-full bg-white/5 backdrop-blur-sm flex items-center justify-center">
                <FolderOpenIcon className="w-8 h-8 text-white/70" />
              </div>
            </motion.div>
            
            <h2 className="text-2xl font-light text-white/90 mb-2 text-center">
              Set up your vault
            </h2>
            <p className="text-base text-white/60 mb-8 text-center max-w-md font-light">
              Your vault is where all your data and notes will be stored securely
            </p>
            
            <div className="w-full max-w-xl space-y-5">
              <div className="space-y-4 bg-white/[0.02] backdrop-blur-sm p-6 rounded-xl border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/5">
                    <HomeIcon className="h-4 w-4 text-white/60" />
                  </div>
                  <label className="text-sm font-medium text-white/80">
                    Vault Location
                  </label>
                </div>
                
                <div className="space-y-3">
                  <p className="text-sm text-white/50 font-light">
                    Choose where to store your vault. We suggest a default location, but you can change it.
                  </p>
                  
                  <Input 
                    type="text" 
                    value={selectedVaultPath || (isLoading ? 'Loading...' : proposedVaultPath)} 
                    onChange={(e) => {
                      setSelectedVaultPath(e.target.value);
                      if (pathError) setPathError(null);
                    }} 
                    placeholder="Enter your vault path"
                    className="font-mono text-sm bg-white/5 border-white/20 focus:border-white/40 placeholder:text-white/30"
                    disabled={isLoading}
                  />
                  
                  {pathError && (
                    <p className='text-red-400 text-xs'>{pathError}</p>
                  )}
                  
                  <div className="flex justify-end">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleUseDefaultPath}
                      disabled={!proposedVaultPath || isLoading}
                      className="text-white/60 hover:text-white/80 hover:bg-white/10"
                    >
                      Use default path
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/[0.02] backdrop-blur-sm p-4 rounded-lg text-sm border border-white/10">
                <h4 className="font-medium flex items-center text-white/70 mb-2">
                  <LightbulbIcon className="w-4 h-4 mr-2 text-white/50" />
                  Tips
                </h4>
                <ul className="space-y-1 text-white/50 text-xs">
                  <li>• Choose a location included in your regular backups</li>
                  <li>• Avoid cloud-synced folders for large vaults</li>
                  <li>• You can change this location later in settings</li>
                </ul>
              </div>
              
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex justify-center pt-2"
              >
                <Button
                  size="lg"
                  onClick={handleVaultNext}
                  disabled={isLoading || !selectedVaultPath}
                  className="bg-white text-black hover:bg-white/90 font-medium disabled:bg-white/20 disabled:text-white/50"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-black/50 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Continue
                      <ChevronRightIcon className="ml-2 w-4 h-4" />
                    </>
                  )}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        );
        
      case 'agents':
        return (
          <motion.div
            key="agents"
            className="flex flex-col items-center justify-center min-h-[600px] px-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring" }}
              className="mb-6"
            >
              <div className="w-16 h-16 rounded-full bg-white/5 backdrop-blur-sm flex items-center justify-center">
                <BrainIcon className="w-8 h-8 text-white/70" />
              </div>
            </motion.div>
            
            <h2 className="text-2xl font-light text-white/90 mb-2 text-center">
              Meet your agents
            </h2>
            <p className="text-base text-white/60 mb-8 text-center max-w-md font-light">
              These AI assistants are ready to help you achieve your goals
            </p>
            
            {/* Agent Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl mb-8">
              {agents.length === 0 ? (
                <div className="col-span-3 text-center py-8">
                  <div className="w-8 h-8 border-2 border-white/30 border-t-white/70 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-white/50 text-sm">Loading agents...</p>
                </div>
              ) : (
                agents.map((agent, index) => {
                  const metadata = agent.agent.metadata || {};
                  const capabilities = metadata.capabilities || [];
                  const primaryCapability = capabilities[0] || 'AI Assistant';
                  
                  return (
                    <motion.div
                      key={agent.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative group"
                    >
                      <div className="bg-white/[0.02] backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300">
                        {/* Agent Icon */}
                        <div className="mb-4">
                          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                            {index === 0 && <SearchIcon className="w-6 h-6 text-white/70" />}
                            {index === 1 && <ZapIcon className="w-6 h-6 text-white/70" />}
                            {index === 2 && <BookOpenIcon className="w-6 h-6 text-white/70" />}
                          </div>
                        </div>
                        
                        {/* Agent Info */}
                        <h3 className="font-medium text-white/90 mb-1">
                          {agent.agent.name}
                        </h3>
                        <p className="text-sm text-white/50 mb-3">
                          {primaryCapability}
                        </p>
                        
                        {/* Description */}
                        <p className="text-xs text-white/40 line-clamp-2 mb-4">
                          {agent.agent.description}
                        </p>
                        
                        {/* Stats */}
                        <div className="flex items-center gap-3 text-xs text-white/30">
                          <div className="flex items-center gap-1">
                            <SparklesIcon className="w-3 h-3" />
                            <span>{metadata.usage?.total_invocations?.toLocaleString() || '1k+'} uses</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ZapIcon className="w-3 h-3" />
                            <span>{metadata.usage?.average_response_time_ms || 200}ms</span>
                          </div>
                        </div>
                        
                        {/* Hover effect */}
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
            
            {/* Info text */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-sm text-white/40 text-center mb-8 max-w-md"
            >
              You can explore more agents and install new ones from the Agent Store after setup
            </motion.p>
            
            {/* Continue button */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <Button
                size="lg"
                onClick={() => setPhase('finale')}
                className="bg-white text-black hover:bg-white/90 font-medium"
              >
                Continue
                <ChevronRightIcon className="ml-2 w-4 h-4" />
              </Button>
            </motion.div>
          </motion.div>
        );
        
      case 'finale':
        return (
          <motion.div
            key="finale"
            className="flex flex-col items-center justify-center min-h-[600px] text-center px-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 260,
                damping: 20
              }}
              className="mb-8 relative"
            >
              <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <RocketIcon className="w-12 h-12 text-white/80" />
              </div>
              
              {/* Subtle celebration pulse */}
              <motion.div
                className="absolute inset-0"
                initial={{ scale: 1 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ duration: 1 }}
              >
                <div className="w-24 h-24 rounded-full bg-white/10" />
              </motion.div>
            </motion.div>
            
            <motion.h2
              className="text-3xl font-light text-white/90 mb-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Welcome to Orchestra, {userName}
            </motion.h2>
            
            <motion.p
              className="text-base text-white/60 mb-8 max-w-md font-light"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Your creative workspace is ready. Let's create something extraordinary.
            </motion.p>
            
            <motion.div
              className="flex flex-col gap-3 items-center mb-8"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <div className="flex gap-2 text-sm text-white/50">
                <Badge variant="secondary" className="gap-1 bg-white/10 border-white/20">
                  <CommandIcon className="w-3 h-3" />
                  K
                </Badge>
                <span>Search anything</span>
              </div>
              
              <div className="flex gap-2 text-sm text-white/50">
                <Badge variant="secondary" className="gap-1 bg-white/10 border-white/20">
                  <CommandIcon className="w-3 h-3" />
                  N
                </Badge>
                <span>New conversation</span>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1, type: "spring" }}
            >
              <Button
                size="lg"
                onClick={completeOnboarding}
                disabled={isProcessing}
                className="bg-white text-black hover:bg-white/90 px-8 py-6 text-base rounded-full font-medium"
              >
                {isProcessing ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="w-5 h-5 border-2 border-black border-t-transparent rounded-full"
                  />
                ) : (
                  <>
                    Launch Orchestra
                    <SparklesIcon className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
            </motion.div>
          </motion.div>
        );
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <MotionConfig reducedMotion="user">
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent 
          className="max-w-4xl p-0 bg-black border-0 max-h-[90vh] overflow-hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div 
            ref={containerRef}
            className="relative bg-gradient-to-b from-zinc-950 to-black text-white overflow-y-auto max-h-[90vh]"
          >
            {/* Very subtle background gradient */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-white/[0.02] rounded-full blur-3xl" />
              <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-white/[0.02] rounded-full blur-3xl" />
            </div>
            
            {/* Content */}
            <AnimatePresence mode="wait">
              {renderPhase()}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>
    </MotionConfig>
  );
};

export default OnboardingRevolutionRefined;