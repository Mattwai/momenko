import AudioLatencyOptimizer from './AudioLatencyOptimizer';
import MemoryOptimizer from './MemoryOptimizer';
import NetworkOptimizer from './NetworkOptimizer';
import BatteryOptimizer from './BatteryOptimizer';
import CostMonitor from './CostMonitor';
import UsageAnalytics from './UsageAnalytics';

interface OverallPerformanceMetrics {
  audioPerformance: {
    averageLatency: number;
    successRate: number;
    healthStatus: 'excellent' | 'good' | 'warning' | 'critical';
  };
  memoryPerformance: {
    usage: number;
    healthStatus: 'excellent' | 'good' | 'warning' | 'critical';
    performanceScore: number;
  };
  networkPerformance: {
    quality: string;
    cacheHitRate: number;
    queueLength: number;
  };
  batteryPerformance: {
    level: number;
    healthStatus: 'excellent' | 'good' | 'warning' | 'critical';
    estimatedTime: number;
  };
  costPerformance: {
    dailyCost: number;
    monthlyProjection: number;
    budgetStatus: string;
  };
  usagePerformance: {
    usabilityScore: number;
    satisfactionScore: number;
    errorRate: number;
  };
  overallScore: number;
  recommendations: string[];
}

interface PerformanceConfig {
  elderlyOptimizations: boolean;
  aggressiveOptimization: boolean;
  autoOptimization: boolean;
  emergencyMode: boolean;
  familyReporting: boolean;
  costManagement: boolean;
  privacyCompliant: boolean;
}

class PerformanceManager {
  private config: PerformanceConfig = {
    elderlyOptimizations: true,
    aggressiveOptimization: false,
    autoOptimization: true,
    emergencyMode: false,
    familyReporting: false,
    costManagement: true,
    privacyCompliant: true
  };

  private monitoringInterval?: NodeJS.Timeout;
  private lastOptimizationTime = 0;
  private optimizationCooldown = 300000; // 5 minutes

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Initialize all performance services
      await BatteryOptimizer.loadPowerSavingPreference();
      
      // Start monitoring
      this.startPerformanceMonitoring();
      
      // Apply initial optimizations
      if (this.config.autoOptimization) {
        await this.applyInitialOptimizations();
      }
    } catch (error) {
      console.error('Error initializing performance manager:', error);
      await UsageAnalytics.trackError('performance_init_error', 8);
    }
  }

  private startPerformanceMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      await this.monitorPerformance();
    }, 60000); // Check every minute
  }

  private async monitorPerformance(): Promise<void> {
    try {
      const metrics = await this.getOverallMetrics();
      
      // Track performance metrics
      await UsageAnalytics.trackPerformanceMetric('response_time', metrics.audioPerformance.averageLatency);
      await UsageAnalytics.trackPerformanceMetric('error', metrics.usagePerformance.errorRate);
      await UsageAnalytics.trackPerformanceMetric('memory', metrics.memoryPerformance.usage);
      await UsageAnalytics.trackPerformanceMetric('battery', metrics.batteryPerformance.level);

      // Auto-optimize if performance is poor
      if (this.config.autoOptimization && metrics.overallScore < 70) {
        await this.autoOptimize(metrics);
      }

      // Handle emergency situations
      if (metrics.overallScore < 40 || metrics.batteryPerformance.healthStatus === 'critical') {
        await this.handleEmergencyOptimization(metrics);
      }

    } catch (error) {
      console.error('Error monitoring performance:', error);
      await UsageAnalytics.trackError('performance_monitoring_error', 6);
    }
  }

  async getOverallMetrics(): Promise<OverallPerformanceMetrics> {
    // Audio performance
    const audioReport = AudioLatencyOptimizer.getPerformanceReport();
    const audioHealth = audioReport.averageLatency < 2000 ? 'excellent' : 
                       audioReport.averageLatency < 3000 ? 'good' : 
                       audioReport.averageLatency < 5000 ? 'warning' : 'critical';

    // Memory performance  
    const memoryReport = MemoryOptimizer.getMemoryReport();
    
    // Network performance
    const networkMetrics = NetworkOptimizer.getNetworkMetrics();
    const queueStatus = NetworkOptimizer.getQueueStatus();
    const cacheStatus = NetworkOptimizer.getCacheStatus();

    // Battery performance
    const batteryMetrics = BatteryOptimizer.getBatteryMetrics();
    const batteryHealth = BatteryOptimizer.getBatteryHealthStatus();

    // Cost performance
    const costBreakdown = CostMonitor.getCostBreakdown();
    const budgetStatus = costBreakdown.daily > 2.0 ? 'over_budget' : 
                        costBreakdown.daily > 1.5 ? 'high_usage' : 'normal';

    // Usage performance
    const usageReport = UsageAnalytics.generateUsageReport();
    const accessibilityInsights = UsageAnalytics.getAccessibilityInsights();

    // Calculate overall score
    const scores = [
      audioReport.successRate,
      memoryReport.metrics.performanceScore,
      networkMetrics.reliability,
      batteryMetrics.level,
      Math.max(0, 100 - (costBreakdown.daily / 2.0 * 100)), // Cost score
      accessibilityInsights.usabilityScore
    ];
    const overallScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (audioHealth !== 'excellent') {
      recommendations.push('Optimize audio settings for better response time');
    }
    if (memoryReport.healthStatus === 'warning' || memoryReport.healthStatus === 'critical') {
      recommendations.push('Clear conversation history to improve memory usage');
    }
    if (queueStatus.queueLength > 5) {
      recommendations.push('Network queue is busy - check internet connection');
    }
    if (batteryHealth === 'warning' || batteryHealth === 'critical') {
      recommendations.push('Enable power saving mode to extend battery life');
    }
    if (budgetStatus !== 'normal') {
      recommendations.push('Consider reducing usage to manage costs');
    }
    if (accessibilityInsights.usabilityScore < 80) {
      recommendations.push('Adjust accessibility settings for better experience');
    }

    return {
      audioPerformance: {
        averageLatency: audioReport.averageLatency,
        successRate: audioReport.successRate,
        healthStatus: audioHealth
      },
      memoryPerformance: {
        usage: memoryReport.metrics.totalMemoryUsage,
        healthStatus: memoryReport.healthStatus,
        performanceScore: memoryReport.metrics.performanceScore
      },
      networkPerformance: {
        quality: networkMetrics.isConnected ? 'connected' : 'offline',
        cacheHitRate: cacheStatus.hitRate,
        queueLength: queueStatus.queueLength
      },
      batteryPerformance: {
        level: batteryMetrics.level,
        healthStatus: batteryHealth,
        estimatedTime: batteryMetrics.estimatedTimeRemaining
      },
      costPerformance: {
        dailyCost: costBreakdown.daily,
        monthlyProjection: costBreakdown.monthly,
        budgetStatus
      },
      usagePerformance: {
        usabilityScore: accessibilityInsights.usabilityScore,
        satisfactionScore: usageReport.conversationMetrics.satisfactionScore,
        errorRate: usageReport.performanceMetrics.errorRate
      },
      overallScore,
      recommendations
    };
  }

  private async autoOptimize(metrics: OverallPerformanceMetrics): Promise<void> {
    const now = Date.now();
    if (now - this.lastOptimizationTime < this.optimizationCooldown) {
      return; // Avoid too frequent optimizations
    }

    console.log('Auto-optimization triggered, overall score:', metrics.overallScore);

    // Audio optimizations
    if (metrics.audioPerformance.healthStatus !== 'excellent') {
      const audioConfig = AudioLatencyOptimizer.getPerformanceReport();
      if (audioConfig.recommendedSettings) {
        AudioLatencyOptimizer.updateConfig(audioConfig.recommendedSettings);
      }
    }

    // Memory optimizations
    if (metrics.memoryPerformance.healthStatus === 'warning') {
      await MemoryOptimizer.performRoutineCleanup();
    }

    // Battery optimizations
    if (metrics.batteryPerformance.level < 30) {
      BatteryOptimizer.setPowerSavingMode('eco');
    }

    // Network optimizations
    if (metrics.networkPerformance.queueLength > 10) {
      await NetworkOptimizer.clearQueue();
    }

    this.lastOptimizationTime = now;
    await UsageAnalytics.trackInteraction('navigation', undefined, undefined, {
      event: 'auto_optimization',
      trigger: 'low_performance_score',
      score: metrics.overallScore
    });
  }

  private async handleEmergencyOptimization(metrics: OverallPerformanceMetrics): Promise<void> {
    console.warn('Emergency optimization triggered');
    
    this.config.emergencyMode = true;

    // Aggressive memory cleanup
    await MemoryOptimizer.performEmergencyCleanup();

    // Enable ultra power saving
    if (metrics.batteryPerformance.level < 15) {
      BatteryOptimizer.setPowerSavingMode('ultra');
    }

    // Clear network caches
    await NetworkOptimizer.clearCache();

    // Clear audio cache
    await AudioLatencyOptimizer.clearCache();

    // Limit background tasks
    BatteryOptimizer.registerBackgroundTask('emergency_cleanup');

    await UsageAnalytics.trackInteraction('error', undefined, undefined, {
      event: 'emergency_optimization',
      metrics: {
        overallScore: metrics.overallScore,
        batteryLevel: metrics.batteryPerformance.level,
        memoryHealth: metrics.memoryPerformance.healthStatus
      }
    });
  }

  private async applyInitialOptimizations(): Promise<void> {
    // Apply elderly-specific optimizations
    if (this.config.elderlyOptimizations) {
      BatteryOptimizer.setPowerSavingMode('elderly');
      
      // Configure services for elderly users
      AudioLatencyOptimizer.updateConfig({
        elderlyOptimizations: true,
        maxLatency: 1500
      });

      MemoryOptimizer.updateConfig({
        elderlyOptimizations: true,
        maxActiveChunks: 2
      });

      NetworkOptimizer.updateConfig({
        elderlyOptimizations: true,
        baseTimeout: 15000
      });

      CostMonitor.updateConfig({
        elderlyOptimizations: true,
        familyReporting: this.config.familyReporting
      });

      UsageAnalytics.updateConfig({
        elderlyOptimizations: true,
        privacyCompliant: this.config.privacyCompliant
      });
    }
  }

  async trackAudioLatency(latency: number): Promise<void> {
    await UsageAnalytics.trackPerformanceMetric('response_time', latency);
  }

  async trackVoiceInteraction(type: 'input' | 'output', duration: number, culturalContext?: string): Promise<void> {
    await UsageAnalytics.trackInteraction(
      type === 'input' ? 'voice_input' : 'voice_output',
      duration,
      culturalContext
    );

    // Track audio activity for battery optimization
    BatteryOptimizer.reportAudioActivity(true);
    setTimeout(() => {
      BatteryOptimizer.reportAudioActivity(false);
    }, duration);

    // Track network activity
    NetworkOptimizer.reportNetworkActivity(0.5);
  }

  async trackConversation(
    duration: number,
    completed: boolean,
    satisfaction: number,
    culturalContext: string
  ): Promise<void> {
    await UsageAnalytics.trackConversationEnd(duration, completed, satisfaction, culturalContext);
    
    // Track costs
    const estimatedTokens = Math.ceil(duration / 1000 * 50); // Rough estimate
    await CostMonitor.trackOpenAICost(estimatedTokens * 0.7, estimatedTokens * 0.3, culturalContext);
  }

  async trackSpeechProcessing(characters: number, culturalContext?: string): Promise<void> {
    await CostMonitor.trackSpeechToTextCost(characters, culturalContext);
    await CostMonitor.trackTextToSpeechCost(characters, culturalContext);
  }

  async getPerformanceReport(): Promise<{
    metrics: OverallPerformanceMetrics;
    detailedReports: {
      audio: any;
      memory: any;
      network: any;
      battery: any;
      cost: any;
      usage: any;
    };
    status: 'excellent' | 'good' | 'warning' | 'critical';
    emergencyMode: boolean;
  }> {
    const metrics = await this.getOverallMetrics();
    
    const status: 'excellent' | 'good' | 'warning' | 'critical' = 
      metrics.overallScore >= 90 ? 'excellent' :
      metrics.overallScore >= 70 ? 'good' :
      metrics.overallScore >= 50 ? 'warning' : 'critical';

    return {
      metrics,
      detailedReports: {
        audio: AudioLatencyOptimizer.getPerformanceReport(),
        memory: MemoryOptimizer.getMemoryReport(),
        network: {
          metrics: NetworkOptimizer.getNetworkMetrics(),
          queue: NetworkOptimizer.getQueueStatus(),
          cache: NetworkOptimizer.getCacheStatus()
        },
        battery: BatteryOptimizer.getPowerUsageReport(),
        cost: CostMonitor.getFamilyReport(),
        usage: UsageAnalytics.generateUsageReport()
      },
      status,
      emergencyMode: this.config.emergencyMode
    };
  }

  async enableEmergencyMode(): Promise<void> {
    const metrics = await this.getOverallMetrics();
    await this.handleEmergencyOptimization(metrics);
  }

  async disableEmergencyMode(): Promise<void> {
    this.config.emergencyMode = false;
    
    // Restore normal power saving mode
    BatteryOptimizer.setPowerSavingMode('elderly');
    
    console.log('Emergency mode disabled');
  }

  async clearAllCaches(): Promise<void> {
    await Promise.all([
      AudioLatencyOptimizer.clearCache(),
      MemoryOptimizer.clearAllData(),
      NetworkOptimizer.clearCache()
    ]);
    
    console.log('All performance caches cleared');
  }

  updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Apply configuration changes to all services
    if (newConfig.elderlyOptimizations !== undefined) {
      AudioLatencyOptimizer.updateConfig({ elderlyOptimizations: newConfig.elderlyOptimizations });
      MemoryOptimizer.updateConfig({ elderlyOptimizations: newConfig.elderlyOptimizations });
      NetworkOptimizer.updateConfig({ elderlyOptimizations: newConfig.elderlyOptimizations });
      BatteryOptimizer.updateConfig({ elderlyOptimizations: newConfig.elderlyOptimizations });
      CostMonitor.updateConfig({ elderlyOptimizations: newConfig.elderlyOptimizations });
      UsageAnalytics.updateConfig({ elderlyOptimizations: newConfig.elderlyOptimizations });
    }
  }

  getConfig(): PerformanceConfig {
    return { ...this.config };
  }

  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    BatteryOptimizer.destroy();
  }
}

// Create and export singleton instance
const performanceManager = new PerformanceManager();

export {
  AudioLatencyOptimizer,
  MemoryOptimizer,
  NetworkOptimizer,
  BatteryOptimizer,
  CostMonitor,
  UsageAnalytics,
  performanceManager as PerformanceManager
};

export type {
  OverallPerformanceMetrics,
  PerformanceConfig
};

export default performanceManager;