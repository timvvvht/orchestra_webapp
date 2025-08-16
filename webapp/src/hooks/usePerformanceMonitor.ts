/**
 * usePerformanceMonitor Hook - Webapp Stub Implementation
 * 
 * Stub implementation for performance monitoring in webapp.
 * Provides the same interface as desktop version but without actual monitoring.
 * 
 * TODO: Implement full performance monitoring when needed
 */

import { useState, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  componentCount: number;
  lastUpdate: string;
}

interface UsePerformanceMonitorReturn {
  metrics: PerformanceMetrics;
  isMonitoring: boolean;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  recordMetric: (name: string, value: number) => void;
  getMetric: (name: string) => number | undefined;
}

export function usePerformanceMonitor(): UsePerformanceMonitorReturn {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [metrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    componentCount: 0,
    lastUpdate: new Date().toISOString(),
  });

  const startMonitoring = useCallback(() => {
    console.log('📊 [usePerformanceMonitor] STUB: Would start performance monitoring');
    setIsMonitoring(true);
  }, []);

  const stopMonitoring = useCallback(() => {
    console.log('📊 [usePerformanceMonitor] STUB: Would stop performance monitoring');
    setIsMonitoring(false);
  }, []);

  const recordMetric = useCallback((name: string, value: number) => {
    console.log('📊 [usePerformanceMonitor] STUB: Would record metric:', { name, value });
  }, []);

  const getMetric = useCallback((name: string): number | undefined => {
    console.log('📊 [usePerformanceMonitor] STUB: Would get metric:', name);
    return undefined;
  }, []);

  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    recordMetric,
    getMetric,
  };
}