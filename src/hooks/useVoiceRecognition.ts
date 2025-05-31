import { useState, useEffect, useCallback, useRef } from 'react';
import { AudioManager } from '../services/audio/AudioManager';
import { AzureSpeechService } from '../services/azure/AzureSpeechService';
import { PreferredLanguage, AudioState } from '../types';

interface VoiceRecognitionState {
  isListening: boolean;
  interimTranscript: string;
  finalTranscript: string;
  error: string | null;
  audioState: AudioState;
  detectedLanguage: PreferredLanguage;
}

interface VoiceRecognitionOptions {
  onTranscriptUpdate?: (transcript: string, isFinal: boolean) => void;
  onLanguageDetected?: (language: PreferredLanguage) => void;
  onError?: (error: string) => void;
  preferredLanguage?: PreferredLanguage;
  silenceThreshold?: number; // seconds
  autoStop?: boolean;
}

export function useVoiceRecognition(options: VoiceRecognitionOptions = {}) {
  const {
    onTranscriptUpdate,
    onLanguageDetected: _onLanguageDetected,
    onError,
    preferredLanguage = 'en',
    silenceThreshold = 3,
    autoStop = true,
  } = options;

  const [state, setState] = useState<VoiceRecognitionState>({
    isListening: false,
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
  });

  const audioManager = useRef<AudioManager | null>(null);
  const speechService = useRef<AzureSpeechService | null>(null);
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

        // Initialize new services
        audioManager.current = new AudioManager();
        speechService.current = new AzureSpeechService({
          language: preferredLanguage,
        });

        console.log('Voice recognition services initialized');
      } catch (error) {
        console.error('Failed to initialize voice recognition services:', error);
        if (isMounted.current) {
          setState(prev => ({
            ...prev,
            error: `Failed to initialize voice services: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
  }, [preferredLanguage]);

  const cleanup = useCallback(async () => {
    try {
      // Clear timeout first
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Stop any ongoing recognition
      if (speechService.current) {
        await speechService.current.cleanup();
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
      error: null, // Clear any previous errors
    }));
    onTranscriptUpdate?.(text, false);
  }, [onTranscriptUpdate]);

  const handleFinalResult = useCallback((text: string) => {
    if (!isMounted.current) return;
    
    setState(prev => ({
      ...prev,
      finalTranscript: prev.finalTranscript ? prev.finalTranscript + ' ' + text : text,
      interimTranscript: '',
      error: null, // Clear any previous errors
    }));
    onTranscriptUpdate?.(text, true);
  }, [onTranscriptUpdate]);

  const handleError = useCallback((error: string) => {
    if (!isMounted.current) return;
    
    console.error('Voice recognition error:', error);
    setState(prev => ({
      ...prev,
      error,
      isListening: false,
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
    if (!isMounted.current || isInitializing.current) {
      return;
    }

    try {
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
        }, (silenceThreshold + 2) * 1000); // Add 2 seconds buffer
      }

      console.log('Voice recognition started successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start listening';
      console.error('Failed to start listening:', errorMessage);
      handleError(errorMessage);
    }
  }, [handleInterimResult, handleFinalResult, handleError, handleSilenceDetected, autoStop, silenceThreshold]);

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

      console.log('Voice recognition stopped successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to stop listening';
      console.error('Failed to stop listening:', errorMessage);
      handleError(errorMessage);
    }
  }, [handleError]);

  const resetTranscript = useCallback(() => {
    if (!isMounted.current) return;
    
    setState(prev => ({
      ...prev,
      interimTranscript: '',
      finalTranscript: '',
      error: null,
    }));
  }, []);

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
    }, 200); // Reduced frequency to 200ms

    return () => clearInterval(interval);
  }, []);

  return {
    isListening: state.isListening,
    interimTranscript: state.interimTranscript,
    finalTranscript: state.finalTranscript,
    error: state.error,
    audioState: state.audioState,
    detectedLanguage: state.detectedLanguage,
    startListening,
    stopListening,
    resetTranscript,
  };
} 