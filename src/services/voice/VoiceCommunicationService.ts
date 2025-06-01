import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { AudioManager } from '../audio/AudioManager';
import config from '../../config';
import { PreferredLanguage } from '../../types';
import { Buffer } from 'buffer';

// Define interfaces
export interface VoiceCommunicationOptions {
  preferredLanguage: PreferredLanguage;
  onTranscriptUpdate?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  voiceId?: string; // ElevenLabs voice ID
  modelId?: string; // DeepSeek model ID
}

export interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

export interface WebSocketMessage {
  type: 'transcript' | 'error' | 'status' | 'audio';
  data: any;
}

export interface TTSOptions {
  text: string;
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
  speakerId?: string;
  modelId?: string;
}

export class VoiceCommunicationService {
  private audioManager: AudioManager;
  private language: PreferredLanguage;
  private isListening: boolean = false;
  private isSpeaking: boolean = false;
  private socket: WebSocket | null = null;
  private interimTranscript: string = '';
  private finalTranscript: string = '';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private currentSound: Audio.Sound | null = null;
  private lastRecordingUri: string | null = null;
  private voiceId: string;
  private modelId: string;
  private isInitialized: boolean = false;
  private silenceTimeout: NodeJS.Timeout | null = null;

  // Callbacks
  private onTranscriptUpdate: ((transcript: string, isFinal: boolean) => void) | undefined;
  private onError: ((error: string) => void) | undefined;
  private onSpeechStart: (() => void) | undefined;
  private onSpeechEnd: (() => void) | undefined;

  constructor(options: VoiceCommunicationOptions) {
    this.audioManager = new AudioManager();
    this.language = options.preferredLanguage;
    this.onTranscriptUpdate = options.onTranscriptUpdate;
    this.onError = options.onError;
    this.onSpeechStart = options.onSpeechStart;
    this.onSpeechEnd = options.onSpeechEnd;
    this.voiceId = options.voiceId || this.getDefaultVoiceId(options.preferredLanguage);
    this.modelId = options.modelId || 'deepseek-chat';
    
    // Initialize the service
    this.initialize();
  }

  private getDefaultVoiceId(language: PreferredLanguage): string {
    // Default ElevenLabs voice IDs for different languages
    switch (language) {
      case 'mi': // Māori
        return 'jsCqWAovK2LkecY7zXl4'; // Customizable
      case 'zh': // Chinese
        return '21m00Tcm4TlvDq8ikWAM'; // Chinese voice
      case 'en': // English
      default:
        return 'EXAVITQu4vr4xnSDxMaL'; // Rachel voice
    }
  }

  private async initialize(): Promise<void> {
    try {
      // Check and request audio permissions
      const permissionGranted = await this.audioManager.requestPermissions();
      if (!permissionGranted) {
        this.handleError('Audio recording permissions not granted');
        return;
      }

      // Initialize audio session
      await this.audioManager.configureAudioSession();
      
      this.isInitialized = true;
      console.log('Voice Communication Service initialized successfully');
    } catch (error) {
      this.handleError(`Initialization failed: ${error}`);
    }
  }

  public async startListening(): Promise<void> {
    if (!this.isInitialized) {
      this.handleError('Service not initialized. Please wait or reinitialize.');
      return;
    }

    if (this.isListening) {
      console.log('Already listening, ignoring startListening call');
      return;
    }

    try {
      this.isListening = true;
      this.interimTranscript = '';
      
      // Start audio recording with silence detection
      await this.audioManager.startRecording(this.handleSilenceDetected.bind(this));
      
      // Connect to WebSocket for real-time transcription
      this.connectWebSocket();
      
      console.log('Started listening with language:', this.language);
    } catch (error) {
      this.isListening = false;
      this.handleError(`Failed to start listening: ${error}`);
    }
  }

  public async stopListening(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    try {
      // Clear any silence timeout
      if (this.silenceTimeout) {
        clearTimeout(this.silenceTimeout);
        this.silenceTimeout = null;
      }

      this.isListening = false;
      
      // Stop recording and get the audio file
      this.lastRecordingUri = await this.audioManager.stopRecording();
      
      // Close WebSocket connection
      this.closeWebSocketConnection();
      
      console.log('Stopped listening');
      
      // If we have a recording, send it for final processing
      if (this.lastRecordingUri) {
        await this.processAudioFile(this.lastRecordingUri);
      }
    } catch (error) {
      this.handleError(`Failed to stop listening: ${error}`);
    }
  }

  private handleSilenceDetected(): void {
    console.log('Silence detected, stopping listening');
    
    if (config.voice.autoStopOnSilence && this.isListening) {
      // Set a timeout to stop listening if silence continues
      this.silenceTimeout = setTimeout(() => {
        this.stopListening();
      }, 1000); // 1 second delay before stopping
    }
  }

  private connectWebSocket(): void {
    // Close any existing connection
    this.closeWebSocketConnection();
    
    try {
      // Connect to DeepSeek WebSocket API
      this.socket = new WebSocket(config.deepseek.apiUrl);
      
      this.socket.onopen = () => {
        console.log('WebSocket connection established');
        this.reconnectAttempts = 0;
        
        // Send configuration message
        if (this.socket) {
          const configMessage = {
            type: 'config',
            data: {
              language: this.getLanguageCode(),
              model: this.modelId,
              interim_results: true
            }
          };
          this.socket.send(JSON.stringify(configMessage));
        }
      };
      
      this.socket.onmessage = (event) => {
        this.handleWebSocketMessage(event.data);
      };
      
      this.socket.onerror = (error) => {
        this.handleError(`WebSocket error: ${error}`);
      };
      
      this.socket.onclose = (event) => {
        console.log(`WebSocket closed: ${event.code} ${event.reason}`);
        
        // Attempt to reconnect if needed
        if (this.isListening && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => {
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            this.connectWebSocket();
          }, 1000 * this.reconnectAttempts); // Increasing backoff
        }
      };
    } catch (error) {
      this.handleError(`Failed to connect to WebSocket: ${error}`);
    }
  }

  private closeWebSocketConnection(): void {
    if (this.socket) {
      try {
        this.socket.close();
      } catch (error) {
        console.error('Error closing WebSocket:', error);
      }
      this.socket = null;
    }
  }

  private handleWebSocketMessage(data: string): void {
    try {
      const message = JSON.parse(data) as WebSocketMessage;
      
      switch (message.type) {
        case 'transcript':
          const result = message.data as SpeechRecognitionResult;
          
          if (result.isFinal) {
            this.finalTranscript = result.transcript;
            this.interimTranscript = '';
            
            if (this.onTranscriptUpdate) {
              this.onTranscriptUpdate(this.finalTranscript, true);
            }
          } else {
            this.interimTranscript = result.transcript;
            
            if (this.onTranscriptUpdate) {
              this.onTranscriptUpdate(this.interimTranscript, false);
            }
          }
          break;
          
        case 'error':
          this.handleError(`Speech recognition error: ${message.data}`);
          break;
          
        case 'status':
          console.log('Speech recognition status:', message.data);
          break;
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  private async processAudioFile(fileUri: string): Promise<void> {
    try {
      // Read the audio file
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      
      if (!fileInfo.exists) {
        throw new Error('Audio file does not exist');
      }
      
      // Read the file as base64
      const base64Audio = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      // Send the audio file to DeepSeek for processing
      await this.sendAudioToDeepSeek(base64Audio);
    } catch (error) {
      this.handleError(`Failed to process audio file: ${error}`);
    }
  }

  private async sendAudioToDeepSeek(base64Audio: string): Promise<void> {
    try {
      const response = await fetch(`${config.deepseek.apiUrl}/speech-to-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.deepseek.apiKey}`
        },
        body: JSON.stringify({
          audio: base64Audio,
          model: this.modelId,
          language: this.getLanguageCode()
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.text) {
        this.finalTranscript = result.text;
        
        if (this.onTranscriptUpdate) {
          this.onTranscriptUpdate(this.finalTranscript, true);
        }
      }
    } catch (error) {
      this.handleError(`DeepSeek API error: ${error}`);
    }
  }

  public async speak(text: string, options?: Partial<TTSOptions>): Promise<void> {
    if (this.isSpeaking) {
      await this.stopSpeaking();
    }
    
    try {
      this.isSpeaking = true;
      
      if (this.onSpeechStart) {
        this.onSpeechStart();
      }
      
      // Get audio from ElevenLabs
      const audioData = await this.getElevenLabsAudio({
        text,
        voiceId: options?.voiceId || this.voiceId,
        stability: options?.stability || 0.5,
        similarityBoost: options?.similarityBoost || 0.75
      });
      
      // Save audio to a temporary file
      const tempFile = `${FileSystem.cacheDirectory}tts_${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(tempFile, audioData, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      // Play the audio
      await this.playAudioFile(tempFile);
    } catch (error) {
      this.isSpeaking = false;
      this.handleError(`Failed to speak: ${error}`);
      
      if (this.onSpeechEnd) {
        this.onSpeechEnd();
      }
    }
  }

  private async getElevenLabsAudio(options: TTSOptions): Promise<string> {
    try {
      const voiceId = options.voiceId || this.voiceId;
      const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': config.elevenLabs.apiKey
        },
        body: JSON.stringify({
          text: options.text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: options.stability || 0.5,
            similarity_boost: options.similarityBoost || 0.75
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
      }
      
      // Get response as array buffer
      const arrayBuffer = await response.arrayBuffer();
      
      // Convert to base64
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      
      return base64;
    } catch (error) {
      throw new Error(`ElevenLabs API error: ${error}`);
    }
  }

  private async playAudioFile(fileUri: string): Promise<void> {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: fileUri },
        { shouldPlay: true },
        this.onPlaybackStatusUpdate
      );
      
      this.currentSound = sound;
      
      // Start playing
      await sound.playAsync();
    } catch (error) {
      throw new Error(`Failed to play audio: ${error}`);
    }
  }

  private onPlaybackStatusUpdate = (status: AVPlaybackStatus): void => {
    if (!status.isLoaded) return;
    
    if (status.didJustFinish) {
      this.isSpeaking = false;
      
      if (this.onSpeechEnd) {
        this.onSpeechEnd();
      }
      
      // Unload the sound
      if (this.currentSound) {
        this.currentSound.unloadAsync();
        this.currentSound = null;
      }
    }
  };

  public async stopSpeaking(): Promise<void> {
    try {
      if (this.currentSound) {
        await this.currentSound.stopAsync();
        await this.currentSound.unloadAsync();
        this.currentSound = null;
      }
      
      this.isSpeaking = false;
      
      if (this.onSpeechEnd) {
        this.onSpeechEnd();
      }
      
      console.log('Stopped speaking');
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  }

  public resetTranscript(): void {
    this.interimTranscript = '';
    this.finalTranscript = '';
  }

  public getState() {
    return {
      isListening: this.isListening,
      isSpeaking: this.isSpeaking,
      interimTranscript: this.interimTranscript,
      finalTranscript: this.finalTranscript,
      isInitialized: this.isInitialized,
      language: this.language,
      voiceId: this.voiceId
    };
  }

  public async cleanup(): Promise<void> {
    try {
      // Clear any silence timeout
      if (this.silenceTimeout) {
        clearTimeout(this.silenceTimeout);
        this.silenceTimeout = null;
      }
      
      // Stop listening and speaking
      if (this.isListening) {
        await this.stopListening();
      }
      
      if (this.isSpeaking) {
        await this.stopSpeaking();
      }
      
      // Close WebSocket connection
      this.closeWebSocketConnection();
      
      // Clean up audio manager
      await this.audioManager.cleanup();
      
      console.log('Voice Communication Service cleaned up');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  public async changeLanguage(language: PreferredLanguage): Promise<void> {
    const wasListening = this.isListening;
    const wasSpeaking = this.isSpeaking;
    
    try {
      // Stop current operations
      if (wasListening) {
        await this.stopListening();
      }
      
      if (wasSpeaking) {
        await this.stopSpeaking();
      }
      
      // Update language
      this.language = language;
      this.voiceId = this.getDefaultVoiceId(language);
      
      console.log(`Language changed to: ${language}`);
      
      // Restart if needed
      if (wasListening) {
        await this.startListening();
      }
    } catch (error) {
      this.handleError(`Failed to change language: ${error}`);
    }
  }

  private getLanguageCode(): string {
    switch (this.language) {
      case 'mi':
        return 'mi-NZ'; // Te Reo Māori (New Zealand)
      case 'zh':
        return 'zh-CN'; // Mandarin Chinese (Simplified)
      case 'en':
      default:
        return 'en-NZ'; // English (New Zealand)
    }
  }

  private handleError(errorMessage: string): void {
    console.error(errorMessage);
    
    if (this.onError) {
      this.onError(errorMessage);
    }
  }
}