import { Audio } from 'expo-av';

class AudioPlayerService {
  private sound: Audio.Sound | null = null;

  async playAudioBuffer(audioBuffer: ArrayBuffer): Promise<void> {
    try {
      // Stop any currently playing audio
      if (this.sound) {
        await this.sound.unloadAsync();
      }

      // Create a new sound object from the audio buffer
      const { sound } = await Audio.Sound.createAsync(
        { uri: this.arrayBufferToDataUri(audioBuffer) },
        { 
          shouldPlay: true,
          volume: 1.0,
          rate: 1.0,
          shouldCorrectPitch: true,
          progressUpdateIntervalMillis: 100,
        }
      );
      
      this.sound = sound;

      // Set volume to max and ensure audio is routed to speaker
      await sound.setVolumeAsync(1.0);
      
      // Clean up when finished playing
      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (!status.isLoaded) return;
        if (status.isLoaded && status.didJustFinish) {
          await this.unloadSound();
        }
      });
      
      console.log('Started playing audio');
    } catch (error) {
      console.error('Error playing audio:', error);
      await this.unloadSound();
    }
  }

  private arrayBufferToDataUri(buffer: ArrayBuffer): string {
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:audio/mpeg;base64,${base64}`;
  }

  async unloadSound(): Promise<void> {
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }
  }

  async stopPlaying(): Promise<void> {
    if (this.sound) {
      await this.sound.stopAsync();
      await this.unloadSound();
    }
  }
}

export default new AudioPlayerService(); 