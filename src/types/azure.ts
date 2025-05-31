import { PreferredLanguage } from './cultural';

export interface AzureVoiceConfig {
  name: string;
  locale: string;
  gender: 'Male' | 'Female';
  culturalGroup: PreferredLanguage;
  style?: 'chat' | 'cheerful' | 'empathetic';
}

export interface AzureSpeechConfig {
  key: string;
  region: string;
  language: string;
  voiceName: string;
  pitch: number;
  rate: number;
}

export interface SpeechRecognitionResult {
  text: string;
  confidence: number;
  language: string;
  isFinal: boolean;
  duration: number;
}

export interface SpeechSynthesisResult {
  audioData: ArrayBuffer;
  duration: number;
  properties: {
    bookmarkList: string[];
    wordBoundaryList: Array<{
      boundaryType: number;
      duration: number;
      text: string;
      textOffset: number;
    }>;
  };
}

export const AZURE_VOICE_PROFILES: Record<PreferredLanguage, AzureVoiceConfig[]> = {
  en: [
    {
      name: 'en-NZ-MitchellNeural',
      locale: 'en-NZ',
      gender: 'Male',
      culturalGroup: 'en',
      style: 'chat'
    },
    {
      name: 'en-NZ-MollyNeural',
      locale: 'en-NZ',
      gender: 'Female',
      culturalGroup: 'en',
      style: 'empathetic'
    }
  ],
  mi: [
    {
      name: 'mi-NZ-AnaNeural',
      locale: 'mi-NZ',
      gender: 'Female',
      culturalGroup: 'mi'
    }
  ],
  zh: [
    {
      name: 'zh-CN-XiaoxiaoNeural',
      locale: 'zh-CN',
      gender: 'Female',
      culturalGroup: 'zh',
      style: 'chat'
    },
    {
      name: 'zh-CN-YunxiNeural',
      locale: 'zh-CN',
      gender: 'Male',
      culturalGroup: 'zh',
      style: 'empathetic'
    }
  ]
}; 