import { Audio, AVPlaybackStatus, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
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

  private async configureAudioSession() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
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
      // Clean up any existing recording first
      if (this.recording) {
        await this.stopRecording();
      }

      const permissionGranted = await this.requestPermissions();
      if (!permissionGranted) {
        throw new Error('Audio recording permissions not granted');
      }

      // Ensure audio session is configured
      if (!this.isInitialized) {
        await this.configureAudioSession();
      }

      this.onSilenceDetected = onSilenceDetected || null;
      
      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
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

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(recordingOptions);
      
      // Set up recording status updates for silence detection
      recording.setOnRecordingStatusUpdate(this.handleRecordingStatusUpdate);
      
      await recording.startAsync();
      this.recording = recording;
    } catch (error) {
      console.error('Error starting recording:', error);
      await this.cleanup();
      throw error;
    }
  }

  private handleRecordingStatusUpdate = (status: Audio.RecordingStatus) => {
    if (!status.isRecording) return;

    // Safely get metering value, fallback to -160 if not available
    const currentVolume = typeof status.metering === 'number' ? status.metering : -160;
    
    // Detect silence - only start timer if we don't already have one
    if (currentVolume <= config.audio.silenceThreshold) {
      if (!this.silenceTimer && this.onSilenceDetected) {
        this.silenceTimer = setTimeout(() => {
          if (this.onSilenceDetected) {
            this.onSilenceDetected();
          }
          this.silenceTimer = null;
        }, config.audio.silenceDuration);
      }
    } else {
      // Clear silence timer if we detect sound
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
    }

    this.lastVolume = currentVolume;
  };

  async stopRecording(): Promise<string> {
    if (!this.recording) {
      return '';
    }

    try {
      // Clear silence timer first
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recording = null;

      return uri || '';
    } catch (error) {
      console.error('Error stopping recording:', error);
      this.recording = null;
      return '';
    }
  }

  async playAudio(uri: string): Promise<void> {
    try {
      if (this.player) {
        await this.player.unloadAsync();
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
        await this.recording.stopAndUnloadAsync();
      } catch (error) {
        console.error('Error cleaning up recording:', error);
      }
      this.recording = null;
    }

    // Clean up player
    if (this.player) {
      try {
        await this.player.unloadAsync();
      } catch (error) {
        console.error('Error cleaning up player:', error);
      }
      this.player = null;
    }

    this.onSilenceDetected = null;
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