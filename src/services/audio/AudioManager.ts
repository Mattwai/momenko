import { Platform } from 'react-native';
import { Audio, AVPlaybackStatus, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { AudioState } from '../../types';

const SILENCE_THRESHOLD = -50; // dB
const SILENCE_DURATION = 3000; // 3 seconds in milliseconds

export class AudioManager {
  private recording: Audio.Recording | null = null;
  private player: Audio.Sound | null = null;
  private silenceTimer: NodeJS.Timeout | null = null;
  private lastVolume = 0;
  private onSilenceDetected: (() => void) | null = null;

  constructor() {
    this.configureAudioSession();
  }

  private async configureAudioSession() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error('Error configuring audio session:', error);
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const permission = await Audio.requestPermissionsAsync();
      return permission.granted;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  async startRecording(onSilenceDetected?: () => void): Promise<void> {
    try {
      const permissionGranted = await this.requestPermissions();
      if (!permissionGranted) {
        throw new Error('Audio recording permissions not granted');
      }

      this.onSilenceDetected = onSilenceDetected || null;
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recordingOptions: Audio.RecordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.MAX,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
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
      throw error;
    }
  }

  private handleRecordingStatusUpdate = (status: Audio.RecordingStatus) => {
    if (!status.isRecording) return;

    const currentVolume = status.metering || -160; // Use -160 as minimum if metering is null
    
    // Detect silence
    if (currentVolume <= SILENCE_THRESHOLD) {
      if (!this.silenceTimer && this.onSilenceDetected) {
        this.silenceTimer = setTimeout(() => {
          this.onSilenceDetected?.();
          this.silenceTimer = null;
        }, SILENCE_DURATION);
      }
    } else {
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
    }

    this.lastVolume = currentVolume;
  };

  async stopRecording(): Promise<string> {
    if (!this.recording) {
      throw new Error('No active recording');
    }

    try {
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recording = null;
      
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }

      return uri || '';
    } catch (error) {
      console.error('Error stopping recording:', error);
      throw error;
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
    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
      } catch (error) {
        console.error('Error cleaning up recording:', error);
      }
      this.recording = null;
    }

    if (this.player) {
      try {
        await this.player.unloadAsync();
      } catch (error) {
        console.error('Error cleaning up player:', error);
      }
      this.player = null;
    }

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
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