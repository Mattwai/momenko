/**
 * force-native-voice.ts
 * 
 * This utility enforces native voice recognition and synthesis,
 * bypassing any simulation mode detection even when in development.
 */

// Global state to track if native mode is being forced
let forceNativeMode = true;

/**
 * Force the app to use native voice capabilities only, 
 * regardless of the environment (dev, prod, Expo Go, etc.)
 * 
 * @param force Whether to force native voice mode (default: true)
 */
export function forceNativeVoiceMode(force: boolean = true): void {
  forceNativeMode = force;
  console.log(`Native voice mode ${force ? 'enabled' : 'disabled'}`);
  
  // Override any global __DEV__ checks that might trigger simulation mode
  if (force) {
    // Note: This is a bit of a hack, but it helps ensure native mode
    global.__FORCE_NATIVE_VOICE__ = true;
  } else {
    delete global.__FORCE_NATIVE_VOICE__;
  }
}

/**
 * Check if native voice mode is being forced
 */
export function isNativeVoiceForced(): boolean {
  return forceNativeMode || !!global.__FORCE_NATIVE_VOICE__;
}

/**
 * Determine if the app should use simulation mode based on environment
 * and force settings
 */
export function shouldUseSimulationMode(): boolean {
  // If native mode is forced, never use simulation
  if (isNativeVoiceForced()) {
    return false;
  }
  
  // Default check for simulation environments
  return global.__DEV__ === true;
}

/**
 * Initialize native voice forcing at app startup
 * This should be called early in the app initialization
 */
export function initializeNativeVoice(): void {
  // Always force native mode by default
  forceNativeVoiceMode(true);
  
  console.log('🎤 Voice system initialized in native mode');
}

// Auto-initialize when this module is imported
initializeNativeVoice();

export default {
  forceNativeVoiceMode,
  isNativeVoiceForced,
  shouldUseSimulationMode,
  initializeNativeVoice
};