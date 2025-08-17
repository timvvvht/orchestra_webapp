import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';
import { setUserName, setUserGoals, setOnboardingCompleted } from '@/utils/userPreferences';
import { setPreference, getDefaultVaultPath, ensureDirectoryExists } from '@/api/settingsApi';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAgentConfigStore } from '@/stores/agentConfigStore';
import type { AgentConfigTS } from '@/types/agentTypes';
import { enrichAgentMetadata } from '@/utils/agentMetadataEnricher';
import { 
  Sparkles,
  Brain,
  Zap,
  Search,
  Code,
  PenTool,
  FolderOpen,
  ChevronRight,
  Check,
  ArrowRight,
  Infinity,
  Star
} from 'lucide-react';

interface OnboardingCosmicProps {
  isOpen: boolean;
  onComplete: () => void;
}

type Phase = 'cosmos' | 'awakening' | 'identity' | 'purpose' | 'foundation' | 'companions' | 'launch';

const OnboardingCosmic: React.FC<OnboardingCosmicProps> = ({ isOpen, onComplete }) => {
  const [phase, setPhase] = useState<Phase>('awakening'); // Start with awakening instead of cosmos
  const [userName, setUserName] = useState('');
  const [selectedPurposes, setSelectedPurposes] = useState<string[]>([]);
  const [vaultPath, setVaultPath] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Store hooks
  const setVaultSetting = useSettingsStore((state) => state.setVaultSetting);
  const { agentConfigs, fetchAgentConfigs } = useAgentConfigStore();
  const [agents, setAgents] = useState<AgentConfigTS[]>([]);
  
  // Debug logging
  useEffect(() => {
    console.log('OnboardingCosmic mounted, current phase:', phase);
  }, [phase]);
  
  useEffect(() => {
    console.log('OnboardingCosmic isOpen:', isOpen);
  }, [isOpen]);
  
  // Simple mouse position for glow effect
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
  // Load agents
  useEffect(() => {
    if (phase === 'companions' && Object.keys(agentConfigs).length === 0) {
      fetchAgentConfigs();
    }
  }, [phase, fetchAgentConfigs, agentConfigs]);
  
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
        if (!vaultPath) setVaultPath(path);
      });
    }
  }, [phase, vaultPath]);
  
  // Purpose options
  const purposes = [
    { id: 'create', label: 'Create', icon: PenTool, color: 'from-violet-500/20 to-purple-500/20' },
    { id: 'discover', label: 'Discover', icon: Search, color: 'from-blue-500/20 to-cyan-500/20' },
    { id: 'build', label: 'Build', icon: Code, color: 'from-emerald-500/20 to-green-500/20' },
    { id: 'learn', label: 'Learn', icon: Brain, color: 'from-amber-500/20 to-orange-500/20' }
  ];
  
  const handleComplete = async () => {
    console.log('Completing onboarding...');
    setIsProcessing(true);
    try {
      setOnboardingCompleted();
      setUserName(userName);
      setUserGoals(selectedPurposes);
      
      await setPreference('onboarding.userName', userName);
      await setPreference('onboarding.userGoals', selectedPurposes);
      await setPreference('onboarding.completed', true);
      
      setTimeout(() => {
        onComplete();
      }, 1000);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setIsProcessing(false);
    }
  };
  
  const renderPhase = () => {
    switch (phase) {
      case 'cosmos':
        return (
          <motion.div
            key="cosmos"
            className="relative flex items-center justify-center h-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            {/* The cosmic dot */}
            <motion.div
              className="relative"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.5, ease: [0.21, 0.47, 0.32, 0.98] }}
            >
              <motion.div
                className="w-3 h-3 bg-white rounded-full"
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
              
              {/* Ripples */}
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-full border border-white/20"
                  initial={{ scale: 1, opacity: 0 }}
                  animate={{ 
                    scale: [1, 15 + i * 10, 30 + i * 15],
                    opacity: [0, 0.3, 0]
                  }}
                  transition={{
                    duration: 3,
                    delay: i * 0.5,
                    ease: "easeOut",
                    repeat: Infinity
                  }}
                />
              ))}
            </motion.div>
          </motion.div>
        );
        
      case 'awakening':
        return (
          <motion.div 
            className="flex flex-col items-center justify-center h-screen px-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div 
              className="mb-12"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                <Infinity className="w-12 h-12 text-white" />
              </div>
            </motion.div>
            
            <motion.h1 
              className="text-6xl font-light text-white mb-6 tracking-wide"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Orchestra
            </motion.h1>
            
            <motion.p 
              className="text-xl text-white/60 mb-12"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Where ideas become reality
            </motion.p>
            
            <motion.button
              className="px-8 py-3 bg-white text-black rounded-full font-medium hover:bg-white/90 transition-all"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                console.log('Begin clicked - moving to identity');
                setPhase('identity');
              }}
            >
              Begin Journey
            </motion.button>
          </motion.div>
        );
        
      case 'identity':
        return (
          <motion.div
            key="identity"
            className="flex flex-col items-center justify-center h-screen px-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-full max-w-md text-center"
            >
              <h2 className="text-3xl font-light text-white mb-8">
                What should I call you?
              </h2>
              
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && userName.trim()) {
                    setPhase('purpose');
                  }
                }}
                placeholder="Enter your name"
                className="w-full px-6 py-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl text-white placeholder:text-white/30 focus:border-white/30 focus:bg-white/10 outline-none transition-all text-center text-xl"
                autoFocus
              />
              
              <motion.button
                className={cn(
                  "w-full mt-6 px-6 py-3 rounded-2xl font-medium transition-all",
                  userName.trim()
                    ? "bg-white text-black hover:bg-white/90"
                    : "bg-white/10 text-white/30 cursor-not-allowed"
                )}
                whileHover={userName.trim() ? { scale: 1.02 } : {}}
                whileTap={userName.trim() ? { scale: 0.98 } : {}}
                onClick={() => {
                  if (userName.trim()) {
                    console.log('Moving to purpose phase');
                    setPhase('purpose');
                  }
                }}
                disabled={!userName.trim()}
              >
                Continue
              </motion.button>
            </motion.div>
          </motion.div>
        );
        
      case 'purpose':
        return (
          <motion.div
            key="purpose"
            className="flex flex-col items-center justify-center h-screen px-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-full max-w-3xl text-center"
            >
              <h2 className="text-3xl font-light text-white mb-3">
                Hello {userName}, what brings you here?
              </h2>
              <p className="text-white/60 mb-12">
                Choose your path
              </p>
              
              {/* Purpose orbs */}
              <div className="relative h-64 mb-12">
                {purposes.map((purpose, index) => {
                  const angle = (index / purposes.length) * Math.PI * 2 - Math.PI / 2;
                  const radius = 120;
                  const x = Math.cos(angle) * radius;
                  const y = Math.sin(angle) * radius;
                  const Icon = purpose.icon;
                  const isSelected = selectedPurposes.includes(purpose.id);
                  
                  return (
                    <motion.button
                      key={purpose.id}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                      style={{ x, y }}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: index * 0.1, type: "spring" }}
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
                      <div className={cn(
                        "w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all relative overflow-hidden",
                        isSelected
                          ? "bg-white text-black"
                          : "bg-white/10 backdrop-blur-sm text-white border border-white/20"
                      )}>
                        <div className={cn(
                          "absolute inset-0 bg-gradient-to-br opacity-30",
                          purpose.color
                        )} />
                        <Icon className="w-6 h-6 mb-1 relative z-10" />
                        <span className="text-xs font-medium relative z-10">{purpose.label}</span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
              
              <motion.button
                className={cn(
                  "px-8 py-3 rounded-2xl font-medium transition-all",
                  selectedPurposes.length > 0
                    ? "bg-white text-black hover:bg-white/90"
                    : "bg-white/10 text-white/30 cursor-not-allowed"
                )}
                whileHover={selectedPurposes.length > 0 ? { scale: 1.02 } : {}}
                whileTap={selectedPurposes.length > 0 ? { scale: 0.98 } : {}}
                onClick={() => {
                  if (selectedPurposes.length > 0) {
                    console.log('Moving to foundation phase');
                    setPhase('foundation');
                  }
                }}
                disabled={selectedPurposes.length === 0}
              >
                Continue Journey
              </motion.button>
            </motion.div>
          </motion.div>
        );
        
      case 'foundation':
        return (
          <motion.div
            key="foundation"
            className="flex flex-col items-center justify-center h-screen px-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-full max-w-xl text-center"
            >
              <div className="mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring" }}
                  className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-6"
                >
                  <FolderOpen className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className="text-3xl font-light text-white mb-3">
                  Create your vault
                </h2>
                <p className="text-white/60">
                  A sacred space for your thoughts and creations
                </p>
              </div>
              
              <div className="space-y-4">
                <input
                  type="text"
                  value={vaultPath}
                  onChange={(e) => setVaultPath(e.target.value)}
                  placeholder="~/Documents/Orchestra"
                  className="w-full px-6 py-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl text-white placeholder:text-white/30 focus:border-white/30 outline-none transition-all"
                />
                
                <motion.button
                  className="w-full px-6 py-3 bg-white text-black rounded-2xl font-medium hover:bg-white/90 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={async () => {
                    if (vaultPath) {
                      console.log('Setting up vault...');
                      await ensureDirectoryExists(vaultPath);
                      await setVaultSetting('path', vaultPath);
                      setPhase('companions');
                    }
                  }}
                >
                  Establish Foundation
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        );
        
      case 'companions':
        return (
          <motion.div
            key="companions"
            className="flex flex-col items-center justify-center min-h-screen px-8 py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Cosmic background glow */}
            <div
              className="absolute w-[1000px] h-[1000px] rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.05) 0%, transparent 50%)',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)'
              }}
            />
            
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-full max-w-5xl relative text-center"
            >
              <h2 className="text-3xl font-light text-white mb-3">
                Meet your AI companions
              </h2>
              <p className="text-white/60 mb-10">
                Crafted to amplify your potential
              </p>
              
              {agents.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                  <motion.div
                    className="w-8 h-8 border-2 border-white/30 border-t-white/60 rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                  {agents.map((agent, index) => {
                    const metadata = agent.agent.metadata || {};
                    const capabilities = metadata.capabilities || [];
                    const skills = metadata.skills || [];
                    
                    return (
                      <motion.div
                        key={agent.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.15 }}
                        className="group"
                      >
                        <div className="relative p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all h-full overflow-hidden">
                          {/* Cosmic gradient */}
                          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-violet-500/10 group-hover:via-purple-500/5 group-hover:to-pink-500/10 transition-all duration-700" />
                          
                          <div className="relative">
                            {/* Agent icon */}
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center mb-4">
                              {index === 0 && <Brain className="w-7 h-7 text-white" />}
                              {index === 1 && <Zap className="w-7 h-7 text-white" />}
                              {index === 2 && <Search className="w-7 h-7 text-white" />}
                            </div>
                            
                            <h3 className="font-medium text-white text-lg mb-2">
                              {agent.agent.name}
                            </h3>
                            
                            <p className="text-sm text-white/60 mb-4 line-clamp-2">
                              {agent.agent.description}
                            </p>
                            
                            {/* Capabilities */}
                            <div className="space-y-2 mb-4">
                              {capabilities.slice(0, 2).map((capability, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs text-white/70">
                                  <Star className="w-3 h-3 text-violet-400" />
                                  <span>{capability}</span>
                                </div>
                              ))}
                            </div>
                            
                            {/* Stats */}
                            <div className="pt-3 border-t border-white/10 flex justify-between text-xs text-white/40">
                              <span>{metadata.usage?.total_invocations?.toLocaleString() || '1k+'} uses</span>
                              <span>{metadata.usage?.average_response_time_ms || 200}ms</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
              
              <motion.button
                className="px-8 py-3 bg-white text-black rounded-2xl font-medium hover:bg-white/90 transition-colors inline-flex items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  console.log('Moving to launch phase');
                  setPhase('launch');
                }}
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.div>
          </motion.div>
        );
        
      case 'launch':
        return (
          <motion.div
            key="launch"
            className="flex flex-col items-center justify-center h-screen px-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 15 }}
              className="mb-8"
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm flex items-center justify-center">
                <Check className="w-12 h-12 text-white" />
              </div>
            </motion.div>
            
            <motion.h1
              className="text-4xl font-light text-white mb-4"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Ready for liftoff, {userName}
            </motion.h1>
            
            <motion.p
              className="text-xl text-white/60 mb-12 max-w-md"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Your journey into the infinite begins now
            </motion.p>
            
            <motion.button
              className="px-10 py-4 bg-white text-black rounded-full font-medium hover:bg-white/90 transition-all text-lg"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleComplete}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <motion.div
                  className="w-6 h-6 border-2 border-black/30 border-t-black/70 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              ) : (
                <span className="flex items-center gap-2">
                  Launch Orchestra
                  <Sparkles className="w-5 h-5" />
                </span>
              )}
            </motion.button>
          </motion.div>
        );
        
      default:
        return null;
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 overflow-hidden"
    >
      {/* Simple gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-purple-900/20" />
      
      <AnimatePresence mode="wait">
        {renderPhase()}
      </AnimatePresence>
    </div>
  );
};

export default OnboardingCosmic;