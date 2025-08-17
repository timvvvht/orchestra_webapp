import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Check
} from 'lucide-react';

interface OnboardingElegantProps {
  isOpen: boolean;
  onComplete: () => void;
}

type Phase = 'welcome' | 'name' | 'interests' | 'vault' | 'agents' | 'complete';

// Minimal, purposeful animations
const fadeIn = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }
};

const OnboardingElegant: React.FC<OnboardingElegantProps> = ({ isOpen, onComplete }) => {
  const [phase, setPhase] = useState<Phase>('welcome');
  const [userName, setUserName] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [vaultPath, setVaultPath] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Store hooks
  const setVaultSetting = useSettingsStore((state) => state.setVaultSetting);
  const { agentConfigs, fetchAgentConfigs } = useAgentConfigStore();
  const [agents, setAgents] = useState<AgentConfigTS[]>([]);
  
  // Load agents when needed
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
  
  const interests = [
    { id: 'research', label: 'Research', icon: Search },
    { id: 'writing', label: 'Writing', icon: PenTool },
    { id: 'coding', label: 'Development', icon: Code },
    { id: 'productivity', label: 'Productivity', icon: Zap }
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
      
      setTimeout(onComplete, 600);
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
            {...fadeIn}
          >
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-8">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            
            <h1 className="text-4xl font-medium text-white mb-4">
              Welcome to Orchestra
            </h1>
            
            <p className="text-lg text-white/60 mb-12 max-w-md">
              Your intelligent workspace for creating, learning, and building
            </p>
            
            <button
              className="px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-white/90 transition-colors"
              onClick={() => setPhase('name')}
            >
              Get Started
            </button>
          </motion.div>
        );
        
      case 'name':
        return (
          <motion.div
            key="name"
            className="flex flex-col items-center justify-center min-h-screen px-8"
            {...fadeIn}
          >
            <div className="w-full max-w-sm">
              <h2 className="text-2xl font-medium text-white mb-8 text-center">
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
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:border-white/40 focus:bg-white/20 outline-none transition-all"
                autoFocus
              />
              
              <button
                className={cn(
                  "w-full mt-4 px-4 py-3 rounded-lg font-medium transition-all",
                  userName.trim()
                    ? "bg-white text-black hover:bg-white/90"
                    : "bg-white/10 text-white/30 cursor-not-allowed"
                )}
                onClick={() => userName.trim() && setPhase('interests')}
                disabled={!userName.trim()}
              >
                Continue
              </button>
            </div>
          </motion.div>
        );
        
      case 'interests':
        return (
          <motion.div
            key="interests"
            className="flex flex-col items-center justify-center min-h-screen px-8"
            {...fadeIn}
          >
            <div className="w-full max-w-2xl">
              <h2 className="text-2xl font-medium text-white mb-2 text-center">
                What brings you here?
              </h2>
              <p className="text-white/60 mb-8 text-center">
                Select your interests
              </p>
              
              <div className="grid grid-cols-2 gap-3 mb-8">
                {interests.map((interest) => {
                  const Icon = interest.icon;
                  const isSelected = selectedInterests.includes(interest.id);
                  
                  return (
                    <button
                      key={interest.id}
                      onClick={() => {
                        setSelectedInterests(prev =>
                          prev.includes(interest.id)
                            ? prev.filter(i => i !== interest.id)
                            : [...prev, interest.id]
                        );
                      }}
                      className={cn(
                        "p-4 rounded-lg border transition-all flex items-center gap-3",
                        isSelected
                          ? "border-white/40 bg-white/20"
                          : "border-white/20 bg-white/10 hover:bg-white/15"
                      )}
                    >
                      <Icon className="w-5 h-5 text-white/80" />
                      <span className="text-white/90">{interest.label}</span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-white/80 ml-auto" />
                      )}
                    </button>
                  );
                })}
              </div>
              
              <button
                className={cn(
                  "w-full px-4 py-3 rounded-lg font-medium transition-all",
                  selectedInterests.length > 0
                    ? "bg-white text-black hover:bg-white/90"
                    : "bg-white/10 text-white/30 cursor-not-allowed"
                )}
                onClick={() => selectedInterests.length > 0 && setPhase('vault')}
                disabled={selectedInterests.length === 0}
              >
                Continue
              </button>
            </div>
          </motion.div>
        );
        
      case 'vault':
        return (
          <motion.div
            key="vault"
            className="flex flex-col items-center justify-center min-h-screen px-8"
            {...fadeIn}
          >
            <div className="w-full max-w-md">
              <div className="text-center mb-8">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                  <FolderOpen className="w-6 h-6 text-blue-400" />
                </div>
                <h2 className="text-2xl font-medium text-white mb-2">
                  Create your vault
                </h2>
                <p className="text-white/60 text-sm">
                  A secure folder where Orchestra stores your conversations, notes, and data
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={vaultPath}
                    onChange={(e) => setVaultPath(e.target.value)}
                    placeholder="~/Documents/Orchestra"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:border-white/40 outline-none transition-all"
                  />
                  <p className="mt-2 text-xs text-white/40">
                    This creates a folder on your computer. We suggest using your Documents folder.
                  </p>
                </div>
                
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-sm text-white/60">
                    💡 <span className="text-white/80">Don't worry!</span> You can change this location anytime in Settings.
                  </p>
                </div>
                
                <button
                  className="w-full px-4 py-3 bg-white text-black rounded-lg font-medium hover:bg-white/90 transition-colors"
                  onClick={async () => {
                    if (vaultPath) {
                      await ensureDirectoryExists(vaultPath);
                      await setVaultSetting('path', vaultPath);
                      setPhase('agents');
                    }
                  }}
                >
                  Create Vault & Continue
                </button>
              </div>
            </div>
          </motion.div>
        );
        
      case 'agents':
        return (
          <motion.div
            key="agents"
            className="flex flex-col items-center justify-center min-h-screen px-8 py-12"
            {...fadeIn}
          >
            <div className="w-full max-w-4xl">
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 mb-4">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <span className="text-sm text-violet-300">AI Powered</span>
                </div>
                <h2 className="text-3xl font-medium text-white mb-2">
                  Meet your AI team
                </h2>
                <p className="text-white/60">
                  Specialized assistants ready to amplify your {selectedInterests.includes('research') ? 'discoveries' : 'creativity'}
                </p>
              </div>
              
              {agents.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
                  {agents.map((agent, index) => {
                    const metadata = agent.agent.metadata || {};
                    const capabilities = metadata.capabilities || [];
                    
                    // Color schemes for each agent
                    const colorSchemes = [
                      { bg: 'from-violet-500/10 to-purple-500/10', border: 'border-violet-500/20', icon: 'text-violet-400', accent: 'text-violet-300' },
                      { bg: 'from-blue-500/10 to-cyan-500/10', border: 'border-blue-500/20', icon: 'text-blue-400', accent: 'text-blue-300' },
                      { bg: 'from-emerald-500/10 to-green-500/10', border: 'border-emerald-500/20', icon: 'text-emerald-400', accent: 'text-emerald-300' }
                    ];
                    const scheme = colorSchemes[index % colorSchemes.length];
                    
                    return (
                      <motion.div
                        key={agent.id}
                        className={cn(
                          "relative p-6 rounded-xl border overflow-hidden",
                          "bg-gradient-to-br",
                          scheme.bg,
                          scheme.border
                        )}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        {/* Subtle glow effect */}
                        <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500">
                          <div className={cn(
                            "absolute inset-0 bg-gradient-to-br blur-xl",
                            scheme.bg
                          )} />
                        </div>
                        
                        <div className="relative">
                          <div className="flex items-start gap-3 mb-4">
                            <div className={cn(
                              "w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center",
                              scheme.icon
                            )}>
                              {index === 0 && <Brain className="w-5 h-5" />}
                              {index === 1 && <Zap className="w-5 h-5" />}
                              {index === 2 && <Search className="w-5 h-5" />}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium text-white">
                                {agent.agent.name}
                              </h3>
                              <p className={cn("text-xs", scheme.accent)}>
                                {metadata.usage?.total_invocations?.toLocaleString() || '1k+'} conversations
                              </p>
                            </div>
                          </div>
                          
                          <p className="text-sm text-white/70 mb-4 line-clamp-2">
                            {agent.agent.description}
                          </p>
                          
                          <div className="space-y-2">
                            {capabilities.slice(0, 2).map((capability, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <div className={cn("w-1 h-1 rounded-full", scheme.icon)} />
                                <p className="text-xs text-white/60">
                                  {capability}
                                </p>
                              </div>
                            ))}
                          </div>
                          
                          {/* Performance indicator */}
                          <div className="mt-4 pt-4 border-t border-white/10">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-white/40">Response time</span>
                              <span className={scheme.accent}>
                                ~{metadata.usage?.average_response_time_ms || 200}ms
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
              
              <div className="text-center">
                <p className="text-sm text-white/40 mb-6">
                  More agents available in the Agent Store after setup
                </p>
                <button
                  className="px-8 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg font-medium hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/20"
                  onClick={() => setPhase('complete')}
                >
                  Continue
                </button>
              </div>
            </div>
          </motion.div>
        );
        
      case 'complete':
        return (
          <motion.div
            key="complete"
            className="flex flex-col items-center justify-center min-h-screen px-8 text-center"
            {...fadeIn}
          >
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-8">
              <Check className="w-8 h-8 text-white" />
            </div>
            
            <h1 className="text-3xl font-medium text-white mb-4">
              You're all set, {userName}
            </h1>
            
            <p className="text-lg text-white/60 mb-12 max-w-md">
              Your workspace is ready. Let's begin.
            </p>
            
            <button
              className="px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-white/90 transition-colors"
              onClick={handleComplete}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black/70 rounded-full animate-spin" />
              ) : (
                "Launch Orchestra"
              )}
            </button>
          </motion.div>
        );
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-gray-950 z-50">
      <AnimatePresence mode="wait">
        {renderPhase()}
      </AnimatePresence>
    </div>
  );
};

export default OnboardingElegant;