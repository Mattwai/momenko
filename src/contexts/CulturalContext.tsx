import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CulturalProfile, PreferredLanguage, CulturalGroup, ConversationContext } from '../types';
import { DEFAULT_CULTURAL_PROFILES } from '../types/cultural';
import CulturalContextService from '../services/cultural/CulturalContextService';
import SpeechCacheService from '../services/cultural/SpeechCacheService';

interface CulturalContextType {
  culturalProfile: CulturalProfile;
  updateCulturalProfile: (profile: Partial<CulturalProfile>) => void;
  setPreferredLanguage: (language: PreferredLanguage) => void;
  
  // Cultural adaptation methods
  getAdaptedResponse: (baseMessage: string, context: ConversationContext, variables?: Record<string, string>) => string;
  getCulturalGreeting: (timeOfDay?: 'morning' | 'afternoon' | 'evening') => string;
  getFamilyInvolvementGuidance: () => { level: 'high' | 'medium' | 'low'; guidance: string };
  adaptTerminology: (message: string) => string;
  
  // Cultural detection
  detectCulturalPreferences: (conversationHistory: string[], languageUsage: Record<PreferredLanguage, number>) => Promise<CulturalGroup>;
  
  // Cache management
  warmSpeechCache: () => Promise<void>;
  getCachedPhrase: (content: string, context: ConversationContext) => Promise<any>;
  
  // Cultural sensitivity
  validateCulturalAppropriateness: (content: string) => { isAppropriate: boolean; concerns: string[] };
  getStigmaHandlingStrategy: () => { directness: 'high' | 'medium' | 'low'; familyInvolvement: 'required' | 'recommended' | 'optional'; terminologyPreference: 'medical' | 'euphemistic' | 'cultural' };
  
  // State
  isLoading: boolean;
  error: string | null;
}

// Generate a unique ID for the default profile
const generateProfileId = () => `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const defaultCulturalProfile: CulturalProfile = {
  id: generateProfileId(),
  ...DEFAULT_CULTURAL_PROFILES.western,
};

const CulturalContext = createContext<CulturalContextType>({
  culturalProfile: defaultCulturalProfile,
  updateCulturalProfile: () => {},
  setPreferredLanguage: () => {},
  getAdaptedResponse: () => '',
  getCulturalGreeting: () => 'Hello',
  getFamilyInvolvementGuidance: () => ({ level: 'medium', guidance: 'Consider family involvement' }),
  adaptTerminology: (message) => message,
  detectCulturalPreferences: async () => 'western',
  warmSpeechCache: async () => {},
  getCachedPhrase: async () => null,
  validateCulturalAppropriateness: () => ({ isAppropriate: true, concerns: [] }),
  getStigmaHandlingStrategy: () => ({ directness: 'medium', familyInvolvement: 'recommended', terminologyPreference: 'cultural' }),
  isLoading: false,
  error: null,
});

export const useCulturalContext = () => useContext(CulturalContext);

interface CulturalProviderProps {
  children: React.ReactNode;
}

export const CulturalProvider: React.FC<CulturalProviderProps> = ({ children }) => {
  const [culturalProfile, setCulturalProfile] = useState<CulturalProfile>(defaultCulturalProfile);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const culturalService = useRef(CulturalContextService.getInstance());
  const cacheService = useRef(SpeechCacheService.getInstance());

  // Load cultural profile from storage on mount
  useEffect(() => {
    loadCulturalProfile();
  }, []);

  const loadCulturalProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const storedProfile = await AsyncStorage.getItem('culturalProfile');
      if (storedProfile) {
        const profile = JSON.parse(storedProfile);
        setCulturalProfile(profile);
        
        // Warm the cache for this cultural profile
        await cacheService.current.warmCacheForUser(profile.culturalGroup, profile.id);
      }
    } catch (err) {
      console.error('Error loading cultural profile:', err);
      setError('Failed to load cultural profile');
    } finally {
      setIsLoading(false);
    }
  };

  const saveCulturalProfile = async (profile: CulturalProfile) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await AsyncStorage.setItem('culturalProfile', JSON.stringify(profile));
      await culturalService.current.saveCulturalProfile(profile.id, profile);
      
      // Warm cache for new profile
      await cacheService.current.warmCacheForUser(profile.culturalGroup, profile.id);
    } catch (err) {
      console.error('Error saving cultural profile:', err);
      setError('Failed to save cultural profile');
    } finally {
      setIsLoading(false);
    }
  };

  const updateCulturalProfile = (updates: Partial<CulturalProfile>) => {
    const updatedProfile = { ...culturalProfile, ...updates };
    setCulturalProfile(updatedProfile);
    saveCulturalProfile(updatedProfile);
  };

  const setPreferredLanguage = (language: PreferredLanguage) => {
    const culturalGroup: CulturalGroup = 
      language === 'mi' ? 'maori' :
      language === 'zh' ? 'chinese' : 'western';

    const defaultProfile = DEFAULT_CULTURAL_PROFILES[culturalGroup];
    updateCulturalProfile({
      ...defaultProfile,
      id: culturalProfile.id, // Preserve the existing ID
    });
  };

  // Cultural adaptation methods
  const getAdaptedResponse = (baseMessage: string, context: ConversationContext, variables: Record<string, string> = {}): string => {
    return culturalService.current.getAdaptedResponse(culturalProfile.culturalGroup, context, baseMessage, variables);
  };

  const getCulturalGreeting = (timeOfDay?: 'morning' | 'afternoon' | 'evening'): string => {
    const greetings = cacheService.current.getPhrasesForContext(
      culturalProfile.culturalGroup, 
      'greetings', 
      timeOfDay || 'general'
    );
    return greetings[Math.floor(Math.random() * greetings.length)] || 'Hello';
  };

  const getFamilyInvolvementGuidance = (): { level: 'high' | 'medium' | 'low'; guidance: string } => {
    const level = culturalService.current.getFamilyInvolvementLevel(culturalProfile.culturalGroup, 'casual');
    const strategy = culturalService.current.getStigmaHandlingStrategy(culturalProfile.culturalGroup);
    
    const guidance = {
      maori: 'Whānau involvement is essential for holistic care and decision-making',
      chinese: 'Family should be respectfully included while maintaining face and dignity',
      western: 'Respect individual autonomy while offering family support options'
    };

    return { level, guidance: guidance[culturalProfile.culturalGroup] };
  };

  const adaptTerminology = (message: string): string => {
    return culturalService.current.adaptTerminology(message, culturalProfile.culturalGroup);
  };

  // Cultural detection
  const detectCulturalPreferences = async (
    conversationHistory: string[], 
    languageUsage: Record<PreferredLanguage, number>
  ): Promise<CulturalGroup> => {
    try {
      setIsLoading(true);
      const detectedGroup = culturalService.current.detectCulturalPreferences(
        culturalProfile.id, 
        conversationHistory, 
        languageUsage
      );
      
      // If detected group differs significantly, suggest profile update
      if (detectedGroup !== culturalProfile.culturalGroup) {
        const newProfile = {
          ...DEFAULT_CULTURAL_PROFILES[detectedGroup],
          id: culturalProfile.id
        };
        
        // Don't auto-update, but could emit event for UI to suggest change
        console.log(`Detected cultural preference: ${detectedGroup}, current: ${culturalProfile.culturalGroup}`);
      }
      
      return detectedGroup;
    } catch (err) {
      console.error('Error detecting cultural preferences:', err);
      return culturalProfile.culturalGroup;
    } finally {
      setIsLoading(false);
    }
  };

  // Cache management
  const warmSpeechCache = async (): Promise<void> => {
    try {
      await cacheService.current.warmCacheForUser(culturalProfile.culturalGroup, culturalProfile.id);
    } catch (err) {
      console.error('Error warming speech cache:', err);
    }
  };

  const getCachedPhrase = async (content: string, context: ConversationContext): Promise<any> => {
    try {
      return await cacheService.current.getCachedPhrase(content, culturalProfile.culturalGroup, context);
    } catch (err) {
      console.error('Error getting cached phrase:', err);
      return null;
    }
  };

  // Cultural sensitivity
  const validateCulturalAppropriateness = (content: string): { isAppropriate: boolean; concerns: string[] } => {
    return cacheService.current.validateCulturalAppropriateness(content, culturalProfile.culturalGroup);
  };

  const getStigmaHandlingStrategy = () => {
    return culturalService.current.getStigmaHandlingStrategy(culturalProfile.culturalGroup);
  };

  return (
    <CulturalContext.Provider
      value={{
        culturalProfile,
        updateCulturalProfile,
        setPreferredLanguage,
        getAdaptedResponse,
        getCulturalGreeting,
        getFamilyInvolvementGuidance,
        adaptTerminology,
        detectCulturalPreferences,
        warmSpeechCache,
        getCachedPhrase,
        validateCulturalAppropriateness,
        getStigmaHandlingStrategy,
        isLoading,
        error,
      }}
    >
      {children}
    </CulturalContext.Provider>
  );
}; 