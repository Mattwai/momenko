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
  const timeoutRef = useRef<number | null>(null);

  // Initialize services
  useEffect(() => {
    audioManager.current = new AudioManager();
    speechService.current = new AzureSpeechService({
      language: preferredLanguage,
    });

    return () => {
      cleanup();
    };
  }, [preferredLanguage]);

  const cleanup = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (audioManager.current) {
      await audioManager.current.cleanup();
    }

    if (speechService.current) {
      await speechService.current.cleanup();
    }
  }, []);

  const handleInterimResult = useCallback((text: string) => {
    setState(prev => ({
      ...prev,
      interimTranscript: text,
    }));
    onTranscriptUpdate?.(text, false);
  }, [onTranscriptUpdate]);

  const handleFinalResult = useCallback((text: string) => {
    setState(prev => ({
      ...prev,
      finalTranscript: prev.finalTranscript + ' ' + text,
      interimTranscript: '',
    }));
    onTranscriptUpdate?.(text, true);
  }, [onTranscriptUpdate]);

  const handleError = useCallback((error: string) => {
    setState(prev => ({
      ...prev,
      error,
      isListening: false,
    }));
    onError?.(error);
  }, [onError]);

  const handleSilenceDetected = useCallback(() => {
    if (autoStop) {
      stopListening();
    }
  }, [autoStop]);

  const startListening = useCallback(async () => {
    try {
      setState(prev => ({
        ...prev,
        isListening: true,
        error: null,
        interimTranscript: '',
      }));

      // Start audio recording with silence detection
      await audioManager.current?.startRecording(handleSilenceDetected);

      // Start speech recognition
      await speechService.current?.startContinuousRecognition(
        handleInterimResult,
        handleFinalResult,
        handleError
      );

      // Set auto-stop timeout if configured
      if (autoStop && silenceThreshold > 0) {
        timeoutRef.current = setTimeout(() => {
          stopListening();
        }, silenceThreshold * 1000) as unknown as number;
      }
    } catch (error) {
      handleError(error instanceof Error ? error.message : 'Failed to start listening');
    }
  }, [handleInterimResult, handleFinalResult, handleError, handleSilenceDetected, autoStop, silenceThreshold]);

  const stopListening = useCallback(async () => {
    try {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      await audioManager.current?.stopRecording();
      await speechService.current?.stopContinuousRecognition();

      setState(prev => ({
        ...prev,
        isListening: false,
        interimTranscript: '',
      }));
    } catch (error) {
      handleError(error instanceof Error ? error.message : 'Failed to stop listening');
    }
  }, [handleError]);

  const resetTranscript = useCallback(() => {
    setState(prev => ({
      ...prev,
      interimTranscript: '',
      finalTranscript: '',
    }));
  }, []);

  // Update audio state when recording status changes
  useEffect(() => {
    const interval = setInterval(() => {
      if (audioManager.current) {
        const audioState = audioManager.current.getAudioState();
        setState(prev => ({
          ...prev,
          audioState,
        }));
      }
    }, 100);

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