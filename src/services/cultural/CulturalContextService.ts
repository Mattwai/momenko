import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  CulturalProfile, 
  CulturalGroup, 
  PreferredLanguage, 
  CommunicationStyle,
  ConversationContext,
  DEFAULT_CULTURAL_PROFILES 
} from '../../types';

export interface CulturalResponseTemplate {
  id: string;
  culturalGroup: CulturalGroup;
  context: ConversationContext;
  language: PreferredLanguage;
  template: string;
  emotionalTone: 'supportive' | 'respectful' | 'direct' | 'gentle';
  familyInvolvement: 'high' | 'medium' | 'low';
  culturalNuances: string[];
}

export interface CulturalDetectionMetrics {
  languagePreference: Record<PreferredLanguage, number>;
  communicationStyleIndicators: Record<CommunicationStyle, number>;
  familyInvolvementLevel: number;
  spiritualReferences: number;
  medicalDirectness: number;
  respectfulnessLevel: number;
}

export interface CulturalAdaptationConfig {
  terminologyMap: Record<string, Record<CulturalGroup, string>>;
  responsePatterns: Record<CulturalGroup, CulturalResponseTemplate[]>;
  conversationFlow: Record<CulturalGroup, {
    greeting: string[];
    transition: string[];
    support: string[];
    farewell: string[];
  }>;
}

class CulturalContextService {
  private static instance: CulturalContextService;
  private culturalProfiles: Map<string, CulturalProfile> = new Map();
  private responseTemplates: Map<string, CulturalResponseTemplate[]> = new Map();
  private detectionMetrics: Map<string, CulturalDetectionMetrics> = new Map();
  private adaptationConfig: CulturalAdaptationConfig = {
    terminologyMap: {},
    responsePatterns: {
      maori: [],
      chinese: [],
      western: []
    },
    conversationFlow: {
      maori: {
        greeting: [],
        transition: [],
        support: [],
        farewell: []
      },
      chinese: {
        greeting: [],
        transition: [],
        support: [],
        farewell: []
      },
      western: {
        greeting: [],
        transition: [],
        support: [],
        farewell: []
      }
    }
  };

  private constructor() {
    this.initializeDefaultProfiles();
    this.initializeAdaptationConfig();
  }

  public static getInstance(): CulturalContextService {
    if (!CulturalContextService.instance) {
      CulturalContextService.instance = new CulturalContextService();
    }
    return CulturalContextService.instance;
  }

  private initializeDefaultProfiles(): void {
    Object.entries(DEFAULT_CULTURAL_PROFILES).forEach(([group, profile]) => {
      const fullProfile: CulturalProfile = {
        id: `default_${group}`,
        ...profile
      };
      this.culturalProfiles.set(group, fullProfile);
    });
  }

  private initializeAdaptationConfig(): void {
    this.adaptationConfig = {
      terminologyMap: {
        dementia: {
          maori: 'mate wareware',
          chinese: '痴呆症',
          western: 'dementia'
        },
        memory_loss: {
          maori: 'ngaro whakamahara',
          chinese: '记忆丧失',
          western: 'memory loss'
        },
        family: {
          maori: 'whānau',
          chinese: '家庭',
          western: 'family'
        },
        journey: {
          maori: 'tawhirimatea',
          chinese: '旅程',
          western: 'journey'
        },
        support: {
          maori: 'tautoko',
          chinese: '支持',
          western: 'support'
        }
      },
      responsePatterns: {
        maori: this.getMaoriResponsePatterns(),
        chinese: this.getChineseResponsePatterns(),
        western: this.getWesternResponsePatterns()
      },
      conversationFlow: {
        maori: {
          greeting: ['Kia ora', 'Tēnā koe', 'Haere mai'],
          transition: ['He aha tō whakaaro?', 'Me kōrero tātou'],
          support: ['Kei konei au', 'He tautoko tēnei'],
          farewell: ['Haere rā', 'Mā te wā']
        },
        chinese: {
          greeting: ['您好', '早上好', '下午好'],
          transition: ['我们可以聊聊', '请告诉我'],
          support: ['我理解', '我们会帮助您'],
          farewell: ['再见', '保重身体']
        },
        western: {
          greeting: ['Hello', 'Good morning', 'How are you?'],
          transition: ['Let\'s talk about', 'Can you tell me'],
          support: ['I understand', 'We\'re here to help'],
          farewell: ['Take care', 'See you soon']
        }
      }
    };

    this.initializeResponseTemplates();
  }

  private getMaoriResponsePatterns(): CulturalResponseTemplate[] {
    return [
      {
        id: 'maori_greeting_casual',
        culturalGroup: 'maori',
        context: 'casual',
        language: 'mi',
        template: 'Kia ora {{name}}. He pēhea tō rangi nei?',
        emotionalTone: 'respectful',
        familyInvolvement: 'high',
        culturalNuances: ['whānau_connection', 'spiritual_acknowledgment']
      },
      {
        id: 'maori_memory_support',
        culturalGroup: 'maori',
        context: 'memory',
        language: 'mi',
        template: 'Kāore he raruraru. Ko tō tawhirimatea tēnei, ā kei konei au hei tautoko.',
        emotionalTone: 'supportive',
        familyInvolvement: 'high',
        culturalNuances: ['journey_perspective', 'communal_support']
      },
      {
        id: 'maori_family_discussion',
        culturalGroup: 'maori',
        context: 'family',
        language: 'mi',
        template: 'Me whakatū kōrero ki tō whānau. He mea nui tō whānau.',
        emotionalTone: 'gentle',
        familyInvolvement: 'high',
        culturalNuances: ['whānau_centrality', 'collective_decision']
      }
    ];
  }

  private getChineseResponsePatterns(): CulturalResponseTemplate[] {
    return [
      {
        id: 'chinese_greeting_respectful',
        culturalGroup: 'chinese',
        context: 'casual',
        language: 'zh',
        template: '{{title}}{{name}}，您今天感觉怎么样？',
        emotionalTone: 'respectful',
        familyInvolvement: 'medium',
        culturalNuances: ['hierarchical_respect', 'formal_address']
      },
      {
        id: 'chinese_medical_discussion',
        culturalGroup: 'chinese',
        context: 'medical',
        language: 'zh',
        template: '我理解您的担心。让我们慢慢讨论，尊重您的感受。',
        emotionalTone: 'respectful',
        familyInvolvement: 'high',
        culturalNuances: ['stigma_awareness', 'face_saving', 'gentle_approach']
      },
      {
        id: 'chinese_family_honor',
        culturalGroup: 'chinese',
        context: 'family',
        language: 'zh',
        template: '家庭的支持很重要。我们会保护您的尊严。',
        emotionalTone: 'supportive',
        familyInvolvement: 'high',
        culturalNuances: ['filial_piety', 'family_honor', 'dignity_preservation']
      }
    ];
  }

  private getWesternResponsePatterns(): CulturalResponseTemplate[] {
    return [
      {
        id: 'western_greeting_direct',
        culturalGroup: 'western',
        context: 'casual',
        language: 'en',
        template: 'Hello {{name}}. How are you feeling today?',
        emotionalTone: 'direct',
        familyInvolvement: 'low',
        culturalNuances: ['individual_focus', 'direct_communication']
      },
      {
        id: 'western_medical_direct',
        culturalGroup: 'western',
        context: 'medical',
        language: 'en',
        template: 'Let\'s discuss your symptoms and treatment options clearly.',
        emotionalTone: 'direct',
        familyInvolvement: 'low',
        culturalNuances: ['medical_directness', 'individual_autonomy']
      },
      {
        id: 'western_support_individual',
        culturalGroup: 'western',
        context: 'memory',
        language: 'en',
        template: 'You have the right to make your own choices. I\'m here to support you.',
        emotionalTone: 'supportive',
        familyInvolvement: 'medium',
        culturalNuances: ['individual_rights', 'personal_autonomy']
      }
    ];
  }

  private initializeResponseTemplates(): void {
    Object.entries(this.adaptationConfig.responsePatterns).forEach(([group, patterns]) => {
      this.responseTemplates.set(group, patterns);
    });
  }

  public async getCulturalProfile(userId: string): Promise<CulturalProfile | null> {
    try {
      const stored = await AsyncStorage.getItem(`cultural_profile_${userId}`);
      if (stored) {
        return JSON.parse(stored);
      }
      return null;
    } catch (error) {
      console.error('Error loading cultural profile:', error);
      return null;
    }
  }

  public async saveCulturalProfile(userId: string, profile: CulturalProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(`cultural_profile_${userId}`, JSON.stringify(profile));
      this.culturalProfiles.set(userId, profile);
    } catch (error) {
      console.error('Error saving cultural profile:', error);
    }
  }

  public detectCulturalPreferences(
    userId: string, 
    conversationHistory: string[],
    languageUsage: Record<PreferredLanguage, number>
  ): CulturalGroup {
    const metrics = this.analyzeConversationMetrics(conversationHistory, languageUsage);
    this.detectionMetrics.set(userId, metrics);

    // Score each cultural group based on detected patterns
    const scores = {
      maori: this.scoreMaoriIndicators(metrics),
      chinese: this.scoreChineseIndicators(metrics),
      western: this.scoreWesternIndicators(metrics)
    };

    // Return the highest scoring cultural group
    return Object.entries(scores).reduce((a, b) => scores[a[0] as CulturalGroup] > scores[b[0] as CulturalGroup] ? a : b)[0] as CulturalGroup;
  }

  private analyzeConversationMetrics(
    conversationHistory: string[],
    languageUsage: Record<PreferredLanguage, number>
  ): CulturalDetectionMetrics {
    const text = conversationHistory.join(' ').toLowerCase();
    
    return {
      languagePreference: languageUsage,
      communicationStyleIndicators: {
        indirect_respectful: this.countPatterns(text, ['whānau', 'journey', 'together', 'we', 'us']),
        hierarchical_respectful: this.countPatterns(text, ['family', 'respect', 'honor', 'elder', 'tradition']),
        direct_medical: this.countPatterns(text, ['symptom', 'treatment', 'diagnosis', 'medical', 'doctor'])
      },
      familyInvolvementLevel: this.countPatterns(text, ['family', 'whānau', '家庭', 'together', 'support']),
      spiritualReferences: this.countPatterns(text, ['journey', 'spirit', 'ancestor', 'blessing', 'prayer']),
      medicalDirectness: this.countPatterns(text, ['what is', 'how does', 'treatment', 'medication', 'cure']),
      respectfulnessLevel: this.countPatterns(text, ['please', 'thank you', 'respect', 'honor', 'grateful'])
    };
  }

  private countPatterns(text: string, patterns: string[]): number {
    return patterns.reduce((count, pattern) => {
      return count + (text.match(new RegExp(pattern, 'gi')) || []).length;
    }, 0);
  }

  private scoreMaoriIndicators(metrics: CulturalDetectionMetrics): number {
    let score = 0;
    score += metrics.languagePreference.mi * 3;
    score += metrics.communicationStyleIndicators.indirect_respectful * 2;
    score += metrics.familyInvolvementLevel * 2;
    score += metrics.spiritualReferences * 3;
    score += metrics.respectfulnessLevel;
    return score;
  }

  private scoreChineseIndicators(metrics: CulturalDetectionMetrics): number {
    let score = 0;
    score += metrics.languagePreference.zh * 3;
    score += metrics.communicationStyleIndicators.hierarchical_respectful * 2;
    score += metrics.familyInvolvementLevel * 2;
    score += (10 - metrics.medicalDirectness); // Lower directness = higher Chinese score
    score += metrics.respectfulnessLevel * 2;
    return score;
  }

  private scoreWesternIndicators(metrics: CulturalDetectionMetrics): number {
    let score = 0;
    score += metrics.languagePreference.en * 3;
    score += metrics.communicationStyleIndicators.direct_medical * 3;
    score += metrics.medicalDirectness * 2;
    score += (10 - metrics.familyInvolvementLevel); // Lower family involvement = higher Western score
    return score;
  }

  public getAdaptedResponse(
    culturalGroup: CulturalGroup,
    context: ConversationContext,
    baseMessage: string,
    variables: Record<string, string> = {}
  ): string {
    const templates = this.responseTemplates.get(culturalGroup) || [];
    const template = templates.find(t => t.context === context);
    
    if (!template) {
      return this.adaptTerminology(baseMessage, culturalGroup);
    }

    let adaptedMessage = template.template;
    
    // Replace variables in template
    Object.entries(variables).forEach(([key, value]) => {
      adaptedMessage = adaptedMessage.replace(`{{${key}}}`, value);
    });

    return adaptedMessage;
  }

  public adaptTerminology(message: string, culturalGroup: CulturalGroup): string {
    let adaptedMessage = message;
    
    Object.entries(this.adaptationConfig.terminologyMap).forEach(([term, translations]) => {
      const culturalTerm = translations[culturalGroup];
      if (culturalTerm) {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        adaptedMessage = adaptedMessage.replace(regex, culturalTerm);
      }
    });

    return adaptedMessage;
  }

  public getConversationFlow(culturalGroup: CulturalGroup, flowType: keyof CulturalAdaptationConfig['conversationFlow'][CulturalGroup]): string[] {
    return this.adaptationConfig.conversationFlow[culturalGroup][flowType] || [];
  }

  public getCulturalNuances(culturalGroup: CulturalGroup, context: ConversationContext): string[] {
    const templates = this.responseTemplates.get(culturalGroup) || [];
    const template = templates.find(t => t.context === context);
    return template?.culturalNuances || [];
  }

  public registerNewCulture(
    culturalGroup: string,
    _profile: Omit<CulturalProfile, 'id'>,
    responsePatterns: CulturalResponseTemplate[],
    conversationFlow: CulturalAdaptationConfig['conversationFlow'][CulturalGroup]
  ): void {
    // Add new cultural profile
    const fullProfile: CulturalProfile = {
      id: `custom_${culturalGroup}`,
      ..._profile
    };
    this.culturalProfiles.set(culturalGroup, fullProfile);
    
    // Add response patterns
    this.responseTemplates.set(culturalGroup, responsePatterns);
    
    // Update conversation flow
    this.adaptationConfig.conversationFlow[culturalGroup as CulturalGroup] = conversationFlow;
  }

  public getFamilyInvolvementLevel(culturalGroup: CulturalGroup, context: ConversationContext): 'high' | 'medium' | 'low' {
    const templates = this.responseTemplates.get(culturalGroup) || [];
    const template = templates.find(t => t.context === context);
    return template?.familyInvolvement || 'medium';
  }

  public getStigmaHandlingStrategy(culturalGroup: CulturalGroup): {
    directness: 'high' | 'medium' | 'low';
    familyInvolvement: 'required' | 'recommended' | 'optional';
    terminologyPreference: 'medical' | 'euphemistic' | 'cultural';
  } {
    const _profile = this.culturalProfiles.get(culturalGroup);
    
    switch (culturalGroup) {
      case 'maori':
        return {
          directness: 'medium',
          familyInvolvement: 'required',
          terminologyPreference: 'cultural'
        };
      case 'chinese':
        return {
          directness: 'low',
          familyInvolvement: 'recommended',
          terminologyPreference: 'euphemistic'
        };
      case 'western':
        return {
          directness: 'high',
          familyInvolvement: 'optional',
          terminologyPreference: 'medical'
        };
      default:
        return {
          directness: 'medium',
          familyInvolvement: 'recommended',
          terminologyPreference: 'cultural'
        };
    }
  }
}

export default CulturalContextService;