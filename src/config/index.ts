import { SUPABASE_URL, SUPABASE_ANON_KEY, DEEPSEEK_API_KEY, DEEPSEEK_API_URL, ELEVEN_LABS_API_KEY, APP_ENV, DEBUG_MODE } from '@env';

export interface AppConfig {
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
    silenceThreshold: -65, // dB (more sensitive)
    silenceDuration: 6000, // 6 seconds (longer before stopping)
    sampleRate: 44100,
    bitRate: 128000,
    maxRecordingDuration: 300000, // 5 minutes
  },
  voice: {
    autoStopOnSilence: true,
    defaultSilenceTimeout: 6, // seconds (longer timeout)
    maxTranscriptLength: 5000,
    recognitionTimeoutMs: 300000, // 5 minutes
  }
};

// Validate critical configurations on startup
export const validateConfiguration = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!config.supabase.isConfigured) {
    errors.push('Supabase credentials not configured');
  }
  
  if (!config.deepseek.isConfigured) {
    errors.push('DeepSeek API not configured');
  }
  
  if (!config.elevenLabs.isConfigured) {
    errors.push('ElevenLabs API not configured');
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
      deepseek: {
        configured: config.deepseek.isConfigured,
        url: config.deepseek.apiUrl,
        keyLength: config.deepseek.apiKey ? config.deepseek.apiKey.length : 0
      },
      elevenLabs: {
        configured: config.elevenLabs.isConfigured,
        keyLength: config.elevenLabs.apiKey ? config.elevenLabs.apiKey.length : 0
      },
      supabase: {
        configured: config.supabase.isConfigured,
        url: config.supabase.url,
        keyLength: config.supabase.anonKey.length
      },
      voice: {
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