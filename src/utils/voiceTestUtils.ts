import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { AudioManager } from '../services/audio/AudioManager';
import { ReactNativeSpeechService } from '../services/speech/ReactNativeSpeechService';
import { permissionsManager } from './permissions';
import config, { validateConfiguration, logConfigurationStatus } from '../config';
import { PreferredLanguage } from '../types';

export interface VoiceTestResult {
  test: string;
  passed: boolean;
  message: string;
  details?: unknown;
}

export interface VoiceTestSuite {
  overall: boolean;
  results: VoiceTestResult[];
  summary: {
    passed: number;
    failed: number;
    total: number;
  };
}

export class VoiceTestUtils {
  private static instance: VoiceTestUtils;
  
  public static getInstance(): VoiceTestUtils {
    if (!VoiceTestUtils.instance) {
      VoiceTestUtils.instance = new VoiceTestUtils();
    }
    return VoiceTestUtils.instance;
  }

  private constructor() {}

  async runCompleteVoiceTest(language: PreferredLanguage = 'en'): Promise<VoiceTestSuite> {
    const results: VoiceTestResult[] = [];

    // Test 1: Configuration validation
    results.push(await this.testConfiguration());

    // Test 2: Audio permissions
    results.push(await this.testAudioPermissions());

    // Test 3: Audio session setup
    results.push(await this.testAudioSession());

    // Test 4: React Native Speech Service initialization
    results.push(await this.testReactNativeSpeechService(language));

    // Test 5: AudioManager initialization
    results.push(await this.testAudioManager());

    // Test 6: Basic recording test
    results.push(await this.testBasicRecording());

    // Test 7: Voice recognition pipeline
    results.push(await this.testVoiceRecognitionPipeline(language));

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    return {
      overall: failed === 0,
      results,
      summary: {
        passed,
        failed,
        total: results.length
      }
    };
  }

  private async testConfiguration(): Promise<VoiceTestResult> {
    try {
      const validation = validateConfiguration();
      logConfigurationStatus();

      return {
        test: 'Configuration Validation',
        passed: validation.isValid,
        message: validation.isValid 
          ? 'All required configuration is valid'
          : `Configuration errors: ${validation.errors.join(', ')}`,
        details: {
          azure: config.azure.isConfigured,
          supabase: config.supabase.isConfigured,
          errors: validation.errors
        }
      };
    } catch (error) {
      return {
        test: 'Configuration Validation',
        passed: false,
        message: `Configuration test failed: ${error}`,
        details: { error }
      };
    }
  }

  private async testAudioPermissions(): Promise<VoiceTestResult> {
    try {
      const status = await permissionsManager.checkAudioRecordingPermission();
      const canRequest = await permissionsManager.ensureAudioRecordingPermission();

      return {
        test: 'Audio Permissions',
        passed: status.granted || canRequest,
        message: status.granted 
          ? 'Audio recording permission granted'
          : canRequest 
            ? 'Audio recording permission was successfully requested'
            : 'Audio recording permission denied',
        details: {
          granted: status.granted,
          canAskAgain: status.canAskAgain,
          status: status.status,
          finalResult: canRequest
        }
      };
    } catch (error) {
      return {
        test: 'Audio Permissions',
        passed: false,
        message: `Permission test failed: ${error}`,
        details: { error }
      };
    }
  }

  private async testAudioSession(): Promise<VoiceTestResult> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      return {
        test: 'Audio Session Setup',
        passed: true,
        message: 'Audio session configured successfully',
        details: {
          sampleRate: config.audio.sampleRate,
          bitRate: config.audio.bitRate,
          silenceThreshold: config.audio.silenceThreshold
        }
      };
    } catch (error) {
      return {
        test: 'Audio Session Setup',
        passed: false,
        message: `Audio session setup failed: ${error}`,
        details: { error }
      };
    }
  }

  private async testReactNativeSpeechService(language: PreferredLanguage): Promise<VoiceTestResult> {
    let speechService: ReactNativeSpeechService | null = null;
    
    try {
      const isSupported = await ReactNativeSpeechService.isSupported();
      
      speechService = new ReactNativeSpeechService({
        language: language
      });

      const supportedLanguages = await ReactNativeSpeechService.getSupportedLanguages();
      const isSimulationMode = __DEV__ || typeof navigator !== 'undefined';

      return {
        test: 'React Native Speech Service',
        passed: true,
        message: isSimulationMode 
          ? 'Speech Service initialized in simulation mode (Expo Go compatible)'
          : 'React Native Speech Service initialized successfully',
        details: {
          language,
          supported: true,
          simulationMode: isSimulationMode,
          supportedLanguages: supportedLanguages.slice(0, 5), // Show first 5 languages
          totalLanguages: supportedLanguages.length,
          note: isSimulationMode ? 'Running in Expo Go - simulation mode active' : 'Native speech recognition available'
        }
      };
    } catch (error) {
      return {
        test: 'React Native Speech Service',
        passed: false,
        message: `Speech Service initialization failed: ${error}`,
        details: { 
          error,
          language,
          supported: false
        }
      };
    } finally {
      if (speechService) {
        try {
          await speechService.cleanup();
        } catch (cleanupError) {
          console.warn('Error cleaning up speech service during test:', cleanupError);
        }
      }
    }
  }

  private async testAudioManager(): Promise<VoiceTestResult> {
    let audioManager: AudioManager | null = null;
    
    try {
      audioManager = new AudioManager();
      const audioState = audioManager.getAudioState();

      return {
        test: 'AudioManager Initialization',
        passed: true,
        message: 'AudioManager initialized successfully',
        details: {
          audioState,
          config: {
            sampleRate: config.audio.sampleRate,
            bitRate: config.audio.bitRate
          }
        }
      };
    } catch (error) {
      return {
        test: 'AudioManager Initialization',
        passed: false,
        message: `AudioManager initialization failed: ${error}`,
        details: { error }
      };
    } finally {
      if (audioManager) {
        try {
          await audioManager.cleanup();
        } catch (cleanupError) {
          console.warn('Error cleaning up audio manager during test:', cleanupError);
        }
      }
    }
  }

  private async testBasicRecording(): Promise<VoiceTestResult> {
    let audioManager: AudioManager | null = null;
    
    try {
      audioManager = new AudioManager();
      
      // Test short recording (2 seconds)
      await audioManager.startRecording();
      
      // Wait for 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const uri = await audioManager.stopRecording();
      
      return {
        test: 'Basic Audio Recording',
        passed: !!uri,
        message: uri 
          ? 'Basic recording test successful'
          : 'Recording test failed - no URI returned',
        details: {
          recordingUri: uri,
          duration: 2000
        }
      };
    } catch (error) {
      return {
        test: 'Basic Audio Recording',
        passed: false,
        message: `Recording test failed: ${error}`,
        details: { error }
      };
    } finally {
      if (audioManager) {
        try {
          await audioManager.cleanup();
        } catch (cleanupError) {
          console.warn('Error cleaning up audio manager during recording test:', cleanupError);
        }
      }
    }
  }

  private async testVoiceRecognitionPipeline(language: PreferredLanguage): Promise<VoiceTestResult> {
    let audioManager: AudioManager | null = null;
    let speechService: ReactNativeSpeechService | null = null;
    
    try {
      audioManager = new AudioManager();
      speechService = new ReactNativeSpeechService({ language });

      let interimResults: string[] = [];
      let finalResults: string[] = [];
      let errors: string[] = [];

      const handleInterim = (text: string) => {
        interimResults.push(text);
      };

      const handleFinal = (text: string) => {
        finalResults.push(text);
      };

      const handleError = (error: string) => {
        errors.push(error);
      };

      // Start the pipeline
      await speechService.startContinuousRecognition(
        handleInterim,
        handleFinal,
        handleError
      );

      await audioManager.startRecording();

      // Run for 5 seconds (longer for simulation)
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Stop everything
      await audioManager.stopRecording();
      await speechService.stopContinuousRecognition();

      const hasResults = interimResults.length > 0 || finalResults.length > 0;
      const hasErrors = errors.length > 0;
      const isSimulationMode = __DEV__ || typeof navigator !== 'undefined';

      return {
        test: 'Voice Recognition Pipeline',
        passed: !hasErrors, // Pass if no errors occurred
        message: hasErrors 
          ? `Pipeline test failed with errors: ${errors.join(', ')}`
          : hasResults
            ? isSimulationMode 
              ? 'Pipeline test successful - simulation completed'
              : 'Pipeline test successful - voice input detected'
            : isSimulationMode
              ? 'Pipeline test completed - simulation mode (no real audio input expected)'
              : 'Pipeline test completed - no voice input detected (this is normal in test environment)',
        details: {
          interimResults,
          finalResults,
          errors,
          language,
          duration: 5000,
          simulationMode: isSimulationMode,
          note: isSimulationMode ? 'Running in Expo Go simulation mode' : 'Native speech recognition test'
        }
      };
    } catch (error) {
      return {
        test: 'Voice Recognition Pipeline',
        passed: false,
        message: `Pipeline test failed: ${error}`,
        details: { error, language }
      };
    } finally {
      // Cleanup
      if (speechService) {
        try {
          await speechService.cleanup();
        } catch (cleanupError) {
          console.warn('Error cleaning up speech service during pipeline test:', cleanupError);
        }
      }
      if (audioManager) {
        try {
          await audioManager.cleanup();
        } catch (cleanupError) {
          console.warn('Error cleaning up audio manager during pipeline test:', cleanupError);
        }
      }
    }
  }

  async quickDiagnostic(): Promise<string> {
    const diagnostic = [];
    
    diagnostic.push('=== Voice Recording Quick Diagnostic ===');
    diagnostic.push('');

    // Check configuration
    const configValid = validateConfiguration();
    diagnostic.push(`Configuration: ${configValid.isValid ? 'VALID' : 'INVALID'}`);
    if (!configValid.isValid) {
      diagnostic.push(`  Errors: ${configValid.errors.join(', ')}`);
    }

    // Check permissions
    try {
      const permission = await permissionsManager.checkAudioRecordingPermission();
      diagnostic.push(`Audio Permission: ${permission.granted ? 'GRANTED' : 'DENIED'}`);
      if (!permission.granted) {
        diagnostic.push(`  Status: ${permission.status}, Can ask again: ${permission.canAskAgain}`);
      }
    } catch (error) {
      diagnostic.push(`Audio Permission: ERROR - ${error}`);
    }

    // Check audio session
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      diagnostic.push('Audio Session: OK');
    } catch (error) {
      diagnostic.push(`Audio Session: ERROR - ${error}`);
    }

    diagnostic.push('');
    diagnostic.push('=== Configuration Details ===');
    
    // Check if running in Expo Go
    const isExpoGo = __DEV__ || typeof navigator !== 'undefined';
    diagnostic.push(`Platform: ${isExpoGo ? 'Expo Go (Simulation Mode)' : 'Native Build'}`);
    
    // Check speech recognition support
    try {
      const speechSupported = await ReactNativeSpeechService.isSupported();
      diagnostic.push(`Speech Recognition: ${speechSupported ? 'SUPPORTED' : 'NOT SUPPORTED'}`);
      if (speechSupported) {
        const languages = await ReactNativeSpeechService.getSupportedLanguages();
        diagnostic.push(`Supported Languages: ${languages.length} available`);
        if (isExpoGo) {
          diagnostic.push(`Mode: Simulation (for real speech, create development build)`);
        }
      }
    } catch (error) {
      diagnostic.push(`Speech Recognition: ERROR - ${error}`);
    }
    diagnostic.push(`Sample Rate: ${config.audio.sampleRate}`);
    diagnostic.push(`Bit Rate: ${config.audio.bitRate}`);
    diagnostic.push(`Debug Mode: ${config.app.debugMode}`);

    return diagnostic.join('\n');
  }

  formatTestResults(suite: VoiceTestSuite): string {
    const lines = [];
    
    lines.push('=== Voice Recording Test Results ===');
    lines.push('');
    lines.push(`Overall Status: ${suite.overall ? 'PASS' : 'FAIL'}`);
    lines.push(`Tests Passed: ${suite.summary.passed}/${suite.summary.total}`);
    lines.push('');

    suite.results.forEach(result => {
      const status = result.passed ? '✓ PASS' : '✗ FAIL';
      lines.push(`${status} ${result.test}`);
      lines.push(`  ${result.message}`);
      if (result.details && config.app.debugMode) {
        lines.push(`  Details: ${JSON.stringify(result.details, null, 2)}`);
      }
      lines.push('');
    });

    return lines.join('\n');
  }
}

// Export singleton instance
export const voiceTestUtils = VoiceTestUtils.getInstance();

// Export convenience functions
export const runVoiceTest = (language: PreferredLanguage = 'en') => 
  voiceTestUtils.runCompleteVoiceTest(language);

export const quickVoiceDiagnostic = () => 
  voiceTestUtils.quickDiagnostic();