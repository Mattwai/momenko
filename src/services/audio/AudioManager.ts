import { Audio, AVPlaybackStatus } from 'expo-av';
import { AudioState } from '../../types';
import config from '../../config';
import { permissionsManager } from '../../utils/permissions';

export class AudioManager {
  private recording: Audio.Recording | null = null;
  private player: Audio.Sound | null = null;
  private silenceTimer: NodeJS.Timeout | null = null;
  private lastVolume = 0;
  private onSilenceDetected: (() => void) | null = null;
  private isInitialized = false;

  constructor() {
    this.configureAudioSession();
  }

  public async configureAudioSession() {
    try {
      // Reset audio mode first
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: false,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
        });
        
        // Small delay to ensure mode change is processed
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (resetError) {
        console.warn('Error resetting audio mode:', resetError);
      }
      
      // Set recording mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      this.isInitialized = true;
    } catch (error) {
      console.error('Error configuring audio session:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      return await permissionsManager.ensureAudioRecordingPermission();
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  async startRecording(onSilenceDetected?: () => void): Promise<void> {
    try {
      // Prevent multiple recordings from starting simultaneously
      if (this.recording) {
        console.warn('Recording already in progress, stopping previous recording first');
        try {
          await this.stopRecording();
        } catch (err) {
          console.warn('Error stopping previous recording:', err);
        } finally {
          // Force null the recording object regardless of errors
          this.recording = null;
        }
        
        // Longer delay to ensure complete cleanup
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Reset speech detection state
      this.volumeHistory = [];
      this.speechDetected = false;

      // Force audio session reconfiguration
      await this.configureAudioSession();

      const permissionGranted = await this.requestPermissions();
      if (!permissionGranted) {
        throw new Error('Audio recording permissions not granted');
      }

      this.onSilenceDetected = onSilenceDetected || null;
      
      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const recordingOptions: Audio.RecordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: config.audio.sampleRate,
          numberOfChannels: 1,
          bitRate: config.audio.bitRate,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.MAX,
          sampleRate: config.audio.sampleRate,
          numberOfChannels: 1,
          bitRate: config.audio.bitRate,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: config.audio.bitRate,
        },
      };

      // Create new recording with better error handling
      const recording = new Audio.Recording();
      
      try {
        await recording.prepareToRecordAsync(recordingOptions);
        
        // Set up recording status updates for silence detection
        recording.setOnRecordingStatusUpdate(this.handleRecordingStatusUpdate);
        
        await recording.startAsync();
        this.recording = recording;
        console.log('🎤 Recording started successfully');
      } catch (recordingError) {
        // Clean up failed recording attempt
        try {
          await recording.stopAndUnloadAsync();
        } catch (cleanupError) {
          console.warn('Error cleaning up failed recording:', cleanupError);
        }
        throw recordingError;
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      await this.cleanup();
      throw error;
    }
  }

  private volumeHistory: number[] = [];
  private speechDetected = false;
  
  private handleRecordingStatusUpdate = (status: Audio.RecordingStatus) => {
    if (!status.isRecording) return;

    // Safely get metering value, fallback to -160 if not available
    const currentVolume = typeof status.metering === 'number' ? status.metering : -160;
    
    // Add to volume history for better analysis
    this.volumeHistory.push(currentVolume);
    if (this.volumeHistory.length > 10) {
      this.volumeHistory.shift(); // Keep only last 10 readings
    }
    
    // Calculate average volume over recent samples
    const avgVolume = this.volumeHistory.reduce((sum, vol) => sum + vol, 0) / this.volumeHistory.length;
    
    // More sensitive speech detection
    const speechThreshold = config.audio.silenceThreshold + 10; // 10dB above silence threshold
    const isSpeaking = avgVolume > speechThreshold;
    
    // Track if we've detected speech at all during this recording
    if (isSpeaking && !this.speechDetected) {
      this.speechDetected = true;
      console.log('🗣️ Speech detected, volume:', Math.round(avgVolume), 'dB');
    }
    
    // Only start silence timer if we've detected speech before
    if (!isSpeaking && this.speechDetected) {
      if (!this.silenceTimer && this.onSilenceDetected) {
        console.log('🔇 Silence detected after speech, starting timer...');
        this.silenceTimer = setTimeout(() => {
          console.log('⏰ Silence timeout reached, stopping recording');
          if (this.onSilenceDetected) {
            this.onSilenceDetected();
          }
          this.silenceTimer = null;
        }, config.audio.silenceDuration);
      }
    } else if (isSpeaking) {
      // Clear silence timer if we detect sound again
      if (this.silenceTimer) {
        console.log('🎤 Speech resumed, clearing silence timer');
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
    }

    this.lastVolume = currentVolume;
  };

  async stopRecording(): Promise<string> {
    if (!this.recording) {
      console.log('No recording to stop');
      return '';
    }

    let uri = '';
    const recordingRef = this.recording;
    
    try {
      // Clear silence timer first
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
      
      // Reset speech detection state
      this.volumeHistory = [];
      this.speechDetected = false;

      // Get the URI before stopping (in case stopping fails)
      uri = recordingRef.getURI() || '';

      try {
        // Check if recording is actually recording before trying to stop
        const status = await recordingRef.getStatusAsync();
        if (status.isRecording || status.isDoneRecording) {
          await recordingRef.stopAndUnloadAsync();
          console.log('🛑 Recording stopped and unloaded');
        }
      } catch (stopError) {
        console.warn('Error during recording stop:', stopError);
        // Try force unload
        try {
          await recordingRef.stopAndUnloadAsync();
        } catch (forceError) {
          console.warn('Force unload also failed:', forceError);
        }
      }
      
      // Clear the reference immediately
      this.recording = null;

      // Longer delay to ensure complete cleanup
      await new Promise(resolve => setTimeout(resolve, 500));

      return uri;
    } catch (error) {
      console.error('Error stopping recording:', error);
      // Force cleanup in case of error
      this.recording = null;
      return uri;
    }
  }

  async playAudio(uri: string): Promise<void> {
    try {
      if (this.player) {
        try {
          await this.player.unloadAsync();
        } catch (error) {
          console.warn('Error unloading previous sound:', error);
        }
        this.player = null;
      }

      // Configure audio session for playback
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
      } catch (modeError) {
        console.warn('Error setting audio mode for playback:', modeError);
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        this.handlePlaybackStatusUpdate
      );
      
      this.player = sound;
    } catch (error) {
      console.error('Error playing audio:', error);
      throw error;
    }
  }

  private handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    if (status.didJustFinish) {
      this.player?.unloadAsync();
      this.player = null;
    }
  };

  async stopPlayback(): Promise<void> {
    if (!this.player) return;

    try {
      await this.player.stopAsync();
      await this.player.unloadAsync();
      this.player = null;
    } catch (error) {
      console.error('Error stopping playback:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    // Clear silence timer first
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    // Clean up recording
    if (this.recording) {
      try {
        try {
          const status = await this.recording.getStatusAsync();
          if (status.isRecording) {
            await this.recording.stopAndUnloadAsync();
          } else if (status.isDoneRecording) {
            await this.recording.stopAndUnloadAsync();
          }
        } catch (statusError) {
          console.warn('Error getting recording status:', statusError);
          // Try direct unload if status check fails
          try {
            await this.recording.stopAndUnloadAsync();
          } catch (unloadError) {
            console.warn('Unload also failed, forcing cleanup:', unloadError);
          }
        }
      } catch (error) {
        console.error('Error cleaning up recording:', error);
      } finally {
        // Always ensure recording is null regardless of errors
        this.recording = null;
      }
    }

    // Clean up player
    if (this.player) {
      try {
        await this.player.unloadAsync();
      } catch (error) {
        console.error('Error cleaning up player:', error);
      } finally {
        // Always ensure player is null
        this.player = null;
      }
    }

    this.onSilenceDetected = null;
    
    // Reset audio session
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
      });
      
      // Reset initialized state to force reconfiguration next time
      this.isInitialized = false;
      
      // Allow time for audio session to reset
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error('Error resetting audio session:', error);
      // Reset initialized state even on error
      this.isInitialized = false;
    }
  }

  getAudioState(): AudioState {
    return {
      isRecording: !!this.recording,
      isPlaying: !!this.player,
      duration: 0, // This would need to be tracked separately
      error: null,
    };
  }
} 