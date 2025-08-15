/**
 * Optimized API utilities for performance tracking and optimized operations
 */

/**
 * Simple performance tracking utility
 */
export const perfTracker = {
  timers: new Map<string, number>(),
  
  /**
   * Start timing an operation
   */
  start(operation: string): void {
    this.timers.set(operation, performance.now());
  },
  
  /**
   * End timing an operation and log the result
   */
  end(operation: string, message?: string): number {
    const startTime = this.timers.get(operation);
    if (startTime === undefined) {
      console.warn(`No timer found for operation: ${operation}`);
      return 0;
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Format duration for better readability
    let formattedDuration: string;
    if (duration < 1) {
      formattedDuration = `${(duration * 1000).toFixed(2)}μs`;
    } else if (duration < 1000) {
      formattedDuration = `${duration.toFixed(2)}ms`;
    } else {
      formattedDuration = `${(duration / 1000).toFixed(2)}s`;
    }
    
    // Log with or without message
    if (message) {
      console.log(`⏱️ ${operation}: ${formattedDuration} - ${message}`);
    } else {
      console.log(`⏱️ ${operation}: ${formattedDuration}`);
    }
    
    // Clean up
    this.timers.delete(operation);
    
    return duration;
  }
};