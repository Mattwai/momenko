import { Alert, Platform } from 'react-native';
import { PreferredLanguage } from '../../types';

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
  private recognitionTimeout: NodeJS.Timeout | null = null;
  private lastPartialResults: string[] = [];
  private simulationTimeout: NodeJS.Timeout | null = null;

  constructor(speechConfig: SpeechConfig) {
    this.currentLanguage = speechConfig.language;
    this.showExpoGoLimitation();
  }

  private showExpoGoLimitation() {
    console.warn('🚨 Speech Recognition Limitation in Expo Go');
    console.warn('📱 This app is running in Expo Go which doesn\'t support native speech recognition.');
    console.warn('🔧 For full voice features, create a development build or use a physical device build.');
    console.warn('💡 Currently using simulation mode for testing UI interactions.');
  }

  private getLanguageCode(language: PreferredLanguage): string {
    switch (language) {
      case 'mi':
        return 'mi-NZ'; // Te Reo Māori (New Zealand)
      case 'zh':
        return 'zh-CN'; // Mandarin Chinese (Simplified)
      case 'en':
      default:
        return 'en-NZ'; // English (New Zealand)
    }
  }

  private simulateSpeechRecognition() {
    if (!this.callbacks) return;

    // Simulate speech recognition process
    console.log('🎭 Simulating speech recognition...');
    
    // Simulate interim results
    setTimeout(() => {
      if (this.callbacks && this.isListening) {
        this.callbacks.onInterimResult('Hello...');
      }
    }, 1000);

    setTimeout(() => {
      if (this.callbacks && this.isListening) {
        this.callbacks.onInterimResult('Hello, I am...');
      }
    }, 2000);

    // Simulate final result
    this.simulationTimeout = setTimeout(() => {
      if (this.callbacks && this.isListening) {
        const sampleTexts = {
          'en': 'Hello, I am testing the voice recognition system.',
          'mi': 'Kia ora, he whakamātau ahau i te pūnaha rongo reo.',
          'zh': '你好，我正在测试语音识别系统。'
        };
        
        const finalText = sampleTexts[this.currentLanguage] || sampleTexts['en'];
        this.callbacks.onFinalResult(finalText);
        this.isListening = false;
      }
    }, 3500);
  }

  private clearRecognitionTimeout() {
    if (this.recognitionTimeout) {
      clearTimeout(this.recognitionTimeout);
      this.recognitionTimeout = null;
    }
  }

  private clearSimulationTimeout() {
    if (this.simulationTimeout) {
      clearTimeout(this.simulationTimeout);
      this.simulationTimeout = null;
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

      this.lastPartialResults = [];
      
      // Show Expo Go limitation alert in development
      if (__DEV__) {
        Alert.alert(
          'Speech Recognition Simulation',
          'This app is running in Expo Go. Real speech recognition requires a development build.\n\nShowing simulation for testing UI...',
          [
            { text: 'Continue with Simulation', onPress: () => this.startSimulation() },
            { text: 'Cancel', onPress: () => onError('User cancelled simulation') }
          ]
        );
      } else {
        this.startSimulation();
      }

    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      this.callbacks = null;
      throw new Error(`Failed to start recognition: ${error}`);
    }
  }

  private startSimulation() {
    const languageCode = this.getLanguageCode(this.currentLanguage);
    console.log(`🎭 Starting simulated speech recognition with language: ${languageCode}`);
    
    this.isListening = true;
    
    // Start simulation
    this.simulateSpeechRecognition();

    // Set auto-stop timeout
    this.recognitionTimeout = setTimeout(() => {
      this.stopContinuousRecognition();
    }, 10000); // 10 seconds max simulation
  }

  async stopContinuousRecognition(): Promise<void> {
    try {
      this.clearRecognitionTimeout();
      this.clearSimulationTimeout();
      
      if (this.isListening) {
        this.isListening = false;
        console.log('🎭 Stopping simulated speech recognition');
      }
      
      this.callbacks = null;
      this.lastPartialResults = [];
      console.log('Speech recognition stopped successfully');
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
      this.isListening = false;
      this.callbacks = null;
      this.lastPartialResults = [];
    }
  }

  async cleanup(): Promise<void> {
    try {
      await this.stopContinuousRecognition();
      this.clearSimulationTimeout();
      console.log('Speech service cleaned up successfully');
    } catch (error) {
      console.error('Error during speech service cleanup:', error);
    }
  }

  // Helper method to check if speech recognition is supported
  static async isSupported(): Promise<boolean> {
    // In Expo Go, we simulate support for development purposes
    console.log('🎭 Speech recognition support check: Expo Go simulation mode');
    return true; // Always return true for simulation
  }

  // Helper method to get supported languages
  static async getSupportedLanguages(): Promise<string[]> {
    // Return simulated supported languages for Expo Go
    return [
      'en-US', 'en-GB', 'en-AU', 'en-NZ',
      'zh-CN', 'zh-TW', 'zh-HK',
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
    console.log(`🎭 Simulated language change to: ${language}`);
    
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
  } {
    return {
      isListening: this.isListening,
      language: this.currentLanguage,
      hasCallbacks: !!this.callbacks
    };
  }
}