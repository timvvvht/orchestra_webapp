import { useAuth } from "@/auth/AuthContext";
import { GoogleLoginButton } from "@/auth/GoogleLoginButton";
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

// Grid pattern helper
const makeGridPattern = (size = 60, opacity = 0.05) =>
  `data:image/svg+xml,%3Csvg width='${size}' height='${size}' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='white' stroke-width='0.5' opacity='${opacity}'%3E%3Cpath d='M0 0h${size}v${size}H0z'/%3E%3C/g%3E%3C/svg%3E`;

// Grid patterns
const grid40Pattern = makeGridPattern(40, 0.05);

export default function Landing() {
  return <PlaygroundLanding />;
}

// Playground Landing Page - Refined and Polished
function PlaygroundLanding() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const authFailed = params.get("error") === "auth_failed";
  const [userInput, setUserInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<any>(null);
  const [selectedExample, setSelectedExample] = useState<number | null>(null);

  const examples = [
    {
      icon: "🎮",
      title: "Snake Game",
      prompt: "Create a classic snake game with score tracking",
      preview: {
        type: "game",
        description: "Fully playable retro snake game",
        features: ["Arrow key controls", "Score system", "Increasing difficulty"]
      }
    },
    {
      icon: "📝",
      title: "Note Taking App",
      prompt: "Build a markdown note-taking app with folders",
      preview: {
        type: "app",
        description: "Clean, minimal note-taking interface",
        features: ["Markdown support", "Folder organization", "Search"]
      }
    },
    {
      icon: "🎨",
      title: "Portfolio Site",
      prompt: "Design a modern portfolio website for a photographer",
      preview: {
        type: "website",
        description: "Stunning visual portfolio",
        features: ["Image galleries", "Contact form", "Responsive design"]
      }
    },
    {
      icon: "💬",
      title: "Chat Interface",
      prompt: "Create a real-time chat application",
      preview: {
        type: "app",
        description: "Modern messaging interface",
        features: ["Real-time messages", "User presence", "Emoji support"]
      }
    }
  ];

  const handleGenerate = () => {
    setIsGenerating(true);
    // Simulate generation
    setTimeout(() => {
      setIsGenerating(false);
      setGeneratedPreview({
        success: true,
        message: "Your app is ready! Sign in to deploy it live."
      });
    }, 3000);
  };

  return (
    <main className="min-h-screen relative overflow-hidden bg-black">
      {/* Interactive background */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-black to-slate-950" />
        
        {/* Interactive particles */}
        <div className="absolute inset-0">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-purple-400/30 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        {/* Grid overlay */}
        <div className={`absolute inset-0 bg-[url('${grid40Pattern}')]`} />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 p-6 md:p-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:rotate-12 transition-transform duration-300">
                <svg className="w-5 h-5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <span className="text-xl font-light text-white/90">Orchestra</span>
            </div>

            {/* Quick stats ticker */}
            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/10">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-white/60">
                <span className="text-white/80 font-medium">247</span> apps being built right now
              </span>
            </div>
          </div>
        </header>

        {/* Main playground */}
        <div className="min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-12">
          <div className="w-full max-w-6xl">
            {/* Hero */}
            <div className="text-center mb-12">
              <h1 className="text-5xl md:text-7xl font-extralight text-white mb-6">
                <span className="block">Imagine It.</span>
                <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                  We'll Build It.
                </span>
              </h1>
              <p className="text-xl text-white/60 max-w-2xl mx-auto">
                Describe any app, website, or tool. Our AI agents will create it instantly.
                No coding required. Try it right here, right now.
              </p>
            </div>

            {/* Interactive playground */}
            <div className="grid lg:grid-cols-2 gap-8 mb-12">
              {/* Input side */}
              <div className="space-y-6">
                {/* Text input */}
                <div className="relative">
                  <textarea
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Describe what you want to build..."
                    className="w-full h-32 p-6 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl text-white placeholder-white/30 resize-none focus:outline-none focus:border-white/20 transition-all"
                  />
                  
                  {/* Refined CTA Button - Sophisticated Glass Morphism Design */}
                  <button
                    onClick={handleGenerate}
                    disabled={!userInput || isGenerating}
                    className="absolute bottom-4 right-4 group px-6 py-2.5 
                      bg-white/[0.08] backdrop-blur-md
                      border border-white/20
                      rounded-xl font-medium text-white/90
                      shadow-[0_8px_32px_rgba(0,0,0,0.12)]
                      hover:bg-white/[0.12] hover:border-white/30
                      hover:shadow-[0_8px_40px_rgba(255,255,255,0.1)]
                      active:scale-[0.98]
                      disabled:opacity-40 disabled:cursor-not-allowed
                      transition-all duration-200 ease-out
                      relative overflow-hidden"
                  >
                    {/* Subtle gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/[0.05] to-white/0 
                      translate-x-[-100%] group-hover:translate-x-[100%] 
                      transition-transform duration-700 ease-out" />
                    
                    {/* Button content */}
                    <span className="relative flex items-center gap-2">
                      {isGenerating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white/90 rounded-full animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <span>Generate</span>
                          <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </>
                      )}
                    </span>
                  </button>
                </div>

                {/* Example prompts */}
                <div className="space-y-3">
                  <div className="text-xs text-white/40 uppercase tracking-wide">Or try an example:</div>
                  <div className="grid grid-cols-2 gap-3">
                    {examples.map((example, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setUserInput(example.prompt);
                          setSelectedExample(index);
                        }}
                        className="p-4 bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{example.icon}</span>
                          <div>
                            <div className="text-sm text-white/80 font-medium">{example.title}</div>
                            <div className="text-xs text-white/40">Click to try</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview side */}
              <div className="relative">
                <div className="sticky top-8">
                  <div className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 overflow-hidden">
                    {/* Browser chrome */}
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/50" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                        <div className="w-3 h-3 rounded-full bg-green-500/50" />
                      </div>
                      <div className="flex-1 flex justify-center">
                        <div className="px-3 py-1 bg-white/[0.03] rounded text-xs text-white/40">
                          your-app.orchestra.dev
                        </div>
                      </div>
                    </div>

                    {/* Preview content */}
                    <div className="h-96 flex items-center justify-center p-8">
                      {isGenerating ? (
                        <div className="text-center">
                          <div className="mb-4">
                            <div className="w-16 h-16 mx-auto border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                          </div>
                          <p className="text-white/60">AI agents are building your app...</p>
                          <p className="text-xs text-white/40 mt-2">This usually takes 5-10 seconds</p>
                        </div>
                      ) : generatedPreview ? (
                        <div className="text-center animate-fade-in">
                          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                            <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <h3 className="text-xl text-white mb-2">App Generated!</h3>
                          <p className="text-white/60 mb-6">{generatedPreview.message}</p>
                          <GoogleLoginButton className="mx-auto" />
                        </div>
                      ) : selectedExample !== null ? (
                        <div className="space-y-4">
                          <div className="text-center">
                            <span className="text-5xl mb-4 block">{examples[selectedExample].icon}</span>
                            <h3 className="text-xl text-white mb-2">{examples[selectedExample].title}</h3>
                            <p className="text-sm text-white/60">{examples[selectedExample].preview.description}</p>
                          </div>
                          <div className="space-y-2">
                            {examples[selectedExample].preview.features.map((feature, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm text-white/40">
                                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {feature}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-white/40">
                          <svg className="w-16 h-16 mx-auto mb-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <p>Your app preview will appear here</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Error state */}
            {authFailed && (
              <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 backdrop-blur-sm max-w-md mx-auto">
                <p className="text-sm text-red-200 text-center">
                  Something went wrong. Let's try again.
                </p>
              </div>
            )}

            {/* Trust signals */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-white/40 text-sm">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>No coding required</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                </svg>
                <span>Learn as you build</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                <span>Deploy instantly</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                <span>Join 10,000+ builders</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}