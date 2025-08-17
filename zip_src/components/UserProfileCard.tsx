import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getUserName, getUserGoals, setUserName } from '@/utils/userPreferences';
import { useState } from 'react';
import { BookOpenIcon, ZapIcon, RocketIcon } from 'lucide-react';

interface UserProfileCardProps {
  /** Optional className for styling */
  className?: string;
}

/**
 * A component that displays and allows editing of user profile information
 */
const UserProfileCard: React.FC<UserProfileCardProps> = ({ className = '' }) => {
  const storedName = getUserName();
  const userGoals = getUserGoals();
  
  const [userName, setUserNameState] = useState(storedName || '');
  const [isEditing, setIsEditing] = useState(false);
  
  const handleSave = () => {
    setUserName(userName);
    setIsEditing(false);
  };
  
  const getGoalIcon = (goalId: string) => {
    switch (goalId) {
      case 'organize':
        return <BookOpenIcon className="h-4 w-4 text-primary" />;
      case 'automate':
        return <ZapIcon className="h-4 w-4 text-primary" />;
      case 'collaborate':
        return <RocketIcon className="h-4 w-4 text-primary" />;
      default:
        return <BookOpenIcon className="h-4 w-4 text-primary" />;
    }
  };
  
  const getGoalInfo = (goalId: string) => {
    switch (goalId) {
      case 'organize':
        return {
          label: 'Organize my knowledge',
          description: 'Create a structured system for notes, ideas, and research'
        };
      case 'automate':
        return {
          label: 'Automate repetitive tasks',
          description: 'Save time with workflows and smart assistants'
        };
      case 'collaborate':
        return {
          label: 'Collaborate with my team',
          description: 'Share information and work together seamlessly'
        };
      default:
        return {
          label: 'Using Orchestra',
          description: 'General usage'
        };
    }
  };
  
  const getGoalLabel = (goalId: string) => {
    return getGoalInfo(goalId).label;
  };
  
  const getGoalDescription = (goalId: string) => {
    return getGoalInfo(goalId).description;
  };
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Your Profile</CardTitle>
        <CardDescription>Manage your personal settings</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          {isEditing ? (
            <Input
              id="name"
              value={userName}
              onChange={(e) => setUserNameState(e.target.value)}
              placeholder="Your name"
            />
          ) : (
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium">{userName || 'Not set'}</p>
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            </div>
          )}
        </div>
        
        {userGoals.length > 0 && (
          <div className="space-y-2">
            <Label>{userGoals.length > 1 ? 'Your Goals' : 'Primary Goal'}</Label>
            <div className="space-y-2">
              {userGoals.map((goalId) => (
                <div key={goalId} className="p-3 bg-muted/50 rounded-md">
                  <div className="flex items-center">
                    <div className="bg-primary/10 p-1.5 rounded-full mr-3">
                      {getGoalIcon(goalId)}
                    </div>
                    <span className="text-sm font-medium">{getGoalLabel(goalId)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-8">{getGoalDescription(goalId)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      
      {isEditing && (
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default UserProfileCard;