# User Preferences Utilities

This directory contains utility functions for managing user preferences stored in localStorage.

## Available Functions

### User Name

```typescript
// Get the user's name
const userName = getUserName();

// Set the user's name
setUserName('John Doe');
```

### User Goals

```typescript
// Get the user's selected goals as an array
const userGoals = getUserGoals();

// Set the user's goals (accepts array or comma-separated string)
setUserGoals(['organize', 'automate']);
setUserGoals('organize,automate');

// Legacy support (deprecated)
const userGoal = getUserGoal(); // Returns comma-separated string
setUserGoal('organize,automate');
```

### Onboarding Status

```typescript
// Check if onboarding is completed
const completed = isOnboardingCompleted();

// Mark onboarding as completed
setOnboardingCompleted();
```

### All Preferences

```typescript
// Get all user preferences as an object
const preferences = getAllUserPreferences();
// { userName: string | null, userGoal: string | null, userGoals: string[], onboardingCompleted: boolean }

// Clear all user preferences
clearUserPreferences();
```

## Components

We also provide ready-to-use components that utilize these utilities:

### UserGreeting

A simple component to display a personalized greeting:

```tsx
<UserGreeting 
  prefix="Hello," 
  suffix="!" 
  fallback="there"
/>
```

### UserProfileCard

A card component that displays and allows editing of user profile information:

```tsx
<UserProfileCard className="max-w-md" />
```

## Example

See `src/examples/UserProfileExample.tsx` for a complete example of how to use these components.