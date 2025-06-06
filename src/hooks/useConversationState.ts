import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  ConversationState, 
  ConversationMessage, 
  ConversationMode, 
  EmotionalState, 
  ConversationContext,
  CulturalProfile,
  CulturalGroup as _CulturalGroup,
  PreferredLanguage as _PreferredLanguage,
  AudioState
} from '../types';
import CulturalContextService from '../services/cultural/CulturalContextService';
import SpeechCacheService from '../services/cultural/SpeechCacheService';

interface ConversationStateHook {
  conversationState: ConversationState | null;
  currentMessage: string;
  isLoading: boolean;
  error: string | null;
  
  // Core conversation methods
  startConversation: (culturalProfile: CulturalProfile) => Promise<void>;
  endConversation: () => Promise<void>;
  pauseConversation: () => void;
  resumeConversation: () => void;
  
  // Message handling
  addMessage: (content: string, speaker: 'user' | 'assistant', metadata?: Partial<ConversationMessage>) => Promise<void>;
  updateCurrentMessage: (content: string) => void;
  clearCurrentMessage: () => void;
  
  // Context management
  setConversationContext: (context: ConversationContext) => void;
  setEmotionalState: (state: EmotionalState) => void;
  setConversationMode: (mode: ConversationMode) => void;
  
  // Cultural adaptation
  getAdaptedResponse: (baseMessage: string, variables?: Record<string, string>) => Promise<string>;
  getCulturallyAppropriateGreeting: () => Promise<string>;
  getFamilyInvolvementGuidance: () => { level: 'high' | 'medium' | 'low'; guidance: string };
  
  // Audio state management
  updateAudioState: (audioState: Partial<AudioState>) => void;
  
  // History and persistence
  loadConversationHistory: (userId: string) => Promise<void>;
  saveConversationState: () => Promise<void>;
  getConversationSummary: () => {
    messageCount: number;
    duration: number;
    emotionalJourney: EmotionalState[];
    contextSwitches: ConversationContext[];
  };
  
  // Family/Whānau involvement
  checkFamilyInvolvementRequirement: () => boolean;
  suggestFamilyInvolvement: () => string | null;
  
  // Privacy and cultural sensitivity
  shouldShareInformation: (informationType: 'medical' | 'personal' | 'family') => boolean;
  getPrivacyGuidance: () => string;
}

interface ConversationInterruption {
  timestamp: Date;
  context: ConversationContext;
  messageIndex: number;
  reason: 'user_initiated' | 'technical' | 'emergency' | 'timeout';
}

interface CulturalConversationMetrics {
  respectfulnessScore: number;
  familyInvolvementLevel: number;
  culturalTermUsage: number;
  appropriateResponseTime: number;
  stigmaSensitivityScore: number;
}

export const useConversationState = (userId: string): ConversationStateHook => {
  const [conversationState, setConversationState] = useState<ConversationState | null>(null);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [interruptions, setInterruptions] = useState<ConversationInterruption[]>([]);
  const [culturalMetrics, setCulturalMetrics] = useState<CulturalConversationMetrics>({
    respectfulnessScore: 5,
    familyInvolvementLevel: 0,
    culturalTermUsage: 0,
    appropriateResponseTime: 0,
    stigmaSensitivityScore: 5
  });

  const conversationStartTime = useRef<Date | null>(null);
  const lastInteractionTime = useRef<Date>(new Date());
  const culturalService = useRef(CulturalContextService.getInstance());
  const cacheService = useRef(SpeechCacheService.getInstance());
  const inactivityTimeout = useRef<NodeJS.Timeout | null>(null);

  const CONVERSATION_KEY = `conversation_${userId}`;
  const INTERRUPTION_KEY = `interruptions_${userId}`;
  const METRICS_KEY = `cultural_metrics_${userId}`;
  const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  // Load conversation state on mount
  useEffect(() => {
    loadConversationHistory(userId);
    loadInterruptions();
    loadCulturalMetrics();
  }, [userId]);

  // Auto-save conversation state when it changes
  useEffect(() => {
    if (conversationState) {
      saveConversationState();
    }
  }, [conversationState]);

  // Handle inactivity timeout
  useEffect(() => {
    if (conversationState?.currentMode === 'listening' || conversationState?.currentMode === 'speaking') {
      resetInactivityTimeout();
    }
    
    return () => {
      if (inactivityTimeout.current) {
        clearTimeout(inactivityTimeout.current);
      }
    };
  }, [conversationState?.currentMode]);

  const resetInactivityTimeout = useCallback(() => {
    if (inactivityTimeout.current) {
      clearTimeout(inactivityTimeout.current);
    }
    
    inactivityTimeout.current = setTimeout(() => {
      if (conversationState) {
        handleInactivityTimeout();
      }
    }, INACTIVITY_TIMEOUT);
  }, [conversationState]);

  const handleInactivityTimeout = useCallback(() => {
    if (conversationState) {
      const interruption: ConversationInterruption = {
        timestamp: new Date(),
        context: conversationState.context,
        messageIndex: conversationState.messages.length,
        reason: 'timeout'
      };
      
      setInterruptions(prev => [...prev, interruption]);
      pauseConversation();
    }
  }, [conversationState]);

  const loadConversationHistory = async (userIdParam: string): Promise<void> => {
    try {
      setIsLoading(true);
      const stored = await AsyncStorage.getItem(`conversation_${userIdParam}`);
      if (stored) {
        const parsedState = JSON.parse(stored);
        // Convert date strings back to Date objects
        parsedState.lastInteraction = new Date(parsedState.lastInteraction);
        parsedState.messages = parsedState.messages.map((msg: ConversationMessage) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setConversationState(parsedState);
      }
    } catch (err) {
      setError('Failed to load conversation history');
      console.error('Error loading conversation history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadInterruptions = async (): Promise<void> => {
    try {
      const stored = await AsyncStorage.getItem(INTERRUPTION_KEY);
      if (stored) {
        const parsedInterruptions = JSON.parse(stored).map((int: { timestamp: string; [key: string]: unknown }) => ({
          ...int,
          timestamp: new Date(int.timestamp)
        }));
        setInterruptions(parsedInterruptions);
      }
    } catch (err) {
      console.error('Error loading interruptions:', err);
    }
  };

  const loadCulturalMetrics = async (): Promise<void> => {
    try {
      const stored = await AsyncStorage.getItem(METRICS_KEY);
      if (stored) {
        setCulturalMetrics(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Error loading cultural metrics:', err);
    }
  };

  const startConversation = async (culturalProfile: CulturalProfile): Promise<void> => {
    try {
      setIsLoading(true);
      conversationStartTime.current = new Date();
      lastInteractionTime.current = new Date();

      // Warm the cache for this cultural profile
      await cacheService.current.warmCacheForUser(culturalProfile.culturalGroup, userId);

      const newConversationState: ConversationState = {
        id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        culturalProfile,
        messages: [],
        currentMode: 'idle',
        lastInteraction: new Date(),
        context: 'casual',
        audioState: {
          isRecording: false,
          isPlaying: false,
          duration: 0,
          error: null
        }
      };

      setConversationState(newConversationState);
      
      // Add initial culturally appropriate greeting
      const greeting = await getCulturallyAppropriateGreeting();
      await addMessage(greeting, 'assistant', {
        context: 'casual',
        emotionalState: 'neutral'
      });

      resetInactivityTimeout();
    } catch (err) {
      setError('Failed to start conversation');
      console.error('Error starting conversation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const endConversation = async (): Promise<void> => {
    if (!conversationState) return;

    try {
      // Add culturally appropriate farewell
      const culturalGroup = conversationState.culturalProfile.culturalGroup;
      const farewells = culturalService.current.getConversationFlow(culturalGroup, 'farewell');
      const farewell = farewells[Math.floor(Math.random() * farewells.length)];
      
      await addMessage(farewell, 'assistant', {
        context: 'casual',
        emotionalState: 'neutral'
      });

      // Update final state
      setConversationState(prev => prev ? {
        ...prev,
        currentMode: 'idle',
        lastInteraction: new Date()
      } : null);

      await saveConversationState();
      await saveCulturalMetrics();
      
      if (inactivityTimeout.current) {
        clearTimeout(inactivityTimeout.current);
      }
    } catch (err) {
      setError('Failed to end conversation properly');
      console.error('Error ending conversation:', err);
    }
  };

  const pauseConversation = (): void => {
    if (!conversationState) return;

    const interruption: ConversationInterruption = {
      timestamp: new Date(),
      context: conversationState.context,
      messageIndex: conversationState.messages.length,
      reason: 'user_initiated'
    };

    setInterruptions(prev => [...prev, interruption]);
    setConversationState(prev => prev ? {
      ...prev,
      currentMode: 'idle'
    } : null);

    if (inactivityTimeout.current) {
      clearTimeout(inactivityTimeout.current);
    }
  };

  const resumeConversation = (): void => {
    if (!conversationState) return;

    setConversationState(prev => prev ? {
      ...prev,
      currentMode: 'listening',
      lastInteraction: new Date()
    } : null);

    resetInactivityTimeout();
  };

  const addMessage = async (
    content: string, 
    speaker: 'user' | 'assistant', 
    metadata: Partial<ConversationMessage> = {}
  ): Promise<void> => {
    if (!conversationState) return;

    try {
      const message: ConversationMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        content,
        language: conversationState.culturalProfile.preferredLanguage,
        speaker,
        emotionalState: metadata.emotionalState || 'neutral',
        context: metadata.context || conversationState.context,
        audioUrl: metadata.audioUrl
      };

      setConversationState(prev => prev ? {
        ...prev,
        messages: [...prev.messages, message],
        lastInteraction: new Date()
      } : null);

      lastInteractionTime.current = new Date();
      
      // Update cultural metrics based on message content
      updateCulturalMetrics(content, speaker);
      
      // Cache the phrase if it's from assistant
      if (speaker === 'assistant') {
        const culturalGroup = conversationState.culturalProfile.culturalGroup;
        const cached = await cacheService.current.getCachedPhrase(content, culturalGroup, conversationState.context);
        if (!cached) {
          // This would integrate with speech synthesis to create audio
          const cachedPhrase = {
            id: `phrase_${Date.now()}`,
            content,
            language: conversationState.culturalProfile.preferredLanguage,
            context: conversationState.context,
            culturalProfileId: userId,
            audioUrl: '', // Would be populated by speech synthesis
            lastUsed: new Date(),
            useCount: 1
          };
          await cacheService.current.cachePhrase(cachedPhrase);
        }
      }

      resetInactivityTimeout();
    } catch (err) {
      setError('Failed to add message');
      console.error('Error adding message:', err);
    }
  };

  const updateCulturalMetrics = (content: string, _speaker: 'user' | 'assistant'): void => {
    if (!conversationState) return;

    const culturalGroup = conversationState.culturalProfile.culturalGroup;
    const text = content.toLowerCase();
    
    setCulturalMetrics(prev => {
      const newMetrics = { ...prev };
      
      // Update respectfulness score based on polite language
      const politeWords = ['please', 'thank you', 'whakamārama', '请', '谢谢'];
      const politeCount = politeWords.filter(word => text.includes(word)).length;
      if (politeCount > 0) {
        newMetrics.respectfulnessScore = Math.min(10, newMetrics.respectfulnessScore + 0.5);
      }
      
      // Update family involvement level
      const familyWords = ['whānau', 'family', '家庭', 'together'];
      const familyCount = familyWords.filter(word => text.includes(word)).length;
      if (familyCount > 0) {
        newMetrics.familyInvolvementLevel += familyCount;
      }
      
      // Update cultural term usage
      const culturalTerms = culturalService.current.adaptTerminology('', culturalGroup);
      if (culturalTerms !== content) {
        newMetrics.culturalTermUsage += 1;
      }
      
      return newMetrics;
    });
  };

  const updateCurrentMessage = (content: string): void => {
    setCurrentMessage(content);
  };

  const clearCurrentMessage = (): void => {
    setCurrentMessage('');
  };

  const setConversationContext = (context: ConversationContext): void => {
    if (!conversationState) return;
    
    setConversationState(prev => prev ? {
      ...prev,
      context,
      lastInteraction: new Date()
    } : null);
  };

  const setEmotionalState = (_state: EmotionalState): void => {
    // This would typically be set on individual messages rather than conversation state
    // but we can track it for context
    lastInteractionTime.current = new Date();
  };

  const setConversationMode = (mode: ConversationMode): void => {
    if (!conversationState) return;
    
    setConversationState(prev => prev ? {
      ...prev,
      currentMode: mode,
      lastInteraction: new Date()
    } : null);

    if (mode === 'listening' || mode === 'speaking') {
      resetInactivityTimeout();
    }
  };

  const updateAudioState = (audioState: Partial<AudioState>): void => {
    if (!conversationState) return;
    
    setConversationState(prev => prev ? {
      ...prev,
      audioState: { ...prev.audioState, ...audioState },
      lastInteraction: new Date()
    } : null);
  };

  const getAdaptedResponse = async (baseMessage: string, variables: Record<string, string> = {}): Promise<string> => {
    if (!conversationState) return baseMessage;

    const culturalGroup = conversationState.culturalProfile.culturalGroup;
    const context = conversationState.context;
    
    return culturalService.current.getAdaptedResponse(culturalGroup, context, baseMessage, variables);
  };

  const getCulturallyAppropriateGreeting = async (): Promise<string> => {
    if (!conversationState) return 'Hello';

    const culturalGroup = conversationState.culturalProfile.culturalGroup;
    const hour = new Date().getHours();
    
    let timeOfDay = 'general';
    if (hour < 12) timeOfDay = 'morning';
    else if (hour < 17) timeOfDay = 'afternoon';
    else timeOfDay = 'evening';

    const greetings = cacheService.current.getPhrasesForContext(culturalGroup, 'greetings', timeOfDay);
    return greetings[Math.floor(Math.random() * greetings.length)] || 'Hello';
  };

  const getFamilyInvolvementGuidance = (): { level: 'high' | 'medium' | 'low'; guidance: string } => {
    if (!conversationState) return { level: 'medium', guidance: 'Consider family involvement' };

    const culturalGroup = conversationState.culturalProfile.culturalGroup;
    const context = conversationState.context;
    const level = culturalService.current.getFamilyInvolvementLevel(culturalGroup, context);
    
    const guidance = {
      maori: 'Whānau involvement is essential for holistic care and decision-making',
      chinese: 'Family should be respectfully included while maintaining face and dignity',
      western: 'Respect individual autonomy while offering family support options'
    };

    return { level, guidance: guidance[culturalGroup] };
  };

  const checkFamilyInvolvementRequirement = (): boolean => {
    if (!conversationState) return false;
    
    const culturalGroup = conversationState.culturalProfile.culturalGroup;
    const stigmaStrategy = culturalService.current.getStigmaHandlingStrategy(culturalGroup);
    
    return stigmaStrategy.familyInvolvement === 'required';
  };

  const suggestFamilyInvolvement = (): string | null => {
    if (!conversationState) return null;
    
    const { level, guidance } = getFamilyInvolvementGuidance();
    
    if (level === 'high') {
      return guidance;
    }
    
    if (level === 'medium' && culturalMetrics.familyInvolvementLevel < 2) {
      return `Based on your cultural background, ${guidance.toLowerCase()}`;
    }
    
    return null;
  };

  const shouldShareInformation = (informationType: 'medical' | 'personal' | 'family'): boolean => {
    if (!conversationState) return false;
    
    const culturalGroup = conversationState.culturalProfile.culturalGroup;
    const stigmaStrategy = culturalService.current.getStigmaHandlingStrategy(culturalGroup);
    
    switch (informationType) {
      case 'medical':
        return stigmaStrategy.directness !== 'low';
      case 'personal':
        return culturalGroup === 'western' || culturalMetrics.respectfulnessScore > 7;
      case 'family':
        return stigmaStrategy.familyInvolvement !== 'optional';
      default:
        return true;
    }
  };

  const getPrivacyGuidance = (): string => {
    if (!conversationState) return 'Your privacy is important to us';
    
    const culturalGroup = conversationState.culturalProfile.culturalGroup;
    
    const guidance = {
      maori: 'Information will be shared respectfully with whānau as appropriate',
      chinese: 'We will protect your dignity and family honor in all communications',
      western: 'You have full control over your personal information sharing'
    };

    return guidance[culturalGroup];
  };

  const saveConversationState = async (): Promise<void> => {
    if (!conversationState) return;
    
    try {
      await AsyncStorage.setItem(CONVERSATION_KEY, JSON.stringify(conversationState));
      await AsyncStorage.setItem(INTERRUPTION_KEY, JSON.stringify(interruptions));
    } catch (err) {
      console.error('Error saving conversation state:', err);
    }
  };

  const saveCulturalMetrics = async (): Promise<void> => {
    try {
      await AsyncStorage.setItem(METRICS_KEY, JSON.stringify(culturalMetrics));
    } catch (err) {
      console.error('Error saving cultural metrics:', err);
    }
  };

  const getConversationSummary = () => {
    if (!conversationState || !conversationStartTime.current) {
      return {
        messageCount: 0,
        duration: 0,
        emotionalJourney: [] as EmotionalState[],
        contextSwitches: [] as ConversationContext[]
      };
    }

    const duration = new Date().getTime() - conversationStartTime.current.getTime();
    const emotionalJourney = conversationState.messages
      .filter(msg => msg.emotionalState)
      .map(msg => msg.emotionalState!);
    
    const contextSwitches = conversationState.messages
      .filter(msg => msg.context)
      .map(msg => msg.context!);

    return {
      messageCount: conversationState.messages.length,
      duration,
      emotionalJourney,
      contextSwitches
    };
  };

  return {
    conversationState,
    currentMessage,
    isLoading,
    error,
    startConversation,
    endConversation,
    pauseConversation,
    resumeConversation,
    addMessage,
    updateCurrentMessage,
    clearCurrentMessage,
    setConversationContext,
    setEmotionalState,
    setConversationMode,
    getAdaptedResponse,
    getCulturallyAppropriateGreeting,
    getFamilyInvolvementGuidance,
    updateAudioState,
    loadConversationHistory,
    saveConversationState,
    getConversationSummary,
    checkFamilyInvolvementRequirement,
    suggestFamilyInvolvement,
    shouldShareInformation,
    getPrivacyGuidance
  };
};

export default useConversationState;