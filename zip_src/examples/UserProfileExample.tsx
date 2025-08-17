import React from 'react';
import UserGreeting from '@/components/UserGreeting';
import UserProfileCard from '@/components/UserProfileCard';

/**
 * Example component showing how to use the user profile components
 */
const UserProfileExample: React.FC = () => {
  return (
    <div className="p-6 space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground">
          <UserGreeting 
            prefix="Welcome back," 
            suffix="! Here's what's new today."
            fallback="friend"
          />
        </p>
      </div>
      
      <div className="max-w-md">
        <UserProfileCard />
      </div>
    </div>
  );
};

export default UserProfileExample;