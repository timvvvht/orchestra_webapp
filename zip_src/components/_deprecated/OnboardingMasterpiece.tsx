import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';
import { setUserName, setUserGoals, setOnboardingCompleted } from '@/utils/userPreferences';
import { setPreference, getDefaultVaultPath, ensureDirectoryExists } from '@/api/settingsApi';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAgentConfigStore } from '@/stores/agentConfigStore';
import type { AgentConfigTS } from '@/types/agentTypes';
import { enrichAgentMetadata } from '@/utils/agentMetadataEnricher';

interface OnboardingMasterpieceProps {
  isOpen: boolean;
  onComplete: () => void;
}

// Magic constants for the golden ratio
const GOLDEN_RATIO = 1.618;
const TRANSITION_DURATION = 0.8;
const STAGGER_DELAY = 0.08;

// Phases - each a moment of revelation
type Phase = 'awakening' | 'introduction' | 'connection' | 'purpose' | 'foundation' | 'companions' | 'departure';

const OnboardingMasterpiece: React.FC<OnboardingMasterpieceProps> = ({ isOpen, onComplete }) => {
  const [phase, setPhase] = useState<Phase>('awakening');
  const [userName, setUserName] = useState('');
  const [selectedPurposes, setSelectedPurposes] = useState<string[]>([]);
  const [vaultPath, setVaultPath] = useState('');
  const [defaultVaultPath, setDefaultVaultPath] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Mouse tracking for ambient interaction
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // Smooth spring animations for mouse movement
  const springConfig = { damping: 25, stiffness: 150 };
  const mouseXSpring = useSpring(mouseX, springConfig);
  const mouseYSpring = useSpring(mouseY, springConfig);
  
  // Create transforms outside of conditional rendering
  const glowX = useTransform(mouseXSpring, v => v * 100);
  const glowY = useTransform(mouseYSpring, v => v * 100);
  
  // Store hooks
  const setVaultSetting = useSettingsStore((state) => state.setVaultSetting);
  const { agentConfigs, fetchAgentConfigs } = useAgentConfigStore();
  const [agents, setAgents] = useState<AgentConfigTS[]>([]);
  
  // Track mouse movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        mouseX.set((e.clientX - rect.left - rect.width / 2) / rect.width);
        mouseY.set((e.clientY - rect.top - rect.height / 2) / rect.height);
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);
  
  // Load agents
  useEffect(() => {
    if (phase === 'companions' && Object.keys(agentConfigs).length === 0) {
      fetchAgentConfigs();
    }
  }, [phase, fetchAgentConfigs, agentConfigs]);
  
  // Update agents when configs change
  useEffect(() => {
    if (Object.keys(agentConfigs).length > 0) {
      const enrichedAgents = Object.values(agentConfigs).map(enrichAgentMetadata);
      setAgents(enrichedAgents.slice(0, 3));
    }
  }, [agentConfigs]);
  
  // Load default vault path
  useEffect(() => {
    if (phase === 'foundation') {
      getDefaultVaultPath().then(path => {
        setDefaultVaultPath(path);
        if (!vaultPath) setVaultPath(path);
      });
    }
  }, [phase, vaultPath]);
  
  // Auto-advance from awakening
  useEffect(() => {
    if (phase === 'awakening') {
      const timer = setTimeout(() => setPhase('introduction'), 3000);
      return () => clearTimeout(timer);
    }
  }, [phase]);
  
  // Purpose options with poetic descriptions
  const purposes = [
    { id: 'create', label: 'Create', description: 'Bring ideas to life' },
    { id: 'discover', label: 'Discover', description: 'Explore the unknown' },
    { id: 'build', label: 'Build', description: 'Craft the future' },
    { id: 'learn', label: 'Learn', description: 'Expand horizons' }
  ];
  
  const handleComplete = async () => {
    setIsProcessing(true);
    try {
      // Save preferences
      setOnboardingCompleted();
      setUserName(userName);
      setUserGoals(selectedPurposes);
      
      await setPreference('onboarding.userName', userName);
      await setPreference('onboarding.userGoals', selectedPurposes);
      await setPreference('onboarding.completed', true);
      
      // Dramatic pause before completion
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setIsProcessing(false);
    }
  };
  
  const renderPhase = () => {
    switch (phase) {
      case 'awakening':
        return (
          <motion.div
            key="awakening"
            className="relative flex items-center justify-center h-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
          >
            {/* The dot that becomes everything */}
            <motion.div
              className="relative"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                duration: 2,
                ease: [0.21, 0.47, 0.32, 0.98]
              }}
            >
              <motion.div
                className="w-2 h-2 bg-white rounded-full"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              {/* Ripple effect */}
              <motion.div
                className="absolute inset-0 rounded-full border border-white/20"
                initial={{ scale: 1, opacity: 0 }}
                animate={{ 
                  scale: [1, 20, 40],
                  opacity: [0, 0.5, 0]
                }}
                transition={{
                  duration: 3,
                  ease: "easeOut"
                }}
              />
            </motion.div>
          </motion.div>
        );
        
      case 'introduction':
        return (
          <motion.div
            key="introduction"
            className="relative flex flex-col items-center justify-center h-screen px-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: TRANSITION_DURATION }}
          >
            {/* Ambient glow that follows mouse */}
            <motion.div
              className="absolute w-96 h-96 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
                x: glowX,
                y: glowY,
              }}
            />
            
            {/* The word */}
            <motion.h1
              className="text-8xl font-thin tracking-widest text-white mb-24"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ 
                duration: 1.2,
                ease: [0.21, 0.47, 0.32, 0.98]
              }}
            >
              Orchestra
            </motion.h1>
            
            {/* The invitation */}
            <motion.button
              className="text-white/60 hover:text-white transition-colors duration-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              onClick={() => setPhase('connection')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className="flex items-center gap-4 text-lg font-light"
                animate={{ x: [0, 10, 0] }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                Begin
                <motion.div className="w-12 h-[1px] bg-white/40" />
              </motion.div>
            </motion.button>
          </motion.div>
        );
        
      case 'connection':
        return (
          <motion.div
            key="connection"
            className="relative flex flex-col items-center justify-center h-screen px-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Question */}
            <motion.p
              className="text-2xl font-light text-white/80 mb-16"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              What should I call you?
            </motion.p>
            
            {/* Input - no border, just a line */}
            <motion.div
              className="relative"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <input
                ref={inputRef}
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && userName.trim()) {
                    setPhase('purpose');
                  }
                }}
                className="bg-transparent border-none outline-none text-5xl font-light text-white text-center w-96 pb-4"
                placeholder="..."
                autoFocus
              />
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-[1px] bg-white/20"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              />
              
              {/* Cursor */}
              <motion.div
                className="absolute bottom-4 right-0 w-[2px] h-8 bg-white/60"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </motion.div>
            
            {/* Continue hint - appears after typing */}
            <AnimatePresence>
              {userName.trim() && (
                <motion.p
                  className="absolute bottom-20 text-white/40 text-sm"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  Press Enter
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        );
        
      case 'purpose':
        return (
          <motion.div
            key="purpose"
            className="relative flex flex-col items-center justify-center h-screen px-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Greeting */}
            <motion.h2
              className="text-3xl font-light text-white mb-2"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              Hello, {userName}
            </motion.h2>
            
            <motion.p
              className="text-lg text-white/60 mb-16"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              What brings you here?
            </motion.p>
            
            {/* Purpose cards - floating in space */}
            <div className="relative w-full max-w-4xl h-96">
              {purposes.map((purpose, index) => {
                const angle = (index / purposes.length) * Math.PI * 2;
                const radius = 180;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                
                return (
                  <motion.button
                    key={purpose.id}
                    className={cn(
                      "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
                      "w-40 h-40 rounded-full",
                      "flex flex-col items-center justify-center",
                      "transition-all duration-500",
                      selectedPurposes.includes(purpose.id)
                        ? "bg-white text-black"
                        : "bg-white/5 text-white hover:bg-white/10"
                    )}
                    style={{
                      x,
                      y,
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * STAGGER_DELAY }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setSelectedPurposes(prev =>
                        prev.includes(purpose.id)
                          ? prev.filter(p => p !== purpose.id)
                          : [...prev, purpose.id]
                      );
                    }}
                  >
                    <span className="text-2xl font-light mb-1">{purpose.label}</span>
                    <span className="text-xs opacity-60">{purpose.description}</span>
                  </motion.button>
                );
              })}
            </div>
            
            {/* Continue */}
            <AnimatePresence>
              {selectedPurposes.length > 0 && (
                <motion.button
                  className="absolute bottom-20 text-white/60 hover:text-white transition-colors"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setPhase('foundation')}
                >
                  Continue →
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        );
        
      case 'foundation':
        return (
          <motion.div
            key="foundation"
            className="relative flex flex-col items-center justify-center h-screen px-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.h2
              className="text-2xl font-light text-white mb-16"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              Where should we build your vault?
            </motion.h2>
            
            {/* Vault visualization */}
            <motion.div
              className="relative mb-16"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 20 }}
            >
              <div className="w-32 h-32 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10" />
              <motion.div
                className="absolute inset-0 rounded-2xl"
                animate={{
                  boxShadow: [
                    "0 0 0 0px rgba(255,255,255,0.1)",
                    "0 0 0 20px rgba(255,255,255,0.05)",
                    "0 0 0 40px rgba(255,255,255,0.02)",
                    "0 0 0 0px rgba(255,255,255,0.1)",
                  ]
                }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            </motion.div>
            
            {/* Path input */}
            <motion.div
              className="w-full max-w-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <input
                type="text"
                value={vaultPath}
                onChange={(e) => setVaultPath(e.target.value)}
                placeholder="~/Documents/Orchestra"
                className="w-full bg-white/5 backdrop-blur-sm rounded-xl px-6 py-4 text-white/80 placeholder:text-white/30 border border-white/10 focus:border-white/30 outline-none transition-all"
              />
              
              <motion.button
                className="mt-8 text-white/60 hover:text-white transition-colors block mx-auto"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={async () => {
                  if (vaultPath) {
                    await ensureDirectoryExists(vaultPath);
                    await setVaultSetting('path', vaultPath);
                    setPhase('companions');
                  }
                }}
              >
                Set foundation →
              </motion.button>
            </motion.div>
          </motion.div>
        );
        
      case 'companions':
        return (
          <motion.div
            key="companions"
            className="relative flex flex-col items-center justify-center h-screen px-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.h2
              className="text-2xl font-light text-white mb-4"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              Meet your companions
            </motion.h2>
            
            <motion.p
              className="text-white/60 mb-16"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              AI agents ready to amplify your {selectedPurposes[0] || 'potential'}
            </motion.p>
            
            {/* Agent cards - minimal and elegant */}
            <div className="flex gap-8">
              {agents.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center w-full h-80"
                >
                  <div className="text-white/40">
                    <motion.div
                      className="w-8 h-8 border-2 border-white/30 border-t-white/60 rounded-full mx-auto mb-4"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <p className="text-sm">Loading agents...</p>
                  </div>
                </motion.div>
              ) : agents.map((agent, index) => (
                <motion.div
                  key={agent.id}
                  className="relative"
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <motion.div
                    className="w-64 h-80 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8 flex flex-col"
                    whileHover={{ 
                      y: -10,
                      boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
                    }}
                  >
                    {/* Agent avatar */}
                    <div className="w-16 h-16 rounded-full bg-white/10 mb-6" />
                    
                    {/* Agent info */}
                    <h3 className="text-xl font-light text-white mb-2">
                      {agent.agent.name}
                    </h3>
                    <p className="text-sm text-white/60 flex-1">
                      {agent.agent.description}
                    </p>
                    
                    {/* Stats */}
                    <div className="mt-6 pt-6 border-t border-white/10">
                      <div className="flex justify-between text-xs text-white/40">
                        <span>{agent.agent.metadata?.usage?.total_invocations || '1k'}+ chats</span>
                        <span>{agent.agent.metadata?.usage?.average_response_time_ms || 200}ms</span>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </div>
            
            {/* Continue */}
            <motion.button
              className="mt-16 text-white/60 hover:text-white transition-colors"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              onClick={() => setPhase('departure')}
            >
              Begin journey →
            </motion.button>
          </motion.div>
        );
        
      case 'departure':
        return (
          <motion.div
            key="departure"
            className="relative flex flex-col items-center justify-center h-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Final message */}
            <motion.h1
              className="text-6xl font-thin text-white mb-8"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1 }}
            >
              Welcome to Orchestra
            </motion.h1>
            
            <motion.p
              className="text-xl text-white/60 mb-16"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 1 }}
            >
              Let's create something extraordinary
            </motion.p>
            
            {/* Launch button - just text */}
            <motion.button
              className="text-white/80 hover:text-white transition-all duration-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleComplete}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <motion.div
                  className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              ) : (
                <span className="text-2xl font-light">Enter</span>
              )}
            </motion.button>
            
            {/* Fade to black on complete */}
            <AnimatePresence>
              {isProcessing && (
                <motion.div
                  className="fixed inset-0 bg-black z-50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1.5, delay: 0.5 }}
                />
              )}
            </AnimatePresence>
          </motion.div>
        );
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <motion.div
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Subtle grain texture */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`
        }}
      />
      
      {/* Content */}
      <AnimatePresence mode="wait">
        {renderPhase()}
      </AnimatePresence>
    </motion.div>
  );
};

export default OnboardingMasterpiece;