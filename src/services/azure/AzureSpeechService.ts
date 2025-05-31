import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { PreferredLanguage, AzureVoiceConfig, AZURE_VOICE_PROFILES } from '../../types';

// These should be added to your .env file
const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY || '';
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION || '';

interface SpeechConfig {
  language: PreferredLanguage;
  voiceConfig?: AzureVoiceConfig;
}

interface SynthesisResult {
  audioData: ArrayBuffer;
  reason: sdk.ResultReason;
  errorDetails?: string;
}

export class AzureSpeechService {
  private speechConfig: sdk.SpeechConfig;
  private currentLanguage: PreferredLanguage;
  private recognizer: sdk.SpeechRecognizer | null = null;
  private synthesizer: sdk.SpeechSynthesizer | null = null;

  constructor(config: SpeechConfig) {
    if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
      throw new Error('Azure Speech credentials not configured');
    }

    this.speechConfig = sdk.SpeechConfig.fromSubscription(AZURE_SPEECH_KEY, AZURE_SPEECH_REGION);
    this.currentLanguage = config.language;
    this.configureForLanguage(config.language, config.voiceConfig);
  }

  private configureForLanguage(language: PreferredLanguage, voiceConfig?: AzureVoiceConfig) {
    // Set recognition language based on cultural preference
    switch (language) {
      case 'mi':
        this.speechConfig.speechRecognitionLanguage = 'mi-NZ';
        break;
      case 'zh':
        this.speechConfig.speechRecognitionLanguage = 'zh-CN';
        break;
      case 'en':
      default:
        this.speechConfig.speechRecognitionLanguage = 'en-NZ';
    }

    // Configure voice based on cultural preference
    if (voiceConfig) {
      this.speechConfig.speechSynthesisVoiceName = voiceConfig.name;
    } else {
      // Use default voice for the language
      const defaultVoice = AZURE_VOICE_PROFILES[language][0];
      this.speechConfig.speechSynthesisVoiceName = defaultVoice.name;
    }

    // Configure prosody based on cultural preferences - these will be applied via SSML
    // since the SDK doesn't expose direct rate/volume controls
  }

  async startContinuousRecognition(
    onInterimResult: (text: string) => void,
    onFinalResult: (text: string) => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      if (this.recognizer) {
        await this.stopContinuousRecognition();
      }

      this.recognizer = new sdk.SpeechRecognizer(this.speechConfig);

      // Handle interim results
      this.recognizer.recognizing = (_, event) => {
        onInterimResult(event.result.text);
      };

      // Handle final results
      this.recognizer.recognized = (_, event) => {
        if (event.result.reason === sdk.ResultReason.RecognizedSpeech) {
          onFinalResult(event.result.text);
        }
      };

      // Handle errors
      this.recognizer.canceled = (_, event) => {
        if (event.reason === sdk.CancellationReason.Error) {
          onError(`Error: ${event.errorDetails}`);
        }
      };

      await this.recognizer.startContinuousRecognitionAsync();
    } catch (error) {
      onError(`Failed to start recognition: ${error}`);
    }
  }

  async stopContinuousRecognition(): Promise<void> {
    if (!this.recognizer) return;

    try {
      await this.recognizer.stopContinuousRecognitionAsync();
      this.recognizer.close();
      this.recognizer = null;
    } catch (error) {
      console.error('Error stopping recognition:', error);
    }
  }

  async synthesizeSpeech(
    text: string,
    onAudioData: (audioData: ArrayBuffer) => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      if (this.synthesizer) {
        this.synthesizer.close();
      }

      this.synthesizer = new sdk.SpeechSynthesizer(this.speechConfig);

      // Add cultural-specific SSML adjustments
      const ssmlText = this.addCulturalSSMLAdjustments(text);

      // Wrap the speakSsmlAsync call to handle the type correctly
      const synthesisPromise = new Promise<SynthesisResult>((resolve, reject) => {
        this.synthesizer?.speakSsmlAsync(
          ssmlText,
          result => {
            resolve({
              audioData: result.audioData,
              reason: result.reason,
              errorDetails: result.errorDetails,
            });
          },
          error => {
            reject(error);
          }
        );
      });

      const result = await synthesisPromise;

      if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
        onAudioData(result.audioData);
      } else {
        onError(`Synthesis failed: ${result.errorDetails || 'Unknown error'}`);
      }

      this.synthesizer.close();
      this.synthesizer = null;
    } catch (error) {
      onError(`Synthesis error: ${error}`);
    }
  }

  private addCulturalSSMLAdjustments(text: string): string {
    let ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${this.speechConfig.speechSynthesisVoiceName}">`;

    // Add cultural-specific prosody and breaks
    switch (this.currentLanguage) {
      case 'mi':
        // Add longer pauses and slower pace for Te Reo Māori
        ssml += `<prosody rate="-30%" volume="75%">
          ${this.addCulturalBreaks(text, 'mi')}
        </prosody>`;
        break;
      case 'zh':
        // Maintain tonal clarity for Mandarin
        ssml += `<prosody rate="-10%" volume="85%">
          ${this.addCulturalBreaks(text, 'zh')}
        </prosody>`;
        break;
      case 'en':
      default:
        // Standard warm pace for English
        ssml += `<prosody rate="0%" volume="80%">
          ${this.addCulturalBreaks(text, 'en')}
        </prosody>`;
    }

    ssml += '</speak>';
    return ssml;
  }

  private addCulturalBreaks(text: string, language: PreferredLanguage): string {
    // Add appropriate breaks based on cultural speaking patterns
    switch (language) {
      case 'mi':
        // Add longer pauses after sentences for Te Reo Māori
        return text.replace(/([.!?])\s+/g, '$1<break time="1s"/>');
      case 'zh':
        // Add breaks after commas and periods for Mandarin
        return text
          .replace(/([,，])\s*/g, '$1<break time="300ms"/>')
          .replace(/([.。!！?？])\s*/g, '$1<break time="800ms"/>');
      case 'en':
      default:
        // Standard breaks for English
        return text
          .replace(/([,])\s*/g, '$1<break time="200ms"/>')
          .replace(/([.!?])\s*/g, '$1<break time="500ms"/>');
    }
  }

  async cleanup(): Promise<void> {
    await this.stopContinuousRecognition();
    
    if (this.synthesizer) {
      this.synthesizer.close();
      this.synthesizer = null;
    }
  }
} 