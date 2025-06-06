import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { Alert, Platform } from 'react-native';
import config, { validateConfiguration, logConfigurationStatus } from '../config';
import { permissionsManager } from './permissions';
import { forceNativeVoiceMode } from './force-native-voice';

export interface InitializationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  timestamp: Date;
  config: {
    deepseek: boolean;
    elevenLabs: boolean;
    supabase: boolean;
    permissions: boolean;
    audioSession: boolean;
  };
}

export interface InitializationOptions {
  skipPermissions?: boolean;
  skipAudioSession?: boolean;
  showAlerts?: boolean;
  logDetails?: boolean;
}

class AppInitialization {
  private static instance: AppInitialization;
  private isInitialized = false;
  private lastInitResult: InitializationResult | null = null;

  public static getInstance(): AppInitialization {
    if (!AppInitialization.instance) {
      AppInitialization.instance = new AppInitialization();
    }
    return AppInitialization.instance;
  }

  private constructor() {}

  async initialize(options: InitializationOptions = {}): Promise<InitializationResult> {
    // Force native voice mode immediately at initialization
    forceNativeVoiceMode(true);
    
    const {
      skipPermissions = false,
      skipAudioSession = false,
      showAlerts = true,
      logDetails = config.app.debugMode
    } = options;

    const errors: string[] = [];
    const warnings: string[] = [];
    const configStatus = {
      deepseek: false,
      elevenLabs: false,
      supabase: false,
      permissions: false,
      audioSession: false
    };

    try {
      if (logDetails) {
        console.log('🚀 Starting app initialization...');
        logConfigurationStatus();
      }

      // Step 1: Validate configuration
      const configValidation = validateConfiguration();
      if (!configValidation.isValid) {
        errors.push(...configValidation.errors);
        if (logDetails) {
          console.error('❌ Configuration validation failed:', configValidation.errors);
        }
      } else {
        configStatus.deepseek = config.deepseek.isConfigured;
        configStatus.elevenLabs = config.elevenLabs.isConfigured;
        configStatus.supabase = config.supabase.isConfigured;
        if (logDetails) {
          console.log('✅ Configuration validation passed');
        }
      }

      // Step 2: Check and request permissions
      if (!skipPermissions) {
        try {
          const permissionGranted = await this.checkPermissions();
          configStatus.permissions = permissionGranted;
          
          if (!permissionGranted) {
            warnings.push('Audio recording permission not granted - voice features will be limited');
            if (logDetails) {
              console.warn('⚠️ Audio permissions not granted');
            }
          } else if (logDetails) {
            console.log('✅ Audio permissions granted');
          }
        } catch (error) {
          const errorMsg = `Permission check failed: ${error}`;
          errors.push(errorMsg);
          if (logDetails) {
            console.error('❌ Permission check error:', error);
          }
        }
      }

      // Step 3: Setup audio session
      if (!skipAudioSession) {
        try {
          await this.setupAudioSession();
          configStatus.audioSession = true;
          if (logDetails) {
            console.log('✅ Audio session configured');
          }
        } catch (error) {
          const errorMsg = `Audio session setup failed: ${error}`;
          errors.push(errorMsg);
          if (logDetails) {
            console.error('❌ Audio session setup failed:', error);
          }
        }
      }

      // Step 4: Validate voice API configurations
      if (!config.deepseek.isConfigured) {
        warnings.push('DeepSeek API not configured - speech recognition may not work properly');
      } else if (logDetails) {
        console.log('✅ DeepSeek API configured');
      }
      
      if (!config.elevenLabs.isConfigured) {
        warnings.push('ElevenLabs API not configured - voice synthesis may not work properly');
      } else if (logDetails) {
        console.log('✅ ElevenLabs API configured');
      }

      // Step 5: Platform-specific checks (using native capabilities)
      await this.performPlatformChecks(errors, warnings, logDetails);
  
      // Reinforce native voice mode after all checks
      forceNativeVoiceMode(true);

      const result: InitializationResult = {
        success: errors.length === 0,
        errors,
        warnings,
        timestamp: new Date(),
        config: configStatus
      };

      this.lastInitResult = result;
      this.isInitialized = result.success;

      if (logDetails) {
        console.log(`🏁 Initialization completed. Success: ${result.success}`);
        if (errors.length > 0) {
          console.log('Errors:', errors);
        }
        if (warnings.length > 0) {
          console.log('Warnings:', warnings);
        }
        console.log('🎤 Native voice recognition enabled (development build)');
      }

      // Show alerts if requested and there are critical errors
      if (showAlerts && errors.length > 0) {
        this.showInitializationAlert(result);
      }

      return result;
    } catch (error) {
      const criticalError = `Critical initialization failure: ${error}`;
      const failureResult: InitializationResult = {
        success: false,
        errors: [criticalError],
        warnings,
        timestamp: new Date(),
        config: configStatus
      };

      if (logDetails) {
        console.error('💥 Critical initialization failure:', error);
      }

      if (showAlerts) {
        this.showInitializationAlert(failureResult);
      }

      return failureResult;
    }
  }

  private async checkPermissions(): Promise<boolean> {
    try {
      const status = await permissionsManager.checkAudioRecordingPermission();
      
      if (status.granted) {
        return true;
      }

      if (status.canAskAgain) {
        const granted = await permissionsManager.ensureAudioRecordingPermission();
        return granted;
      }

      return false;
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  private async setupAudioSession(): Promise<void> {
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
    } catch (error) {
      throw new Error(`Failed to configure audio session: ${error}`);
    }
  }

  private async performPlatformChecks(errors: string[], warnings: string[], logDetails: boolean): Promise<void> {
    // iOS specific checks
    if (Platform.OS === 'ios') {
      try {
        // Check iOS version compatibility
        const version = Platform.Version;
        if (typeof version === 'string' && parseFloat(version) < 13.0) {
          warnings.push('iOS version below 13.0 may have limited voice recognition capabilities');
        }
        if (logDetails) {
          console.log(`📱 iOS version: ${version}`);
        }
        
        // Explicitly check for iOS simulator
        if (__DEV__ && version.toString().includes('simulator')) {
          console.log('📱 Running on iOS simulator with native voice enabled');
        }
      } catch {
        warnings.push('Could not determine iOS version');
      }
    }

    // Android specific checks
    if (Platform.OS === 'android') {
      try {
        const version = Platform.Version;
        if (version < 23) {
          warnings.push('Android version below 6.0 may have limited audio capabilities');
        }
        if (logDetails) {
          console.log(`🤖 Android API level: ${version}`);
        }
      } catch {
        warnings.push('Could not determine Android version');
      }
    }

    // Force native voice capabilities
    console.log('🎤 Using native voice capabilities (development build)');
    
    // Memory and performance checks
    try {
      // Basic memory availability check
      if (global.gc && config.app.debugMode) {
        global.gc();
      }
    } catch {
      // Ignore memory check errors
    }
  }

  private showInitializationAlert(result: InitializationResult): void {
    if (result.errors.length > 0) {
      const title = 'App Initialization Issues';
      const message = `The app encountered ${result.errors.length} error(s) during startup:\n\n${result.errors.slice(0, 3).join('\n')}\n\n${result.errors.length > 3 ? '...and more' : ''}`;
      
      Alert.alert(
        title,
        message,
        [
          {
            text: 'Continue Anyway',
            style: 'default'
          },
          {
            text: 'Show Details',
            onPress: () => this.showDetailedErrorAlert(result)
          }
        ],
        { cancelable: true }
      );
    }
  }

  private showDetailedErrorAlert(result: InitializationResult): void {
    const details = [
      'Initialization Report:',
      '',
      `Success: ${result.success ? 'Yes' : 'No'}`,
      `Time: ${result.timestamp.toLocaleString()}`,
      '',
      'Configuration Status:',
      `- DeepSeek API: ${result.config.deepseek ? 'OK' : 'Failed'}`,
      `- ElevenLabs API: ${result.config.elevenLabs ? 'OK' : 'Failed'}`,
      `- Supabase: ${result.config.supabase ? 'OK' : 'Failed'}`,
      `- Permissions: ${result.config.permissions ? 'OK' : 'Failed'}`,
      `- Audio Session: ${result.config.audioSession ? 'OK' : 'Failed'}`,
      '',
      'Errors:',
      ...result.errors.map(e => `- ${e}`),
      '',
      'Warnings:',
      ...result.warnings.map(w => `- ${w}`)
    ].join('\n');

    Alert.alert(
      'Detailed Initialization Report',
      details,
      [{ text: 'OK' }]
    );
  }

  getLastInitializationResult(): InitializationResult | null {
    return this.lastInitResult;
  }

  isAppInitialized(): boolean {
    return this.isInitialized;
  }

  async reinitialize(options?: InitializationOptions): Promise<InitializationResult> {
    this.isInitialized = false;
    this.lastInitResult = null;
    return this.initialize(options);
  }

  async quickHealthCheck(): Promise<{
    healthy: boolean;
    issues: string[];
    lastInit: Date | null;
  }> {
    const issues: string[] = [];

    // Check if app was initialized
    if (!this.isInitialized) {
      issues.push('App not properly initialized');
    }

    // Check configuration
    const configValidation = validateConfiguration();
    if (!configValidation.isValid) {
      issues.push(...configValidation.errors);
    }

    // Check permissions
    try {
      const permission = await permissionsManager.checkAudioRecordingPermission();
      if (!permission.granted) {
        issues.push('Audio recording permission not granted');
      }
    } catch (error) {
      issues.push(`Permission check failed: ${error}`);
    }

    return {
      healthy: issues.length === 0,
      issues,
      lastInit: this.lastInitResult?.timestamp || null
    };
  }
}

export const appInitialization = AppInitialization.getInstance();

// Convenience exports
export const initializeApp = (options?: InitializationOptions) => 
  appInitialization.initialize(options);

export const getInitializationStatus = () => 
  appInitialization.getLastInitializationResult();

export const isAppReady = () => 
  appInitialization.isAppInitialized();

export const performHealthCheck = () => 
  appInitialization.quickHealthCheck();

export const reinitializeApp = (options?: InitializationOptions) => 
  appInitialization.reinitialize(options);