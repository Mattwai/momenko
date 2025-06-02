import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface AudioMetrics {
  latency: number;
  bufferSize: number;
  quality: 'low' | 'medium' | 'high';
  timestamp: number;
  success: boolean;
  errorCode?: string;
}

interface AudioOptimizationConfig {
  maxLatency: number; // milliseconds
  bufferSizeMs: number;
  preloadCommonPhrases: boolean;
  adaptiveQuality: boolean;
  elderlyOptimizations: boolean;
}

class AudioLatencyOptimizer {
  private config: AudioOptimizationConfig;
  private metrics: AudioMetrics[] = [];
  private preloadedAudio: Map<string, Audio.Sound> = new Map();
  private networkQuality: 'poor' | 'good' | 'excellent' = 'good';
  private audioQueue: Array<{ id: string; audio: Uint8Array; priority: number }> = [];
  private isProcessing = false;

  constructor() {
    this.config = {
      maxLatency: 1500, // <2 seconds for elderly users
      bufferSizeMs: 200, // Small buffer for responsiveness
      preloadCommonPhrases: true,
      adaptiveQuality: true,
      elderlyOptimizations: true
    };

    this.initializeNetworkMonitoring();
    this.preloadCommonAudioPhrases();
  }

  async optimizeAudioPlayback(audioData: Uint8Array, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<Audio.Sound | null> {
    const startTime = Date.now();
    
    try {
      // Add to priority queue
      const audioId = `audio_${Date.now()}_${Math.random()}`;
      this.audioQueue.push({
        id: audioId,
        audio: audioData,
        priority: this.getPriorityValue(priority)
      });

      // Sort by priority (higher number = higher priority)
      this.audioQueue.sort((a, b) => b.priority - a.priority);

      // Process queue if not already processing
      if (!this.isProcessing) {
        return await this.processAudioQueue(startTime);
      }

      return null;
    } catch (error) {
      this.recordMetrics(startTime, false, error as Error);
      throw error;
    }
  }

  private async processAudioQueue(startTime: number): Promise<Audio.Sound | null> {
    this.isProcessing = true;

    try {
      while (this.audioQueue.length > 0) {
        const audioItem = this.audioQueue.shift()!;
        const sound = await this.createOptimizedSound(audioItem.audio, startTime);
        
        if (sound) {
          this.recordMetrics(startTime, true);
          return sound;
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return null;
  }

  private async createOptimizedSound(audioData: Uint8Array, startTime: number): Promise<Audio.Sound | null> {
    try {
      // Convert to base64 for Expo Audio
      const base64Audio = this.arrayBufferToBase64(audioData);
      const uri = `data:audio/mp3;base64,${base64Audio}`;

      // Create sound with optimized settings for elderly users
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        {
          shouldPlay: false,
          rate: this.config.elderlyOptimizations ? 0.9 : 1.0, // Slightly slower for elderly
          volume: 1.0,
          isLooping: false,
          progressUpdateIntervalMillis: 100,
        }
      );

      // Preload to reduce playback latency
      await sound.loadAsync();

      // Check if we're still within acceptable latency
      const currentLatency = Date.now() - startTime;
      if (currentLatency > this.config.maxLatency) {
        console.warn(`Audio latency exceeded target: ${currentLatency}ms`);
      }

      return sound;
    } catch (error) {
      console.error('Error creating optimized sound:', error);
      return null;
    }
  }

  async preloadCommonAudioPhrases(): Promise<void> {
    if (!this.config.preloadCommonPhrases) return;

    const commonPhrases = [
      'hello',
      'how_are_you',
      'goodbye',
      'yes',
      'no',
      'thank_you',
      'please_repeat',
      'i_understand',
      'tell_me_more',
      'thats_interesting'
    ];

    try {
      const cachedAudio = await AsyncStorage.getItem('preloaded_audio');
      if (cachedAudio) {
        const audioMap = JSON.parse(cachedAudio);
        
        for (const [phrase, base64Data] of Object.entries(audioMap)) {
          try {
            const uri = `data:audio/mp3;base64,${base64Data}`;
            const { sound } = await Audio.Sound.createAsync({ uri });
            await sound.loadAsync();
            this.preloadedAudio.set(phrase, sound);
          } catch (error) {
            console.warn(`Failed to preload audio for phrase: ${phrase}`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error preloading common audio phrases:', error);
    }
  }

  async getPreloadedAudio(phrase: string): Promise<Audio.Sound | null> {
    return this.preloadedAudio.get(phrase) || null;
  }

  private initializeNetworkMonitoring(): void {
    NetInfo.addEventListener(state => {
      if (state.isConnected) {
        // Estimate network quality based on connection type and speed
        if (state.type === 'wifi') {
          this.networkQuality = 'excellent';
        } else if (state.type === 'cellular') {
          // Adjust based on cellular generation
          const details = state.details as any;
          if (details?.cellularGeneration === '4g' || details?.cellularGeneration === '5g') {
            this.networkQuality = 'good';
          } else {
            this.networkQuality = 'poor';
          }
        } else {
          this.networkQuality = 'poor';
        }
      } else {
        this.networkQuality = 'poor';
      }

      // Adjust optimization settings based on network quality
      this.adjustOptimizationForNetwork();
    });
  }

  private adjustOptimizationForNetwork(): void {
    switch (this.networkQuality) {
      case 'poor':
        this.config.bufferSizeMs = 500; // Larger buffer for poor connections
        this.config.maxLatency = 2000; // Allow higher latency
        break;
      case 'good':
        this.config.bufferSizeMs = 200; // Balanced buffer
        this.config.maxLatency = 1500; // Target latency
        break;
      case 'excellent':
        this.config.bufferSizeMs = 100; // Minimal buffer for fast networks
        this.config.maxLatency = 1000; // Aggressive latency target
        break;
    }
  }

  private recordMetrics(startTime: number, success: boolean, error?: Error): void {
    const metrics: AudioMetrics = {
      latency: Date.now() - startTime,
      bufferSize: this.config.bufferSizeMs,
      quality: this.getAudioQualityFromNetwork(),
      timestamp: Date.now(),
      success,
      errorCode: error?.message
    };

    this.metrics.push(metrics);

    // Keep only last 100 metrics to avoid memory issues
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }

    // Store metrics for analysis
    this.storeMetricsToStorage();
  }

  private async storeMetricsToStorage(): Promise<void> {
    try {
      await AsyncStorage.setItem('audio_metrics', JSON.stringify(this.metrics.slice(-50)));
    } catch (error) {
      console.error('Error storing audio metrics:', error);
    }
  }

  getAverageLatency(): number {
    if (this.metrics.length === 0) return 0;
    
    const successfulMetrics = this.metrics.filter(m => m.success);
    const totalLatency = successfulMetrics.reduce((sum, m) => sum + m.latency, 0);
    
    return totalLatency / successfulMetrics.length;
  }

  getSuccessRate(): number {
    if (this.metrics.length === 0) return 0;
    
    const successfulMetrics = this.metrics.filter(m => m.success);
    return (successfulMetrics.length / this.metrics.length) * 100;
  }

  getPerformanceReport(): {
    averageLatency: number;
    successRate: number;
    networkQuality: string;
    recommendedSettings: Partial<AudioOptimizationConfig>;
  } {
    const avgLatency = this.getAverageLatency();
    const successRate = this.getSuccessRate();

    // Generate recommendations based on performance
    const recommendations: Partial<AudioOptimizationConfig> = {};
    
    if (avgLatency > this.config.maxLatency) {
      recommendations.bufferSizeMs = Math.min(this.config.bufferSizeMs + 100, 800);
      recommendations.maxLatency = Math.min(this.config.maxLatency + 500, 3000);
    }

    if (successRate < 90) {
      recommendations.adaptiveQuality = true;
      recommendations.preloadCommonPhrases = true;
    }

    return {
      averageLatency: avgLatency,
      successRate,
      networkQuality: this.networkQuality,
      recommendedSettings: recommendations
    };
  }

  private getPriorityValue(priority: 'high' | 'medium' | 'low'): number {
    switch (priority) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 2;
    }
  }

  private getAudioQualityFromNetwork(): 'low' | 'medium' | 'high' {
    switch (this.networkQuality) {
      case 'poor': return 'low';
      case 'good': return 'medium';
      case 'excellent': return 'high';
      default: return 'medium';
    }
  }

  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    
    return btoa(binary);
  }

  async clearCache(): Promise<void> {
    try {
      // Clear preloaded audio
      for (const sound of this.preloadedAudio.values()) {
        await sound.unloadAsync();
      }
      this.preloadedAudio.clear();

      // Clear stored data
      await AsyncStorage.removeItem('preloaded_audio');
      await AsyncStorage.removeItem('audio_metrics');

      // Reset metrics
      this.metrics = [];
    } catch (error) {
      console.error('Error clearing audio cache:', error);
    }
  }

  updateConfig(newConfig: Partial<AudioOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

export default new AudioLatencyOptimizer();