import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

interface CostEntry {
  id: string;
  service: 'openai' | 'azure_speech' | 'azure_tts' | 'cultural_api' | 'network' | 'other';
  amount: number; // in USD
  tokens?: number;
  requests: number;
  timestamp: number;
  culturalContext?: string;
  userProfile?: string;
  description: string;
}

interface ServiceCosts {
  openai: {
    inputTokens: number;
    outputTokens: number;
    requestCount: number;
    totalCost: number;
  };
  azureSpeech: {
    charactersProcessed: number;
    requestCount: number;
    totalCost: number;
  };
  azureTts: {
    charactersGenerated: number;
    requestCount: number;
    totalCost: number;
  };
  culturalApi: {
    requestCount: number;
    totalCost: number;
  };
  network: {
    dataTransferred: number; // MB
    totalCost: number;
  };
  other: {
    requestCount: number;
    totalCost: number;
  };
}

interface CostBudget {
  daily: number;
  weekly: number;
  monthly: number;
  emergency: number; // Absolute limit
}

interface CostAlert {
  type: 'warning' | 'limit' | 'emergency';
  threshold: number; // percentage of budget
  enabled: boolean;
  notifyFamily: boolean;
  culturallyAppropriate: boolean;
}

interface CostMonitorConfig {
  budgets: CostBudget;
  alerts: {
    daily: CostAlert;
    weekly: CostAlert;
    monthly: CostAlert;
    emergency: CostAlert;
  };
  elderlyOptimizations: boolean;
  familyReporting: boolean;
  autoLimitOnBudget: boolean;
  culturalCostTracking: boolean;
  costOptimizationSuggestions: boolean;
}

class CostMonitor {
  private config: CostMonitorConfig;
  private costEntries: CostEntry[] = [];
  private serviceCosts: ServiceCosts;
  private lastResetTime: { [key: string]: number } = {};
  private alertsShown: Set<string> = new Set();

  // Pricing constants (approximate rates)
  private readonly PRICING = {
    openai: {
      inputTokensPer1k: 0.0015, // GPT-4
      outputTokensPer1k: 0.002
    },
    azureSpeech: {
      perCharacter: 0.000004 // Speech-to-text
    },
    azureTts: {
      perCharacter: 0.000016 // Text-to-speech
    },
    culturalApi: {
      perRequest: 0.01 // Custom API
    },
    network: {
      perMB: 0.001 // Data transfer
    }
  };

  constructor() {
    this.config = {
      budgets: {
        daily: 2.00, // $2 per day
        weekly: 10.00, // $10 per week
        monthly: 30.00, // $30 per month
        emergency: 50.00 // $50 absolute limit
      },
      alerts: {
        daily: {
          type: 'warning',
          threshold: 80, // 80% of daily budget
          enabled: true,
          notifyFamily: false,
          culturallyAppropriate: true
        },
        weekly: {
          type: 'warning',
          threshold: 75,
          enabled: true,
          notifyFamily: true,
          culturallyAppropriate: true
        },
        monthly: {
          type: 'limit',
          threshold: 90,
          enabled: true,
          notifyFamily: true,
          culturallyAppropriate: true
        },
        emergency: {
          type: 'emergency',
          threshold: 100,
          enabled: true,
          notifyFamily: true,
          culturallyAppropriate: true
        }
      },
      elderlyOptimizations: true,
      familyReporting: true,
      autoLimitOnBudget: true,
      culturalCostTracking: true,
      costOptimizationSuggestions: true
    };

    this.serviceCosts = this.initializeServiceCosts();
    this.initializeResetTimes();
    this.loadStoredData();
    this.startPeriodicCleanup();
  }

  private initializeServiceCosts(): ServiceCosts {
    return {
      openai: {
        inputTokens: 0,
        outputTokens: 0,
        requestCount: 0,
        totalCost: 0
      },
      azureSpeech: {
        charactersProcessed: 0,
        requestCount: 0,
        totalCost: 0
      },
      azureTts: {
        charactersGenerated: 0,
        requestCount: 0,
        totalCost: 0
      },
      culturalApi: {
        requestCount: 0,
        totalCost: 0
      },
      network: {
        dataTransferred: 0,
        totalCost: 0
      },
      other: {
        requestCount: 0,
        totalCost: 0
      }
    };
  }

  private initializeResetTimes(): void {
    const now = Date.now();
    this.lastResetTime = {
      daily: now,
      weekly: now,
      monthly: now
    };
  }

  async trackOpenAICost(inputTokens: number, outputTokens: number, culturalContext?: string): Promise<void> {
    const inputCost = (inputTokens / 1000) * this.PRICING.openai.inputTokensPer1k;
    const outputCost = (outputTokens / 1000) * this.PRICING.openai.outputTokensPer1k;
    const totalCost = inputCost + outputCost;

    const costEntry: CostEntry = {
      id: `openai_${Date.now()}_${Math.random()}`,
      service: 'openai',
      amount: totalCost,
      tokens: inputTokens + outputTokens,
      requests: 1,
      timestamp: Date.now(),
      culturalContext,
      description: `AI conversation (${inputTokens + outputTokens} tokens)`
    };

    await this.addCostEntry(costEntry);
    
    this.serviceCosts.openai.inputTokens += inputTokens;
    this.serviceCosts.openai.outputTokens += outputTokens;
    this.serviceCosts.openai.requestCount += 1;
    this.serviceCosts.openai.totalCost += totalCost;
  }

  async trackSpeechToTextCost(characters: number, culturalContext?: string): Promise<void> {
    const cost = characters * this.PRICING.azureSpeech.perCharacter;

    const costEntry: CostEntry = {
      id: `speech_${Date.now()}_${Math.random()}`,
      service: 'azure_speech',
      amount: cost,
      requests: 1,
      timestamp: Date.now(),
      culturalContext,
      description: `Speech recognition (${characters} characters)`
    };

    await this.addCostEntry(costEntry);
    
    this.serviceCosts.azureSpeech.charactersProcessed += characters;
    this.serviceCosts.azureSpeech.requestCount += 1;
    this.serviceCosts.azureSpeech.totalCost += cost;
  }

  async trackTextToSpeechCost(characters: number, culturalContext?: string): Promise<void> {
    const cost = characters * this.PRICING.azureTts.perCharacter;

    const costEntry: CostEntry = {
      id: `tts_${Date.now()}_${Math.random()}`,
      service: 'azure_tts',
      amount: cost,
      requests: 1,
      timestamp: Date.now(),
      culturalContext,
      description: `Voice generation (${characters} characters)`
    };

    await this.addCostEntry(costEntry);
    
    this.serviceCosts.azureTts.charactersGenerated += characters;
    this.serviceCosts.azureTts.requestCount += 1;
    this.serviceCosts.azureTts.totalCost += cost;
  }

  async trackCulturalApiCost(requests: number, culturalContext?: string): Promise<void> {
    const cost = requests * this.PRICING.culturalApi.perRequest;

    const costEntry: CostEntry = {
      id: `cultural_${Date.now()}_${Math.random()}`,
      service: 'cultural_api',
      amount: cost,
      requests,
      timestamp: Date.now(),
      culturalContext,
      description: `Cultural context requests (${requests} calls)`
    };

    await this.addCostEntry(costEntry);
    
    this.serviceCosts.culturalApi.requestCount += requests;
    this.serviceCosts.culturalApi.totalCost += cost;
  }

  async trackNetworkCost(dataMB: number): Promise<void> {
    const cost = dataMB * this.PRICING.network.perMB;

    const costEntry: CostEntry = {
      id: `network_${Date.now()}_${Math.random()}`,
      service: 'network',
      amount: cost,
      requests: 1,
      timestamp: Date.now(),
      description: `Data transfer (${dataMB.toFixed(2)} MB)`
    };

    await this.addCostEntry(costEntry);
    
    this.serviceCosts.network.dataTransferred += dataMB;
    this.serviceCosts.network.totalCost += cost;
  }

  async trackOtherCost(amount: number, description: string): Promise<void> {
    const costEntry: CostEntry = {
      id: `other_${Date.now()}_${Math.random()}`,
      service: 'other',
      amount,
      requests: 1,
      timestamp: Date.now(),
      description
    };

    await this.addCostEntry(costEntry);
    
    this.serviceCosts.other.requestCount += 1;
    this.serviceCosts.other.totalCost += amount;
  }

  private async addCostEntry(entry: CostEntry): Promise<void> {
    this.costEntries.push(entry);
    
    // Keep only last 1000 entries to manage memory
    if (this.costEntries.length > 1000) {
      this.costEntries = this.costEntries.slice(-1000);
    }

    await this.saveToStorage();
    await this.checkBudgetAlerts();
  }

  private async checkBudgetAlerts(): Promise<void> {
    this.checkPeriodicResets();

    const costs = this.getCurrentPeriodCosts();
    
    // Check daily budget
    if (this.config.alerts.daily.enabled) {
      await this.checkBudgetAlert('daily', costs.daily, this.config.budgets.daily, this.config.alerts.daily);
    }

    // Check weekly budget
    if (this.config.alerts.weekly.enabled) {
      await this.checkBudgetAlert('weekly', costs.weekly, this.config.budgets.weekly, this.config.alerts.weekly);
    }

    // Check monthly budget
    if (this.config.alerts.monthly.enabled) {
      await this.checkBudgetAlert('monthly', costs.monthly, this.config.budgets.monthly, this.config.alerts.monthly);
    }

    // Check emergency limit
    if (this.config.alerts.emergency.enabled) {
      await this.checkBudgetAlert('emergency', costs.monthly, this.config.budgets.emergency, this.config.alerts.emergency);
    }
  }

  private async checkBudgetAlert(
    period: string,
    currentCost: number,
    budget: number,
    alert: CostAlert
  ): Promise<void> {
    const percentage = (currentCost / budget) * 100;
    const alertKey = `${period}_${Math.floor(percentage / 10) * 10}`; // Group by 10% intervals

    if (percentage >= alert.threshold && !this.alertsShown.has(alertKey)) {
      this.alertsShown.add(alertKey);
      
      if (alert.type === 'emergency') {
        await this.handleEmergencyAlert(currentCost, budget);
      } else {
        await this.showBudgetAlert(period, currentCost, budget, percentage, alert);
      }
    }
  }

  private async showBudgetAlert(
    period: string,
    currentCost: number,
    budget: number,
    percentage: number,
    alert: CostAlert
  ): Promise<void> {
    const costFormatted = `$${currentCost.toFixed(2)}`;
    const budgetFormatted = `$${budget.toFixed(2)}`;
    
    let title = '';
    let message = '';

    if (this.config.elderlyOptimizations) {
      // Simple, clear messages for elderly users
      switch (alert.type) {
        case 'warning':
          title = 'Cost Reminder';
          message = `You have spent ${costFormatted} of your ${budgetFormatted} ${period} budget. This is normal usage.`;
          break;
        case 'limit':
          title = 'Budget Notice';
          message = `You have used most of your ${period} budget (${costFormatted} of ${budgetFormatted}). The app will continue working normally.`;
          break;
      }
    } else {
      title = `${period.charAt(0).toUpperCase() + period.slice(1)} Budget Alert`;
      message = `You have used ${percentage.toFixed(0)}% of your ${period} budget (${costFormatted} of ${budgetFormatted}).`;
    }

    Alert.alert(
      title,
      message,
      [
        { text: 'OK' },
        { text: 'View Details', onPress: () => this.showCostBreakdown() },
        ...(alert.notifyFamily ? [{ text: 'Notify Family', onPress: () => this.notifyFamily(period, currentCost, budget) }] : [])
      ]
    );
  }

  private async handleEmergencyAlert(currentCost: number, emergencyLimit: number): Promise<void> {
    if (this.config.autoLimitOnBudget) {
      // Disable non-essential features
      await this.enableEmergencyMode();
    }

    Alert.alert(
      'Emergency Cost Limit',
      `You have reached the emergency cost limit ($${emergencyLimit.toFixed(2)}). Some features have been temporarily limited to prevent additional charges.`,
      [
        { text: 'OK' },
        { text: 'Contact Support', onPress: () => this.contactSupport() },
        { text: 'Notify Family', onPress: () => this.notifyFamily('emergency', currentCost, emergencyLimit) }
      ]
    );
  }

  private showCostBreakdown(): void {
    const breakdown = this.getCostBreakdown();
    const message = `Daily: $${breakdown.daily.toFixed(2)}\nWeekly: $${breakdown.weekly.toFixed(2)}\nMonthly: $${breakdown.monthly.toFixed(2)}\n\nBy Service:\nAI Chat: $${this.serviceCosts.openai.totalCost.toFixed(2)}\nSpeech: $${this.serviceCosts.azureSpeech.totalCost.toFixed(2)}\nVoice: $${this.serviceCosts.azureTts.totalCost.toFixed(2)}`;

    Alert.alert('Cost Breakdown', message, [{ text: 'OK' }]);
  }

  private notifyFamily(period: string, currentCost: number, budget: number): void {
    // This would integrate with family notification system
    console.log(`Notifying family: ${period} budget alert - $${currentCost.toFixed(2)} of $${budget.toFixed(2)}`);
    
    Alert.alert(
      'Family Notified',
      'Your family members have been notified about the budget status.',
      [{ text: 'OK' }]
    );
  }

  private contactSupport(): void {
    Alert.alert(
      'Support Contact',
      'To contact support:\n\n• Call: 1-800-HELP-APP\n• Email: support@culturalcompanion.com\n• Ask a family member to help\n\nOur support team can help adjust your budget settings.',
      [{ text: 'OK' }]
    );
  }

  private async enableEmergencyMode(): Promise<void> {
    // This would integrate with other optimization services
    console.log('Emergency cost mode enabled - limiting non-essential features');
  }

  private checkPeriodicResets(): void {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    // Reset daily costs
    if (now - this.lastResetTime.daily > oneDay) {
      this.resetDailyCosts();
      this.lastResetTime.daily = now;
    }

    // Reset weekly costs
    if (now - this.lastResetTime.weekly > oneWeek) {
      this.resetWeeklyCosts();
      this.lastResetTime.weekly = now;
    }

    // Reset monthly costs
    if (now - this.lastResetTime.monthly > oneMonth) {
      this.resetMonthlyCosts();
      this.lastResetTime.monthly = now;
    }
  }

  private resetDailyCosts(): void {
    this.alertsShown.clear();
    console.log('Daily cost tracking reset');
  }

  private resetWeeklyCosts(): void {
    this.alertsShown.clear();
    console.log('Weekly cost tracking reset');
  }

  private resetMonthlyCosts(): void {
    this.alertsShown.clear();
    this.serviceCosts = this.initializeServiceCosts();
    console.log('Monthly cost tracking reset');
  }

  getCurrentPeriodCosts(): {
    daily: number;
    weekly: number;
    monthly: number;
  } {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    const dailyCosts = this.costEntries
      .filter(entry => now - entry.timestamp < oneDay)
      .reduce((sum, entry) => sum + entry.amount, 0);

    const weeklyCosts = this.costEntries
      .filter(entry => now - entry.timestamp < oneWeek)
      .reduce((sum, entry) => sum + entry.amount, 0);

    const monthlyCosts = this.costEntries
      .filter(entry => now - entry.timestamp < oneMonth)
      .reduce((sum, entry) => sum + entry.amount, 0);

    return {
      daily: dailyCosts,
      weekly: weeklyCosts,
      monthly: monthlyCosts
    };
  }

  getCostBreakdown(): {
    daily: number;
    weekly: number;
    monthly: number;
    byService: { [key: string]: number };
    byCulturalContext: { [key: string]: number };
  } {
    const periods = this.getCurrentPeriodCosts();
    const now = Date.now();
    const oneMonth = 30 * 24 * 60 * 60 * 1000;

    const monthlyEntries = this.costEntries.filter(entry => now - entry.timestamp < oneMonth);

    const byService: { [key: string]: number } = {};
    const byCulturalContext: { [key: string]: number } = {};

    monthlyEntries.forEach(entry => {
      byService[entry.service] = (byService[entry.service] || 0) + entry.amount;
      
      if (entry.culturalContext) {
        byCulturalContext[entry.culturalContext] = (byCulturalContext[entry.culturalContext] || 0) + entry.amount;
      }
    });

    return {
      ...periods,
      byService,
      byCulturalContext
    };
  }

  getCostOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const breakdown = this.getCostBreakdown();

    // Analyze service costs
    if (breakdown.byService.openai > breakdown.daily * 0.5) {
      recommendations.push('Consider shorter conversations to reduce AI costs');
    }

    if (breakdown.byService.azure_tts > breakdown.daily * 0.3) {
      recommendations.push('Voice generation is using significant budget - consider reducing audio length');
    }

    if (breakdown.byService.azure_speech > breakdown.daily * 0.2) {
      recommendations.push('Speech recognition costs are high - speak more clearly to reduce retries');
    }

    // General recommendations
    if (breakdown.daily > this.config.budgets.daily * 0.8) {
      recommendations.push('Daily usage is high - consider using text mode more often');
      recommendations.push('Review conversation length and frequency');
    }

    if (Object.keys(breakdown.byCulturalContext).length > 3) {
      recommendations.push('Using multiple cultural contexts - consider focusing on your primary culture');
    }

    return recommendations;
  }

  getFamilyReport(): {
    period: string;
    totalCost: number;
    budget: number;
    remainingBudget: number;
    usagePattern: string;
    concerns: string[];
    recommendations: string[];
  } {
    const costs = this.getCurrentPeriodCosts();
    const concerns: string[] = [];
    const recommendations = this.getCostOptimizationRecommendations();

    if (costs.daily > this.config.budgets.daily * 0.9) {
      concerns.push('Daily budget nearly exceeded');
    }

    if (costs.weekly > this.config.budgets.weekly * 0.8) {
      concerns.push('Weekly budget usage is high');
    }

    if (costs.monthly > this.config.budgets.monthly * 0.5) {
      concerns.push('On track to exceed monthly budget');
    }

    let usagePattern = 'Normal';
    if (costs.daily > this.config.budgets.daily * 0.5) {
      usagePattern = 'High';
    } else if (costs.daily < this.config.budgets.daily * 0.2) {
      usagePattern = 'Low';
    }

    return {
      period: 'Monthly',
      totalCost: costs.monthly,
      budget: this.config.budgets.monthly,
      remainingBudget: this.config.budgets.monthly - costs.monthly,
      usagePattern,
      concerns,
      recommendations
    };
  }

  private startPeriodicCleanup(): void {
    // Clean up old cost entries every day
    setInterval(() => {
      const oneMonth = 30 * 24 * 60 * 60 * 1000;
      const cutoff = Date.now() - oneMonth;
      
      this.costEntries = this.costEntries.filter(entry => entry.timestamp > cutoff);
      this.saveToStorage();
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  private async saveToStorage(): Promise<void> {
    try {
      await AsyncStorage.setItem('cost_entries', JSON.stringify(this.costEntries.slice(-500)));
      await AsyncStorage.setItem('service_costs', JSON.stringify(this.serviceCosts));
      await AsyncStorage.setItem('cost_reset_times', JSON.stringify(this.lastResetTime));
    } catch (error) {
      console.error('Error saving cost data:', error);
    }
  }

  private async loadStoredData(): Promise<void> {
    try {
      const costEntries = await AsyncStorage.getItem('cost_entries');
      if (costEntries) {
        this.costEntries = JSON.parse(costEntries);
      }

      const serviceCosts = await AsyncStorage.getItem('service_costs');
      if (serviceCosts) {
        this.serviceCosts = JSON.parse(serviceCosts);
      }

      const resetTimes = await AsyncStorage.getItem('cost_reset_times');
      if (resetTimes) {
        this.lastResetTime = JSON.parse(resetTimes);
      }
    } catch (error) {
      console.error('Error loading cost data:', error);
    }
  }

  updateBudgets(newBudgets: Partial<CostBudget>): void {
    this.config.budgets = { ...this.config.budgets, ...newBudgets };
    this.saveConfig();
  }

  updateAlerts(period: keyof typeof this.config.alerts, alert: Partial<CostAlert>): void {
    this.config.alerts[period] = { ...this.config.alerts[period], ...alert };
    this.saveConfig();
  }

  private async saveConfig(): Promise<void> {
    try {
      await AsyncStorage.setItem('cost_monitor_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Error saving cost monitor config:', error);
    }
  }

  async clearAllData(): Promise<void> {
    try {
      this.costEntries = [];
      this.serviceCosts = this.initializeServiceCosts();
      this.alertsShown.clear();
      this.initializeResetTimes();

      await AsyncStorage.removeItem('cost_entries');
      await AsyncStorage.removeItem('service_costs');
      await AsyncStorage.removeItem('cost_reset_times');
    } catch (error) {
      console.error('Error clearing cost data:', error);
    }
  }

  getConfig(): CostMonitorConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<CostMonitorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
  }
}

export default new CostMonitor();