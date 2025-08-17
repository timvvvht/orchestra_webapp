import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  Sparkles,
  Zap,
  MessageSquare,
  ChevronRight,
  ArrowRight,
  Bot,
  Cpu,
  Brain
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentConfigTS } from '@/types/agentTypes';

interface AgentPreviewModalProps {
  agent: AgentConfigTS | null;
  isOpen: boolean;
  onClose: () => void;
  onInstall: (agent: AgentConfigTS) => void;
}

// Get icon based on agent index/type
const getAgentIcon = (name: string) => {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('research') || nameLower.includes('analyze')) return Brain;
  if (nameLower.includes('code') || nameLower.includes('dev')) return Cpu;
  return Bot;
};

export const AgentPreviewModal: React.FC<AgentPreviewModalProps> = ({
  agent,
  isOpen,
  onClose,
  onInstall
}) => {
  const [isInstalling, setIsInstalling] = useState(false);
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!agent) return null;

  const metadata = agent.agent.metadata || {};
  const capabilities = metadata.capabilities || [];
  const skills = metadata.skills || [];
  const tips = metadata.tips || [];
  const usage = metadata.usage || {};

  const handleInstall = async () => {
    setIsInstalling(true);
    await onInstall(agent);
    setTimeout(() => {
      setIsInstalling(false);
      onClose();
    }, 2000);
  };

  const Icon = getAgentIcon(agent.agent.name);

  // Example conversations
  const conversations = [
    {
      user: "How can you help me with my work?",
      agent: `I'm ${agent.agent.name}, and I specialize in ${capabilities[0]?.toLowerCase() || 'assisting you'}. I can help you be more productive by ${capabilities[1]?.toLowerCase() || 'streamlining your workflow'}.`
    },
    {
      user: "What makes you different from other agents?",
      agent: `My unique strength lies in ${skills[0]?.toLowerCase() || 'understanding context deeply'}. I've been optimized for ${skills[1]?.toLowerCase() || 'delivering precise results'}, with an average response time of ${usage.average_response_time_ms || 200}ms.`
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <div 
              className="relative w-full max-w-5xl max-h-[90vh] bg-black rounded-3xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Background effects */}
              <div className="absolute inset-0">
                <div className="absolute top-0 left-0 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
              </div>
              
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all z-10"
              >
                <X className="w-5 h-5" />
              </button>
              
              {/* Content */}
              <div className="relative flex h-full">
                {/* Left Panel - Agent Info */}
                <div className="w-[420px] p-12 flex flex-col border-r border-white/10">
                  {/* Agent Icon */}
                  <div className="mb-8">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm flex items-center justify-center border border-white/20">
                      <Icon className="w-10 h-10 text-white/80" />
                    </div>
                  </div>
                  
                  {/* Agent Name & Description */}
                  <div className="mb-8">
                    <h2 className="text-3xl font-bold text-white mb-2">
                      {agent.agent.name}
                    </h2>
                    <p className="text-white/60">
                      by {agent.publisher || 'Orchestra'}
                    </p>
                  </div>
                  
                  <p className="text-white/70 leading-relaxed mb-8">
                    {agent.agent.description}
                  </p>
                  
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-4 h-4 text-violet-400" />
                        <span className="text-xs text-white/60">Total Uses</span>
                      </div>
                      <p className="text-xl font-semibold text-white">
                        {usage.total_invocations?.toLocaleString() || '1k+'}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        <span className="text-xs text-white/60">Response Time</span>
                      </div>
                      <p className="text-xl font-semibold text-white">
                        {usage.average_response_time_ms || 200}ms
                      </p>
                    </div>
                  </div>
                  
                  {/* Install Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleInstall}
                    disabled={isInstalling}
                    className={cn(
                      "mt-auto py-4 px-6 rounded-xl font-medium transition-all",
                      "bg-white text-black hover:bg-white/90",
                      "flex items-center justify-center gap-3",
                      isInstalling && "opacity-70"
                    )}
                  >
                    {isInstalling ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Download className="w-5 h-5" />
                        </motion.div>
                        <span>Installing...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        <span>Install Agent</span>
                      </>
                    )}
                  </motion.button>
                </div>
                
                {/* Right Panel - Details */}
                <div className="flex-1 overflow-y-auto">
                  {/* Section Navigation */}
                  <div className="sticky top-0 bg-black/80 backdrop-blur-xl border-b border-white/10 p-6 z-10">
                    <div className="flex gap-6">
                      {['Capabilities', 'Examples', 'Tips'].map((section, idx) => (
                        <button
                          key={section}
                          onClick={() => setActiveSection(idx)}
                          className={cn(
                            "pb-2 px-1 text-sm font-medium transition-all relative",
                            activeSection === idx 
                              ? "text-white" 
                              : "text-white/40 hover:text-white/60"
                          )}
                        >
                          {section}
                          {activeSection === idx && (
                            <motion.div
                              layoutId="activeSection"
                              className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Section Content */}
                  <div className="p-8">
                    <AnimatePresence mode="wait">
                      {/* Capabilities Section */}
                      {activeSection === 0 && (
                        <motion.div
                          key="capabilities"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                          className="space-y-6"
                        >
                          <div>
                            <h3 className="text-lg font-semibold text-white mb-4">
                              What I can do
                            </h3>
                            <div className="space-y-3">
                              {capabilities.map((capability, idx) => (
                                <motion.div
                                  key={idx}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.1 }}
                                  className="flex items-start gap-3"
                                >
                                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <ChevronRight className="w-3 h-3 text-white/80" />
                                  </div>
                                  <p className="text-white/80 leading-relaxed">
                                    {capability}
                                  </p>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                          
                          {skills.length > 0 && (
                            <div>
                              <h3 className="text-lg font-semibold text-white mb-4">
                                Core Skills
                              </h3>
                              <div className="flex flex-wrap gap-2">
                                {skills.map((skill, idx) => (
                                  <span
                                    key={idx}
                                    className="px-3 py-1.5 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 text-sm text-white/70"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                      
                      {/* Examples Section */}
                      {activeSection === 1 && (
                        <motion.div
                          key="examples"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                          className="space-y-6"
                        >
                          <h3 className="text-lg font-semibold text-white mb-4">
                            Example Conversations
                          </h3>
                          <div className="space-y-6">
                            {conversations.map((conv, idx) => (
                              <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.2 }}
                                className="space-y-4"
                              >
                                {/* User message */}
                                <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                                    <MessageSquare className="w-4 h-4 text-white/60" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-xs text-white/40 mb-1">You</p>
                                    <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                                      <p className="text-white/80">{conv.user}</p>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Agent response */}
                                <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center flex-shrink-0">
                                    <Icon className="w-4 h-4 text-white/80" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-xs text-white/40 mb-1">{agent.agent.name}</p>
                                    <div className="p-4 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-sm border border-white/10">
                                      <p className="text-white/90">{conv.agent}</p>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                      
                      {/* Tips Section */}
                      {activeSection === 2 && (
                        <motion.div
                          key="tips"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                          className="space-y-6"
                        >
                          <h3 className="text-lg font-semibold text-white mb-4">
                            Pro Tips
                          </h3>
                          <div className="space-y-4">
                            {tips.map((tip, idx) => (
                              <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="flex items-start gap-3"
                              >
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <Zap className="w-3 h-3 text-yellow-400" />
                                </div>
                                <p className="text-white/80 leading-relaxed">
                                  {tip}
                                </p>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AgentPreviewModal;