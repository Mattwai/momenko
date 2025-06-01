import * as Speech from "expo-speech";
import { PreferredLanguage } from "../../types";

interface TTSConfig {
  language: PreferredLanguage;
}

interface SpeechOptions {
  language: string;
  pitch: number;
  rate: number;
  volume: number;
  voice?: string;
}

export class ReactNativeTTSService {
  private currentLanguage: PreferredLanguage;
  private isSpeaking = false;
  private currentSpeechId: string | null = null;

  constructor(ttsConfig: TTSConfig) {
    this.currentLanguage = ttsConfig.language;
  }

  private getLanguageCode(language: PreferredLanguage): string {
    switch (language) {
      case "mi":
        return "mi-NZ"; // Te Reo Māori (New Zealand)
      case "zh":
        return "zh-CN"; // Mandarin Chinese (Simplified)
      case "en":
      default:
        return "en-NZ"; // English (New Zealand)
    }
  }

  private getCulturalSpeechOptions(
    language: PreferredLanguage,
  ): Partial<SpeechOptions> {
    const baseOptions: Partial<SpeechOptions> = {
      language: this.getLanguageCode(language),
      volume: 0.8,
    };

    switch (language) {
      case "mi":
        // Te Reo Māori: Slower, more respectful pace
        return {
          ...baseOptions,
          rate: 0.7, // Slower speech rate
          pitch: 1.0, // Normal pitch
          volume: 0.75, // Slightly softer
        };
      case "zh":
        // Mandarin Chinese: Maintain tonal clarity
        return {
          ...baseOptions,
          rate: 0.9, // Slightly slower for tonal clarity
          pitch: 1.0, // Normal pitch to preserve tones
          volume: 0.85, // Clear volume
        };
      case "en":
      default:
        // English: Standard warm pace
        return {
          ...baseOptions,
          rate: 1.0, // Normal speech rate
          pitch: 1.0, // Normal pitch
          volume: 0.8, // Comfortable volume
        };
    }
  }

  private addCulturalPauses(text: string, language: PreferredLanguage): string {
    switch (language) {
      case "mi":
        // Add longer pauses after sentences for Te Reo Māori
        return text
          .replace(/([.!?])\s+/g, "$1... ") // Longer pauses after sentences
          .replace(/([,])\s*/g, "$1.. "); // Pauses after commas
      case "zh":
        // Add breaks after commas and periods for Mandarin
        return text
          .replace(/([,，])\s*/g, "$1. ") // Short pause after commas
          .replace(/([.。!！?？])\s*/g, "$1... "); // Longer pause after sentences
      case "en":
      default:
        // Standard breaks for English
        return text
          .replace(/([,])\s*/g, "$1. ") // Short pause after commas
          .replace(/([.!?])\s*/g, "$1.. "); // Medium pause after sentences
    }
  }

  async synthesizeSpeech(
    text: string,
    onStart?: () => void,
    onComplete?: () => void,
    onError?: (error: string) => void,
  ): Promise<void> {
    try {
      // Stop any current speech
      if (this.isSpeaking) {
        await this.stopSpeech();
      }

      // Apply cultural adjustments to text
      const adjustedText = this.addCulturalPauses(text, this.currentLanguage);

      // Get cultural speech options
      const speechOptions = this.getCulturalSpeechOptions(this.currentLanguage);

      console.log(
        `Starting TTS for language ${this.currentLanguage}:`,
        adjustedText.substring(0, 50) + "...",
      );

      this.isSpeaking = true;
      onStart?.();

      const speechPromise = new Promise<void>((resolve, reject) => {
        const options: Speech.SpeechOptions = {
          language: speechOptions.language || "en-US",
          pitch: speechOptions.pitch || 1.0,
          rate: speechOptions.rate || 1.0,
          volume: speechOptions.volume || 0.8,
          voice: speechOptions.voice,
          onStart: () => {
            console.log("TTS started");
          },
          onDone: () => {
            console.log("TTS completed");
            this.isSpeaking = false;
            this.currentSpeechId = null;
            onComplete?.();
            resolve();
          },
          onStopped: () => {
            console.log("TTS stopped");
            this.isSpeaking = false;
            this.currentSpeechId = null;
            resolve();
          },
          onError: (error) => {
            console.error("TTS error:", error);
            this.isSpeaking = false;
            this.currentSpeechId = null;
            const errorMessage = error?.message || "Text-to-speech failed";
            onError?.(errorMessage);
            reject(new Error(errorMessage));
          },
        };

        // Generate unique ID for this speech instance
        this.currentSpeechId = `speech_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        Speech.speak(adjustedText, options);
      });

      await speechPromise;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown TTS error";
      console.error("TTS synthesis failed:", errorMessage);
      this.isSpeaking = false;
      this.currentSpeechId = null;
      onError?.(errorMessage);
      throw new Error(errorMessage);
    }
  }

  async stopSpeech(): Promise<void> {
    try {
      if (this.isSpeaking) {
        await Speech.stop();
        this.isSpeaking = false;
        this.currentSpeechId = null;
        console.log("TTS stopped successfully");
      }
    } catch (error) {
      console.error("Error stopping TTS:", error);
      this.isSpeaking = false;
      this.currentSpeechId = null;
    }
  }

  async pauseSpeech(): Promise<void> {
    try {
      if (this.isSpeaking) {
        await Speech.pause();
        console.log("TTS paused");
      }
    } catch (error) {
      console.error("Error pausing TTS:", error);
    }
  }

  async resumeSpeech(): Promise<void> {
    try {
      await Speech.resume();
      console.log("TTS resumed");
    } catch (error) {
      console.error("Error resuming TTS:", error);
    }
  }

  async changeLanguage(language: PreferredLanguage): Promise<void> {
    const wasSpeaking = this.isSpeaking;

    if (wasSpeaking) {
      await this.stopSpeech();
    }

    this.currentLanguage = language;
    console.log(`TTS language changed to: ${language}`);
  }

  async cleanup(): Promise<void> {
    try {
      await this.stopSpeech();
      console.log("TTS service cleaned up successfully");
    } catch (error) {
      console.error("Error during TTS cleanup:", error);
    }
  }

  // Helper method to check if TTS is available
  static async isAvailable(): Promise<boolean> {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      return voices.length > 0;
    } catch (error) {
      console.error("Error checking TTS availability:", error);
      return false;
    }
  }

  // Helper method to get available voices
  static async getAvailableVoices(): Promise<Speech.Voice[]> {
    try {
      return await Speech.getAvailableVoicesAsync();
    } catch (error) {
      console.error("Error getting available voices:", error);
      return [];
    }
  }

  // Helper method to get voices for a specific language
  static async getVoicesForLanguage(
    language: PreferredLanguage,
  ): Promise<Speech.Voice[]> {
    try {
      const allVoices = await Speech.getAvailableVoicesAsync();
      const languageCode = new ReactNativeTTSService({
        language,
      }).getLanguageCode(language);

      return allVoices.filter(
        (voice) =>
          voice.language.startsWith(languageCode.split("-")[0]) ||
          voice.language === languageCode,
      );
    } catch (error) {
      console.error("Error getting voices for language:", error);
      return [];
    }
  }

  // Get current TTS state
  getTTSState(): {
    isSpeaking: boolean;
    language: PreferredLanguage;
    speechId: string | null;
  } {
    return {
      isSpeaking: this.isSpeaking,
      language: this.currentLanguage,
      speechId: this.currentSpeechId,
    };
  }

  // Method to speak with custom options
  async speakWithOptions(
    text: string,
    customOptions: Partial<SpeechOptions>,
    onStart?: () => void,
    onComplete?: () => void,
    onError?: (error: string) => void,
  ): Promise<void> {
    try {
      if (this.isSpeaking) {
        await this.stopSpeech();
      }

      const adjustedText = this.addCulturalPauses(text, this.currentLanguage);
      const defaultOptions = this.getCulturalSpeechOptions(
        this.currentLanguage,
      );
      const mergedOptions = { ...defaultOptions, ...customOptions };

      this.isSpeaking = true;
      onStart?.();

      const options: Speech.SpeechOptions = {
        language: mergedOptions.language || "en-US",
        pitch: mergedOptions.pitch || 1.0,
        rate: mergedOptions.rate || 1.0,
        volume: mergedOptions.volume || 0.8,
        voice: mergedOptions.voice,
        onDone: () => {
          this.isSpeaking = false;
          this.currentSpeechId = null;
          onComplete?.();
        },
        onError: (error) => {
          this.isSpeaking = false;
          this.currentSpeechId = null;
          const errorMessage = error?.message || "Text-to-speech failed";
          onError?.(errorMessage);
        },
      };

      this.currentSpeechId = `speech_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await Speech.speak(adjustedText, options);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown TTS error";
      this.isSpeaking = false;
      this.currentSpeechId = null;
      onError?.(errorMessage);
      throw new Error(errorMessage);
    }
  }
}
