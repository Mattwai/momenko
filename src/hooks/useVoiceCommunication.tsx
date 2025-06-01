import { useState, useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { VoiceCommunicationService, VoiceCommunicationOptions } from '../services/voice/VoiceCommunicationService';
import { PreferredLanguage } from '../types';

export interface UseVoiceCommunicationOptions {
  preferredLanguage: PreferredLanguage;
  enableTTS?: boolean;
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  onTranscriptUpdate?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onAIResponseReceived?: (response: string) => void;
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
  aiResponse: string;
  error: string | null;
  audioState: AudioState;
  detectedLanguage: PreferredLanguage;
  isInitialized: boolean;
  isSimulatedTranscription: boolean;
  hasConversationHistory: boolean;
}

export const useVoiceCommunication = (options: UseVoiceCommunicationOptions) => {
  const {
    preferredLanguage,
    enableTTS = true,
    voiceId,
    modelId,
    stability,
    similarityBoost,
    onTranscriptUpdate,
    onError,
    onSpeechStart,
    onSpeechEnd,
    onAIResponseReceived
  } = options;
  
  // State
  const [state, setState] = useState<VoiceCommunicationState>({
    isListening: false,
    isSpeaking: false,
    interimTranscript: '',
    finalTranscript: '',
    aiResponse: '',
    error: null,
    audioState: {
      isRecording: false,
      isPlaying: false,
      duration: 0,
      error: null,
    },
    detectedLanguage: preferredLanguage,
    isInitialized: false,
    isSimulatedTranscription: true, // Using simulated transcription since DeepSeek API is unavailable
    hasConversationHistory: false,
  });

  // Refs
  const serviceRef = useRef<VoiceCommunicationService | null>(null);
  const isMounted = useRef<boolean>(true);

  // Memoize callback functions to prevent unnecessary re-initialization
  const memoizedUpdateCallback = useCallback((text: string, isFinal: boolean) => {
    if (!isMounted.current) return;
    
    setState(prev => ({
      ...prev,
      interimTranscript: isFinal ? '' : text,
      finalTranscript: isFinal ? text : prev.finalTranscript
    }));
    
    if (onTranscriptUpdate) {
      onTranscriptUpdate(text, isFinal);
    }
  }, [onTranscriptUpdate]);
  
  const memoizedErrorCallback = useCallback((error: string) => {
    if (!isMounted.current) return;
    
    setState(prev => ({ ...prev, error }));
    
    if (onError) {
      onError(error);
    }
  }, [onError]);
  
  const memoizedSpeechStartCallback = useCallback(() => {
    if (!isMounted.current) return;
    
    setState(prev => ({ 
      ...prev, 
      isSpeaking: true,
      audioState: { ...prev.audioState, isPlaying: true }
    }));
    
    if (onSpeechStart) {
      onSpeechStart();
    }
  }, [onSpeechStart]);
  
  const memoizedSpeechEndCallback = useCallback(() => {
    if (!isMounted.current) return;
    
    setState(prev => ({ 
      ...prev, 
      isSpeaking: false,
      audioState: { ...prev.audioState, isPlaying: false }
    }));
    
    if (onSpeechEnd) {
      onSpeechEnd();
    }
  }, [onSpeechEnd]);
  
  const memoizedAIResponseCallback = useCallback((response: string) => {
    if (!isMounted.current) return;
    
    setState(prev => ({
      ...prev,
      aiResponse: response,
      hasConversationHistory: true
    }));
    
    if (onAIResponseReceived) {
      onAIResponseReceived(response);
    }
  }, [onAIResponseReceived]);

  // Initialize service
  useEffect(() => {
    isMounted.current = true;
    
    // Prevent re-initialization if service is already created and same language
    if (serviceRef.current && 
        serviceRef.current.getState().language === preferredLanguage && 
        serviceRef.current.getState().voiceId === (voiceId || serviceRef.current.getState().voiceId)) {
      return;
    }
    
    const init = async () => {
      try {
        // Clean up any existing service
        if (serviceRef.current) {
          await serviceRef.current.cleanup().catch(e => console.warn('Error cleaning up previous service:', e));
        }
        
        // Create service instance
        const serviceOptions: VoiceCommunicationOptions = {
          preferredLanguage,
          voiceId,
          modelId,
          stability,
          similarityBoost,
          onTranscriptUpdate: memoizedUpdateCallback,
          onError: memoizedErrorCallback,
          onSpeechStart: memoizedSpeechStartCallback,
          onSpeechEnd: memoizedSpeechEndCallback,
          onAIResponseReceived: memoizedAIResponseCallback
        };
        
        serviceRef.current = new VoiceCommunicationService(serviceOptions);
        
        // Wait for service to fully initialize
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Update state
        if (!isMounted.current) return;
        
        if (serviceRef.current) {
          const serviceState = serviceRef.current.getState();
          console.log('🔧 Service state after initialization:', serviceState);
          
          // Force state update to ensure initialization is reflected
          setState(prev => {
            const newState = {
              ...prev,
              isInitialized: true,
              isListening: serviceState.isListening,
              isSpeaking: serviceState.isSpeaking,
              interimTranscript: serviceState.interimTranscript,
              finalTranscript: serviceState.finalTranscript,
              hasConversationHistory: serviceState.hasConversationHistory || false,
              error: null // Clear any previous errors
            };
            console.log('🔄 Hook state updated:', { 
              wasInitialized: prev.isInitialized, 
              nowInitialized: newState.isInitialized 
            });
            return newState;
          });
          
          console.log('✅ Voice communication hook initialized successfully');
        }
      } catch (error) {
        if (!isMounted.current) return;
        
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
      isMounted.current = false;
      
      // Stop any ongoing voice activities
      if (serviceRef.current) {
        // Use a separate cleanup function to avoid async issues
        const performCleanup = async () => {
          try {
            if (serviceRef.current) {
              // Force stop listening and speaking
              if (serviceRef.current.getState().isListening) {
                await serviceRef.current.stopListening().catch(() => {});
              }
              
              if (serviceRef.current.getState().isSpeaking) {
                await serviceRef.current.stopSpeaking().catch(() => {});
              }
              
              await serviceRef.current.cleanup().catch(() => {});
              serviceRef.current = null;
            }
          } catch {
            // Ignore cleanup errors
          }
        };
        
        // Run cleanup synchronously to ensure it happens before component is fully unmounted
        performCleanup();
      }
    };
  }, [preferredLanguage, voiceId, modelId, stability, similarityBoost]);



  // Method to start listening
  const startListening = useCallback(async () => {
    console.log('🎤 Start listening called:', { mounted: isMounted.current, initialized: state.isInitialized, listening: state.isListening });
    
    if (!isMounted.current) {
      console.log('🚫 Component not mounted, aborting start listening');
      return;
    }
    
    // If service isn't initialized yet or no current service, don't try to start
    if (!serviceRef.current) {
      console.log('🚫 Service ref not available');
      setState(prev => ({
        ...prev,
        error: 'Voice service not initialized yet. Please try again in a moment.'
      }));
      return;
    }
    
    // Don't try to start if already listening
    if (state.isListening) {
      console.log('🚫 Already listening, ignoring start request');
      return;
    }
    
    try {
      // Set audio mode correctly before starting
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        // Small delay to ensure audio mode is applied
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (audioError) {
        console.warn('Error setting audio mode before recording:', audioError);
      }
      
      // Update UI immediately to provide feedback
      console.log('🎤 Setting listening state to true');
      setState(prev => ({
        ...prev,
        isListening: true,
        audioState: { ...prev.audioState, isRecording: true },
        interimTranscript: '',
        error: null
      }));
      
      // Then start the actual listening
      console.log('🎤 Starting service listening...');
      await serviceRef.current.startListening();
      
      if (!isMounted.current) return;
      
      console.log('🎤 Service listening started successfully');
    } catch (error) {
      if (!isMounted.current) return;
      
      // Handle errors but filter out expected ones
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('DeepSeek API') || errorMessage.includes('WebSocket')) {
        console.warn(`Suppressed error (using device transcription): ${errorMessage}`);
        return;
      }
    
      setState(prev => ({
        ...prev,
        error: `Failed to start listening: ${errorMessage}`,
        isListening: false,
        audioState: { ...prev.audioState, isRecording: false }
      }));
    
      if (onError) {
        onError(`Failed to start listening: ${errorMessage}`);
      }
    }
  }, [onError, state.isListening]);

  // Method to stop listening
  const stopListening = useCallback(async () => {    
    if (!isMounted.current) {
      return;
    }
    
    // If already not listening, don't try to stop
    if (!state.isListening) {
      return;
    }
    
    // Update UI immediately for better user feedback
    setState(prev => ({
      ...prev,
      isListening: false,
      audioState: { ...prev.audioState, isRecording: false }
    }));
    
    // If service isn't available, just update state
    if (!serviceRef.current) {
      return;
    }
    
    try {
      await serviceRef.current.stopListening();
    } catch (error) {
      if (!isMounted.current) return;
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Only report non-DeepSeek errors
      if (!errorMessage.includes('DeepSeek') && !errorMessage.includes('WebSocket')) {
        if (onError) {
          onError(`Failed to stop listening: ${errorMessage}`);
        }
      }
    } finally {
      // Reset audio mode to ensure proper cleanup
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
        });
      } catch (audioError) {
        // Just log but don't propagate the error
        console.warn('Error resetting audio mode after recording:', audioError);
      }
    }
  }, [onError, state.isListening]);

  // Method to speak text
  const speak = useCallback(async (text: string, options?: { voiceId?: string, stability?: number, similarityBoost?: number }) => {
    if (!enableTTS || !isMounted.current || !serviceRef.current) return;
    
    try {
      // Set audio mode for playback
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
      } catch (audioError) {
        console.warn('Error setting audio mode before playback:', audioError);
      }
      
      await serviceRef.current.speak(text, {
        voiceId: options?.voiceId || voiceId,
        stability: options?.stability || stability,
        similarityBoost: options?.similarityBoost || similarityBoost
      });
      
      if (!isMounted.current) return;
      
      setState(prev => ({
        ...prev,
        isSpeaking: true,
        audioState: { ...prev.audioState, isPlaying: true }
      }));
    } catch (error) {
      if (!isMounted.current) return;
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      setState(prev => ({
        ...prev,
        error: `Failed to speak: ${errorMessage}`,
        isSpeaking: false,
        audioState: { ...prev.audioState, isPlaying: false }
      }));
      
      if (onError) {
        onError(`Failed to speak: ${errorMessage}`);
      }
    }
  }, [enableTTS, voiceId, stability, similarityBoost, onError]);

  // Method to stop speaking
  const stopSpeaking = useCallback(async () => {    
    if (!isMounted.current || !serviceRef.current) {
      return;
    }
    
    try {
      await serviceRef.current.stopSpeaking();
      
      if (!isMounted.current) return;
      
      setState(prev => ({
        ...prev,
        isSpeaking: false,
        audioState: { ...prev.audioState, isPlaying: false }
      }));
    } catch (error) {
      if (!isMounted.current) return;
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      setState(prev => ({
        ...prev,
        error: `Failed to stop speaking: ${errorMessage}`,
        isSpeaking: false,
        audioState: { ...prev.audioState, isPlaying: false }
      }));
      
      if (onError) {
        onError(`Failed to stop speaking: ${errorMessage}`);
      }
    }
  }, [onSpeechEnd, onError]);

  // Method to reset transcript
  const resetTranscript = useCallback(() => {
    if (!isMounted.current) return;
    
    setState(prev => ({
      ...prev,
      interimTranscript: '',
      finalTranscript: ''
    }));
    
    if (serviceRef.current) {
      serviceRef.current.resetTranscript();
    }
  }, []);
  
  // Method to reset conversation history
  const resetConversation = useCallback(() => {
    if (!isMounted.current) return;
    
    setState(prev => ({
      ...prev,
      aiResponse: '',
      hasConversationHistory: false
    }));
    
    if (serviceRef.current) {
      serviceRef.current.resetConversation();
    }
  }, []);

  // Method to change language
  const changeLanguage = useCallback(async (language: PreferredLanguage) => {
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
  }, [onError]);

  return {
    isListening: state.isListening,
    isSpeaking: state.isSpeaking,
    interimTranscript: state.interimTranscript,
    finalTranscript: state.finalTranscript,
    aiResponse: state.aiResponse,
    error: state.error,
    audioState: state.audioState,
    isInitialized: state.isInitialized,
    isSimulatedTranscription: state.isSimulatedTranscription,
    hasConversationHistory: state.hasConversationHistory,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    resetTranscript,
    resetConversation,
    changeLanguage
  };
};