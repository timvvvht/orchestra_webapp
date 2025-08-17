import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { 
  Sparkles,
  Download,
  ArrowRight,
  Bot,
  Cpu,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgentConfigStore } from '@/stores/agentConfigStore';
import type { AgentConfigTS } from '@/types/agentTypes';
import AgentPreviewModal from './AgentPreviewModal';
import { enrichAgentMetadata } from '@/utils/agentMetadataEnricher';

// Gradient color schemes for agents
const AGENT_GRADIENTS = [
  { from: 'from-violet-600/20', to: 'to-indigo-600/20', glow: 'rgba(139, 92, 246, 0.3)' },
  { from: 'from-emerald-600/20', to: 'to-teal-600/20', glow: 'rgba(16, 185, 129, 0.3)' },
  { from: 'from-rose-600/20', to: 'to-pink-600/20', glow: 'rgba(244, 63, 94, 0.3)' }
];

// Agent card with meticulous design
const AgentCard: React.FC<{ 
  agent: AgentConfigTS; 
  index: number;
  onSelect: (agent: AgentConfigTS) => void;
}> = ({ agent, index, onSelect }) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const rotateX = useTransform(mouseY, [-150, 150], [5, -5]);
  const rotateY = useTransform(mouseX, [-150, 150], [-5, 5]);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    mouseX.set(x);
    mouseY.set(y);
  };
  
  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };
  
  const gradient = AGENT_GRADIENTS[index % AGENT_GRADIENTS.length];
  const metadata = agent.agent.metadata || {};
  const capabilities = metadata.capabilities || [];
  
  // Get primary capability for subtitle
  const primaryCapability = capabilities[0] || 'AI Assistant';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.6, 
        delay: index * 0.1,
        ease: [0.21, 0.47, 0.32, 0.98]
      }}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d'
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative"
    >
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="relative group cursor-pointer"
        onClick={() => onSelect(agent)}
      >
        {/* Glow effect */}
        <div 
          className="absolute -inset-4 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl"
          style={{ background: gradient.glow }}
        />
        
        {/* Card */}
        <div className="relative h-[420px] rounded-2xl overflow-hidden bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-2xl">
          {/* Background gradient */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-30",
            gradient.from,
            gradient.to
          )} />
          
          {/* Noise texture overlay */}
          <div className="absolute inset-0 opacity-[0.015]" 
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`
            }}
          />
          
          {/* Content */}
          <div className="relative h-full flex flex-col p-8">
            {/* Icon */}
            <div className="mb-6">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                {index === 0 && <Cpu className="w-8 h-8 text-white/80" />}
                {index === 1 && <Zap className="w-8 h-8 text-white/80" />}
                {index === 2 && <Bot className="w-8 h-8 text-white/80" />}
              </div>
            </div>
            
            {/* Title and subtitle */}
            <div className="mb-4">
              <h3 className="text-2xl font-semibold text-white mb-1">
                {agent.agent.name}
              </h3>
              <p className="text-white/60 text-sm">
                {primaryCapability}
              </p>
            </div>
            
            {/* Description - Fixed height with elegant fade */}
            <div className="relative flex-1 mb-6">
              <p className="text-white/70 text-sm leading-relaxed line-clamp-4">
                {agent.agent.description}
              </p>
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
            
            {/* Bottom section */}
            <div className="mt-auto">
              {/* Stats */}
              <div className="flex items-center gap-4 mb-6 text-xs text-white/50">
                <div className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{metadata.usage?.total_invocations?.toLocaleString() || '1k+'} uses</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" />
                  <span>{metadata.usage?.average_response_time_ms || 200}ms avg</span>
                </div>
              </div>
              
              {/* CTA */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">
                  by {agent.publisher || 'Orchestra'}
                </span>
                <motion.div
                  className="flex items-center gap-2 text-white/80 text-sm font-medium"
                  whileHover={{ x: 4 }}
                >
                  <span>Explore</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Main Agent Store component
export const AgentStore: React.FC = () => {
  const { agentConfigs, fetchAgentConfigs, isLoading } = useAgentConfigStore();
  const [selectedAgent, setSelectedAgent] = useState<AgentConfigTS | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  useEffect(() => {
    fetchAgentConfigs();
  }, [fetchAgentConfigs]);
  
  // Get enriched agents
  const agents = useMemo(() => {
    return Object.values(agentConfigs).map(enrichAgentMetadata);
  }, [agentConfigs]);
  
  const handleSelect = (agent: AgentConfigTS) => {
    setSelectedAgent(agent);
    setIsPreviewOpen(true);
  };
  
  const handleInstall = async (agent: AgentConfigTS) => {
    console.log('Installing agent:', agent.agent.name);
    // TODO: Implement actual installation logic
  };
  
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0">
        {/* Gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl" />
        
        {/* Noise texture */}
        <div className="absolute inset-0 opacity-[0.015]" 
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`
          }}
        />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="text-center pt-20 pb-16 px-6"
        >
          <h1 className="text-6xl font-bold text-white mb-4 tracking-tight">
            Agent Store
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Carefully crafted AI agents, each designed to excel at what they do best.
          </p>
        </motion.div>
        
        {/* Agent Grid */}
        <div className="max-w-6xl mx-auto px-6 pb-20">
          {isLoading ? (
            <div className="flex items-center justify-center py-32">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white/60"
              />
            </div>
          ) : agents.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-32"
            >
              <Bot className="w-16 h-16 text-white/20 mx-auto mb-6" />
              <h3 className="text-2xl font-medium text-white/80 mb-2">No agents available</h3>
              <p className="text-white/40">
                Check back soon for new AI agents
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {agents.map((agent, index) => (
                <AgentCard 
                  key={agent.id} 
                  agent={agent} 
                  index={index}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Agent Preview Modal */}
      <AgentPreviewModal
        agent={selectedAgent}
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setSelectedAgent(null);
        }}
        onInstall={handleInstall}
      />
    </div>
  );
};

export default AgentStore;