/**
 * Service Health Utilities
 * 
 * Provides utility functions for:
 * - Health status evaluation
 * - Performance metrics calculation
 * - Error analysis and reporting
 * - Service recovery recommendations
 */

export interface HealthMetrics {
  uptime: number;
  errorRate: number;
  reconnectRate: number;
  lastErrorTime?: number;
  averageResponseTime?: number;
}

export interface HealthStatus {
  level: 'healthy' | 'warning' | 'critical' | 'unknown';
  score: number; // 0-100
  issues: string[];
  recommendations: string[];
}

/**
 * Evaluate overall health status based on metrics
 */
export function evaluateHealthStatus(metrics: HealthMetrics): HealthStatus {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 100;

  // Check uptime (penalize if less than 5 minutes)
  if (metrics.uptime < 5 * 60 * 1000) {
    issues.push('Service recently started or restarted');
    score -= 10;
  }

  // Check error rate (penalize if > 5%)
  if (metrics.errorRate > 0.05) {
    issues.push(`High error rate: ${(metrics.errorRate * 100).toFixed(1)}%`);
    recommendations.push('Check logs for recurring errors');
    score -= 20;
  }

  // Check reconnect rate (penalize if > 10%)
  if (metrics.reconnectRate > 0.1) {
    issues.push(`High reconnection rate: ${(metrics.reconnectRate * 100).toFixed(1)}%`);
    recommendations.push('Check network stability and server connectivity');
    score -= 15;
  }

  // Check recent errors
  if (metrics.lastErrorTime && (Date.now() - metrics.lastErrorTime) < 5 * 60 * 1000) {
    issues.push('Recent error detected');
    score -= 10;
  }

  // Check response time
  if (metrics.averageResponseTime && metrics.averageResponseTime > 5000) {
    issues.push(`Slow response time: ${metrics.averageResponseTime}ms`);
    recommendations.push('Check system resources and network latency');
    score -= 15;
  }

  // Determine health level
  let level: HealthStatus['level'];
  if (score >= 90) {
    level = 'healthy';
  } else if (score >= 70) {
    level = 'warning';
  } else if (score >= 50) {
    level = 'critical';
  } else {
    level = 'unknown';
  }

  // Add general recommendations
  if (score < 90) {
    recommendations.push('Monitor service logs for additional details');
  }
  if (score < 70) {
    recommendations.push('Consider restarting services if issues persist');
  }

  return {
    level,
    score: Math.max(0, score),
    issues,
    recommendations
  };
}

/**
 * Calculate error rate from error count and uptime
 */
export function calculateErrorRate(errorCount: number, uptime: number): number {
  if (uptime <= 0) return 0;
  
  // Calculate errors per hour
  const hoursUp = uptime / (1000 * 60 * 60);
  return hoursUp > 0 ? errorCount / hoursUp : 0;
}

/**
 * Calculate reconnection rate from reconnect attempts and uptime
 */
export function calculateReconnectRate(reconnectAttempts: number, uptime: number): number {
  if (uptime <= 0) return 0;
  
  // Calculate reconnects per hour
  const hoursUp = uptime / (1000 * 60 * 60);
  return hoursUp > 0 ? reconnectAttempts / hoursUp : 0;
}

/**
 * Format uptime duration in human-readable format
 */
export function formatUptime(uptime: number): string {
  const seconds = Math.floor(uptime / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Get health status icon/emoji
 */
export function getHealthIcon(level: HealthStatus['level']): string {
  switch (level) {
    case 'healthy':
      return '🟢';
    case 'warning':
      return '🟡';
    case 'critical':
      return '🔴';
    case 'unknown':
    default:
      return '⚪';
  }
}

/**
 * Get health status color for UI
 */
export function getHealthColor(level: HealthStatus['level']): string {
  switch (level) {
    case 'healthy':
      return 'text-green-500';
    case 'warning':
      return 'text-yellow-500';
    case 'critical':
      return 'text-red-500';
    case 'unknown':
    default:
      return 'text-gray-500';
  }
}

/**
 * Generate health report summary
 */
export function generateHealthReport(
  orchestratorMetrics: HealthMetrics,
  firehoseConnected: boolean,
  firehoseReconnects: number
): {
  overall: HealthStatus;
  orchestrator: HealthStatus;
  firehose: HealthStatus;
  summary: string;
} {
  // Evaluate orchestrator health
  const orchestrator = evaluateHealthStatus(orchestratorMetrics);

  // Evaluate firehose health
  const firehoseMetrics: HealthMetrics = {
    uptime: orchestratorMetrics.uptime, // Assume same uptime
    errorRate: 0,
    reconnectRate: calculateReconnectRate(firehoseReconnects, orchestratorMetrics.uptime)
  };

  if (!firehoseConnected) {
    firehoseMetrics.errorRate = 1; // 100% error if not connected
  }

  const firehose = evaluateHealthStatus(firehoseMetrics);

  // Calculate overall health (weighted average)
  const overallScore = Math.round((orchestrator.score * 0.7) + (firehose.score * 0.3));
  const overallIssues = [...orchestrator.issues, ...firehose.issues];
  const overallRecommendations = [...orchestrator.recommendations, ...firehose.recommendations];

  let overallLevel: HealthStatus['level'];
  if (overallScore >= 90) {
    overallLevel = 'healthy';
  } else if (overallScore >= 70) {
    overallLevel = 'warning';
  } else if (overallScore >= 50) {
    overallLevel = 'critical';
  } else {
    overallLevel = 'unknown';
  }

  const overall: HealthStatus = {
    level: overallLevel,
    score: overallScore,
    issues: overallIssues,
    recommendations: overallRecommendations
  };

  // Generate summary
  const summary = `Overall: ${getHealthIcon(overall.level)} ${overall.score}/100 | ` +
    `Orchestrator: ${getHealthIcon(orchestrator.level)} ${orchestrator.score}/100 | ` +
    `Firehose: ${getHealthIcon(firehose.level)} ${firehose.score}/100`;

  return {
    overall,
    orchestrator,
    firehose,
    summary
  };
}

/**
 * Check if services need attention
 */
export function needsAttention(status: HealthStatus): boolean {
  return status.level === 'critical' || status.level === 'warning';
}

/**
 * Get next recommended action
 */
export function getNextAction(status: HealthStatus): string | null {
  if (status.recommendations.length > 0) {
    return status.recommendations[0];
  }
  
  if (status.level === 'critical') {
    return 'Restart services immediately';
  }
  
  if (status.level === 'warning') {
    return 'Monitor closely and check logs';
  }
  
  return null;
}

/**
 * Export all utilities as default
 */
export default {
  evaluateHealthStatus,
  calculateErrorRate,
  calculateReconnectRate,
  formatUptime,
  getHealthIcon,
  getHealthColor,
  generateHealthReport,
  needsAttention,
  getNextAction
};
