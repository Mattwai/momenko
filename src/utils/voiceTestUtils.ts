import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { Platform } from 'react-native';
import { AudioManager } from '../services/audio/AudioManager';
import { permissionsManager } from './permissions';
import config, { validateConfiguration, logConfigurationStatus } from '../config';
import { PreferredLanguage } from '../types';
import { VoiceCommunicationService } from '../services/voice/VoiceCommunicationService';

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

    // Test 4: DeepSeek and ElevenLabs API validation
    results.push(await this.testAPIConfiguration());

    // Test 5: AudioManager initialization
    results.push(await this.testAudioManager());

    // Test 6: Basic recording test
    results.push(await this.testBasicRecording());

    // Test 7: Voice communication service initialization
    results.push(await this.testVoiceCommunicationService(language));

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
          deepseek: config.deepseek.isConfigured,
          elevenLabs: config.elevenLabs.isConfigured,
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

  private async testAPIConfiguration(): Promise<VoiceTestResult> {
    try {
      // Check if DeepSeek and ElevenLabs APIs are configured
      const deepseekConfigured = config.deepseek.isConfigured;
      const elevenLabsConfigured = config.elevenLabs.isConfigured;
      
      const passed = deepseekConfigured && elevenLabsConfigured;
      let message = '';
      
      if (passed) {
        message = 'DeepSeek and ElevenLabs APIs are properly configured';
      } else {
        if (!deepseekConfigured && !elevenLabsConfigured) {
          message = 'Both DeepSeek and ElevenLabs APIs are not configured';
        } else if (!deepseekConfigured) {
          message = 'DeepSeek API is not configured';
        } else {
          message = 'ElevenLabs API is not configured';
        }
      }

      return {
        test: 'API Configuration',
        passed,
        message,
        details: {
          deepseek: {
            configured: deepseekConfigured,
            apiUrl: config.deepseek.apiUrl,
            keyLength: config.deepseek.apiKey ? config.deepseek.apiKey.length : 0
          },
          elevenLabs: {
            configured: elevenLabsConfigured,
            keyLength: config.elevenLabs.apiKey ? config.elevenLabs.apiKey.length : 0
          }
        }
      };
    } catch (error) {
      return {
        test: 'API Configuration',
        passed: false,
        message: `API configuration test failed: ${error}`,
        details: { error }
      };
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

  private async testVoiceCommunicationService(language: PreferredLanguage): Promise<VoiceTestResult> {
    let voiceService: VoiceCommunicationService | null = null;
    
    try {
      // Create instance of VoiceCommunicationService with test options
      voiceService = new VoiceCommunicationService({
        preferredLanguage: language,
        onTranscriptUpdate: () => {},
        onError: () => {},
        onSpeechStart: () => {},
        onSpeechEnd: () => {}
      });

      // Wait a moment for initialization
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get service state
      const serviceState = voiceService.getState();
      
      return {
        test: 'Voice Communication Service',
        passed: serviceState.isInitialized,
        message: serviceState.isInitialized 
          ? 'Voice Communication Service initialized successfully'
          : 'Voice Communication Service failed to initialize',
        details: {
          language,
          state: serviceState,
          voiceId: serviceState.voiceId,
          modelId: serviceState.modelId
        }
      };
    } catch (error) {
      return {
        test: 'Voice Communication Service',
        passed: false,
        message: `Voice Communication Service test failed: ${error}`,
        details: { error, language }
      };
    } finally {
      // Cleanup
      if (voiceService) {
        try {
          await voiceService.cleanup();
        } catch (cleanupError) {
          console.warn('Error cleaning up voice service during test:', cleanupError);
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
    
    // Check API configuration
    diagnostic.push(`DeepSeek API: ${config.deepseek.isConfigured ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
    if (config.deepseek.isConfigured) {
      diagnostic.push(`  API URL: ${config.deepseek.apiUrl}`);
    }
    
    diagnostic.push(`ElevenLabs API: ${config.elevenLabs.isConfigured ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
    
    diagnostic.push(`Platform: ${Platform.OS}`);
    diagnostic.push(`OS Version: ${Platform.Version}`);
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