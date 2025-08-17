import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, 
  Zap, 
  Shield, 
  Globe,
  Code2,
  FileSearch,
  Database,
  Sparkles,
  Lock,
  Rocket,
  Users,
  BarChart3
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Feature {
  icon: any;
  title: string;
  description: string;
  gradient: string;
  stats?: string;
  badge?: string;
}

const FEATURES: Feature[] = [
  {
    icon: Brain,
    title: "Intelligent Context",
    description: "AI that understands your project context and remembers previous conversations",
    gradient: "from-purple-500 to-pink-500",
    stats: "10x faster",
    badge: "Most Popular"
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Optimized infrastructure delivers responses in milliseconds, not seconds",
    gradient: "from-blue-500 to-cyan-500",
    stats: "50ms avg"
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "SOC 2 compliant with end-to-end encryption and zero data retention",
    gradient: "from-green-500 to-emerald-500",
    stats: "100% secure"
  },
  {
    icon: Globe,
    title: "Always Available",
    description: "Global infrastructure ensures 99.9% uptime with automatic failover",
    gradient: "from-orange-500 to-red-500",
    stats: "99.9% uptime"
  },
  {
    icon: Code2,
    title: "Code Intelligence",
    description: "Understands 50+ programming languages with syntax highlighting and debugging",
    gradient: "from-indigo-500 to-purple-500",
    stats: "50+ languages"
  },
  {
    icon: Database,
    title: "Data Analysis",
    description: "Process and visualize complex datasets with natural language queries",
    gradient: "from-teal-500 to-blue-500",
    stats: "1TB+ processed"
  }
];

export function FeaturesGrid() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <section className="py-24 px-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge className="mb-4 px-4 py-1.5" variant="outline">
            <Sparkles className="w-3 h-3 mr-1" />
            Why Teams Choose Us
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Built for the Future of Work
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Every feature is designed to help you work smarter, not harder
          </p>
        </motion.div>

        {/* Features grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {FEATURES.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="relative group"
            >
              <Card className="relative h-full p-8 overflow-hidden border-slate-200/50 dark:border-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 hover:shadow-2xl">
                {/* Background gradient on hover */}
                <div 
                  className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
                />

                {/* Badge if featured */}
                {feature.badge && (
                  <Badge className="absolute top-4 right-4 text-xs" variant="secondary">
                    {feature.badge}
                  </Badge>
                )}

                {/* Icon container */}
                <div className="relative mb-6">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} p-0.5`}>
                    <div className="w-full h-full rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center">
                      <feature.icon className={`w-7 h-7 bg-gradient-to-br ${feature.gradient} bg-clip-text text-transparent`} />
                    </div>
                  </div>
                  
                  {/* Animated ring on hover */}
                  <motion.div
                    animate={hoveredIndex === index ? { scale: 1.5, opacity: 0 } : { scale: 1, opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className={`absolute inset-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient}`}
                  />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                  {feature.description}
                </p>

                {/* Stats */}
                {feature.stats && (
                  <div className="flex items-center gap-2 text-sm">
                    <BarChart3 className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {feature.stats}
                    </span>
                  </div>
                )}

                {/* Hover effect line */}
                <motion.div
                  className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.gradient}`}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: hoveredIndex === index ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ transformOrigin: 'left' }}
                />
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-8 p-6 rounded-2xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-200/50 dark:border-blue-800/50">
            <div className="text-left">
              <h4 className="font-semibold text-lg mb-1">Ready to experience the difference?</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Join thousands of teams already working smarter with AI
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-shadow"
            >
              Get Started Free
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}