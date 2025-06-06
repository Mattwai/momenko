import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  CulturalGroup, 
  PreferredLanguage, 
  ConversationContext,
  CachedPhrase 
} from '../../types';

export interface CacheUsageAnalytics {
  phraseId: string;
  useCount: number;
  lastUsed: Date;
  contextFrequency: Record<ConversationContext, number>;
  timeOfDayUsage: Record<string, number>; // hourly usage patterns
  userSatisfactionScore: number; // 0-10 based on user interactions
}

export interface CacheWarmingConfig {
  culturalGroup: CulturalGroup;
  priorityPhrases: string[];
  maxCacheSize: number;
  preGenerationThreshold: number; // minimum usage count to pre-generate
}

export interface CulturalPhraseSet {
  greetings: {
    morning: string[];
    afternoon: string[];
    evening: string[];
    general: string[];
  };
  responses: {
    acknowledgments: string[];
    comfort: string[];
    encouragement: string[];
    understanding: string[];
  };
  checkIns: {
    wellbeing: string[];
    memory: string[];
    mood: string[];
    needs: string[];
  };
  transitions: {
    topicChange: string[];
    ending: string[];
    clarification: string[];
  };
}

class SpeechCacheService {
  private static instance: SpeechCacheService;
  private cache: Map<string, CachedPhrase> = new Map();
  private analytics: Map<string, CacheUsageAnalytics> = new Map();
  private culturalPhraseSets: Map<CulturalGroup, CulturalPhraseSet> = new Map();
  private warmingConfigs: Map<CulturalGroup, CacheWarmingConfig> = new Map();
  private readonly CACHE_KEY = 'speech_cache';
  private readonly ANALYTICS_KEY = 'cache_analytics';
  private readonly MAX_CACHE_AGE_DAYS = 30;

  private constructor() {
    this.initializeCulturalPhraseSets();
    this.initializeWarmingConfigs();
    this.loadCacheFromStorage();
  }

  public static getInstance(): SpeechCacheService {
    if (!SpeechCacheService.instance) {
      SpeechCacheService.instance = new SpeechCacheService();
    }
    return SpeechCacheService.instance;
  }

  private initializeCulturalPhraseSets(): void {
    // Māori phrase set
    this.culturalPhraseSets.set('maori', {
      greetings: {
        morning: ['Ata mārie', 'Morena', 'Kia ora i tēnei ata'],
        afternoon: ['Kia ora', 'Tēnā koe', 'Kia kaha'],
        evening: ['Ahiahi mārie', 'Pō mārie', 'Kia ora i tēnei ahiahi'],
        general: ['Kia ora', 'Tēnā koe', 'Haere mai', 'Nau mai']
      },
      responses: {
        acknowledgments: ['Āe', 'Kāo', 'Tika tonu', 'Pai ana'],
        comfort: ['Kia kaha', 'Kia maia', 'Kei konei au', 'He tautoko tēnei'],
        encouragement: ['Kia kaha', 'Kia māia', 'Ka pai', 'Tū māia'],
        understanding: ['Mārama ana', 'Mōhio ana au', 'Aroha mai', 'Kia aroha']
      },
      checkIns: {
        wellbeing: ['Kei te pēhea koe?', 'He aha tō āhua?', 'Kei te pai koe?'],
        memory: ['Kei te mahara koe?', 'He aha tō whakamahara?'],
        mood: ['Kei te koa koe?', 'He aha tō mata?'],
        needs: ['He aha tāu hiahia?', 'He mea āwhina koe?']
      },
      transitions: {
        topicChange: ['Ā, me kōrero hoki tātou mō...', 'He aha ake...'],
        ending: ['Haere rā', 'Mā te wā', 'Kia pai tō rā'],
        clarification: ['Ā?', 'He aha ai?', 'Me whakamārama...']
      }
    });

    // Chinese phrase set
    this.culturalPhraseSets.set('chinese', {
      greetings: {
        morning: ['早上好', '您早', '早安'],
        afternoon: ['下午好', '您好', '午安'],
        evening: ['晚上好', '您辛苦了', '晚安'],
        general: ['您好', '你好', '您辛苦了']
      },
      responses: {
        acknowledgments: ['是的', '好的', '我明白', '没问题'],
        comfort: ['别担心', '我理解', '没关系', '会好起来的'],
        encouragement: ['加油', '您很棒', '您做得很好', '坚持下去'],
        understanding: ['我理解', '我懂您的意思', '我明白您的感受']
      },
      checkIns: {
        wellbeing: ['您今天感觉怎么样？', '您身体还好吗？', '您最近如何？'],
        memory: ['您还记得吗？', '您想起来了吗？'],
        mood: ['您今天心情好吗？', '您开心吗？'],
        needs: ['您需要什么帮助吗？', '有什么我可以做的吗？']
      },
      transitions: {
        topicChange: ['我们来聊聊...', '让我们谈谈...'],
        ending: ['再见', '保重身体', '祝您健康'],
        clarification: ['请问...', '能否再说一遍？']
      }
    });

    // Western phrase set
    this.culturalPhraseSets.set('western', {
      greetings: {
        morning: ['Good morning', 'Morning', 'How did you sleep?'],
        afternoon: ['Good afternoon', 'How are you today?', 'Hello'],
        evening: ['Good evening', 'How was your day?', 'Hello there'],
        general: ['Hello', 'Hi', 'How are you?', 'Nice to see you']
      },
      responses: {
        acknowledgments: ['Yes', 'I understand', 'That makes sense', 'Okay'],
        comfort: ['I\'m here for you', 'It\'s okay', 'You\'re not alone', 'That\'s understandable'],
        encouragement: ['You\'re doing great', 'Keep going', 'You can do this', 'That\'s wonderful'],
        understanding: ['I understand', 'I hear you', 'That must be difficult', 'I see']
      },
      checkIns: {
        wellbeing: ['How are you feeling?', 'How are you today?', 'Are you comfortable?'],
        memory: ['Do you remember?', 'Can you recall?', 'Does this sound familiar?'],
        mood: ['How are you feeling emotionally?', 'What\'s your mood like?'],
        needs: ['What do you need?', 'How can I help?', 'Is there anything I can do?']
      },
      transitions: {
        topicChange: ['Let\'s talk about...', 'Speaking of...', 'I\'d like to discuss...'],
        ending: ['Take care', 'See you soon', 'Have a good day'],
        clarification: ['Could you clarify?', 'What do you mean?', 'Can you explain?']
      }
    });
  }

  private initializeWarmingConfigs(): void {
    const baseConfig = {
      maxCacheSize: 100,
      preGenerationThreshold: 3
    };

    this.warmingConfigs.set('maori', {
      ...baseConfig,
      culturalGroup: 'maori',
      priorityPhrases: ['Kia ora', 'Kei te pēhea koe?', 'Kia kaha', 'Haere rā']
    });

    this.warmingConfigs.set('chinese', {
      ...baseConfig,
      culturalGroup: 'chinese',
      priorityPhrases: ['您好', '您今天感觉怎么样？', '我理解', '再见']
    });

    this.warmingConfigs.set('western', {
      ...baseConfig,
      culturalGroup: 'western',
      priorityPhrases: ['Hello', 'How are you feeling?', 'I understand', 'Take care']
    });
  }

  private async loadCacheFromStorage(): Promise<void> {
    try {
      const [cacheData, analyticsData] = await Promise.all([
        AsyncStorage.getItem(this.CACHE_KEY),
        AsyncStorage.getItem(this.ANALYTICS_KEY)
      ]);

      if (cacheData) {
        const cached = JSON.parse(cacheData);
        Object.entries(cached).forEach(([key, value]) => {
          this.cache.set(key, value as CachedPhrase);
        });
      }

      if (analyticsData) {
        const analytics = JSON.parse(analyticsData);
        Object.entries(analytics).forEach(([key, value]) => {
          this.analytics.set(key, value as CacheUsageAnalytics);
        });
      }

      // Clean expired cache entries
      this.cleanExpiredEntries();
    } catch (error) {
      console.error('Error loading cache from storage:', error);
    }
  }

  private async saveCacheToStorage(): Promise<void> {
    try {
      const cacheObj = Object.fromEntries(this.cache);
      const analyticsObj = Object.fromEntries(this.analytics);

      await Promise.all([
        AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheObj)),
        AsyncStorage.setItem(this.ANALYTICS_KEY, JSON.stringify(analyticsObj))
      ]);
    } catch (error) {
      console.error('Error saving cache to storage:', error);
    }
  }

  private cleanExpiredEntries(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.MAX_CACHE_AGE_DAYS);

    const expiredKeys: string[] = [];
    this.cache.forEach((phrase, key) => {
      if (new Date(phrase.lastUsed) < cutoffDate) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => {
      this.cache.delete(key);
      this.analytics.delete(key);
    });
  }

  public async warmCacheForUser(culturalGroup: CulturalGroup, userId: string): Promise<void> {
    const config = this.warmingConfigs.get(culturalGroup);
    const phraseSet = this.culturalPhraseSets.get(culturalGroup);
    
    if (!config || !phraseSet) return;

    const priorityPhrases = [
      ...config.priorityPhrases,
      ...phraseSet.greetings.general.slice(0, 3),
      ...phraseSet.responses.acknowledgments.slice(0, 2),
      ...phraseSet.checkIns.wellbeing.slice(0, 2)
    ];

    // Pre-generate audio for priority phrases
    for (const phrase of priorityPhrases) {
      const cacheKey = this.generateCacheKey(phrase, culturalGroup, 'casual');
      if (!this.cache.has(cacheKey)) {
        await this.preGeneratePhrase(phrase, culturalGroup, 'casual', userId);
      }
    }
  }

  private async preGeneratePhrase(
    content: string,
    culturalGroup: CulturalGroup,
    context: ConversationContext,
    userId: string
  ): Promise<void> {
    try {
      // This would integrate with your speech synthesis service
      const audioUrl = await this.generateSpeechAudio(content, culturalGroup);
      
      const cachedPhrase: CachedPhrase = {
        id: this.generateCacheKey(content, culturalGroup, context),
        content,
        language: this.getLanguageForCulture(culturalGroup),
        context,
        culturalProfileId: userId,
        audioUrl,
        lastUsed: new Date(),
        useCount: 0
      };

      this.cache.set(cachedPhrase.id, cachedPhrase);
      await this.saveCacheToStorage();
    } catch (error) {
      console.error('Error pre-generating phrase:', error);
    }
  }

  private async generateSpeechAudio(_content: string, _culturalGroup: CulturalGroup): Promise<string> {
    // This is a placeholder - implement integration with your speech synthesis service
    // Return a URL or file path to the generated audio
    return `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp3`;
  }

  private getLanguageForCulture(culturalGroup: CulturalGroup): PreferredLanguage {
    switch (culturalGroup) {
      case 'maori': return 'mi';
      case 'chinese': return 'zh';
      case 'western': return 'en';
      default: return 'en';
    }
  }

  private generateCacheKey(content: string, culturalGroup: CulturalGroup, context: ConversationContext): string {
    const hash = content.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);
    return `${culturalGroup}_${context}_${hash}`;
  }

  public async getCachedPhrase(
    content: string,
    culturalGroup: CulturalGroup,
    context: ConversationContext
  ): Promise<CachedPhrase | null> {
    const cacheKey = this.generateCacheKey(content, culturalGroup, context);
    const cached = this.cache.get(cacheKey);

    if (cached) {
      // Update usage analytics
      await this.trackUsage(cacheKey, context);
      return cached;
    }

    return null;
  }

  public async cachePhrase(phrase: CachedPhrase): Promise<void> {
    this.cache.set(phrase.id, phrase);
    await this.saveCacheToStorage();
  }

  private async trackUsage(phraseId: string, context: ConversationContext): Promise<void> {
    const now = new Date();
    const hour = now.getHours().toString();

    let analytics = this.analytics.get(phraseId);
    if (!analytics) {
      analytics = {
        phraseId,
        useCount: 0,
        lastUsed: now,
        contextFrequency: {} as Record<ConversationContext, number>,
        timeOfDayUsage: {},
        userSatisfactionScore: 5 // Default neutral score
      };
    }

    analytics.useCount++;
    analytics.lastUsed = now;
    analytics.contextFrequency[context] = (analytics.contextFrequency[context] || 0) + 1;
    analytics.timeOfDayUsage[hour] = (analytics.timeOfDayUsage[hour] || 0) + 1;

    this.analytics.set(phraseId, analytics);
    await this.saveCacheToStorage();

    // Update cached phrase usage
    const cachedPhrase = this.cache.get(phraseId);
    if (cachedPhrase) {
      cachedPhrase.useCount = analytics.useCount;
      cachedPhrase.lastUsed = now;
      this.cache.set(phraseId, cachedPhrase);
    }
  }

  public getUsageAnalytics(phraseId: string): CacheUsageAnalytics | null {
    return this.analytics.get(phraseId) || null;
  }

  public getMostUsedPhrases(culturalGroup: CulturalGroup, limit: number = 10): CachedPhrase[] {
    const culturePhrases = Array.from(this.cache.values())
      .filter(phrase => phrase.id.startsWith(culturalGroup))
      .sort((a, b) => b.useCount - a.useCount);

    return culturePhrases.slice(0, limit);
  }

  public getPhrasesForContext(
    culturalGroup: CulturalGroup,
    phraseType: keyof CulturalPhraseSet,
    subType?: string
  ): string[] {
    const phraseSet = this.culturalPhraseSets.get(culturalGroup);
    if (!phraseSet) return [];

    const phrases = phraseSet[phraseType];
    if (subType && typeof phrases === 'object' && phrases[subType as keyof typeof phrases]) {
      return phrases[subType as keyof typeof phrases] as string[];
    }

    if (Array.isArray(phrases)) {
      return phrases;
    }

    // If phrases is an object, return all values flattened
    return Object.values(phrases).flat();
  }

  public async optimizeCache(): Promise<void> {
    // Remove least used phrases if cache is too large
    const maxSize = 1000; // Global max cache size
    if (this.cache.size > maxSize) {
      const sortedByUsage = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.useCount - b.useCount);

      const toRemove = sortedByUsage.slice(0, this.cache.size - maxSize);
      toRemove.forEach(([key]) => {
        this.cache.delete(key);
        this.analytics.delete(key);
      });
    }

    // Identify phrases that should be pre-generated based on analytics
    const highUsagePhrases = Array.from(this.analytics.values())
      .filter(analytics => analytics.useCount >= 5)
      .map(analytics => analytics.phraseId);

    // Log optimization results
    console.log(`Cache optimized: ${this.cache.size} phrases, ${highUsagePhrases.length} high-usage phrases identified`);

    await this.saveCacheToStorage();
  }

  public validateCulturalAppropriateness(
    content: string,
    culturalGroup: CulturalGroup
  ): { isAppropriate: boolean; concerns: string[] } {
    const concerns: string[] = [];
    let isAppropriate = true;

    // Basic cultural appropriateness checks
    const inappropriateTerms = {
      maori: ['primitive', 'savage', 'backwards'],
      chinese: ['yellow', 'oriental', 'chinaman'],
      western: [] // Add if needed
    };

    const culturalTerms = inappropriateTerms[culturalGroup] || [];
    culturalTerms.forEach(term => {
      if (content.toLowerCase().includes(term.toLowerCase())) {
        concerns.push(`Contains potentially offensive term: ${term}`);
        isAppropriate = false;
      }
    });

    // Check for cultural sensitivity requirements
    if (culturalGroup === 'chinese' && content.includes('dementia')) {
      concerns.push('Consider using more sensitive terminology for Chinese culture');
    }

    if (culturalGroup === 'maori' && !content.includes('whānau') && content.includes('family')) {
      concerns.push('Consider using "whānau" instead of "family" for Māori context');
    }

    return { isAppropriate, concerns };
  }

  public async updateUserSatisfaction(phraseId: string, score: number): Promise<void> {
    const analytics = this.analytics.get(phraseId);
    if (analytics) {
      // Use weighted average to update satisfaction score
      const weight = 0.2; // New score weight
      analytics.userSatisfactionScore = 
        (analytics.userSatisfactionScore * (1 - weight)) + (score * weight);
      
      this.analytics.set(phraseId, analytics);
      await this.saveCacheToStorage();
    }
  }

  public getCacheStatistics(): {
    totalPhrases: number;
    phrasesByCulture: Record<CulturalGroup, number>;
    averageUsage: number;
    topContexts: Array<{ context: ConversationContext; count: number }>;
  } {
    const phrasesByCulture = {
      maori: 0,
      chinese: 0,
      western: 0
    };

    let totalUsage = 0;
    const contextCounts: Record<string, number> = {};

    this.cache.forEach(phrase => {
      const culture = phrase.id.split('_')[0] as CulturalGroup;
      if (phrasesByCulture[culture] !== undefined) {
        phrasesByCulture[culture]++;
      }
      totalUsage += phrase.useCount;
      contextCounts[phrase.context] = (contextCounts[phrase.context] || 0) + 1;
    });

    const topContexts = Object.entries(contextCounts)
      .map(([context, count]) => ({ context: context as ConversationContext, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalPhrases: this.cache.size,
      phrasesByCulture,
      averageUsage: this.cache.size > 0 ? totalUsage / this.cache.size : 0,
      topContexts
    };
  }
}

export default SpeechCacheService;