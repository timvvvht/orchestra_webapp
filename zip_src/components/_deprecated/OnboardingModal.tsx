import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Assuming AgentCard might use this or similar
import { getDefaultVaultPath, ensureDirectoryExists } from '@/api/settingsApi';
import { useSettingsStore } from '@/stores/settingsStore'; // Assuming this store exists and has setVaultSetting
import { open } from '@tauri-apps/plugin-dialog'; // For folder selection
import { AtomIcon, FolderOpenIcon, LightbulbIcon, ZapIcon } from 'lucide-react'; // Example icons

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

const TOTAL_STEPS = 3; // Example: 1. Welcome, 2. Vault Setup, 3. Quick Tips

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [proposedVaultPath, setProposedVaultPath] = useState('');
  const [selectedVaultPath, setSelectedVaultPath] = useState(''); // To hold user's choice before saving to store

  const setVaultSetting = useSettingsStore((state) => state.setVaultSetting);
  const vaultPathFromStore = useSettingsStore((state) => state.settings.vault.path);

  // Fetch default vault path when component mounts or when vault path from store changes (e.g. external update)
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      getDefaultVaultPath()
        .then((path) => {
          setProposedVaultPath(path);
          // If no path is in store, pre-fill selected path with default
          if (!vaultPathFromStore) {
            setSelectedVaultPath(path);
          } else {
            setSelectedVaultPath(vaultPathFromStore); // Or use what's already in store
          }
        })
        .catch((error) => {
          console.error('Failed to fetch default vault path:', error);
          setProposedVaultPath('Error fetching path'); // Show error in UI
          setSelectedVaultPath('Error fetching path');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, vaultPathFromStore]);
  
  // Effect for Step 2 to re-fetch/re-set proposed path if user navigates back and forth
  // and to ensure selectedVaultPath is initialized from store or default.
  useEffect(() => {
    if (currentStep === 2 && isOpen) {
      setIsLoading(true);
      getDefaultVaultPath()
        .then((defaultPath) => {
          setProposedVaultPath(defaultPath);
          // Prioritize store path, then proposed default, then empty.
          setSelectedVaultPath(vaultPathFromStore || defaultPath || '');
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [currentStep, isOpen, vaultPathFromStore]);


  const handleChooseFolder = async () => {
    try {
      const result = await open({ directory: true, multiple: false });
      if (typeof result === 'string') {
        setSelectedVaultPath(result);
      }
    } catch (err) {
      console.error('Error selecting folder:', err);
      // Optionally, show an error to the user in the modal
    }
  };

  const handleUseDefaultPath = async () => {
    if (proposedVaultPath && proposedVaultPath !== 'Error fetching path') {
      setSelectedVaultPath(proposedVaultPath);
      // As per recipe, ensure directory exists if using default, though this might be better done on Finish
      // For now, let's stick to recipe: call ensureDirectoryExists if using the default.
      // However, the primary save to store should happen on "Next" from this step or "Finish".
      try {
        setIsLoading(true);
        await ensureDirectoryExists(proposedVaultPath);
      } catch (error) {
        console.error('Failed to ensure default directory exists:', error);
        // Potentially show an error to the user
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Step content rendering
  const renderStepContent = useCallback(() => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Welcome to Your Application!</h3>
            <p>
              We're excited to help you get started. This quick onboarding will guide you through the initial setup.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Automated Workflows</CardTitle>
                  <ZapIcon className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Leverage pre-built agents to automate your tasks.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Customizable Agents</CardTitle>
                  <AtomIcon className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Tailor agents to your specific needs and workflows.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Vault Setup</h3>
            <p>
              Your application needs a "vault" directory to store data, notes, and configurations. 
              Please choose a location for your vault.
            </p>
            <div className="space-y-2">
              <label htmlFor="vaultPathInput" className="text-sm font-medium">
                Proposed Vault Path:
              </label>
              <Input 
                id="vaultPathInput" 
                type="text" 
                value={selectedVaultPath || (isLoading ? 'Loading...' : proposedVaultPath)} 
                onChange={(e) => setSelectedVaultPath(e.target.value)} 
                placeholder="Select or confirm your vault path"
              />
              {proposedVaultPath === 'Error fetching path' && <p className='text-red-500 text-xs'>Could not fetch a default path. Please choose one.</p>}
              <p className="text-xs text-muted-foreground">
                This is where your application data will be stored locally. 
                You can change this later in settings, but it is crucial for initial setup.
              </p>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleChooseFolder} disabled={isLoading}>
                <FolderOpenIcon className="w-4 h-4 mr-2" /> Choose Folder
              </Button>
              <Button 
                onClick={handleUseDefaultPath} 
                disabled={isLoading || !proposedVaultPath || proposedVaultPath === 'Error fetching path'}
              >
                Use Default Path
              </Button>
            </div>
            {isLoading && <p className="text-sm text-muted-foreground">Checking path...</p>}
          </div>
        );
      case 3: // Placeholder for "Quick Tips" or other steps
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Quick Tips</h3>
            <div className="flex items-center space-x-2">
              <LightbulbIcon className="w-5 h-5 text-yellow-500" />
              <p>Tip 1: Explore the settings panel to customize your experience.</p>
            </div>
            <div className="flex items-center space-x-2">
              <LightbulbIcon className="w-5 h-5 text-yellow-500" />
              <p>Tip 2: Use the command palette (Ctrl+K) for quick actions.</p>
            </div>
          </div>
        );
      default:
        return <div>Unknown Step</div>;
    }
  }, [currentStep, isLoading, proposedVaultPath, selectedVaultPath, handleChooseFolder, handleUseDefaultPath]);

  const handleNext = async () => {
    if (currentStep === 2) { // Moving from Vault Setup step
      if (!selectedVaultPath || selectedVaultPath === 'Error fetching path') {
        // Optionally, show an error message in the modal UI
        console.error('Vault path is not set. Please select a path.');
        // alert('Vault path is not set. Please select a path.'); // Or use a more integrated UI notification
        return; // Prevent proceeding without a vault path
      }
      setIsLoading(true);
      try {
        await ensureDirectoryExists(selectedVaultPath); // Ensure the selected directory exists
        setVaultSetting('path', selectedVaultPath); // Save to Zustand store, which should persist it
        console.log('Vault path set to:', selectedVaultPath);
      } catch (error) {
        console.error('Error processing vault path:', error);
        setIsLoading(false);
        // Optionally, show an error message to the user
        return; // Prevent proceeding if there was an error
      } finally {
        setIsLoading(false);
      }
    }

    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    } else {
      // Finish action
      setIsLoading(true);
      try {
        // Ensure vault path is finalized if it somehow wasn't (e.g., if last step was vault setup)
        if (currentStep === TOTAL_STEPS && (!vaultPathFromStore || vaultPathFromStore !== selectedVaultPath) && selectedVaultPath && selectedVaultPath !== 'Error fetching path') {
          await ensureDirectoryExists(selectedVaultPath);
          setVaultSetting('path', selectedVaultPath);
          console.log('Final vault path ensured and set to:', selectedVaultPath);
        }
        localStorage.setItem('onboardingCompleted', 'true');
        onComplete();
      } catch (error) {
        console.error('Error during finish action:', error);
        // Handle error, perhaps show a message to the user
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
  
  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onComplete(); }}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Onboarding - Step {currentStep} of {TOTAL_STEPS}</DialogTitle>
          {currentStep === 1 && <DialogDescription>Welcome to the application! Let\'s get you set up.</DialogDescription>}
          {currentStep === 2 && <DialogDescription>Let\'s set up your data vault. This is where your notes and configurations will be stored.</DialogDescription>}
          {currentStep === 3 && <DialogDescription>Here are some quick tips to get you started.</DialogDescription>}
        </DialogHeader>
        
        <div className="py-4">
          {isLoading && currentStep === 2 ? <p>Loading default path...</p> : renderStepContent()}
        </div>

        <DialogFooter className="justify-between">
          {currentStep > 1 ? (
            <Button variant="outline" onClick={handlePrevious}>
              Previous
            </Button>
          ) : (
            <div /> // Placeholder to keep "Next" button to the right
          )}
          <Button onClick={handleNext}>
            {currentStep === TOTAL_STEPS ? 'Finish' : 'Next'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingModal;
