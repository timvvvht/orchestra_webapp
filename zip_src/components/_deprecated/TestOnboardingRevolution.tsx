import React, { useState } from 'react';
import OnboardingRevolution from './OnboardingRevolution';
import { Button } from '@/components/ui/button';

export default function TestOnboardingRevolution() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Onboarding Revolution Test</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Click below to experience the new onboarding flow that would make Steve Jobs 
          wake from the grave and Jony Ive question his life choices.
        </p>
        <Button 
          size="lg"
          onClick={() => setShowOnboarding(true)}
          className="bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700"
        >
          Launch Revolutionary Onboarding
        </Button>
      </div>
      
      <OnboardingRevolution 
        isOpen={showOnboarding} 
        onComplete={() => {
          setShowOnboarding(false);
          alert('Onboarding completed! The user is now emotionally invested and ready to create magic.');
        }} 
      />
    </div>
  );
}