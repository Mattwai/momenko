import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { VoiceCommunicationService, VoiceCommunicationOptions } from '../services/voice/VoiceCommunicationService';
import { PreferredLanguage } from '../types';
import config from '../config';

export interface UseVoiceCommunicationOptions {
  preferredLanguage: PreferredLanguage;
  enableTTS?: boolean;
  voiceId?: string;
  modelId?: string;
  onTranscriptUpdate?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
}

export interface AudioState {
  isRecording: boolean;
  isPlaying: boolean;
  duration: number;
  error: string | null;
}

export interface VoiceCommunicationState {
  isListening: boolean;
  isSpeaking: boolean;
  interimTranscript: string;
  finalTranscript: string;
  error: string | null;
  audioState: AudioState;
  isInitialized: boolean;
  isSimulationMode: boolean;
  simulationInfo: string | null;
}

export const useVoiceCommunication = (options: UseVoiceCommunicationOptions) => {
  const {
    preferredLanguage,
    enableTTS = true,
    voiceId,
    modelId,
    onTranscriptUpdate,
    onError,
    onSpeechStart,
    onSpeechEnd
  } = options;

  // Check if we're in Expo Go (simulation mode)
  const isExpoGo = __DEV__ && typeof navigator !== 'undefined';
  
  // State
  const [state, setState] = useState<VoiceCommunicationState>({
    isListening: false,
    isSpeaking: false,
    interimTranscript: '',
    finalTranscript: '',
    error: null,
    audioState: {
      isRecording: false,
      isPlaying: false,
      duration: 0,
      error: null
    },
    isInitialized: false,
    isSimulationMode: isExpoGo,
    simulationInfo: isExpoGo ? 'Running in Expo Go - voice features limited' : null
  });

  // Refs
  const serviceRef = useRef<VoiceCommunicationService | null>(null);

  // Initialize service
  useEffect(() => {
    // Only initialize if we're not in Expo Go
    if (isExpoGo) {
      console.warn('🚨 Running in Expo Go - using simulation mode');
      setState(prev => ({
        ...prev,
        isInitialized: true,
        isSimulationMode: true,
        simulationInfo: 'Running in Expo Go - voice features limited. Create a development build for full functionality.'
      }));
      return;
    }

    const init = async () => {
      try {
        // Create service instance
        const serviceOptions: VoiceCommunicationOptions = {
          preferredLanguage,
          voiceId,
          modelId,
          onTranscriptUpdate: (text, isFinal) => {
            setState(prev => ({
              ...prev,
              interimTranscript: isFinal ? '' : text,
              finalTranscript: isFinal ? text : prev.finalTranscript
            }));
            
            if (onTranscriptUpdate) {
              onTranscriptUpdate(text, isFinal);
            }
          },
          onError: (error) => {
            setState(prev => ({ ...prev, error }));
            
            if (onError) {
              onError(error);
            }
          },
          onSpeechStart: () => {
            setState(prev => ({ 
              ...prev, 
              isSpeaking: true,
              audioState: { ...prev.audioState, isPlaying: true }
            }));
            
            if (onSpeechStart) {
              onSpeechStart();
            }
          },
          onSpeechEnd: () => {
            setState(prev => ({ 
              ...prev, 
              isSpeaking: false,
              audioState: { ...prev.audioState, isPlaying: false }
            }));
            
            if (onSpeechEnd) {
              onSpeechEnd();
            }
          }
        };
        
        serviceRef.current = new VoiceCommunicationService(serviceOptions);
        
        // Wait a moment to ensure initialization
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Update state
        const serviceState = serviceRef.current.getState();
        setState(prev => ({
          ...prev,
          isInitialized: true,
          isListening: serviceState.isListening,
          isSpeaking: serviceState.isSpeaking,
          interimTranscript: serviceState.interimTranscript,
          finalTranscript: serviceState.finalTranscript,
          isSimulationMode: false,
          simulationInfo: null
        }));
        
        console.log('Voice Communication hook initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Voice Communication hook:', error);
        setState(prev => ({
          ...prev,
          error: `Initialization failed: ${error}`,
          isInitialized: false
        }));
      }
    };

    init();

    // Cleanup
    return () => {
      if (serviceRef.current) {
        serviceRef.current.cleanup();
        serviceRef.current = null;
      }
    };
  }, [preferredLanguage, voiceId, modelId]);

  // Effect to update audio state when listening/speaking changes
  useEffect(() => {
    setState(prev => ({
      ...prev,
      audioState: {
        ...prev.audioState,
        isRecording: state.isListening,
        isPlaying: state.isSpeaking
      }
    }));
  }, [state.isListening, state.isSpeaking]);

  // Method to start listening
  const startListening = useCallback(async () => {
    if (state.isSimulationMode) {
      // Simulate starting listening
      setState(prev => ({
        ...prev,
        isListening: true,
        audioState: { ...prev.audioState, isRecording: true },
        interimTranscript: '',
        error: null
      }));
      
      console.log('🎭 Starting simulated speech recognition...');
      
      // Simulate speech recognition with timeouts
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          interimTranscript: 'Hello...'
        }));
      }, 1000);
      
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          interimTranscript: 'Hello, I am...'
        }));
      }, 2000);
      
      setTimeout(() => {
        const sampleTexts = {
          'en': 'Hello, I am testing the voice recognition system.',
          'mi': 'Kia ora, he whakamātau ahau i te pūnaha rongo reo.',
          'zh': '你好，我正在测试语音识别系统。'
        };
        
        const finalText = sampleTexts[preferredLanguage] || sampleTexts['en'];
        
        setState(prev => ({
          ...prev,
          finalTranscript: finalText,
          interimTranscript: '',
          isListening: false,
          audioState: { ...prev.audioState, isRecording: false }
        }));
        
        if (onTranscriptUpdate) {
          onTranscriptUpdate(finalText, true);
        }
        
        console.log('🎭 Simulated speech recognition complete');
      }, 3500);
      
      return;
    }
    
    try {
      if (!serviceRef.current) {
        throw new Error('Voice Communication Service not initialized');
      }
      
      await serviceRef.current.startListening();
      
      setState(prev => ({
        ...prev,
        isListening: true,
        audioState: { ...prev.audioState, isRecording: true },
        interimTranscript: '',
        error: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: `Failed to start listening: ${error}`,
        isListening: false
      }));
      
      if (onError) {
        onError(`Failed to start listening: ${error}`);
      }
    }
  }, [state.isSimulationMode, preferredLanguage, onTranscriptUpdate, onError]);

  // Method to stop listening
  const stopListening = useCallback(async () => {
    if (state.isSimulationMode) {
      // Simulate stopping listening
      setState(prev => ({
        ...prev,
        isListening: false,
        audioState: { ...prev.audioState, isRecording: false }
      }));
      
      console.log('🎭 Stopped simulated speech recognition');
      return;
    }
    
    try {
      if (!serviceRef.current) {
        throw new Error('Voice Communication Service not initialized');
      }
      
      await serviceRef.current.stopListening();
      
      setState(prev => ({
        ...prev,
        isListening: false,
        audioState: { ...prev.audioState, isRecording: false }
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: `Failed to stop listening: ${error}`
      }));
      
      if (onError) {
        onError(`Failed to stop listening: ${error}`);
      }
    }
  }, [state.isSimulationMode, onError]);

  // Method to speak text
  const speak = useCallback(async (text: string, options?: { voiceId?: string }) => {
    if (!enableTTS) return;
    
    if (state.isSimulationMode) {
      // Simulate speaking
      setState(prev => ({
        ...prev,
        isSpeaking: true,
        audioState: { ...prev.audioState, isPlaying: true }
      }));
      
      if (onSpeechStart) {
        onSpeechStart();
      }
      
      console.log(`🎭 Simulating speech: "${text}"`);
      
      // Simulate speech duration based on text length
      const duration = Math.max(1500, text.length * 50);
      
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          isSpeaking: false,
          audioState: { ...prev.audioState, isPlaying: false }
        }));
        
        if (onSpeechEnd) {
          onSpeechEnd();
        }
        
        console.log('🎭 Simulated speech complete');
      }, duration);
      
      return;
    }
    
    try {
      if (!serviceRef.current) {
        throw new Error('Voice Communication Service not initialized');
      }
      
      await serviceRef.current.speak(text, {
        voiceId: options?.voiceId || voiceId
      });
      
      setState(prev => ({
        ...prev,
        isSpeaking: true,
        audioState: { ...prev.audioState, isPlaying: true }
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: `Failed to speak: ${error}`,
        isSpeaking: false
      }));
      
      if (onError) {
        onError(`Failed to speak: ${error}`);
      }
    }
  }, [state.isSimulationMode, enableTTS, voiceId, onSpeechStart, onSpeechEnd, onError]);

  // Method to stop speaking
  const stopSpeaking = useCallback(async () => {
    if (state.isSimulationMode) {
      // Simulate stopping speech
      setState(prev => ({
        ...prev,
        isSpeaking: false,
        audioState: { ...prev.audioState, isPlaying: false }
      }));
      
      if (onSpeechEnd) {
        onSpeechEnd();
      }
      
      console.log('🎭 Stopped simulated speech');
      return;
    }
    
    try {
      if (!serviceRef.current) {
        throw new Error('Voice Communication Service not initialized');
      }
      
      await serviceRef.current.stopSpeaking();
      
      setState(prev => ({
        ...prev,
        isSpeaking: false,
        audioState: { ...prev.audioState, isPlaying: false }
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: `Failed to stop speaking: ${error}`
      }));
      
      if (onError) {
        onError(`Failed to stop speaking: ${error}`);
      }
    }
  }, [state.isSimulationMode, onSpeechEnd, onError]);

  // Method to reset transcript
  const resetTranscript = useCallback(() => {
    setState(prev => ({
      ...prev,
      interimTranscript: '',
      finalTranscript: ''
    }));
    
    if (serviceRef.current) {
      serviceRef.current.resetTranscript();
    }
  }, []);

  // Method to change language
  const changeLanguage = useCallback(async (language: PreferredLanguage) => {
    if (state.isSimulationMode) {
      console.log(`🎭 Simulated language change: ${language}`);
      return;
    }
    
    try {
      if (!serviceRef.current) {
        throw new Error('Voice Communication Service not initialized');
      }
      
      await serviceRef.current.changeLanguage(language);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: `Failed to change language: ${error}`
      }));
      
      if (onError) {
        onError(`Failed to change language: ${error}`);
      }
    }
  }, [state.isSimulationMode, onError]);

  return {
    isListening: state.isListening,
    isSpeaking: state.isSpeaking,
    interimTranscript: state.interimTranscript,
    finalTranscript: state.finalTranscript,
    error: state.error,
    audioState: state.audioState,
    isInitialized: state.isInitialized,
    isSimulationMode: state.isSimulationMode,
    simulationInfo: state.simulationInfo,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    resetTranscript,
    changeLanguage
  };
};