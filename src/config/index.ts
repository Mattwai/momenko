import { AZURE_SPEECH_KEY, AZURE_SPEECH_REGION, SUPABASE_URL, SUPABASE_ANON_KEY, DEEPSEEK_API_KEY, DEEPSEEK_API_URL, ELEVEN_LABS_API_KEY, APP_ENV, DEBUG_MODE } from '@env';

export interface AppConfig {
  azure: {
    speechKey: string;
    speechRegion: string;
    isConfigured: boolean;
  };
  supabase: {
    url: string;
    anonKey: string;
    isConfigured: boolean;
  };
  deepseek: {
    apiKey: string;
    apiUrl: string;
    isConfigured: boolean;
  };
  elevenLabs: {
    apiKey: string;
    isConfigured: boolean;
  };
  app: {
    env: string;
    debugMode: boolean;
    isDevelopment: boolean;
    isProduction: boolean;
  };
  audio: {
    silenceThreshold: number; // dB
    silenceDuration: number; // milliseconds
    sampleRate: number;
    bitRate: number;
    maxRecordingDuration: number; // milliseconds
  };
  voice: {
    autoStopOnSilence: boolean;
    defaultSilenceTimeout: number; // seconds
    maxTranscriptLength: number;
    recognitionTimeoutMs: number;
    useNativeSpeech: boolean;
    fallbackToAzure: boolean;
  };
}

const validateEnvVar = (value: string | undefined, name: string): string => {
  if (!value || value.trim() === '') {
    console.warn(`Missing environment variable: ${name}`);
    return '';
  }
  return value.trim();
};

const config: AppConfig = {
  azure: {
    speechKey: validateEnvVar(AZURE_SPEECH_KEY, 'AZURE_SPEECH_KEY'),
    speechRegion: validateEnvVar(AZURE_SPEECH_REGION, 'AZURE_SPEECH_REGION'),
    get isConfigured() {
      return !!(this.speechKey && this.speechRegion);
    }
  },
  supabase: {
    url: validateEnvVar(SUPABASE_URL, 'SUPABASE_URL'),
    anonKey: validateEnvVar(SUPABASE_ANON_KEY, 'SUPABASE_ANON_KEY'),
    get isConfigured() {
      return !!(this.url && this.anonKey);
    }
  },
  deepseek: {
    apiKey: validateEnvVar(DEEPSEEK_API_KEY, 'DEEPSEEK_API_KEY'),
    apiUrl: validateEnvVar(DEEPSEEK_API_URL, 'DEEPSEEK_API_URL'),
    get isConfigured() {
      return !!(this.apiKey && this.apiUrl);
    }
  },
  elevenLabs: {
    apiKey: validateEnvVar(ELEVEN_LABS_API_KEY, 'ELEVEN_LABS_API_KEY'),
    get isConfigured() {
      return !!this.apiKey;
    }
  },
  app: {
    env: APP_ENV || 'development',
    debugMode: DEBUG_MODE === 'true',
    get isDevelopment() {
      return this.env === 'development';
    },
    get isProduction() {
      return this.env === 'production';
    }
  },
  audio: {
    silenceThreshold: -50, // dB
    silenceDuration: 3000, // 3 seconds
    sampleRate: 44100,
    bitRate: 128000,
    maxRecordingDuration: 300000, // 5 minutes
  },
  voice: {
    autoStopOnSilence: true,
    defaultSilenceTimeout: 3, // seconds
    maxTranscriptLength: 5000,
    recognitionTimeoutMs: 300000, // 5 minutes
    useNativeSpeech: true, // Use React Native speech recognition by default
    fallbackToAzure: false, // Don't fallback to Azure unless explicitly enabled
  }
};

// Validate critical configurations on startup
export const validateConfiguration = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Azure is now optional since we use React Native speech recognition
  // Only warn if Azure is configured but incomplete
  if (config.azure.speechKey && !config.azure.speechRegion) {
    errors.push('Azure Speech Service region missing (key provided but no region)');
  }
  if (!config.azure.speechKey && config.azure.speechRegion) {
    errors.push('Azure Speech Service key missing (region provided but no key)');
  }

  if (!config.supabase.isConfigured) {
    errors.push('Supabase credentials not configured');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Log configuration status (with sensitive data masked)
export const logConfigurationStatus = (): void => {
  if (config.app.debugMode) {
    console.log('Configuration Status:', {
      azure: {
        configured: config.azure.isConfigured,
        region: config.azure.speechRegion,
        keyLength: config.azure.speechKey.length,
        optional: true
      },
      supabase: {
        configured: config.supabase.isConfigured,
        url: config.supabase.url,
        keyLength: config.supabase.anonKey.length
      },
      voice: {
        useNativeSpeech: config.voice.useNativeSpeech,
        fallbackToAzure: config.voice.fallbackToAzure,
        autoStopOnSilence: config.voice.autoStopOnSilence
      },
      app: {
        env: config.app.env,
        debug: config.app.debugMode
      }
    });
  }
};

export default config;