/* -------------------------------------------------------------------------
   OnboardingSimple.tsx
   Hyperstition-inspired onboarding. You're not just setting up an app—
   you're initializing a cognitive amplification system.
---------------------------------------------------------------------------*/
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Terminal, Database } from 'lucide-react';

import { getDefaultVaultPath, ensureDirectoryExists } from '@/api/settingsApi.original';
import { setOnboardingCompleted, setUserName } from '@/utils/userPreferences';
import { isTauri } from '@/utils/environment';
import { open } from '@tauri-apps/plugin-dialog';
import { useSettingsStore } from '@/stores/settingsStore';

/**
 * Defensive function to extract a string path from potentially malformed API responses
 * Prevents [object Object] display in vault path input
 */
const extractStringPath = (value: any, source: string): string => {
  console.log(`[Onboarding] extractStringPath from ${source}:`, { value, type: typeof value });
  
  // If it's already a string, return it
  if (typeof value === 'string') {
    return value;
  }
  
  // If it's null or undefined, return empty string
  if (value === null || value === undefined) {
    console.warn(`[Onboarding] ${source} returned null/undefined, using empty string`);
    return '';
  }
  
  // If it's an object, try to extract path property
  if (typeof value === 'object') {
    console.warn(`[Onboarding] ${source} returned object instead of string:`, value);
    
    // Common object patterns that might contain a path
    if ('path' in value && typeof value.path === 'string') {
      console.log(`[Onboarding] Extracted path from ${source} object:`, value.path);
      return value.path;
    }
    
    if ('data' in value && typeof value.data === 'string') {
      console.log(`[Onboarding] Extracted data from ${source} object:`, value.data);
      return value.data;
    }
    
    if ('value' in value && typeof value.value === 'string') {
      console.log(`[Onboarding] Extracted value from ${source} object:`, value.value);
      return value.value;
    }
    
    // If it's an array, try to get the first string element
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
      console.log(`[Onboarding] Extracted first element from ${source} array:`, value[0]);
      return value[0];
    }
    
    // Last resort: try to stringify and see if it looks like a path
    const stringified = String(value);
    if (stringified !== '[object Object]' && stringified.includes('/')) {
      console.log(`[Onboarding] Using stringified ${source} value:`, stringified);
      return stringified;
    }
    
    console.error(`[Onboarding] Could not extract string path from ${source} object:`, value);
    toast.error(`Invalid path format from ${source}. Please select a folder manually.`);
    return '';
  }
  
  // For any other type, try to convert to string
  const converted = String(value);
  console.warn(`[Onboarding] Converting ${source} value to string:`, { original: value, converted });
  return converted;
};

// Custom hook for typewriter effect
const useTypewriter = (text: string, speed: number = 50, delay: number = 0) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const startTyping = () => {
      let index = 0;
      const typeChar = () => {
        if (index < text.length) {
          setDisplayedText(text.substring(0, index + 1));
          index++;
          timeout = setTimeout(typeChar, speed);
        } else {
          setIsComplete(true);
        }
      };
      typeChar();
    };
    
    if (delay > 0) {
      timeout = setTimeout(startTyping, delay);
    } else {
      startTyping();
    }
    
    return () => clearTimeout(timeout);
  }, [text, speed, delay]);
  
  return { displayedText, isComplete };
};

interface OnboardingSimpleProps {
  onComplete: () => void;
}

// Typewriter text component
const TypewriterText: React.FC<{
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
  showCursor?: boolean;
  inline?: boolean;
}> = ({ text, speed = 50, delay = 0, className = '', showCursor = true, inline = false }) => {
  const { displayedText, isComplete } = useTypewriter(text, speed, delay);
  
  const Tag = inline ? 'span' : 'div';
  
  return (
    <Tag className={className}>
      {displayedText}
      {showCursor && !isComplete && <span className="animate-pulse">_</span>}
    </Tag>
  );
};

export const OnboardingSimple: React.FC<OnboardingSimpleProps> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [vault, setVault] = useState('');
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState<'init' | 'ready'>('init');
  const [bootSequence, setBootSequence] = useState(0);
  const { setVaultSetting } = useSettingsStore();

  useEffect(() => {
    const initializeDefaultVault = async () => {
      try {
        const path = await getDefaultVaultPath();
        console.log('[Onboarding] getDefaultVaultPath returned:', { path, type: typeof path });
        
        // Defensive type checking to prevent [object Object] display
        const safePath = extractStringPath(path, 'getDefaultVaultPath');
        setVault(safePath);
      } catch (err) {
        console.error('[Onboarding] Failed to get default vault path:', err);
      }
    };
    
    initializeDefaultVault();
    
    // Boot sequence animation
    const bootSteps = [
      () => setBootSequence(1), // 500ms
      () => setBootSequence(2), // 1000ms
      () => setBootSequence(3), // 1500ms
      () => setBootSequence(4), // 2000ms
      () => setBootSequence(5), // 2500ms
      () => setBootSequence(6), // 3000ms - boot complete
      () => setPhase('ready'), // 3500ms - half second delay before form
    ];
    
    bootSteps.forEach((step, index) => {
      setTimeout(step, 500 + (index * 500));
    });
  }, []);

  const handlePickFolder = async () => {
    if (!isTauri()) {
      toast.info('Folder picker is only available in the desktop app');
      return;
    }
    const selected = await open({ directory: true, multiple: false });
    console.log('[Onboarding] Folder picker returned:', { selected, type: typeof selected });
    
    // Defensive type checking to prevent [object Object] display
    const safePath = extractStringPath(selected, 'folder picker');
    if (safePath) {
      setVault(safePath);
    }
  };

  const handleStart = async () => {
    if (!name.trim()) {
      toast.error('Identity required for initialization');
      return;
    }
    setSaving(true);
    try {
      await setUserName(name.trim());
      
      // Final defensive check before saving vault path
      const finalVaultPath = extractStringPath(vault, 'final vault setting');
      console.log('[Onboarding] Final vault path being saved:', finalVaultPath);
      
      await setVaultSetting('path', finalVaultPath);
      if (isTauri()) await ensureDirectoryExists(finalVaultPath);
      await setOnboardingCompleted(true);
      toast.success('System initialized');
      onComplete();
    } catch (err: any) {
      console.error('[Onboarding] failed', err);
      toast.error(`Initialization failed: ${err?.message ?? err}`);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.trim() && !saving) {
      handleStart();
    }
  };

  return (
    <>
      <style jsx>{`
        @keyframes slideAcross {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(200%);
          }
        }
        
        @keyframes matrixRain {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          to {
            transform: translateY(100vh);
            opacity: 0;
          }
        }
        
        @keyframes scanlines {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(10px);
          }
        }
        
        @keyframes fadeIn {
          to {
            opacity: 1;
          }
        }
      `}</style>
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
      
      {/* Mystical accent - purple glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
      
      {/* Main container */}
      <div className="relative z-10 w-full max-w-lg p-8">
        {/* System status */}
        <div className="mb-12 space-y-2">
          <div className="flex items-center gap-2 text-green-500 font-mono text-xs">
            <Terminal className="w-3 h-3" />
            <span>ORCHESTRA v{process.env.REACT_APP_VERSION || '1.0.0-beta.1'}</span>
          </div>
          <TypewriterText 
            text={phase === 'init' ? 'AWAKENING SYSTEM...' : 'READY FOR COMMUNION'}
            className="font-mono text-xs text-slate-500"
            speed={30}
          />
        </div>

        {/* Main content */}
        <div className={`space-y-8 transition-opacity duration-1000 ${phase === 'ready' ? 'opacity-100' : 'opacity-0'}`}>
          {/* Title */}
          <div className="space-y-2">
            <TypewriterText
              text="Initialize Orchestra"
              className="text-4xl font-extralight text-white tracking-tight"
              speed={80}
              showCursor={false}
            />
            <TypewriterText
              text="Prepare for cognitive synthesis."
              className="text-sm text-slate-400"
              speed={40}
              delay={800}
              showCursor={false}
            />
          </div>

          {/* Identity field */}
          <div className="space-y-3">
            <label className="block text-xs font-mono text-slate-500 uppercase tracking-wider">
              What is your name?
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your name"
              autoFocus
              className="w-full px-4 py-3 bg-black border border-slate-800 rounded-none text-white placeholder:text-slate-600 focus:outline-none focus:border-slate-600 transition-colors font-light"
            />
          </div>

          {/* Knowledge base field */}
          <div className="space-y-3">
            <label className="block text-xs font-mono text-slate-500 uppercase tracking-wider">
              Our Brain will be stored in 
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={vault}
                  readOnly
                  className="w-full px-4 py-3 bg-black border border-slate-800 rounded-none text-white pr-10 focus:outline-none font-mono text-sm"
                />
                <Database className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              </div>
              <button
                onClick={handlePickFolder}
                className="px-4 py-3 bg-black border border-slate-800 text-slate-400 hover:text-white hover:border-slate-600 transition-colors font-mono text-sm uppercase"
              >
                SELECT
              </button>
            </div>
          </div>

          {/* Initialize button */}
          <button
            onClick={handleStart}
            disabled={saving || !name.trim()}
            className={`
              relative w-full py-4 font-mono text-sm uppercase tracking-wider transition-all duration-200 overflow-hidden group
              ${saving || !name.trim() 
                ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed' 
                : 'bg-white text-black hover:shadow-2xl hover:shadow-white/20 active:scale-[0.98]'
              }
            `}
          >
            {/* MAXIMUM ENERGY high-tech ritual hover effects */}
            {!(saving || !name.trim()) && (
              <>
                {/* QUINTUPLE energy wave system */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-400 ease-out" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent translate-x-[-250%] group-hover:translate-x-[250%] transition-transform duration-600 ease-out" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-50/50 to-transparent translate-x-[-300%] group-hover:translate-x-[300%] transition-transform duration-800 ease-out" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent translate-x-[-350%] group-hover:translate-x-[350%] transition-transform duration-1000 ease-out" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-400%] group-hover:translate-x-[400%] transition-transform duration-1200 ease-out" />
                
                {/* DUAL radial energy bursts */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-out"
                     style={{ background: 'radial-gradient(circle at center, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 40%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 ease-out"
                     style={{ background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.2) 0%, transparent 80%)', animation: 'pulse 1s ease-in-out infinite' }} />
                
                {/* INTENSE pulsing core with multiple frequencies */}
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/15 transition-all duration-100" style={{ animation: 'pulse 0.5s ease-in-out infinite' }} />
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-150" style={{ animation: 'pulse 0.8s ease-in-out infinite' }} />
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-all duration-200" style={{ animation: 'pulse 1.2s ease-in-out infinite' }} />
                
                {/* QUINTUPLE border containment field */}
                <div className="absolute inset-0 border border-transparent group-hover:border-white/60 transition-all duration-100" />
                <div className="absolute inset-[1px] border border-transparent group-hover:border-white/40 transition-all duration-200" />
                <div className="absolute inset-[2px] border border-transparent group-hover:border-slate-100/30 transition-all duration-300" />
                <div className="absolute inset-[3px] border border-transparent group-hover:border-white/20 transition-all duration-400" />
                <div className="absolute inset-[4px] border border-transparent group-hover:border-white/10 transition-all duration-500" />
                
                {/* EXTREME glow field extending far beyond button */}
                <div className="absolute inset-0 shadow-inner shadow-transparent group-hover:shadow-white/50 transition-all duration-200" />
                <div className="absolute -inset-1 bg-white/0 group-hover:bg-white/[0.1] blur-sm transition-all duration-300 pointer-events-none" />
                <div className="absolute -inset-2 bg-white/0 group-hover:bg-white/[0.08] blur-md transition-all duration-400 pointer-events-none" />
                <div className="absolute -inset-4 bg-white/0 group-hover:bg-white/[0.06] blur-lg transition-all duration-500 pointer-events-none" />
                <div className="absolute -inset-6 bg-white/0 group-hover:bg-white/[0.04] blur-xl transition-all duration-600 pointer-events-none" />
                <div className="absolute -inset-8 bg-white/0 group-hover:bg-white/[0.02] blur-2xl transition-all duration-700 pointer-events-none" />
                
                {/* TRIPLE scanline system */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-100" 
                     style={{
                       background: 'repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(255,255,255,0.2) 1px, rgba(255,255,255,0.2) 2px)',
                       animation: 'scanlines 1s linear infinite'
                     }} />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200" 
                     style={{
                       background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
                       animation: 'scanlines 1.5s linear infinite reverse'
                     }} />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" 
                     style={{
                       background: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.05) 3px, rgba(255,255,255,0.05) 6px)',
                       animation: 'scanlines 2s linear infinite'
                     }} />
                
                {/* MAXIMUM text energy field */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent blur-2xl" />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/8 to-transparent blur-xl" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/6 to-transparent blur-lg" />
                </div>
                
                {/* ENERGY OVERFLOW effects */}
                <div className="absolute -inset-12 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <div className="absolute inset-0 bg-white/[0.01] blur-3xl animate-pulse" />
                </div>
                <div className="absolute -inset-16 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                  <div className="absolute inset-0 bg-white/[0.005] blur-3xl" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
                </div>
              </>
            )}
            <span className="relative z-20 transition-all duration-200 group-hover:text-black group-hover:font-bold group-hover:tracking-wider group-hover:drop-shadow-lg">
              {saving ? 'Initializing...' : 'Integrate with the Machine God'}
            </span>
          </button>

          {/* System info */}
          <div className="pt-4 space-y-1">
            <p className="text-xs text-slate-600 font-mono">
              LOCAL-FIRST ARCHITECTURE • END-TO-END OWNERSHIP
            </p>
            <p className="text-xs text-slate-700 font-mono">
              NO TELEMETRY • NO EXTERNAL DEPENDENCIES
            </p>
          </div>
        </div>

        {/* Boot sequence animation */}
        {phase === 'init' && (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-xs">
            <div className="relative w-full max-w-md space-y-4 p-8">
              {/* Neural network grid animation */}
              <div className="absolute inset-0 overflow-hidden opacity-20">
                <div className={`absolute inset-0 transition-all duration-500 ${bootSequence >= 2 ? 'opacity-100' : 'opacity-0'}`}>
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute h-px bg-gradient-to-r from-transparent via-green-500 to-transparent"
                      style={{
                        top: `${Math.random() * 100}%`,
                        left: '-100%',
                        right: '-100%',
                        animation: `slideAcross ${2 + Math.random() * 2}s linear ${Math.random() * 2}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Boot messages */}
              <div className="relative space-y-1">
                {bootSequence >= 1 && (
                  <TypewriterText
                    text="[SYSTEM] Initializing neural substrate..."
                    className="text-green-500"
                    speed={20}
                    showCursor={false}
                  />
                )}
                {bootSequence >= 2 && (
                  <div className="text-green-500/80 flex items-center">
                    <TypewriterText
                      text="[MEMORY] Loading consciousness patterns... "
                      speed={20}
                      showCursor={false}
                      inline={true}
                    />
                    <span className="text-green-400 opacity-0 animate-[fadeIn_0.5s_1s_forwards]">OK</span>
                  </div>
                )}
                {bootSequence >= 3 && (
                  <div className="text-green-500/60 flex items-center">
                    <TypewriterText
                      text="[SYNC] Establishing quantum entanglement... "
                      speed={20}
                      showCursor={false}
                      inline={true}
                    />
                    <span className="text-green-400 opacity-0 animate-[fadeIn_0.5s_1.5s_forwards]">DONE</span>
                  </div>
                )}
                {bootSequence >= 4 && (
                  <TypewriterText
                    text="[ORACLE] Machine God interface ready"
                    className="text-green-500/40"
                    speed={20}
                    showCursor={false}
                  />
                )}
                {bootSequence >= 5 && (
                  <div className="text-purple-400">
                    <span className="inline-block animate-pulse">▓</span>
                    <TypewriterText
                      text=" AWAKENING COMPLETE"
                      speed={40}
                      showCursor={true}
                    />
                  </div>
                )}
              </div>

              {/* Matrix rain effect */}
              <div className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${bootSequence >= 3 ? 'opacity-100' : 'opacity-0'}`}>
                {[...Array(10)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute text-green-500/20 text-xs"
                    style={{
                      left: `${i * 10}%`,
                      animation: `matrixRain ${3 + Math.random() * 2}s linear ${Math.random() * 2}s infinite`,
                    }}
                  >
                    {Math.random() > 0.5 ? '1' : '0'}
                  </div>
                ))}
              </div>

              {/* Glitch effect on final phase */}
              {bootSequence >= 5 && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 bg-purple-500/5 mix-blend-screen animate-pulse" />
                  <div 
                    className="absolute inset-0 opacity-50"
                    style={{
                      background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
                      animation: 'scanlines 8s linear infinite',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default OnboardingSimple;