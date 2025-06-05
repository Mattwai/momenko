import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface BatteryMetrics {
  level: number; // 0-100%
  isCharging: boolean;
  estimatedTimeRemaining: number; // minutes
  powerUsageRate: number; // % per hour
  timestamp: number;
  screenBrightness: number;
  networkActivity: number;
  audioActivity: number;
}

interface PowerSavingMode {
  name: 'normal' | 'eco' | 'ultra' | 'elderly';
  screenBrightness: number; // 0-1
  audioQuality: 'high' | 'medium' | 'low';
  networkBatching: boolean;
  backgroundSync: boolean;
  hapticFeedback: boolean;
  animationsEnabled: boolean;
  maxConcurrentTasks: number;
  culturalContentCaching: boolean;
}

interface BatteryOptimizationConfig {
  lowBatteryThreshold: number; // %
  criticalBatteryThreshold: number; // %
  autoEcoModeThreshold: number; // %
  elderlyOptimizations: boolean;
  aggressivePowerSaving: boolean;
  smartBrightnessControl: boolean;
  backgroundTaskLimiting: boolean;
  batteryUsageTracking: boolean;
}

class BatteryOptimizer {
  private config: BatteryOptimizationConfig;
  private metrics: BatteryMetrics;
  private currentMode: PowerSavingMode;
  private powerSavingModes: Map<string, PowerSavingMode> = new Map();
  private batteryHistory: BatteryMetrics[] = [];
  private backgroundTasks: Set<string> = new Set();
  private monitoringInterval?: NodeJS.Timeout;
  private lastBatteryLevel = 100;
  private powerUsageStartTime = Date.now();

  constructor() {
    this.config = {
      lowBatteryThreshold: 30,
      criticalBatteryThreshold: 15,
      autoEcoModeThreshold: 20,
      elderlyOptimizations: true,
      aggressivePowerSaving: true,
      smartBrightnessControl: true,
      backgroundTaskLimiting: true,
      batteryUsageTracking: true
    };

    this.metrics = {
      level: 100,
      isCharging: false,
      estimatedTimeRemaining: 0,
      powerUsageRate: 0,
      timestamp: Date.now(),
      screenBrightness: 0.8,
      networkActivity: 0,
      audioActivity: 0
    };

    this.initializePowerSavingModes();
    this.currentMode = this.powerSavingModes.get('elderly')!;
    this.startBatteryMonitoring();
    this.loadBatteryHistory();
  }

  private initializePowerSavingModes(): void {
    // Normal mode
    this.powerSavingModes.set('normal', {
      name: 'normal',
      screenBrightness: 0.8,
      audioQuality: 'high',
      networkBatching: false,
      backgroundSync: true,
      hapticFeedback: true,
      animationsEnabled: true,
      maxConcurrentTasks: 5,
      culturalContentCaching: true
    });

    // Eco mode
    this.powerSavingModes.set('eco', {
      name: 'eco',
      screenBrightness: 0.6,
      audioQuality: 'medium',
      networkBatching: true,
      backgroundSync: false,
      hapticFeedback: false,
      animationsEnabled: false,
      maxConcurrentTasks: 3,
      culturalContentCaching: true
    });

    // Ultra power saving mode
    this.powerSavingModes.set('ultra', {
      name: 'ultra',
      screenBrightness: 0.3,
      audioQuality: 'low',
      networkBatching: true,
      backgroundSync: false,
      hapticFeedback: false,
      animationsEnabled: false,
      maxConcurrentTasks: 1,
      culturalContentCaching: false
    });

    // Elderly optimized mode
    this.powerSavingModes.set('elderly', {
      name: 'elderly',
      screenBrightness: 0.9, // Higher brightness for visibility
      audioQuality: 'high', // Clear audio is important
      networkBatching: true,
      backgroundSync: false,
      hapticFeedback: true, // Helpful feedback
      animationsEnabled: false, // Less confusion
      maxConcurrentTasks: 2,
      culturalContentCaching: true
    });
  }

  private startBatteryMonitoring(): void {
    // Note: React Native doesn't have direct battery API access
    // This is a simulation based on usage patterns
    this.monitoringInterval = setInterval(() => {
      this.updateBatteryMetrics();
      this.checkBatteryStatus();
      this.optimizeBasedOnBattery();
    }, 60000); // Check every minute

    // Monitor network state for battery optimization
    NetInfo.addEventListener(state => {
      if (state.isConnected) {
        this.metrics.networkActivity = 1;
      } else {
        this.metrics.networkActivity = 0;
      }
    });
  }

  private updateBatteryMetrics(): void {
    // Simulate battery level decrease based on usage
    const timeElapsed = Date.now() - this.powerUsageStartTime;
    const hoursElapsed = timeElapsed / (1000 * 60 * 60);
    
    // Calculate power usage rate based on current activities
    let usageRate = this.calculatePowerUsageRate();
    
    // Apply power saving mode adjustments
    usageRate *= this.getPowerSavingMultiplier();
    
    const estimatedDecrease = usageRate * hoursElapsed;
    this.metrics.level = Math.max(0, this.lastBatteryLevel - estimatedDecrease);
    
    this.metrics.powerUsageRate = usageRate;
    this.metrics.estimatedTimeRemaining = this.metrics.level / usageRate * 60; // minutes
    this.metrics.timestamp = Date.now();

    // Record in history
    this.batteryHistory.push({ ...this.metrics });
    
    // Keep only last 24 hours of data
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    this.batteryHistory = this.batteryHistory.filter(m => m.timestamp > oneDayAgo);
    
    this.saveBatteryHistory();
  }

  private calculatePowerUsageRate(): number {
    let baseRate = 2; // 2% per hour base usage
    
    // Screen brightness impact
    baseRate += this.metrics.screenBrightness * 3;
    
    // Network activity impact
    baseRate += this.metrics.networkActivity * 2;
    
    // Audio activity impact
    baseRate += this.metrics.audioActivity * 1.5;
    
    // Background tasks impact
    baseRate += this.backgroundTasks.size * 0.5;
    
    return baseRate;
  }

  private getPowerSavingMultiplier(): number {
    switch (this.currentMode.name) {
      case 'normal': return 1.0;
      case 'eco': return 0.7;
      case 'ultra': return 0.4;
      case 'elderly': return 0.8; // Balanced for elderly needs
      default: return 1.0;
    }
  }

  private checkBatteryStatus(): void {
    const level = this.metrics.level;
    
    if (level <= this.config.criticalBatteryThreshold && !this.metrics.isCharging) {
      this.handleCriticalBattery();
    } else if (level <= this.config.lowBatteryThreshold && !this.metrics.isCharging) {
      this.handleLowBattery();
    } else if (level <= this.config.autoEcoModeThreshold && this.currentMode.name === 'normal') {
      this.enableAutoEcoMode();
    }
  }

  private handleCriticalBattery(): void {
    this.setPowerSavingMode('ultra');
    
    if (this.config.elderlyOptimizations) {
      Alert.alert(
        'Critical Battery',
        'Battery is very low. The app has been optimized to extend usage time. Please charge your device soon.',
        [
          { text: 'OK' },
          { text: 'Find Charger Help', onPress: () => this.showChargingHelp() }
        ]
      );
    }
    
    // Disable non-essential features
    this.limitBackgroundTasks();
    this.reduceCulturalContentCaching();
  }

  private handleLowBattery(): void {
    if (this.currentMode.name === 'normal') {
      this.setPowerSavingMode('eco');
    }
    
    if (this.config.elderlyOptimizations) {
      Alert.alert(
        'Low Battery',
        'Battery is getting low. Would you like to enable power saving mode?',
        [
          { text: 'Not Now' },
          { text: 'Enable', onPress: () => this.setPowerSavingMode('eco') }
        ]
      );
    }
  }

  private enableAutoEcoMode(): void {
    this.setPowerSavingMode('eco');
    
    if (this.config.elderlyOptimizations) {
      Alert.alert(
        'Power Saving Enabled',
        'Eco mode has been automatically enabled to extend battery life.',
        [{ text: 'OK' }]
      );
    }
  }

  private showChargingHelp(): void {
    Alert.alert(
      'Charging Help',
      'To charge your device:\n\n1. Connect the charging cable to your device\n2. Plug the other end into a power outlet\n3. Look for the charging symbol on your screen\n\nIf you need help, ask a family member or caregiver.',
      [{ text: 'OK' }]
    );
  }

  private optimizeBasedOnBattery(): void {
    if (!this.config.aggressivePowerSaving) return;
    
    // Adjust screen brightness based on battery level
    if (this.config.smartBrightnessControl) {
      const batteryRatio = this.metrics.level / 100;
      const targetBrightness = Math.max(0.3, this.currentMode.screenBrightness * batteryRatio);
      this.adjustScreenBrightness(targetBrightness);
    }
    
    // Limit background tasks based on battery level
    if (this.config.backgroundTaskLimiting && this.metrics.level < 50) {
      this.limitBackgroundTasks();
    }
  }

  setPowerSavingMode(modeName: 'normal' | 'eco' | 'ultra' | 'elderly'): void {
    const mode = this.powerSavingModes.get(modeName);
    if (!mode) return;
    
    const previousMode = this.currentMode.name;
    this.currentMode = mode;
    
    // Apply mode settings
    this.adjustScreenBrightness(mode.screenBrightness);
    this.adjustAudioQuality(mode.audioQuality);
    this.configureBatchedNetworking(mode.networkBatching);
    this.configureBackgroundSync(mode.backgroundSync);
    this.configureHapticFeedback(mode.hapticFeedback);
    this.configureAnimations(mode.animationsEnabled);
    this.configureCulturalContentCaching(mode.culturalContentCaching);
    
    console.log(`Power saving mode changed from ${previousMode} to ${modeName}`);
    
    // Save preference
    this.savePowerSavingPreference(modeName);
  }

  private adjustScreenBrightness(brightness: number): void {
    this.metrics.screenBrightness = Math.max(0.1, Math.min(1.0, brightness));
    // Note: In a real implementation, this would call native brightness control
    console.log(`Screen brightness adjusted to ${(this.metrics.screenBrightness * 100).toFixed(0)}%`);
  }

  private adjustAudioQuality(quality: 'high' | 'medium' | 'low'): void {
    // This would integrate with the audio services
    console.log(`Audio quality set to ${quality}`);
  }

  private configureBatchedNetworking(enabled: boolean): void {
    // This would integrate with NetworkOptimizer
    console.log(`Batched networking ${enabled ? 'enabled' : 'disabled'}`);
  }

  private configureBackgroundSync(enabled: boolean): void {
    console.log(`Background sync ${enabled ? 'enabled' : 'disabled'}`);
  }

  private configureHapticFeedback(enabled: boolean): void {
    console.log(`Haptic feedback ${enabled ? 'enabled' : 'disabled'}`);
  }

  private configureAnimations(enabled: boolean): void {
    console.log(`Animations ${enabled ? 'enabled' : 'disabled'}`);
  }

  private configureCulturalContentCaching(enabled: boolean): void {
    console.log(`Cultural content caching ${enabled ? 'enabled' : 'disabled'}`);
  }

  registerBackgroundTask(taskId: string): void {
    if (this.backgroundTasks.size >= this.currentMode.maxConcurrentTasks) {
      console.warn(`Maximum concurrent tasks (${this.currentMode.maxConcurrentTasks}) reached`);
      return;
    }
    
    this.backgroundTasks.add(taskId);
    console.log(`Background task registered: ${taskId}`);
  }

  unregisterBackgroundTask(taskId: string): void {
    this.backgroundTasks.delete(taskId);
    console.log(`Background task unregistered: ${taskId}`);
  }

  private limitBackgroundTasks(): void {
    const limit = Math.max(1, Math.floor(this.currentMode.maxConcurrentTasks / 2));
    
    if (this.backgroundTasks.size > limit) {
      const tasksToRemove = Array.from(this.backgroundTasks).slice(limit);
      tasksToRemove.forEach(taskId => {
        this.backgroundTasks.delete(taskId);
        console.log(`Background task limited: ${taskId}`);
      });
    }
  }

  private reduceCulturalContentCaching(): void {
    // This would integrate with cultural services to reduce caching
    console.log('Reducing cultural content caching to save battery');
  }

  reportAudioActivity(isActive: boolean): void {
    this.metrics.audioActivity = isActive ? 1 : 0;
  }

  reportNetworkActivity(level: number): void {
    this.metrics.networkActivity = Math.max(0, Math.min(1, level));
  }

  getBatteryMetrics(): BatteryMetrics {
    return { ...this.metrics };
  }

  getCurrentPowerSavingMode(): PowerSavingMode {
    return { ...this.currentMode };
  }

  getPowerUsageReport(): {
    currentLevel: number;
    estimatedTimeRemaining: number;
    averageUsageRate: number;
    powerSavingMode: string;
    recommendations: string[];
  } {
    const avgUsageRate = this.batteryHistory.length > 0 
      ? this.batteryHistory.reduce((sum, m) => sum + m.powerUsageRate, 0) / this.batteryHistory.length
      : this.metrics.powerUsageRate;

    const recommendations: string[] = [];

    if (this.metrics.level < 30) {
      recommendations.push('Enable power saving mode');
      recommendations.push('Reduce screen brightness');
      recommendations.push('Close unnecessary apps');
    }

    if (this.metrics.powerUsageRate > 5) {
      recommendations.push('High power usage detected');
      recommendations.push('Consider reducing audio usage');
    }

    if (this.backgroundTasks.size > 3) {
      recommendations.push('Too many background tasks active');
    }

    if (this.currentMode.name === 'normal' && this.metrics.level < 50) {
      recommendations.push('Consider switching to eco mode');
    }

    return {
      currentLevel: this.metrics.level,
      estimatedTimeRemaining: this.metrics.estimatedTimeRemaining,
      averageUsageRate: avgUsageRate,
      powerSavingMode: this.currentMode.name,
      recommendations
    };
  }

  getBatteryHealthStatus(): 'excellent' | 'good' | 'warning' | 'critical' {
    if (this.metrics.level > 70) return 'excellent';
    if (this.metrics.level > 30) return 'good';
    if (this.metrics.level > 15) return 'warning';
    return 'critical';
  }

  private async saveBatteryHistory(): Promise<void> {
    try {
      const historyToSave = this.batteryHistory.slice(-100); // Keep last 100 entries
      await AsyncStorage.setItem('battery_history', JSON.stringify(historyToSave));
    } catch (error) {
      console.error('Error saving battery history:', error);
    }
  }

  private async loadBatteryHistory(): Promise<void> {
    try {
      const historyData = await AsyncStorage.getItem('battery_history');
      if (historyData) {
        this.batteryHistory = JSON.parse(historyData);
      }
    } catch (error) {
      console.error('Error loading battery history:', error);
    }
  }

  private async savePowerSavingPreference(mode: string): Promise<void> {
    try {
      await AsyncStorage.setItem('power_saving_mode', mode);
    } catch (error) {
      console.error('Error saving power saving preference:', error);
    }
  }

  async loadPowerSavingPreference(): Promise<void> {
    try {
      const savedMode = await AsyncStorage.getItem('power_saving_mode');
      if (savedMode && this.powerSavingModes.has(savedMode)) {
        this.setPowerSavingMode(savedMode as 'performance' | 'balanced' | 'eco' | 'ultra_eco');
      }
    } catch (error) {
      console.error('Error loading power saving preference:', error);
    }
  }

  updateConfig(newConfig: Partial<BatteryOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  simulateBatteryLevel(level: number): void {
    // For testing purposes
    this.metrics.level = Math.max(0, Math.min(100, level));
    this.lastBatteryLevel = this.metrics.level;
    this.checkBatteryStatus();
  }

  simulateChargingState(isCharging: boolean): void {
    // For testing purposes
    this.metrics.isCharging = isCharging;
    if (isCharging && this.currentMode.name === 'ultra') {
      // Switch back to elderly mode when charging
      this.setPowerSavingMode('elderly');
    }
  }

  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }

  async clearBatteryData(): Promise<void> {
    try {
      this.batteryHistory = [];
      await AsyncStorage.removeItem('battery_history');
      await AsyncStorage.removeItem('power_saving_mode');
    } catch (error) {
      console.error('Error clearing battery data:', error);
    }
  }
}

export default new BatteryOptimizer();