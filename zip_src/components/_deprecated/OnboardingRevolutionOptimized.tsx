import React, { useState, useCallback, useMemo } from 'react';
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
  SparkleIcon
} from 'lucide-react';
import { setUserName, setUserGoals, setOnboardingCompleted } from '@/utils/userPreferences';
import { setPreference } from '@/api/settingsApi';
import { useSettingsStore } from '@/stores/settingsStore';

interface OnboardingRevolutionOptimizedProps {
  isOpen: boolean;
  onComplete: () => void;
}

// Simplified particle component using CSS animations
const CSSParticle: React.FC<{ index: number }> = ({ index }) => {
  const style = {
    '--delay': `${index * 0.5}s`,
    '--duration': `${3 + index * 0.5}s`,
    left: `${20 + index * 10}%`,
  } as React.CSSProperties;
  
  return (
    <div 
      className="particle"
      style={style}
    />
  );
};

const OnboardingRevolutionOptimized: React.FC<OnboardingRevolutionOptimizedProps> = ({ 
  isOpen, 
  onComplete 
}) => {
  const [phase, setPhase] = useState<'intro' | 'name' | 'demo' | 'customize' | 'finale'>('intro');
  const [userName, setUserNameState] = useState('');
  const [selectedPowers, setSelectedPowers] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const setVaultSetting = useSettingsStore((state) => state.setVaultSetting);
  
  // Memoize powers to prevent re-renders
  const powers = useMemo(() => [
    { 
      id: 'research', 
      label: 'Research Assistant',
      icon: SearchIcon,
      description: 'Deep dive into any topic',
      color: 'from-blue-500 to-cyan-500'
    },
    { 
      id: 'writing', 
      label: 'Writing Companion',
      icon: PenToolIcon,
      description: 'Craft beautiful prose',
      color: 'from-purple-500 to-pink-500'
    },
    { 
      id: 'knowledge', 
      label: 'Knowledge Architect',
      icon: BookOpenIcon,
      description: 'Build your second brain',
      color: 'from-green-500 to-emerald-500'
    },
    { 
      id: 'automation', 
      label: 'Automation Wizard',
      icon: ZapIcon,
      description: 'Automate the mundane',
      color: 'from-orange-500 to-red-500'
    }
  ], []);
  
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
      
      // Auto-configure vault path
      const defaultPath = await window.__TAURI__.path.appDataDir();
      const vaultPath = await window.__TAURI__.path.join(defaultPath, 'Orchestra');
      await setVaultSetting('path', vaultPath);
      
      setTimeout(onComplete, 500);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setIsProcessing(false);
    }
  }, [userName, selectedPowers, setVaultSetting, onComplete]);
  
  // Simplified phase transitions
  const phaseVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };
  
  if (!isOpen) return null;
  
  return (
    <>
      <style jsx>{`
        @keyframes float-up {
          0% {
            transform: translateY(100vh) scale(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) scale(1);
            opacity: 0;
          }
        }
        
        .particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: linear-gradient(to right, #a78bfa, #ec4899);
          border-radius: 50%;
          animation: float-up var(--duration) var(--delay) infinite linear;
        }
        
        .gradient-text {
          background: linear-gradient(to right, #a78bfa, #ec4899, #f97316);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>
      
      <MotionConfig reducedMotion="user">
        <Dialog open={isOpen} onOpenChange={() => {}}>
          <DialogContent 
            className="max-w-4xl p-0 overflow-hidden bg-black border-0"
            onPointerDownOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <div className="relative bg-gradient-to-br from-slate-950 via-violet-950/20 to-slate-950 text-white min-h-[600px]">
              {/* Simplified background */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-pink-600/5" />
              
              {/* Content */}
              <AnimatePresence mode="wait">
                {phase === 'intro' && (
                  <motion.div
                    key="intro"
                    className="relative flex flex-col items-center justify-center min-h-[600px] text-center p-8"
                    variants={phaseVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.3 }}
                  >
                    {/* CSS-based particles */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      {[...Array(5)].map((_, i) => (
                        <CSSParticle key={i} index={i} />
                      ))}
                    </div>
                    
                    {/* Logo */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", duration: 0.5 }}
                      className="mb-8"
                    >
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 p-1">
                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                          <InfinityIcon className="w-16 h-16 text-white" />
                        </div>
                      </div>
                    </motion.div>
                    
                    <h1 className="text-6xl font-bold gradient-text mb-4">
                      Orchestra
                    </h1>
                    
                    <p className="text-xl text-muted-foreground mb-12 max-w-md">
                      Where human creativity meets infinite intelligence
                    </p>
                    
                    <Button
                      size="lg"
                      onClick={() => setPhase('name')}
                      className="bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white px-8 py-6 text-lg rounded-full"
                    >
                      Begin the Journey
                      <SparklesIcon className="ml-2 w-5 h-5" />
                    </Button>
                  </motion.div>
                )}
                
                {phase === 'name' && (
                  <motion.div
                    key="name"
                    className="flex flex-col items-center justify-center min-h-[600px] text-center px-8"
                    variants={phaseVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.3 }}
                  >
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center mb-8">
                      <HeartIcon className="w-12 h-12 text-white" />
                    </div>
                    
                    <h2 className="text-4xl font-bold mb-4">Let's get acquainted</h2>
                    <p className="text-lg text-muted-foreground mb-8 max-w-md">
                      I'm Orchestra, your creative companion. What should I call you?
                    </p>
                    
                    <form onSubmit={handleNameSubmit} className="w-full max-w-sm">
                      <Input
                        type="text"
                        placeholder="Your name"
                        value={userName}
                        onChange={(e) => setUserNameState(e.target.value)}
                        className="text-center text-2xl h-14 mb-6 bg-white/5 border-white/20"
                        autoFocus
                      />
                      
                      <Button
                        type="submit"
                        size="lg"
                        disabled={!userName.trim()}
                        className="w-full bg-gradient-to-r from-violet-600 to-pink-600"
                      >
                        Continue
                        <ChevronRightIcon className="ml-2 w-5 h-5" />
                      </Button>
                    </form>
                  </motion.div>
                )}
                
                {phase === 'demo' && (
                  <motion.div
                    key="demo"
                    className="flex flex-col items-center justify-center min-h-[600px] px-8"
                    variants={phaseVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.3 }}
                  >
                    <h2 className="text-3xl font-bold mb-2 text-center">
                      Nice to meet you, {userName}!
                    </h2>
                    
                    <p className="text-lg text-muted-foreground mb-8 text-center">
                      Let me show you what we can do together
                    </p>
                    
                    {/* Simplified demo */}
                    <div className="bg-slate-900/80 rounded-2xl p-6 border border-white/10 max-w-2xl w-full mb-8">
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shrink-0">
                            <BrainIcon className="w-4 h-4 text-white" />
                          </div>
                          <div className="bg-white/10 px-4 py-2 rounded-2xl">
                            <p className="text-sm">I can help you organize knowledge, automate tasks, research topics, and much more.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      size="lg"
                      onClick={() => setPhase('customize')}
                      className="bg-gradient-to-r from-violet-600 to-pink-600"
                    >
                      Continue
                      <ChevronRightIcon className="ml-2 w-5 h-5" />
                    </Button>
                  </motion.div>
                )}
                
                {phase === 'customize' && (
                  <motion.div
                    key="customize"
                    className="flex flex-col items-center justify-center min-h-[600px] px-8"
                    variants={phaseVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.3 }}
                  >
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center mb-6">
                      <WandIcon className="w-10 h-10 text-white" />
                    </div>
                    
                    <h2 className="text-3xl font-bold mb-2 text-center">
                      Choose your superpowers
                    </h2>
                    <p className="text-lg text-muted-foreground mb-8 text-center max-w-md">
                      Select what excites you most. You can always explore everything later.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 w-full max-w-2xl mb-8">
                      {powers.map((power) => {
                        const Icon = power.icon;
                        return (
                          <button
                            key={power.id}
                            onClick={() => handlePowerToggle(power.id)}
                            className={cn(
                              "relative p-6 rounded-2xl border-2 transition-all duration-200",
                              selectedPowers.includes(power.id)
                                ? "border-violet-500 bg-violet-500/10"
                                : "border-white/20 bg-white/5 hover:bg-white/10"
                            )}
                          >
                            {selectedPowers.includes(power.id) && (
                              <StarIcon className="absolute top-2 right-2 w-5 h-5 text-violet-500 fill-violet-500" />
                            )}
                            
                            <div className={cn(
                              "w-12 h-12 rounded-xl bg-gradient-to-br mb-4 flex items-center justify-center text-white",
                              power.color
                            )}>
                              <Icon className="w-5 h-5" />
                            </div>
                            
                            <h3 className="font-semibold mb-1">{power.label}</h3>
                            <p className="text-sm text-muted-foreground">{power.description}</p>
                          </button>
                        );
                      })}
                    </div>
                    
                    <Button
                      size="lg"
                      onClick={() => setPhase('finale')}
                      disabled={selectedPowers.length === 0}
                      className="bg-gradient-to-r from-violet-600 to-pink-600"
                    >
                      Activate Orchestra
                      <SparkleIcon className="ml-2 w-5 h-5" />
                    </Button>
                  </motion.div>
                )}
                
                {phase === 'finale' && (
                  <motion.div
                    key="finale"
                    className="flex flex-col items-center justify-center min-h-[600px] text-center px-8"
                    variants={phaseVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.3 }}
                  >
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-8">
                      <RocketIcon className="w-16 h-16 text-white" />
                    </div>
                    
                    <h2 className="text-4xl font-bold mb-4">
                      Welcome to your Orchestra, {userName}!
                    </h2>
                    
                    <p className="text-lg text-muted-foreground mb-8 max-w-md">
                      Your creative workspace is ready. Let's create something extraordinary together.
                    </p>
                    
                    <div className="flex flex-col gap-4 items-center mb-12">
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
                    </div>
                    
                    <Button
                      size="lg"
                      onClick={completeOnboarding}
                      disabled={isProcessing}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-6 text-lg rounded-full"
                    >
                      {isProcessing ? (
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          Launch Orchestra
                          <RocketIcon className="ml-2 w-5 h-5" />
                        </>
                      )}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </DialogContent>
        </Dialog>
      </MotionConfig>
    </>
  );
};

export default OnboardingRevolutionOptimized;