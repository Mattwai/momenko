import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { AudioManager } from '../services/audio/AudioManager';
import { ReactNativeSpeechService } from '../services/speech/ReactNativeSpeechService';
import { ReactNativeTTSService } from '../services/speech/ReactNativeTTSService';
import { PreferredLanguage, AudioState } from '../types';

interface VoiceCommunicationState {
  isListening: boolean;
  isSpeaking: boolean;
  interimTranscript: string;
  finalTranscript: string;
  error: string | null;
  audioState: AudioState;
  detectedLanguage: PreferredLanguage;
  isInitialized: boolean;
  isSimulationMode: boolean;
}

interface VoiceCommunicationOptions {
  onTranscriptUpdate?: (transcript: string, isFinal: boolean) => void;
  onLanguageDetected?: (language: PreferredLanguage) => void;
  onSpeechStart?: () => void;
  onSpeechComplete?: () => void;
  onError?: (error: string) => void;
  preferredLanguage?: PreferredLanguage;
  silenceThreshold?: number;
  autoStop?: boolean;
  enableTTS?: boolean;
}

export function useVoiceCommunication(options: VoiceCommunicationOptions = {}) {
  const {
    onTranscriptUpdate,
    onLanguageDetected: _onLanguageDetected,
    onSpeechStart,
    onSpeechComplete,
    onError,
    preferredLanguage = 'en',
    silenceThreshold = 3,
    autoStop = true,
    enableTTS = true,
  } = options;

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
      error: null,
    },
    detectedLanguage: preferredLanguage,
    isInitialized: false,
    isSimulationMode: Platform.OS === 'web' || __DEV__, // Detect if running in Expo Go or web
  });

  const audioManager = useRef<AudioManager | null>(null);
  const speechService = useRef<ReactNativeSpeechService | null>(null);
  const ttsService = useRef<ReactNativeTTSService | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializing = useRef(false);
  const isMounted = useRef(true);

  // Initialize services
  useEffect(() => {
    const initializeServices = async () => {
      if (isInitializing.current) return;
      isInitializing.current = true;

      try {
        // Clean up existing services first
        if (audioManager.current) {
          await audioManager.current.cleanup();
        }
        if (speechService.current) {
          await speechService.current.cleanup();
        }
        if (ttsService.current) {
          await ttsService.current.cleanup();
        }

        // Initialize new services
        audioManager.current = new AudioManager();
        speechService.current = new ReactNativeSpeechService({
          language: preferredLanguage,
        });

        if (enableTTS) {
          ttsService.current = new ReactNativeTTSService({
            language: preferredLanguage,
          });
        }

        if (isMounted.current) {
          setState(prev => ({
            ...prev,
            isInitialized: true,
            error: null,
            isSimulationMode: Platform.OS === 'web' || __DEV__,
          }));
        }

        if (Platform.OS === 'web' || __DEV__) {
          console.log('🎭 Voice communication services initialized in simulation mode');
          console.log('📱 For full voice features, create a development build');
        } else {
          console.log('Voice communication services initialized');
        }
      } catch (error) {
        console.error('Failed to initialize voice communication services:', error);
        if (isMounted.current) {
          setState(prev => ({
            ...prev,
            error: `Failed to initialize voice services: ${error instanceof Error ? error.message : 'Unknown error'}`,
            isInitialized: false,
          }));
        }
      } finally {
        isInitializing.current = false;
      }
    };

    initializeServices();

    return () => {
      isMounted.current = false;
      cleanup();
    };
  }, [preferredLanguage, enableTTS]);

  const cleanup = useCallback(async () => {
    try {
      // Clear timeout first
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Stop any ongoing recognition or speech
      if (speechService.current) {
        await speechService.current.cleanup();
      }

      if (ttsService.current) {
        await ttsService.current.cleanup();
      }

      // Clean up audio resources
      if (audioManager.current) {
        await audioManager.current.cleanup();
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }, []);

  const handleInterimResult = useCallback((text: string) => {
    if (!isMounted.current) return;
    
    setState(prev => ({
      ...prev,
      interimTranscript: text,
      error: null,
    }));
    onTranscriptUpdate?.(text, false);
  }, [onTranscriptUpdate]);

  const handleFinalResult = useCallback((text: string) => {
    if (!isMounted.current) return;
    
    setState(prev => ({
      ...prev,
      finalTranscript: prev.finalTranscript ? prev.finalTranscript + ' ' + text : text,
      interimTranscript: '',
      error: null,
    }));
    onTranscriptUpdate?.(text, true);
  }, [onTranscriptUpdate]);

  const handleError = useCallback((error: string) => {
    if (!isMounted.current) return;
    
    console.error('Voice communication error:', error);
    setState(prev => ({
      ...prev,
      error,
      isListening: false,
      isSpeaking: false,
      interimTranscript: '',
    }));
    onError?.(error);
    
    // Auto-cleanup on error to prevent stuck states
    cleanup();
  }, [onError, cleanup]);

  const handleSilenceDetected = useCallback(async () => {
    if (autoStop && isMounted.current) {
      console.log('Silence detected, stopping listening');
      await stopListening();
    }
  }, [autoStop]);

  const startListening = useCallback(async () => {
    if (!isMounted.current || isInitializing.current || !state.isInitialized) {
      return;
    }

    try {
      // Stop any current TTS
      if (state.isSpeaking && ttsService.current) {
        await ttsService.current.stopSpeech();
        setState(prev => ({ ...prev, isSpeaking: false }));
      }

      // Ensure services are initialized
      if (!audioManager.current || !speechService.current) {
        throw new Error('Voice recognition services not initialized');
      }

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setState(prev => ({
        ...prev,
        isListening: true,
        error: null,
        interimTranscript: '',
      }));

      // Start audio recording with silence detection
      await audioManager.current.startRecording(handleSilenceDetected);

      // Start speech recognition
      await speechService.current.startContinuousRecognition(
        handleInterimResult,
        handleFinalResult,
        handleError
      );

      // Set auto-stop timeout if configured (fallback safety)
      if (autoStop && silenceThreshold > 0) {
        timeoutRef.current = setTimeout(async () => {
          if (isMounted.current) {
            console.log('Auto-stop timeout reached');
            await stopListening();
          }
        }, (silenceThreshold + 2) * 1000);
      }

      if (state.isSimulationMode) {
        console.log('🎭 Voice recognition simulation started successfully');
      } else {
        console.log('Voice recognition started successfully');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start listening';
      console.error('Failed to start listening:', errorMessage);
      handleError(errorMessage);
    }
  }, [handleInterimResult, handleFinalResult, handleError, handleSilenceDetected, autoStop, silenceThreshold, state.isSpeaking, state.isInitialized]);

  const stopListening = useCallback(async () => {
    if (!isMounted.current) return;

    try {
      // Clear timeout first
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Stop services in parallel but handle errors independently
      const stopPromises = [];
      
      if (audioManager.current) {
        stopPromises.push(
          audioManager.current.stopRecording().catch(error => {
            console.error('Error stopping audio recording:', error);
          })
        );
      }

      if (speechService.current) {
        stopPromises.push(
          speechService.current.stopContinuousRecognition().catch(error => {
            console.error('Error stopping speech recognition:', error);
          })
        );
      }

      await Promise.allSettled(stopPromises);

      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          isListening: false,
          interimTranscript: '',
        }));
      }

      if (state.isSimulationMode) {
        console.log('🎭 Voice recognition simulation stopped successfully');
      } else {
        console.log('Voice recognition stopped successfully');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to stop listening';
      console.error('Failed to stop listening:', errorMessage);
      handleError(errorMessage);
    }
  }, [handleError]);

  const speak = useCallback(async (text: string): Promise<void> => {
    if (!isMounted.current || !state.isInitialized || !enableTTS || !ttsService.current) {
      return;
    }

    try {
      // Stop listening if active
      if (state.isListening) {
        await stopListening();
      }

      setState(prev => ({
        ...prev,
        isSpeaking: true,
        error: null,
      }));

      onSpeechStart?.();

      await ttsService.current.synthesizeSpeech(
        text,
        () => {
          // onStart
          if (isMounted.current) {
            setState(prev => ({ ...prev, isSpeaking: true }));
          }
        },
        () => {
          // onComplete
          if (isMounted.current) {
            setState(prev => ({ ...prev, isSpeaking: false }));
            onSpeechComplete?.();
          }
        },
        (error) => {
          // onError
          handleError(`Speech synthesis failed: ${error}`);
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to speak';
      console.error('Failed to speak:', errorMessage);
      handleError(errorMessage);
    }
  }, [state.isListening, state.isInitialized, enableTTS, stopListening, onSpeechStart, onSpeechComplete, handleError]);

  const stopSpeaking = useCallback(async () => {
    if (!isMounted.current || !ttsService.current) return;

    try {
      await ttsService.current.stopSpeech();
      setState(prev => ({ ...prev, isSpeaking: false }));
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  }, []);

  const resetTranscript = useCallback(() => {
    if (!isMounted.current) return;
    
    setState(prev => ({
      ...prev,
      interimTranscript: '',
      finalTranscript: '',
      error: null,
    }));
  }, []);

  const changeLanguage = useCallback(async (language: PreferredLanguage) => {
    if (!isMounted.current) return;

    try {
      const wasListening = state.isListening;
      const wasSpeaking = state.isSpeaking;

      // Stop current activities
      if (wasListening) {
        await stopListening();
      }
      if (wasSpeaking) {
        await stopSpeaking();
      }

      // Update language in services
      if (speechService.current) {
        await speechService.current.changeLanguage(language);
      }
      if (ttsService.current) {
        await ttsService.current.changeLanguage(language);
      }

      setState(prev => ({
        ...prev,
        detectedLanguage: language,
      }));

      console.log(`Language changed to: ${language}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to change language';
      handleError(errorMessage);
    }
  }, [state.isListening, state.isSpeaking, stopListening, stopSpeaking, handleError]);

  // Update audio state when recording status changes
  useEffect(() => {
    const interval = setInterval(() => {
      if (audioManager.current && isMounted.current) {
        try {
          const audioState = audioManager.current.getAudioState();
          setState(prev => ({
            ...prev,
            audioState,
          }));
        } catch (error) {
          console.error('Error getting audio state:', error);
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return {
    // State
    isListening: state.isListening,
    isSpeaking: state.isSpeaking,
    interimTranscript: state.interimTranscript,
    finalTranscript: state.finalTranscript,
    error: state.error,
    audioState: state.audioState,
    detectedLanguage: state.detectedLanguage,
    isInitialized: state.isInitialized,
    isSimulationMode: state.isSimulationMode,

    // Actions
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    resetTranscript,
    changeLanguage,
    cleanup,

    // Utilities
    isReady: state.isInitialized && !isInitializing.current,
    hasError: !!state.error,
    isActive: state.isListening || state.isSpeaking,
    
    // Platform info
    canUseRealSpeech: !state.isSimulationMode,
    simulationInfo: state.isSimulationMode ? 'Running in Expo Go - using simulation mode' : null,
  };
}