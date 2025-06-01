import * as FileSystem from 'expo-file-system';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { AudioManager } from '../audio/AudioManager';
import config from '../../config';
import { PreferredLanguage } from '../../types';
import { Buffer } from 'buffer';
import axios from 'axios';

// Define interfaces
export interface VoiceCommunicationOptions {
  preferredLanguage: PreferredLanguage;
  onTranscriptUpdate?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  voiceId?: string; // ElevenLabs voice ID
  modelId?: string; // DeepSeek model ID
  stability?: number;
  similarityBoost?: number;
  onAIResponseReceived?: (response: string) => void; // Callback for AI responses
}

export interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

interface _WebSocketMessage {
  type: 'transcript' | 'error' | 'status' | 'audio';
  data: unknown;
}

export interface TTSOptions {
  text: string;
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
  speakerId?: string;
  modelId?: string;
}

// DeepSeek Chat API interfaces
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
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
  private stability: number;
  private similarityBoost: number;
  private lastPlaybackPosition: number = 0;
  private stalledPlaybackCount: number = 0;
  private lastRecordingDuration: number = 0;
  private conversationHistory: ChatMessage[] = [];

  // Callbacks
  private onTranscriptUpdate: ((transcript: string, isFinal: boolean) => void) | undefined;
  private onError: ((error: string) => void) | undefined;
  private onSpeechStart: (() => void) | undefined;
  private onSpeechEnd: (() => void) | undefined;
  private onAIResponseReceived: ((response: string) => void) | undefined;

  constructor(options: VoiceCommunicationOptions) {
    this.audioManager = new AudioManager();
    this.language = options.preferredLanguage;
    this.onTranscriptUpdate = options.onTranscriptUpdate;
    this.onError = options.onError;
    this.onSpeechStart = options.onSpeechStart;
    this.onSpeechEnd = options.onSpeechEnd;
    this.onAIResponseReceived = options.onAIResponseReceived;
    this.voiceId = options.voiceId || this.getDefaultVoiceId(options.preferredLanguage);
    this.modelId = options.modelId || 'deepseek-chat';
    this.stability = options.stability || 0.5;
    this.similarityBoost = options.similarityBoost || 0.75;
    
    // Initialize conversation with a system message
    this.initializeConversation();
    
    // Start initialization but don't wait for it in constructor
    this.initialize().catch(error => {
      console.error('Failed to initialize VoiceCommunicationService:', error);
      this.handleError(`Initialization failed: ${error}`);
    });
  }
  
  private initializeConversation(): void {
    // Reset conversation history
    this.conversationHistory = [
      {
        role: 'system',
        content: 'You are a helpful, friendly assistant. Respond naturally like a human would in conversation. Keep responses brief and conversational. Do not use emojis, symbols, asterisks, or any formatting. Speak like you are having a casual conversation.'
      }
    ];
  }

  private getDefaultVoiceId(language: PreferredLanguage): string {
    // Default ElevenLabs voice IDs for different languages
    switch (language) {
      case 'mi': // Māori
        return 'pNInz6obpgDQGcFmaJgB'; // Adam
      case 'zh': // Chinese
        return '21m00Tcm4TlvDq8ikWAM'; // Chinese voice
      case 'en': // English
      default:
        return 'EXAVITQu4vr4xnSDxMaL'; // Rachel voice
    }
  }

  private initializationInProgress = false;
  private initializationComplete = false;
  
  private async initialize(): Promise<void> {
    console.log('🚀 VoiceCommunicationService initialization starting...');
    
    // Prevent multiple initialization attempts
    if (this.initializationInProgress) {
      console.log('⏳ Initialization already in progress, waiting...');
      // Wait for ongoing initialization to complete
      while (this.initializationInProgress && !this.initializationComplete) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      console.log('✅ Waited for initialization completion');
      return;
    }
    
    // If already initialized successfully, don't re-initialize
    if (this.initializationComplete) {
      console.log('✅ Already initialized, setting isInitialized = true');
      this.isInitialized = true;
      return;
    }
    
    this.initializationInProgress = true;
    console.log('🔧 Starting initialization process...');
    
    try {
      // Check and request audio permissions
      console.log('🎤 Checking audio permissions...');
      const permissionGranted = await this.audioManager.requestPermissions();
      if (!permissionGranted) {
        console.error('❌ Audio permissions denied');
        this.handleError('Audio recording permissions not granted');
        this.initializationInProgress = false;
        return;
      }
      console.log('✅ Audio permissions granted');

      // Initialize audio session with proper settings for recording
      try {
        console.log('🔊 Configuring audio mode...');
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        console.log('✅ Audio session configured');
      } catch (audioError) {
        console.warn('⚠️ Error setting audio mode:', audioError);
      }
      
      console.log('🔧 Configuring audio manager session...');
      await this.audioManager.configureAudioSession();
      
      // Validate that ElevenLabs is configured for voice synthesis
      console.log('🔑 Checking ElevenLabs API configuration...');
      if (!config.elevenLabs.isConfigured) {
        console.error('❌ ElevenLabs API not configured');
        this.handleError('ElevenLabs API is not configured. Please add ELEVEN_LABS_API_KEY to your environment.');
        this.initializationInProgress = false;
        return;
      }
      console.log('✅ ElevenLabs API configured');
      
      // Check if DeepSeek chat API is available (not required but useful)
      console.log('🔑 Checking DeepSeek API configuration...');
      if (config.deepseek.isConfigured && !this.initializationComplete) {
        console.log('✅ DeepSeek API configured, key length:', config.deepseek.apiKey.length);
      } else if (!config.deepseek.isConfigured && !this.initializationComplete) {
        console.warn('⚠️ DeepSeek API not configured. Chat functionality may be limited.');
      }
      
      if (!this.initializationComplete) {
        console.log('🎤 Using device transcription with ElevenLabs voice synthesis');
      }
      
      console.log('🔧 Setting initialization flags...');
      this.isInitialized = true;
      this.initializationComplete = true;
      
      console.log('🏁 Initialization completed successfully. Success:', this.isInitialized);
      console.log('📊 Final state:', {
        isInitialized: this.isInitialized,
        initializationComplete: this.initializationComplete,
        language: this.language,
        voiceId: this.voiceId
      });
    } catch (error) {
      console.error('❌ Initialization failed with error:', error);
      this.handleError(`Initialization failed: ${error}`);
      this.isInitialized = false;
    } finally {
      this.initializationInProgress = false;
      console.log('🔚 Initialization process finished. Progress flag cleared.');
    }
  }

  public async startListening(): Promise<void> {
    // If not initialized, try to initialize now and wait for completion
    if (!this.isInitialized) {
      await this.initialize();
      
      // Double-check initialization succeeded
      if (!this.isInitialized) {
        throw new Error('Voice Communication Service failed to initialize');
      }
    }

    if (this.isListening) {
      return; // Silently ignore repeated calls
    }

    try {
      // Ensure audio mode is properly set for recording
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        
        // Small delay to ensure audio mode is applied
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (audioError) {
        console.warn('Error setting audio mode for recording:', audioError);
      }
      
      this.isListening = true;
      this.interimTranscript = '';
      
      // Start audio recording with silence detection
      await this.audioManager.startRecording(this.handleSilenceDetected.bind(this));
      
      // Start audio processing directly
      this.startAudioProcessing();
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
      
      // Reset audio mode after recording
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
        });
      } catch (audioError) {
        console.warn('Error resetting audio mode after recording:', audioError);
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
        // If we have interim transcript, convert it to final before stopping
        if (this.interimTranscript) {
          this.finalTranscript = this.interimTranscript;
          if (this.onTranscriptUpdate) {
            this.onTranscriptUpdate(this.interimTranscript, true);
          }
          this.interimTranscript = '';
        }
        this.stopListening();
      }, 1500); // 1.5 second delay before stopping
    }
  }


  
  private startAudioProcessing(): void {
    if (!this.isListening) return;
    
    // Start audio recording with silence detection
    this.audioManager.startRecording(this.handleSilenceDetected.bind(this))
      .then(() => {
        console.log('🎤 Audio recording started successfully');
      })
      .catch(error => {
        console.error('Failed to start audio recording:', error);
        this.handleError(`Failed to start recording: ${error}`);
      });
  }
  
  // Remove the setupWebSocketHandlers method as it's no longer needed
  // We're using local simulation instead of WebSocket connections

  private closeWebSocketConnection(): void {
    // Clear any simulation timers
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
    
    // No actual WebSocket to close in the simulation
    this.socket = null;
  }

  // This method is no longer needed as we're not using WebSockets
  // We're using the handleSimulatedTranscript method instead

  private async processAudioFile(fileUri: string): Promise<void> {
    try {
      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      
      if (!fileInfo.exists) {
        throw new Error('Audio file does not exist');
      }
      
      // Since DeepSeek audio transcription endpoints are unavailable, 
      // we'll use device transcription and connect to DeepSeek chat API later
      
      console.log(`Processing audio file: ${fileUri}`);
      
      // Instead of random phrases, use a more context-aware approach
      // For now, use a simple placeholder until real speech recognition is implemented
      // In a real implementation, this would use iOS Speech Framework to transcribe the audio
      const simulatedTranscript = "Hello";
      
      // Store duration for better voice analysis
      this.lastRecordingDuration = 0;
      
      // Update the transcript state
      this.finalTranscript = simulatedTranscript;
      
      if (this.onTranscriptUpdate) {
        this.onTranscriptUpdate(simulatedTranscript, true);
      }
      
      // Log the generated transcript
      console.log(`Generated transcript: "${simulatedTranscript}"`);
      
      // Send the transcript to DeepSeek Chat API and get a response
      if (config.deepseek.isConfigured) {
        await this.sendToDeepSeekChat(simulatedTranscript);
      }
    } catch (error) {
      console.error('Error processing audio file:', error);
      this.handleError(`Failed to process audio: ${error}`);
    }
  }
  
  private async processWithNativeSpeechRecognition(fileUri: string): Promise<string> {
    try {
      // Read audio file as base64
      const audioBase64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // TODO: Implement actual iOS Speech Framework integration
      // For now, we'll use a simple approach that indicates we received audio
      // but can't transcribe it without native speech recognition
      
      console.log('🎤 Audio file processed, length:', audioBase64.length);
      
      // Return a placeholder that indicates the system is working
      // but needs proper speech recognition implementation
      return "Audio received but speech recognition needs native implementation";
    } catch (error) {
      console.error('Error processing audio with speech recognition:', error);
      return "Error processing speech";
    }
  }
  
  /**
   * Sends user input to DeepSeek Chat API and processes the response
   */
  private async sendToDeepSeekChat(userInput: string): Promise<void> {
    try {
      if (!config.deepseek.isConfigured) {
        console.warn('DeepSeek API not configured, skipping chat request');
        return;
      }
      
      console.log(`Sending to DeepSeek Chat API: "${userInput}"`);
      
      // Add the user's message to conversation history
      this.conversationHistory.push({
        role: 'user',
        content: userInput
      });
      
      // Prepare request
      const request: ChatCompletionRequest = {
        model: 'deepseek-chat',
        messages: this.conversationHistory,
        temperature: 0.7,
        max_tokens: 500
      };
      
      // Call the DeepSeek API
      const response = await axios.post<ChatCompletionResponse>(
        'https://api.deepseek.com/v1/chat/completions',
        request,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.deepseek.apiKey}`
          }
        }
      );
      
      // Process the response
      if (response.data.choices && response.data.choices.length > 0) {
        const aiMessage = response.data.choices[0].message;
        const aiResponse = aiMessage.content;
        
        // Add the assistant's response to conversation history
        this.conversationHistory.push({
          role: 'assistant',
          content: aiResponse
        });
        
        console.log(`Received AI response: "${aiResponse.substring(0, 100)}${aiResponse.length > 100 ? '...' : ''}"`);
        
        // Notify via callback
        if (this.onAIResponseReceived) {
          this.onAIResponseReceived(aiResponse);
        }
        
        // Automatically speak the response
        await this.speak(aiResponse);
      } else {
        console.warn('Received empty response from DeepSeek Chat API');
      }
      
      // Limit conversation history to maintain context without exceeding token limits
      if (this.conversationHistory.length > 10) {
        // Keep system message and last 4 exchanges (8 messages)
        this.conversationHistory = [
          this.conversationHistory[0], // System message
          ...this.conversationHistory.slice(-8) // Last 4 exchanges
        ];
      }
    } catch (error) {
      console.error('Error calling DeepSeek Chat API:', error);
      
      // Don't throw error to user, just log it
      if (error instanceof Error) {
        console.warn(`DeepSeek API error: ${error.message}`);
      }
    }
  }

  // These methods are replaced with simulated transcription
  // as the DeepSeek API endpoints for audio transcription are not available

  public async speak(text: string, options?: Partial<TTSOptions>): Promise<void> {
    if (this.isSpeaking) {
      await this.stopSpeaking();
    }
    
    try {
      this.isSpeaking = true;
      
      if (this.onSpeechStart) {
        this.onSpeechStart();
      }
      
      console.log(`Starting speech synthesis for text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
      
      // Get audio from ElevenLabs
      const audioData = await this.getElevenLabsAudio({
        text,
        voiceId: options?.voiceId || this.voiceId,
        stability: options?.stability || this.stability,
        similarityBoost: options?.similarityBoost || this.similarityBoost
      });
      
      // Save audio to a temporary file
      const tempFile = `${FileSystem.cacheDirectory}tts_${Date.now()}.mp3`;
      console.log(`Saving audio to temp file: ${tempFile}`);
      
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
      // Try endpoint with stream first, fallback to regular endpoint if it fails
      let url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;
      
      console.log(`Requesting speech synthesis from ElevenLabs for voice ID: ${voiceId} (${options.text.substring(0, 20)}...)`);
      
      // Prepare payload with retry logic
      const payload = {
        text: options.text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: options.stability || this.stability,
          similarity_boost: options.similarityBoost || this.similarityBoost,
          style: 0.0,
          use_speaker_boost: true
        },
        output_format: "mp3"
      };
      
      // Attempt first request with streaming endpoint
      let response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': config.elevenLabs.apiKey,
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify(payload)
      });
      
      // If streaming endpoint fails, try regular endpoint
      if (!response.ok && response.status >= 400) {
        console.log(`Streaming endpoint failed (${response.status}), trying regular endpoint...`);
        url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
        
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': config.elevenLabs.apiKey,
            'Accept': 'audio/mpeg'
          },
          body: JSON.stringify(payload)
        });
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`ElevenLabs API error: ${response.status}`, errorText);
        throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`);
      }
      
      // Get response as array buffer
      const arrayBuffer = await response.arrayBuffer();
      
      if (arrayBuffer.byteLength === 0) {
        throw new Error('Received empty audio data from ElevenLabs');
      }
      
      // Convert to base64
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      
      console.log(`Received audio data: ${Math.round(arrayBuffer.byteLength / 1024)} KB`);
      
      return base64;
    } catch (error) {
      console.error("ElevenLabs API error details:", error);
      throw new Error(`ElevenLabs API error: ${error}`);
    }
  }

  private async playAudioFile(fileUri: string): Promise<void> {
    try {
      console.log(`Loading audio file: ${fileUri}`);
      
      // Ensure any previous sounds are properly unloaded
      if (this.currentSound) {
        try {
          await this.currentSound.unloadAsync();
          this.currentSound = null;
        } catch (error) {
          console.warn("Error unloading previous sound:", error);
        }
      }
      
      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      
      // Verify file exists before trying to play it
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists || fileInfo.size === 0) {
        throw new Error(`Audio file not found or empty: ${fileUri}`);
      }
      
      // Create and load the sound with retry
      let retryCount = 0;
      let sound = null;
      
      while (retryCount < 3 && !sound) {
        try {
          const result = await Audio.Sound.createAsync(
            { uri: fileUri },
            { 
              shouldPlay: true,
              volume: 1.0,
              progressUpdateIntervalMillis: 100
            },
            this.onPlaybackStatusUpdate
          );
          sound = result.sound;
        } catch (error) {
          retryCount++;
          console.warn(`Audio load attempt ${retryCount} failed:`, error);
          
          if (retryCount >= 3) {
            throw error;
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      if (!sound) {
        throw new Error('Failed to create audio sound after retries');
      }
      
      this.currentSound = sound;
      
      // Start playing
      console.log("Starting audio playback");
      await sound.playAsync();
    } catch (error) {
      console.error("Audio playback error:", error);
      this.isSpeaking = false; // Reset state on error
      throw new Error(`Failed to play audio: ${error}`);
    }
  }

  private onPlaybackStatusUpdate = (status: AVPlaybackStatus): void => {
    if (!status.isLoaded) {
      // Handle error case
      if (status.error) {
        console.error(`Audio playback error: ${status.error}`);
        this.handleError(`Audio playback error: ${status.error}`);
        
        this.isSpeaking = false;
        if (this.onSpeechEnd) {
          this.onSpeechEnd();
        }
        
        // Ensure sound is unloaded on error
        if (this.currentSound) {
          try {
            this.currentSound.unloadAsync();
          } catch {
            // Ignore errors during cleanup
          }
          this.currentSound = null;
        }
      }
      return;
    }
    
    // If playback just finished
    if (status.didJustFinish) {
      console.log("Audio playback finished");
      this.isSpeaking = false;
      
      if (this.onSpeechEnd) {
        this.onSpeechEnd();
      }
      
      // Unload the sound
      if (this.currentSound) {
        try {
          this.currentSound.unloadAsync();
        } catch (error) {
          console.warn("Error unloading sound after playback:", error);
        }
        this.currentSound = null;
      }
    }
    
    // Log playback position for debugging (optional)
    if (status.isPlaying && status.positionMillis % 1000 < 100) {
      console.log(`Playback position: ${Math.round(status.positionMillis / 1000)}s / ${Math.round(status.durationMillis! / 1000)}s`);
    }
    
    // Check for stalled playback
    if (status.isPlaying && this.lastPlaybackPosition === status.positionMillis) {
      this.stalledPlaybackCount++;
      if (this.stalledPlaybackCount > 5) {
        console.warn("Playback appears to be stalled, attempting to resume");
        if (this.currentSound) {
          this.currentSound.playFromPositionAsync(status.positionMillis);
        }
        this.stalledPlaybackCount = 0;
      }
    } else {
      this.stalledPlaybackCount = 0;
      this.lastPlaybackPosition = status.positionMillis;
    }
  };

  public async stopSpeaking(): Promise<void> {
    try {
      if (this.currentSound) {
        try {
          // Make multiple attempts to stop sound if needed
          try {
            await this.currentSound.stopAsync();
          } catch (e) {
            console.warn("Error stopping sound, attempting unload directly:", e);
          }
          
          await this.currentSound.unloadAsync();
        } catch (error) {
          console.warn('Error during sound cleanup:', error);
          // Force a hard cleanup
          this.currentSound = null;
        }
      }
      
      this.isSpeaking = false;
      this.lastPlaybackPosition = 0;
      this.stalledPlaybackCount = 0;
      
      if (this.onSpeechEnd) {
        this.onSpeechEnd();
      }
      
      console.log('Stopped speaking');
    } catch (error) {
      console.error('Error stopping speech:', error);
      // Force state reset even on error
      this.isSpeaking = false;
      this.currentSound = null;
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
      voiceId: this.voiceId,
      modelId: this.modelId,
      stability: this.stability,
      similarityBoost: this.similarityBoost,
      isSimulatedTranscription: true, // Flag to indicate we're using simulated transcription
      hasConversationHistory: this.conversationHistory.length > 1 // At least one exchange
    };
  }
  
    /**
     * Resets the conversation history
     */
    public resetConversation(): void {
      this.initializeConversation();
      console.log('Conversation history reset');
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
      
      // Clean up sound resources
      if (this.currentSound) {
        try {
          await this.currentSound.unloadAsync();
        } catch (e) {
          console.warn("Error unloading sound during cleanup:", e);
        }
        this.currentSound = null;
      }
      
      // Reset audio mode completely
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: false,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
        });
      } catch (audioError) {
        console.warn('Error resetting audio mode during cleanup:', audioError);
      }
      
      // Reset state
      this.interimTranscript = '';
      this.finalTranscript = '';
      this.isListening = false;
      this.isSpeaking = false;
      this.reconnectAttempts = 0;
      
      // Don't reset conversation history by default to maintain context between sessions
      
      // Don't reset initialization flags to avoid repeated initialization messages
    } catch (error) {
      console.error('Error during cleanup:', error);
    } finally {
      // Ensure we reset any critical state even if there's an error
      this.socket = null;
      this.isListening = false;
      this.isSpeaking = false;
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
        return 'en'; // Fallback to English for Te Reo Māori as DeepSeek might not support it directly
      case 'zh':
        return 'zh'; // DeepSeek uses simple language codes
      case 'en':
      default:
        return 'en'; // English - DeepSeek format
    }
  }
  
  // For debugging purposes
  private async logResponseDetails(response: Response): Promise<void> {
    console.log(`Response status: ${response.status} ${response.statusText}`);
    console.log(`Response headers: ${JSON.stringify(Object.fromEntries([...response.headers]))}`);
    
    // Clone the response before reading it to avoid consuming the body
    const clonedResponse = response.clone();
    try {
      // Try to read and log the response body for debugging
      const text = await clonedResponse.text();
      console.log(`Response body (first 200 chars): ${text.substring(0, 200)}`);
    } catch (error) {
      console.error('Failed to read response body:', error);
    }
  }

  private handleError(errorMessage: string): void {
    // Only log unique errors or critical failures
    if (errorMessage.includes('Service not initialized') || 
        errorMessage.includes('Failed to start listening') ||
        errorMessage.includes('Failed to stop listening') ||
        errorMessage.includes('Failed to speak')) {
      console.error(errorMessage);
    }
    
    if (this.onError) {
      this.onError(errorMessage);
    }
  }
}