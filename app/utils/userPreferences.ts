/**
 * Utility functions for managing user preferences stored in localStorage
 */

/**
 * Get the user's name from localStorage
 * @returns The user's name or null if not set
 */
export function getUserName(): string | null {
  return localStorage.getItem("userName");
}

/**
 * Set the user's name in localStorage
 * @param name The name to store
 */
export function setUserName(name: string): void {
  localStorage.setItem("userName", name);
}

/**
 * Get the user's selected goals from localStorage
 * @returns Array of user goals or empty array if none set
 */
export function getUserGoals(): string[] {
  const goalsString = localStorage.getItem("userGoal");
  if (!goalsString) return [];
  return goalsString.split(",");
}

/**
 * Get the user's selected goal from localStorage (legacy support)
 * @returns The user's goal or null if not set
 * @deprecated Use getUserGoals() instead
 */
export function getUserGoal(): string | null {
  return localStorage.getItem("userGoal");
}

/**
 * Set the user's goals in localStorage
 * @param goals Array of goals or comma-separated string of goals
 */
export function setUserGoals(goals: string[] | string): void {
  if (Array.isArray(goals)) {
    localStorage.setItem("userGoal", goals.join(","));
  } else {
    localStorage.setItem("userGoal", goals);
  }
}

/**
 * Set the user's goal in localStorage (legacy support)
 * @param goal The goal to store
 * @deprecated Use setUserGoals() instead
 */
export function setUserGoal(goal: string): void {
  localStorage.setItem("userGoal", goal);
}

/**
 * Check if the user has completed onboarding
 * @returns True if onboarding is completed, false otherwise
 */
export function isOnboardingCompleted(): boolean {
  return localStorage.getItem("onboardingCompleted") === "true";
}

/**
 * Mark onboarding as completed
 */
export function setOnboardingCompleted(): void {
  localStorage.setItem("onboardingCompleted", "true");
}

/**
 * Get all user preferences as an object
 * @returns An object containing all user preferences
 */
export function getAllUserPreferences(): {
  userName: string | null;
  userGoal: string | null;
  userGoals: string[];
  onboardingCompleted: boolean;
} {
  return {
    userName: getUserName(),
    userGoal: getUserGoal(),
    userGoals: getUserGoals(),
    onboardingCompleted: isOnboardingCompleted(),
  };
}

/**
 * Clear all user preferences from localStorage
 */
export function clearUserPreferences(): void {
  localStorage.removeItem("userName");
  localStorage.removeItem("userGoal");
  localStorage.removeItem("onboardingCompleted");
}
