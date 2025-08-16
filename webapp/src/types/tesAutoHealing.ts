/**
 * TypeScript interfaces for TES Manager Auto Healing functionality
 */

export interface AutoHealingConfig {
  /** Whether auto healing is enabled */
  enabled: boolean;
  /** Interval between health checks in seconds */
  health_check_interval_secs: number;
  /** Timeout for each health check in seconds */
  health_check_timeout_secs: number;
  /** Number of consecutive failures before attempting restart */
  max_failures_before_restart: number;
  /** Maximum number of restart attempts before giving up */
  max_restart_attempts: number;
  /** Base multiplier for exponential backoff between restart attempts */
  restart_backoff_multiplier: number;
  /** Maximum backoff time between restart attempts in seconds */
  max_restart_backoff_secs: number;
  /** Whether to emit healing events to the frontend */
  emit_healing_events: boolean;
}

export interface HealingState {
  /** Whether the TES server is currently healthy */
  is_healthy: boolean;
  /** Number of consecutive health check failures */
  consecutive_failures: number;
  /** Number of restart attempts made */
  restart_attempts: number;
  /** Total number of successful restarts */
  total_restarts: number;
  /** Timestamp of the last health check (ISO string) */
  last_health_check: string | null;
  /** Timestamp of the last restart attempt (ISO string) */
  last_restart_attempt: string | null;
  /** Timestamp when the current uptime period started (ISO string) */
  uptime_start: string;
}

export type HealingEvent = 
  | { type: 'HealthCheckStarted'; timestamp: string }
  | { type: 'HealthCheckPassed'; timestamp: string; response_time_ms: number }
  | { type: 'HealthCheckFailed'; timestamp: string; error: string; consecutive_failures: number }
  | { type: 'RestartInitiated'; timestamp: string; reason: string; attempt: number }
  | { type: 'RestartCompleted'; timestamp: string; success: boolean; duration_ms: number }
  | { type: 'SessionRecoveryStarted'; timestamp: string; session_count: number }
  | { type: 'SessionRecoveryCompleted'; timestamp: string; recovered_sessions: number; failed_sessions: number }
  | { type: 'HealingDisabled'; timestamp: string; reason: string };

/**
 * TES Manager Auto Healing API
 */
export interface TesAutoHealingApi {
  /** Get current healing state */
  getHealingState(): Promise<HealingState>;
  
  /** Get current healing configuration */
  getHealingConfig(): Promise<AutoHealingConfig>;
  
  /** Update healing configuration */
  updateHealingConfig(config: AutoHealingConfig): Promise<void>;
  
  /** Force an immediate health check */
  forceHealthCheck(): Promise<void>;
  
  /** Manually restart the TES server */
  restartServer(): Promise<void>;
  
  /** Stop the auto healing system */
  stopAutoHealing(): Promise<void>;
}

/**
 * Default auto healing configuration
 */
export const DEFAULT_AUTO_HEALING_CONFIG: AutoHealingConfig = {
  enabled: true,
  health_check_interval_secs: 30,
  health_check_timeout_secs: 10,
  max_failures_before_restart: 3,
  max_restart_attempts: 5,
  restart_backoff_multiplier: 2.0,
  max_restart_backoff_secs: 300, // 5 minutes
  emit_healing_events: true,
};

/**
 * Utility functions for working with healing data
 */
export class HealingUtils {
  /** Calculate uptime in seconds */
  static getUptimeSeconds(state: HealingState): number {
    const now = new Date();
    const uptimeStart = new Date(state.uptime_start);
    return Math.floor((now.getTime() - uptimeStart.getTime()) / 1000);
  }
  
  /** Format uptime as human-readable string */
  static formatUptime(state: HealingState): string {
    const seconds = this.getUptimeSeconds(state);
    
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes}m ${seconds % 60}s`;
    } else if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    } else {
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      return `${days}d ${hours}h`;
    }
  }
  
  /** Get health status as human-readable string */
  static getHealthStatus(state: HealingState): string {
    if (state.is_healthy) {
      return 'Healthy';
    } else if (state.consecutive_failures === 1) {
      return 'Warning';
    } else if (state.consecutive_failures < 3) {
      return 'Degraded';
    } else {
      return 'Critical';
    }
  }
  
  /** Get health status color for UI */
  static getHealthStatusColor(state: HealingState): string {
    if (state.is_healthy) {
      return 'green';
    } else if (state.consecutive_failures === 1) {
      return 'yellow';
    } else if (state.consecutive_failures < 3) {
      return 'orange';
    } else {
      return 'red';
    }
  }
  
  /** Format timestamp as relative time */
  static formatRelativeTime(timestamp: string | null): string {
    if (!timestamp) return 'Never';
    
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    
    if (diffSeconds < 60) {
      return `${diffSeconds}s ago`;
    } else if (diffSeconds < 3600) {
      const minutes = Math.floor(diffSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffSeconds < 86400) {
      const hours = Math.floor(diffSeconds / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffSeconds / 86400);
      return `${days}d ago`;
    }
  }
}