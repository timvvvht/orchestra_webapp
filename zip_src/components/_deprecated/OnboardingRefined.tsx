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
  ArrowRight
} from 'lucide-react';

interface OnboardingRefinedProps {
  isOpen: boolean;
  onComplete: () => void;
}

type Phase = 'welcome' | 'name' | 'interests' | 'vault' | 'agents' | 'ready';

const OnboardingRefined: React.FC<OnboardingRefinedProps> = ({ isOpen, onComplete }) => {
  const [phase, setPhase] = useState<Phase>('welcome');
  const [userName, setUserName] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [vaultPath, setVaultPath] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Subtle mouse tracking for glow effects
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const mouseXSpring = useSpring(mouseX, { damping: 25, stiffness: 150 });
  const mouseYSpring = useSpring(mouseY, { damping: 25, stiffness: 150 });
  
  // Store hooks
  const setVaultSetting = useSettingsStore((state) => state.setVaultSetting);
  const { agentConfigs, fetchAgentConfigs } = useAgentConfigStore();
  const [agents, setAgents] = useState<AgentConfigTS[]>([]);
  
  // Track mouse for subtle glow
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        mouseX.set((e.clientX - rect.left - rect.width / 2) / rect.width);
        mouseY.set((e.clientY - rect.top - rect.height / 2) / rect.height);
      }
    };
    
    if (phase === 'welcome' || phase === 'agents') {
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [mouseX, mouseY, phase]);
  
  // Load agents
  useEffect(() => {
    if (phase === 'agents' && Object.keys(agentConfigs).length === 0) {
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
    if (phase === 'vault') {
      getDefaultVaultPath().then(path => {
        if (!vaultPath) setVaultPath(path);
      });
    }
  }, [phase, vaultPath]);
  
  // Interest options
  const interests = [
    { id: 'research', label: 'Research & Analysis', icon: Search, description: 'Deep dive into topics' },
    { id: 'writing', label: 'Writing & Content', icon: PenTool, description: 'Create compelling content' },
    { id: 'coding', label: 'Coding & Development', icon: Code, description: 'Build software faster' },
    { id: 'productivity', label: 'Productivity & Tasks', icon: Zap, description: 'Get more done' }
  ];
  
  const handleComplete = async () => {
    setIsProcessing(true);
    try {
      setOnboardingCompleted();
      setUserName(userName);
      setUserGoals(selectedInterests);
      
      await setPreference('onboarding.userName', userName);
      await setPreference('onboarding.userGoals', selectedInterests);
      await setPreference('onboarding.completed', true);
      
      setTimeout(() => {
        onComplete();
      }, 800);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setIsProcessing(false);
    }
  };
  
  const renderPhase = () => {
    switch (phase) {
      case 'welcome':
        return (
          <motion.div
            key="welcome"
            className="flex flex-col items-center justify-center min-h-screen px-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Subtle glow that follows mouse */}
            <motion.div
              className="absolute w-[600px] h-[600px] rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 60%)',
                x: useTransform(mouseXSpring, v => v * 50),
                y: useTransform(mouseYSpring, v => v * 50),
              }}
            />
            
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="mb-8"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 backdrop-blur-sm flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
            </motion.div>
            
            <motion.h1
              className="text-5xl font-semibold text-white mb-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              Welcome to Orchestra
            </motion.h1>
            
            <motion.p
              className="text-lg text-white/60 mb-12 max-w-md"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              Your AI-powered workspace for creating, learning, and building
            </motion.p>
            
            <motion.button
              className="px-8 py-3 bg-white text-black rounded-xl font-medium hover:bg-white/90 transition-colors"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setPhase('name')}
            >
              Get Started
            </motion.button>
          </motion.div>
        );
        
      case 'name':
        return (
          <motion.div
            key="name"
            className="flex flex-col items-center justify-center min-h-screen px-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-full max-w-md"
            >
              <h2 className="text-3xl font-medium text-white mb-8 text-center">
                What's your name?
              </h2>
              
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && userName.trim()) {
                    setPhase('interests');
                  }
                }}
                placeholder="Enter your name"
                className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:border-white/30 focus:bg-white/10 outline-none transition-all text-center text-xl"
                autoFocus
              />
              
              <motion.button
                className={cn(
                  "w-full mt-6 px-6 py-3 rounded-xl font-medium transition-all",
                  userName.trim()
                    ? "bg-white text-black hover:bg-white/90"
                    : "bg-white/10 text-white/30 cursor-not-allowed"
                )}
                whileHover={userName.trim() ? { scale: 1.02 } : {}}
                whileTap={userName.trim() ? { scale: 0.98 } : {}}
                onClick={() => userName.trim() && setPhase('interests')}
                disabled={!userName.trim()}
              >
                Continue
              </motion.button>
            </motion.div>
          </motion.div>
        );
        
      case 'interests':
        return (
          <motion.div
            key="interests"
            className="flex flex-col items-center justify-center min-h-screen px-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-full max-w-3xl"
            >
              <h2 className="text-3xl font-medium text-white mb-3 text-center">
                Hi {userName}, what are you interested in?
              </h2>
              <p className="text-white/60 mb-10 text-center">
                Select all that apply—this helps us personalize your experience
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                {interests.map((interest, index) => {
                  const Icon = interest.icon;
                  const isSelected = selectedInterests.includes(interest.id);
                  
                  return (
                    <motion.button
                      key={interest.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => {
                        setSelectedInterests(prev =>
                          prev.includes(interest.id)
                            ? prev.filter(i => i !== interest.id)
                            : [...prev, interest.id]
                        );
                      }}
                      className={cn(
                        "p-6 rounded-xl border transition-all text-left relative overflow-hidden group",
                        isSelected
                          ? "border-violet-500/50 bg-violet-500/10"
                          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                      )}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Glow effect on hover */}
                      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 to-purple-500/0 group-hover:from-violet-500/10 group-hover:to-purple-500/10 transition-all duration-300" />
                      
                      <div className="relative">
                        <div className="flex items-start justify-between mb-3">
                          <Icon className={cn(
                            "w-6 h-6",
                            isSelected ? "text-violet-400" : "text-white/60"
                          )} />
                          {isSelected && (
                            <Check className="w-5 h-5 text-violet-400" />
                          )}
                        </div>
                        <h3 className="font-medium text-white mb-1">
                          {interest.label}
                        </h3>
                        <p className="text-sm text-white/50">
                          {interest.description}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
              
              <motion.button
                className={cn(
                  "w-full px-6 py-3 rounded-xl font-medium transition-all",
                  selectedInterests.length > 0
                    ? "bg-white text-black hover:bg-white/90"
                    : "bg-white/10 text-white/30 cursor-not-allowed"
                )}
                whileHover={selectedInterests.length > 0 ? { scale: 1.02 } : {}}
                whileTap={selectedInterests.length > 0 ? { scale: 0.98 } : {}}
                onClick={() => selectedInterests.length > 0 && setPhase('vault')}
                disabled={selectedInterests.length === 0}
              >
                Continue
              </motion.button>
            </motion.div>
          </motion.div>
        );
        
      case 'vault':
        return (
          <motion.div
            key="vault"
            className="flex flex-col items-center justify-center min-h-screen px-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-full max-w-xl"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
                  <FolderOpen className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-medium text-white mb-3">
                  Set up your vault
                </h2>
                <p className="text-white/60">
                  This is where all your data and notes will be stored
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                  <label className="block text-sm font-medium text-white/80 mb-3">
                    Vault Location
                  </label>
                  <input
                    type="text"
                    value={vaultPath}
                    onChange={(e) => setVaultPath(e.target.value)}
                    placeholder="~/Documents/Orchestra"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:border-white/30 outline-none transition-all"
                  />
                  <p className="mt-3 text-sm text-white/40">
                    Choose a location that's included in your backups
                  </p>
                </div>
                
                <motion.button
                  className="w-full px-6 py-3 bg-white text-black rounded-xl font-medium hover:bg-white/90 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={async () => {
                    if (vaultPath) {
                      await ensureDirectoryExists(vaultPath);
                      await setVaultSetting('path', vaultPath);
                      setPhase('agents');
                    }
                  }}
                >
                  Continue
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        );
        
      case 'agents':
        return (
          <motion.div
            key="agents"
            className="flex flex-col items-center justify-center min-h-screen px-8 py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Subtle ambient glow */}
            <motion.div
              className="absolute w-[800px] h-[800px] rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.05) 0%, transparent 50%)',
                x: useTransform(mouseXSpring, v => v * 30),
                y: useTransform(mouseYSpring, v => v * 30),
              }}
            />
            
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-full max-w-5xl relative"
            >
              <div className="text-center mb-10">
                <h2 className="text-3xl font-medium text-white mb-3">
                  Meet your AI companions
                </h2>
                <p className="text-white/60">
                  These agents are ready to help you {selectedInterests.includes('research') ? 'research' : 'create'}
                </p>
              </div>
              
              {agents.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <motion.div
                      className="w-8 h-8 border-2 border-white/30 border-t-white/60 rounded-full mx-auto mb-4"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <p className="text-white/50">Loading agents...</p>
                  </div>
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
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="group"
                      >
                        <div className="relative p-6 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all h-full">
                          {/* Subtle glow on hover */}
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500/0 to-purple-500/0 group-hover:from-violet-500/5 group-hover:to-purple-500/5 transition-all duration-500" />
                          
                          <div className="relative">
                            {/* Agent header */}
                            <div className="flex items-start gap-4 mb-4">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                                {index === 0 && <Brain className="w-6 h-6 text-white/80" />}
                                {index === 1 && <Zap className="w-6 h-6 text-white/80" />}
                                {index === 2 && <Search className="w-6 h-6 text-white/80" />}
                              </div>
                              <div>
                                <h3 className="font-semibold text-white text-lg">
                                  {agent.agent.name}
                                </h3>
                                <p className="text-sm text-white/50">
                                  by {agent.publisher || 'Orchestra'}
                                </p>
                              </div>
                            </div>
                            
                            {/* Description */}
                            <p className="text-sm text-white/70 mb-4 line-clamp-2">
                              {agent.agent.description}
                            </p>
                            
                            {/* Capabilities */}
                            <div className="space-y-3 mb-4">
                              <div>
                                <p className="text-xs font-medium text-white/50 mb-2">CAPABILITIES</p>
                                <div className="space-y-1">
                                  {capabilities.slice(0, 3).map((capability, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                      <ChevronRight className="w-3 h-3 text-violet-400" />
                                      <span className="text-xs text-white/70">{capability}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              {skills.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-white/50 mb-2">SKILLS</p>
                                  <div className="flex flex-wrap gap-1">
                                    {skills.slice(0, 4).map((skill, idx) => (
                                      <span key={idx} className="px-2 py-1 rounded-md bg-white/5 text-xs text-white/60">
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Stats */}
                            <div className="pt-4 border-t border-white/10">
                              <div className="flex items-center justify-between text-xs text-white/40">
                                <span>{metadata.usage?.total_invocations?.toLocaleString() || '1k+'} chats</span>
                                <span>{metadata.usage?.average_response_time_ms || 200}ms avg</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center"
              >
                <p className="text-sm text-white/40 mb-6">
                  You can explore more agents in the Agent Store after setup
                </p>
                <motion.button
                  className="px-8 py-3 bg-white text-black rounded-xl font-medium hover:bg-white/90 transition-colors inline-flex items-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setPhase('ready')}
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        );
        
      case 'ready':
        return (
          <motion.div
            key="ready"
            className="flex flex-col items-center justify-center min-h-screen px-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 20 }}
              className="mb-8"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm flex items-center justify-center">
                <Check className="w-10 h-10 text-white" />
              </div>
            </motion.div>
            
            <motion.h1
              className="text-4xl font-semibold text-white mb-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              You're all set, {userName}!
            </motion.h1>
            
            <motion.p
              className="text-lg text-white/60 mb-12 max-w-md"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Your AI-powered workspace is ready. Let's create something amazing together.
            </motion.p>
            
            <motion.button
              className="px-8 py-3 bg-white text-black rounded-xl font-medium hover:bg-white/90 transition-colors"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleComplete}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <motion.div
                  className="w-5 h-5 border-2 border-black/30 border-t-black/70 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              ) : (
                "Launch Orchestra"
              )}
            </motion.button>
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
      {/* Very subtle noise texture */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`
        }}
      />
      
      <AnimatePresence mode="wait">
        {renderPhase()}
      </AnimatePresence>
    </motion.div>
  );
};

export default OnboardingRefined;