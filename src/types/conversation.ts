import { CulturalProfile, PreferredLanguage } from './cultural';

export type ConversationMode = 'listening' | 'speaking' | 'idle' | 'processing';
export type EmotionalState = 'neutral' | 'happy' | 'sad' | 'confused' | 'anxious';
export type ConversationContext = 'casual' | 'medical' | 'family' | 'memory' | 'emergency';

export interface AudioState {
  isRecording: boolean;
  isPlaying: boolean;
  duration: number;
  error: string | null;
}

export interface ConversationMessage {
  id: string;
  timestamp: Date;
  content: string;
  language: PreferredLanguage;
  speaker: 'user' | 'assistant';
  emotionalState?: EmotionalState;
  context?: ConversationContext;
  audioUrl?: string;
}

export interface ConversationState {
  id: string;
  userId: string;
  culturalProfile: CulturalProfile;
  messages: ConversationMessage[];
  currentMode: ConversationMode;
  lastInteraction: Date;
  context: ConversationContext;
  audioState: AudioState;
}

export interface ConversationPreferences {
  id: string;
  userId: string;
  preferredVolume: number;
  preferredSpeechRate: number;
  preferredVoiceGender: 'male' | 'female';
  reminderFrequency: 'low' | 'medium' | 'high';
  emergencyContactId: string;
}

export interface CachedPhrase {
  id: string;
  content: string;
  language: PreferredLanguage;
  context: ConversationContext;
  culturalProfileId: string;
  audioUrl: string;
  lastUsed: Date;
  useCount: number;
} 