import { Audio } from 'expo-av';
import { Alert, Platform } from 'react-native';

export interface PermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
}

export interface AudioPermissions {
  recording: PermissionStatus;
}

export class PermissionsManager {
  private static instance: PermissionsManager;
  private permissionCache: Map<string, PermissionStatus> = new Map();
  private lastCheckTime: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 30000; // 30 seconds

  public static getInstance(): PermissionsManager {
    if (!PermissionsManager.instance) {
      PermissionsManager.instance = new PermissionsManager();
    }
    return PermissionsManager.instance;
  }

  private constructor() {}

  private isCacheValid(key: string): boolean {
    const lastCheck = this.lastCheckTime.get(key);
    if (!lastCheck) return false;
    return Date.now() - lastCheck < this.CACHE_DURATION;
  }

  private updateCache(key: string, status: PermissionStatus): void {
    this.permissionCache.set(key, status);
    this.lastCheckTime.set(key, Date.now());
  }

  async requestAudioRecordingPermission(): Promise<PermissionStatus> {
    const cacheKey = 'audio_recording';
    
    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      const cached = this.permissionCache.get(cacheKey);
      if (cached) return cached;
    }

    try {
      const permission = await Audio.requestPermissionsAsync();
      
      const status: PermissionStatus = {
        granted: permission.granted,
        canAskAgain: permission.canAskAgain,
        status: permission.status,
      };

      this.updateCache(cacheKey, status);
      return status;
    } catch (error) {
      console.error('Error requesting audio recording permission:', error);
      const errorStatus: PermissionStatus = {
        granted: false,
        canAskAgain: false,
        status: 'error',
      };
      return errorStatus;
    }
  }

  async checkAudioRecordingPermission(): Promise<PermissionStatus> {
    const cacheKey = 'audio_recording_check';
    
    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      const cached = this.permissionCache.get(cacheKey);
      if (cached) return cached;
    }

    try {
      const permission = await Audio.getPermissionsAsync();
      
      const status: PermissionStatus = {
        granted: permission.granted,
        canAskAgain: permission.canAskAgain,
        status: permission.status,
      };

      this.updateCache(cacheKey, status);
      return status;
    } catch (error) {
      console.error('Error checking audio recording permission:', error);
      const errorStatus: PermissionStatus = {
        granted: false,
        canAskAgain: false,
        status: 'error',
      };
      return errorStatus;
    }
  }

  async ensureAudioRecordingPermission(): Promise<boolean> {
    try {
      // First check current permission status
      const currentStatus = await this.checkAudioRecordingPermission();
      
      if (currentStatus.granted) {
        return true;
      }

      // If permission not granted, try to request it
      if (currentStatus.canAskAgain) {
        const requestResult = await this.requestAudioRecordingPermission();
        return requestResult.granted;
      }

      // Permission denied and can't ask again
      this.showPermissionDeniedAlert();
      return false;
    } catch (error) {
      console.error('Error ensuring audio recording permission:', error);
      return false;
    }
  }

  private showPermissionDeniedAlert(): void {
    const title = 'Microphone Permission Required';
    const message = Platform.select({
      ios: 'This app needs access to your microphone for voice interactions. Please enable microphone access in Settings > Privacy & Security > Microphone.',
      android: 'This app needs access to your microphone for voice interactions. Please enable microphone permission in your device settings.',
      default: 'This app needs access to your microphone for voice interactions. Please enable microphone permission in your device settings.',
    });

    Alert.alert(
      title,
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Open Settings',
          onPress: () => {
            // Note: Opening settings requires expo-linking or react-native-linking
            // For now, we'll just log this - you can implement the actual settings opening
            console.log('User should open settings to enable microphone permission');
          },
        },
      ],
      { cancelable: true }
    );
  }

  async getAllAudioPermissions(): Promise<AudioPermissions> {
    const recording = await this.checkAudioRecordingPermission();
    
    return {
      recording,
    };
  }

  clearPermissionCache(): void {
    this.permissionCache.clear();
    this.lastCheckTime.clear();
  }

  // Helper method to get user-friendly permission status text
  getPermissionStatusText(status: PermissionStatus): string {
    if (status.granted) return 'Granted';
    if (status.canAskAgain) return 'Can request';
    return 'Denied';
  }

  // Helper method to determine if we should show a rationale
  shouldShowPermissionRationale(status: PermissionStatus): boolean {
    return !status.granted && status.canAskAgain;
  }

  // Show rationale alert before requesting permission
  showPermissionRationale(onAccept: () => void, onDeny: () => void): void {
    Alert.alert(
      'Microphone Access Needed',
      'This app uses your microphone to listen to your voice and provide assistance. Your voice recordings are processed securely and are not stored permanently.',
      [
        {
          text: 'Not Now',
          style: 'cancel',
          onPress: onDeny,
        },
        {
          text: 'Allow',
          onPress: onAccept,
        },
      ],
      { cancelable: false }
    );
  }
}

// Export a singleton instance for easy use
export const permissionsManager = PermissionsManager.getInstance();

// Export convenience functions
export const requestAudioPermission = () => 
  permissionsManager.requestAudioRecordingPermission();

export const checkAudioPermission = () => 
  permissionsManager.checkAudioRecordingPermission();

export const ensureAudioPermission = () => 
  permissionsManager.ensureAudioRecordingPermission();