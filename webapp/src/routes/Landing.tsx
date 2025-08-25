// webapp/src/routes/Landing.tsx
import { useAuth } from "@/auth/AuthContext";
import { GoogleLoginButton } from "@/auth/GoogleLoginButton";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { supabase } from "@/auth/SupabaseClient";
import { acsGithubApi } from "@/services/acsGitHubApi";
import { motion, AnimatePresence } from "framer-motion";
import { useGlobalMouseTracking } from "@/hooks/useGlobalMouseTracking";

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const chatShellRef = useGlobalMouseTracking<HTMLDivElement>({
    computeDistance: true,
    distanceMode: 'rect',
    maxDistance: 400, // Reduced for more responsive awakening
  });

  // ACS client
  const DEFAULT_ACS = (
    import.meta.env?.VITE_ACS_BASE_URL || "https://orchestra-acs-web.fly.dev"
  ).replace(/\/$/, "");
  const [acsBase] = useState(DEFAULT_ACS);
  const api = useMemo(() => acsGithubApi({ baseUrl: acsBase }), [acsBase]);

  // UI state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [githubConnecting, setGithubConnecting] = useState(false);
  const [waitingForInstall, setWaitingForInstall] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [githubConnected, setGithubConnected] = useState(false);

  // Chat state
  const [chatInput, setChatInput] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  
  // Typewriter effect
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [placeholder, setPlaceholder] = useState("");
  
  const examplePrompts = [
    "Fix the OAuth redirect loop happening on Safari",
    "Dark mode toggle doesn't persist after page refresh",
    "Optimize the LCP score on our landing page",
    "Add proper error boundaries to prevent white screen crashes",
  ];

  const isLoading = githubConnecting || waitingForInstall;

  // If user is authenticated, redirect away from Landing to Dashboard
  useEffect(() => {
    if (isAuthenticated) {
      // Use replace to avoid back navigation returning to landing
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Typewriter effect logic - 2x speed
  useEffect(() => {
    const currentPrompt = examplePrompts[currentPromptIndex];
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        // Typing
        if (currentText.length < currentPrompt.length) {
          setCurrentText(currentPrompt.substring(0, currentText.length + 1));
        } else {
          // Pause before deleting
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        // Deleting
        if (currentText.length > 0) {
          setCurrentText(currentText.substring(0, currentText.length - 1));
        } else {
          // Move to next prompt
          setIsDeleting(false);
          setCurrentPromptIndex((currentPromptIndex + 1) % examplePrompts.length);
        }
      }
    }, isDeleting ? 25 : 50); // 2x speed: 50ms -> 25ms for typing, 100ms -> 50ms for deleting

    return () => clearTimeout(timeout);
  }, [currentText, isDeleting, currentPromptIndex, examplePrompts]);

  // Update placeholder with quotes
  useEffect(() => {
    if (currentText) {
      setPlaceholder(`"${currentText}"`);
    } else {
      setPlaceholder("Describe what's broken in your app...");
    }
  }, [currentText]);

  // Check GitHub connection status on mount
  useEffect(() => {
    const checkGitHub = async () => {
      if (!isAuthenticated) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const auth = session?.access_token ? `Bearer ${session.access_token}` : undefined;
        const res = await api.listRepos(auth);
        if (res.ok && res.data.repositories?.length > 0) {
          setGithubConnected(true);
        }
      } catch {
        // Silent fail
      }
    };
    checkGitHub();
  }, [isAuthenticated, api]);

  const handleConnectGitHub = useCallback(async () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    setGithubConnecting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const auth = session?.access_token ? `Bearer ${session.access_token}` : undefined;
      const res = await api.installUrl(auth);

      if (!res.ok) {
        setError("Failed to connect GitHub. Please try again.");
        setGithubConnecting(false);
        return;
      }

      window.open(res.data.install_url, "_blank", "noopener,noreferrer");
      setWaitingForInstall(true);

      // Poll for completion
      let pollCount = 0;
      const maxPolls = 30;
      const pollInterval = setInterval(async () => {
        pollCount++;
        const checkRes = await api.listRepos(auth);
        if (checkRes.ok && checkRes.data.repositories?.length > 0) {
          clearInterval(pollInterval);
          setWaitingForInstall(false);
          setGithubConnecting(false);
          setGithubConnected(true);
          // If there's a prompt, navigate with it
          if (chatInput.trim()) {
            navigate(`/start-chat?prompt=${encodeURIComponent(chatInput.trim())}`, { replace: true });
          }
        } else if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          setWaitingForInstall(false);
          setGithubConnecting(false);
        }
      }, 1000);
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
      setGithubConnecting(false);
      setWaitingForInstall(false);
    }
  }, [isAuthenticated, api, navigate, chatInput]);

  // After auth, auto-trigger GitHub connection
  useEffect(() => {
    if (isAuthenticated && showAuthModal) {
      setShowAuthModal(false);
      handleConnectGitHub();
    }
  }, [isAuthenticated, showAuthModal, handleConnectGitHub]);

  const handleSendMessage = useCallback(async () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    // If GitHub is connected, go straight to StartChat
    if (githubConnected) {
      navigate(`/start-chat?prompt=${encodeURIComponent(trimmed)}`, { replace: false });
      return;
    }

    // Otherwise, trigger connection flow
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    handleConnectGitHub();
  }, [chatInput, githubConnected, isAuthenticated, navigate, handleConnectGitHub]);

  // Auto-resize textarea
  useEffect(() => {
    if (chatInputRef.current) {
      chatInputRef.current.style.height = 'auto';
      chatInputRef.current.style.height = `${Math.min(chatInputRef.current.scrollHeight, 200)}px`;
    }
  }, [chatInput]);

  return (
    <main className="min-h-screen relative orchestra-page bg-black overflow-x-hidden">
      {/* Background layers - Liquid glass aesthetic */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-black to-black" />
        
        {/* Floating orbs - larger and more dramatic */}
        <motion.div 
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full"
          style={{ 
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)",
            filter: "blur(100px)",
          }}
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <motion.div 
          className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full"
          style={{ 
            background: "radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, transparent 70%)",
            filter: "blur(100px)",
          }}
          animate={{
            x: [0, -100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Grid pattern overlay - subtle */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '100px 100px'
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Minimal header */}
        <header className="absolute top-0 left-0 right-0 p-6 md:p-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <span className="text-xl font-light text-white/90">Orchestra</span>

            {/* GitHub status badge - only show when connected */}
            <AnimatePresence>
              {githubConnected && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20"
                >
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm text-green-400">GitHub Connected</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Hero Section with ChatGPT Interface - CENTERED */}
        <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-20">
          <div className="w-full max-w-2xl">
            {/* Hero text */}
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-5xl md:text-7xl font-extralight text-white mb-6 leading-tight">
                Stop begging AI to
                <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent animate-gradient bg-[length:200%_200%]">
                  "please fix"
                </span>
              </h1>
              <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto">
                Describe what's broken. Orchestra's agents prepare a working PR in minutes, not hours of prompt engineering.
              </p>
            </motion.div>

            {/* ChatGPT-style interface - DEAD CENTER */}
            <motion.div 
              className="relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {/* Chat input container - ChatGPT exact style with reactive glow */}
              <div
                ref={chatShellRef}
                className={`chat-shell relative rounded-3xl bg-white/[0.03] backdrop-blur-xl border transition-all ${
                  inputFocused ? 'border-white/20 shadow-[0_0_40px_rgba(59,130,246,0.1)]' : 'border-white/10'
                }`}
                style={{
                  // @ts-ignore custom props
                  ['--px' as any]: '50%',
                  // @ts-ignore custom props
                  ['--py' as any]: '50%',
                  // Anchored (clamped) center defaults
                  // @ts-ignore custom props
                  ['--gpx' as any]: '50%',
                  // @ts-ignore custom props
                  ['--gpy' as any]: '50%',
                }}
              >
                {/* White emanation (distance-driven) */}
                <div className="white-emanation" aria-hidden="true" />
                {/* Reactive border glow, masked to the border thickness */}
                <div className="glow-border" aria-hidden="true" />
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                
                <div className="relative flex items-end gap-3 p-3">
                  {/* Textarea that grows */}
                  <textarea
                    ref={chatInputRef}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent text-white/90 placeholder-white/40 resize-none outline-none px-3 py-2 min-h-[44px] max-h-[200px] leading-relaxed"
                    style={{ height: '44px' }}
                    rows={1}
                  />
                  
                  {/* Send button - ChatGPT style */}
                  <button
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || isLoading}
                    className={`p-2.5 rounded-xl transition-all ${
                      chatInput.trim() && !isLoading
                        ? 'bg-white text-black hover:scale-105 active:scale-95' 
                        : 'bg-white/10 text-white/30 cursor-not-allowed'
                    }`}
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* GitHub integration button - INLINE with chat */}
                <div className="px-6 pb-4 flex items-center justify-between">
                  <p className="text-xs text-white/30">
                    {githubConnected 
                      ? "Press Enter to start fixing" 
                      : "Connect GitHub to unlock full agent capabilities"}
                  </p>
                  
                  {!githubConnected && !isLoading && (
                    <button
                      onClick={handleConnectGitHub}
                      className="group relative px-3 py-1.5 bg-white text-black rounded-lg text-xs font-medium transition-all hover:scale-105 active:scale-100"
                    >
                      {/* Gradient overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <span className="relative z-10 flex items-center gap-1.5">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        Connect GitHub
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Waiting state */}
              <AnimatePresence>
                {waitingForInstall && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-4 p-4 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10"
                  >
                    <p className="text-sm text-white/60">
                      Complete the GitHub installation in the new tab. We'll keep your message ready.
                    </p>
                    <button
                      onClick={() => navigate(`/start-chat${chatInput ? `?prompt=${encodeURIComponent(chatInput)}` : ""}`)}
                      className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
                    >
                      I've already installed it →
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error state */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20"
                  >
                    <p className="text-sm text-red-200">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Trust indicators */}
            <motion.div 
              className="mt-16 flex items-center justify-center gap-8 text-white/40 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                </div>
                <span>Live agents working</span>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>5 min average fix</span>
              </div>
            </motion.div>
          </div>
        </section>
      </div>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowAuthModal(false)}
            />
            <motion.div
              className="relative w-full max-w-sm"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
                <div className="relative z-10 p-8">
                  <button
                    onClick={() => setShowAuthModal(false)}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/[0.05] transition-colors"
                    aria-label="Close"
                  >
                    <svg className="w-4 h-4 text-white/40 hover:text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  <div className="w-12 h-12 mx-auto mb-6 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center">
                    <img src="/orchestra_logo.svg" alt="Orchestra logo" className="w-6 h-6 object-contain" />
                  </div>

                  <div className="text-center space-y-6">
                    <div className="space-y-2">
                      <h2 className="text-xl font-light text-white/90">Sign in to continue</h2>
                      <p className="text-sm text-white/60 leading-relaxed">
                        We'll keep your message ready while you sign in.
                      </p>
                    </div>
                    <GoogleLoginButton variant="default" className="w-full" />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          animation: gradient 4s ease infinite;
        }
        
        :root {
          --ease-swift: cubic-bezier(0.23, 1, 0.32, 1);
        }
        
        /* Dynamic glow border for chat shell */
        .chat-shell {
          position: relative;
        }
        
        /* White emanation layer: subtle but more present; no interior wash */
        .chat-shell .white-emanation {
          position: absolute;
          inset: -2px; /* slightly larger for softer feather */
          border-radius: 1.5rem;
          pointer-events: none;
          z-index: 0; /* behind the colorful border */

          /* Subtle but noticeable parameters */
          --white-glow-base-alpha: 0.03;
          --white-glow-active-alpha: 0.12;
          --white-glow-blur: 56px; /* soft and diffuse */
          --white-glow-spread: 0px;

          /* Intensity increases as cursor approaches (awakening) */
          --white-alpha: calc(var(--white-glow-base-alpha) + (var(--white-glow-active-alpha) - var(--white-glow-base-alpha)) * var(--p, 0));

          /* Soft outer glow only (avoid washing interior) */
          box-shadow: 0 0 var(--white-glow-blur) var(--white-glow-spread) rgba(255, 255, 255, var(--white-alpha));

          transition: box-shadow 240ms var(--ease-swift), opacity 240ms var(--ease-swift);
        }

        /* On hover, reduce white to let colorful border shine */
        .chat-shell:hover .white-emanation {
          opacity: 0.65; /* steps back but still present */
        }

        /* Focus - Minimal white, maximum border clarity */
        .chat-shell:focus-within .white-emanation {
          opacity: 0.4;
        }
        
        .chat-shell .glow-border {
          position: absolute;
          inset: 0;
          z-index: 1; /* above white emanation */
          border-radius: 1.5rem; /* match rounded-3xl */
          pointer-events: none;
          padding: 2px; /* glow thickness */

          /* Proximity (awakening) */
          --p: var(--p, 0);
          --border-base-opacity: calc(0.4 + 0.5 * var(--p));

          /* Enhanced colors that scale with proximity */
          --color-primary: rgba(0, 119, 237, calc(0.28 + 0.28 * var(--p)));
          --color-secondary: rgba(147, 51, 234, calc(0.22 + 0.22 * var(--p)));
          --g-size: calc(180px + 140px * var(--p)); /* bigger near the cursor */

          /* Radial glow follows cursor via CSS vars */
          background: radial-gradient(
              var(--g-size) var(--g-size) at var(--gpx) var(--gpy),
              var(--color-primary),
              var(--color-secondary) 45%,
              transparent 75%
            );

          /* Mask to reveal only the border ring */
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask-composite: exclude;

          /* Filter intensity scales with proximity */
          filter: blur(16px) saturate(calc(140% + 90% * var(--p)));
          opacity: var(--border-base-opacity);

          transition: opacity 180ms ease-out, filter 180ms ease-out;
        }
        /* On hover, full vibrancy */
        .chat-shell:hover .glow-border {
          opacity: 1;
          filter: blur(14px) saturate(200%);
        }

        /* Active state */
        .chat-shell:active .glow-border {
          filter: blur(12px) saturate(220%);
        }
      `}</style>
    </main>
  );
}