export type CulturalGroup = 'maori' | 'chinese' | 'western';
export type PreferredLanguage = 'en' | 'mi' | 'zh';
export type CommunicationStyle = 'indirect_respectful' | 'hierarchical_respectful' | 'direct_medical';
export type FamilyStructure = 'whanau_centered' | 'filial_piety_based' | 'individual_focused';
export type SpiritualAspect = 'journey_based' | 'karma_concepts' | 'optional';
export type StigmaLevel = 'low' | 'moderate' | 'high';

export interface PreferredTerms {
  dementia: string;
  [key: string]: string;
}

export interface CulturalProfile {
  id: string;
  culturalGroup: CulturalGroup;
  preferredLanguage: PreferredLanguage;
  preferredTerms: PreferredTerms;
  communicationStyle: CommunicationStyle;
  familyStructure: FamilyStructure;
  spiritualAspects: SpiritualAspect;
  stigmaLevel: StigmaLevel;
  customNuances: Record<string, unknown>;
}

export interface CulturalContext {
  id: string;
  profileId: string;
  contextType: 'greeting' | 'emotional_support' | 'medical_discussion' | 'family_interaction';
  templates: Array<{
    language: PreferredLanguage;
    content: string;
    context: string;
  }>;
  culturalNotes: string[];
}

export const DEFAULT_CULTURAL_PROFILES: Record<CulturalGroup, Omit<CulturalProfile, 'id'>> = {
  maori: {
    culturalGroup: 'maori',
    preferredLanguage: 'mi',
    preferredTerms: {
      dementia: 'mate wareware'
    },
    communicationStyle: 'indirect_respectful',
    familyStructure: 'whanau_centered',
    spiritualAspects: 'journey_based',
    stigmaLevel: 'low',
    customNuances: {}
  },
  chinese: {
    culturalGroup: 'chinese',
    preferredLanguage: 'zh',
    preferredTerms: {
      dementia: '痴呆症'
    },
    communicationStyle: 'hierarchical_respectful',
    familyStructure: 'filial_piety_based',
    spiritualAspects: 'karma_concepts',
    stigmaLevel: 'high',
    customNuances: {}
  },
  western: {
    culturalGroup: 'western',
    preferredLanguage: 'en',
    preferredTerms: {
      dementia: 'dementia'
    },
    communicationStyle: 'direct_medical',
    familyStructure: 'individual_focused',
    spiritualAspects: 'optional',
    stigmaLevel: 'moderate',
    customNuances: {}
  }
}; 