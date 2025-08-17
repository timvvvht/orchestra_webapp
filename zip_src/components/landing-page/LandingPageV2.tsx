import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '@/stores/chatStore';
import { useAgentConfigStore } from '@/stores/agentConfigStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type { AgentConfigTS } from '@/types/agentConfig';

// UI Components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
  Users,
  CheckCircle2,
  Star,
  ChevronRight,
  Play,
  Layers
} from 'lucide-react';

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

// Feature data
const FEATURES = [
  {
    icon: Brain,
    title: "Intelligent Agents",
    description: "Specialized AI assistants trained for specific domains and tasks",
    gradient: "from-purple-500 to-pink-500"
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Get instant responses with our optimized infrastructure",
    gradient: "from-blue-500 to-cyan-500"
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Your data is encrypted and never used for training",
    gradient: "from-green-500 to-emerald-500"
  },
  {
    icon: Globe,
    title: "Always Available",
    description: "24/7 availability with 99.9% uptime guarantee",
    gradient: "from-orange-500 to-red-500"
  }
];

// Testimonials
const TESTIMONIALS = [
  {
    name: "Sarah Chen",
    role: "Product Manager at TechCorp",
    content: "This AI platform transformed how our team works. We're 3x more productive.",
    rating: 5,
    avatar: "/assets/avatars/sarah.jpg"
  },
  {
    name: "Michael Rodriguez",
    role: "Senior Developer",
    content: "The code assistant is incredible. It's like having a senior engineer on demand.",
    rating: 5,
    avatar: "/assets/avatars/michael.jpg"
  },
  {
    name: "Emma Thompson",
    role: "Research Director",
    content: "The research capabilities are unmatched. It saves us hours every day.",
    rating: 5,
    avatar: "/assets/avatars/emma.jpg"
  }
];

// Stats
const STATS = [
  { value: "10M+", label: "Tasks Completed" },
  { value: "98%", label: "Satisfaction Rate" },
  { value: "50ms", label: "Avg Response Time" },
  { value: "24/7", label: "Availability" }
];

export function LandingPageV2() {
  const navigate = useNavigate();
  const { createSession, sendMessage } = useChatStore();
  const { agentConfigs } = useAgentConfigStore();
  const { settings } = useSettingsStore();
  
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [userInput, setUserInput] = useState('');
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 300], [1, 0.95]);

  // Get featured agents (first 3)
  const featuredAgents = Object.values(agentConfigs).slice(0, 3);

  // Initialize with default agent
  useEffect(() => {
    const defaultId = settings.defaultAgentId || Object.keys(agentConfigs)[0];
    if (defaultId) setSelectedAgentId(defaultId);
  }, [agentConfigs, settings.defaultAgentId]);

  const handleStartChat = async () => {
    if (!userInput.trim() || !selectedAgentId) return;
    
    const agent = agentConfigs[selectedAgentId];
    if (!agent) return;

    try {
      const sessionId = await createSession(
        selectedAgentId,
        agent.agent.name,
        {
          name: agent.agent.name,
          avatar: agent.agent.avatar,
          specialty: agent.agent.description,
          model: agent.ai_config.model_id,
          systemPrompt: agent.agent.system_prompt,
          temperature: agent.ai_config.temperature
        }
      );

      if (sessionId) {
        await sendMessage(userInput);
        navigate(`/chat/${sessionId}`);
      }
    } catch (error) {
      console.error('Failed to start chat:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 overflow-x-hidden">
      {/* Hero Section */}
      <motion.section 
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-screen flex items-center justify-center px-4 py-20"
      >
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
        
        {/* Animated background shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{ 
              rotate: 360,
              scale: [1, 1.2, 1]
            }}
            transition={{ 
              duration: 20, 
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ 
              rotate: -360,
              scale: [1, 1.3, 1]
            }}
            transition={{ 
              duration: 25, 
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"
          />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="space-y-8"
          >
            {/* Badge */}
            <motion.div variants={fadeInUp}>
              <Badge className="px-4 py-1.5 text-sm font-medium bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
                <Sparkles className="w-3 h-3 mr-1.5" />
                AI-Powered Productivity Platform
              </Badge>
            </motion.div>

            {/* Headline */}
            <motion.h1 
              variants={fadeInUp}
              className="text-5xl md:text-7xl font-bold tracking-tight"
            >
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
                Your AI Team,
              </span>
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                Always Ready
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p 
              variants={fadeInUp}
              className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto"
            >
              Specialized AI agents for research, coding, analysis, and more. 
              Get expert help instantly, 24/7.
            </motion.p>

            {/* CTA Section */}
            <motion.div 
              variants={fadeInUp}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8"
            >
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
                onClick={() => setIsVideoPlaying(true)}
                className="group px-8 py-6 text-lg font-semibold border-2"
              >
                <Play className="mr-2 w-5 h-5" />
                Watch Demo
              </Button>
            </motion.div>

            {/* Trust indicators */}
            <motion.div 
              variants={fadeInUp}
              className="flex flex-wrap justify-center items-center gap-8 pt-12"
            >
              {STATS.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl font-bold text-slate-900 dark:text-white">
                    {stat.value}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <ChevronRight className="w-6 h-6 text-slate-400 rotate-90" />
        </motion.div>
      </motion.section>

      {/* Features Section */}
      <section className="py-24 px-4 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2 
              variants={fadeInUp}
              className="text-4xl md:text-5xl font-bold mb-4"
            >
              Built for Modern Teams
            </motion.h2>
            <motion.p 
              variants={fadeInUp}
              className="text-xl text-slate-600 dark:text-slate-400"
            >
              Everything you need to supercharge your productivity
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {FEATURES.map((feature, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card className="p-6 h-full hover:shadow-xl transition-shadow duration-300 border-slate-200 dark:border-slate-800">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    {feature.description}
                  </p>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Agent Showcase Section */}
      <section id="agent-selector" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2 
              variants={fadeInUp}
              className="text-4xl md:text-5xl font-bold mb-4"
            >
              Meet Your AI Agents
            </motion.h2>
            <motion.p 
              variants={fadeInUp}
              className="text-xl text-slate-600 dark:text-slate-400"
            >
              Specialized experts ready to assist with any task
            </motion.p>
          </motion.div>

          {/* Interactive Agent Selector */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="max-w-4xl mx-auto"
          >
            <Card className="p-8 shadow-2xl border-slate-200 dark:border-slate-800">
              <div className="space-y-6">
                {/* Agent Grid */}
                <div className="grid md:grid-cols-3 gap-4">
                  {featuredAgents.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => setSelectedAgentId(agent.id)}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                        selectedAgentId === agent.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        {agent.agent.avatar ? (
                          <img
                            src={agent.agent.avatar}
                            alt={agent.agent.name}
                            className="w-10 h-10 rounded-full"
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
                      <p className="text-sm text-left text-slate-600 dark:text-slate-400">
                        {agent.agent.description?.substring(0, 60)}...
                      </p>
                    </button>
                  ))}
                </div>

                {/* Input Area */}
                <div className="space-y-4">
                  <textarea
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="What would you like help with today?"
                    className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 resize-none h-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  
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
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 px-4 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2 
              variants={fadeInUp}
              className="text-4xl md:text-5xl font-bold mb-4"
            >
              Loved by Teams Worldwide
            </motion.h2>
            <motion.p 
              variants={fadeInUp}
              className="text-xl text-slate-600 dark:text-slate-400"
            >
              See what our users have to say
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-6"
          >
            {TESTIMONIALS.map((testimonial, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card className="p-6 h-full hover:shadow-xl transition-shadow duration-300">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 mb-6">
                    "{testimonial.content}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600" />
                    <div>
                      <div className="font-semibold text-sm">{testimonial.name}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-br from-blue-600 to-purple-600 dark:from-blue-800 dark:to-purple-800">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-4xl mx-auto text-center text-white"
        >
          <motion.h2 
            variants={fadeInUp}
            className="text-4xl md:text-5xl font-bold mb-4"
          >
            Ready to Transform Your Workflow?
          </motion.h2>
          <motion.p 
            variants={fadeInUp}
            className="text-xl mb-8 text-white/90"
          >
            Join thousands of teams already using AI to work smarter
          </motion.p>
          <motion.div variants={fadeInUp}>
            <Button
              size="lg"
              onClick={() => document.getElementById('agent-selector')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-white text-blue-600 hover:bg-slate-100 px-8 py-6 text-lg font-semibold shadow-xl"
            >
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>
        </motion.div>
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
      <AnimatePresence>
        {isVideoPlaying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setIsVideoPlaying(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white dark:bg-slate-900 rounded-xl p-2 max-w-4xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="aspect-video bg-slate-200 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                <p className="text-slate-600 dark:text-slate-400">Demo video placeholder</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default LandingPageV2;