import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Code2, 
  FileSearch, 
  Database, 
  Sparkles,
  ArrowRight,
  Check,
  Zap,
  Shield,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AgentConfigTS } from '@/types/agentConfig';

interface AgentShowcaseProps {
  agents: AgentConfigTS[];
  selectedAgentId: string;
  onAgentSelect: (agentId: string) => void;
  userInput: string;
  onInputChange: (value: string) => void;
  onStartChat: () => void;
}

// Agent capability icons
const CAPABILITY_ICONS: Record<string, any> = {
  'research': FileSearch,
  'coding': Code2,
  'data': Database,
  'analysis': Brain,
  'general': Sparkles
};

// Example prompts for each agent type
const EXAMPLE_PROMPTS: Record<string, string[]> = {
  'research': [
    'Find the latest research on quantum computing',
    'Summarize recent AI breakthroughs',
    'Compare different machine learning frameworks'
  ],
  'coding': [
    'Debug this React component',
    'Write a Python data processing script',
    'Optimize this SQL query'
  ],
  'data': [
    'Analyze this sales dataset',
    'Create a dashboard for KPIs',
    'Find patterns in user behavior'
  ]
};

export function AgentShowcase({
  agents,
  selectedAgentId,
  onAgentSelect,
  userInput,
  onInputChange,
  onStartChat
}: AgentShowcaseProps) {
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  // Get agent type from description or name
  const getAgentType = (agent: AgentConfigTS): string => {
    const name = agent.agent.name.toLowerCase();
    const desc = agent.agent.description?.toLowerCase() || '';
    
    if (name.includes('research') || desc.includes('research')) return 'research';
    if (name.includes('code') || desc.includes('code') || desc.includes('programming')) return 'coding';
    if (name.includes('data') || desc.includes('analysis')) return 'data';
    return 'general';
  };

  // Animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    hover: { y: -5, transition: { duration: 0.2 } }
  };

  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-50/30 to-transparent dark:via-blue-950/10" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge className="mb-4 px-4 py-1.5">
            <Zap className="w-3 h-3 mr-1" />
            Powered by GPT-4 & Claude 3
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Choose Your AI Assistant
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Each agent is specialized for specific tasks, with custom tools and knowledge
          </p>
        </motion.div>

        {/* Main showcase card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto"
        >
          <Card className="p-8 md:p-10 shadow-2xl border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            {/* Agent selector */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              {agents.slice(0, 3).map((agent) => {
                const agentType = getAgentType(agent);
                const Icon = CAPABILITY_ICONS[agentType] || Brain;
                const isSelected = selectedAgentId === agent.id;
                const isHovered = hoveredAgent === agent.id;

                return (
                  <motion.button
                    key={agent.id}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover="hover"
                    onClick={() => onAgentSelect(agent.id)}
                    onMouseEnter={() => setHoveredAgent(agent.id)}
                    onMouseLeave={() => setHoveredAgent(null)}
                    className={`relative p-6 rounded-2xl border-2 transition-all duration-300 text-left ${
                      isSelected
                        ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 shadow-lg'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900'
                    }`}
                  >
                    {/* Selection indicator */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
                        >
                          <Check className="w-3 h-3 text-white" />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Agent icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 ${
                      isSelected || isHovered
                        ? 'bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg'
                        : 'bg-slate-100 dark:bg-slate-800'
                    }`}>
                      <Icon className={`w-6 h-6 transition-colors ${
                        isSelected || isHovered ? 'text-white' : 'text-slate-600 dark:text-slate-400'
                      }`} />
                    </div>

                    {/* Agent info */}
                    <h3 className="font-semibold text-lg mb-1">{agent.agent.name}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                      {agent.agent.description}
                    </p>

                    {/* Agent capabilities */}
                    <div className="flex flex-wrap gap-1">
                      {agent.tool_groups?.slice(0, 3).map((group, idx) => (
                        <Badge 
                          key={idx} 
                          variant="secondary" 
                          className="text-xs px-2 py-0.5"
                        >
                          {group.name}
                        </Badge>
                      ))}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Selected agent details */}
            <AnimatePresence mode="wait">
              {selectedAgent && (
                <motion.div
                  key={selectedAgent.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-8 p-6 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-lg flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-500" />
                        {selectedAgent.agent.name} is ready to help
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Model: {selectedAgent.ai_config.model_id}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        <Shield className="w-3 h-3 mr-1" />
                        Secure
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Globe className="w-3 h-3 mr-1" />
                        24/7
                      </Badge>
                    </div>
                  </div>

                  {/* Example prompts */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Try asking:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {EXAMPLE_PROMPTS[getAgentType(selectedAgent)]?.map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => onInputChange(prompt)}
                          className="text-xs px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input area */}
            <div className="space-y-4">
              <div className="relative">
                <textarea
                  value={userInput}
                  onChange={(e) => onInputChange(e.target.value)}
                  placeholder={`Ask ${selectedAgent?.agent.name || 'your AI assistant'} anything...`}
                  className="w-full p-6 pr-24 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 resize-none h-32 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-lg"
                />
                <div className="absolute bottom-4 right-4 text-xs text-slate-400">
                  ⌘ + Enter
                </div>
              </div>
              
              <Button
                onClick={onStartChat}
                disabled={!userInput.trim() || !selectedAgentId}
                className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-300 group"
              >
                Start Conversation
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>

              {/* Trust indicators */}
              <div className="flex justify-center items-center gap-6 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  End-to-end encrypted
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Instant responses
                </span>
                <span className="flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  Available 24/7
                </span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Additional info */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Not sure which agent to choose? 
            <Button variant="link" className="text-blue-600 dark:text-blue-400 px-1">
              Take our 30-second quiz
            </Button>
            to find your perfect AI assistant.
          </p>
        </motion.div>
      </div>
    </section>
  );
}