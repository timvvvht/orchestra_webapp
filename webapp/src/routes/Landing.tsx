import { useAuth } from "@/auth/AuthContext";
import { GoogleLoginButton } from "@/auth/GoogleLoginButton";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/auth/SupabaseClient";
import { acsGithubApi } from "@/services/acsGitHubApi";
import { motion, AnimatePresence } from "framer-motion";

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  // ACS client for GitHub operations
  const DEFAULT_ACS = (
    import.meta.env?.VITE_ACS_BASE_URL || "https://orchestra-acs.fly.dev"
  ).replace(/\/$/, "");
  const [acsBase] = useState(DEFAULT_ACS);
  const api = useMemo(() => acsGithubApi({ baseUrl: acsBase }), [acsBase]);
  
  // Core state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [githubConnecting, setGithubConnecting] = useState(false);
  const [waitingForInstall, setWaitingForInstall] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // GitHub connection handler
  const handleConnectGitHub = useCallback(async () => {
    // If not authenticated, show auth modal first
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
      
      // Open GitHub in new tab
      window.open(res.data.install_url, "_blank", "noopener,noreferrer");
      setWaitingForInstall(true);
      
      // Start polling for completion
      let pollCount = 0;
      const maxPolls = 30; // 30 seconds max
      
      const pollInterval = setInterval(async () => {
        pollCount++;
        
        const checkRes = await api.listRepos(auth);
        if (checkRes.ok && checkRes.data.repositories && checkRes.data.repositories.length > 0) {
          clearInterval(pollInterval);
          setWaitingForInstall(false);
          setGithubConnecting(false);
          // Navigate to StartChat
          navigate('/start-chat', { replace: true });
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
  }, [isAuthenticated, api, navigate]);
  
  // Handle successful login
  useEffect(() => {
    if (isAuthenticated && showAuthModal) {
      setShowAuthModal(false);
      // After login, trigger GitHub connection
      handleConnectGitHub();
    }
  }, [isAuthenticated, showAuthModal, handleConnectGitHub]);
  
  const isLoading = githubConnecting || waitingForInstall;
  
  // Button text based on state
  const getButtonText = () => {
    if (waitingForInstall) return "Waiting for GitHub...";
    if (githubConnecting) return "Connecting...";
    return "Connect GitHub";
  };
  
  return (
    <main className="min-h-screen relative overflow-hidden bg-black orchestra-page">
      {/* Background layers - Orchestra Design System */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-black to-slate-950" />
        
        {/* Floating orbs - subtle mystical elements */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-[float_30s_ease-in-out_infinite]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-[float_35s_ease-in-out_infinite_reverse]" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Minimal header */}
        <header className="absolute top-0 left-0 right-0 p-6 md:p-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.05] backdrop-blur-xl border border-white/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <span className="text-xl font-light text-white/90">Orchestra</span>
            </div>
          </div>
        </header>

        {/* Main content - centered, focused */}
        <div className="min-h-screen flex flex-col items-center justify-center px-6">
          <motion.div 
            className="w-full max-w-2xl text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {/* Hero text */}
            <div className="mb-12">
              <h1 className="text-5xl md:text-6xl font-extralight text-white mb-6 leading-tight">
                AI agents that
                <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                  fix bugs & ship features
                </span>
              </h1>
              <p className="text-lg text-white/60 max-w-xl mx-auto">
                Connect your GitHub repo. Describe what you need. 
                Get production-ready pull requests in minutes.
              </p>
            </div>

            {/* Primary CTA */}
            <div className="mb-8">
              <button
                onClick={handleConnectGitHub}
                disabled={isLoading}
                className="group relative px-8 py-4 bg-white text-black rounded-xl font-medium text-lg transition-all duration-300 hover:scale-105 active:scale-100 disabled:opacity-50 disabled:cursor-wait"
              >
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <span className="relative z-10 flex items-center gap-3">
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      {getButtonText()}
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                      {getButtonText()}
                    </>
                  )}
                </span>
              </button>
              
              {/* Trust line directly under CTA */}
              <p className="mt-3 text-xs text-white/40">
                PR-only by default • You approve every change • Revoke access anytime
              </p>
            </div>

            {/* Error state */}
            {error && (
              <motion.div 
                className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 backdrop-blur-sm"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="text-sm text-red-200">{error}</p>
              </motion.div>
            )}

            {/* Waiting state */}
            {waitingForInstall && (
              <motion.div 
                className="mb-6 p-4 rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <p className="text-sm text-white/60">
                  Complete the GitHub installation in the new tab...
                </p>
                <button 
                  onClick={() => navigate('/start-chat')}
                  className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  I've already installed it
                </button>
              </motion.div>
            )}

            {/* Step indicator - subtle */}
            <div className="flex items-center justify-center gap-8 text-xs text-white/30">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-white/10 text-white/60 flex items-center justify-center text-[10px] font-medium">1</span>
                <span>Connect</span>
              </div>
              <div className="w-8 h-px bg-white/10" />
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-white/5 text-white/30 flex items-center justify-center text-[10px] font-medium">2</span>
                <span>Select repo</span>
              </div>
              <div className="w-8 h-px bg-white/10" />
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-white/5 text-white/30 flex items-center justify-center text-[10px] font-medium">3</span>
                <span>Describe task</span>
              </div>
              <div className="w-8 h-px bg-white/10" />
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-white/5 text-white/30 flex items-center justify-center text-[10px] font-medium">4</span>
                <span>Review PR</span>
              </div>
            </div>

            {/* Optional: Tertiary link */}
            <div className="mt-12">
              <button className="text-xs text-white/30 hover:text-white/50 transition-colors">
                See a real PR example →
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Authentication Modal - Orchestra Design System */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowAuthModal(false)}
            />
            
            {/* Modal */}
            <motion.div 
              className="relative w-full max-w-sm"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Glass container */}
              <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
                
                {/* Content */}
                <div className="relative z-10 p-8">
                  {/* Close button */}
                  <button
                    onClick={() => setShowAuthModal(false)}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/[0.05] transition-colors"
                    aria-label="Close"
                  >
                    <svg className="w-4 h-4 text-white/40 hover:text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  
                  {/* Orchestra icon */}
                  <div className="w-12 h-12 mx-auto mb-6 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                  
                  {/* Content */}
                  <div className="text-center space-y-6">
                    {/* Heading */}
                    <div className="space-y-2">
                      <h2 className="text-xl font-light text-white/90">
                        Sign in to connect GitHub
                      </h2>
                      <p className="text-sm text-white/60 leading-relaxed">
                        Connect your repositories and start shipping code with AI.
                      </p>
                    </div>
                    
                    {/* Login button */}
                    <GoogleLoginButton 
                      variant="default"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
      `}</style>
    </main>
  );
}