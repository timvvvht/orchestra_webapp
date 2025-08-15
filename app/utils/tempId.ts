/**
 * Generate temporary IDs for optimistic UI updates
 * Used when we need a React key before getting the real ID from backend
 * 
 * @deprecated This function should not be used for session creation.
 * Sessions should always await real backend IDs to avoid race conditions.
 */
export const genTempId = () => `temp-${Date.now()}`;