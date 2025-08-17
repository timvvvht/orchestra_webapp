import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '@/stores/chatStore';
import { useAgentConfigStore } from '@/stores/agentConfigStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type { AgentConfigTS, ToolDefinitionTS, ToolGroupTS } from '@/types/agentConfig';
import type { ChatSession } from '@/types/chatTypes';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Icons
import { 
  ArrowRight, 
  Sparkles, 
  Zap, 
  Shield, 
  Globe, 
  Brain,
  Code2,
  Database,
  FileSearch,
  CheckCircle2,
  Star,
  ChevronDown,
  Play,
  Layers,
  Users,
  BarChart3,
  Lock,
  Rocket
} from 'lucide-react';

// Stats data
const STATS = [
  { value: "10M+", label: "Tasks Completed", icon: CheckCircle2 },
  { value: "98%", label: "Satisfaction", icon: Star },
  { value: "50ms", label: "Response Time", icon: Zap },
  { value: "24/7", label: "Availability", icon: Globe }
];

// Features data
const FEATURES = [
  {
    icon: Brain,
    title: "Intelligent Context",
    description: "AI that understands your project and remembers conversations",
    gradient: "from-purple-600 to-pink-600"
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Get instant responses with our optimized infrastructure",
    gradient: "from-blue-600 to-cyan-600"
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Your data is encrypted and never used for training",
    gradient: "from-green-600 to-emerald-600"
  },
  {
    icon: Code2,
    title: "Multi-Language",
    description: "Support for 50+ programming languages and frameworks",
    gradient: "from-orange-600 to-red-600"
  }
];

// Testimonials
const TESTIMONIALS = [
  {
    name: "Sarah Chen",
    role: "Product Manager",
    company: "TechCorp",
    content: "This AI platform transformed how our team works. We're shipping features 3x faster.",
    rating: 5
  },
  {
    name: "Michael Rodriguez",
    role: "Senior Developer",
    company: "StartupXYZ",
    content: "The code assistant is incredible. It's like having a senior engineer on demand 24/7.",
    rating: 5
  },
  {
    name: "Emma Thompson",
    role: "Research Director",
    company: "Innovation Labs",
    content: "The research capabilities save us hours every day. It's become essential to our workflow.",
    rating: 5
  }
];

export function LandingPageMax() {
  const navigate = useNavigate();
  const { createSession, sendMessage } = useChatStore();
  const { agentConfigs } = useAgentConfigStore();
  const { settings } = useSettingsStore();
  
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [userInput, setUserInput] = useState('');
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  
  // Get featured agents (first 3)
  const featuredAgents = useMemo(() => 
    Object.values(agentConfigs).slice(0, 3).filter(Boolean) as AgentConfigTS[],
    [agentConfigs]
  );

  // Initialize with default agent
  useEffect(() => {
    const defaultId = settings.defaultAgentId || Object.keys(agentConfigs)[0];
    if (defaultId && agentConfigs[defaultId]) {
      setSelectedAgentId(defaultId);
    }
  }, [agentConfigs, settings.defaultAgentId]);

  // Get selected agent
  const selectedAgent = selectedAgentId ? agentConfigs[selectedAgentId] : null;

  // Prepare agent template for chat session
  const prepareAgentTemplate = useCallback((config: AgentConfigTS): Partial<ChatSession> => {
    const avatar = config.agent.avatar?.startsWith('/') || config.agent.avatar?.startsWith('http')
      ? config.agent.avatar
      : (config.agent.avatar ? `/assets/avatars/${config.agent.avatar}` : '/assets/avatars/default_avatar.png');

    let template: Partial<ChatSession> = {
      name: config.agent.name || 'New Chat',
      avatar,
      specialty: config.agent.description || 'General Assistant',
      model: config.ai_config.model_id || 'gpt-4o-mini',
      tools: [],
      systemPrompt: config.agent.system_prompt || 'You are a helpful assistant.',
      temperature: config.ai_config.temperature ?? 0.7,
    };

    if (config.tool_groups && config.tool_groups.length > 0) {
      template.tools = config.tool_groups.flatMap(
        (tg: ToolGroupTS) => tg.tools.map((t: ToolDefinitionTS) => t.name)
      );
    }
    
    return template;
  }, []);

  // Handle starting a chat
  const handleStartChat = async () => {
    if (!userInput.trim() || !selectedAgentId || !selectedAgent) return;

    try {
      const agentTemplate = prepareAgentTemplate(selectedAgent);
      const sessionId = await createSession(
        selectedAgentId,
        selectedAgent.agent.name,
        agentTemplate
      );

      if (sessionId) {
        await sendMessage(userInput);
        navigate(`/chat/${sessionId}`);
      }
    } catch (error) {
      console.error('Failed to start chat:', error);
    }
  };

  // Handle example click
  const handleExampleClick = (example: string) => {
    setUserInput(example);
    document.getElementById('chat-input')?.focus();
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-4 py-20 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
        
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto text-center">
          {/* Badge */}
          <Badge className="mb-6 px-4 py-1.5 text-sm font-medium bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
            <Sparkles className="w-3 h-3 mr-1.5" />
            AI-Powered Productivity Platform
          </Badge>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
              Your AI Team,
            </span>
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
              Always Ready
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto mb-8">
            Specialized AI agents for research, coding, analysis, and more. 
            Get expert help instantly, 24/7.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button
              size="lg"
              onClick={() => document.getElementById('agent-selector')?.scrollIntoView({ behavior: 'smooth' })}
              className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-6 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300"
            >
              Start Free
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <Button
              size="lg"
              variant="outline"
              onClick={() => setIsVideoModalOpen(true)}
              className="group px-8 py-6 text-lg font-semibold border-2"
            >
              <Play className="mr-2 w-5 h-5" />
              Watch Demo
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {STATS.map((stat, index) => (
              <div key={index} className="text-center">
                <stat.icon className="w-8 h-8 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                <div className="text-3xl font-bold text-slate-900 dark:text-white">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Built for Modern Teams
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400">
              Everything you need to supercharge your productivity
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature, index) => (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Agent Selector Section */}
      <section id="agent-selector" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Meet Your AI Agents
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400">
              Specialized experts ready to assist with any task
            </p>
          </div>

          {/* Interactive Agent Selector */}
          <div className="max-w-4xl mx-auto">
            <Card className="p-8 shadow-2xl">
              <div className="space-y-6">
                {/* Agent Grid */}
                <div className="grid md:grid-cols-3 gap-4">
                  {featuredAgents.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => setSelectedAgentId(agent.id)}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                        selectedAgentId === agent.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-lg'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        {agent.agent.avatar ? (
                          <img
                            src={agent.agent.avatar.startsWith('/') || agent.agent.avatar.startsWith('http')
                              ? agent.agent.avatar
                              : `/assets/avatars/${agent.agent.avatar}`}
                            alt={agent.agent.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                            <Brain className="w-5 h-5 text-white" />
                          </div>
                        )}
                        <div className="text-left">
                          <div className="font-semibold">{agent.agent.name}</div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            {agent.ai_config.model_id}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {agent.agent.description?.substring(0, 60)}...
                      </p>
                      {selectedAgentId === agent.id && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Selected
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Selected agent details */}
                {selectedAgent && (
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">{selectedAgent.agent.name} specializes in:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedAgent.tool_groups?.map((group, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {group.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input Area */}
                <div className="space-y-4">
                  <textarea
                    id="chat-input"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="What would you like help with today?"
                    className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 resize-none h-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        handleStartChat();
                      }
                    }}
                  />
                  
                  {/* Example prompts */}
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Try:</span>
                    {['Help me debug this code', 'Research quantum computing', 'Analyze sales data'].map((example, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleExampleClick(example)}
                        className="text-sm px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                  
                  <Button
                    onClick={handleStartChat}
                    disabled={!userInput.trim() || !selectedAgentId}
                    className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Start Conversation
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 px-4 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Loved by Teams Worldwide
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400">
              See what our users have to say
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((testimonial, index) => (
              <Card key={index} className="hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 mb-6 italic">
                    "{testimonial.content}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600" />
                    <div>
                      <div className="font-semibold text-sm">{testimonial.name}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        {testimonial.role} at {testimonial.company}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-br from-blue-600 to-purple-600 dark:from-blue-800 dark:to-purple-800">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Ready to Transform Your Workflow?
          </h2>
          <p className="text-xl mb-8 text-white/90">
            Join thousands of teams already using AI to work smarter
          </p>
          <Button
            size="lg"
            onClick={() => document.getElementById('agent-selector')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-white text-blue-600 hover:bg-slate-100 px-8 py-6 text-lg font-semibold shadow-xl"
          >
            Get Started Free
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-6 h-6 text-blue-600" />
                <span className="font-bold text-lg">AI Platform</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Your intelligent workspace for the future
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li><a href="#" className="hover:text-blue-600">Features</a></li>
                <li><a href="#" className="hover:text-blue-600">Pricing</a></li>
                <li><a href="#" className="hover:text-blue-600">Security</a></li>
                <li><a href="#" className="hover:text-blue-600">Roadmap</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li><a href="#" className="hover:text-blue-600">About</a></li>
                <li><a href="#" className="hover:text-blue-600">Blog</a></li>
                <li><a href="#" className="hover:text-blue-600">Careers</a></li>
                <li><a href="#" className="hover:text-blue-600">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li><a href="#" className="hover:text-blue-600">Privacy</a></li>
                <li><a href="#" className="hover:text-blue-600">Terms</a></li>
                <li><a href="#" className="hover:text-blue-600">Cookie Policy</a></li>
                <li><a href="#" className="hover:text-blue-600">Licenses</a></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800 text-center text-sm text-slate-600 dark:text-slate-400">
            © 2024 AI Platform. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Video Modal */}
      {isVideoModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setIsVideoModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-xl p-2 max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-video bg-slate-200 dark:bg-slate-800 rounded-lg flex items-center justify-center">
              <p className="text-slate-600 dark:text-slate-400">Demo video placeholder</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LandingPageMax;