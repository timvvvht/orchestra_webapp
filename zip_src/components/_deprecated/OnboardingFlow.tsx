import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getDefaultVaultPath, ensureDirectoryExists, setPreference } from '@/api/settingsApi';
import { useSettingsStore } from '@/stores/settingsStore';
import { setUserName, setUserGoals, setOnboardingCompleted } from '@/utils/userPreferences';
// No need for Tauri dialog import
import { 
  FolderOpenIcon, 
  ZapIcon, 
  BookOpenIcon, 
  RocketIcon, 
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  HomeIcon,
  LightbulbIcon
} from 'lucide-react';

interface OnboardingFlowProps {
  isOpen: boolean;
  onComplete: () => void;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ isOpen, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [proposedVaultPath, setProposedVaultPath] = useState('');
  const [selectedVaultPath, setSelectedVaultPath] = useState('');
  const [pathError, setPathError] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  
  const TOTAL_STEPS = 4; // Added a personalization step
  
  const setVaultSetting = useSettingsStore((state) => state.setVaultSetting);
  const vaultPathFromStore = useSettingsStore((state) => state.settings.vault.path);

  // Goals that users might have with the application
  const userGoals = [
    { 
      id: 'organize', 
      label: 'Organize my knowledge', 
      description: 'Create a structured system for notes, ideas, and research',
      icon: <BookOpenIcon className="w-4 h-4" /> 
    },
    { 
      id: 'automate', 
      label: 'Automate repetitive tasks', 
      description: 'Save time with workflows and smart assistants',
      icon: <ZapIcon className="w-4 h-4" /> 
    },
    { 
      id: 'collaborate', 
      label: 'Collaborate with my team', 
      description: 'Share information and work together seamlessly',
      icon: <RocketIcon className="w-4 h-4" /> 
    },
  ];
  
  // Toggle a goal in the selection
  const toggleGoal = (goalId: string) => {
    setSelectedGoals(prev => {
      if (prev.includes(goalId)) {
        return prev.filter(id => id !== goalId);
      } else {
        return [...prev, goalId];
      }
    });
  };

  // Load default vault path
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      getDefaultVaultPath()
        .then((path) => {
          setProposedVaultPath(path);
          if (!vaultPathFromStore) {
            setSelectedVaultPath(path);
          } else {
            setSelectedVaultPath(vaultPathFromStore);
          }
        })
        .catch((error) => {
          console.error('Failed to fetch default vault path:', error);
          setProposedVaultPath('Error fetching path');
          setSelectedVaultPath('Error fetching path');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, vaultPathFromStore]);

  // No need for folder dialog, users will enter path manually instead

  const handleUseDefaultPath = async () => {
    if (proposedVaultPath && proposedVaultPath !== 'Error fetching path') {
      setSelectedVaultPath(proposedVaultPath);
      // Clear any previous errors
      if (pathError) setPathError(null);
      
      try {
        setIsLoading(true);
        await ensureDirectoryExists(proposedVaultPath);
      } catch (error) {
        console.error('Failed to ensure default directory exists:', error);
        setPathError(`Error with default path: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleNext = async () => {
    // Validate current step
    if (currentStep === 1 && !userName.trim()) {
      // Show inline validation error for name
      return;
    }
    
    if (currentStep === 2 && selectedGoals.length === 0) {
      // Show inline validation error for goals
      return;
    }
    
    if (currentStep === 3) {
      // Clear any previous errors
      setPathError(null);
      
      // Validate the path is not empty
      if (!selectedVaultPath || selectedVaultPath.trim() === '') {
        setPathError('Please enter a valid path for your vault');
        return;
      }
      
      if (selectedVaultPath === 'Error fetching path') {
        setPathError('Please enter a valid path manually or contact Tim for help');
        return;
      }
      
      setIsLoading(true);
      try {
        // Ensure the directory exists (will create it if it doesn't)
        await ensureDirectoryExists(selectedVaultPath);
        
        // Save the path to settings - but only if it's different from what's already in the store
        // This helps prevent unnecessary updates that could trigger re-renders
        if (selectedVaultPath !== vaultPathFromStore) {
          console.log('Setting vault path in store:', selectedVaultPath);
          await setVaultSetting('path', selectedVaultPath);
          console.log('Vault path set successfully:', selectedVaultPath);
        } else {
          console.log('Vault path unchanged, skipping update');
        }
        
        // Continue to the next step after successful vault path setup
        console.log('Vault path setup successful, advancing to step 4');
        // Use a small timeout to ensure state updates don't conflict
        setTimeout(() => {
          setCurrentStep(4); // Explicitly set to step 4 instead of incrementing
          setIsLoading(false);
        }, 50);
        return; // Return early to avoid hitting the general step advancement code
      } catch (error) {
        console.error('Error processing vault path:', error);
        setPathError(`Error creating directory: ${error instanceof Error ? error.message : String(error)}`);
        setIsLoading(false);
        return;
      }
    }

    if (currentStep < TOTAL_STEPS) {
      console.log(`General step advancement: moving from step ${currentStep} to step ${currentStep + 1}`);
      setCurrentStep(currentStep + 1);
    } else {
      // Finish onboarding
      console.log('Final step reached, completing onboarding');
      setIsLoading(true);
      try {
        // Save user preferences using our utility functions (localStorage)
        console.log('Saving user preferences: name, goals, and marking onboarding as completed');
        setOnboardingCompleted();
        setUserName(userName);
        setUserGoals(selectedGoals);
        
        // Also save to Tauri plugin store for Rust backend access
        console.log('Saving onboarding data to Tauri plugin store');
        await setPreference('onboarding.userName', userName);
        await setPreference('onboarding.userGoals', selectedGoals);
        await setPreference('onboarding.completed', true);
        
        console.log('Calling onComplete callback');
        onComplete();

      } catch (error) {
        console.error('Error during finish action:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // Render step content with animations
  const renderStepContent = useCallback(() => {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={`step-${currentStep}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="py-6"
        >
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 mb-5 shadow-sm">
                    <RocketIcon className="h-12 w-12 text-primary" />
                  </div>
                </motion.div>
                <h2 className="text-3xl font-bold tracking-tight">Welcome to Orchestra</h2>
                <p className="text-muted-foreground mt-3 max-w-md mx-auto">
                  Your intelligent workspace for seamless productivity
                </p>
              </div>
              
              <div className="space-y-4 max-w-md mx-auto">
                <div className="bg-card/50 p-5 rounded-lg border border-border/50 shadow-sm">
                  <label className="text-sm font-medium block mb-3">
                    What should we call you?
                  </label>
                  <Input
                    placeholder="Your name"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="mb-2"
                  />
                  {!userName.trim() && currentStep === 1 && (
                    <p className="text-sm text-destructive mb-2">Please enter your name to continue</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    We'll use this to personalize your experience
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                >
                  <div className="inline-flex p-3 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 mb-4 shadow-sm">
                    <BookOpenIcon className="h-10 w-10 text-primary" />
                  </div>
                </motion.div>
                <h2 className="text-2xl font-bold tracking-tight">
                  Hi{userName ? `, ${userName}` : ''}! What brings you here?
                </h2>
                <p className="text-muted-foreground mt-3 max-w-md mx-auto">
                  We'll tailor your experience based on your goals. Select all that apply.
                </p>
              </div>
              
              <div className="grid gap-4 max-w-md mx-auto">
                {selectedGoals.length === 0 && currentStep === 2 && (
                  <p className="text-sm text-destructive mb-2 text-center">Please select at least one goal to continue</p>
                )}
                {userGoals.map((goal, index) => (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      variant="outline"
                      className={`w-full justify-start h-auto py-4 px-5 border border-border/50 shadow-sm transition-all duration-200 ${selectedGoals.includes(goal.id) 
                        ? "bg-primary/10 hover:bg-primary/15 ring-1 ring-primary/30 ring-offset-0" 
                        : "bg-card/50 hover:bg-card/80"
                      }`}
                      onClick={() => toggleGoal(goal.id)}
                    >
                      <div className="flex items-center">
                        <div className={`mr-4 p-2 rounded-full transition-colors duration-200 ${selectedGoals.includes(goal.id) ? "bg-primary/20" : "bg-muted/50"}`}>
                          <span className={selectedGoals.includes(goal.id) ? "text-primary" : "text-muted-foreground"}>
                            {goal.icon}
                          </span>
                        </div>
                        <div className="text-left">
                          <div className={`font-medium transition-colors duration-200 ${selectedGoals.includes(goal.id) ? "text-primary" : ""}`}>{goal.label}</div>
                          <div className="text-xs text-muted-foreground mt-1">{goal.description}</div>
                        </div>
                      </div>
                      <div className="ml-auto h-5 w-5 flex items-center justify-center">
                        <AnimatePresence mode="wait">
                          {selectedGoals.includes(goal.id) ? (
                            <motion.div
                              key="checked"
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <CheckCircleIcon className="h-5 w-5 text-primary" />
                            </motion.div>
                          ) : (
                            <motion.div
                              key="unchecked"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 0.5 }}
                              exit={{ opacity: 0 }}
                              className="h-5 w-5 rounded-full border-2 border-muted-foreground/30"
                            />
                          )}
                        </AnimatePresence>
                      </div>
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
          
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                >
                  <div className="inline-flex p-3 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 mb-4 shadow-sm">
                    <FolderOpenIcon className="h-10 w-10 text-primary" />
                  </div>
                </motion.div>
                <h2 className="text-2xl font-bold tracking-tight">Set Up Your Vault</h2>
                <p className="text-muted-foreground mt-3 max-w-md mx-auto">
                  Your vault is where all your data and notes will be stored securely
                </p>
              </div>
              
              <div className="space-y-5 max-w-md mx-auto">
                <div className="space-y-4 bg-card/50 p-5 rounded-lg border border-border/50 shadow-sm">
                  <div className="flex items-center">
                    <div className="p-2 rounded-full bg-primary/10 mr-2">
                      <HomeIcon className="h-4 w-4 text-primary" />
                    </div>
                    <label className="text-sm font-medium">
                      Vault Location
                    </label>
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Please enter the absolute path where you want to store your vault data.
                      If you're not sure what to enter, just use the default path below or contact Tim for help.
                    </p>
                    
                    <Input 
                      type="text" 
                      value={selectedVaultPath || (isLoading ? 'Loading...' : proposedVaultPath)} 
                      onChange={(e) => {
                        setSelectedVaultPath(e.target.value);
                        // Clear error when user types
                        if (pathError) setPathError(null);
                      }} 
                      placeholder="Enter your vault path (e.g., /Users/username/Documents/Orchestra)"
                      className="font-mono text-xs"
                    />
                    
                    {proposedVaultPath === 'Error fetching path' && (
                      <p className='text-destructive text-xs'>Could not fetch a default path. Please enter a path manually.</p>
                    )}
                    
                    {pathError && (
                      <p className='text-destructive text-xs'>{pathError}</p>
                    )}
                    
                    <div className="flex justify-end pt-1">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleUseDefaultPath}
                        disabled={!proposedVaultPath || proposedVaultPath === 'Error fetching path'}
                        className="bg-background/80 hover:bg-background"
                      >
                        Use Default Path
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg text-sm border border-amber-200 dark:border-amber-800/50">
                  <h4 className="font-medium flex items-center text-amber-800 dark:text-amber-300">
                    <LightbulbIcon className="w-4 h-4 mr-2 text-amber-500" />
                    Tips
                  </h4>
                  <ul className="mt-2 space-y-1.5 list-disc list-inside text-amber-700 dark:text-amber-400/80">
                    <li>Choose a location that's included in your regular backups</li>
                    <li>Avoid using cloud-synced folders for large vaults</li>
                    <li>You can change this location later in settings</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/20 mb-5 shadow-sm">
                    <CheckCircleIcon className="h-12 w-12 text-green-600 dark:text-green-500" />
                  </div>
                </motion.div>
                <h2 className="text-3xl font-bold tracking-tight">You're All Set!</h2>
                <p className="text-muted-foreground mt-3 max-w-md mx-auto">
                  Thanks{userName ? `, ${userName}` : ''}! Here are a few tips to get you started
                </p>
              </div>
              
              <div className="space-y-4 max-w-md mx-auto">
                <div className="bg-card/50 p-5 rounded-lg border border-border/50 shadow-sm">
                  <h4 className="font-medium mb-3">What's Next?</h4>
                  
                  <div className="space-y-4">
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.3 }}
                      className="flex items-start"
                    >
                      <div className="bg-primary/10 p-1.5 rounded-full mr-3 shrink-0">
                        <RocketIcon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">Explore the Interface</h3>
                        <p className="text-sm text-muted-foreground">Create your first note and get familiar with the workspace</p>
                      </div>
                    </motion.div>
                    
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, duration: 0.3 }}
                      className="flex items-start"
                    >
                      <div className="bg-primary/10 p-1.5 rounded-full mr-3 shrink-0">
                        <ZapIcon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">Keyboard Shortcuts</h3>
                        <p className="text-sm text-muted-foreground">Press <kbd className="px-1 py-0.5 text-xs rounded border bg-muted">Ctrl+K</kbd> to open the command palette</p>
                      </div>
                    </motion.div>
                
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7, duration: 0.3 }}
                      className="flex items-start"
                    >
                      <div className="bg-primary/10 p-1.5 rounded-full mr-3 shrink-0">
                        <BookOpenIcon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">AI Assistance</h3>
                        <p className="text-sm text-muted-foreground">Agents are ready to help with your tasks and research</p>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    );
  // Optimize dependency array to prevent unnecessary re-renders
  // Remove selectedVaultPath from dependencies to break potential circular updates
  }, [currentStep, userName, selectedGoals, isLoading, proposedVaultPath, handleUseDefaultPath, userGoals]);

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onComplete(); }}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden bg-gradient-to-br from-background to-muted border-none shadow-lg">
        {/* Progress indicator */}
        <div className="w-full bg-muted/30 h-2 rounded-b overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-primary/80 to-primary"
            initial={{ width: `${((currentStep - 1) / TOTAL_STEPS) * 100}%` }}
            animate={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ boxShadow: "0 0 8px rgba(var(--primary), 0.3)" }}
          />
        </div>
        
        <div className="px-6 pt-6">
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Badge variant="outline" className="text-xs font-normal px-3 py-1 bg-background/50 backdrop-blur-sm border-primary/20">
                <motion.span
                  key={currentStep}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  Step {currentStep} of {TOTAL_STEPS}
                </motion.span>
              </Badge>
            </div>
            
            {/* Step title - could be extracted to an array of step objects */}
            <div className="text-sm text-muted-foreground">
              {currentStep === 1 && "Welcome"}
              {currentStep === 2 && "Your Goals"}
              {currentStep === 3 && "Vault Setup"}
              {currentStep === 4 && "Quick Tips"}
            </div>
          </div>
        </div>
        
        {/* Step content */}
        <div className="px-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* Footer with navigation */}
        <div className="p-6 bg-background/50 backdrop-blur-sm border-t border-border/30 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handlePrevious}
            disabled={currentStep === 1 || isLoading}
            className={currentStep === 1 ? "invisible" : "hover:bg-background/80"}
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={isLoading}
            className="ml-auto bg-primary/90 hover:bg-primary shadow-sm transition-all duration-200"
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={currentStep === TOTAL_STEPS ? 'finish' : 'continue'}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
                className="flex items-center"
              >
                {currentStep === TOTAL_STEPS ? (
                  <>Get Started</>
                ) : (
                  <>Continue <ArrowRightIcon className="w-4 h-4 ml-2" /></>
                )}
              </motion.span>
            </AnimatePresence>
            {isLoading && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="ml-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"
              />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingFlow;