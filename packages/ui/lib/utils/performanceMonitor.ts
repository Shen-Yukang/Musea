// Performance monitoring utility for Chrome extension
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetric> = new Map();
  private isEnabled = false;
  private reportInterval?: NodeJS.Timeout;

  private constructor() {
    // Enable performance monitoring in development
    this.isEnabled = process.env.NODE_ENV === 'development';
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Start monitoring
  start(): void {
    if (!this.isEnabled) return;

    console.log('🚀 Performance monitoring started');

    // Report metrics every 30 seconds
    this.reportInterval = setInterval(() => {
      this.reportMetrics();
    }, 30000);

    // Monitor memory usage
    this.startMemoryMonitoring();
  }

  // Stop monitoring
  stop(): void {
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.reportInterval = undefined;
    }

    this.metrics.clear();
    console.log('🛑 Performance monitoring stopped');
  }

  // Mark the start of an operation
  markStart(operationName: string): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name: operationName,
      startTime: performance.now(),
      endTime: 0,
      duration: 0,
      memoryBefore: this.getCurrentMemoryUsage(),
      memoryAfter: 0,
      count: (this.metrics.get(operationName)?.count || 0) + 1,
    };

    this.metrics.set(operationName, metric);
  }

  // Mark the end of an operation
  markEnd(operationName: string): void {
    if (!this.isEnabled) return;

    const metric = this.metrics.get(operationName);
    if (!metric) {
      console.warn(`Performance metric not found: ${operationName}`);
      return;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    metric.memoryAfter = this.getCurrentMemoryUsage();

    // Log slow operations
    if (metric.duration > 1000) {
      console.warn(`⚠️ Slow operation detected: ${operationName} took ${metric.duration.toFixed(2)}ms`);
    }
  }

  // Measure a function execution
  async measure<T>(operationName: string, fn: () => Promise<T>): Promise<T> {
    if (!this.isEnabled) {
      return await fn();
    }

    this.markStart(operationName);
    try {
      const result = await fn();
      this.markEnd(operationName);
      return result;
    } catch (error) {
      this.markEnd(operationName);
      console.error(`❌ Error in measured operation ${operationName}:`, error);
      throw error;
    }
  }

  // Get current memory usage
  private getCurrentMemoryUsage(): number {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  // Start memory monitoring
  private startMemoryMonitoring(): void {
    if (typeof performance === 'undefined' || !('memory' in performance)) {
      return;
    }

    setInterval(() => {
      const memory = (performance as any).memory;
      const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
      const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);

      // Warn if memory usage is high
      const usagePercent = (usedMB / limitMB) * 100;
      if (usagePercent > 80) {
        console.warn(`🚨 High memory usage: ${usedMB}MB/${limitMB}MB (${usagePercent.toFixed(1)}%)`);
      }

      // Store memory metric
      this.metrics.set('memory_usage', {
        name: 'memory_usage',
        startTime: performance.now(),
        endTime: performance.now(),
        duration: 0,
        memoryBefore: usedMB,
        memoryAfter: usedMB,
        count: 1,
        metadata: {
          used: usedMB,
          total: totalMB,
          limit: limitMB,
          usagePercent: usagePercent.toFixed(1),
        },
      });
    }, 10000); // Check every 10 seconds
  }

  // Report all metrics
  private reportMetrics(): void {
    if (this.metrics.size === 0) return;

    console.group('📊 Performance Report');

    // Sort metrics by average duration
    const sortedMetrics = Array.from(this.metrics.values())
      .filter(m => m.name !== 'memory_usage')
      .sort((a, b) => b.duration - a.duration);

    sortedMetrics.forEach(metric => {
      const avgDuration = metric.duration / metric.count;
      const memoryDiff = metric.memoryAfter - metric.memoryBefore;

      console.log(
        `${metric.name}: ${avgDuration.toFixed(2)}ms avg (${metric.count} calls)` +
          (memoryDiff !== 0 ? ` | Memory: ${memoryDiff > 0 ? '+' : ''}${(memoryDiff / 1024 / 1024).toFixed(2)}MB` : ''),
      );
    });

    // Report memory usage
    const memoryMetric = this.metrics.get('memory_usage');
    if (memoryMetric?.metadata) {
      console.log(
        `Memory: ${memoryMetric.metadata.used}MB/${memoryMetric.metadata.limit}MB (${memoryMetric.metadata.usagePercent}%)`,
      );
    }

    console.groupEnd();
  }

  // Get metrics for external reporting
  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  // Clear all metrics
  clearMetrics(): void {
    this.metrics.clear();
  }
}

// Performance metric interface
interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  memoryBefore: number;
  memoryAfter: number;
  count: number;
  metadata?: Record<string, any>;
}

// Decorator for measuring method performance
export function measurePerformance(operationName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const monitor = PerformanceMonitor.getInstance();
    const name = operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return await monitor.measure(name, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

// Hook for React components
export const usePerformanceMonitor = () => {
  const monitor = PerformanceMonitor.getInstance();

  return {
    markStart: monitor.markStart.bind(monitor),
    markEnd: monitor.markEnd.bind(monitor),
    measure: monitor.measure.bind(monitor),
    getMetrics: monitor.getMetrics.bind(monitor),
  };
};

// Global performance monitor instance
export const performanceMonitor = PerformanceMonitor.getInstance();
