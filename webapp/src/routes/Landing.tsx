import { useAuth } from "@/auth/AuthContext";
import { GoogleLoginButton } from "@/auth/GoogleLoginButton";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/auth/SupabaseClient";
import { acsGithubApi } from "@/services/acsGitHubApi";
import { motion, AnimatePresence } from "framer-motion";

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [ctaHovered, setCtaHovered] = useState(false);
  const rafRef = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

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

  // Track mouse position for interactive effects via CSS vars (rAF throttled, no React re-render)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        const el = rootRef.current;
        if (el) {
          el.style.setProperty("--mx", nx.toFixed(4));
          el.style.setProperty("--my", ny.toFixed(4));
        }
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      });
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main ref={rootRef} className="min-h-screen relative overflow-hidden bg-black orchestra-page" style={{
      // default CSS var values
      // @ts-ignore - custom properties
      ['--mx' as any]: 0,
      ['--my' as any]: 0,
    }}>
      {/* Background layers - Enhanced mystical void with mouse-reactive effects */}
      <div className="fixed inset-0 will-change-transform">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-black to-black" />

        {/* Mouse-following energy fields (CSS transform driven by CSS vars) */}
        <div
          className="absolute w-[800px] h-[800px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)",
            filter: "blur(60px)",
            left: "50%",
            top: "50%",
            transform: `translate3d(calc(var(--mx) * 200px), calc(var(--my) * 200px), 0) translate(-50%, -50%)`,
          }}
        />

        <div
          className="absolute w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, transparent 70%)",
            filter: "blur(80px)",
            left: "50%",
            top: "50%",
            transform: `translate3d(calc(var(--mx) * -150px), calc(var(--my) * -150px), 0) translate(-50%, -50%)`,
          }}
        />

        {/* Spotlight mask following cursor */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(600px circle at calc(50% + var(--mx) * 200px) calc(50% + var(--my) * 200px), rgba(255,255,255,0.06), transparent 60%)`,
          }}
        />

        {/* Star field (lightweight, pure CSS) */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-px h-px bg-white/25 animate-twinkle"
              style={{
                left: `${(i * 97) % 100}%`,
                top: `${(i * 57) % 100}%`,
                animationDelay: `${(i % 10) * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Minimal header */}
        <header className="absolute top-0 left-0 right-0 p-6 md:p-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.05] backdrop-blur-xl border border-white/10 flex items-center justify-center">
                <img src="/orchestra_logo.svg" alt="Orchestra logo" className="w-5 h-5 object-contain" />
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
            <div className="mb-10">
              {/* Live banner */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] backdrop-blur-xl border border-white/10">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <span className="text-xs text-white/60 font-medium tracking-wide">LIVE AGENTS WORKING NOW</span>
              </div>

              <h1 className="mt-6 text-6xl md:text-7xl font-extralight text-white mb-4 leading-[1.1]">
                Fix your vibe‑coded app.
                <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent animate-gradient bg-[length:300%_300%]">
                  Gently.
                </span>
              </h1>
              <p className="text-lg text-white/60 max-w-xl mx-auto">
                Tell us what’s janky. We prep a safe update. You approve.
              </p>
            </div>

            {/* Halo CTA — mouse‑reactive ring with prominent button */}
            <div className="relative mx-auto w-full max-w-4xl mb-12 flex items-center justify-center">
              <div className="relative w-[340px] h-[340px] md:w-[420px] md:h-[420px] will-change-transform"
                style={{ transform: `rotateX(calc(var(--my) * -2deg)) rotateY(calc(var(--mx) * 2deg))` }}>
                {/* Glow */}
                <div className="absolute -inset-6 rounded-full bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 blur-3xl" />

                {/* Ring (conic gradient, slow spin) */}
                <div className="absolute inset-0 rounded-full overflow-hidden">
                  <div className="absolute inset-0 rounded-full animate-spin-slower"
                    style={{
                      background: "conic-gradient(from 0deg, rgba(0,119,237,0.5), rgba(147,51,234,0.5), rgba(0,119,237,0.5))",
                      WebkitMask: "radial-gradient(circle, transparent 60%, black 61%)",
                      mask: "radial-gradient(circle, transparent 60%, black 61%)",
                      filter: "saturate(120%)",
                    }}
                  />
                </div>

                {/* Inner plate */}
                <div className="absolute inset-[18px] rounded-full bg-white/[0.03] backdrop-blur-2xl border border-white/10 flex items-center justify-center">
                  {/* Primary CTA - matter-of-fact, dominant */}
                  <button
                    onClick={handleConnectGitHub}
                    disabled={isLoading}
                    className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-white text-black text-base font-medium transition-transform duration-150 hover:translate-y-[-1px] active:translate-y-0 disabled:opacity-60 disabled:cursor-wait focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500/50"
                    aria-label="Connect with GitHub"
                    title="Connect with GitHub"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        {getButtonText()}
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                        Connect with GitHub
                      </>
                    )}
                  </button>
                </div>
              </div>
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

            {/* Remove noisy extras under CTA for maximum clarity */}
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
                    <img src="/orchestra_logo.svg" alt="Orchestra logo" className="w-6 h-6 object-contain" />
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

      <style jsx>{`
        @keyframes twinkle { 0%, 100% { opacity: .3; transform: scale(1); } 50% { opacity: .9; transform: scale(1.4); } }
        .animate-twinkle { animation: twinkle 3.5s ease-in-out infinite; }
        @keyframes scan { 0% { transform: translateY(-100%);} 100% { transform: translateY(300%);} }
        .animate-scan { animation: scan 3s linear infinite; }
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient { animation: gradient 6s ease infinite; }
        @keyframes spin-slower { 0% { transform: rotate(0deg)} 100% { transform: rotate(360deg)} }
        .animate-spin-slower { animation: spin-slower 24s linear infinite; }
      `}</style>
    </main>
  );
}