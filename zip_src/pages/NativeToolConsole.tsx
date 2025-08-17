import React, { useState } from 'react';
import { useNativeTools } from '../hooks/useNativeTools';
import { useOrchestrator } from '../hooks/useLocalToolOrchestrator';
import { presets, type ToolPreset } from '../devtool-presets/nativeToolPresets';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Play, AlertCircle, ChevronDown, ChevronUp, Terminal, Sparkles } from 'lucide-react';

export default function NativeToolConsole() {
  const { tools, loading, error, executeTool } = useNativeTools();
  const { executeToolCall, isNativeTool, getAllTools, getToolSource } = useOrchestrator();
  const [executing, setExecuting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [executionTimes, setExecutionTimes] = useState<Record<string, number>>({});

  const availableTools = new Set(tools.map(t => t.name));

  const runPreset = async (preset: ToolPreset) => {
    setExecuting(preset.label);
    setResults(prev => ({ ...prev, [preset.label]: null }));
    setErrors(prev => ({ ...prev, [preset.label]: '' }));
    setExecutionTimes(prev => ({ ...prev, [preset.label]: 0 }));

    try {
      if (!availableTools.has(preset.tool)) {
        throw new Error(`Tool "${preset.tool}" not available in backend`);
      }

      // Use the orchestrator for intelligent routing
      const result = await executeToolCall(preset.tool, preset.input);
      
      if (result.success) {
        setResults(prev => ({ ...prev, [preset.label]: result.data }));
        setExecutionTimes(prev => ({ ...prev, [preset.label]: result.executionTime || 0 }));
      } else {
        setErrors(prev => ({ ...prev, [preset.label]: result.error || 'Unknown error' }));
      }
    } catch (e) {
      setErrors(prev => ({ ...prev, [preset.label]: (e as Error).message }));
    } finally {
      setExecuting(null);
    }
  };

  if (loading) {
    return (
      <div className="orchestra-page min-h-screen bg-black flex items-center justify-center">
        <div className="fixed inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-black to-slate-950" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-float-reverse" />
        </div>
        
        <motion.div 
          className="relative z-10 flex flex-col items-center space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center space-x-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="h-6 w-6 text-white/60" />
            </motion.div>
            <span className="text-white/60 text-sm tracking-wide">Initializing native tools...</span>
          </div>
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-1 h-1 rounded-full bg-blue-400/60"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.15
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="orchestra-page min-h-screen bg-black flex items-center justify-center p-4">
        <div className="fixed inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-black to-slate-950" />
        </div>
        
        <motion.div 
          className="relative z-10 w-full max-w-md"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
            <div className="relative z-10 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-white/90 font-medium">Connection Failed</h3>
                  <p className="text-white/50 text-sm">Unable to reach native tools</p>
                </div>
              </div>
              <div className="text-sm text-white/60 bg-white/[0.02] rounded-lg p-3 border border-white/5">
                {error.message}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="orchestra-page min-h-screen bg-black">
      {/* Background layers */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-black to-slate-950" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-float-reverse" />
      </div>

      <div className="relative z-10 container mx-auto px-6 py-12 max-w-7xl">
        {/* Header */}
        <motion.div 
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-white/[0.05] backdrop-blur-xl border border-white/10 flex items-center justify-center">
              <Terminal className="w-6 h-6 text-white/60" />
            </div>
            <div>
              <h1 className="text-display text-3xl font-light text-white/90 tracking-tight">
                Native Tool Console
              </h1>
              <p className="text-white/50 text-sm mt-1">
                Auto-discover and test native Rust tools with ceremonial precision
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Available Tools */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
              <div className="relative z-10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-white/90">Available Tools</h3>
                    <p className="text-sm text-white/50">{tools.length} tools discovered</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white/40" />
                  </div>
                </div>
                
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {tools.map((tool, index) => (
                    <motion.div
                      key={tool.name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="group relative bg-white/[0.02] hover:bg-white/[0.05] rounded-lg p-3 transition-all duration-200 border border-white/5 hover:border-white/10"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <code className="text-sm text-white/80 font-mono">{tool.name}</code>
                          {isNativeTool(tool.name) && (
                            <span className="text-xs px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded-full border border-orange-500/20">
                              🦀 Rust
                            </span>
                          )}
                        </div>
                        <div className={`w-2 h-2 rounded-full ${availableTools.has(tool.name) ? 'bg-emerald-400/60' : 'bg-red-400/60'}`} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Presets */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
              <div className="relative z-10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-white/90">Presets</h3>
                    <p className="text-sm text-white/50">Ceremonial test configurations</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center">
                    <Play className="w-4 h-4 text-white/40" />
                  </div>
                </div>
                
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {presets.map((preset, index) => (
                    <motion.div
                      key={preset.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="group relative"
                    >
                      <div className="relative bg-white/[0.02] hover:bg-white/[0.05] rounded-lg p-4 transition-all duration-200 border border-white/5 hover:border-white/10">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-medium text-white/90 text-sm">{preset.label}</p>
                            {preset.description && (
                              <p className="text-white/50 text-xs mt-0.5">{preset.description}</p>
                            )}
                          </div>
                          <button
                            onClick={() => runPreset(preset)}
                            disabled={executing === preset.label || !availableTools.has(preset.tool)}
                            className="group/btn relative ml-3 w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {executing === preset.label ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              >
                                <Loader2 className="w-3 h-3 text-white/60" />
                              </motion.div>
                            ) : (
                              <Play className="w-3 h-3 text-white/60 group-hover/btn:text-white/80" />
                            )}
                          </button>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-white/40">
                          <code className="font-mono">{preset.tool}</code>
                          {isNativeTool(preset.tool) && (
                            <span className="text-xs px-1.5 py-0.5 bg-orange-500/10 text-orange-400 rounded-full border border-orange-500/20">
                              🦀
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Results */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-1"
          >
            <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
              <div className="relative z-10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-white/90">Results</h3>
                    <p className="text-sm text-white/50">Execution outcomes</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-white/40" />
                  </div>
                </div>
                
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  <AnimatePresence>
                    {presets.map(preset => {
                      const result = results[preset.label];
                      const error = errors[preset.label];
                      
                      if (!result && !error) return null;
                      
                      return (
                        <motion.div
                          key={preset.label}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="relative bg-white/[0.02] rounded-lg p-3 border border-white/5"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-white/80">{preset.label}</span>
                            <div className="flex items-center gap-2">
                              {executionTimes[preset.label] && (
                                <span className="text-xs text-white/50">{executionTimes[preset.label]}ms</span>
                              )}
                              <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-400/60' : 'bg-emerald-400/60'}`} />
                            </div>
                          </div>
                          
                          {error ? (
                            <div className="text-xs text-red-400 bg-red-500/5 rounded p-2 border border-red-500/10">
                              {error}
                            </div>
                          ) : (
                            <pre className="text-xs text-white/60 bg-white/[0.02] rounded p-2 border border-white/5 overflow-x-auto max-h-32">
                              {JSON.stringify(result, null, 2)}
                            </pre>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  
                  {Object.keys(results).length === 0 && Object.keys(errors).length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-white/[0.05] flex items-center justify-center mx-auto mb-4">
                        <Terminal className="w-8 h-8 text-white/20" />
                      </div>
                      <p className="text-white/50 text-sm">Execute a preset to see results</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Raw JSON Input Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12"
        >
          <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
            <div className="relative z-10 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-white/90">Manual Invocation</h3>
                  <p className="text-sm text-white/50">Direct tool execution with custom parameters</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center">
                  <Terminal className="w-4 h-4 text-white/40" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-white/70 mb-2 block">Tool Name</label>
                  <select 
                    className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-white/80 text-sm focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all duration-200"
                    defaultValue=""
                  >
                    <option value="" className="bg-black text-white/80">Select tool...</option>
                    {tools.map(tool => (
                      <option key={tool.name} value={tool.name} className="bg-black text-white/80">
                        {tool.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-white/70 mb-2 block">Input JSON</label>
                  <textarea 
                    className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-white/80 text-sm font-mono focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all duration-200 resize-none"
                    rows={3}
                    placeholder='{"path": "/some/path", "recursive": true}'
                  />
                </div>
              </div>
              <button className="mt-6 px-6 py-2.5 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 rounded-lg text-white/80 text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                Execute (Coming Soon)
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        
        @keyframes float-reverse {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-30px, 30px) scale(1.1); }
          66% { transform: translate(20px, -20px) scale(0.9); }
        }
        
        .animate-float {
          animation: float 20s ease-in-out infinite;
        }
        
        .animate-float-reverse {
          animation: float-reverse 25s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}