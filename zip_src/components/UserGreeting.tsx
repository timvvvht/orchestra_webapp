import React from 'react';
import { getUserName } from '@/utils/userPreferences';

interface UserGreetingProps {
  /** Prefix text before the name */
  prefix?: string;
  /** Suffix text after the name */
  suffix?: string;
  /** Default text to show if no name is available */
  fallback?: string;
  /** Optional className for styling */
  className?: string;
}

/**
 * A component that displays a personalized greeting using the user's name
 */
const UserGreeting: React.FC<UserGreetingProps> = ({
  prefix = 'Hello,',
  suffix = '',
  fallback = 'there',
  className = '',
}) => {
  const userName = getUserName();
  
  return (
    <span className={className}>
      {prefix} {userName || fallback}{suffix}
    </span>
  );
};

export default UserGreeting;