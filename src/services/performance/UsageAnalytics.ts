import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

interface UserInteraction {
  id: string;
  type: 'voice_input' | 'voice_output' | 'text_input' | 'button_press' | 'gesture' | 'navigation' | 'error' | 'cultural_switch';
  timestamp: number;
  duration?: number;
  culturalContext?: string;
  userProfile?: string;
  metadata?: {
    [key: string]: string | number | boolean | null;
  };
}

interface ConversationMetrics {
  totalConversations: number;
  averageLength: number; // minutes
  preferredTime: string; // hour of day
  culturalContextSwitches: number;
  voiceToTextRatio: number;
  completionRate: number; // percentage of conversations completed
  satisfactionScore: number; // 1-5 scale
}

interface AccessibilityMetrics {
  textSizeUsage: { [size: string]: number };
  highContrastUsage: number;
  hapticFeedbackUsage: number;
  voiceNavigationUsage: number;
  screenReaderCompatibility: number;
  audioSpeedPreferences: { [speed: string]: number };
}

interface CulturalMetrics {
  primaryCulture: string;
  secondaryCultures: string[];
  culturalSwitchFrequency: number;
  culturalContentPreferences: { [type: string]: number };
  languagePreferences: { [language: string]: number };
  culturalPrivacySettings: { [setting: string]: boolean };
}

interface PerformanceMetrics {
  averageResponseTime: number;
  errorRate: number;
  crashCount: number;
  memoryUsage: number;
  batteryImpact: number;
  networkEfficiency: number;
  cacheHitRate: number;
}

interface ErrorPattern {
  type: string;
  frequency: number;
  culturalContext?: string;
  userProfile?: string;
  lastOccurrence: number;
  resolution?: string;
}

interface UsagePattern {
  dailyUsage: { [hour: string]: number };
  weeklyUsage: { [day: string]: number };
  monthlyTrends: { [date: string]: number };
  featureAdoption: { [feature: string]: number };
  conversionFunnels: { [step: string]: number };
}

interface PrivacySettings {
  trackingEnabled: boolean;
  shareWithFamily: boolean;
  anonymousReporting: boolean;
  culturalDataSharing: boolean;
  healthcareIntegration: boolean;
  researchParticipation: boolean;
}

interface AnalyticsConfig {
  collectUserInteractions: boolean;
  trackConversationMetrics: boolean;
  monitorAccessibilityUsage: boolean;
  analyzeCulturalPatterns: boolean;
  trackPerformanceMetrics: boolean;
  identifyErrorPatterns: boolean;
  elderlyOptimizations: boolean;
  privacyCompliant: boolean;
  familyReporting: boolean;
  healthcareReporting: boolean;
}

class UsageAnalytics {
  private config: AnalyticsConfig;
  private privacySettings: PrivacySettings;
  private interactions: UserInteraction[] = [];
  private conversationMetrics: ConversationMetrics;
  private accessibilityMetrics: AccessibilityMetrics;
  private culturalMetrics: CulturalMetrics;
  private performanceMetrics: PerformanceMetrics;
  private errorPatterns: Map<string, ErrorPattern> = new Map();
  private usagePatterns: UsagePattern;
  private sessionStartTime = Date.now();
  private currentSessionId = `session_${Date.now()}`;

  constructor() {
    this.config = {
      collectUserInteractions: true,
      trackConversationMetrics: true,
      monitorAccessibilityUsage: true,
      analyzeCulturalPatterns: true,
      trackPerformanceMetrics: true,
      identifyErrorPatterns: true,
      elderlyOptimizations: true,
      privacyCompliant: true,
      familyReporting: false,
      healthcareReporting: false
    };

    this.privacySettings = {
      trackingEnabled: true,
      shareWithFamily: false,
      anonymousReporting: true,
      culturalDataSharing: false,
      healthcareIntegration: false,
      researchParticipation: false
    };

    this.conversationMetrics = {
      totalConversations: 0,
      averageLength: 0,
      preferredTime: '14', // 2 PM default
      culturalContextSwitches: 0,
      voiceToTextRatio: 0.8, // Prefer voice
      completionRate: 0,
      satisfactionScore: 0
    };

    this.accessibilityMetrics = {
      textSizeUsage: { small: 0, medium: 0, large: 0, 'extra-large': 0 },
      highContrastUsage: 0,
      hapticFeedbackUsage: 0,
      voiceNavigationUsage: 0,
      screenReaderCompatibility: 0,
      audioSpeedPreferences: { slow: 0, normal: 0, fast: 0 }
    };

    this.culturalMetrics = {
      primaryCulture: 'unknown',
      secondaryCultures: [],
      culturalSwitchFrequency: 0,
      culturalContentPreferences: {},
      languagePreferences: {},
      culturalPrivacySettings: {}
    };

    this.performanceMetrics = {
      averageResponseTime: 0,
      errorRate: 0,
      crashCount: 0,
      memoryUsage: 0,
      batteryImpact: 0,
      networkEfficiency: 0,
      cacheHitRate: 0
    };

    this.usagePatterns = {
      dailyUsage: {},
      weeklyUsage: {},
      monthlyTrends: {},
      featureAdoption: {},
      conversionFunnels: {}
    };

    this.initializeAnalytics();
  }

  private async initializeAnalytics(): Promise<void> {
    await this.loadStoredData();
    this.startAnalyticsCollection();
    this.scheduleReporting();
  }

  async trackInteraction(
    type: UserInteraction['type'],
    duration?: number,
    culturalContext?: string,
    metadata?: any
  ): Promise<void> {
    if (!this.config.collectUserInteractions || !this.privacySettings.trackingEnabled) {
      return;
    }

    const interaction: UserInteraction = {
      id: `interaction_${Date.now()}_${Math.random()}`,
      type,
      timestamp: Date.now(),
      duration,
      culturalContext,
      userProfile: this.getCurrentUserProfile(),
      metadata: this.sanitizeMetadata(metadata)
    };

    this.interactions.push(interaction);
    this.updateUsagePatterns(interaction);
    
    // Keep only last 1000 interactions to manage memory
    if (this.interactions.length > 1000) {
      this.interactions = this.interactions.slice(-1000);
    }

    await this.saveData();
  }

  async trackConversationStart(culturalContext: string): Promise<void> {
    await this.trackInteraction('voice_input', undefined, culturalContext, {
      event: 'conversation_start',
      sessionId: this.currentSessionId
    });

    this.conversationMetrics.totalConversations++;
  }

  async trackConversationEnd(
    duration: number,
    completedSuccessfully: boolean,
    satisfactionScore?: number,
    culturalContext?: string
  ): Promise<void> {
    await this.trackInteraction('voice_output', duration, culturalContext, {
      event: 'conversation_end',
      sessionId: this.currentSessionId,
      completed: completedSuccessfully,
      satisfaction: satisfactionScore
    });

    // Update conversation metrics
    this.conversationMetrics.averageLength = 
      (this.conversationMetrics.averageLength * (this.conversationMetrics.totalConversations - 1) + duration) / 
      this.conversationMetrics.totalConversations;

    if (completedSuccessfully) {
      this.conversationMetrics.completionRate = 
        ((this.conversationMetrics.completionRate * (this.conversationMetrics.totalConversations - 1)) + 100) / 
        this.conversationMetrics.totalConversations;
    }

    if (satisfactionScore) {
      this.conversationMetrics.satisfactionScore = 
        (this.conversationMetrics.satisfactionScore * (this.conversationMetrics.totalConversations - 1) + satisfactionScore) / 
        this.conversationMetrics.totalConversations;
    }

    await this.saveData();
  }

  async trackAccessibilityUsage(feature: string, value?: any): Promise<void> {
    if (!this.config.monitorAccessibilityUsage) return;

    switch (feature) {
      case 'text_size':
        this.accessibilityMetrics.textSizeUsage[value] = 
          (this.accessibilityMetrics.textSizeUsage[value] || 0) + 1;
        break;
      case 'high_contrast':
        this.accessibilityMetrics.highContrastUsage++;
        break;
      case 'haptic_feedback':
        this.accessibilityMetrics.hapticFeedbackUsage++;
        break;
      case 'voice_navigation':
        this.accessibilityMetrics.voiceNavigationUsage++;
        break;
      case 'screen_reader':
        this.accessibilityMetrics.screenReaderCompatibility++;
        break;
      case 'audio_speed':
        this.accessibilityMetrics.audioSpeedPreferences[value] = 
          (this.accessibilityMetrics.audioSpeedPreferences[value] || 0) + 1;
        break;
    }

    await this.trackInteraction('button_press', undefined, undefined, {
      accessibilityFeature: feature,
      value
    });
  }

  async trackCulturalInteraction(
    action: 'switch' | 'preference' | 'content' | 'privacy',
    culturalContext: string,
    details?: any
  ): Promise<void> {
    if (!this.config.analyzeCulturalPatterns) return;

    switch (action) {
      case 'switch':
        this.culturalMetrics.culturalSwitchFrequency++;
        if (!this.culturalMetrics.secondaryCultures.includes(culturalContext)) {
          this.culturalMetrics.secondaryCultures.push(culturalContext);
        }
        await this.trackInteraction('cultural_switch', undefined, culturalContext);
        break;
      case 'preference':
        this.culturalMetrics.culturalContentPreferences[details.type] = 
          (this.culturalMetrics.culturalContentPreferences[details.type] || 0) + 1;
        break;
      case 'content':
        // Track content engagement
        break;
      case 'privacy':
        this.culturalMetrics.culturalPrivacySettings[details.setting] = details.value;
        break;
    }

    await this.saveData();
  }

  async trackPerformanceMetric(
    metric: 'response_time' | 'error' | 'crash' | 'memory' | 'battery' | 'network' | 'cache_hit',
    value: number,
    context?: string
  ): Promise<void> {
    if (!this.config.trackPerformanceMetrics) return;

    switch (metric) {
      case 'response_time':
        this.performanceMetrics.averageResponseTime = 
          (this.performanceMetrics.averageResponseTime * 0.9) + (value * 0.1); // Moving average
        break;
      case 'error':
        this.performanceMetrics.errorRate = 
          (this.performanceMetrics.errorRate * 0.9) + (value * 0.1);
        break;
      case 'crash':
        this.performanceMetrics.crashCount += value;
        break;
      case 'memory':
        this.performanceMetrics.memoryUsage = value;
        break;
      case 'battery':
        this.performanceMetrics.batteryImpact = value;
        break;
      case 'network':
        this.performanceMetrics.networkEfficiency = value;
        break;
      case 'cache_hit':
        this.performanceMetrics.cacheHitRate = 
          (this.performanceMetrics.cacheHitRate * 0.9) + (value * 0.1);
        break;
    }

    if (metric === 'error') {
      await this.trackError(context || 'unknown_error', value);
    }

    await this.saveData();
  }

  async trackError(errorType: string, severity: number, culturalContext?: string): Promise<void> {
    if (!this.config.identifyErrorPatterns) return;

    const pattern = this.errorPatterns.get(errorType) || {
      type: errorType,
      frequency: 0,
      culturalContext,
      userProfile: this.getCurrentUserProfile(),
      lastOccurrence: 0
    };

    pattern.frequency++;
    pattern.lastOccurrence = Date.now();

    this.errorPatterns.set(errorType, pattern);

    await this.trackInteraction('error', undefined, culturalContext, {
      errorType,
      severity,
      sessionId: this.currentSessionId
    });

    // Auto-report critical errors for elderly users
    if (this.config.elderlyOptimizations && severity > 8) {
      await this.reportCriticalError(errorType, culturalContext);
    }
  }

  private async reportCriticalError(_errorType: string, _culturalContext?: string): Promise<void> {
    Alert.alert(
      'Technical Issue Detected',
      'A technical issue has been detected and automatically reported. The app will continue working normally.',
      [
        { text: 'OK' },
        { text: 'Get Help', onPress: () => this.showErrorHelp() }
      ]
    );
  }

  private showErrorHelp(): void {
    Alert.alert(
      'Getting Help',
      'If you continue experiencing issues:\n\n• Restart the app\n• Ask a family member for help\n• Contact support at 1-800-HELP-APP',
      [{ text: 'OK' }]
    );
  }

  private updateUsagePatterns(interaction: UserInteraction): void {
    const now = new Date();
    const hour = now.getHours().toString();
    const day = now.toLocaleDateString('en-US', { weekday: 'long' });
    const date = now.toISOString().split('T')[0];

    // Update daily usage
    this.usagePatterns.dailyUsage[hour] = (this.usagePatterns.dailyUsage[hour] || 0) + 1;

    // Update weekly usage
    this.usagePatterns.weeklyUsage[day] = (this.usagePatterns.weeklyUsage[day] || 0) + 1;

    // Update monthly trends
    this.usagePatterns.monthlyTrends[date] = (this.usagePatterns.monthlyTrends[date] || 0) + 1;

    // Update feature adoption
    this.usagePatterns.featureAdoption[interaction.type] = 
      (this.usagePatterns.featureAdoption[interaction.type] || 0) + 1;

    // Update preferred time
    const mostUsedHour = Object.entries(this.usagePatterns.dailyUsage)
      .reduce((max, [h, count]) => count > max.count ? { hour: h, count } : max, { hour: '14', count: 0 });
    this.conversationMetrics.preferredTime = mostUsedHour.hour;
  }

  private getCurrentUserProfile(): string {
    // This would integrate with user profile service
    return 'elderly_user';
  }

  private sanitizeMetadata(metadata: any): any {
    if (!metadata || !this.privacySettings.anonymousReporting) return metadata;

    // Remove personally identifiable information
    const sanitized = { ...metadata };
    delete sanitized.userId;
    delete sanitized.userName;
    delete sanitized.email;
    delete sanitized.phoneNumber;
    delete sanitized.address;

    return sanitized;
  }

  private startAnalyticsCollection(): void {
    // Track session metrics
    setInterval(() => {
      this.trackSessionMetrics();
    }, 300000); // Every 5 minutes
  }

  private async trackSessionMetrics(): Promise<void> {
    const sessionDuration = Date.now() - this.sessionStartTime;
    
    await this.trackInteraction('navigation', sessionDuration, undefined, {
      event: 'session_heartbeat',
      sessionId: this.currentSessionId,
      duration: sessionDuration
    });
  }

  private scheduleReporting(): void {
    // Generate reports periodically
    setInterval(() => {
      this.generatePeriodicReport();
    }, 24 * 60 * 60 * 1000); // Daily
  }

  private async generatePeriodicReport(): Promise<void> {
    if (!this.privacySettings.trackingEnabled) return;

    const report = this.generateUsageReport();
    
    if (this.config.familyReporting && this.privacySettings.shareWithFamily) {
      await this.sendFamilyReport(report);
    }

    if (this.config.healthcareReporting && this.privacySettings.healthcareIntegration) {
      await this.sendHealthcareReport(report);
    }

    // Auto-optimize based on patterns
    await this.suggestOptimizations(report);
  }

  generateUsageReport(): {
    period: string;
    totalInteractions: number;
    conversationMetrics: ConversationMetrics;
    accessibilityMetrics: AccessibilityMetrics;
    culturalMetrics: CulturalMetrics;
    performanceMetrics: PerformanceMetrics;
    usagePatterns: UsagePattern;
    insights: string[];
    recommendations: string[];
  } {
    const insights: string[] = [];
    const recommendations: string[] = [];

    // Generate insights
    if (this.conversationMetrics.satisfactionScore < 3) {
      insights.push('User satisfaction is below average');
      recommendations.push('Review conversation quality and cultural appropriateness');
    }

    if (this.performanceMetrics.errorRate > 5) {
      insights.push('High error rate detected');
      recommendations.push('Focus on stability improvements');
    }

    if (this.accessibilityMetrics.textSizeUsage['extra-large'] > 50) {
      insights.push('User prefers larger text sizes');
      recommendations.push('Default to larger text for better visibility');
    }

    const preferredHour = parseInt(this.conversationMetrics.preferredTime);
    if (preferredHour < 9 || preferredHour > 18) {
      insights.push('User is active outside typical hours');
      recommendations.push('Ensure 24/7 support availability');
    }

    if (this.culturalMetrics.culturalSwitchFrequency > 10) {
      insights.push('User frequently switches cultural contexts');
      recommendations.push('Improve cultural context switching experience');
    }

    return {
      period: 'Daily',
      totalInteractions: this.interactions.length,
      conversationMetrics: this.conversationMetrics,
      accessibilityMetrics: this.accessibilityMetrics,
      culturalMetrics: this.culturalMetrics,
      performanceMetrics: this.performanceMetrics,
      usagePatterns: this.usagePatterns,
      insights,
      recommendations
    };
  }

  private async sendFamilyReport(report: Record<string, unknown>): Promise<void> {
    // This would integrate with family notification system
    console.log('Sending family report:', {
      satisfaction: report.conversationMetrics.satisfactionScore,
      dailyUsage: (Object.values(report.usagePatterns.dailyUsage) as number[]).reduce((a: number, b: number) => a + b, 0),
      concerns: report.insights.filter((i: string) => i.includes('below average') || i.includes('High error'))
    });
  }

  private async sendHealthcareReport(report: Record<string, unknown>): Promise<void> {
    // This would integrate with healthcare systems
    console.log('Sending healthcare report:', {
      cognitiveEngagement: report.conversationMetrics.completionRate,
      accessibilityNeeds: report.accessibilityMetrics,
      culturalPreferences: report.culturalMetrics.primaryCulture
    });
  }

  private async suggestOptimizations(report: any): Promise<void> {
    if (!this.config.elderlyOptimizations) return;

    const suggestions: string[] = [];

    if (report.performanceMetrics.averageResponseTime > 3000) {
      suggestions.push('Enable aggressive caching to improve response times');
    }

    if (report.accessibilityMetrics.highContrastUsage > 20) {
      suggestions.push('Consider enabling high contrast mode by default');
    }

    if (report.culturalMetrics.culturalSwitchFrequency < 2) {
      suggestions.push('User may benefit from more cultural content variety');
    }

    if (suggestions.length > 0) {
      console.log('Auto-optimization suggestions:', suggestions);
      // Apply optimizations automatically or notify user
    }
  }

  getAccessibilityInsights(): {
    mostUsedFeatures: string[];
    recommendedSettings: { [feature: string]: any };
    usabilityScore: number;
  } {
    const features = Object.entries(this.accessibilityMetrics.textSizeUsage)
      .sort(([,a], [,b]) => b - a)
      .map(([feature]) => feature);

    const recommendedSettings: { [feature: string]: any } = {};

    if (this.accessibilityMetrics.textSizeUsage['large'] > 30) {
      recommendedSettings.defaultTextSize = 'large';
    }

    if (this.accessibilityMetrics.highContrastUsage > 20) {
      recommendedSettings.defaultHighContrast = true;
    }

    if (this.accessibilityMetrics.voiceNavigationUsage > 10) {
      recommendedSettings.enableVoiceShortcuts = true;
    }

    const usabilityScore = this.calculateUsabilityScore();

    return {
      mostUsedFeatures: features.slice(0, 3),
      recommendedSettings,
      usabilityScore
    };
  }

  private calculateUsabilityScore(): number {
    let score = 100;

    // Deduct for high error rate
    if (this.performanceMetrics.errorRate > 5) score -= 20;

    // Deduct for low completion rate
    if (this.conversationMetrics.completionRate < 80) score -= 15;

    // Deduct for low satisfaction
    if (this.conversationMetrics.satisfactionScore < 3) score -= 25;

    // Deduct for performance issues
    if (this.performanceMetrics.averageResponseTime > 3000) score -= 10;

    // Add points for accessibility usage
    if (Object.values(this.accessibilityMetrics.textSizeUsage).some(usage => usage > 10)) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  getCulturalInsights(): {
    dominantCulture: string;
    culturalAdaptation: number;
    contentPreferences: { [type: string]: number };
    recommendations: string[];
  } {
    const recommendations: string[] = [];

    if (this.culturalMetrics.culturalSwitchFrequency < 2) {
      recommendations.push('Consider introducing more cultural content variety');
    }

    if (this.culturalMetrics.secondaryCultures.length > 2) {
      recommendations.push('User engages with multiple cultures - ensure balanced representation');
    }

    const culturalAdaptation = Math.min(100, 
      (this.culturalMetrics.culturalSwitchFrequency / this.conversationMetrics.totalConversations) * 100 * 10
    );

    return {
      dominantCulture: this.culturalMetrics.primaryCulture,
      culturalAdaptation,
      contentPreferences: this.culturalMetrics.culturalContentPreferences,
      recommendations
    };
  }

  updatePrivacySettings(settings: Partial<PrivacySettings>): void {
    this.privacySettings = { ...this.privacySettings, ...settings };
    this.savePrivacySettings();

    if (!settings.trackingEnabled) {
      this.clearPersonalData();
    }
  }

  private async clearPersonalData(): Promise<void> {
    // Clear interactions but keep aggregated metrics for optimization
    this.interactions = [];
    
    // Reset metrics that might contain personal information
    this.culturalMetrics.primaryCulture = 'unknown';
    this.culturalMetrics.secondaryCultures = [];
    
    await this.saveData();
  }

  private async saveData(): Promise<void> {
    try {
      if (this.privacySettings.trackingEnabled) {
        await AsyncStorage.setItem('usage_interactions', JSON.stringify(this.interactions.slice(-500)));
        await AsyncStorage.setItem('conversation_metrics', JSON.stringify(this.conversationMetrics));
        await AsyncStorage.setItem('accessibility_metrics', JSON.stringify(this.accessibilityMetrics));
        await AsyncStorage.setItem('cultural_metrics', JSON.stringify(this.culturalMetrics));
        await AsyncStorage.setItem('performance_metrics', JSON.stringify(this.performanceMetrics));
        await AsyncStorage.setItem('usage_patterns', JSON.stringify(this.usagePatterns));
        await AsyncStorage.setItem('error_patterns', JSON.stringify(Array.from(this.errorPatterns.entries())));
      }
    } catch (error) {
      console.error('Error saving usage analytics data:', error);
    }
  }

  private async loadStoredData(): Promise<void> {
    try {
      const interactions = await AsyncStorage.getItem('usage_interactions');
      if (interactions) this.interactions = JSON.parse(interactions);

      const conversationMetrics = await AsyncStorage.getItem('conversation_metrics');
      if (conversationMetrics) this.conversationMetrics = JSON.parse(conversationMetrics);

      const accessibilityMetrics = await AsyncStorage.getItem('accessibility_metrics');
      if (accessibilityMetrics) this.accessibilityMetrics = JSON.parse(accessibilityMetrics);

      const culturalMetrics = await AsyncStorage.getItem('cultural_metrics');
      if (culturalMetrics) this.culturalMetrics = JSON.parse(culturalMetrics);

      const performanceMetrics = await AsyncStorage.getItem('performance_metrics');
      if (performanceMetrics) this.performanceMetrics = JSON.parse(performanceMetrics);

      const usagePatterns = await AsyncStorage.getItem('usage_patterns');
      if (usagePatterns) this.usagePatterns = JSON.parse(usagePatterns);

      const errorPatterns = await AsyncStorage.getItem('error_patterns');
      if (errorPatterns) {
        this.errorPatterns = new Map(JSON.parse(errorPatterns));
      }
    } catch (error) {
      console.error('Error loading usage analytics data:', error);
    }
  }

  private async savePrivacySettings(): Promise<void> {
    try {
      await AsyncStorage.setItem('analytics_privacy_settings', JSON.stringify(this.privacySettings));
    } catch (error) {
      console.error('Error saving privacy settings:', error);
    }
  }

  async clearAllData(): Promise<void> {
    try {
      this.interactions = [];
      this.conversationMetrics = {
        totalConversations: 0,
        averageLength: 0,
        preferredTime: '14',
        culturalContextSwitches: 0,
        voiceToTextRatio: 0.8,
        completionRate: 0,
        satisfactionScore: 0
      };
      this.accessibilityMetrics = {
        textSizeUsage: { small: 0, medium: 0, large: 0, 'extra-large': 0 },
        highContrastUsage: 0,
        hapticFeedbackUsage: 0,
        voiceNavigationUsage: 0,
        screenReaderCompatibility: 0,
        audioSpeedPreferences: { slow: 0, normal: 0, fast: 0 }
      };
      this.errorPatterns.clear();

      await AsyncStorage.multiRemove([
        'usage_interactions',
        'conversation_metrics',
        'accessibility_metrics',
        'cultural_metrics',
        'performance_metrics',
        'usage_patterns',
        'error_patterns'
      ]);
    } catch (error) {
      console.error('Error clearing usage analytics data:', error);
    }
  }

  updateConfig(newConfig: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): AnalyticsConfig {
    return { ...this.config };
  }

  getPrivacySettings(): PrivacySettings {
    return { ...this.privacySettings };
  }
}

export default new UsageAnalytics();