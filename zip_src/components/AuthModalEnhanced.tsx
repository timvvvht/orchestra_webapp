import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useAuth } from '@/auth/AuthContext';
import { GoogleLoginButton } from '@/auth/GoogleLoginButton';
import { Loader2, Sparkles, Music, Users, Zap, Mail, ArrowRight, Check, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Orchestra Design System Animation Variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } // --ease-water
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const glassPanel = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] } // --ease-smooth
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: -20,
    transition: { duration: 0.3, ease: [0.19, 1, 0.22, 1] } // --ease-gentle
  }
};

export const AuthModalEnhanced = () => {
  const { showModal, setShowModal, isAuthenticated, loginEmailPassword, signUpEmailPassword } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmailOption, setShowEmailOption] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  
  // Reset states when modal closes
  useEffect(() => {
    if (!showModal) {
      setError(null);
      setShowEmailOption(false);
      setEmailSent(false);
      setEmail('');
      setPassword('');
      setShowPassword(false);
      setIsSignUpMode(false);
    }
  }, [showModal]);
  
  if (isAuthenticated) return null;

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // The actual login is handled by GoogleLoginButton
      // This wrapper adds loading state management
    } catch (err) {
      setError('Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setEmailSent(true);
    } catch (err) {
      setError('Failed to send magic link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      if (isSignUpMode) {
        await signUpEmailPassword(email, password);
        // For sign up, show success message if email confirmation is needed
        setEmailSent(true);
      } else {
        await loginEmailPassword(email, password);
        // On successful login, the modal will close automatically due to isAuthenticated check
        setShowModal(false);
      }
    } catch (err: any) {
      const action = isSignUpMode ? 'Sign up' : 'Login';
      setError(err?.message || `${action} failed. Please check your credentials and try again.`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-transparent border-none shadow-none">
        {/* Orchestra Design System Modal */}
        <motion.div
          variants={glassPanel}
          initial="initial"
          animate="animate"
          exit="exit"
          className="relative w-full"
        >
          {/* Background layers - The Void */}
          <div className="fixed inset-0 z-0">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            {/* Mystical floating orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          {/* Main Glass Container */}
          <div className="relative z-10 bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
            {/* Gradient overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
            
            {/* Hero Section - Mystical Header */}
            <div className="relative p-8 text-center">
              {/* Energy field around logo */}
              <motion.div
                className="relative flex justify-center mb-6"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="relative">
                  {/* Pulsing energy field */}
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    animate={{
                      boxShadow: [
                        "0 0 0 0 rgba(147, 51, 234, 0.2)",
                        "0 0 0 20px rgba(147, 51, 234, 0)",
                      ]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeOut"
                    }}
                  />
                  
                  {/* The orb */}
                  <div className="relative w-16 h-16 flex items-center justify-center rounded-full bg-white/[0.05] backdrop-blur-2xl border border-white/10">
                    <Sparkles className="w-8 h-8 text-white/60" />
                  </div>
                </div>
              </motion.div>
              
              {/* Welcome Text */}
              <motion.div
                className="space-y-2"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                <motion.h2 
                  variants={fadeInUp}
                  className="text-2xl font-medium text-white/90"
                >
                  Welcome to Orchestra
                </motion.h2>
                <motion.p 
                  variants={fadeInUp}
                  className="text-sm text-white/50"
                >
                  Orchestrate your workflow with intelligence
                </motion.p>
              </motion.div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 p-8 pt-0">
              <AnimatePresence mode="wait">
                {emailSent ? (
                  // Success State - Account Created/Email Sent
                  <motion.div
                    key="success"
                    variants={glassPanel}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="text-center py-8"
                  >
                    <div className="w-16 h-16 bg-emerald-500/10 backdrop-blur-xl rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                      <Check className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-medium text-white/90 mb-2">
                      {isSignUpMode ? 'Account created!' : 'Check your email!'}
                    </h3>
                    <p className="text-sm text-white/50 mb-6 leading-relaxed">
                      {isSignUpMode 
                        ? `Welcome! Please check your email at ${email} to verify your account.`
                        : `We've sent a magic link to ${email}`
                      }
                    </p>
                    <button
                      onClick={() => {
                        setEmailSent(false);
                        setIsSignUpMode(false);
                      }}
                      className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors duration-200"
                    >
                      Use a different method
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="auth-options"
                    variants={glassPanel}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    {/* Value Props - Mystical Features */}
                    <motion.div 
                      className="grid grid-cols-3 gap-4 mb-8"
                      variants={staggerContainer}
                      initial="initial"
                      animate="animate"
                    >
                      {[
                        { icon: Music, label: 'Seamless Integration' },
                        { icon: Users, label: 'Team Collaboration' },
                        { icon: Zap, label: 'Lightning Fast' }
                      ].map((item, index) => (
                        <motion.div 
                          key={index}
                          variants={fadeInUp}
                          className="text-center group"
                        >
                          <div className="w-10 h-10 bg-white/[0.05] backdrop-blur-xl rounded-lg flex items-center justify-center mx-auto mb-2 border border-white/10 group-hover:bg-white/[0.08] group-hover:scale-110 transition-all duration-300">
                            <item.icon className="w-5 h-5 text-white/40 group-hover:text-white/60" />
                          </div>
                          <p className="text-xs text-white/30 font-normal">{item.label}</p>
                        </motion.div>
                      ))}
                    </motion.div>

                    {/* Auth Options */}
                    <div className="space-y-4">
                      <AnimatePresence mode="wait">
                        {!showEmailOption ? (
                          <motion.div
                            key="oauth-options"
                            variants={glassPanel}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="space-y-4"
                          >
                            {/* Primary CTA - Google */}
                            <div className="relative group">
                              <div onClick={handleGoogleLogin} className="cursor-pointer">
                                <GoogleLoginButton />
                              </div>
                              {isLoading && (
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                  <div className="flex items-center gap-2">
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
                                </div>
                              )}
                            </div>

                            {/* Divider */}
                            <div className="relative">
                              <div className="absolute inset-0 flex items-center">
                                <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                              </div>
                              <div className="relative flex justify-center">
                                <span className="bg-black px-3 text-xs text-white/30 font-normal uppercase tracking-wide">Or</span>
                              </div>
                            </div>

                            {/* Email Option */}
                            <button 
                              onClick={() => setShowEmailOption(true)}
                              className="group w-full px-5 py-3 bg-white/[0.03] hover:bg-white/[0.05] backdrop-blur-xl border border-white/10 hover:border-white/20 rounded-xl text-sm font-normal text-white/70 hover:text-white/90 transition-all duration-200 flex items-center justify-center gap-3"
                            >
                              <Mail className="w-5 h-5 text-white/40 group-hover:text-white/60" />
                              Continue with Email
                              <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white/60 transition-all duration-200 group-hover:translate-x-1" />
                            </button>
                          </motion.div>
                        ) : (
                          // Email/Password Form - Glass Aesthetic
                          <motion.form
                            key="email-form"
                            variants={glassPanel}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            onSubmit={handleEmailPasswordLogin}
                            className="space-y-6"
                          >
                            <h3 className="text-xl font-medium text-white/90 text-center">
                              {isSignUpMode ? 'Create Account' : 'Sign in with Email'}
                            </h3>
                            
                            <div className="space-y-4">
                              {/* Email Field */}
                              <div>
                                <label htmlFor="email" className="block text-xs font-medium text-white/50 uppercase tracking-wide mb-2">
                                  Email Address
                                </label>
                                <input
                                  type="email"
                                  id="email"
                                  value={email}
                                  onChange={(e) => setEmail(e.target.value)}
                                  required
                                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all duration-200"
                                  placeholder="Enter your email"
                                />
                              </div>

                              {/* Password Field */}
                              <div>
                                <label htmlFor="password" className="block text-xs font-medium text-white/50 uppercase tracking-wide mb-2">
                                  Password
                                </label>
                                <div className="relative">
                                  <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 pr-12 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all duration-200"
                                    placeholder="Enter your password"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors duration-200"
                                  >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Error State */}
                            <AnimatePresence>
                              {error && (
                                <motion.div
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl backdrop-blur-xl"
                                >
                                  <p className="text-sm text-red-400">{error}</p>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Submit Button */}
                            <button
                              type="submit"
                              disabled={isLoading}
                              className="group relative w-full px-6 py-3 bg-white text-black rounded-xl font-medium transition-all duration-300 hover:scale-105 active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                              {/* Gradient overlay on hover */}
                              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                              
                              <span className="relative z-10 flex items-center justify-center gap-2">
                                {isLoading ? (
                                  <>
                                    <div className="flex items-center gap-1">
                                      {[0, 1, 2].map(i => (
                                        <motion.div
                                          key={i}
                                          className="w-1 h-1 rounded-full bg-black/60"
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
                                  </>
                                ) : (
                                  isSignUpMode ? "Create Account" : "Sign In"
                                )}
                              </span>
                            </button>

                            {/* Toggle & Back Options */}
                            <div className="space-y-3 text-center">
                              <button
                                type="button"
                                onClick={() => setIsSignUpMode(!isSignUpMode)}
                                className="text-sm text-white/50 hover:text-white/70 font-normal transition-colors duration-200"
                              >
                                {isSignUpMode ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowEmailOption(false)}
                                className="block w-full text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors duration-200"
                              >
                                Back to Google Sign-in
                              </button>
                            </div>
                          </motion.form>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Terms & Privacy */}
                    <motion.p 
                      variants={fadeInUp}
                      className="mt-8 text-xs text-center text-white/30 leading-relaxed"
                    >
                      By continuing, you agree to Orchestra's{' '}
                      <a href="#" className="text-blue-400 hover:text-blue-300 font-medium underline-offset-2 hover:underline transition-colors duration-200">
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a href="#" className="text-blue-400 hover:text-blue-300 font-medium underline-offset-2 hover:underline transition-colors duration-200">
                        Privacy Policy
                      </a>
                    </motion.p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};