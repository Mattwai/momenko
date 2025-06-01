import { PreferredLanguage } from '../../types';
import { VoiceCommunicationService } from '../voice/VoiceCommunicationService';

interface SpeechConfig {
  language: PreferredLanguage;
}

interface SpeechRecognitionCallbacks {
  onInterimResult: (text: string) => void;
  onFinalResult: (text: string) => void;
  onError: (error: string) => void;
}

export class ReactNativeSpeechService {
  private currentLanguage: PreferredLanguage;
  private isListening = false;
  private callbacks: SpeechRecognitionCallbacks | null = null;
  private voiceService: VoiceCommunicationService;

  constructor(speechConfig: SpeechConfig) {
    this.currentLanguage = speechConfig.language;
    
    // Create VoiceCommunicationService instance
    this.voiceService = new VoiceCommunicationService({
      preferredLanguage: this.currentLanguage,
      onTranscriptUpdate: (text, isFinal) => {
        if (this.callbacks) {
          if (isFinal) {
            this.callbacks.onFinalResult(text);
          } else {
            this.callbacks.onInterimResult(text);
          }
        }
      },
      onError: (error) => {
        if (this.callbacks) {
          this.callbacks.onError(error);
        }
      }
    });
    
    console.log('ReactNativeSpeechService initialized with native VoiceCommunicationService');
  }

  private getLanguageCode(language: PreferredLanguage): string {
    switch (language) {
      case 'mi':
        return 'mi-NZ'; // Te Reo Māori (New Zealand)
      case 'zh':
        return 'cmn-CN'; // Mandarin Chinese (Simplified)
      case 'en':
      default:
        return 'en-US'; // English (US)
    }
  }

  async startContinuousRecognition(
    onInterimResult: (text: string) => void,
    onFinalResult: (text: string) => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      // Stop any existing recognition first
      if (this.isListening) {
        await this.stopContinuousRecognition();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      this.callbacks = {
        onInterimResult,
        onFinalResult,
        onError
      };
      
      // Start listening with VoiceCommunicationService
      await this.voiceService.startListening();
      this.isListening = true;
      
      console.log(`Speech recognition started with language: ${this.getLanguageCode(this.currentLanguage)}`);
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      this.callbacks = null;
      throw new Error(`Failed to start recognition: ${error}`);
    }
  }

  async stopContinuousRecognition(): Promise<void> {
    try {
      if (this.isListening) {
        await this.voiceService.stopListening();
        this.isListening = false;
      }
      
      this.callbacks = null;
      console.log('Speech recognition stopped successfully');
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
      this.isListening = false;
      this.callbacks = null;
    }
  }

  async cleanup(): Promise<void> {
    try {
      await this.stopContinuousRecognition();
      await this.voiceService.cleanup();
      console.log('Speech service cleaned up successfully');
    } catch (error) {
      console.error('Error during speech service cleanup:', error);
    }
  }

  // Helper method to check if speech recognition is supported
  static async isSupported(): Promise<boolean> {
    // We're now using a development build with native functionality
    console.log('Checking native speech recognition support');
    return true; // We're in a development build with native functionality
  }

  // Helper method to get supported languages
  static async getSupportedLanguages(): Promise<string[]> {
    // Return supported languages
    return [
      'en-US', 'en-GB', 'en-AU', 
      'cmn-CN', 'cmn-TW', 
      'mi-NZ'
    ];
  }

  // Method to change language during runtime
  async changeLanguage(language: PreferredLanguage): Promise<void> {
    const wasListening = this.isListening;
    
    if (wasListening) {
      await this.stopContinuousRecognition();
    }
    
    this.currentLanguage = language;
    await this.voiceService.changeLanguage(language);
    console.log(`Language changed to: ${language}`);
    
    // If it was listening before, restart with new language
    if (wasListening && this.callbacks) {
      const callbacks = this.callbacks;
      await this.startContinuousRecognition(
        callbacks.onInterimResult,
        callbacks.onFinalResult,
        callbacks.onError
      );
    }
  }

  // Get current recognition state
  getRecognitionState(): {
    isListening: boolean;
    language: PreferredLanguage;
    hasCallbacks: boolean;
    serviceState?: any;
  } {
    return {
      isListening: this.isListening,
      language: this.currentLanguage,
      hasCallbacks: !!this.callbacks,
      serviceState: this.voiceService.getState() as {
        isListening: boolean;
        isSpeaking: boolean;
        interimTranscript: string;
        finalTranscript: string;
        isInitialized: boolean;
        language: PreferredLanguage;
        voiceId: string;
        modelId: string;
        stability: number;
        similarityBoost: number;
      },
      isNative: true
    };
  }
}