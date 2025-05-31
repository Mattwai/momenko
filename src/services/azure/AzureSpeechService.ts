import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { PreferredLanguage, AzureVoiceConfig, AZURE_VOICE_PROFILES } from '../../types';
import config from '../../config';

interface SpeechConfig {
  language: PreferredLanguage;
  voiceConfig?: AzureVoiceConfig;
}

interface _SynthesisResult {
  audioData: ArrayBuffer;
  reason: sdk.ResultReason;
  errorDetails?: string;
}

export class AzureSpeechService {
  private speechConfig: sdk.SpeechConfig;
  private currentLanguage: PreferredLanguage;
  private recognizer: sdk.SpeechRecognizer | null = null;
  private synthesizer: sdk.SpeechSynthesizer | null = null;

  constructor(speechConfig: SpeechConfig) {
    if (!config.azure.isConfigured) {
      throw new Error('Azure Speech credentials not configured');
    }

    try {
      this.speechConfig = sdk.SpeechConfig.fromSubscription(config.azure.speechKey, config.azure.speechRegion);
      this.currentLanguage = speechConfig.language;
      this.configureForLanguage(speechConfig.language, speechConfig.voiceConfig);
    } catch (error) {
      console.error('Failed to initialize Azure Speech Service:', error);
      throw new Error('Failed to initialize Azure Speech Service');
    }
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

      // Configure audio input from microphone
      const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
      this.recognizer = new sdk.SpeechRecognizer(this.speechConfig, audioConfig);

      // Handle interim results (recognizing)
      this.recognizer.recognizing = (_, event) => {
        if (event.result.text && event.result.text.trim().length > 0) {
          onInterimResult(event.result.text);
        }
      };

      // Handle final results (recognized)
      this.recognizer.recognized = (_, event) => {
        if (event.result.reason === sdk.ResultReason.RecognizedSpeech) {
          if (event.result.text && event.result.text.trim().length > 0) {
            onFinalResult(event.result.text);
          }
        } else if (event.result.reason === sdk.ResultReason.NoMatch) {
          console.log('No speech recognized');
        }
      };

      // Handle session events
      this.recognizer.sessionStarted = (_, event) => {
        console.log('Speech recognition session started:', event.sessionId);
      };

      this.recognizer.sessionStopped = (_, event) => {
        console.log('Speech recognition session stopped:', event.sessionId);
      };

      // Handle errors and cancellation
      this.recognizer.canceled = (_, event) => {
        console.log('Recognition canceled:', event.reason);
        if (event.reason === sdk.CancellationReason.Error) {
          const errorMsg = `Recognition error: ${event.errorDetails || 'Unknown error'}`;
          console.error(errorMsg);
          onError(errorMsg);
        }
      };

      // Start recognition with proper Promise handling
      return new Promise<void>((resolve, reject) => {
        if (!this.recognizer) {
          reject(new Error('Recognizer not initialized'));
          return;
        }

        this.recognizer.startContinuousRecognitionAsync(
          () => {
            console.log('Continuous recognition started successfully');
            resolve();
          },
          (error) => {
            const errorMsg = `Failed to start recognition: ${error}`;
            console.error(errorMsg);
            onError(errorMsg);
            reject(new Error(errorMsg));
          }
        );
      });
    } catch (error) {
      const errorMsg = `Failed to initialize recognition: ${error}`;
      console.error(errorMsg);
      onError(errorMsg);
      throw new Error(errorMsg);
    }
  }

  async stopContinuousRecognition(): Promise<void> {
    if (!this.recognizer) return;

    try {
      return new Promise<void>((resolve) => {
        if (!this.recognizer) {
          resolve();
          return;
        }

        this.recognizer.stopContinuousRecognitionAsync(
          () => {
            if (this.recognizer) {
              this.recognizer.close();
              this.recognizer = null;
            }
            console.log('Recognition stopped successfully');
            resolve();
          },
          (error) => {
            console.error('Error stopping recognition:', error);
            if (this.recognizer) {
              this.recognizer.close();
              this.recognizer = null;
            }
            resolve(); // Still resolve to avoid hanging
          }
        );
      });
    } catch (error) {
      console.error('Error in stopContinuousRecognition:', error);
      if (this.recognizer) {
        this.recognizer.close();
        this.recognizer = null;
      }
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
        this.synthesizer = null;
      }

      // Configure audio output
      const audioConfig = sdk.AudioConfig.fromDefaultSpeakerOutput();
      this.synthesizer = new sdk.SpeechSynthesizer(this.speechConfig, audioConfig);

      // Add cultural-specific SSML adjustments
      const ssmlText = this.addCulturalSSMLAdjustments(text);

      // Handle synthesis with proper Promise wrapping
      return new Promise<void>((resolve, reject) => {
        if (!this.synthesizer) {
          reject(new Error('Synthesizer not initialized'));
          return;
        }

        this.synthesizer.speakSsmlAsync(
          ssmlText,
          (result) => {
            try {
              if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                onAudioData(result.audioData);
                resolve();
              } else if (result.reason === sdk.ResultReason.Canceled) {
                const cancellation = sdk.CancellationDetails.fromResult(result);
                const errorMsg = `Synthesis canceled: ${cancellation.reason} - ${cancellation.errorDetails || 'Unknown error'}`;
                console.error(errorMsg);
                onError(errorMsg);
                reject(new Error(errorMsg));
              } else {
                const errorMsg = `Synthesis failed with reason: ${result.reason}`;
                console.error(errorMsg);
                onError(errorMsg);
                reject(new Error(errorMsg));
              }
            } catch (error) {
              const errorMsg = `Error processing synthesis result: ${error}`;
              console.error(errorMsg);
              onError(errorMsg);
              reject(new Error(errorMsg));
            } finally {
              // Clean up synthesizer
              if (this.synthesizer) {
                this.synthesizer.close();
                this.synthesizer = null;
              }
            }
          },
          (error) => {
            const errorMsg = `Synthesis error: ${error}`;
            console.error(errorMsg);
            onError(errorMsg);
            if (this.synthesizer) {
              this.synthesizer.close();
              this.synthesizer = null;
            }
            reject(new Error(errorMsg));
          }
        );
      });
    } catch (error) {
      const errorMsg = `Failed to initialize synthesis: ${error}`;
      console.error(errorMsg);
      onError(errorMsg);
      throw new Error(errorMsg);
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
    try {
      // Stop recognition first
      await this.stopContinuousRecognition();
      
      // Clean up synthesizer
      if (this.synthesizer) {
        try {
          this.synthesizer.close();
        } catch (error) {
          console.error('Error closing synthesizer:', error);
        }
        this.synthesizer = null;
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
} 