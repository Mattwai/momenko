# Momenko Voice Feature Troubleshooting Guide

## Overview

This guide helps you troubleshoot voice recognition and speech synthesis issues in the Momenko app. The app uses:

- **DeepSeek API** for speech recognition
- **ElevenLabs API** for speech synthesis
- **Development build** for native voice capabilities

## Common Issues & Solutions

### 1. "Running in Expo Go - voice simulation active" Message

**Problem**: The app is detecting Expo Go environment instead of native capabilities.

**Solution**:
- Use a development build instead of Expo Go
- Run the app with `yarn ios` or `yarn android` (not `expo start`)
- Verify your app is launched from a native build by checking logs for "Using development build"

### 2. WebSocket Connection Errors (404)

**Problem**: The WebSocket connection to DeepSeek API fails with 404 errors.

**Solution**:
- Verify your DeepSeek API URL is correct in `.env.development`
  - Should be: `DEEPSEEK_API_URL=https://api.deepseek.com`
- Check your DeepSeek API key is valid
- Run the test script to verify the API endpoints: `node test-deepseek-api.js`
- Verify internet connection is active
- Look for more detailed error messages in the logs

### 3. "Only one Recording object can be prepared at a given time" Error

**Problem**: Multiple audio recording sessions are conflicting.

**Solution**:
- Restart the app completely
- Make sure you're stopping any previous recording before starting a new one
- Wait a moment between stopping and starting recordings (app should handle this)
- Check if multiple components are trying to use the microphone

### 4. No Sound from ElevenLabs Voices

**Problem**: Voice synthesis doesn't produce audible output.

**Solution**:
- Check device volume
- Verify ElevenLabs API key is valid
- Ensure the voice ID exists in your ElevenLabs account
- Try a different voice ID (see default voices in `VoiceCommunicationService.ts`)
- Check for audio playback errors in logs

### 5. Voice Recognition Not Working

**Problem**: The app doesn't recognize speech input.

**Solution**:
- Verify microphone permissions are granted
- Check that the device's microphone is working
- Ensure you're using a development build
- Verify DeepSeek API key is valid
- Check internet connection (needed for API calls)
- Try speaking more clearly and closer to the microphone

## API Configuration

### DeepSeek API

The app requires a valid DeepSeek API key for speech recognition. In `.env.development`:

```
DEEPSEEK_API_KEY=your_deepseek_key
DEEPSEEK_API_URL=https://api.deepseek.com
```

The app will use these endpoints:
- REST API: `https://api.deepseek.com/v1/audio/transcribe`
- WebSocket: `wss://api.deepseek.com/v1/audio/streaming`

### ElevenLabs API

For high-quality voice synthesis:

```
ELEVEN_LABS_API_KEY=your_elevenlabs_key
```

## Debugging Steps

### 1. Check Configuration

Verify environment variables are correctly set in `.env.development`:

```bash
cat .env.development

# Should contain:
DEEPSEEK_API_KEY=your_key_here
DEEPSEEK_API_URL=https://api.deepseek.com
ELEVEN_LABS_API_KEY=your_key_here
```

### 2. Verify App Initialization Logs

Look for these logs on startup:

```
LOG  🚀 Starting app initialization...
LOG  ✅ Configuration validation passed
LOG  ✅ Audio permissions granted
LOG  ✅ Audio session configured
LOG  ✅ DeepSeek API configured
LOG  ✅ ElevenLabs API configured
LOG  🎤 Using native voice capabilities (development build)
LOG  Native voice mode enabled
LOG  🏁 Initialization completed. Success: true
```

### 3. Testing Voice Recognition

Steps to test voice recognition:
1. Navigate to the Voice Debug Screen
2. Tap "Start Listening"
3. Speak clearly and check if text appears
4. Look for logs when you start/stop listening

Expected logs:
```
LOG  Started listening with language: en
LOG  WebSocket connection established to DeepSeek
```

### 4. Testing Voice Synthesis

1. Use a short text for testing
2. Check logs for:
   - "Requesting speech synthesis from ElevenLabs"
   - "Received audio data"
   - "Starting audio playback" 
   - "Audio playback finished"

### 5. Checking API Responses

If API calls fail, look for:
- HTTP status codes (401 = authentication, 404 = wrong endpoint)
- Response body error messages
- Network connectivity issues
- Use the provided test script: `node test-deepseek-api.js`

### Advanced Troubleshooting

### Testing API Endpoints

Run the DeepSeek API test script to verify API connectivity:

```bash
node test-deepseek-api.js
```

This script tests both the REST and WebSocket endpoints and provides detailed output about any connection issues.

### Logging Details

Add these temporary code changes to get more verbose logging:

```typescript
// In VoiceCommunicationService.ts constructor
console.log('DeepSeek API URL:', config.deepseek.apiUrl);
console.log('DeepSeek API Key (first 5 chars):', config.deepseek.apiKey.substring(0, 5));
console.log('ElevenLabs API Key (first 5 chars):', config.elevenLabs.apiKey.substring(0, 5));
```

### Audio Session Reset

If audio issues persist, try resetting the audio session:

```typescript
// Add to cleanup method
await Audio.setAudioModeAsync({
  allowsRecordingIOS: false,
  playsInSilentModeIOS: false,
  interruptionModeIOS: Audio.InterruptionModeIOS.DoNotMix,
  interruptionModeAndroid: Audio.InterruptionModeAndroid.DoNotMix,
});
```

### Complete Reset

For persistent issues:
1. Kill the app completely
2. Clear Metro cache: `npx react-native start --reset-cache`
3. Rebuild: `yarn ios` or `yarn android`
4. Check logs carefully during initialization

## Deployment Considerations

- API keys should be properly secured for production
- Consider implementing rate limiting to avoid excessive API costs
- Audio processing can be bandwidth-intensive, consider optimizing for mobile data
- ElevenLabs and DeepSeek both have usage limits and quotas

## Support

If issues persist after trying these solutions, please provide:
1. Full application logs
2. API response details
3. Device and OS version
4. Steps to reproduce the issue