import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import './OnboardingRevolution.css';
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
  LightbulbIcon,
  ZapIcon,
  WandIcon,
  CommandIcon,
  MessageSquareIcon,
  FileTextIcon,
  SearchIcon,
  PenToolIcon,
  BookOpenIcon,
  GlobeIcon,
  AtomIcon,
  InfinityIcon,
  ChevronRightIcon,
  MousePointerClickIcon,
  SparkleIcon
} from 'lucide-react';
import { setUserName, setUserGoals, setOnboardingCompleted } from '@/utils/userPreferences';
import { setPreference } from '@/api/settingsApi';
import { useSettingsStore } from '@/stores/settingsStore';

interface OnboardingRevolutionProps {
  isOpen: boolean;
  onComplete: () => void;
}

// Particle system for magical effects - optimized for performance
const MagicParticle: React.FC<{ delay: number; index: number }> = ({ delay, index }) => {
  // Pre-calculate random values to avoid recalculation
  const startX = React.useMemo(() => Math.random() * 400 - 200, []);
  const endX = React.useMemo(() => startX + (Math.random() * 100 - 50), [startX]);
  
  return (
    <motion.div
      className="absolute w-1 h-1 bg-violet-400 rounded-full will-change-transform"
      initial={{ x: startX, y: 200, scale: 0, opacity: 0 }}
      animate={{ 
        y: -200,
        scale: [0, 1.5, 0],
        x: endX,
        opacity: [0, 1, 0]
      }}
      transition={{ 
        duration: 4,
        delay: delay + (index * 0.3),
        repeat: Infinity,
        ease: "linear" // Linear is more performant than easeOut
      }}
    />
  );
};

// Animated text that types itself - optimized version
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
        setShowCursor(false);
        if (onComplete) onComplete();
      }
    }, 50);
    
    return () => clearInterval(interval);
  }, [text, delay, onComplete]);
  
  return (
    <span>
      {displayText}
      {showCursor && (
        <span className="inline-block w-0.5 h-5 bg-primary ml-0.5 animate-pulse" />
      )}
    </span>
  );
};

// Interactive AI preview component
const AIPreview: React.FC<{ onInteract: () => void }> = ({ onInteract }) => {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'ai'; content: string }>>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  const simulateConversation = useCallback(() => {
    // Simulate a conversation
    const conversation = [
      { role: 'user' as const, content: "What can you help me with?" },
      { role: 'ai' as const, content: "I can help you organize knowledge, automate tasks, research topics, and much more. Think of me as your intelligent companion for any intellectual endeavor." }
    ];
    
    setMessages([conversation[0]]);
    setIsTyping(true);
    
    setTimeout(() => {
      setIsTyping(false);
      setMessages([conversation[0], conversation[1]]);
      setTimeout(onInteract, 1500);
    }, 2000);
  }, [onInteract]);
  
  useEffect(() => {
    const timer = setTimeout(simulateConversation, 1000);
    return () => clearTimeout(timer);
  }, [simulateConversation]);
  
  return (
    <motion.div 
      className="bg-slate-900/80 rounded-2xl p-6 border border-white/10 shadow-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="space-y-4 min-h-[200px]">
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ x: msg.role === 'user' ? 20 : -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: idx * 0.5 }}
            className={cn(
              "flex gap-3",
              msg.role === 'user' ? "justify-end" : "justify-start"
            )}
          >
            {msg.role === 'ai' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                <BrainIcon className="w-4 h-4 text-white" />
              </div>
            )}
            <div className={cn(
              "px-4 py-2 rounded-2xl max-w-[80%]",
              msg.role === 'user' 
                ? "bg-primary text-primary-foreground" 
                : "bg-white/10 text-white"
            )}>
              <p className="text-sm">{msg.content}</p>
            </div>
          </motion.div>
        ))}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
              <BrainIcon className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-2xl">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-white/60 rounded-full animate-pulse"
                    style={{ animationDelay: `${i * 100}ms` }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

const OnboardingRevolution: React.FC<OnboardingRevolutionProps> = ({ isOpen, onComplete }) => {
  const [phase, setPhase] = useState<'intro' | 'name' | 'demo' | 'customize' | 'finale'>('intro');
  const [userName, setUserNameState] = useState('');
  const [selectedPowers, setSelectedPowers] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const setVaultSetting = useSettingsStore((state) => state.setVaultSetting);
  
  // Powers/capabilities users can choose
  const powers = [
    { 
      id: 'research', 
      label: 'Research Assistant',
      icon: <SearchIcon className="w-5 h-5" />,
      description: 'Deep dive into any topic',
      color: 'from-blue-500 to-cyan-500'
    },
    { 
      id: 'writing', 
      label: 'Writing Companion',
      icon: <PenToolIcon className="w-5 h-5" />,
      description: 'Craft beautiful prose',
      color: 'from-purple-500 to-pink-500'
    },
    { 
      id: 'knowledge', 
      label: 'Knowledge Architect',
      icon: <BookOpenIcon className="w-5 h-5" />,
      description: 'Build your second brain',
      color: 'from-green-500 to-emerald-500'
    },
    { 
      id: 'automation', 
      label: 'Automation Wizard',
      icon: <ZapIcon className="w-5 h-5" />,
      description: 'Automate the mundane',
      color: 'from-orange-500 to-red-500'
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
      
      // Auto-configure vault path (invisible to user)
      const defaultPath = await window.__TAURI__.path.appDataDir();
      const vaultPath = await window.__TAURI__.path.join(defaultPath, 'Orchestra');
      await setVaultSetting('path', vaultPath);
      
      setTimeout(() => {
        onComplete();
      }, 1000);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setIsProcessing(false);
    }
  }, [userName, selectedPowers, setVaultSetting, onComplete]);
  
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
            {/* Particle effects - reduced for performance */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(8)].map((_, i) => (
                <MagicParticle key={i} delay={i * 0.2} index={i} />
              ))}
            </div>
            
            {/* Logo animation - simplified */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 200,
                damping: 15
              }}
              className="relative mb-8"
            >
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-violet-600 via-pink-600 to-orange-600 p-1">
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                  <InfinityIcon className="w-16 h-16 text-white" />
                </div>
              </div>
            </motion.div>
            
            <motion.h1
              className="text-6xl font-bold bg-gradient-to-r from-violet-400 via-pink-400 to-orange-400 bg-clip-text text-transparent mb-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Orchestra
            </motion.h1>
            
            <motion.p
              className="text-xl text-muted-foreground mb-12 max-w-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              Where human creativity meets infinite intelligence
            </motion.p>
            
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 3, type: "spring" }}
            >
              <Button
                size="lg"
                onClick={() => setPhase('name')}
                className="bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white px-8 py-6 text-lg rounded-full shadow-2xl"
              >
                Begin the Journey
                <SparklesIcon className="ml-2 w-5 h-5" />
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
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring" }}
              className="mb-8"
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                <HeartIcon className="w-12 h-12 text-white" />
              </div>
            </motion.div>
            
            <h2 className="text-4xl font-bold mb-4">Let's get acquainted</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-md">
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
                  className="text-center text-2xl h-14 mb-6 bg-white/5 border-white/20 focus:border-violet-500 transition-all"
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
                  className="w-full bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700"
                >
                  Continue
                  <ChevronRightIcon className="ml-2 w-5 h-5" />
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
              className="text-3xl font-bold mb-2 text-center"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              Nice to meet you, {userName}!
            </motion.h2>
            
            <motion.p
              className="text-lg text-muted-foreground mb-8 text-center"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Watch what we can do together
            </motion.p>
            
            <motion.div
              className="w-full max-w-2xl mb-8"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <AIPreview onInteract={() => setTimeout(() => setPhase('customize'), 500)} />
            </motion.div>
            
            <motion.p
              className="text-sm text-muted-foreground flex items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <MousePointerClickIcon className="w-4 h-4" />
              This is just the beginning...
            </motion.p>
          </motion.div>
        );
        
      case 'customize':
        return (
          <motion.div
            key="customize"
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
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                <WandIcon className="w-10 h-10 text-white" />
              </div>
            </motion.div>
            
            <h2 className="text-3xl font-bold mb-2 text-center">
              Choose your superpowers
            </h2>
            <p className="text-lg text-muted-foreground mb-8 text-center max-w-md">
              Select what excites you most. You can always explore everything later.
            </p>
            
            <div className="grid grid-cols-2 gap-4 w-full max-w-2xl mb-8">
              {powers.map((power, idx) => (
                <motion.button
                  key={power.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => handlePowerToggle(power.id)}
                  className={cn(
                    "relative p-6 rounded-2xl border-2 transition-all duration-300",
                    selectedPowers.includes(power.id)
                      ? "border-violet-500 bg-violet-500/10"
                      : "border-white/20 bg-white/5 hover:bg-white/10"
                  )}
                >
                  {selectedPowers.includes(power.id) && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2"
                    >
                      <StarIcon className="w-5 h-5 text-violet-500 fill-violet-500" />
                    </motion.div>
                  )}
                  
                  <div className={cn(
                    "w-12 h-12 rounded-xl bg-gradient-to-br mb-4 flex items-center justify-center text-white",
                    power.color
                  )}>
                    {power.icon}
                  </div>
                  
                  <h3 className="font-semibold mb-1">{power.label}</h3>
                  <p className="text-sm text-muted-foreground">{power.description}</p>
                </motion.button>
              ))}
            </div>
            
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Button
                size="lg"
                onClick={() => setPhase('finale')}
                disabled={selectedPowers.length === 0}
                className="bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700"
              >
                Activate Orchestra
                <SparkleIcon className="ml-2 w-5 h-5" />
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
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <RocketIcon className="w-16 h-16 text-white" />
              </div>
              
              {/* Celebration particles */}
              <motion.div
                className="absolute inset-0"
                initial={{ scale: 1 }}
                animate={{ scale: 3, opacity: 0 }}
                transition={{ duration: 1 }}
              >
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 opacity-30" />
              </motion.div>
            </motion.div>
            
            <motion.h2
              className="text-4xl font-bold mb-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Welcome to your Orchestra, {userName}!
            </motion.h2>
            
            <motion.p
              className="text-lg text-muted-foreground mb-8 max-w-md"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Your creative workspace is ready. Let's create something extraordinary together.
            </motion.p>
            
            <motion.div
              className="flex flex-col gap-4 items-center"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <div className="flex gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary" className="gap-1">
                  <CommandIcon className="w-3 h-3" />
                  Cmd+K
                </Badge>
                <span>to search anything</span>
              </div>
              
              <div className="flex gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary" className="gap-1">
                  <MessageSquareIcon className="w-3 h-3" />
                  Cmd+N
                </Badge>
                <span>to start a conversation</span>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1, type: "spring" }}
              className="mt-12"
            >
              <Button
                size="lg"
                onClick={completeOnboarding}
                disabled={isProcessing}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-6 text-lg rounded-full shadow-2xl"
              >
                {isProcessing ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  >
                    <AtomIcon className="w-6 h-6" />
                  </motion.div>
                ) : (
                  <>
                    Launch Orchestra
                    <RocketIcon className="ml-2 w-5 h-5" />
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
          className="max-w-4xl p-0 overflow-hidden bg-black border-0"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div 
            ref={containerRef}
            className="relative bg-gradient-to-br from-slate-950 via-violet-950/20 to-slate-950 text-white"
          >
            {/* Background effects - optimized with CSS */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-violet-600/10 to-transparent rounded-full blur-2xl transform-gpu" />
              <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-pink-600/10 to-transparent rounded-full blur-2xl transform-gpu" />
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

export default OnboardingRevolution;