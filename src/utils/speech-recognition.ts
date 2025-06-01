import { NativeModules, Platform } from 'react-native';

interface SpeechRecognitionModule {
  isAvailable: () => Promise<boolean>;
  requestPermissions: () => Promise<boolean>;
  recognizeAudio: (audioUri: string, language: string) => Promise<string>;
  stopRecognition: () => Promise<boolean>;
}

const { SpeechRecognition } = NativeModules as { SpeechRecognition: SpeechRecognitionModule };

export class SpeechRecognitionService {
  private static instance: SpeechRecognitionService;

  public static getInstance(): SpeechRecognitionService {
    if (!SpeechRecognitionService.instance) {
      SpeechRecognitionService.instance = new SpeechRecognitionService();
    }
    return SpeechRecognitionService.instance;
  }

  private constructor() {}

  public async isAvailable(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      console.warn('Speech recognition is only available on iOS');
      return false;
    }

    if (!SpeechRecognition) {
      console.warn('SpeechRecognition native module not found');
      return false;
    }

    try {
      return await SpeechRecognition.isAvailable();
    } catch (error) {
      console.error('Error checking speech recognition availability:', error);
      return false;
    }
  }

  public async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      return false;
    }

    if (!SpeechRecognition) {
      return false;
    }

    try {
      return await SpeechRecognition.requestPermissions();
    } catch (error) {
      console.error('Error requesting speech recognition permissions:', error);
      return false;
    }
  }

  public async recognizeAudio(audioUri: string, language: string = 'en-US'): Promise<string> {
    if (Platform.OS !== 'ios') {
      throw new Error('Speech recognition is only available on iOS');
    }

    if (!SpeechRecognition) {
      throw new Error('SpeechRecognition native module not found');
    }

    try {
      const result = await SpeechRecognition.recognizeAudio(audioUri, language);
      return result || '';
    } catch (error) {
      console.error('Error recognizing audio:', error);
      throw error;
    }
  }

  public async stopRecognition(): Promise<boolean> {
    if (Platform.OS !== 'ios' || !SpeechRecognition) {
      return true;
    }

    try {
      return await SpeechRecognition.stopRecognition();
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
      return false;
    }
  }

  // Test function to verify the native module is working
  public async testSpeechRecognition(): Promise<void> {
    console.log('🧪 Testing Speech Recognition Service...');
    
    try {
      const available = await this.isAvailable();
      console.log('✅ Speech Recognition Available:', available);
      
      if (available) {
        const hasPermission = await this.requestPermissions();
        console.log('✅ Speech Recognition Permission:', hasPermission);
        
        if (hasPermission) {
          console.log('✅ Speech Recognition Service is ready to use');
        } else {
          console.log('❌ Speech Recognition Permission denied');
        }
      } else {
        console.log('❌ Speech Recognition not available on this device');
      }
    } catch (error) {
      console.error('❌ Speech Recognition Test failed:', error);
    }
  }
}

// Convenience functions
export const speechRecognition = SpeechRecognitionService.getInstance();

export const testSpeechRecognition = () => speechRecognition.testSpeechRecognition();

export const recognizeAudioFile = (audioUri: string, language?: string) => 
  speechRecognition.recognizeAudio(audioUri, language);

export const isSpeechRecognitionAvailable = () => speechRecognition.isAvailable();

export const requestSpeechPermissions = () => speechRecognition.requestPermissions();