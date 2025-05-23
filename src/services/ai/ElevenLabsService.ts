import axios from 'axios';
import { ELEVEN_LABS_API_KEY } from '@env';

class ElevenLabsService {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  private voiceId: string; // You can choose a specific voice ID from ElevenLabs

  constructor() {
    this.apiKey = ELEVEN_LABS_API_KEY;
    // Rachel voice ID - a warm, friendly female voice perfect for elderly care
    this.voiceId = '21m00Tcm4TlvDq8ikWAM';
  }

  async initializeVoice() {
    try {
      // Verify API key and get available voices
      const response = await axios.get(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });
      
      console.log('ElevenLabs voices initialized');
      return true;
    } catch (error) {
      console.error('Error initializing ElevenLabs:', error);
      return false;
    }
  }

  async textToSpeech(text: string): Promise<ArrayBuffer | null> {
    try {
      console.log('ElevenLabs: Starting text-to-speech for:', text.substring(0, 50) + '...');
      
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}/text-to-speech/${this.voiceId}`,
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        data: {
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.75,
            similarity_boost: 0.75,
          }
        },
        responseType: 'arraybuffer'
      });

      console.log('ElevenLabs: Successfully generated speech, buffer size:', response.data.byteLength);
      return response.data;
    } catch (error) {
      console.error('ElevenLabs: Error generating speech:', error);
      return null;
    }
  }

  // Helper method to split long text into natural sentences
  splitIntoSentences(text: string): string[] {
    // Split on sentence endings (., !, ?) but keep the punctuation
    return text
      .split(/([.!?]+)/)
      .reduce((acc: string[], current: string, i: number, arr: string[]) => {
        if (i % 2 === 0) {
          // If there's punctuation following this piece, combine them
          const punctuation = arr[i + 1] || '';
          if (current.trim()) {
            acc.push(current.trim() + punctuation);
          }
        }
        return acc;
      }, []);
  }
}

export default new ElevenLabsService(); 